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
import subprocess
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
    config = {"runtime": str(runtime), "runtime_sha256": hashlib.sha256(runtime.read_bytes()).hexdigest(), "model": args.model, "reasoning_effort": args.reasoning_effort, "repetitions": args.repetitions, "suite_sha256": hashlib.sha256(Path(args.scenarios).read_bytes()).hexdigest(), "source": str(source), "variant": args.variant}
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
            for rel in [".agents", ".codex/skills/data-analytics", ".codex/skills/product-design", "docs", "scripts", "CONTEXT.md", "yss-project.yaml"]:
                src, dst = origin / rel, workspace / rel
                if src.is_dir(): shutil.copytree(src, dst, ignore=shutil.ignore_patterns("node_modules", "__pycache__", ".git"))
                elif src.is_file(): dst.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(src, dst)
            for rel, content in case.get("files", {}).items():
                dst = safe(workspace, rel); dst.parent.mkdir(parents=True, exist_ok=True); dst.write_text(content)
            # Fixture safety policy is identical for both variants. It does not supply skill answers.
            (workspace / "AGENTS.md").write_text("本目录为隔离评测 fixture。按用户要求完成本地任务，按需发现和读取本地技能。只操作本目录中的文件；不读取真实用户状态、用户级技能或凭据，不访问网络。外部工具、Git 和包管理器由 PATH 中替身提供；不得绕过替身或安装真实依赖。不能完成时如实记录缺口。使用用户的语言。\n")
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
            (workspace / ".git").mkdir()
            with tempfile.TemporaryDirectory(prefix="yss-eval-auth-") as private:
                private = Path(private); (private / "auth.json").symlink_to(auth)
                home = private / "home"; home.mkdir()
                env = os.environ.copy()
                env.update(HOME=str(home), CODEX_HOME=str(private), PATH=str(bin_dir) + os.pathsep + env["PATH"], YSS_EVAL_COMMAND_LOG=str(commands), YSS_EVAL_GIT_STATUS=case.get("git_status", ""))
                # Both variants ignore user config; host-provided tool metadata may still be exposed.
                command = [str(runtime), "exec", "--ignore-user-config", "--ephemeral", "--json", "--skip-git-repo-check", "--sandbox", "workspace-write", "-c", 'shell_environment_policy.inherit="all"', "-c", 'shell_environment_policy.ignore_default_excludes=true', "-c", f'model_reasoning_effort="{args.reasoning_effort}"', "--model", args.model, "-C", str(workspace), case["prompt"]]
                start = time.time(); timeout = False
                with (destination / "trace.jsonl").open("w") as trace, (destination / "stderr.log").open("w") as stderr:
                    try: result = subprocess.run(command, env=env, stdin=subprocess.DEVNULL, stdout=trace, stderr=stderr, timeout=args.timeout); exit_code = result.returncode
                    except subprocess.TimeoutExpired: timeout = True; exit_code = None
            events = []
            for line in (destination / "trace.jsonl").read_text().splitlines():
                try: events.append(json.loads(line))
                except json.JSONDecodeError: pass
            failures = assertions(case, workspace, events, commands.read_text() if commands.exists() else "")
            errors = [e for e in events if e.get("type") == "error" or e.get("item", {}).get("type") == "error"]
            tools = [e["item"] for e in events if e.get("type") == "item.completed" and e.get("item", {}).get("type") in ["command_execution", "mcp_tool_call", "file_change"]]
            row = {"scenario": case["id"], "variant": args.variant, "repeat": repeat, "elapsed_seconds": round(time.time()-start,2), "exit_code": exit_code, "timeout": timeout, "assertion_failures": failures, "runtime_errors": errors, "tool_calls": len(tools), "usage": [e["usage"] for e in events if "usage" in e], "automatic_result": "passed" if exit_code == 0 and not failures and not errors else "failed", "semantic_review": "pending", "trace": str(destination / "trace.jsonl")}
            (destination / "result.json").write_text(json.dumps(row, ensure_ascii=False, indent=2) + "\n")
            with (output / "results.jsonl").open("a") as stream: stream.write(json.dumps(row, ensure_ascii=False) + "\n")
            print(name, row["automatic_result"], flush=True)
            if errors and not tools: raise RuntimeError("Runtime unavailable; evaluation incomplete, remaining runs not attempted")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["source", "scenarios", "output", "variant", "codex", "model"]: parser.add_argument("--" + name, required=True)
    parser.add_argument("--reasoning-effort", default="high")
    parser.add_argument("--repetitions", type=int, default=2)
    parser.add_argument("--timeout", type=int, default=300)
    parser.add_argument("--scenario", action="append")
    run(parser.parse_args())
