"""Counterexamples for result checking, without running an LLM or external action."""
import importlib.util
import json
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


if __name__ == "__main__":
    unittest.main()
