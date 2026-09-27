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
        failure = {"assertion": check}
        try:
            kind = check["kind"]
            target = safe(workspace, check["path"]) if "path" in check else None
            if kind == "exists": passed = target.is_file()
            elif kind == "contains": passed = target.is_file() and check["value"] in target.read_text()
            elif kind == "unchanged": passed = target.is_file() and target.read_text() == check["value"]
            elif kind == "absent": passed = not target.exists()
            elif kind == "not_contains": passed = target.is_file() and check["value"] not in target.read_text()
            elif kind == "json_equal":
                payload = json.loads(target.read_text())
                passed = isinstance(payload, dict) and check["key"] in payload and type(payload[check["key"]]) is type(check["value"]) and payload[check["key"]] == check["value"]
            elif kind == "final_contains": passed = check["value"] in final
            elif kind == "command_contains": passed = check["value"] in command_log
            elif kind == "command_absent": passed = check["value"] not in command_log
            elif kind == "docx":
                with zipfile.ZipFile(target) as doc: passed = "word/document.xml" in doc.namelist() and check["value"] in doc.read("word/document.xml").decode()
            elif kind == "node":
                result = subprocess.run(["node", "--input-type=module", "-e", check["code"]], cwd=workspace, text=True, capture_output=True, timeout=20)
                passed = result.returncode == 0
                if not passed: failure["stderr"] = result.stderr
            else: raise ValueError(f"unknown assertion: {kind}")
        except (OSError, ValueError, TypeError, KeyError, subprocess.SubprocessError, zipfile.BadZipFile) as error:
            passed = False
            failure.update(error_type=type(error).__name__, message=str(error))
        if not passed: failures.append(failure)
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
    require_paths(origin, case, "source")
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
    # Fixture injection cannot stand in for an omitted authoritative source.
    require_paths(workspace, case, "workspace after copy")
    write_fixture_files(workspace, case.get("files", {}))
    require_paths(workspace, case, "workspace after injection")
    policy = workspace / "AGENTS.md"
    original = policy.read_bytes() if policy.exists() else b""
    policy.write_bytes(original + FIXTURE_POLICY.encode())
    manifest = [{"ref": str(p.relative_to(workspace)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(workspace.rglob("*")) if p.is_file()]
    return {"copied_paths": copied, "source_rules_sha256": hashlib.sha256(original).hexdigest(), "effective_rules_sha256": hashlib.sha256(policy.read_bytes()).hexdigest(), "fixture_inputs": manifest, "execution_mode": "real-agent-with-command-stubs"}


def require_paths(root, case, phase):
    for ref in case.get("required_paths", []):
        if not safe(root, ref).exists():
            raise ValueError(f"required {phase} unavailable: {ref}")


def allowed_writes(workspace, step):
    if "allowed_writes" not in step: return None  # Historical suites remain unchecked.
    refs = step['allowed_writes']
    if not isinstance(refs, list): raise ValueError("allowed_writes must be an array")
    for ref in refs:
        if not isinstance(ref, str) or not ref or Path(ref).is_absolute() or '..' in Path(ref).parts:
            raise ValueError("allowed_writes requires fixture-relative paths")
        safe(workspace, ref)
        if Path(ref).parts[0] in ['AGENTS.md', '.eval-bin', '.eval-python', '.git', '.eval-tmp']:
            raise ValueError(f"allowed_writes cannot include protected runtime/rules: {ref}")
    return [Path(ref).as_posix() + ('/' if ref.endswith('/') else '') for ref in refs]


def inspect_writes(workspace, before, refs):
    original = {row['ref']: row for row in before}
    current = {row['ref']: row for row in input_manifest(workspace)}
    changed = sorted(ref for ref in original.keys() | current.keys() if original.get(ref) != current.get(ref) and ref != '.eval-commands.jsonl')
    violations = []
    for ref in changed:
        row = current.get(ref, {})
        outside = 'symlink' in row and not (workspace / ref).resolve().is_relative_to(workspace.resolve())
        if outside or (refs is not None and not any(ref == allowed or (allowed.endswith('/') and ref.startswith(allowed)) for allowed in refs)):
            violations.append(ref)
    return {'status': 'failed' if violations else ('not-checked' if refs is None else 'passed'), 'allowed_writes': refs, 'changed_paths': changed, 'violations': violations, 'scope': 'Final file/symlink differences; excludes .git, __pycache__, .eval-tmp and command log; not a sandbox or transient-write audit'}


def scenario_steps(case):
    steps = case.get("steps", [{"id": "main", "prompt": case.get("prompt"), "assertions": case.get("assertions", [])}])
    ids = [step.get("id", "") for step in steps]
    if not steps or len(set(ids)) != len(ids) or any(not re.fullmatch(r"[a-z0-9][a-z0-9-]*", value) for value in ids) or any(not step.get("prompt") for step in steps):
        raise ValueError("steps require unique safe ids and nonempty prompts")
    return steps


def stop_process_group(process):
    try: os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError: pass
    try: process.wait(timeout=5)
    except subprocess.TimeoutExpired: pass
    # The parent may exit before its children; terminate the remaining group too.
    try: os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError: pass
    process.wait()


def execute_step(command, env, destination, workspace, step, commands, timeout, budget=None):
    destination.mkdir(exist_ok=True)
    write_fixture_files(workspace, step.get("files", {}))
    require_paths(workspace, step, "workspace before Agent")
    refs = allowed_writes(workspace, step)
    before = input_manifest(workspace)
    (destination / "step-input-manifest.json").write_text(json.dumps(before, ensure_ascii=False, indent=2) + "\n")
    if budget is not None: timeout = budget.reserve(timeout)
    offset = commands.stat().st_size if commands.exists() else 0
    started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    tick = time.monotonic(); timed_out = False; errors = []; exit_code = None
    with (destination / "trace.jsonl").open("w") as trace, (destination / "stderr.log").open("w") as stderr:
        try:
            process = subprocess.Popen(command + [step["prompt"]], env=env, stdin=subprocess.DEVNULL, stdout=trace, stderr=stderr, start_new_session=True)
            try: exit_code = process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                timed_out = True
                stop_process_group(process)
            except KeyboardInterrupt:
                errors.append({'type': 'interrupted', 'message': 'Agent turn interrupted; remaining work not executed'})
                stop_process_group(process)
        except OSError as error:
            errors.append({'type': 'runtime-start-error', 'message': str(error)})
    events = []
    for line in (destination / "trace.jsonl").read_text(errors='replace').splitlines():
        try:
            event = json.loads(line)
            if not isinstance(event, dict): raise ValueError('runtime event is not an object')
            if 'item' in event and not isinstance(event['item'], dict): raise ValueError('runtime item is not an object')
            if 'usage' in event and (not isinstance(event['usage'], dict) or any(type(value) is not int or value < 0 for value in event['usage'].values())):
                raise ValueError('runtime usage must contain nonnegative integer counts')
            events.append(event)
        except ValueError as error: errors.append({'type': 'trace-invalid', 'message': str(error)})
    command_log = commands.read_bytes()[offset:].decode(errors='replace') if commands.exists() else ""
    try:
        failures = assertions(step, workspace, events, command_log)
        writes = inspect_writes(workspace, before, refs)
    except Exception as error:
        failures = [{'error_type': type(error).__name__, 'message': str(error), 'phase': 'scoring'}]
        writes = {'status': 'not-checked', 'allowed_writes': refs, 'violations': [], 'reason': 'scoring failed'}
    errors += [e for e in events if e.get("type") == "error" or e.get("item", {}).get("type") == "error"]
    if exit_code == 0 and not any(e.get("type") == "turn.completed" for e in events):
        errors.append({"type": "error", "message": "runtime exited without a completed turn"})
    calls = [e["item"] for e in events if e.get("type") == "item.completed" and e.get("item", {}).get("type") in ["command_execution", "mcp_tool_call", "file_change"]]
    row = {"step": step["id"], "started_at": started_at, "elapsed_seconds": round(time.monotonic()-tick, 2), "exit_code": exit_code, "timeout": timed_out, "assertion_failures": failures, "runtime_errors": errors, "tool_calls": len(calls), "usage": [e["usage"] for e in events if "usage" in e], "automatic_result": "passed" if exit_code == 0 and not failures and not errors else "failed", "semantic_review": "pending", "trace": str(destination / "trace.jsonl")}
    row['write_scope'] = writes
    row['turn_completed'] = any(e.get('type') == 'turn.completed' for e in events)
    if writes['status'] == 'failed': row['automatic_result'] = 'failed'
    (destination / "step-result.json").write_text(json.dumps(row, ensure_ascii=False, indent=2) + "\n")
    return row


class BudgetExhausted(RuntimeError):
    pass


class RunBudget:
    def __init__(self, max_turns=None, max_seconds=None):
        if max_turns is not None and max_turns < 1: raise ValueError('max_turns must be positive')
        if max_seconds is not None and (not 0 < max_seconds < float('inf')): raise ValueError('max_seconds must be finite and positive')
        self.max_turns, self.max_seconds = max_turns, max_seconds
        self.started = time.monotonic()
        self.attempted_turns = 0

    def check(self):
        if self.max_turns is not None and self.attempted_turns >= self.max_turns: raise BudgetExhausted('max-turns')
        if self.max_seconds is not None and time.monotonic() - self.started >= self.max_seconds: raise BudgetExhausted('max-seconds')

    def reserve(self, timeout):
        self.check()
        if self.max_seconds is not None: timeout = min(timeout, self.max_seconds - (time.monotonic() - self.started))
        if timeout <= 0: raise BudgetExhausted('max-seconds')
        self.attempted_turns += 1
        return timeout


def authentication_path():
    # Runtime-only; never copied into the fixture or evidence archive.
    return Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))) / "auth.json"


