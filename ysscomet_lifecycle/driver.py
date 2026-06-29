from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .config import load_config
from .guard import run_guard
from .handoff import generate_handoff
from .inspector import collect_pipeline_snapshot
from .state import STAGES, TRANSITIONS, get_pipeline, init_pipeline, load_state, now_iso, save_state


def status_text(pipeline: str, item: dict[str, Any]) -> str:
    lines = [f"Pipeline: {pipeline}", f"Current stage: {item['current_stage']}", f"Sprint: {item.get('sprint', '')}"]
    for stage in STAGES:
        stage_data = item["stages"].get(stage, {})
        guard = stage_data.get("guard") or {}
        suffix = f" guard={guard.get('result')}" if guard else ""
        lines.append(f"- {stage}: {stage_data.get('status', 'pending')}{suffix}")
    return "\n".join(lines)


def advance(state_path: Path, pipeline: str, retry: bool = False) -> tuple[int, dict[str, Any]]:
    state = load_state(state_path)
    item = get_pipeline(state, pipeline)
    current = item["current_stage"]
    if current == "archive":
        payload = {"result": "fail", "checks": [{"id": "already-archive", "pass": False}]}
        return 1, payload
    stage_data = item["stages"][current]
    if retry and stage_data.get("status") != "blocked":
        payload = {"result": "fail", "checks": [{"id": "retry-requires-blocked", "pass": False}]}
        return 1, payload
    target = TRANSITIONS[current]
    payload = run_guard(state_path.parent if state_path.parent != Path("") else Path.cwd(), state_path, pipeline, current, target)
    ran_at = now_iso()
    stage_data["guard"] = {**payload, "ran_at": ran_at}
    action = "retry" if retry else "advance"
    if payload["result"] == "pass":
        root = state_path.parent if state_path.parent != Path("") else Path.cwd()
        stage_data["status"] = "passed"
        stage_data["passed_at"] = ran_at
        item["current_stage"] = target
        item["stages"][target]["status"] = "active"
        item["stages"][target]["entered_at"] = ran_at
        item["stages"][target].setdefault("guard", None)
        handoff = generate_handoff(root, state_path, pipeline, current, target)
        if handoff:
            item["handoff_context"] = handoff["path"]
            item["handoff_hash"] = handoff["sha256"]
        item["history"].append({"at": ran_at, "action": action, "from": current, "to": target, "result": "pass"})
        save_state(state_path, state)
        if resolve_auto_transition(root, item):
            snapshot = collect_pipeline_snapshot(root, state_path, pipeline)
            payload["nextAction"] = snapshot["nextAction"]
        return 0, payload
    stage_data["status"] = "blocked"
    item["history"].append({"at": ran_at, "action": action, "from": current, "to": target, "result": "fail"})
    save_state(state_path, state)
    return 1, payload


def resolve_auto_transition(root: Path, item: dict[str, Any]) -> bool:
    value = item.get("auto_transition")
    if value is not None:
        return bool(value)
    return bool(load_config(root).get("auto_transition"))


def skip_stage(state_path: Path, pipeline: str, stage: str, reason: str) -> None:
    if stage in {"open", "archive"} or stage not in STAGES:
        raise ValueError("Only design/build/verify may be skipped")
    state = load_state(state_path)
    item = get_pipeline(state, pipeline)
    item["stages"][stage]["status"] = "skipped"
    item["stages"][stage]["guard"] = {"result": "pass", "note": reason, "checks": [{"id": "skip-approved", "pass": True, "detail": reason}]}
    item["history"].append({"at": now_iso(), "action": "skip", "stage": stage, "result": "pass", "reason": reason})
    save_state(state_path, state)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pipeline")
    parser.add_argument("command", choices=["init", "status", "advance", "retry", "history", "skip"])
    parser.add_argument("stage", nargs="?")
    parser.add_argument("--state", default=".comet.yaml")
    parser.add_argument("--title")
    parser.add_argument("--sprint", default="Sprint 1")
    parser.add_argument("--spec")
    parser.add_argument("--reason")
    args = parser.parse_args(argv)
    state_path = Path(args.state)
    try:
        if args.command == "init":
            init_pipeline(state_path, args.pipeline, args.title, args.sprint, args.spec)
            print(f"Initialized pipeline {args.pipeline}")
            return 0
        if args.command == "advance":
            code, payload = advance(state_path, args.pipeline)
            print(json.dumps(payload, ensure_ascii=False, indent=2))
            return code
        if args.command == "retry":
            code, payload = advance(state_path, args.pipeline, retry=True)
            print(json.dumps(payload, ensure_ascii=False, indent=2))
            return code
        state = load_state(state_path)
        item = get_pipeline(state, args.pipeline)
        if args.command == "status":
            print(status_text(args.pipeline, item))
            return 0
        if args.command == "history":
            print(json.dumps(item.get("history", []), ensure_ascii=False, indent=2))
            return 0
        if args.command == "skip":
            if not args.stage or not args.reason:
                raise ValueError("skip requires <stage> and --reason")
            skip_stage(state_path, args.pipeline, args.stage, args.reason)
            print(f"Skipped {args.stage} for {args.pipeline}")
            return 0
    except Exception as exc:
        print(str(exc))
        return 2
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
