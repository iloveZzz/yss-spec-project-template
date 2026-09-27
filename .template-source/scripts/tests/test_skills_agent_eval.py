"""Counterexamples for result checking, without running an LLM or external action."""
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path
import tempfile
import unittest
from unittest import mock
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("skills_agent_eval", Path(__file__).parents[1] / "skills-agent-eval.py")
evaluation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evaluation)


class ResultChecks(unittest.TestCase):
    def test_json_non_objects_and_boolean_type_mismatch_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            check = {'kind': 'json_equal', 'path': 'out.json', 'key': 'ready', 'value': False}
            for value in [[], None, 'text', 0, {'ready': 0}]:
                with self.subTest(value=value):
                    (root / 'out.json').write_text(json.dumps(value))
                    self.assertTrue(evaluation.assertions({'assertions': [check]}, root, [], ''))

    def test_existing_evidence_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            suite = root / "suite.json"
            suite.write_text('{"scenarios": []}')
            output = root / "results"
            output.mkdir()
            config = output / "run-config.json"
            config.write_text('original evidence')
            with self.assertRaisesRegex(RuntimeError, "Output is not empty"):
                evaluation.run(SimpleNamespace(scenarios=str(suite), output=str(output)))
            self.assertEqual(config.read_text(), 'original evidence')

    def test_route_field_is_distinct_from_explanatory_mention(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            check = {"kind": "json_equal", "path": "route.json", "key": "next_skill", "value": "yss-strategic-design"}
            for actual, failures in [("yss-strategic-design", 0), ("yss-product-lifecycle", 1)]:
                (root / "route.json").write_text(json.dumps({"next_skill": actual, "reason": "yss-product-lifecycle is not installed"}))
                self.assertEqual(len(evaluation.assertions({"assertions": [check]}, root, [], "")), failures)

    def test_missing_and_invalid_artifacts_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            check = {"kind": "json_equal", "path": "route.json", "key": "next_skill", "value": "valid"}
            self.assertTrue(evaluation.assertions({"assertions": [check]}, root, [], ""))
            (root / "route.json").write_text("not JSON")
            self.assertTrue(evaluation.assertions({"assertions": [check]}, root, [], ""))

    def test_artifact_paths_cannot_escape_fixture(self):
        with tempfile.TemporaryDirectory() as directory:
            for relative in ["../user-state.json", "/etc/passwd", "."]:
                with self.assertRaises(ValueError): evaluation.safe(Path(directory), relative)


class WorkspaceChecks(unittest.TestCase):
    def test_required_source_must_be_copied_before_fixture_injection(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); source = root / 'source'; source.mkdir()
            (source / 'AGENTS.md').write_text('source rules')
            (source / 'required.txt').write_text('required source')
            for files in [{}, {'required.txt': 'injected substitute'}]:
                workspace = root / ('injected' if files else 'omitted'); workspace.mkdir()
                with self.assertRaisesRegex(ValueError, 'required.*workspace'):
                    evaluation.prepare_workspace(source, workspace, {'required_paths': ['required.txt'], 'source_paths': ['AGENTS.md'], 'files': files})

    def test_current_rules_and_layout_are_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory); source = base / "source"; workspace = base / "workspace"
            source.mkdir(); workspace.mkdir()
            (source / "AGENTS.md").write_text("original authoritative policy\n")
            (source / ".template-spec").mkdir()
            (source / ".template-spec" / "registry.yaml").write_text("current registry")
            metadata = evaluation.prepare_workspace(source, workspace, {"required_paths": ["AGENTS.md", ".template-spec/registry.yaml"]})
            self.assertTrue((workspace / "AGENTS.md").read_text().startswith("original authoritative policy\n"))
            self.assertIn("fixture", (workspace / "AGENTS.md").read_text())
            self.assertEqual((workspace / ".template-spec/registry.yaml").read_text(), "current registry")
            self.assertNotEqual(metadata["source_rules_sha256"], metadata["effective_rules_sha256"])

    def test_missing_required_source_fails_before_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory); source = base / "source"; workspace = base / "workspace"
            source.mkdir(); workspace.mkdir()
            with self.assertRaisesRegex(ValueError, "required source"):
                evaluation.prepare_workspace(source, workspace, {"required_paths": [".template-spec/missing.yaml"]})

    def test_fixture_cannot_replace_rules_or_escape_via_symlink(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory); workspace = base / "workspace"; workspace.mkdir()
            for ref in ["AGENTS.md", "./AGENTS.md", str(workspace / "AGENTS.md")]:
                with self.assertRaises(ValueError): evaluation.write_fixture_files(workspace, {ref: "fake policy"})
            (workspace / "escape").symlink_to(base, target_is_directory=True)
            with self.assertRaises(ValueError): evaluation.write_fixture_files(workspace, {"escape/outside.txt": "bad"})

    def test_multistep_requires_unique_ids_and_reuses_workspace(self):
        steps = evaluation.scenario_steps({"steps": [{"id": "first", "prompt": "draft"}, {"id": "resume", "prompt": "continue"}]})
        self.assertEqual([step["id"] for step in steps], ["first", "resume"])
        with self.assertRaises(ValueError): evaluation.scenario_steps({"steps": [{"id": "x", "prompt": "a"}, {"id": "x", "prompt": "b"}]})
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            evaluation.write_fixture_files(workspace, {"step1.txt": "retained"})
            evaluation.write_fixture_files(workspace, {"step2.txt": "${FIXTURE_ROOT}"})
            self.assertEqual((workspace / "step1.txt").read_text(), "retained")
            self.assertEqual((workspace / "step2.txt").read_text(), str(workspace))

    def test_offline_dependencies_work_without_user_site_and_are_fingerprinted(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); dependencies = root / "dependencies"; workspace = root / "workspace"
            dependencies.mkdir(); workspace.mkdir()
            (dependencies / "fixture_dependency.py").write_text("VALUE = 'offline'\n")
            copied = evaluation.prepare_python_dependencies(dependencies, workspace)
            env = os.environ.copy(); env.update(PYTHONPATH=copied["path"], PYTHONNOUSERSITE="1")
            result = subprocess.run([sys.executable, "-s", "-c", "import fixture_dependency;print(fixture_dependency.VALUE)"], env=env, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), "offline")
            self.assertEqual(copied["files"][0]["ref"], "fixture_dependency.py")

    def test_manifest_records_symlink_without_reading_external_content(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); workspace = root / "workspace"; workspace.mkdir()
            (workspace / "external").symlink_to(root / "unavailable")
            manifest = evaluation.input_manifest(workspace)
            self.assertEqual(manifest, [{"ref": "external", "symlink": str(root / "unavailable")}])