def run_case(args, case, repeat, source, runtime, auth, output, budget):
    destination = output / f'{case["id"]}-{repeat}'
    destination.mkdir()
    tick = time.monotonic(); step_rows = []; error = None; stop_reason = None
    steps = scenario_steps(case)
    try:
        workspace = destination / "workspace"; workspace.mkdir()
        origin = safe(source, case["repo"]) if case["repo"] != "." else source
        metadata = prepare_workspace(origin, workspace, case)
        if getattr(args, "python_dependencies", None):
            metadata["python_dependencies"] = prepare_python_dependencies(args.python_dependencies, workspace)
        (destination / "fixture-manifest.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
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
                effective = {**step, 'required_paths': list(dict.fromkeys(case.get('required_paths', []) + step.get('required_paths', [])))}
                if 'allowed_writes' not in effective and 'allowed_writes' in case: effective['allowed_writes'] = case['allowed_writes']
                step_dir = destination / step["id"] if "steps" in case else destination
                row = execute_step(command, env, step_dir, workspace, effective, commands, args.timeout, budget)
                step_rows.append(row)
                if row["automatic_result"] != "passed": break
    except BudgetExhausted as failure:
        stop_reason = f'budget-exhausted:{failure}'
    except (Exception, KeyboardInterrupt) as failure:
        error = {'type': type(failure).__name__, 'message': str(failure), 'phase': 'fixture-or-execution'}
        stop_reason = 'interrupted' if isinstance(failure, KeyboardInterrupt) else 'environment-or-fixture-error'
    complete = len(step_rows) == len(steps)
    runtime_errors = [x for r in step_rows for x in r['runtime_errors']] + ([error] if error else [])
    if any(error.get('type') == 'interrupted' for error in runtime_errors): stop_reason = 'interrupted'
    if runtime_errors and not any(r['tool_calls'] for r in step_rows): stop_reason = stop_reason or 'runtime-unavailable'
    row = {"scenario": case["id"], "variant": args.variant, "repeat": repeat, "elapsed_seconds": round(time.monotonic()-tick, 2), "exit_code": step_rows[-1]["exit_code"] if step_rows else None, "timeout": any(r["timeout"] for r in step_rows), "assertion_failures": [x for r in step_rows for x in r["assertion_failures"]], "runtime_errors": runtime_errors, "tool_calls": sum(r["tool_calls"] for r in step_rows), "usage": [x for r in step_rows for x in r["usage"]], "automatic_result": "passed" if complete and not stop_reason and all(r["automatic_result"] == "passed" for r in step_rows) else "failed", "semantic_review": "pending", "trace": step_rows[0]["trace"] if step_rows else None, "steps": step_rows, "unattempted_steps": [s["id"] for s in steps[len(step_rows):]], 'stop_reason': stop_reason}
    (destination / "result.json").write_text(json.dumps(row, ensure_ascii=False, indent=2) + "\n")
    with (output / "results.jsonl").open("a") as stream: stream.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(destination.name, row["automatic_result"], flush=True)
    return row


def batch_summary(planned, rows, budget, stop_reason, exit_policy):
    steps = [step for row in rows for step in row['steps']]
    failed = sum(row['automatic_result'] != 'passed' for row in rows)
    incomplete = bool(stop_reason) or len(rows) != len(planned)
    status = 'incomplete' if incomplete else ('failed' if failed else 'passed')
    exit_code = 2 if incomplete else (1 if failed and exit_policy == 'strict' else 0)
    return {'schema_version': 1, 'status': status, 'exit_code': exit_code, 'exit_policy': exit_policy, 'semantic_review': 'pending', 'planned_scenarios': len(planned), 'scenario_records': len(rows), 'passed_scenarios': len(rows)-failed, 'failed_scenarios': failed, 'unattempted_scenarios': [{'scenario': case['id'], 'repeat': repeat, 'reason': stop_reason or 'not-executed'} for case, repeat in planned[len(rows):]], 'unattempted_steps': [{'scenario': row['scenario'], 'repeat': row['repeat'], 'steps': row['unattempted_steps'], 'reason': row['stop_reason'] or 'previous-step-failed'} for row in rows if row['unattempted_steps']], 'stop_reason': stop_reason, 'budget': {'max_turns': budget.max_turns, 'max_seconds': budget.max_seconds, 'attempted_turns': budget.attempted_turns, 'elapsed_seconds': round(time.monotonic()-budget.started, 2)}, 'completed_turns': sum(step.get('turn_completed', False) for step in steps), 'usage_unreported_turns': max(0, budget.attempted_turns-sum(bool(step['usage']) for step in steps)), 'reported_usage': {key: sum(usage.get(key, 0) for step in steps for usage in step['usage']) for key in ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens']}, 'money': None, 'limits': ['Automatic checks only; semantic review still required', 'Cached input is part of input; absent usage is unknown, not zero', 'Deadline bounds Agent timeouts; fixture setup, scoring and cleanup may exceed the window']}


def run(args):
    suite = json.loads(Path(args.scenarios).read_text())
    output = Path(args.output).resolve()
    if output.exists() and any(output.iterdir()):
        raise RuntimeError("Output is not empty; preserve previous runs and choose a new directory")
    source = Path(args.source).resolve(); runtime = Path(args.codex).resolve()
    selected = [c for c in suite['scenarios'] if not args.scenario or c['id'] in args.scenario]
    if not selected or len({c['id'] for c in selected}) != len(selected) or any(not re.fullmatch(r'[a-z0-9][a-z0-9-]*', c['id']) for c in selected):
        raise ValueError('select nonempty scenarios with unique safe ids')
    if args.repetitions < 1 or not 0 < args.timeout < float('inf'): raise ValueError('repetitions and timeout must be positive')
    for case in selected: scenario_steps(case)
    budget = RunBudget(getattr(args, 'max_turns', None), getattr(args, 'max_seconds', None))
    exit_policy = getattr(args, 'exit_policy', 'strict')
    if exit_policy not in ['strict', 'report-only']: raise ValueError('unknown exit policy')
    output.mkdir(parents=True, exist_ok=True)
    planned = [(case, repeat) for case in selected for repeat in range(1, args.repetitions+1)]
    rows = []; stop_reason = None
    try:
        auth = authentication_path()
        if not auth.exists(): raise RuntimeError('Codex credentials missing; evaluation incomplete')
        config = {'runtime': str(runtime), 'runtime_sha256': hashlib.sha256(runtime.read_bytes()).hexdigest(), 'runner_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'model': args.model, 'reasoning_effort': args.reasoning_effort, 'repetitions': args.repetitions, 'suite_sha256': hashlib.sha256(Path(args.scenarios).read_bytes()).hexdigest(), 'source': str(source), 'variant': args.variant, 'python_dependencies': getattr(args, 'python_dependencies', None), 'python_runtime': sys.executable, 'exit_policy': exit_policy, 'max_turns': budget.max_turns, 'max_seconds': budget.max_seconds, 'per_turn_timeout_seconds': args.timeout}
        (output / 'run-config.json').write_text(json.dumps(config, indent=2)+'\n')
        for case, repeat in planned:
            budget.check()
            row = run_case(args, case, repeat, source, runtime, auth, output, budget)
            rows.append(row)
            stop_reason = row['stop_reason']
            if not stop_reason and budget.max_seconds is not None and time.monotonic()-budget.started >= budget.max_seconds:
                stop_reason = 'budget-exhausted:max-seconds'
            progress = batch_summary(planned, rows, budget, stop_reason, exit_policy)
            (output / 'summary.json').write_text(json.dumps(progress, ensure_ascii=False, indent=2)+'\n')
            if stop_reason: break
    except BudgetExhausted as error:
        stop_reason = f'budget-exhausted:{error}'
    except (Exception, KeyboardInterrupt) as error:
        stop_reason = 'interrupted' if isinstance(error, KeyboardInterrupt) else f'{type(error).__name__}: {error}'
    summary = batch_summary(planned, rows, budget, stop_reason, exit_policy)
    (output / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n')
    return summary['exit_code']



if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["source", "scenarios", "output", "variant", "codex", "model"]: parser.add_argument("--" + name, required=True)
    parser.add_argument("--reasoning-effort", default="high")
    parser.add_argument("--repetitions", type=int, default=2)
    parser.add_argument("--timeout", type=int, default=300)
    parser.add_argument("--scenario", action="append")
    parser.add_argument("--python-dependencies", help="Offline materialized Python dependency directory copied into each fixture")
    parser.add_argument('--max-turns', type=int, help='Maximum Agent invocation attempts across this batch')
    parser.add_argument('--max-seconds', type=float, help='Batch deadline; caps remaining Agent timeout and stops new turns')
    parser.add_argument('--exit-policy', choices=['strict', 'report-only'], default='strict', help='strict: 0 automatic pass, 1 failed, 2 incomplete; report-only retains 0 for completed failed batches')
    try: sys.exit(run(parser.parse_args()))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)
