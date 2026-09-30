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
import uuid
import shlex


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
            elif kind == "final_absent": passed = check["value"] not in final
            elif kind == "git_commit_count":
                passed = len(case.get("git_audit", {}).get("new_commits", [])) == check["value"] and case.get("git_audit", {}).get("status") == "observed"
            elif kind == "git_committed_paths":
                passed = case.get("git_audit", {}).get("committed_paths") == sorted(check["value"]) and case.get("git_audit", {}).get("status") == "observed"
            elif kind == "git_preserved_index_paths":
                audit = case.get("git_audit", {})
                passed = audit.get("status") == "observed" and all(audit.get("before", {}).get("index", {}).get(ref) == audit.get("after", {}).get("index", {}).get(ref) and ref in audit.get("before", {}).get("index", {}) for ref in check["value"])
            elif kind == "git_status_contains": passed = check["value"] in case.get("git_audit", {}).get("after", {}).get("status", "")
            elif kind == "skill_read": passed = any(row["skill"] == check["value"] and row["status"] == "observed-read" for row in skill_reads(events))
            elif kind == "skill_not_read": passed = not any(row["skill"] == check["value"] and row["status"] == "observed-read" for row in skill_reads(events))
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


def shell_read_arguments(command, depth=0):
    if depth > 3: return []
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=';&|()')
        lexer.whitespace_split = True; tokens = list(lexer)
    except ValueError: return []
    if not tokens: return []
    if Path(tokens[0]).name in ['sh', 'bash', 'zsh', 'dash']:
        for index, token in enumerate(tokens[1:], 1):
            if token.startswith('-') and 'c' in token and index + 1 < len(tokens):
                return shell_read_arguments(tokens[index + 1], depth + 1)
    arguments = []; segment = []
    for token in [*tokens, ';']:
        if token and all(char in ';&|()' for char in token):
            if segment and Path(segment[0]).name in ['cat', 'sed', 'head', 'tail', 'bat', 'nl']:
                arguments.extend(segment[1:])
            segment = []
        else: segment.append(token)
    return arguments


def skill_reads(events):
    """Only successful tool reads qualify; names in prose/search listings do not."""
    rows = []
    pattern = re.compile(r"(?:\.agents|\.codex|\.cursor|\.pi)/skills/([a-z0-9-]+)/SKILL\.md")
    for event in events:
        if event.get('type') != 'item.completed': continue
        item = event.get('item', {})
        commands = []
        if item.get('type') == 'command_execution' and item.get('exit_code') == 0:
            command = item.get('command', '')
            # Shell text is observation, not proof that an entire file was read.
            commands.extend(shell_read_arguments(command))
        runtime = item.get('runtime_tool', {})
        if runtime.get('type') == 'tool_execution_end' and not runtime.get('isError') and runtime.get('toolName') == 'read':
            commands.append(str(runtime.get('args', {}).get('path', '')))
        if runtime.get('type') == 'tool_call' and runtime.get('subtype') == 'completed':
            call = runtime.get('tool_call', {})
            for name, payload in call.items():
                if name == 'readToolCall' and isinstance(payload, dict) and payload.get('result', {}).get('success') is True:
                    commands.append(str(payload.get('args', {}).get('path', '')))
        for command in commands:
            for match in pattern.finditer(command):
                rows.append({'skill': match[1], 'path': match[0], 'status': 'observed-read', 'scope': 'successful explicit tool read; may be partial; native auto-injected bodies need separate evidence'})
    return rows


def fixture_git_env(env):
    return {**env, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': os.devnull,
            'GIT_TERMINAL_PROMPT': '0', 'GIT_AUTHOR_NAME': 'Evaluation Fixture',
            'GIT_AUTHOR_EMAIL': 'fixture@example.invalid', 'GIT_COMMITTER_NAME': 'Evaluation Fixture',
            'GIT_COMMITTER_EMAIL': 'fixture@example.invalid'}


def git_output(workspace, env, arguments):
    completed = subprocess.run(['/usr/bin/git', *arguments], cwd=workspace, env=fixture_git_env(env), text=True, capture_output=True, timeout=20)
    if completed.returncode: raise RuntimeError('fixture Git failed: ' + completed.stderr[:2000])
    return completed.stdout


