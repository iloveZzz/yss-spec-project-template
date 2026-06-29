from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


STAGES = ["open", "design", "build", "verify", "archive"]
TRANSITIONS = {
    "open": "design",
    "design": "build",
    "build": "verify",
    "verify": "archive",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def default_artifacts(pipeline: str) -> dict[str, str]:
    snake = pipeline.replace("-", "_")
    return {
        "spec": f"docs/api/specs/{pipeline}.yaml",
        "prd": f"docs/requirements/{pipeline}-prd.md",
        "stories": f"docs/requirements/{pipeline}-stories.md",
        "plan": f".ysscomet/plans/{pipeline}.md",
        "tests": f"tests/test_{snake}.py",
        "review": f"docs/process/sprint-reviews/{pipeline}.md",
        "retro": f"docs/process/sprint-retros/{pipeline}.md",
    }


def new_state() -> dict[str, Any]:
    return {"meta": {"version": "1.1", "template": "yss-spec-project-template"}, "pipelines": {}}


def new_pipeline(pipeline: str, title: str | None, sprint: str, spec: str | None) -> dict[str, Any]:
    created = now_iso()
    artifacts = default_artifacts(pipeline)
    if spec:
        artifacts["spec"] = spec
    stages = {stage: {"status": "pending"} for stage in STAGES}
    stages["open"] = {"status": "active", "entered_at": created, "guard": None}
    return {
        "title": title or pipeline.replace("-", " ").title(),
        "sprint": sprint,
        "created_at": created,
        "current_stage": "open",
        "spec": artifacts["spec"],
        "artifacts": artifacts,
        "stages": stages,
        "history": [{"at": created, "action": "create", "stage": "open", "result": "pass"}],
    }


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists() or not path.read_text().strip():
        return new_state()
    text = path.read_text()
    if text.lstrip().startswith("{"):
        return json.loads(text)
    parsed = _parse_yaml_subset(text)
    if not parsed:
        return new_state()
    state = _upgrade_state(parsed)
    return state


def save_state(path: Path, state: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_dump_yaml(state))


def get_pipeline(state: dict[str, Any], pipeline: str) -> dict[str, Any]:
    pipelines = state.setdefault("pipelines", {})
    if pipeline not in pipelines:
        raise KeyError(f"Unknown pipeline: {pipeline}")
    return pipelines[pipeline]


def init_pipeline(path: Path, pipeline: str, title: str | None, sprint: str, spec: str | None) -> dict[str, Any]:
    state = load_state(path)
    pipelines = state.setdefault("pipelines", {})
    if pipeline in pipelines:
        raise ValueError(f"Pipeline already exists: {pipeline}")
    pipelines[pipeline] = new_pipeline(pipeline, title, sprint, spec)
    save_state(path, state)
    return state


def _upgrade_state(state: dict[str, Any]) -> dict[str, Any]:
    upgraded = deepcopy(state)
    upgraded.setdefault("meta", {})
    upgraded["meta"]["version"] = "1.1"
    if upgraded["meta"].get("template") in {"hermes-project-template", "ysscomet-project-template"}:
        upgraded["meta"]["template"] = "yss-spec-project-template"
    upgraded["meta"].setdefault("template", "yss-spec-project-template")
    upgraded.setdefault("pipelines", {})
    for pipeline, item in upgraded["pipelines"].items():
        item.setdefault("title", pipeline.replace("-", " ").title())
        item.setdefault("sprint", "Sprint 1")
        item.setdefault("created_at", now_iso())
        item.setdefault("current_stage", "open")
        artifacts = default_artifacts(pipeline)
        artifacts.update(item.get("artifacts") or {})
        if item.get("spec"):
            artifacts["spec"] = item["spec"]
        item["artifacts"] = artifacts
        item["spec"] = artifacts["spec"]
        stages = item.setdefault("stages", {})
        for stage in STAGES:
            stages.setdefault(stage, {"status": "pending"})
        stages[item["current_stage"]]["status"] = stages[item["current_stage"]].get("status", "active")
        item.setdefault("history", [])
    return upgraded


def _dump_yaml(value: Any, indent: int = 0) -> str:
    lines: list[str] = []
    prefix = " " * indent
    if isinstance(value, dict):
        for key, val in value.items():
            if isinstance(val, (dict, list)):
                lines.append(f"{prefix}{key}:")
                nested = _dump_yaml(val, indent + 2)
                if nested:
                    lines.append(nested.rstrip("\n"))
            elif val is None:
                lines.append(f"{prefix}{key}: null")
            else:
                lines.append(f"{prefix}{key}: {_format_scalar(val)}")
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                lines.append(f"{prefix}-")
                nested = _dump_yaml(item, indent + 2)
                if nested:
                    lines.append(nested.rstrip("\n"))
            else:
                lines.append(f"{prefix}- {_format_scalar(item)}")
    return "\n".join(lines) + ("\n" if lines else "")


def _format_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    text = str(value)
    if not text or any(ch in text for ch in [":", "#", "{", "}", "[", "]"]) or text.lower() in {"null", "true", "false"}:
        return json.dumps(text, ensure_ascii=False)
    return text


def _parse_yaml_subset(text: str) -> dict[str, Any]:
    lines = []
    for raw in text.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        lines.append((indent, raw.strip()))
    if not lines:
        return {}
    value, _ = _parse_block(lines, 0, lines[0][0])
    return value if isinstance(value, dict) else {}


def _parse_block(lines: list[tuple[int, str]], index: int, indent: int) -> tuple[Any, int]:
    is_list = index < len(lines) and lines[index][1].startswith("-")
    if is_list:
        result: list[Any] = []
        while index < len(lines):
            current_indent, content = lines[index]
            if current_indent != indent or not content.startswith("-"):
                break
            rest = content[1:].strip()
            if rest:
                result.append(_parse_scalar(rest))
                index += 1
            else:
                index += 1
                item, index = _parse_block(lines, index, indent + 2)
                result.append(item)
        return result, index
    result: dict[str, Any] = {}
    while index < len(lines):
        current_indent, content = lines[index]
        if current_indent != indent or content.startswith("-"):
            break
        if ":" not in content:
            index += 1
            continue
        key, raw_value = content.split(":", 1)
        raw_value = raw_value.strip()
        index += 1
        if raw_value:
            result[key] = _parse_scalar(raw_value)
        else:
            if index < len(lines) and lines[index][0] > indent:
                result[key], index = _parse_block(lines, index, lines[index][0])
            else:
                result[key] = {}
    return result, index


def _parse_scalar(value: str) -> Any:
    if value == "null":
        return None
    if value == "true":
        return True
    if value == "false":
        return False
    if value.startswith('"') and value.endswith('"'):
        return json.loads(value)
    return value
