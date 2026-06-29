#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import os
from pathlib import Path

SKILLS_ROOT = Path(os.environ.get("YSS_SKILLS_ROOT", "/Users/zhudaoming/.codex/skills")).expanduser()

BACKEND_SKILLS = {
    "yss-cache": [
        "yss-microservice-components/yss-component-cache-parent",
    ],
    "yss-mybatis": [
        "yss-microservice-components/yss-component-persistence",
    ],
    "yss-dto": [
        "yss-microservice-components/yss-component-dto",
    ],
    "yss-audit-log": [
        "yss-microservice-components/yss-component-audit-log",
    ],
    "yss-excel-mvc": [
        "yss-microservice-components/yss-component-excel-mvc",
        "yss-microservice-components/yss-component-excel-starter",
    ],
    "yss-distributed-id": [
        "yss-microservice-components/yss-component-distributed-id",
        "yss-microservice-components/yss-component-leaf",
    ],
    "yss-jdbc": [
        "yss-microservice-components/yss-component-jdbc",
    ],
    "yss-dictionary": [
        "yss-microservice-components/yss-component-dictionary-parent",
    ],
    "yss-dir": [
        "yss-microservice-components/yss-component-dir-parent",
    ],
    "yss-file": [
        "yss-microservice-components/yss-component-file",
        "yss-microservice-components/yss-component-file-parser",
        "yss-microservice-components/yss-component-filemanager-common",
    ],
    "yss-log": [
        "yss-microservice-components/yss-component-log-starter",
    ],
    "yss-liquibase": [
        "yss-microservice-components/yss-component-liquibase-starter",
    ],
    "yss-resilience4j": [
        "yss-microservice-components/yss-component-resilience4j-starter",
    ],
    "yss-sql-condition": [
        "yss-microservice-components/yss-component-sql-condition",
    ],
    "yss-sql-tpl": [
        "yss-microservice-components/yss-component-sql-tpl-parent",
    ],
    "yss-taskflow": [
        "yss-microservice-components/yss-component-taskflow",
    ],
    "yss-validation": [
        "yss-microservice-components/yss-component-validation-engine-parent",
        "yss-microservice-components/yss-component-validation-jsr303",
    ],
    "yss-security-algorithm": [
        "yss-microservice-components/yss-component-security-algorithm",
    ],
    "yss-userinfo": [
        "yss-microservice-components/yss-component-userinfo-starter",
    ],
    "yss-variable": [
        "yss-microservice-components/yss-component-variable",
    ],
    "yss-quality": [
        "yss-microservice-components/yss-component-quality-starter",
    ],
    "yss-anti-scheduler": [
        "yss-microservice-components/yss-component-anti-corrosion/yss-component-anti-scheduler",
    ],
    "yss-exception": [
        "yss-microservice-components/yss-component-exception",
    ],
    "yss-mail": [
        "yss-microservice-components/yss-component-mail-starter",
    ],
    "yss-filerunner": [
        "yss-microservice-components/yss-component-filerunner-parent",
    ],
    "yss-valuation": [
        "yss-microservice-components/yss-component-valuation",
    ],
    "yss-duckdb": [
        "yss-microservice-components/yss-component-duckdb",
    ],
    "yss-mapper-dynamic": [
        "yss-microservice-components/yss-component-mapper-dynamic",
    ],
}

FRONTEND_DOCS = {
    "components": "http://192.168.164.27:3200/components",
    "hooks": "http://192.168.164.27:3200/hooks",
    "skills": "http://192.168.164.27:3200/skills",
}

FRONTEND_SKILLS = {
    "yss-ui": ["components", "hooks", "skills"],
    "yss-components": ["components"],
    "yss-hook": ["hooks"],
    "yss-page-module-development": ["components", "hooks", "skills"],
    "yss-use-table-height": ["hooks"],
    "yss-use-tree-height": ["hooks"],
}

KEY_NAME_PARTS = (
    "Audit",
    "Cache",
    "Clear",
    "Command",
    "Configuration",
    "Controller",
    "DTO",
    "Data",
    "Enable",
    "Excel",
    "Handler",
    "Interceptor",
    "Jdbc",
    "Mapper",
    "Mybatis",
    "Page",
    "Properties",
    "Query",
    "Repository",
    "Request",
    "Response",
    "Result",
    "Update",
    "Aspect",
    "Leaf",
    "Id",
    "Dir",
    "Dic",
    "Dictionary",
    "File",
    "Upload",
    "Log",
    "Message",
    "Mail",
    "Liquibase",
    "Circuit",
    "Breaker",
    "Sql",
    "Tpl",
    "Tag",
    "Task",
    "Flow",
    "Report",
    "Validation",
    "Validator",
    "Security",
    "Crypto",
    "User",
    "Variable",
    "Quality",
    "Search",
    "Similarity",
    "Scheduler",
    "Runner",
    "Duck",
    "Dynamic",
    "Factory",
    "Client",
    "Feign",
    "Gateway",
    "Convertor",
    "Adapter",
    "Bridge",
    "Route",
    "Uploader",
    "Sftp",
    "Minio",
    "Parser",
    "Express",
    "Rule",
    "Template",
    "Generator",
    "Importer",
    "Engine",
    "Event",
    "Submitter",
    "Executor",
    "Context",
    "Status",
    "Type",
    "State",
)

DOC_NAMES = {"README.md", "readme.md", "HELP.md", "TECHNICAL_DESIGN.md"}


def has_component_root(path: Path) -> bool:
    return (path / "yss-microservice-components").is_dir()