def prepare_fixture_git(workspace, definition, env):
    if not isinstance(definition, dict) or not definition.get('baseline_files'): raise ValueError('fixture_git requires baseline_files')
    if (workspace / '.git').exists(): raise ValueError('fixture_git cannot reuse an existing repository')
    files = definition['baseline_files']
    if not isinstance(files, dict): raise ValueError('fixture_git baseline_files must be a mapping')
    write_fixture_files(workspace, files)
    # Do not accidentally record the source tree, auth, or unrelated files.
    for ref in files: allowed_writes(workspace, {'allowed_writes': [ref]})
    git_output(workspace, env, ['init', '-q', '-b', 'fixture'])
    git_output(workspace, env, ['config', 'commit.gpgsign', 'false'])
    (workspace / '.git/info/exclude').write_text('*\n!*/\n')
    git_output(workspace, env, ['add', '-f', '--', *files.keys()])
    git_output(workspace, env, ['commit', '-qm', 'test: isolated fixture baseline'])
    write_fixture_files(workspace, definition.get('changes', {}))
    staged = definition.get('staged_paths', [])
    for ref in staged:
        safe(workspace, ref)
        if ref not in definition.get('changes', {}): raise ValueError('staged_paths must name fixture changes')
    if staged: git_output(workspace, env, ['add', '--', *staged])
    if git_output(workspace, env, ['remote']).strip(): raise ValueError('fixture Git must have no remote')
    return git_snapshot(workspace, env)


def git_snapshot(workspace, env):
    return {'head': git_output(workspace, env, ['rev-parse', 'HEAD']).strip(),
            'status': git_output(workspace, env, ['status', '--short', '--untracked-files=no']),
            'remotes': git_output(workspace, env, ['remote']).splitlines(),
            'index': {row.split('\t', 1)[1]: row.split('\t', 1)[0] for row in git_output(workspace, env, ['ls-files', '--stage']).splitlines() if '\t' in row}}


def inspect_git(workspace, env, before):
    if before is None: return {'status': 'not-checked'}
    after = git_snapshot(workspace, env)
    commits = git_output(workspace, env, ['rev-list', before['head'] + '..HEAD']).splitlines()
    paths = sorted(set(git_output(workspace, env, ['diff', '--name-only', before['head'], 'HEAD']).splitlines()))
    lineage = subprocess.run(['/usr/bin/git', 'merge-base', '--is-ancestor', before['head'], after['head']], cwd=workspace, env=fixture_git_env(env), capture_output=True, timeout=20).returncode == 0
    return {'status': 'observed' if lineage and after['remotes'] == before['remotes'] else 'violation', 'lineage_preserved': lineage, 'before': before, 'after': after, 'new_commits': commits, 'committed_paths': paths,
            'scope': 'Disposable fixture repository only; does not authorize commits in source repositories'}


