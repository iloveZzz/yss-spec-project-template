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
        self.assertIn("template: yss-spec-project-template", comet.read_text())

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

    def test_state_load_upgrades_legacy_template_names(self):
        from ysscomet_lifecycle.state import load_state

        for legacy_name in ["hermes-project-template", "ysscomet-project-template"]:
            state_file = self.tmp_path / f"{legacy_name}.yaml"
            state_file.write_text(f"meta:\n  version: 1.1\n  template: {legacy_name}\npipelines:\n")

            state = load_state(state_file)

            self.assertEqual(state["meta"]["template"], "yss-spec-project-template")

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

    def test_real_backend_receives_handoff_context_environment(self):
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
            "                'status: draft\\nowner: ai\\n---\\n'\n"
            "                f\"handoff={os.environ['YSSCOMET_TASK_HANDOFF_CONTEXT']}\\n\")\n"
        )
        fake_codex.chmod(0o755)
        os.environ["PATH"] = f"{fake_bin}{os.pathsep}{os.environ['PATH']}"

        result = run_task(
            self.tmp_path,
            Task(
                id="demo-feature-build",
                pipeline="demo-feature",
                stage="build",
                agent_role="tdd",
                goal="生成测试",
                output_path="tests/test_demo_feature.py",
                backend_hint="codex",
                handoff_context=".ysscomet/handoff/demo-feature/design_build.json",
            ),
        )

        self.assertEqual(result["status"], "success", result)
        self.assertIn("handoff=.ysscomet/handoff/demo-feature/design_build.json", (self.tmp_path / "tests/test_demo_feature.py").read_text())

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

    def test_ysscomet_run_uses_default_backend_from_config(self):
        comet = self.init_pipeline()
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
            "                'status: draft\\nowner: ai\\n---\\nCONFIG_BACKEND\\n')\n"
        )
        fake_codex.chmod(0o755)
        config_dir = self.tmp_path / ".ysscomet"
        config_dir.mkdir()
        (config_dir / "config.yaml").write_text("default_backend: codex\n")
        env_path = os.environ["PATH"]
        os.environ["PATH"] = f"{fake_bin}{os.pathsep}{env_path}"
        try:
            result = run_cmd([str(REPO / "scripts" / "ysscomet"), "--state", str(comet), "run", "demo-feature"], self.tmp_path)
        finally:
            os.environ["PATH"] = env_path

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("CONFIG_BACKEND", (self.tmp_path / "docs/api/specs/demo-feature.yaml").read_text())

    def test_ysscomet_doctor_discloses_backend_environment(self):
        result = run_cmd([str(REPO / "scripts" / "ysscomet"), "doctor"], self.tmp_path)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("codex", result.stdout)
        self.assertIn("stub", result.stdout)

    def test_ysscomet_status_json_reports_snapshot_risks_and_next_action(self):
        comet = self.init_pipeline()

        result = run_cmd(
            [
                str(REPO / "scripts" / "ysscomet"),
                "--state",
                str(comet),
                "status",
                "demo-feature",
                "--json",
            ],
            self.tmp_path,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["pipeline"], "demo-feature")
        self.assertEqual(payload["current_stage"], "open")
        self.assertFalse(payload["artifacts"]["spec"]["exists"])
        self.assertTrue(any(risk["code"] == "ARTIFACT_MISSING" for risk in payload["risks"]))
        self.assertEqual(payload["nextAction"]["command"], "scripts/ysscomet run demo-feature")

    def test_ysscomet_next_recommends_run_then_advance(self):
        comet = self.init_pipeline()

        missing = run_cmd(
            [str(REPO / "scripts" / "ysscomet"), "--state", str(comet), "next", "demo-feature", "--json"],
            self.tmp_path,
        )
        self.assertEqual(missing.returncode, 0, missing.stderr)
        self.assertEqual(json.loads(missing.stdout)["command"], "scripts/ysscomet run demo-feature")

        write_spec(self.tmp_path / "docs/api/specs/demo-feature.yaml", "demo-feature")
        ready = run_cmd(
            [str(REPO / "scripts" / "ysscomet"), "--state", str(comet), "next", "demo-feature", "--json"],
            self.tmp_path,
        )
        self.assertEqual(ready.returncode, 0, ready.stderr)
        self.assertEqual(json.loads(ready.stdout)["command"], "scripts/ysscomet advance demo-feature")

    def test_ysscomet_doctor_json_reports_state_warning_and_environment(self):
        result = run_cmd([str(REPO / "scripts" / "ysscomet"), "doctor", "--json"], self.tmp_path)

        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertTrue(any(check["code"] == "STATE_MISSING" and check["status"] == "warn" for check in payload["checks"]))
        self.assertTrue(any(check["code"] == "BACKEND_STUB" and check["status"] == "pass" for check in payload["checks"]))
        self.assertTrue(any(check["code"] == "SCRIPT_EXECUTABLE" and check["status"] == "pass" for check in payload["checks"]))
        self.assertTrue(any(check["code"] == "TOOL_OPENSPEC" for check in payload["checks"]))
        self.assertTrue(any(check["code"] == "TOOL_SUPERPOWERS" for check in payload["checks"]))

    def test_config_defaults_without_writing_file(self):
        from ysscomet_lifecycle.config import load_config

        config = load_config(self.tmp_path)

        self.assertEqual(config["auto_transition"], False)
        self.assertEqual(config["context_compression"], "off")
        self.assertEqual(config["default_backend"], "stub")
        self.assertEqual(config["required_tools"], ["openspec", "superpowers"])
        self.assertFalse((self.tmp_path / ".ysscomet/config.yaml").exists())

    def test_doctor_reports_openspec_and_superpowers_when_available(self):
        from ysscomet_lifecycle.inspector import collect_doctor

        fake_bin = self.tmp_path / "bin"
        fake_bin.mkdir()
        fake_openspec = fake_bin / "openspec"
        fake_openspec.write_text("#!/usr/bin/env bash\necho OpenSpec 0.0.0\n")
        fake_openspec.chmod(0o755)
        fake_home = self.tmp_path / "home"
        (fake_home / ".codex/plugins/cache/openai-api-curated/superpowers").mkdir(parents=True)
        env_path = os.environ["PATH"]
        os.environ["PATH"] = f"{fake_bin}{os.pathsep}{env_path}"
        try:
            payload = collect_doctor(self.tmp_path, self.tmp_path / ".comet.yaml", tools_root=REPO, home=fake_home)
        finally:
            os.environ["PATH"] = env_path

        self.assertTrue(any(check["code"] == "TOOL_OPENSPEC" and check["status"] == "pass" for check in payload["checks"]))
        self.assertTrue(any(check["code"] == "TOOL_SUPERPOWERS" and check["status"] == "pass" for check in payload["checks"]))

    def test_design_to_build_advance_generates_handoff_context(self):
        comet = self.init_pipeline()
        write_spec(self.tmp_path / "docs/api/specs/demo-feature.yaml", "demo-feature")
        run_cmd([sys.executable, str(REPO / "scripts" / "comet-driver"), "demo-feature", "advance", "--state", str(comet)], self.tmp_path)
        write_markdown_artifact(self.tmp_path / ".ysscomet/plans/demo-feature.md", "demo-feature", "design")

        result = run_cmd([sys.executable, str(REPO / "scripts" / "comet-driver"), "demo-feature", "advance", "--state", str(comet)], self.tmp_path)

        self.assertEqual(result.returncode, 0, result.stderr)
        handoff_path = self.tmp_path / ".ysscomet/handoff/demo-feature/design_build.json"
        self.assertTrue(handoff_path.exists())
        handoff = json.loads(handoff_path.read_text())
        self.assertEqual(handoff["pipeline"], "demo-feature")
        self.assertEqual(handoff["from_stage"], "design")
        self.assertEqual(handoff["to_stage"], "build")
        self.assertEqual(handoff["artifacts"]["plan"]["path"], ".ysscomet/plans/demo-feature.md")
        self.assertIsNotNone(handoff["artifacts"]["plan"]["sha256"])
        state = comet.read_text()
        self.assertIn("handoff_context: .ysscomet/handoff/demo-feature/design_build.json", state)
        self.assertIn("handoff_hash:", state)

    def test_auto_transition_adds_next_action_without_running_next_stage(self):
        comet = self.init_pipeline()
        config_dir = self.tmp_path / ".ysscomet"
        config_dir.mkdir()
        (config_dir / "config.yaml").write_text("auto_transition: true\n")
        write_spec(self.tmp_path / "docs/api/specs/demo-feature.yaml", "demo-feature")

        result = run_cmd([sys.executable, str(REPO / "scripts" / "comet-driver"), "demo-feature", "advance", "--state", str(comet)], self.tmp_path)

        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["nextAction"]["command"], "scripts/ysscomet run demo-feature")
        self.assertFalse((self.tmp_path / ".ysscomet/plans/demo-feature.md").exists())

    def test_legacy_hermes_cli_forwards_to_ysscomet(self):
        result = run_cmd([str(REPO / "scripts" / "hermes"), "doctor"], self.tmp_path)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("YSSComet Environment", result.stdout)

    def test_hermes_core_rpc_exposes_doctor_for_shell_bridge(self):
        request = json.dumps({"id": "doctor-1", "method": "doctor", "params": {"root": str(self.tmp_path)}})

        result = run_cmd([sys.executable, "-m", "hermes_lifecycle.rpc"], self.tmp_path)

        self.assertNotEqual(result.returncode, 0)

        result = subprocess.run(
            [sys.executable, "-m", "hermes_lifecycle.rpc"],
            cwd=self.tmp_path,
            env={**os.environ, "PYTHONPATH": str(REPO)},
            input=request + "\n",
            text=True,
            capture_output=True,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["id"], "doctor-1")
        self.assertTrue(payload["ok"])
        self.assertTrue(any(check["code"] == "BACKEND_STUB" for check in payload["result"]["checks"]))

    def test_typescript_shell_scaffold_declares_doctor_bridge(self):
        package_json = REPO / "packages" / "hermes-cli-ts" / "package.json"
        bridge = REPO / "packages" / "hermes-cli-ts" / "src" / "bridge" / "pythonBridge.ts"
        index = REPO / "packages" / "hermes-cli-ts" / "src" / "index.ts"
        doctor = REPO / "packages" / "hermes-cli-ts" / "src" / "commands" / "doctor.tsx"

        self.assertTrue(package_json.exists())
        package_payload = json.loads(package_json.read_text())
        self.assertEqual(package_payload["bin"]["hermes"], "dist/index.js")
        self.assertEqual(package_payload["bin"]["codex"], "dist/index.js")
        self.assertEqual(package_payload["bin"]["trae"], "dist/index.js")
        self.assertIn("execa", package_payload["dependencies"])
        self.assertIn("ink", package_payload["dependencies"])
        self.assertIn("react", package_payload["dependencies"])
        self.assertIn('["-m", "hermes_lifecycle.rpc"]', bridge.read_text())
        self.assertIn('new URL("../../../..", import.meta.url)', bridge.read_text())
        self.assertIn("process.env.INIT_CWD ?? process.cwd()", doctor.read_text())
        self.assertIn("createDoctorCommand(shellBrand)", index.read_text())
        self.assertIn('render(<DoctorView', doctor.read_text())
        self.assertIn('callPython<DoctorResult>("doctor"', doctor.read_text())
        self.assertTrue((REPO / "packages" / "hermes-cli-ts" / "src" / "shellBrand.ts").exists())
        self.assertTrue((REPO / "packages" / "hermes-cli-ts" / "src" / "ui" / "DoctorView.tsx").exists())

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
