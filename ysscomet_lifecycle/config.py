from __future__ import annotations

from pathlib import Path
from typing import Any


DEFAULT_CONFIG: dict[str, Any] = {
    "auto_transition": False,
    "context_compression": "off",
    "default_backend": "stub",
    "required_tools": ["openspec", "superpowers"],
}


def load_config(root: Path) -> dict[str, Any]:
    path = root / ".ysscomet/config.yaml"
    config = dict(DEFAULT_CONFIG)
    if not path.exists():
        return config
    for raw in path.read_text().splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        if key not in DEFAULT_CONFIG:
            continue
        config[key] = _parse_value(value.strip(), DEFAULT_CONFIG[key])
    return config


def _parse_value(value: str, default: Any = None) -> Any:
    lowered = value.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if lowered in {"null", ""}:
        return None
    if isinstance(default, list):
        return [item.strip() for item in value.strip("[]").split(",") if item.strip()]
    return value.strip('"').strip("'")
