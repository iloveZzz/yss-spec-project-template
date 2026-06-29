from __future__ import annotations

import argparse
import json
from pathlib import Path

from .harness import Task, run_task
from .state import get_pipeline, load_state


ROLE_BY_STAGE = {
    "open": "spec",
    "design": "plan",
    "build": "tdd",
    "verify": "review",
    "archive": "retro",
}

GOAL_BY_STAGE = {
    "open": "生成 OpenAPI 3.1 契约草案",
    "design": "生成实现计划和设计阶段产物",
    "build": "生成测试优先的构建阶段产物",
    "verify": "生成审查报告和验证阶段产物",
    "archive": "生成复盘报告和知识沉淀产物",
}

OUTPUT_BY_STAGE = {
    "open": "spec",
    "design": "plan",
    "build": "tests",
    "verify": "review",
    "archive": "retro",
}


def execute_stage(root: Path, state_path: Path, pipeline: str, backend: str) -> dict:
    state = load_state(state_path)
    item = get_pipeline(state, pipeline)
    stage = item["current_stage"]
    output_key = OUTPUT_BY_STAGE[stage]
    task = Task(
        id=f"{pipeline}-{stage}",
        pipeline=pipeline,
        stage=stage,
        agent_role=ROLE_BY_STAGE[stage],
        goal=f"{GOAL_BY_STAGE[stage]}：{pipeline}",
        output_path=item["artifacts"][output_key],
        backend_hint=backend,
        handoff_context=item.get("handoff_context"),
    )
    return run_task(root, task)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pipeline")
    parser.add_argument("--state", default=".comet.yaml")
    parser.add_argument("--backend", default="codex")
    args = parser.parse_args(argv)
    result = execute_stage(Path.cwd(), Path(args.state), args.pipeline, args.backend)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
