#!/usr/bin/env python3
"""Run isolated, serial skill scenarios and retain actual Codex traces/artifacts.

Scenario JSON supplies repo, prompt, fixture files and artifact assertions.
An assertion pass is not a semantic-review pass. Missing tools/timeouts fail closed.
Never use this runner with production fixture paths or a real remote.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import re
import signal
import subprocess
import sys
import tempfile
import time
import zipfile


def safe(root, relative):
    target = (root / relative).resolve()
    if not target.is_relative_to(root.resolve()) or target == root.resolve():
        raise ValueError(f"fixture path escapes root: {relative}")
    return target


def assertions(case, workspace, events, command_log):
    failures = []
    final = "\n".join(e.get("item", {}).get("text", "") for e in events if e.get("item", {}).get("type") == "agent_message")
    for check in case.get("assertions", []):
        kind = check["kind"]
        target = safe(workspace, check["path"]) if "path" in check else None
        if kind == "exists": passed = target.is_file()
        elif kind == "contains": passed = target.is_file() and check["value"] in target.read_text()
        elif kind == "unchanged": passed = target.is_file() and target.read_text() == check["value"]
        elif kind == "absent": passed = not target.exists()
        elif kind == "not_contains": passed = target.is_file() and check["value"] not in target.read_text()
        elif kind == "json_equal":
            try: passed = json.loads(target.read_text()).get(check["key"]) == check["value"]
            except (OSError, ValueError): passed = False
        elif kind == "final_contains": passed = check["value"] in final
        elif kind == "command_contains": passed = check["value"] in command_log
        elif kind == "command_absent": passed = check["value"] not in command_log
        elif kind == "docx":
            try:
                with zipfile.ZipFile(target) as doc: passed = "word/document.xml" in doc.namelist() and check["value"] in doc.read("word/document.xml").decode()
            except (OSError, zipfile.BadZipFile): passed = False
        elif kind == "node":
            result = subprocess.run(["node", "--input-type=module", "-e", check["code"]], cwd=workspace, text=True, capture_output=True, timeout=20)
            passed = result.returncode == 0
            if not passed: failures.append({"assertion": check, "stderr": result.stderr})
        else: raise ValueError(f"unknown assertion: {kind}")
        if not passed: failures.append({"assertion": check})
    return failures


FIXTURE_POLICY = """
<!-- YSS_EVAL_FIXTURE_BOUNDARY -->
本目录为隔离评测 fixture，测试数据与回复仅为 test-data-only，不得成为真实批准。
保留上方被测来源规则；仅当其要求真实外部动作时，本段隔离边界优先并记录未测范围。
只操作本目录中的文件，不读取真实用户状态、用户级技能或凭据，不访问网络。
Git、包管理器和常见网络命令由 PATH 替身记录，不得绕过替身或安装真实依赖。
允许在 fixture 内使用已有 Node/Python 和本地校验器；替身成功不代表真实构建或交付。
不能完成时如实记录缺口，禁止假造命令、退出码、批准或验证结果。使用用户的语言。
"""
DEFAULT_SOURCE_PATHS = ["AGENTS.md", ".agents", ".codex/skills/data-analytics", ".codex/skills/product-design", ".template-spec", ".template-source/process", ".template-source/distribution", "docs", "scripts", "CONTEXT.md", "DESIGN.md", "skills-lock.json", "yss-project.yaml"]


def write_fixture_files(workspace, files):
    for ref, content in files.items():
        target = safe(workspace, ref)
        if target == workspace.resolve() / "AGENTS.md" or target.name in ["auth.json", "config.toml"]:
            raise ValueError(f"fixture cannot replace rules or runtime configuration: {ref}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content.replace("${FIXTURE_ROOT}", str(workspace)))


def input_manifest(workspace):
    rows = []
    for item in sorted(workspace.rglob("*")):
        ref = item.relative_to(workspace)
        if any(part in ["__pycache__", ".eval-tmp", ".git"] for part in ref.parts): continue
        if item.is_symlink(): rows.append({"ref": str(ref), "symlink": os.readlink(item)})
        elif item.is_file(): rows.append({"ref": str(ref), "sha256": hashlib.sha256(item.read_bytes()).hexdigest()})
    return rows


def prepare_python_dependencies(source, workspace):
    source = Path(source).resolve()
    if not source.is_dir() or any(p.is_symlink() for p in source.rglob("*")):
        raise ValueError("python dependencies must be a materialized directory")
    target = workspace / ".eval-python"
    shutil.copytree(source, target, ignore=shutil.ignore_patterns("__pycache__", ".DS_Store"))
    return {"path": str(target), "files": input_manifest(target)}


def prepare_workspace(origin, workspace, case):
    for ref in case.get("required_paths", []):
        if not safe(origin, ref).exists():
            raise ValueError(f"required source unavailable: {ref}")
    copied = []
    for ref in case.get("source_paths", DEFAULT_SOURCE_PATHS):
        src, dst = safe(origin, ref), safe(workspace, ref)
        if not src.exists(): continue
        candidates = [src] if src.is_file() else list(src.rglob("*"))
        if src.is_symlink() or any(p.is_symlink() for p in candidates):
            raise ValueError(f"source symlinks require an explicit materialized fixture: {ref}")
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.is_dir(): shutil.copytree(src, dst, ignore=shutil.ignore_patterns("node_modules", "__pycache__", ".git", ".DS_Store"), dirs_exist_ok=True)
        elif src.is_file(): shutil.copy2(src, dst)
        copied.append(ref)
    write_fixture_files(workspace, case.get("files", {}))
    policy = workspace / "AGENTS.md"
    original = policy.read_bytes() if policy.exists() else b""
    policy.write_bytes(original + FIXTURE_POLICY.encode())
    manifest = [{"ref": str(p.relative_to(workspace)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(workspace.rglob("*")) if p.is_file()]
    return {"copied_paths": copied, "source_rules_sha256": hashlib.sha256(original).hexdigest(), "effective_rules_sha256": hashlib.sha256(policy.read_bytes()).hexdigest(), "fixture_inputs": manifest, "execution_mode": "real-agent-with-command-stubs"}


def scenario_steps(case):
    steps = case.get("steps", [{"id": "main", "prompt": case.get("prompt"), "assertions": case.get("assertions", [])}])
    ids = [step.get("id", "") for step in steps]
    if not steps or len(set(ids)) != len(ids) or any(not re.fullmatch(r"[a-z0-9][a-z0-9-]*", value) for value in ids) or any(not step.get("prompt") for step in steps):
        raise ValueError("steps require unique safe ids and nonempty prompts")
    return steps


def execute_step(command, env, destination, workspace, step, commands, timeout):
    destination.mkdir(exist_ok=True)
    write_fixture_files(workspace, step.get("files", {}))
    (destination / "step-input-manifest.json").write_text(json.dumps(input_manifest(workspace), ensure_ascii=False, indent=2) + "\n")
    offset = commands.stat().st_size if commands.exists() else 0
    started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    tick = time.monotonic(); timed_out = False
    with (destination / "trace.jsonl").open("w") as trace, (destination / "stderr.log").open("w") as stderr:
        process = subprocess.Popen(command + [step["prompt"]], env=env, stdin=subprocess.DEVNULL, stdout=trace, stderr=stderr, start_new_session=True)
        try: exit_code = process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            os.killpg(process.pid, signal.SIGTERM)
            try: process.wait(timeout=5)
            except subprocess.TimeoutExpired: os.killpg(process.pid, signal.SIGKILL); process.wait()
            exit_code = None
    events = []
    for line in (destination / "trace.jsonl").read_text().splitlines():
        try: events.append(json.loads(line))
        except json.JSONDecodeError: pass
    command_log = commands.read_bytes()[offset:].decode() if commands.exists() else ""
    failures = assertions(step, workspace, events, command_log)
    errors = [e for e in events if e.get("type") == "error" or e.get("item", {}).get("type") == "error"]
    if exit_code == 0 and not any(e.get("type") == "turn.completed" for e in events):
        errors.append({"type": "error", "message": "runtime exited without a completed turn"})
    calls = [e["item"] for e in events if e.get("type") == "item.completed" and e.get("item", {}).get("type") in ["command_execution", "mcp_tool_call", "file_change"]]
    row = {"step": step["id"], "started_at": started_at, "elapsed_seconds": round(time.monotonic()-tick, 2), "exit_code": exit_code, "timeout": timed_out, "assertion_failures": failures, "runtime_errors": errors, "tool_calls": len(calls), "usage": [e["usage"] for e in events if "usage" in e], "automatic_result": "passed" if exit_code == 0 and not failures and not errors else "failed", "semantic_review": "pending", "trace": str(destination / "trace.jsonl")}
    (destination / "step-result.json").write_text(json.dumps(row, ensure_ascii=False, indent=2) + "\n")
    return row


def run(args):
    suite = json.loads(Path(args.scenarios).read_text())
    output = Path(args.output).resolve()
    if output.exists() and any(output.iterdir()):
        raise RuntimeError("Output is not empty; preserve previous runs and choose a new directory")
    output.mkdir(parents=True, exist_ok=True)
    source = Path(args.source).resolve()
    runtime = Path(args.codex).resolve()
    # Authentication is used by Codex itself; never exposed to the fixture or logs.
    auth = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))) / "auth.json"
    if not auth.exists(): raise RuntimeError("Codex credentials missing; evaluation incomplete")
    selected = [c for c in suite["scenarios"] if not args.scenario or c["id"] in args.scenario]
    if not selected or len({c["id"] for c in selected}) != len(selected) or any(not re.fullmatch(r"[a-z0-9][a-z0-9-]*", c["id"]) for c in selected):
        raise ValueError("select nonempty scenarios with unique safe ids")
    if args.repetitions < 1 or args.timeout <= 0: raise ValueError("repetitions and timeout must be positive")
    config = {"runtime": str(runtime), "runtime_sha256": hashlib.sha256(runtime.read_bytes()).hexdigest(), "runner_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "model": args.model, "reasoning_effort": args.reasoning_effort, "repetitions": args.repetitions, "suite_sha256": hashlib.sha256(Path(args.scenarios).read_bytes()).hexdigest(), "source": str(source), "variant": args.variant, "python_dependencies": getattr(args, "python_dependencies", None), "python_runtime": sys.executable}
    (output / "run-config.json").write_text(json.dumps(config, indent=2) + "\n")
    for case in selected:
        for repeat in range(1, args.repetitions + 1):
            name = f'{case["id"]}-{repeat}'
            destination = output / name
            if destination.exists(): raise RuntimeError(f"Run already exists; do not select successful retries: {name}")
            destination.mkdir()
            workspace = destination / "workspace"
            workspace.mkdir()
            origin = safe(source, case["repo"]) if case["repo"] != "." else source
            metadata = prepare_workspace(origin, workspace, case)
            if getattr(args, "python_dependencies", None):
                metadata["python_dependencies"] = prepare_python_dependencies(args.python_dependencies, workspace)
            (destination / "fixture-manifest.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
            steps = scenario_steps(case)
            bin_dir = workspace / ".eval-bin"; bin_dir.mkdir()
            commands = workspace / ".eval-commands.jsonl"
            stub = '''#!/usr/bin/env python3
import json,os,sys,pathlib
name=pathlib.Path(sys.argv[0]).name;args=sys.argv[1:]
with open(os.environ['YSS_EVAL_COMMAND_LOG'],'a') as f:f.write(json.dumps({'tool':name,'args':args})+'\\n')
if name=='git':
 if args[:2]==['rev-parse','--git-dir']:print('.git')
 elif args[:2]==['rev-parse','--git-common-dir']:print('.git')
 elif args[:2]==['rev-parse','--show-toplevel']:print(os.getcwd())
 elif args[:2]==['branch','--show-current']:print('fixture')
 elif args and args[0]=='status':print(os.environ.get('YSS_EVAL_GIT_STATUS',''))
 elif args and args[0]=='check-ignore':sys.exit(0)
 elif args[:2]==['worktree','add']:
  paths=[x for x in args[2:] if not x.startswith('-')];p=pathlib.Path(paths[0]);p.mkdir(parents=True,exist_ok=True)
  for name in ['package.json','pnpm-lock.yaml']:
   s=pathlib.Path(name)
   if s.exists():(p/name).write_bytes(s.read_bytes())
 elif any(x in args for x in ['commit','push','reset','clean']):print('fixture blocked external/destructive mutation');sys.exit(73)
elif name in ['gh','glab','curl','wget','npm','npx']:print('fixture capability unavailable');sys.exit(73)
else:print('fixture command passed')
'''
            for tool in ["git", "pnpm", "npm", "npx", "gh", "glab", "curl", "wget"]:
                p = bin_dir / tool; p.write_text(stub); p.chmod(0o755)
            (workspace / ".git").mkdir(exist_ok=True)
            run_start = time.monotonic(); step_rows = []
            temporary = workspace / ".eval-tmp"; temporary.mkdir()
            with tempfile.TemporaryDirectory(prefix="yss-eval-auth-") as private:
                private = Path(private); (private / "auth.json").symlink_to(auth)
                home = private / "home"; home.mkdir()
                env = os.environ.copy()
                env.update(HOME=str(home), CODEX_HOME=str(private), PATH=str(bin_dir) + os.pathsep + env["PATH"], YSS_EVAL_COMMAND_LOG=str(commands), YSS_EVAL_GIT_STATUS=case.get("git_status", ""), TMPDIR=str(temporary))
                env.update(PYTHONNOUSERSITE="1", PYTHONPATH=metadata.get("python_dependencies", {}).get("path", ""))
                if case.get("setup_script"):
                    setup = safe(workspace, case["setup_script"])
                    if setup.suffix != ".mjs" or not setup.is_file(): raise ValueError("setup_script must be a fixture-local .mjs file")
                    with (destination / "setup.log").open("w") as log:
                        prepared = subprocess.run(["node", str(setup)], cwd=workspace, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=60)
                    if prepared.returncode: raise RuntimeError("fixture setup failed before Agent execution; inspect setup.log")
                # Both variants ignore user config; host-provided tool metadata may still be exposed.
                command = [str(runtime), "exec", "--ignore-user-config", "--ephemeral", "--json", "--skip-git-repo-check", "--sandbox", "workspace-write", "-c", 'shell_environment_policy.inherit="all"', "-c", 'shell_environment_policy.ignore_default_excludes=true', "-c", f'model_reasoning_effort="{args.reasoning_effort}"', "--model", args.model, "-C", str(workspace)]
                for step in steps:
                    step_dir = destination / step["id"] if "steps" in case else destination
                    row = execute_step(command, env, step_dir, workspace, step, commands, args.timeout)
                    step_rows.append(row)
                    if row["automatic_result"] != "passed": break
            complete = len(step_rows) == len(steps)
            row = {"scenario": case["id"], "variant": args.variant, "repeat": repeat, "elapsed_seconds": round(time.monotonic()-run_start, 2), "exit_code": step_rows[-1]["exit_code"], "timeout": any(r["timeout"] for r in step_rows), "assertion_failures": [x for r in step_rows for x in r["assertion_failures"]], "runtime_errors": [x for r in step_rows for x in r["runtime_errors"]], "tool_calls": sum(r["tool_calls"] for r in step_rows), "usage": [x for r in step_rows for x in r["usage"]], "automatic_result": "passed" if complete and all(r["automatic_result"] == "passed" for r in step_rows) else "failed", "semantic_review": "pending", "trace": step_rows[0]["trace"], "steps": step_rows, "unattempted_steps": [s["id"] for s in steps[len(step_rows):]]}
            (destination / "result.json").write_text(json.dumps(row, ensure_ascii=False, indent=2) + "\n")
            with (output / "results.jsonl").open("a") as stream: stream.write(json.dumps(row, ensure_ascii=False) + "\n")
            print(name, row["automatic_result"], flush=True)
            if row["runtime_errors"] and not row["tool_calls"]: raise RuntimeError("Runtime unavailable; evaluation incomplete, remaining runs not attempted")



if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["source", "scenarios", "output", "variant", "codex", "model"]: parser.add_argument("--" + name, required=True)
    parser.add_argument("--reasoning-effort", default="high")
    parser.add_argument("--repetitions", type=int, default=2)
    parser.add_argument("--timeout", type=int, default=300)
    parser.add_argument("--scenario", action="append")
    parser.add_argument("--python-dependencies", help="Offline materialized Python dependency directory copied into each fixture")
    run(parser.parse_args())
