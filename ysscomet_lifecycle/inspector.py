from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

from .guard import artifact_metadata
from .harness import BACKENDS, available_cli
from .state import get_pipeline, load_state


OUTPUT_BY_STAGE = {
    "open": "spec",
    "design": "plan",
    "build": "tests",
    "verify": "review",
    "archive": "retro",
}


def artifact_status(root: Path, path_text: str, pipeline: str) -> dict[str, Any]:
    path = root / path_text
    exists = path.exists() and path.stat().st_size > 0
    meta = artifact_metadata(path)
    bound = exists and meta.get("pipeline") == pipeline
    return {
        "path": path_text,
        "exists": exists,
        "bound": bound,
        "pipeline": meta.get("pipeline"),
    }


def collect_pipeline_snapshot(root: Path, state_path: Path, pipeline: str) -> dict[str, Any]:
    state = load_state(state_path)
    item = get_pipeline(state, pipeline)
    artifacts = {
        key: artifact_status(root, path, pipeline)
        for key, path in item.get("artifacts", {}).items()
    }
    risks = build_pipeline_risks(item, artifacts)
    return {
        "pipeline": pipeline,
        "title": item.get("title"),
        "sprint": item.get("sprint"),
        "workflow": item.get("workflow", "full"),
        "current_stage": item.get("current_stage"),
        "artifacts": artifacts,
        "stages": item.get("stages", {}),
        "handoff_context": item.get("handoff_context"),
        "handoff_hash": item.get("handoff_hash"),
        "risks": risks,
        "nextAction": recommend_next_action(root, item, artifacts, pipeline),
    }


def build_pipeline_risks(item: dict[str, Any], artifacts: dict[str, dict[str, Any]]) -> list[dict[str, str]]:
    risks: list[dict[str, str]] = []
    current = item.get("current_stage")
    artifact_key = OUTPUT_BY_STAGE.get(current)
    if artifact_key:
        artifact = artifacts.get(artifact_key, {})
        if not artifact.get("exists"):
            risks.append({"level": "warning", "code": "ARTIFACT_MISSING", "message": f"{artifact_key} artifact is missing"})
        elif not artifact.get("bound"):
            risks.append({"level": "error", "code": "ARTIFACT_PIPELINE_MISMATCH", "message": f"{artifact_key} artifact is not bound to this pipeline"})
    stage = item.get("stages", {}).get(current, {})
    guard = stage.get("guard") or {}
    if stage.get("status") == "blocked" or guard.get("result") == "fail":
        risks.append({"level": "error", "code": "GUARD_BLOCKED", "message": f"{current} guard is blocked"})
    if current == "verify" and not artifacts.get("review", {}).get("exists"):
        risks.append({"level": "info", "code": "VERIFY_PENDING", "message": "verify report is pending"})
    return risks


def recommend_next_action(root: Path, item: dict[str, Any], artifacts: dict[str, dict[str, Any]], pipeline: str) -> dict[str, Any]:
    current = item.get("current_stage")
    artifact_key = OUTPUT_BY_STAGE.get(current)
    if current == "archive":
        return {"command": None, "reason": "pipeline is already at archive"}
    artifact = artifacts.get(artifact_key or "", {})
    if artifact_key and artifact.get("exists") and artifact.get("bound"):
        return {"command": f"scripts/ysscomet advance {pipeline}", "reason": f"{artifact_key} artifact is ready"}
    return {"command": f"scripts/ysscomet run {pipeline}", "reason": f"{artifact_key} artifact is missing or unbound"}


def collect_doctor(root: Path, state_path: Path, tools_root: Path | None = None, home: Path | None = None) -> dict[str, Any]:
    script_root = tools_root or root
    home_root = home or Path.home()
    checks: list[dict[str, str]] = []
    checks.append(_check_state(state_path))
    checks.extend(_check_directories(root))
    checks.extend(_check_scripts(script_root))
    checks.extend(_check_required_tools(root, home_root))
    checks.extend(_check_backends())
    checks.append(_check_codegraph(root))
    checks.append(_check_git(root))
    return {"checks": checks}


