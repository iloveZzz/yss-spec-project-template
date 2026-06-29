from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


BACKENDS = {
    "stub": {"cli": [], "platform": "stub"},
    "codex": {"cli": ["codex"], "platform": None},
    "hermes": {"cli": ["hermes"], "aliases": ["hermess"], "platform": None},
    "trae": {"cli": ["trae"], "platform": None},
    "qoder": {"cli": ["qoder"], "platform": None},
    "claude-code": {"cli": ["claude", "claude-code"], "platform": None},
}

STAGE_LABELS = {
    "open": "开放",
    "design": "设计",
    "build": "构建",
    "verify": "验证",
    "archive": "归档",
}


@dataclass
class Task:
    id: str
    pipeline: str
    stage: str
    agent_role: str
    goal: str
    output_path: str
    backend_hint: str = "codex"


def available_cli(backend: str) -> str | None:
    spec = BACKENDS.get(backend, {})
    names = list(spec.get("cli") or []) + list(spec.get("aliases") or [])
    for name in names:
        found = shutil.which(name)
        if found:
            return found
    return None


def write_stub_artifact(root: Path, task: Task) -> Path:
    path = root / task.output_path
    path.parent.mkdir(parents=True, exist_ok=True)
    if task.stage == "open":
        content = (
            "---\n"
            f"pipeline: {task.pipeline}\n"
            "stage: open\n"
            "status: draft\n"
            "owner: ai\n"
            "---\n"
            "openapi: 3.1.0\n"
            "info:\n"
            f"  title: {task.pipeline}\n"
            "  version: 0.1.0\n"
            "paths: {}\n"
        )
    elif task.stage == "build" and path.suffix == ".py":
        content = (
            "\"\"\"Generated lifecycle smoke tests.\n\n"
            f"pipeline: {task.pipeline}\n"
            f"stage: {task.stage}\n"
            "status: draft\n"
            "owner: ai\n"
            "\"\"\"\n\n"
            f"def test_{task.pipeline.replace('-', '_')}_lifecycle_smoke():\n"
            "    assert True\n"
        )
    else:
        label = STAGE_LABELS.get(task.stage, task.stage)
        content = (
            "---\n"
            f"pipeline: {task.pipeline}\n"
            f"stage: {task.stage}\n"
            "status: draft\n"
            "owner: ai\n"
            "---\n\n"
            f"# {task.pipeline} {label}阶段产物\n\n"
            "## 目标\n\n"
            f"{task.goal}\n\n"
            "## 产出说明\n\n"
            "本文档由 YSSComet Lifecycle Harness 生成，用于支撑当前 Comet 阶段推进前的产物检查。\n"
        )
    path.write_text(content)
    return path


def validate_artifact(path: Path, task: Task) -> str | None:
    if not path.exists() or path.stat().st_size == 0:
        return "ARTIFACT_MISSING"
    text = path.read_text()
    if f"pipeline: {task.pipeline}" not in text:
        return "ARTIFACT_PIPELINE_MISMATCH"
    return None


def run_cli_backend(root: Path, task: Task, executable: str) -> subprocess.CompletedProcess[str]:
    output_path = root / task.output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env.update(
        {
            "YSSCOMET_TASK_ID": task.id,
            "YSSCOMET_TASK_PIPELINE": task.pipeline,
            "YSSCOMET_TASK_STAGE": task.stage,
            "YSSCOMET_TASK_ROLE": task.agent_role,
            "YSSCOMET_TASK_GOAL": task.goal,
            "YSSCOMET_TASK_OUTPUT_PATH": str(output_path),
            "HERMES_TASK_ID": task.id,
            "HERMES_TASK_PIPELINE": task.pipeline,
            "HERMES_TASK_STAGE": task.stage,
            "HERMES_TASK_ROLE": task.agent_role,
            "HERMES_TASK_GOAL": task.goal,
            "HERMES_TASK_OUTPUT_PATH": str(output_path),
        }
    )
    prompt = (
        f"为 pipeline {task.pipeline} 的 {task.stage} 阶段生成中文产物，"
        f"写入 {output_path}，文件头必须包含 pipeline: {task.pipeline}。目标：{task.goal}"
    )
    if Path(executable).name == "codex":
        command = [executable, "exec", "--cd", str(root), prompt]
    else:
        command = [executable, prompt]
    return subprocess.run(command, cwd=root, env=env, text=True, capture_output=True, timeout=300)


def run_task(root: Path, task: Task) -> dict[str, Any]:
    started = time.time()
    backend = task.backend_hint if task.backend_hint in BACKENDS else "codex"
    cli = available_cli(backend)
    transport = "stub" if backend == "stub" else ("cli" if cli else "unavailable")
    output_path = root / task.output_path
    log = f"backend={backend}; transport={transport}"
    error = None
    if backend == "stub":
        artifact = write_stub_artifact(root, task)
    elif cli:
        completed = run_cli_backend(root, task, cli)
        artifact = output_path
        log = f"{log}; exit={completed.returncode}; stdout={completed.stdout[-500:]}; stderr={completed.stderr[-500:]}"
        if completed.returncode != 0:
            error = "BACKEND_COMMAND_FAILED"
    else:
        artifact = output_path
        error = "NO_BACKEND_TRANSPORT"
    artifact_error = validate_artifact(artifact, task)
    if artifact_error and not error:
        error = artifact_error
    status = "success" if error is None else "failure"
    result = {
        "status": status,
        "backend": backend,
        "transport": transport,
        "output_path": task.output_path,
        "artifacts": [task.output_path],
        "log": log,
        "duration_s": round(time.time() - started, 3),
        "error": error,
    }
    logs_dir = root / "logs/harness"
    logs_dir.mkdir(parents=True, exist_ok=True)
    (logs_dir / f"{task.id}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
    return result