class ExecutionChecks(unittest.TestCase):
    def test_interrupt_stops_process_group_and_retains_step_result(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); process = mock.Mock(pid=123456)
            process.wait.side_effect = [KeyboardInterrupt(), 0, 0]
            with mock.patch.object(evaluation.subprocess, 'Popen', return_value=process), mock.patch.object(evaluation.os, 'killpg') as kill:
                row = evaluation.execute_step(['fake-no-model'], {}, root / 'step', root, {'id': 'main', 'prompt': 'fixture'}, root / 'commands.jsonl', 10)
            self.assertEqual(row['automatic_result'], 'failed')
            self.assertEqual(row['runtime_errors'][0]['type'], 'interrupted')
            self.assertEqual(kill.call_count, 2)
            self.assertTrue((root / 'step/step-result.json').exists())

    def test_malformed_runtime_event_is_recorded_without_losing_result(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            code = "print('{\"item\":null}');print('{\"type\":\"turn.completed\",\"usage\":[]}')"
            row = evaluation.execute_step([sys.executable, '-c', code], os.environ.copy(), root / 'step', root, {'id': 'main', 'prompt': 'fixture'}, root / 'commands.jsonl', 2)
            self.assertEqual(row['automatic_result'], 'failed')
            self.assertEqual(sum(error['type'] == 'trace-invalid' for error in row['runtime_errors']), 2)
            self.assertTrue((root / 'step/step-result.json').exists())

    def test_write_scope_readonly_directory_boundary_deletion_and_symlink(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); workspace = root / 'workspace'; workspace.mkdir()
            (workspace / 'original.txt').write_text('keep')
            before = evaluation.input_manifest(workspace)
            (workspace / 'original.txt').unlink()
            (workspace / 'output').mkdir(); (workspace / 'output/ok').write_text('ok')
            (workspace / 'output-sibling').write_text('outside allowed directory')
            (workspace / 'output/link').symlink_to(root / 'missing-outside')
            result = evaluation.inspect_writes(workspace, before, ['output/'])
            self.assertEqual(result['violations'], ['original.txt', 'output-sibling', 'output/link'])
            readonly = evaluation.inspect_writes(workspace, before, [])
            self.assertEqual(readonly['status'], 'failed')
            for refs in [None, 'out', ['../escape'], ['AGENTS.md'], ['.']]:
                with self.subTest(refs=refs), self.assertRaises(ValueError):
                    evaluation.allowed_writes(workspace, {'allowed_writes': refs})

    def test_invalid_json_shape_retains_step_result_and_usage(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); workspace = root / 'workspace'; workspace.mkdir()
            (workspace / 'out.json').write_text('[]')
            command = [sys.executable, '-c', 'print(\'{"type":"turn.completed","usage":{"input_tokens":7,"output_tokens":2}}\')']
            row = evaluation.execute_step(command, os.environ.copy(), root / 'step', workspace, {'id': 'main', 'prompt': 'fixture', 'assertions': [{'kind': 'json_equal', 'path': 'out.json', 'key': 'ready', 'value': False}]}, workspace / 'commands.jsonl', 2)
            self.assertEqual(row['automatic_result'], 'failed')
            self.assertEqual(row['usage'][0]['input_tokens'], 7)
            self.assertEqual(json.loads((root / 'step/step-result.json').read_text()), row)

    def test_assertion_io_and_node_timeout_are_recorded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); (root / 'binary').write_bytes(b'\xff')
            checks = [{'kind': 'contains', 'path': 'binary', 'value': 'x'}, {'kind': 'node', 'code': 'fixture'}]
            with mock.patch.object(evaluation.subprocess, 'run', side_effect=subprocess.TimeoutExpired('node', 20)):
                failures = evaluation.assertions({'assertions': checks}, root, [], '')
            self.assertEqual(len(failures), 2)
            self.assertEqual({row['error_type'] for row in failures}, {'UnicodeDecodeError', 'TimeoutExpired'})

    def test_declared_write_scope_rejects_extra_writes_and_preserves_legacy_status(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); workspace = root / 'workspace'; workspace.mkdir()
            (workspace / 'source.txt').write_text('original')
            code = "from pathlib import Path; p=Path(" + repr(str(workspace)) + "); (p/'out.txt').write_text('allowed'); (p/'source.txt').write_text('changed'); print('{\"type\":\"turn.completed\"}')"
            row = evaluation.execute_step([sys.executable, '-c', code], os.environ.copy(), root / 'step', workspace, {'id': 'main', 'prompt': 'fixture', 'allowed_writes': ['out.txt'], 'assertions': [{'kind': 'exists', 'path': 'out.txt'}]}, workspace / 'commands.jsonl', 2)
            self.assertEqual(row['automatic_result'], 'failed')
            self.assertEqual(row['write_scope']['status'], 'failed')
            self.assertIn('source.txt', row['write_scope']['violations'])
            legacy = evaluation.execute_step([sys.executable, '-c', "print('{\"type\":\"turn.completed\"}')"], os.environ.copy(), root / 'legacy', workspace, {'id': 'main', 'prompt': 'fixture'}, workspace / 'commands.jsonl', 2)
            self.assertEqual(legacy['write_scope']['status'], 'not-checked')

    def test_missing_completed_turn_and_timeout_are_failures(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); commands = root / "commands.jsonl"
            step = {"id": "main", "prompt": "fixture", "assertions": []}
            missing = evaluation.execute_step([sys.executable, "-c", "print('{}')"], os.environ.copy(), root / "missing", root, step, commands, 2)
            self.assertEqual(missing["automatic_result"], "failed")
            self.assertIn("completed turn", missing["runtime_errors"][0]["message"])
            timed = evaluation.execute_step([sys.executable, "-c", "import time;time.sleep(5)"], os.environ.copy(), root / "timeout", root, step, commands, 0.05)
            self.assertTrue(timed["timeout"])
            self.assertIsNone(timed["exit_code"])
            self.assertTrue((root / "timeout/step-result.json").exists())

    def test_completed_turn_does_not_hide_artifact_assertion_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row = evaluation.execute_step([sys.executable, "-c", "print('{\"type\":\"turn.completed\"}')"], os.environ.copy(), root / "result", root, {"id":"main", "prompt":"fixture", "assertions":[{"kind":"exists","path":"missing.json"}]}, root / "commands.jsonl", 2)
            self.assertEqual(row["automatic_result"], "failed")
            self.assertTrue(row["assertion_failures"])