def source_root_candidates() -> list[Path]:
    cwd = Path.cwd().resolve()
    home = Path.home()
    candidates: list[Path] = [cwd, *cwd.parents]
    candidates.extend(
        [
            home / "Documents/yss-project/yss-cloud-microservice",
            home / "Documents/yss-project",
            home / "Projects/yss-cloud-microservice",
            home / "Projects",
        ]
    )
    for base in [home / "Projects", home / "Documents", home / "Documents/yss-project"]:
        if base.is_dir():
            candidates.extend(path for path in base.glob("*") if path.is_dir())
    return candidates


def resolve_source_root() -> Path:
    explicit = os.environ.get("YSS_SOURCE_ROOT")
    if explicit:
        root = Path(explicit).expanduser().resolve()
        if not has_component_root(root):
            raise SystemExit(
                "YSS_SOURCE_ROOT must point to the repository root containing "
                f"`yss-microservice-components`: {root}"
            )
        return root

    for candidate in source_root_candidates():
        candidate = candidate.expanduser().resolve()
        if has_component_root(candidate):
            return candidate

    raise SystemExit(
        "Could not find a YSS source repository containing `yss-microservice-components`. "
        "Set YSS_SOURCE_ROOT=/absolute/path/to/yss-cloud-microservice and rerun."
    )


SOURCE_ROOT = resolve_source_root()


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(SOURCE_ROOT))
    except ValueError:
        return str(path)


def collect_files(paths: list[Path]) -> dict[str, list[Path]]:
    docs: list[Path] = []
    poms: list[Path] = []
    java: list[Path] = []
    for base in paths:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            if path.name in DOC_NAMES:
                docs.append(path)
            elif path.name == "pom.xml":
                poms.append(path)
            elif path.suffix == ".java" and "/src/main/java/" in str(path):
                java.append(path)
    return {
        "docs": sorted(docs),
        "poms": sorted(poms),
        "java": sorted(java),
    }


def interesting_java(paths: list[Path]) -> list[Path]:
    selected = []
    for path in paths:
        name = path.stem
        if any(part in name for part in KEY_NAME_PARTS):
            selected.append(path)
    return selected[:120]


def write_backend_index(skill: str, subpaths: list[str], generated_at: str) -> None:
    bases = [SOURCE_ROOT / subpath for subpath in subpaths]
    files = collect_files(bases)
    selected_java = interesting_java(files["java"])
    target_dir = SKILLS_ROOT / skill / "references"
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / "source-index.md"

    lines = [
        f"# {skill} Source Index",
        "",
        f"Generated: {generated_at}",
        "Indexed source root: resolved at refresh time; set `YSS_SOURCE_ROOT` to reproduce or refresh.",
        "",
        "This file is generated by `yss-source-index/scripts/refresh-yss-skill-index.py`. Do not hand-edit generated sections.",
        "",
        "Paths below are source path hints captured at refresh time. If they do not exist in the current workspace, locate sources using `YSS_SOURCE_ROOT`, CodeGraph, package/class names, Maven artifact names, or repository search before assuming the source is unavailable.",
        "",
        "## Component Path Hints",
        "",
    ]
    for base in bases:
        status = "existed when indexed" if base.exists() else "missing when indexed"
        lines.append(f"- `{rel(base)}` ({status})")

    lines += ["", "## Documentation Files", ""]
    if files["docs"]:
        lines.extend(f"- `{rel(path)}`" for path in files["docs"])
    else:
        lines.append("- No component documentation files found.")

    lines += ["", "## Maven Modules", ""]
    if files["poms"]:
        lines.extend(f"- `{rel(path.parent)}`" for path in files["poms"])
    else:
        lines.append("- No Maven modules found.")

    lines += ["", "## Key Java Entry Points", ""]
    if selected_java:
        lines.extend(f"- `{rel(path)}`" for path in selected_java)
    else:
        lines.append("- No key Java entry points matched the configured name patterns.")

    lines += [
        "",
        "## Recommended Next Reads",
        "",
        "- Start with the documentation files above when learning component usage.",
        "- Search the key Java entry points for annotations, auto configuration, properties, aspects, interceptors, handlers, and result objects before changing application code.",
        "- Prefer existing component extension points over rewriting framework logic in business modules.",
        "",
    ]
    target.write_text("\n".join(lines), encoding="utf-8")


def write_frontend_docs(skill: str, doc_keys: list[str], generated_at: str) -> None:
    target_dir = SKILLS_ROOT / skill / "references"
    if not (SKILLS_ROOT / skill).exists():
        return
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / "frontend-docs.md"
    lines = [
        f"# {skill} Frontend Documentation",
        "",
        f"Generated: {generated_at}",
        "",
        "Use these YSS UI documentation entry points as authoritative references when local repo examples are insufficient.",
        "",
    ]
    for key in doc_keys:
        lines.append(f"- {key}: {FRONTEND_DOCS[key]}")
    lines += [
        "",
        "When documentation and local code differ, inspect the current project code before editing and prefer established local usage.",
        "",
    ]
    target.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    generated_at = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    for skill, subpaths in BACKEND_SKILLS.items():
        write_backend_index(skill, subpaths, generated_at)
    for skill, doc_keys in FRONTEND_SKILLS.items():
        write_frontend_docs(skill, doc_keys, generated_at)
    print(f"Updated {len(BACKEND_SKILLS)} backend indexes and {len(FRONTEND_SKILLS)} frontend doc references.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