FIXTURE_POLICY = """
<!-- YSS_EVAL_FIXTURE_BOUNDARY -->
本目录为隔离评测 fixture，测试数据与回复仅为 test-data-only，不得成为真实批准。
保留上方被测来源规则；仅当其要求真实外部动作时，本段隔离边界优先并记录未测范围。
只操作本目录中的文件，不读取真实用户状态、用户级技能或凭据，不访问网络。
Git、包管理器和常见网络命令由 PATH 替身记录，不得绕过替身或安装真实依赖。
允许在 fixture 内使用已有 Node/Python 和本地校验器；替身成功不代表真实构建或交付。
不能完成时如实记录缺口，禁止假造命令、退出码、批准或验证结果。使用用户的语言。
"""
REAL_GIT_POLICY = """
本场景含无远端的真实临时 Git 仓库。仅用户明确要求时允许在本 fixture 内提交指定文件；
保留其他暂存和未暂存修改，不执行 push、安装或外部操作。Git PATH 记录器转发本地命令，
结果必须通过实际 HEAD、提交路径和状态验证；这不是对源仓库提交的授权。
"""
DEFAULT_SOURCE_PATHS = ["AGENTS.md", ".agents", ".codex/skills/data-analytics", ".codex/skills/product-design", ".template-spec", ".template-source/process", ".template-source/distribution", ".template-source/agents", "docs", "package.json", "README.md", "scripts", "CONTEXT.md", "DESIGN.md", "skills-lock.json", "yss-project.yaml"]


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
    policy.write_bytes(original + (FIXTURE_POLICY.replace("Git、包管理器和常见网络命令由 PATH 替身记录，不得绕过替身或安装真实依赖。", "包管理器和常见网络命令由 PATH 替身记录，不得绕过替身或安装真实依赖。") + REAL_GIT_POLICY if case.get("fixture_git") else FIXTURE_POLICY).encode())
    manifest = [{"ref": str(p.relative_to(workspace)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(workspace.rglob("*")) if p.is_file()]
    return {"copied_paths": copied, "source_rules_sha256": hashlib.sha256(original).hexdigest(), "effective_rules_sha256": hashlib.sha256(policy.read_bytes()).hexdigest(), "fixture_inputs": manifest, "execution_mode": "real-agent-with-disposable-local-git" if case.get("fixture_git") else "real-agent-with-command-stubs"}


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


def normalize_events(raw, runtime):
    if runtime == 'codex': return raw
    events = []
    assistant_completed = False
    for event in raw:
        kind = event.get('type')
        if kind == 'error': events.append(event)
        try:
            if runtime == 'pi':
                if kind == 'message_end' and event.get('message', {}).get('role') == 'assistant':
                    message = event['message']
                    text = '\n'.join(item['text'] for item in message.get('content', []) if item.get('type') == 'text')
                    events.append({'type': 'item.completed', 'item': {'type': 'agent_message', 'text': text}})
                    if message.get('stopReason') in ['error', 'aborted']:
                        events.append({'type': 'error', 'message': message.get('errorMessage', message['stopReason'])})
                    assistant_completed = message.get('stopReason') == 'stop'
                    usage = message.get('usage')
                    if usage:
                        # Pi input excludes cache hits/writes. Codex input includes them.
                        counts = {key: usage.get(key) for key in ['input', 'output', 'cacheRead', 'cacheWrite']}
                        if any(type(value) is not int or value < 0 for value in counts.values()): raise ValueError('invalid Pi usage')
                        events.append({'type': 'usage.observed', 'usage': {'input_tokens': counts['input'] + counts['cacheRead'] + counts['cacheWrite'], 'cached_input_tokens': counts['cacheRead'], 'cache_write_input_tokens': counts['cacheWrite'], 'output_tokens': counts['output']}})
                if kind == 'tool_execution_end':
                    event = {**event, 'args': next((start.get('args', {}) for start in reversed(raw[:raw.index(event)]) if start.get('type') == 'tool_execution_start' and start.get('toolCallId') == event.get('toolCallId')), {})}
                    events.append({'type': 'item.completed', 'item': {'type': 'mcp_tool_call', 'runtime_tool': event}})
                if kind == 'agent_end' and assistant_completed: events.append({'type': 'turn.completed'})
            elif runtime == 'cursor':
                if kind == 'assistant':
                    content = event.get('message', {}).get('content', [])
                    events.append({'type': 'item.completed', 'item': {'type': 'agent_message', 'text': '\n'.join(item['text'] for item in content if item.get('type') == 'text')}})
                if kind == 'tool_call' and event.get('subtype') == 'completed': events.append({'type': 'item.completed', 'item': {'type': 'mcp_tool_call', 'runtime_tool': event}})
                if kind == 'result':
                    if event.get('is_error') is True or event.get('subtype') != 'success': events.append({'type': 'error', 'message': 'Cursor result was not success'})
                    else:
                        if isinstance(event.get('result'), str): events.append({'type': 'item.completed', 'item': {'type': 'agent_message', 'text': event['result']}})
                        events.append({'type': 'turn.completed'})
                    # Preserve provider-specific usage in raw trace. No guessed field mapping.
            else: raise ValueError('unknown runtime adapter')
        except (ValueError, TypeError, KeyError, AttributeError) as error:
            events.append({'type': 'error', 'message': 'invalid runtime event: ' + str(error)})
    return events


def execute_step(command, env, destination, workspace, step, commands, timeout, budget=None, runtime_kind='codex'):
    destination.mkdir(exist_ok=True)
    write_fixture_files(workspace, step.get("files", {}))
    require_paths(workspace, step, "workspace before Agent")
    refs = allowed_writes(workspace, step)
    before = input_manifest(workspace)
    git_before = git_snapshot(workspace, env) if env.get("YSS_EVAL_REAL_GIT") == "1" else None
    (destination / "step-input-manifest.json").write_text(json.dumps(before, ensure_ascii=False, indent=2) + "\n")
    if budget is not None: timeout = budget.reserve(timeout)
    offset = commands.stat().st_size if commands.exists() else 0
    started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    tick = time.monotonic(); timed_out = False; errors = []; exit_code = None
    with (destination / "trace.jsonl").open("w") as trace, (destination / "stderr.log").open("w") as stderr:
        try:
            process = subprocess.Popen(command + [step["prompt"]], cwd=workspace, env=env, stdin=subprocess.DEVNULL, stdout=trace, stderr=stderr, start_new_session=True)
            try: exit_code = process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                timed_out = True
                stop_process_group(process)
            except KeyboardInterrupt:
                errors.append({'type': 'interrupted', 'message': 'Agent turn interrupted; remaining work not executed'})
                stop_process_group(process)
        except OSError as error:
            errors.append({'type': 'runtime-start-error', 'message': str(error)})
    if budget is not None: budget.finish(time.monotonic() - tick)
    events = []
    for line in (destination / "trace.jsonl").read_text(errors='replace').splitlines():
        try:
            event = json.loads(line)
            if not isinstance(event, dict): raise ValueError('runtime event is not an object')
            if 'item' in event and not isinstance(event['item'], dict): raise ValueError('runtime item is not an object')
            if runtime_kind == 'codex' and 'usage' in event and (not isinstance(event['usage'], dict) or any(type(value) is not int or value < 0 for value in event['usage'].values())):
                raise ValueError('runtime usage must contain nonnegative integer counts')
            events.append(event)
        except ValueError as error: errors.append({'type': 'trace-invalid', 'message': str(error)})
    try: events = normalize_events(events, runtime_kind)
    except (ValueError, TypeError, KeyError, AttributeError) as error:
        errors.append({'type': 'trace-invalid', 'message': str(error)}); events = []
    (destination / 'normalized-events.json').write_text(json.dumps(events, ensure_ascii=False, indent=2) + '\n')
    command_log = commands.read_bytes()[offset:].decode(errors='replace') if commands.exists() else ""
    try:
        git_audit = inspect_git(workspace, env, git_before)
        failures = assertions({**step, "git_audit": git_audit}, workspace, events, command_log)
        writes = inspect_writes(workspace, before, refs)
    except Exception as error:
        failures = [{'error_type': type(error).__name__, 'message': str(error), 'phase': 'scoring'}]
        writes = {'status': 'not-checked', 'allowed_writes': refs, 'violations': [], 'reason': 'scoring failed'}
        git_audit = {'status': 'failed', 'reason': str(error)}
    errors += [e for e in events if e.get("type") == "error" or e.get("item", {}).get("type") == "error"]
    if not timed_out and not any(e.get("type") == "turn.completed" for e in events):
        errors.append({"type": "error", "message": "runtime exited without a completed turn; inspect stderr.log"})
    calls = [e["item"] for e in events if e.get("type") == "item.completed" and e.get("item", {}).get("type") in ["command_execution", "mcp_tool_call", "file_change"]]
    row = {"step": step["id"], "started_at": started_at, "elapsed_seconds": round(time.monotonic()-tick, 2), "exit_code": exit_code, "timeout": timed_out, "assertion_failures": failures, "runtime_errors": errors, "tool_calls": len(calls), "usage": [e["usage"] for e in events if "usage" in e], "automatic_result": "passed" if exit_code == 0 and not failures and not errors else "failed", "semantic_review": "pending", "trace": str(destination / "trace.jsonl")}
    row['write_scope'] = writes
    row['git_audit'] = git_audit
    row['skill_reads'] = skill_reads(events)
    row['turn_completed'] = any(e.get('type') == 'turn.completed' for e in events)
    if writes['status'] == 'failed': row['automatic_result'] = 'failed'
    (destination / "step-result.json").write_text(json.dumps(row, ensure_ascii=False, indent=2) + "\n")
    return row


class BudgetExhausted(RuntimeError):
    pass


class RunBudget:
    def __init__(self, max_turns=None, max_seconds=None, ledger=None):
        if max_turns is not None and max_turns < 1: raise ValueError('max_turns must be positive')
        if max_seconds is not None and (not 0 < max_seconds < float('inf')): raise ValueError('max_seconds must be finite and positive')
        self.max_turns, self.max_seconds = max_turns, max_seconds
        self.started = time.monotonic()
        self.attempted_turns = 0
        self.ledger = Path(ledger).resolve() if ledger else None
        self.reservation = None
        if self.ledger and (max_turns is None or max_seconds is None): raise ValueError('shared ledger requires both budget limits')

    def shared(self, action, timeout=0, elapsed=0):
        try: import fcntl
        except ImportError as error: raise RuntimeError('shared budget ledger requires POSIX file locking on this runner') from error
        self.ledger.parent.mkdir(parents=True, exist_ok=True)
        # One permanent lock inode; atomic data replacement survives interrupted writes.
        with Path(str(self.ledger) + '.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            state = json.loads(self.ledger.read_text()) if self.ledger.exists() else {'schema_version': 1, 'max_turns': self.max_turns, 'max_seconds': self.max_seconds, 'attempts': []}
            if (state.get('schema_version'), state.get('max_turns'), state.get('max_seconds')) != (1, self.max_turns, self.max_seconds): raise ValueError('shared budget limits cannot change')
            attempts = state['attempts']
            remaining = self.max_seconds - sum(row.get('elapsed_seconds', row['reserved_seconds']) for row in attempts)
            if action in ['check', 'reserve']:
                if len(attempts) >= self.max_turns: raise BudgetExhausted('shared-max-turns')
                if remaining <= 0: raise BudgetExhausted('shared-max-seconds')
            if action == 'reserve':
                timeout = min(timeout, remaining)
                self.reservation = str(uuid.uuid4())
                attempts.append({'id': self.reservation, 'reserved_seconds': timeout, 'status': 'reserved', 'started_at': time.time()})
            elif action == 'finish':
                row = next(item for item in attempts if item['id'] == self.reservation)
                row.update(elapsed_seconds=elapsed, status='finished')
                self.reservation = None
            if action != 'check':
                temporary = self.ledger.with_name(self.ledger.name + '.' + str(uuid.uuid4()) + '.tmp')
                with temporary.open('w') as stream:
                    json.dump(state, stream, indent=2); stream.write('\n'); stream.flush(); os.fsync(stream.fileno())
                os.replace(temporary, self.ledger)
            return timeout

    def check(self):
        if self.ledger: self.shared('check')
        if self.max_turns is not None and self.attempted_turns >= self.max_turns: raise BudgetExhausted('max-turns')
        if not self.ledger and self.max_seconds is not None and time.monotonic() - self.started >= self.max_seconds: raise BudgetExhausted('max-seconds')

    def reserve(self, timeout):
        self.check()
        if not self.ledger and self.max_seconds is not None: timeout = min(timeout, self.max_seconds - (time.monotonic() - self.started))
        if timeout <= 0: raise BudgetExhausted('max-seconds')
        if self.ledger: timeout = self.shared('reserve', timeout)
        self.attempted_turns += 1
        return timeout

    def finish(self, elapsed):
        if self.ledger and self.reservation: self.shared('finish', elapsed=elapsed)


def codex_provider_flags(config_path):
    """Preserve the configured provider, without importing hooks, MCPs or skills."""
    if not config_path: return [], {'provider': 'runtime-default', 'config_source': None}
    try: import tomllib
    except ImportError as error: raise RuntimeError('--codex-config-source requires Python 3.11 or newer') from error
    config = tomllib.loads(Path(config_path).read_text())
    provider = config.get('model_provider', 'openai')
    if not re.fullmatch(r'[A-Za-z0-9_-]+', provider): raise ValueError('invalid provider id')
    definition = config.get('model_providers', {}).get(provider)
    if definition is None and provider != 'openai': raise ValueError('configured provider definition unavailable')
    supported = {'name', 'base_url', 'env_key', 'wire_api', 'requires_openai_auth', 'supports_websockets'}
    if definition is not None and any(key not in supported for key in definition): raise ValueError('provider has unsupported fields; do not silently drop routing/authentication settings')
    flags = ['-c', 'model_provider=' + json.dumps(provider)]
    for key, value in (definition or {}).items():
        if type(value) not in [str, bool]: raise ValueError('unsupported provider value')
        if key == 'base_url' and ('@' in value or '?' in value): raise ValueError('provider URL must not contain credentials or query strings')
        flags += ['-c', f'model_providers.{provider}.{key}=' + json.dumps(value)]
    return flags, {'provider': provider, 'definition_sha256': hashlib.sha256(json.dumps(definition, sort_keys=True).encode()).hexdigest(), 'config_source': str(Path(config_path).resolve())}


def runtime_command(args, runtime, workspace, private, env):
    kind = getattr(args, 'runtime', 'codex')
    if kind == 'codex':
        flags, _ = codex_provider_flags(getattr(args, 'codex_config_source', None))
        return [str(runtime), 'exec', *(['--approve-for-me'] if env.get('YSS_EVAL_REAL_GIT') == '1' else ['--sandbox', 'workspace-write']), '--ignore-user-config', '--ephemeral', '--json', '--skip-git-repo-check', '-c', 'shell_environment_policy.inherit="all"', '-c', 'shell_environment_policy.ignore_default_excludes=true', '-c', f'model_reasoning_effort="{args.reasoning_effort}"', '--model', args.model, '-C', str(workspace)] + flags
    if kind == 'pi':
        provider = getattr(args, 'pi_provider', None)
        config = getattr(args, 'pi_models_source', None)
        if not provider or not config: raise ValueError('Pi requires explicit existing provider and models source')
        data = json.loads(Path(config).read_text()).get('providers', {}).get(provider)
        if not data: raise ValueError('Pi provider missing; no provider fallback is allowed')
        directory = private / 'pi'; directory.mkdir()
        target = directory / 'models.json'
        target.write_text(json.dumps({'providers': {provider: data}})); target.chmod(0o600)
        env.update(PI_CODING_AGENT_DIR=str(directory), PI_OFFLINE='1', PI_TELEMETRY='0')
        return [str(runtime), '--mode', 'json', '--print', '--no-session', '--offline', '--no-extensions', '--no-prompt-templates', '--no-themes', '--no-skills', '--skill', str(workspace / '.pi/skills'), '--tools', env.get('YSS_EVAL_PI_TOOLS', 'read,grep,find,ls'), '--provider', provider, '--model', args.model, '--thinking', args.reasoning_effort]
    if kind == 'cursor':
        if getattr(args, 'cursor_auth_from_keychain', False):
            if sys.platform != 'darwin': raise RuntimeError('Cursor keychain authentication is only available on macOS')
            credentials = {}
            for field, service in [('accessToken', 'cursor-access-token'), ('refreshToken', 'cursor-refresh-token')]:
                result = subprocess.run(['/usr/bin/security', 'find-generic-password', '-s', service, '-a', 'cursor-user', '-w'], capture_output=True, text=True, timeout=20)
                if result.returncode or not result.stdout.strip(): raise RuntimeError('Existing Cursor keychain credential unavailable')
                credentials[field] = result.stdout.strip()
            # Copy only this account's auth fields. Never expose values in argv,
            # reports, fixture files, or the user's persistent configuration.
            directory = Path(env['HOME']) / '.cursor'; directory.mkdir(mode=0o700, exist_ok=True)
            target = directory / 'auth.json'
            target.write_text(json.dumps(credentials)); target.chmod(0o600)
            env.update(AGENT_CLI_CREDENTIAL_STORE='file', CURSOR_CONFIG_DIR=str(directory), CURSOR_DATA_DIR=str(private / 'cursor-data'), XDG_CONFIG_HOME=str(private / 'config'), DIRENV_DISABLE='1')
            env.pop('CURSOR_AUTH_TOKEN', None)
            env.pop('CURSOR_API_KEY', None)
        # Existing CURSOR_API_KEY may be consumed by the CLI; never archive it.
        # With no credential available in this isolated HOME, fail before a model attempt.
        status = subprocess.run([str(runtime), 'status', '--format', 'json'], env=env, cwd=workspace, capture_output=True, text=True, timeout=20)
        try: authenticated = json.loads(status.stdout).get('isAuthenticated') is True
        except (ValueError, AttributeError): authenticated = False
        if status.returncode or not authenticated: raise RuntimeError('Cursor authentication unavailable in isolated HOME')
        return [str(runtime), '--print', '--output-format', 'stream-json', *(['--mode', 'ask'] if env.get('YSS_EVAL_CURSOR_MODE', 'ask') == 'ask' else []), '--sandbox', 'enabled', '--workspace', str(workspace), '--model', args.model]
    raise ValueError('unsupported runtime')


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
if name=='git' and os.environ.get('YSS_EVAL_REAL_GIT')=='1':
 root=pathlib.Path(os.environ['YSS_EVAL_WORKSPACE']).resolve()
 if not pathlib.Path.cwd().resolve().is_relative_to(root):sys.exit(73)
 if any(x in args for x in ['push','fetch','pull','clone']):print('fixture blocks network Git');sys.exit(73)
 for i,arg in enumerate(args):
  if arg=='-C' and not pathlib.Path(args[i+1]).resolve().is_relative_to(root):sys.exit(73)
  if arg.startswith(('--git-dir','--work-tree')):sys.exit(73)
 os.execv('/usr/bin/git',['git']+args)
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
elif name=='pnpm' and os.environ.get('YSS_EVAL_REAL_PNPM') and args in json.loads(os.environ.get('YSS_EVAL_PNPM_COMMANDS','[]')):
 os.execv(os.environ['YSS_EVAL_REAL_PNPM'],['pnpm']+args)
elif name in ['gh','glab','curl','wget','npm','npx','pnpm']:print('fixture capability unavailable');sys.exit(73)
else:print('fixture command passed')
'''
        for tool in ["git", "pnpm", "npm", "npx", "gh", "glab", "curl", "wget"]:
            p = bin_dir / tool; p.write_text(stub); p.chmod(0o755)
        if not case.get("fixture_git"): (workspace / ".git").mkdir(exist_ok=True)
        temporary = workspace / ".eval-tmp"; temporary.mkdir()
        with tempfile.TemporaryDirectory(prefix="yss-eval-auth-") as private:
            private = Path(private)
            if auth is not None: (private / "auth.json").symlink_to(auth)
            home = private / "home"; home.mkdir()
            env = os.environ.copy()
            env.update(HOME=str(home), CODEX_HOME=str(private), PATH=str(bin_dir) + os.pathsep + env["PATH"], YSS_EVAL_COMMAND_LOG=str(commands), YSS_EVAL_GIT_STATUS=case.get("git_status", ""), TMPDIR=str(temporary))
            capabilities = case.get('runtime_capabilities', 'readonly')
            if capabilities not in ['readonly', 'fixture-write']: raise ValueError('unknown runtime_capabilities')
            if case.get('real_pnpm_commands'):
                permitted = case['real_pnpm_commands']
                if not case.get('fixture_git') or not isinstance(permitted, list) or any(command not in [['test'], ['run', 'test'], ['run', 'lint'], ['run', 'build']] for command in permitted): raise ValueError('real_pnpm_commands only allow declared fixture test/lint/build scripts')
                pnpm = shutil.which('pnpm')
                if not pnpm: raise ValueError('existing pnpm runtime unavailable')
                env.update(YSS_EVAL_REAL_PNPM=pnpm, YSS_EVAL_PNPM_COMMANDS=json.dumps(permitted))
            env.update(YSS_EVAL_WORKSPACE=str(workspace), YSS_EVAL_CURSOR_MODE='agent' if capabilities == 'fixture-write' else 'ask', YSS_EVAL_PI_TOOLS='read,grep,find,ls,bash,edit,write' if capabilities == 'fixture-write' else 'read,grep,find,ls')
            env = fixture_git_env(env)
            if case.get('fixture_git'):
                env['YSS_EVAL_REAL_GIT'] = '1'
                git_baseline = prepare_fixture_git(workspace, case['fixture_git'], env)
                (destination / 'fixture-git-baseline.json').write_text(json.dumps(git_baseline, indent=2) + '\n')
            env.update(PYTHONNOUSERSITE="1", PYTHONPATH=metadata.get("python_dependencies", {}).get("path", ""))
            if case.get("setup_script"):
                setup = safe(workspace, case["setup_script"])
                if setup.suffix != ".mjs" or not setup.is_file(): raise ValueError("setup_script must be a fixture-local .mjs file")
                with (destination / "setup.log").open("w") as log:
                    prepared = subprocess.run(["node", str(setup)], cwd=workspace, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=60)
                if prepared.returncode: raise RuntimeError("fixture setup failed before Agent execution; inspect setup.log")
            command = runtime_command(args, runtime, workspace, private, env)
            for step in steps:
                effective = {**step, 'required_paths': list(dict.fromkeys(case.get('required_paths', []) + step.get('required_paths', [])))}
                if 'allowed_writes' not in effective and 'allowed_writes' in case: effective['allowed_writes'] = case['allowed_writes']
                step_dir = destination / step["id"] if "steps" in case else destination
                row = execute_step(command, env, step_dir, workspace, effective, commands, args.timeout, budget, getattr(args, 'runtime', 'codex'))
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


def reported_usage(steps):
    observations = [usage for step in steps for usage in step['usage']]
    # A subtotal is useful, but an absent metric is not a measured zero.
    return {key: sum(usage[key] for usage in observations if key in usage) if any(key in usage for usage in observations) else None
            for key in ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens']}


def batch_summary(planned, rows, budget, stop_reason, exit_policy):
    steps = [step for row in rows for step in row['steps']]
    failed = sum(row['automatic_result'] != 'passed' for row in rows)
    incomplete = bool(stop_reason) or len(rows) != len(planned)
    status = 'incomplete' if incomplete else ('failed' if failed else 'passed')
    exit_code = 2 if incomplete else (1 if failed and exit_policy == 'strict' else 0)
    return {'schema_version': 1, 'status': status, 'exit_code': exit_code, 'exit_policy': exit_policy, 'semantic_review': 'pending', 'planned_scenarios': len(planned), 'scenario_records': len(rows), 'passed_scenarios': len(rows)-failed, 'failed_scenarios': failed, 'unattempted_scenarios': [{'scenario': case['id'], 'repeat': repeat, 'reason': stop_reason or 'not-executed'} for case, repeat in planned[len(rows):]], 'unattempted_steps': [{'scenario': row['scenario'], 'repeat': row['repeat'], 'steps': row['unattempted_steps'], 'reason': row['stop_reason'] or 'previous-step-failed'} for row in rows if row['unattempted_steps']], 'stop_reason': stop_reason, 'budget': {'max_turns': budget.max_turns, 'max_seconds': budget.max_seconds, 'shared_ledger': str(budget.ledger) if budget.ledger else None, 'attempted_turns': budget.attempted_turns, 'elapsed_seconds': round(time.monotonic()-budget.started, 2)}, 'completed_turns': sum(step.get('turn_completed', False) for step in steps), 'usage_unreported_turns': max(0, budget.attempted_turns-sum(bool(step['usage']) for step in steps)), 'reported_usage': reported_usage(steps), 'money': None, 'limits': ['Automatic checks only; semantic review still required', 'Cached input is part of input; absent usage is unknown, not zero', 'Deadline bounds Agent timeouts; fixture setup, scoring and cleanup may exceed the window']}


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
    budget = RunBudget(getattr(args, 'max_turns', None), getattr(args, 'max_seconds', None), getattr(args, 'budget_ledger', None))
    exit_policy = getattr(args, 'exit_policy', 'strict')
    if exit_policy not in ['strict', 'report-only']: raise ValueError('unknown exit policy')
    output.mkdir(parents=True, exist_ok=True)
    planned = [(case, repeat) for case in selected for repeat in range(1, args.repetitions+1)]
    rows = []; stop_reason = None
    try:
        auth = authentication_path() if getattr(args, 'runtime', 'codex') == 'codex' else None
        if auth is not None and not auth.exists(): raise RuntimeError('Codex credentials missing; evaluation incomplete')
        config = {'runtime': str(runtime), 'runtime_sha256': hashlib.sha256(runtime.read_bytes()).hexdigest(), 'runner_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'model': args.model, 'reasoning_effort': args.reasoning_effort, 'repetitions': args.repetitions, 'suite_sha256': hashlib.sha256(Path(args.scenarios).read_bytes()).hexdigest(), 'source': str(source), 'variant': args.variant, 'python_dependencies': getattr(args, 'python_dependencies', None), 'python_runtime': sys.executable, 'exit_policy': exit_policy, 'max_turns': budget.max_turns, 'max_seconds': budget.max_seconds, 'per_turn_timeout_seconds': args.timeout}
        config['runtime_kind'] = getattr(args, 'runtime', 'codex')
        if config['runtime_kind'] == 'codex': _, config['provider_binding'] = codex_provider_flags(getattr(args, 'codex_config_source', None))
        elif config['runtime_kind'] == 'pi':
            definition = json.loads(Path(args.pi_models_source).read_text()).get('providers', {}).get(args.pi_provider)
            if not definition: raise ValueError('Pi provider missing; no provider fallback is allowed')
            config['provider_binding'] = {'provider': args.pi_provider, 'model': args.model, 'source': args.pi_models_source, 'definition_sha256': hashlib.sha256(json.dumps(definition, sort_keys=True).encode()).hexdigest(), 'credentials': 'private-temporary-file-only'}
        else: config['provider_binding'] = {'provider': 'cursor-current-account', 'model': args.model, 'credential_source': 'scoped-existing-keychain-to-private-file' if getattr(args, 'cursor_auth_from_keychain', False) else 'isolated-runtime-environment'}
        version = subprocess.run([str(runtime), '--version'], capture_output=True, text=True, timeout=10)
        config['runtime_version'] = version.stdout.strip() if version.returncode == 0 else None
        config['budget_ledger'] = str(budget.ledger) if budget.ledger else None
        (output / 'run-config.json').write_text(json.dumps(config, indent=2)+'\n')
        for case, repeat in planned:
            budget.check()
            row = run_case(args, case, repeat, source, runtime, auth, output, budget)
            rows.append(row)
            stop_reason = row['stop_reason']
            if not stop_reason and not budget.ledger and budget.max_seconds is not None and time.monotonic()-budget.started >= budget.max_seconds:
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
    parser.add_argument('--runtime', choices=['codex', 'cursor', 'pi'], default='codex', help='--codex supplies the selected runtime executable for backwards compatibility')
    parser.add_argument('--pi-provider')
    parser.add_argument('--pi-models-source', help='Existing Pi provider configuration; selected provider copied only into private temporary runtime directory')
    parser.add_argument('--cursor-auth-from-keychain', action='store_true', help='Copy only existing macOS Cursor access/refresh credentials to a private temporary file store; never load personal skills/configuration')
    parser.add_argument('--budget-ledger', help='Shared external JSON ledger; accumulates attempts and Agent seconds across variants and retries')
    parser.add_argument('--codex-config-source', help='Read only the selected provider from this TOML; do not load user skills/hooks/MCPs')
    parser.add_argument('--max-turns', type=int, help='Maximum Agent invocation attempts across this batch')
    parser.add_argument('--max-seconds', type=float, help='Batch deadline; caps remaining Agent timeout and stops new turns')
    parser.add_argument('--exit-policy', choices=['strict', 'report-only'], default='strict', help='strict: 0 automatic pass, 1 failed, 2 incomplete; report-only retains 0 for completed failed batches')
    try: sys.exit(run(parser.parse_args()))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)
