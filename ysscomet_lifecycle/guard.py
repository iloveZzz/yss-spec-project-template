from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any

from .state import get_pipeline, load_state


ARTIFACT_BY_FROM = {
    "open": ("spec", "spec"),
    "design": ("plan", "plan"),
    "verify": ("review", "review"),
}


def frontmatter(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    lines = path.read_text().splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    data: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip().strip('"')
    return data


def artifact_metadata(path: Path) -> dict[str, str]:
    meta = frontmatter(path)
    if meta:
        return meta
    if not path.exists():
        return {}
    data: dict[str, str] = {}
    for line in path.read_text().splitlines()[:20]:
        stripped = line.strip().strip('"').strip("'")
        if ":" in stripped:
            key, value = stripped.split(":", 1)
            key = key.strip()
            if key in {"pipeline", "stage", "status", "owner"}:
                data[key] = value.strip()
    return data


def check_artifact(root: Path, path_text: str, expected_pipeline: str, kind: str) -> list[dict[str, Any]]:
    artifact = root / path_text
    exists = artifact.exists() and artifact.stat().st_size > 0
    checks = [{"id": f"{kind}-exists", "pass": exists, "detail": path_text}]
    meta = artifact_metadata(artifact)
    checks.append(
        {
            "id": f"{kind}-bound",
            "pass": exists and meta.get("pipeline") == expected_pipeline,
            "detail": meta.get("pipeline", "missing"),
        }
    )
    return checks


def run_quality_checks(root: Path) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    backend = root / "backend"
    frontend = root / "frontend"
    if backend.exists() and (backend / "tests").exists():
        result = subprocess.run(["python3", "-m", "unittest", "discover", "-s", "tests"], cwd=backend, text=True, capture_output=True)
        checks.append({"id": "backend-tests", "pass": result.returncode == 0, "detail": (result.stdout + result.stderr)[-500:]})
    else:
        checks.append({"id": "backend-tests", "pass": True, "detail": "no backend tests configured"})
    if frontend.exists() and (frontend / "package.json").exists():
        result = subprocess.run(["npm", "test", "--", "--runInBand"], cwd=frontend, text=True, capture_output=True)
        checks.append({"id": "frontend-tests", "pass": result.returncode == 0, "detail": (result.stdout + result.stderr)[-500:]})
    else:
        checks.append({"id": "frontend-tests", "pass": True, "detail": "no frontend tests configured"})
    return checks


def run_guard(root: Path, state_path: Path, pipeline: str, from_stage: str, to_stage: str) -> dict[str, Any]:
    state = load_state(state_path)
    item = get_pipeline(state, pipeline)
    checks: list[dict[str, Any]] = []
    if from_stage == "build" and to_stage == "verify":
        checks.extend(check_artifact(root, item["artifacts"]["tests"], pipeline, "tests"))
        checks.extend(run_quality_checks(root))
    elif from_stage in ARTIFACT_BY_FROM:
        artifact_key, kind = ARTIFACT_BY_FROM[from_stage]
        checks.extend(check_artifact(root, item["artifacts"][artifact_key], pipeline, kind))
    else:
        checks.append({"id": "transition-supported", "pass": False, "detail": f"{from_stage}->{to_stage}"})
    result = "pass" if all(check["pass"] for check in checks) else "fail"
    return {
        "transition": f"{from_stage}_{to_stage}",
        "pipeline": pipeline,
        "result": result,
        "checks": checks,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pipeline")
    parser.add_argument("from_stage")
    parser.add_argument("to_stage")
    parser.add_argument("--state", default=".comet.yaml")
    args = parser.parse_args(argv)
    payload = run_guard(Path.cwd(), Path(args.state), args.pipeline, args.from_stage, args.to_stage)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if payload["result"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
