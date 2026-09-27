"""Counterexamples for result checking, without running an LLM or external action."""
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path
import tempfile
import unittest
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("skills_agent_eval", Path(__file__).parents[1] / "skills-agent-eval.py")
evaluation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evaluation)


class ResultChecks(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
