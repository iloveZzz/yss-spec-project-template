from __future__ import annotations

import argparse
import json
import uuid
from pathlib import Path
from typing import Any

from .state import load_state, now_iso


def event(metric: str, value: Any, unit: str, dims: dict[str, str], source: str) -> dict[str, Any]:
    return {"id": str(uuid.uuid4()), "ts": now_iso(), "metric": metric, "value": value, "unit": unit, "dims": dims, "source": source}


def collect_comet(root: Path, state_path: Path) -> list[dict[str, Any]]:
    state = load_state(state_path)
    events: list[dict[str, Any]] = []
    for pipeline, item in state.get("pipelines", {}).items():
        sprint = item.get("sprint", "Sprint 1")
        for history in item.get("history", []):
            if history.get("action") == "create":
                events.append(event("flow.pipeline_created", 1, "count", {"pipeline": pipeline, "sprint": sprint, "stage": history.get("stage", "open")}, "comet-history"))
            if history.get("result") == "fail":
                events.append(event("flow.blocked_count", 1, "count", {"pipeline": pipeline, "sprint": sprint, "stage": history.get("from", "")}, "comet-history"))
            if history.get("result") == "pass" and history.get("from"):
                events.append(event("flow.guard_pass_rate", 1, "count", {"pipeline": pipeline, "sprint": sprint, "stage": history.get("from", "")}, "comet-history"))
    metrics_dir = root / "metrics"
    metrics_dir.mkdir(exist_ok=True)
    events_path = metrics_dir / "events.jsonl"
    existing_keys: set[str] = set()
    if events_path.exists():
        for line in events_path.read_text().splitlines():
            if not line.strip():
                continue
            current = json.loads(line)
            existing_keys.add(event_key(current))
    new_events = [item for item in events if event_key(item) not in existing_keys]
    with events_path.open("a") as handle:
        for item in new_events:
            handle.write(json.dumps(item, ensure_ascii=False) + "\n")
    write_snapshots(root, state, read_events(events_path))
    return new_events


def event_key(item: dict[str, Any]) -> str:
    dims = "|".join(f"{key}={item['dims'].get(key, '')}" for key in sorted(item.get("dims", {})))
    return f"{item.get('metric')}|{item.get('source')}|{dims}"


def read_events(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def write_snapshots(root: Path, state: dict[str, Any], events: list[dict[str, Any]]) -> None:
    by_sprint: dict[str, dict[str, Any]] = {}
    for pipeline, item in state.get("pipelines", {}).items():
        sprint = item.get("sprint", "Sprint 1")
        bucket = by_sprint.setdefault(sprint, {"sprint": sprint, "pipelines": [], "metrics": {}})
        bucket["pipelines"].append({"id": pipeline, "current_stage": item.get("current_stage")})
    for item in events:
        sprint = item["dims"].get("sprint", "Sprint 1")
        bucket = by_sprint.setdefault(sprint, {"sprint": sprint, "pipelines": [], "metrics": {}})
        bucket["metrics"][item["metric"]] = bucket["metrics"].get(item["metric"], 0) + item["value"]
    snapshots = root / "metrics/snapshots"
    snapshots.mkdir(parents=True, exist_ok=True)
    for sprint, payload in by_sprint.items():
        safe = sprint.replace(" ", "-")
        (snapshots / f"{safe}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["collect-comet"])
    parser.add_argument("--state", default=".comet.yaml")
    args = parser.parse_args(argv)
    if args.command == "collect-comet":
        events = collect_comet(Path.cwd(), Path(args.state))
        print(json.dumps({"events": len(events)}, ensure_ascii=False))
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
