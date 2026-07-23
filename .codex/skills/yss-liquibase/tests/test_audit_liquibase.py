import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "audit_liquibase.py"


class AuditLiquibaseCliTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name) / "repo"
        self.root.mkdir()
        self._git("init")
        self._git("config", "user.email", "test@example.com")
        self._git("config", "user.name", "Test User")
        self._git("commit", "--allow-empty", "-m", "baseline")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def _git(self, *args: str) -> None:
        subprocess.run(
            ["git", *args],
            cwd=self.root,
            check=True,
            capture_output=True,
            text=True,
        )

    def _audit(self, baseline: str, cwd: Path) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                str(self.root),
                f"--baseline={baseline}",
                "--format",
                "json",
            ],
            cwd=cwd,
            check=False,
            capture_output=True,
            text=True,
        )

    def test_rejects_git_option_as_baseline_without_writing_file(self) -> None:
        output = Path(self.temp_dir.name) / "git-output"

        result = self._audit(f"--output={output}", self.root)

        payload = json.loads(result.stdout)
        rules = {finding["rule"] for finding in payload["findings"]}
        self.assertIn("invalid-baseline", rules)
        self.assertFalse(output.exists())

    def test_resolves_repository_from_audited_root(self) -> None:
        outside = Path(self.temp_dir.name) / "outside"
        outside.mkdir()

        result = self._audit("HEAD", outside)

        payload = json.loads(result.stdout)
        rules = {finding["rule"] for finding in payload["findings"]}
        self.assertNotIn("git-unavailable", rules)
        self.assertNotIn("invalid-baseline", rules)


if __name__ == "__main__":
    unittest.main()
