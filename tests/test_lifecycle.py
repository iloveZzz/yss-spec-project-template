import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]


def run_cmd(args, cwd):
    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO)
    return subprocess.run(args, cwd=cwd, env=env, text=True, capture_output=True)


def write_spec(path, pipeline):
    path.parent.mkdir(parents=True)
    path.write_text(
        "---\n"
        f"pipeline: {pipeline}\n"
        "stage: open\n"
        "status: draft\n"
        "owner: ai\n"
        "---\n"
        "openapi: 3.1.0\n"
        "info:\n"
        "  title: Demo\n"
        "  version: 0.1.0\n"
        "paths: {}\n"
    )


def write_markdown_artifact(path, pipeline, stage):
    path.parent.mkdir(parents=True)
    path.write_text(
        "---\n"
        f"pipeline: {pipeline}\n"
        f"stage: {stage}\n"
        "status: draft\n"
        "owner: ai\n"
        "---\n\n"
        f"# {pipeline} {stage}\n"
    )


class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def init_pipeline(self):
        comet = self.tmp_path / ".comet.yaml"
        result = run_cmd(
            [
                sys.executable,
                str(REPO / "scripts" / "comet-driver"),
                "demo-feature",
                "init",
                "--title",
                "Demo Feature",
                "--sprint",
                "Sprint 1",
                "--state",
                str(comet),
            ],
            self.tmp_path,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return comet

    def test_driver_init_and_guard_block_then_retry(self):
        comet = self.init_pipeline()
        self.assertIn("current_stage: open", comet.read_text())
        self.assertIn("status: active", comet.read_text())

        blocked = run_cmd(
            [
                sys.executable,
                str(REPO / "scripts" / "comet-driver"),
                "demo-feature",
                "advance",
                "--state",
                str(comet),
            ],
            self.tmp_path,
        )

        self.assertNotEqual(blocked.returncode, 0)
        self.assertIn("spec-exists", blocked.stdout)
        self.assertIn("status: blocked", comet.read_text())

        write_spec(self.tmp_path / "docs/api/specs/demo-feature.yaml", "demo-feature")
        retried = run_cmd(
            [
                sys.executable,
                str(REPO / "scripts" / "comet-driver"),
                "demo-feature",
                "retry",
                "--state",
                str(comet),
            ],
            self.tmp_path,
        )

        self.assertEqual(retried.returncode, 0, retried.stderr)
        state = comet.read_text()
        self.assertIn("current_stage: design", state)
        self.assertIn("result: pass", state)
        self.assertIn("action: retry", state)

    def test_guard_rejects_artifact_bound_to_other_pipeline(self):
        comet = self.init_pipeline()
        write_spec(self.tmp_path / "docs/api/specs/demo-feature.yaml", "other-feature")

        result = run_cmd(
            [
                str(REPO / "scripts" / "comet-guard.sh"),
                "demo-feature",
                "open",
                "design",
                "--state",
                str(comet),
            ],
            self.tmp_path,
        )

        payload = json.loads(result.stdout)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(payload["result"], "fail")
        self.assertTrue(any(check["id"] == "spec-bound" and not check["pass"] for check in payload["checks"]))

    def test_stage_executor_writes_bound_artifact_without_advancing(self):
        comet = self.init_pipeline()

        result = run_cmd(
            [
                sys.executable,
                str(REPO / "scripts" / "stage-executor"),
                "demo-feature",
                "--backend",
                "stub",
                "--state",
                str(comet),
            ],
            self.tmp_path,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        artifact = self.tmp_path / "docs/api/specs/demo-feature.yaml"
        self.assertTrue(artifact.exists())
        text = artifact.read_text()
        self.assertIn("pipeline: demo-feature", text)
        self.assertIn("stage: open", text)
        self.assertIn("current_stage: open", comet.read_text())

    def test_stage_executor_generates_chinese_markdown_artifacts(self):
        comet = self.init_pipeline()
        write_spec(self.tmp_path / "docs/api/specs/demo-feature.yaml", "demo-feature")
        run_cmd(
            [
                sys.executable,
                str(REPO / "scripts" / "comet-driver"),
                "demo-feature",
                "advance",
                "--state",
                str(comet),
            ],
            self.tmp_path,
        )

        result = run_cmd(
            [
                sys.executable,
                str(REPO / "scripts" / "stage-executor"),
                "demo-feature",
                "--backend",
                "stub",
                "--state",
                str(comet),
            ],
            self.tmp_path,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        text = (self.tmp_path / ".ysscomet/plans/demo-feature.md").read_text()
        self.assertIn("# demo-feature 设计阶段产物", text)
        self.assertIn("## 目标", text)

    def test_real_backend_must_create_valid_artifact(self):
        from ysscomet_lifecycle.harness import Task, run_task

        fake_bin = self.tmp_path / "bin"
        fake_bin.mkdir()
        fake_codex = fake_bin / "codex"
        fake_codex.write_text(
            "#!/usr/bin/env python3\n"
            "from pathlib import Path\n"
            "import os\n"
            "path = Path(os.environ['YSSCOMET_TASK_OUTPUT_PATH'])\n"
            "path.parent.mkdir(parents=True, exist_ok=True)\n"
            "path.write_text('---\\n'\n"
            "                f\"pipeline: {os.environ['YSSCOMET_TASK_PIPELINE']}\\n\"\n"
            "                f\"stage: {os.environ['YSSCOMET_TASK_STAGE']}\\n\"\n"
            "                'status: draft\\nowner: ai\\n---\\nCLI_MARKER\\n')\n"
        )
        fake_codex.chmod(0o755)
        os.environ["PATH"] = f"{fake_bin}{os.pathsep}{os.environ['PATH']}"

        result = run_task(
            self.tmp_path,
            Task(
                id="demo-feature-design",
                pipeline="demo-feature",
                stage="design",
                agent_role="plan",
                goal="生成实现计划",
                output_path=".ysscomet/plans/demo-feature.md",
                backend_hint="codex",
            ),
        )

        self.assertEqual(result["status"], "success", result)
        self.assertEqual(result["transport"], "cli")
        text = (self.tmp_path / ".ysscomet/plans/demo-feature.md").read_text()
        self.assertIn("pipeline: demo-feature", text)
        self.assertIn("CLI_MARKER", text)

    def test_build_guard_requires_pipeline_test_artifact(self):
        comet = self.init_pipeline()
        write_spec(self.tmp_path / "docs/api/specs/demo-feature.yaml", "demo-feature")
        run_cmd([sys.executable, str(REPO / "scripts" / "comet-driver"), "demo-feature", "advance", "--state", str(comet)], self.tmp_path)
        write_markdown_artifact(self.tmp_path / ".ysscomet/plans/demo-feature.md", "demo-feature", "design")
        run_cmd([sys.executable, str(REPO / "scripts" / "comet-driver"), "demo-feature", "advance", "--state", str(comet)], self.tmp_path)

        missing = run_cmd([sys.executable, str(REPO / "scripts" / "comet-driver"), "demo-feature", "advance", "--state", str(comet)], self.tmp_path)
        self.assertNotEqual(missing.returncode, 0)
        self.assertIn("tests-exists", missing.stdout)

        test_artifact = self.tmp_path / "tests/test_demo_feature.py"
        test_artifact.parent.mkdir()
        test_artifact.write_text('"""pipeline: other-feature\nstage: build\n"""\n')
        wrong = run_cmd([str(REPO / "scripts" / "comet-guard.sh"), "demo-feature", "build", "verify", "--state", str(comet)], self.tmp_path)
        payload = json.loads(wrong.stdout)
        self.assertNotEqual(wrong.returncode, 0)
        self.assertTrue(any(check["id"] == "tests-bound" and not check["pass"] for check in payload["checks"]))

    def test_ysscomet_run_rejects_stage_mismatch(self):
        comet = self.init_pipeline()
        result = run_cmd(
            [
                str(REPO / "scripts" / "ysscomet"),
                "--state",
                str(comet),
                "run",
                "demo-feature",
                "verify",
                "--backend",
                "stub",
            ],
            self.tmp_path,
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("current stage is open", result.stderr)

    def test_ysscomet_run_defaults_to_stub_for_progressive_disclosure(self):
        comet = self.init_pipeline()
        result = run_cmd(
            [
                str(REPO / "scripts" / "ysscomet"),
                "--state",
                str(comet),
                "run",
                "demo-feature",
            ],
            self.tmp_path,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.tmp_path / "docs/api/specs/demo-feature.yaml").exists())

    def test_ysscomet_doctor_discloses_backend_environment(self):
        result = run_cmd([str(REPO / "scripts" / "ysscomet"), "doctor"], self.tmp_path)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("codex", result.stdout)
        self.assertIn("stub", result.stdout)

    def test_legacy_hermes_cli_forwards_to_ysscomet(self):
        result = run_cmd([str(REPO / "scripts" / "hermes"), "doctor"], self.tmp_path)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("YSSComet Environment", result.stdout)

    def test_harness_declares_required_backends(self):
        from ysscomet_lifecycle.harness import BACKENDS

        self.assertIn("stub", BACKENDS)
        self.assertIn("codex", BACKENDS)
        self.assertIn("hermes", BACKENDS)
        self.assertIn("trae", BACKENDS)
        self.assertIn("qoder", BACKENDS)
        self.assertIn("claude-code", BACKENDS)

    def test_metrics_collector_creates_events_and_snapshot(self):
        comet = self.init_pipeline()

        result = run_cmd(
            [
                sys.executable,
                str(REPO / "scripts" / "metrics-collector"),
                "collect-comet",
                "--state",
                str(comet),
            ],
            self.tmp_path,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        events = self.tmp_path / "metrics/events.jsonl"
        snapshot = self.tmp_path / "metrics/snapshots/Sprint-1.json"
        self.assertTrue(events.exists())
        self.assertIn("flow.pipeline_created", events.read_text())
        self.assertTrue(snapshot.exists())
        self.assertEqual(json.loads(snapshot.read_text())["sprint"], "Sprint 1")

        second = run_cmd(
            [
                sys.executable,
                str(REPO / "scripts" / "metrics-collector"),
                "collect-comet",
                "--state",
                str(comet),
            ],
            self.tmp_path,
        )
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(len(events.read_text().splitlines()), 1)

    def test_environment_has_expected_optional_cli_tools(self):
        self.assertIsNotNone(shutil.which("codex"))


if __name__ == "__main__":
    unittest.main()