def _check_state(state_path: Path) -> dict[str, str]:
    if state_path.exists():
        try:
            load_state(state_path)
            return {"code": "STATE_FILE", "status": "pass", "message": str(state_path)}
        except Exception as exc:
            return {"code": "STATE_INVALID", "status": "fail", "message": str(exc)}
    return {"code": "STATE_MISSING", "status": "warn", "message": str(state_path)}


def _check_directories(root: Path) -> list[dict[str, str]]:
    checks = []
    for path in ["docs/api", "docs/process", ".ysscomet"]:
        exists = (root / path).exists()
        checks.append({"code": f"DIR_{path.upper().replace('/', '_').replace('.', '')}", "status": "pass" if exists else "warn", "message": path})
    return checks


def _check_scripts(root: Path) -> list[dict[str, str]]:
    checks = []
    for name in ["ysscomet", "comet-driver", "comet-guard.sh", "stage-executor"]:
        path = root / "scripts" / name
        ok = path.exists() and path.stat().st_mode & 0o111
        checks.append({"code": "SCRIPT_EXECUTABLE", "status": "pass" if ok else "fail", "message": f"scripts/{name}"})
    return checks


def _check_backends() -> list[dict[str, str]]:
    checks = []
    for backend in BACKENDS:
        if backend == "stub":
            checks.append({"code": "BACKEND_STUB", "status": "pass", "message": "built-in"})
        else:
            cli = available_cli(backend)
            checks.append({"code": f"BACKEND_{backend.upper().replace('-', '_')}", "status": "pass" if cli else "warn", "message": cli or "missing"})
    return checks


def _check_required_tools(root: Path, home: Path) -> list[dict[str, str]]:
    return [_check_openspec(), _check_superpowers(root, home)]


def _check_openspec() -> dict[str, str]:
    cli = shutil.which("openspec")
    if not cli:
        return {"code": "TOOL_OPENSPEC", "status": "fail", "message": "missing; install Fission-AI/OpenSpec"}
    return {"code": "TOOL_OPENSPEC", "status": "pass", "message": cli}


def _check_superpowers(root: Path, home: Path) -> dict[str, str]:
    candidates = [
        root / ".codex/skills/superpowers",
        root / ".codex/plugins/cache/openai-api-curated/superpowers",
        home / ".codex/skills/superpowers",
        home / ".codex/plugins/cache/openai-api-curated/superpowers",
        home / ".agents/skills/superpowers",
    ]
    extra = os.environ.get("YSSCOMET_SUPERPOWERS_PATH")
    if extra:
        candidates.insert(0, Path(extra))
    for path in candidates:
        if path.exists():
            return {"code": "TOOL_SUPERPOWERS", "status": "pass", "message": str(path)}
    return {"code": "TOOL_SUPERPOWERS", "status": "fail", "message": "missing; install obra/superpowers"}


def _check_codegraph(root: Path) -> dict[str, str]:
    if (root / ".codegraph").exists():
        return {"code": "CODEGRAPH", "status": "pass", "message": ".codegraph present"}
    if shutil.which("codegraph"):
        return {"code": "CODEGRAPH_MISSING", "status": "warn", "message": "CLI installed but project index missing"}
    return {"code": "CODEGRAPH_MISSING", "status": "warn", "message": "codegraph not configured"}


def _check_git(root: Path) -> dict[str, str]:
    try:
        result = subprocess.run(["git", "status", "--porcelain"], cwd=root, text=True, capture_output=True, timeout=10)
        dirty = len([line for line in result.stdout.splitlines() if line.strip()])
        return {"code": "GIT_DIRTY", "status": "warn" if dirty else "pass", "message": str(dirty)}
    except Exception as exc:
        return {"code": "GIT_STATUS", "status": "warn", "message": str(exc)}


def print_json(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))
