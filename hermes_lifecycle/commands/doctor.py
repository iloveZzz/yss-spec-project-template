from __future__ import annotations

from pathlib import Path
from typing import Any

from ysscomet_lifecycle.inspector import collect_doctor


def doctor(root: str | None = None, state: str = ".comet.yaml") -> dict[str, Any]:
    root_path = Path(root).resolve() if root else Path.cwd()
    state_path = Path(state)
    if not state_path.is_absolute():
        state_path = root_path / state_path
    return collect_doctor(root_path, state_path, Path(__file__).resolve().parents[2])
