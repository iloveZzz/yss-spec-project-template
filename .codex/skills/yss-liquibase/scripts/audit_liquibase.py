#!/usr/bin/env python3
"""Read-only Liquibase changelog auditor for YSS repositories."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable


SEVERITY = {"INFO": 0, "WARN": 1, "ERROR": 2}
CHANGESET_RE = re.compile(r"^\s*--\s*changeset\s+([^:\s]+):([^\s]+)(.*)$", re.I | re.M)
FORMATTED_SQL_RE = re.compile(r"^\s*--\s*liquibase\s+formatted\s+sql", re.I)
RISK_PATTERNS = {
    "destructive-ddl": re.compile(r"\b(drop\s+(table|column)|truncate\s+table)\b", re.I),
    "run-always": re.compile(r"\brunAlways\s*[:=]\s*true\b", re.I),
    "run-on-change": re.compile(r"\brunOnChange\s*[:=]\s*true\b", re.I),
    "run-outside-transaction": re.compile(r"\brunInTransaction\s*[:=]\s*false\b", re.I),
    "mark-ran": re.compile(r"\bMARK_RAN\b", re.I),
    "valid-checksum": re.compile(r"\bvalidCheckSum\b", re.I),
    "include-all": re.compile(r"\bincludeAll\b", re.I),
}
TEXT_SUFFIXES = {".xml", ".yaml", ".yml", ".json", ".sql"}
IGNORED_DIRS = {".git", "node_modules", ".idea"}
IGNORED_ROOTS = {"target", "build", "dist"}


@dataclass
class Finding:
    severity: str
    rule: str
    path: str
    message: str
    suppressed: bool = False
    suppression: str | None = None


@dataclass(frozen=True)
class ChangeSet:
    author: str
    change_id: str
    path: str


class Audit:
    def __init__(self, root: Path, baseline: str | None, config: Path | None) -> None:
        self.root = root.resolve()
        self.baseline = baseline
        self.findings: list[Finding] = []
        self.changesets: list[ChangeSet] = []
        self.files: set[Path] = set()
        self.suppressions = self._load_suppressions(config)

    def add(self, severity: str, rule: str, path: Path | str, message: str) -> None:
        relative = self._relative(Path(path)) if not isinstance(path, str) else path
        finding = Finding(severity, rule, relative, message)
        for item in self.suppressions:
            if item.get("rule") != rule:
                continue
            pattern = item.get("path", "*")
            if not Path(relative).match(pattern):
                continue
            expires = item.get("expires")
            if expires and dt.date.fromisoformat(expires) < dt.date.today():
                continue
            finding.suppressed = True
            finding.suppression = f"{item['owner']}: {item['reason']}"
            break
        self.findings.append(finding)

    def run(self) -> None:
        for path in self._candidate_files():
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                self.add("ERROR", "encoding", path, "文件不是 UTF-8，无法可靠审计")
                continue
            if path.suffix == ".sql":
                if FORMATTED_SQL_RE.search(text):
                    self.files.add(path)
                    self._parse_formatted_sql(path, text)
            elif self._looks_like_changelog(path, text):
                self.files.add(path)
                if path.suffix == ".xml":
                    self._parse_xml(path)
                else:
                    self._parse_structured(path, text)
            if path in self.files:
                self._scan_risks(path, text)
        self._check_identities()
        self._check_baseline()
        self._check_execution_drift()

    def _candidate_files(self) -> Iterable[Path]:
        for path in self.root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
                continue
            if self._ignored(path):
                continue
            yield path

    @staticmethod
    def _looks_like_changelog(path: Path, text: str) -> bool:
        name = path.name.lower()
        return "changelog" in name or "databasechangelog" in text[:4000].lower()

    def _parse_formatted_sql(self, path: Path, text: str) -> None:
        matches = list(CHANGESET_RE.finditer(text))
        if not matches:
            self.add("ERROR", "missing-changeset", path, "formatted SQL 未声明 --changeset author:id")
            return
        for match in matches:
            self.changesets.append(ChangeSet(match.group(1), match.group(2), self._relative(path)))

    def _parse_xml(self, path: Path) -> None:
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError as error:
            self.add("ERROR", "xml-parse", path, f"XML 解析失败：{error}")
            return
        for element in root.iter():
            tag = element.tag.rsplit("}", 1)[-1]
            if tag == "changeSet":
                author = element.attrib.get("author")
                change_id = element.attrib.get("id")
                if not author or not change_id:
                    self.add("ERROR", "missing-identity", path, "XML changeSet 缺少 author 或 id")
                else:
                    logical = element.attrib.get("logicalFilePath") or self._relative(path)
                    self.changesets.append(ChangeSet(author, change_id, logical))
            elif tag == "include":
                self._check_include(path, element.attrib.get("file"), element.attrib)
            elif tag == "includeAll":
                self.add("WARN", "include-all", path, "使用 includeAll，需验证排序、过滤和打包稳定性")

    def _check_include(self, source: Path, value: str | None, attributes: dict[str, str]) -> None:
        if not value or value.startswith(("classpath:", "file:")):
            return
        relative = attributes.get("relativeToChangelogFile", "false").lower() == "true"
        target = (source.parent if relative else self.root) / value
        if not target.resolve().exists():
            self.add("ERROR", "missing-include", source, f"include 文件不存在：{value}")

    def _parse_structured(self, path: Path, text: str) -> None:
        try:
            if path.suffix == ".json":
                data = json.loads(text)
            else:
                try:
                    import yaml  # type: ignore
                except ImportError:
                    self.add("ERROR", "yaml-parser-missing", path, "缺少 PyYAML，未完成 YAML 结构化解析")
                    return
                data = yaml.safe_load(text)
        except Exception as error:  # Parser error types vary by optional dependency.
            self.add("ERROR", "structured-parse", path, f"结构化 changelog 解析失败：{error}")
            return
        self._walk_structured(path, data)

    def _walk_structured(self, path: Path, value: Any) -> None:
        if isinstance(value, list):
            for item in value:
                self._walk_structured(path, item)
            return
        if not isinstance(value, dict):
            return
        if "changeSet" in value and isinstance(value["changeSet"], dict):
            item = value["changeSet"]
            author, change_id = item.get("author"), item.get("id")
            if author is None or change_id is None:
                self.add("ERROR", "missing-identity", path, "changeSet 缺少 author 或 id")
            else:
                logical = item.get("logicalFilePath") or self._relative(path)
                self.changesets.append(ChangeSet(str(author), str(change_id), str(logical)))
        if "include" in value and isinstance(value["include"], dict):
            item = value["include"]
            attrs = {key: str(val) for key, val in item.items()}
            self._check_include(path, item.get("file"), attrs)
        if "includeAll" in value:
            self.add("WARN", "include-all", path, "使用 includeAll，需验证排序、过滤和打包稳定性")
        for child in value.values():
            self._walk_structured(path, child)

    def _scan_risks(self, path: Path, text: str) -> None:
        for rule, pattern in RISK_PATTERNS.items():
            if pattern.search(text):
                self.add("WARN", rule, path, f"检测到需人工评审的特性：{rule}")

    def _check_identities(self) -> None:
        full: dict[tuple[str, str, str], int] = {}
        author_id: dict[tuple[str, str], set[str]] = {}
        for item in self.changesets:
            key = (item.author, item.change_id, item.path)
            full[key] = full.get(key, 0) + 1
            author_id.setdefault((item.author, item.change_id), set()).add(item.path)
        for key, count in full.items():
            if count > 1:
                self.add("ERROR", "duplicate-identity", key[2], f"完整 changeset 身份重复：{key[0]}:{key[1]}")
        for key, paths in author_id.items():
            if len(paths) > 1:
                self.add("INFO", "duplicate-author-id", sorted(paths)[0],
                         f"author:id 出现在多个路径：{key[0]}:{key[1]} ({len(paths)} 个)")

    def _check_baseline(self) -> None:
        if not self.baseline:
            self.add("INFO", "baseline-missing", ".", "未提供发布 Git 基线，仅能分析当前文件")
            return
        top = self._git(["rev-parse", "--show-toplevel"], cwd=self.root)
        if not top:
            self.add("ERROR", "git-unavailable", ".", "无法解析 Git 仓库，未完成发布基线检查")
            return
        repo = Path(top)
        baseline = self._git(
            ["rev-parse", "--verify", "--end-of-options", f"{self.baseline}^{{commit}}"],
            cwd=repo,
        )
        if not baseline:
            self.add("ERROR", "invalid-baseline", ".", f"无法读取 Git 基线：{self.baseline}")
            return
        diff = self._git(["diff", "--name-only", baseline, "--", str(self.root)], cwd=repo)
        if diff is None:
            self.add("ERROR", "invalid-baseline", ".", f"无法读取 Git 基线：{self.baseline}")
            return
        for name in filter(None, diff.splitlines()):
            path = repo / name
            if path.suffix.lower() not in TEXT_SUFFIXES:
                continue
            exists_at_baseline = self._git_exists(["cat-file", "-e", f"{baseline}:{name}"], cwd=repo)
            if exists_at_baseline:
                self.add("WARN", "baseline-history-changed", path,
                         "相对发布基线修改了既有迁移文件；这不等于已证明数据库执行过")

    def _check_execution_drift(self) -> None:
        java_hits = list(self.root.rglob("*.java"))
        custom = False
        for path in java_hits:
            if self._ignored(path):
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            if "SpringLiquibase" in text and ("InitializingBean" in text or "afterPropertiesSet" in text):
                custom = True
                break
        if not custom:
            return
        readmes = {
            (path.stat().st_dev, path.stat().st_ino): path
            for pattern in ("README.md", "readme.md")
            for path in self.root.rglob(pattern)
        }
        for path in readmes.values():
            if self._ignored(path):
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            if re.search(r"(不会|不自动|显式|DBA).{0,20}(执行|迁移)", text, re.S):
                self.add("INFO", "execution-owner-review", path,
                         "文档描述外部/显式迁移，同时存在编程式启动迁移入口；请核对开关和环境覆盖")

    def _load_suppressions(self, config: Path | None) -> list[dict[str, str]]:
        path = config or self.root / ".yss-liquibase-audit.json"
        if not path.exists():
            return []
        data = json.loads(path.read_text(encoding="utf-8"))
        items = data.get("suppressions", [])
        for item in items:
            for required in ("rule", "path", "reason", "owner"):
                if not item.get(required):
                    raise ValueError(f"审计豁免缺少字段 {required}: {path}")
        return items

    def _relative(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.root).as_posix()
        except ValueError:
            return str(path)

    def _ignored(self, path: Path) -> bool:
        parts = path.relative_to(self.root).parts
        return bool(parts) and (parts[0] in IGNORED_ROOTS or any(part in IGNORED_DIRS for part in parts))

    @staticmethod
    def _git(args: list[str], cwd: Path | None = None) -> str | None:
        result = subprocess.run(["git", *args], cwd=cwd, text=True, capture_output=True, check=False)
        if result.returncode != 0:
            return None
        return result.stdout.strip()

    @staticmethod
    def _git_exists(args: list[str], cwd: Path | None = None) -> bool:
        return subprocess.run(["git", *args], cwd=cwd, text=True, capture_output=True,
                              check=False).returncode == 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="只读审计 Liquibase changelog 和 formatted SQL")
    parser.add_argument("root", type=Path, help="模块或仓库根目录")
    parser.add_argument("--baseline", help="发布 tag、分支或 commit；不提供时不推断发布历史")
    parser.add_argument("--config", type=Path, help="豁免配置，默认 <root>/.yss-liquibase-audit.json")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument("--fail-on", choices=("error", "warn"), default="error")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.root.is_dir():
        print(f"错误：目录不存在：{args.root}", file=sys.stderr)
        return 2
    try:
        audit = Audit(args.root, args.baseline, args.config)
        audit.run()
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"错误：{error}", file=sys.stderr)
        return 2
    active = [item for item in audit.findings if not item.suppressed]
    summary = {level: sum(1 for item in active if item.severity == level) for level in SEVERITY}
    payload = {
        "root": str(audit.root),
        "baseline": args.baseline,
        "files": len(audit.files),
        "changesets": len(audit.changesets),
        "summary": summary,
        "findings": [asdict(item) for item in audit.findings],
    }
    if args.format == "json":
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(f"扫描文件 {payload['files']}，changeset {payload['changesets']}，"
              f"ERROR {summary['ERROR']} / WARN {summary['WARN']} / INFO {summary['INFO']}")
        for item in audit.findings:
            suffix = f" [已豁免：{item.suppression}]" if item.suppressed else ""
            print(f"{item.severity:5} {item.rule:28} {item.path}: {item.message}{suffix}")
    threshold = SEVERITY[args.fail_on.upper()]
    return 1 if any(SEVERITY[item.severity] >= threshold for item in active) else 0


if __name__ == "__main__":
    raise SystemExit(main())
