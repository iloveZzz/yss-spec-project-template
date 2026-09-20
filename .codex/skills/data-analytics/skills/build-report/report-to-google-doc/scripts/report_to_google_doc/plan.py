from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .constants import DEFAULT_RENDER_WORKERS, DOC_CONTENT_WIDTH_PT


def build_docx_upload_plan(
    manifest: dict[str, Any],
    docx_path: Path,
    preflight: dict[str, Any],
    target: str = "local-docx",
) -> dict[str, Any]:
    if target not in {"local-docx", "hosted-docx", "native-google-docs"}:
        raise ValueError(f"Unsupported delivery target: {target}")
    cloud = target != "local-docx"
    sequence = []
    if cloud and preflight["status"] == "passed":
        sequence = [{
            "capability": "upload_file" if target == "hosted-docx" else "import_native_google_document",
            "discovery_required": True,
            "requires_explicit_user_request": True,
            "file": str(docx_path),
            "note": "Discover the actual tool schema; capability names are not callable tools.",
        }]
    return {
        "title": manifest["title"],
        "source_html": manifest["source_html"],
        "docx_file": str(docx_path),
        "preflight_status": preflight["status"],
        "doc_content_width_pt": DOC_CONTENT_WIDTH_PT,
        "target": target,
        "remote_action_performed": False,
        "sequence": sequence,
        "expected_result": {
            "local-docx": "Validated local DOCX; no upload or sharing change.",
            "hosted-docx": "Readable hosted DOCX; not a native Google Doc.",
            "native-google-docs": "Reopened native Google Doc; a hosted DOCX does not satisfy this target.",
        }[target],
        "verification": [
            "compare text and structure against manifest.json and source HTML",
            "inspect headings, tables, lists, links and image relationships",
            "compare rendered charts with source visuals when applicable",
        ] + (["reopen the cloud result and verify content and actual native/hosted type"] if cloud else []),
    }


def write_json(path: Path, obj: Any) -> None:
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_docx_upload_readme(
    html: Path,
    manifest: dict[str, Any],
    preflight: dict[str, Any],
    docx_path: Path,
    target: str = "local-docx",
) -> str:
    plan = build_docx_upload_plan(manifest, docx_path, preflight, target)
    return f"""# HTML report delivery plan

Source: `{html}`
Local DOCX: `{docx_path}`
Target: `{target}`
Preflight: `{preflight["status"]}`
Expected result: {plan["expected_result"]}

Check the source inventory in `manifest.json` and `preflight_checks.json`.
For local-docx, validate and return the local file. Do not upload.
A cloud target requires an explicit user request, passed preflight, actual tool
capability discovery, and content/type verification after reopening the result.
Missing capability is a delivery gap; a local file is not proof of cloud completion.
This helper performs no remote actions. `docx_upload_plan.json` is a planning
artifact with conditional capabilities, not executable tool instructions.
"""


def write_outputs(
    html: Path,
    out_dir: Path,
    chart_mode: str = "image",
    render_workers: int = DEFAULT_RENDER_WORKERS,
    strict_preflight: bool = True,
    target: str = "local-docx",
) -> None:
    from .docx_writer import write_docx
    from .html_parser import parse_html
    from .quality import build_preflight_checks
    from .rendering import render_chart_images

    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = parse_html(html, chart_mode=chart_mode)
    if manifest.get("chart_images"):
        render_chart_images(manifest, out_dir, render_workers=render_workers)
    preflight = build_preflight_checks(
        manifest,
        out_dir,
    )

    (out_dir / "skeleton.txt").write_text(manifest["skeleton_text"], encoding="utf-8")
    write_json(out_dir / "manifest.json", manifest)
    write_json(out_dir / "preflight_checks.json", preflight)
    write_json(out_dir / "placeholder_queries.json", manifest["placeholders"])

    docx_path = write_docx(manifest, out_dir)
    docx_upload_plan = build_docx_upload_plan(
        manifest,
        docx_path,
        preflight,
        target,
    )
    write_json(out_dir / "docx_upload_plan.json", docx_upload_plan)
    readme = write_docx_upload_readme(
        html,
        manifest,
        preflight,
        docx_path,
        target,
    )
    (out_dir / "README.md").write_text(readme, encoding="utf-8")
    if strict_preflight and preflight["status"] != "passed":
        raise SystemExit(
            f"Preflight failed with {preflight['summary']['errors']} error(s). "
            f"Inspect {out_dir / 'preflight_checks.json'}."
        )
