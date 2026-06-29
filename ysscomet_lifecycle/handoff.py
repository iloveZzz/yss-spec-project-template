from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .state import get_pipeline, load_state, now_iso


def generate_handoff(root: Path, state_path: Path, pipeline: str, from_stage: str, to_stage: str) -> dict[str, Any] | None:
    if (from_stage, to_stage) != ("design", "build"):
        return None
    state = load_state(state_path)
    item = get_pipeline(state, pipeline)
    output_path = f".ysscomet/handoff/{pipeline}/design_build.json"
    payload = {
        "pipeline": pipeline,
        "from_stage": from_stage,
        "to_stage": to_stage,
        "generated_at": now_iso(),
        "artifacts": {
            "spec": _artifact_ref(root, item["artifacts"]["spec"]),
            "plan": _artifact_ref(root, item["artifacts"]["plan"]),
        },
    }
    path = root / output_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    digest = _sha256(path)
    return {"path": output_path, "sha256": digest, "payload": payload}


def _artifact_ref(root: Path, path_text: str) -> dict[str, Any]:
    path = root / path_text
    exists = path.exists()
    return {
        "path": path_text,
        "exists": exists,
        "sha256": _sha256(path) if exists else None,
    }


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()
