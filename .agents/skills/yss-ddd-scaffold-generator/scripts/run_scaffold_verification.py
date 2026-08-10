#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""在生成项目根目录实际执行 YSS 脚手架的固定验证命令并留证。"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List


COMMANDS = ("validate", "test", "package")


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", errors="replace")


def run(project_root: Path, evidence_dir: Path) -> Dict[str, object]:
    wrapper = project_root / "mvnw"
    if not wrapper.is_file():
        raise FileNotFoundError(f"项目根目录缺少 Maven wrapper: {wrapper}")
    manifest_path = project_root / ".yss" / "scaffold-generation.json"
    if not manifest_path.is_file():
        raise FileNotFoundError(f"项目根目录缺少脚手架生成元数据清单: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    required_manifest_fields = [
        "schema_version",
        "contract_id",
        "contract_version",
        "slice_id",
        "approval_ref",
        "approver",
        "lifecycle_approval_ref",
        "router_draft_ref",
        "persisted_ref",
        "contract_file_ref",
        "current_version",
        "allowed_write_paths",
        "expected_evidence_files",
        "verification_commands",
        "generation_mode",
    ]
    missing_manifest_fields = [
        field for field in required_manifest_fields if manifest.get(field) in (None, "")
    ]
    if manifest.get("generation_mode") != "controlled-generation" or missing_manifest_fields:
        raise ValueError(
            "脚手架生成元数据清单不完整或不是 controlled-generation: "
            + ", ".join(missing_manifest_fields)
        )
    if manifest["current_version"] != manifest["contract_version"]:
        raise ValueError("脚手架生成元数据清单不是当前合同版本")
    if manifest["verification_commands"] != [
        "./mvnw validate",
        "./mvnw test",
        "./mvnw package",
    ]:
        raise ValueError("脚手架生成元数据清单验证命令不符合固定合同")

    evidence_dir.mkdir(parents=True, exist_ok=True)
    command_results: List[Dict[str, object]] = []
    for phase in COMMANDS:
        command = f"./mvnw {phase}"
        stdout_path = evidence_dir / f"mvnw-{phase}.stdout.log"
        stderr_path = evidence_dir / f"mvnw-{phase}.stderr.log"
        started_at = iso_now()
        started = time.monotonic()
        try:
            completed = subprocess.run(
                [str(wrapper), phase],
                cwd=project_root,
                text=True,
                capture_output=True,
                check=False,
            )
            exit_code = completed.returncode
            stdout = completed.stdout
            stderr = completed.stderr
        except OSError as exception:
            exit_code = 127
            stdout = ""
            stderr = str(exception)
        duration_ms = round((time.monotonic() - started) * 1000, 3)
        write_text(stdout_path, stdout)
        write_text(stderr_path, stderr)
        command_results.append(
            {
                "command": command,
                "phase": phase,
                "exit_code": exit_code,
                "duration_ms": duration_ms,
                "started_at": started_at,
                "executed_at": iso_now(),
                "stdout_ref": str(stdout_path),
                "stderr_ref": str(stderr_path),
            }
        )

    return {
        "verification_mode": "controlled-generation",
        "project_root": str(project_root),
        "scaffold_manifest_ref": str(manifest_path),
        "generated_at": iso_now(),
        "status": "passed" if all(item["exit_code"] == 0 for item in command_results) else "failed",
        "commands": command_results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="运行 YSS 脚手架真实验证命令")
    parser.add_argument("--project-root", required=True, help="已生成后端项目的根目录")
    parser.add_argument("--evidence-dir", required=True, help="验证日志和 JSON 报告目录")
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    evidence_dir = Path(args.evidence_dir).resolve()
    report_path = evidence_dir / "scaffold-verification.json"
    try:
        report = run(project_root, evidence_dir)
    except Exception as exception:
        report = {
            "verification_mode": "controlled-generation",
            "project_root": str(project_root),
            "generated_at": iso_now(),
            "status": "failed",
            "error": str(exception),
            "commands": [],
        }
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"❌ 脚手架验证无法执行: {exception}", file=sys.stderr)
        return 1

    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{report['status']}: {report_path}")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