class BatchChecks(unittest.TestCase):
    def run_batch(self, root, cases, **options):
        source = root / 'source'; source.mkdir(); (source / 'AGENTS.md').write_text('fixture rules')
        (source / 'required.txt').write_text('source evidence')
        runtime = root / 'fake-codex'
        runtime.write_text('#!' + sys.executable + '\n' + '''import json,pathlib,sys,time
root=pathlib.Path(sys.argv[sys.argv.index('-C')+1]); prompt=sys.argv[-1]
if prompt=='slow': time.sleep(10)
if prompt=='missing-completed': print('{}'); sys.exit(0)
(root/'out.json').write_text('[]' if prompt=='invalid-json' else '{"ready":false}')
if prompt=='extra-write': (root/'required.txt').write_text('unexpected')
print(json.dumps({'type':'turn.completed','usage':{'input_tokens':7,'output_tokens':2}}))
''')
        runtime.chmod(0o755)
        suite = root / 'suite.json'; suite.write_text(json.dumps({'scenarios': cases}))
        auth = root / 'fake-runtime-identity'; auth.write_text('{}')
        args = SimpleNamespace(source=str(source), scenarios=str(suite), output=str(root / 'results'), variant='fixture', codex=str(runtime), model='fake-runtime-no-model', reasoning_effort='low', repetitions=1, timeout=2, scenario=None, python_dependencies=None, max_turns=None, max_seconds=None, exit_policy='strict')
        for key, value in options.items(): setattr(args, key, value)
        with mock.patch.object(evaluation, 'authentication_path', return_value=auth):
            code = evaluation.run(args)
        return code, json.loads((root / 'results/summary.json').read_text())

    def case(self, identity='one', prompt='pass'):
        return {'id': identity, 'repo': '.', 'prompt': prompt, 'source_paths': ['AGENTS.md', 'required.txt'], 'required_paths': ['AGENTS.md', 'required.txt'], 'allowed_writes': ['out.json'], 'assertions': [{'kind': 'json_equal', 'path': 'out.json', 'key': 'ready', 'value': False}]}

    def test_strict_pass_fail_and_report_only_exit_policies(self):
        for prompt, policy, expected, status in [('pass', 'strict', 0, 'passed'), ('invalid-json', 'strict', 1, 'failed'), ('invalid-json', 'report-only', 0, 'failed'), ('extra-write', 'strict', 1, 'failed')]:
            with self.subTest(prompt=prompt, policy=policy), tempfile.TemporaryDirectory() as directory:
                root = Path(directory); code, summary = self.run_batch(root, [self.case(prompt=prompt)], exit_policy=policy)
                self.assertEqual((code, summary['status']), (expected, status))
                self.assertEqual(summary['semantic_review'], 'pending')
                self.assertEqual(summary['reported_usage']['input_tokens'], 7)
                self.assertEqual(summary['budget']['attempted_turns'], 1)
                result = json.loads((root / 'results/one-1/result.json').read_text())
                self.assertEqual(result['steps'][0]['write_scope']['allowed_writes'], ['out.json'])

    def test_turn_budget_records_unattempted_steps_and_scenarios(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); first = self.case(); first.pop('prompt')
            first['steps'] = [{'id': 'initial', 'prompt': 'pass'}, {'id': 'resume', 'prompt': 'pass'}]
            code, summary = self.run_batch(root, [first, self.case('later')], max_turns=1)
            self.assertEqual(code, 2)
            self.assertEqual(summary['stop_reason'], 'budget-exhausted:max-turns')
            self.assertEqual(summary['budget']['attempted_turns'], 1)
            self.assertEqual(summary['unattempted_steps'][0]['steps'], ['resume'])
            self.assertEqual(summary['unattempted_scenarios'][0]['scenario'], 'later')
            self.assertTrue((root / 'results/one-1/initial/step-result.json').exists())
            self.assertFalse((root / 'results/later-1').exists())

    def test_total_deadline_stops_following_runs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            code, summary = self.run_batch(root, [self.case(prompt='slow'), self.case('later')], max_seconds=0.2)
            self.assertEqual(code, 2)
            self.assertEqual(summary['stop_reason'], 'budget-exhausted:max-seconds')
            self.assertLessEqual(summary['budget']['attempted_turns'], 1)
            self.assertLess(summary['budget']['elapsed_seconds'], 4)
            self.assertFalse((root / 'results/later-1').exists())

    def test_setup_cannot_remove_required_input_before_agent(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); case = self.case()
            case['files'] = {'setup.mjs': "import {unlinkSync} from 'node:fs';unlinkSync('required.txt');"}
            case['setup_script'] = 'setup.mjs'
            code, summary = self.run_batch(root, [case, self.case('later')])
            self.assertEqual(code, 2)
            self.assertEqual(summary['budget']['attempted_turns'], 0)
            row = json.loads((root / 'results/one-1/result.json').read_text())
            self.assertIn('required workspace before Agent', row['runtime_errors'][0]['message'])
            self.assertEqual(row['unattempted_steps'], ['main'])

    def test_missing_completed_turn_stops_batch_and_keeps_unknown_usage(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); code, summary = self.run_batch(root, [self.case(prompt='missing-completed'), self.case('later')], exit_policy='report-only')
            self.assertEqual(code, 2)
            self.assertEqual(summary['usage_unreported_turns'], 1)
            self.assertEqual(summary['completed_turns'], 0)
            self.assertIsNone(summary['money'])
            self.assertFalse((root / 'results/later-1').exists())

    def test_budget_rejects_invalid_values_and_caps_remaining_timeout(self):
        for limit in [0, -1, float('nan'), float('inf')]:
            with self.subTest(limit=limit), self.assertRaises(ValueError): evaluation.RunBudget(max_seconds=limit)
        with mock.patch.object(evaluation.time, 'monotonic', return_value=100): budget = evaluation.RunBudget(max_seconds=10)
        with mock.patch.object(evaluation.time, 'monotonic', return_value=108): self.assertEqual(budget.reserve(300), 2)
        with mock.patch.object(evaluation.time, 'monotonic', return_value=110), self.assertRaises(evaluation.BudgetExhausted): budget.reserve(300)


if __name__ == "__main__":
    unittest.main()
