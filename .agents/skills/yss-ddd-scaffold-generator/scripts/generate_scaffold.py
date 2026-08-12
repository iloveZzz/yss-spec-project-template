#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""YSS DDD 后端纯工程骨架生成器。"""

import argparse
import json
import os
import re
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class ScaffoldGenerator:
    """只生成工程结构，不生成任何业务行为。"""

    def __init__(
        self,
        project_name: str,
        base_package: str,
        output_dir: str,
        with_example: bool = False,
        database: str = "mysql",
        force: bool = False,
        contract_id: Optional[str] = None,
        contract_version: Optional[int] = None,
        approval_ref: Optional[str] = None,
        router_draft_ref: Optional[str] = None,
        persisted_ref: Optional[str] = None,
        contract_file: Optional[str] = None,
        overwrite_scope: Optional[str] = None,
        rollback_ref: Optional[str] = None,
    ):
        if with_example:
            raise ValueError(
                "YSS 受控脚手架只生成纯工程骨架；--with-example 已禁用，业务代码必须按批准切片合同实现"
            )

        self.project_name = project_name
        self.base_package = base_package
        self.output_dir = Path(output_dir)
        self.repository_root = Path(__file__).resolve().parents[4]
        self._validate_harness_output_layout()
        self.with_example = with_example
        self.database = database
        self.force = force
        self.contract_id = contract_id
        self.contract_version = contract_version
        self.approval_ref = approval_ref
        self.router_draft_ref = router_draft_ref
        self.persisted_ref = persisted_ref
        self.contract_file = Path(contract_file).resolve() if contract_file else None
        self.overwrite_scope = overwrite_scope
        self.rollback_ref = rollback_ref
        self.scaffold_contract: Dict[str, object] = {}

        self.template_root = Path(__file__).resolve().parents[1] / "assets" / "templates"
        self.config_template_dir = self.template_root / "config"
        self.pom_template_dir = self.template_root / "pom"
        if not self.pom_template_dir.exists():
            self.pom_template_dir = self.config_template_dir

        self.package_path = base_package.replace(".", "/")
        self.final_project_root = self.output_dir / project_name
        self.project_root = self.final_project_root

        self.author = os.getenv("USER", "yss-team")
        self.date = datetime.now().strftime("%Y-%m-%d")
        self.group_id = self._resolve_group_id(base_package)
        self.project_description = f"{self.project_name} service"
        self.db_name = self.project_name.replace("-", "_")
        self.driver_class = self._resolve_driver_class(self.database)
        self.jdbc_url = self._resolve_jdbc_url(self.database, self.db_name)
        self.db_dependency = self._resolve_db_dependency(self.database)

    def generate(self):
        """在受控生成合同下生成不含业务行为的工程骨架。"""
        if self.final_project_root.exists() and not self.force:
            raise FileExistsError(
                f"输出目录已存在: {self.final_project_root}；如确认覆盖，请显式传入 --force"
            )
        self._validate_contract_metadata()
        if self._target_is_non_empty() and self.force:
            self._validate_force_metadata()

        self.output_dir.mkdir(parents=True, exist_ok=True)
        staging_root = Path(
            tempfile.mkdtemp(prefix=f".{self.project_name}.staging-", dir=self.output_dir)
        )
        self.project_root = staging_root / self.project_name

        try:
            print(f"🚀 开始生成项目: {self.project_name}")
            print(f"📦 基础包名: {self.base_package}")
            print(f"📁 输出目录: {self.output_dir}")
            print()

            self._create_project_structure()
            self._generate_pom_files()
            self._generate_config_files()
            self._generate_database_scripts()
            self._generate_documentation()
            self._write_generation_manifest()
            self._copy_wrapper_files()
            self._validate_generated_artifacts()

            backup_path = None
            if self.final_project_root.exists():
                backup_path = self.output_dir / (
                    f".{self.project_name}.backup-"
                    f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
                )
                self.final_project_root.rename(backup_path)
            self.project_root.rename(self.final_project_root)
            self.project_root = self.final_project_root

            print()
            print("✅ 项目生成完成!")
            print(f"📂 项目位置: {self.project_root}")
            if backup_path:
                print(f"♻️ 原项目备份: {backup_path}")
            print()
            print("🎯 下一步:")
            print(f"  cd {self.project_root}")
            print("  ./mvnw validate")
            print("  ./mvnw test")
            print("  ./mvnw package")
            print(f"  ./mvnw spring-boot:run -pl {self.project_name}-bootstrap")
        except Exception:
            shutil.rmtree(staging_root, ignore_errors=True)
            raise

    def _target_is_non_empty(self) -> bool:
        if not self.final_project_root.exists():
            return False
        if self.final_project_root.is_file():
            return True
        return any(self.final_project_root.iterdir())

    def _validate_harness_output_layout(self) -> None:
        """在当前 Harness 内只允许生成到 apps/backend/<project>/。"""
        output_root = self.output_dir.resolve()
        try:
            relative = output_root.relative_to(self.repository_root)
        except ValueError:
            # 外部实现仓库使用其登记的 native root，不套用 Harness 目录策略。
            return

        parts = relative.parts
        if len(parts) >= 2 and parts[0] == "app" and parts[1] in {"backend", "frontend"}:
            raise ValueError(
                "禁止使用单数 app/backend 或 app/frontend 作为工程生成路径；"
                "Harness 内后端脚手架必须以 apps/backend 为父容器"
            )
        if parts == ("apps", "backend"):
            return
        if parts[:2] == ("apps", "frontend"):
            raise ValueError("后端脚手架不能输出到 apps/frontend；请使用外部后端仓库或 apps/backend")
        raise ValueError(
            "当前 Harness 内生成后端工程时，输出目录必须是 apps/backend；"
            "生成器会以 project_name 创建 apps/backend/<project>/"
        )

    def _validate_contract_metadata(self):
        if self.contract_file is None or not self.contract_file.is_file():
            raise ValueError("必须提供已持久化的结构化脚手架合同 JSON 文件: --contract-file")

        try:
            contract = json.loads(self.contract_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exception:
            raise ValueError(f"脚手架合同文件无法读取或不是合法 JSON: {self.contract_file}") from exception
        if not isinstance(contract, dict):
            raise ValueError("脚手架合同必须是 JSON 对象")

        required_metadata = {
            "--contract-id": self.contract_id,
            "--contract-version": self.contract_version,
            "--approval-ref": self.approval_ref,
            "--router-draft-ref": self.router_draft_ref,
            "--persisted-ref": self.persisted_ref,
        }
        missing = [
            option for option, value in required_metadata.items() if value in (None, "")
        ]
        if self.contract_version is not None and self.contract_version < 1:
            missing.append("--contract-version(必须为正整数)")
        if missing:
            raise ValueError(
                "生成项目必须提供当前已批准脚手架合同的完整元数据: " + ", ".join(missing)
            )

        required_fields = [
            "schema_version",
            "contract_id",
            "contract_version",
            "slice_id",
            "status",
            "router_draft_ref",
            "lifecycle_approval_ref",
            "persisted_ref",
            "current_version",
            "implementation_repository",
            "backend_repository",
            "scaffold_status",
            "target_git_url_or_output_dir",
            "allowed_write_paths",
            "expected_evidence_files",
            "verification_commands",
            "approval",
            "work_unit",
            "overwrite_policy",
        ]
        missing_contract_fields = [
            field for field in required_fields if contract.get(field) in (None, "", [])
        ]
        if missing_contract_fields:
            raise ValueError(
                "脚手架合同缺少结构化字段: " + ", ".join(missing_contract_fields)
            )
        if contract["schema_version"] != 1 or contract["status"] != "approved":
            raise ValueError("脚手架合同必须是 schema_version=1 且已由生命周期批准")
        if contract["contract_id"] != self.contract_id:
            raise ValueError("--contract-id 与脚手架合同不一致")
        if contract["contract_version"] != self.contract_version:
            raise ValueError("--contract-version 与脚手架合同不一致")
        if contract["current_version"] != contract["contract_version"]:
            raise ValueError("脚手架合同版本不是当前版本")
        if contract["router_draft_ref"] != self.router_draft_ref:
            raise ValueError("--router-draft-ref 与脚手架合同不一致")
        if contract["persisted_ref"] != self.persisted_ref:
            raise ValueError("--persisted-ref 与脚手架合同不一致")
        if contract["lifecycle_approval_ref"] != self.approval_ref:
            raise ValueError("--approval-ref 与脚手架合同不一致")
        if contract["scaffold_status"] != "required":
            raise ValueError("脚手架生成器只接受 scaffold_status=required")
        if not all(isinstance(contract[field], list) and contract[field] for field in (
            "allowed_write_paths", "expected_evidence_files", "verification_commands"
        )):
            raise ValueError("脚手架合同的 allowed_write_paths、expected_evidence_files、verification_commands 必须非空")
        if ".yss/scaffold-generation.json" not in " ".join(str(item) for item in contract["expected_evidence_files"]):
            raise ValueError("脚手架合同 expected_evidence_files 必须包含 .yss/scaffold-generation.json")
        target_ref = str(contract["target_git_url_or_output_dir"])
        if "://" not in target_ref and not target_ref.startswith("git@"):
            if Path(target_ref).resolve() != self.output_dir.resolve():
                raise ValueError("脚手架合同目标目录与 --output-dir 不一致")
        expected_commands = ["./mvnw validate", "./mvnw test", "./mvnw package"]
        if contract["verification_commands"] != expected_commands:
            raise ValueError("脚手架合同验证命令必须固定为三条项目根目录 ./mvnw 命令")

        approval = contract["approval"]
        if not isinstance(approval, dict) or any(
            approval.get(field) in (None, "")
            for field in ("approval_ref", "approver", "persisted_ref", "current_version")
        ):
            raise ValueError("脚手架合同 approval 记录不完整")
        if approval["approval_ref"] != self.approval_ref or approval["persisted_ref"] != self.persisted_ref:
            raise ValueError("脚手架合同 approval 引用与命令参数不一致")
        if approval["current_version"] != self.contract_version:
            raise ValueError("脚手架合同 approval 不是当前版本")

        work_unit = contract["work_unit"]
        required_work_unit_fields = [
            "id",
            "behavior",
            "primary_skill",
            "supporting_skills",
            "tdd_mode",
            "allowed_write_paths",
            "expected_evidence",
            "verification_commands",
            "controlled_generation",
        ]
        if not isinstance(work_unit, dict) or any(
            work_unit.get(field) in (None, "", []) for field in required_work_unit_fields
        ):
            raise ValueError("脚手架合同 work_unit 结构不完整")
        if (
            work_unit.get("primary_skill") != "yss-ddd-scaffold-generator"
            or work_unit.get("tdd_mode") != "controlled-generation"
            or work_unit.get("controlled_generation") is not True
        ):
            raise ValueError("脚手架合同 work_unit 必须绑定本 skill 和 controlled-generation")
        if (
            work_unit["verification_commands"] != contract["verification_commands"]
            or work_unit["allowed_write_paths"] != contract["allowed_write_paths"]
        ):
            raise ValueError("脚手架合同 work_unit 与根级验证/写路径约束不一致")
        overwrite_policy = contract["overwrite_policy"]
        if not isinstance(overwrite_policy, dict) or any(
            field not in overwrite_policy for field in ("force_allowed", "overwrite_scope", "rollback_ref")
        ):
            raise ValueError("脚手架合同 overwrite_policy 结构不完整")
        self.scaffold_contract = contract

    def _validate_force_metadata(self):
        required_metadata = {
            "--overwrite-scope": self.overwrite_scope,
            "--rollback-ref": self.rollback_ref,
        }
        missing = [
            option for option, value in required_metadata.items() if value in (None, "")
        ]
        if missing:
            raise ValueError(
                "覆盖非空目录必须提供当前批准合同的覆盖范围和回滚引用: "
                + ", ".join(missing)
            )
        overwrite_policy = self.scaffold_contract.get("overwrite_policy", {})
        if not isinstance(overwrite_policy, dict) or overwrite_policy.get("force_allowed") is not True:
            raise ValueError("脚手架合同未批准非空目录覆盖")
        if overwrite_policy.get("overwrite_scope") != self.overwrite_scope:
            raise ValueError("--overwrite-scope 与脚手架合同不一致")
        if overwrite_policy.get("rollback_ref") != self.rollback_ref:
            raise ValueError("--rollback-ref 与脚手架合同不一致")

    def _validate_generated_artifacts(self):
        """在 staging 目录提交前校验关键产物和占位符。"""
        required_files = [
            self.project_root / "pom.xml",
            self.project_root / f"{self.project_name}-bootstrap" / "pom.xml",
            self.project_root
            / f"{self.project_name}-bootstrap"
            / "src/main/resources/smart-doc.json",
            self.project_root / "mvnw",
            self.project_root / ".yss/scaffold-generation.json",
        ]
        missing = [str(path) for path in required_files if not path.is_file()]
        if missing:
            raise FileNotFoundError(f"生成产物缺失: {', '.join(missing)}")

        smart_doc_path = required_files[2]
        json.loads(smart_doc_path.read_text(encoding="utf-8"))
        manifest = json.loads(required_files[4].read_text(encoding="utf-8"))
        if (
            manifest.get("contract_id") != self.contract_id
            or manifest.get("contract_version") != self.contract_version
            or manifest.get("current_version") != self.contract_version
            or manifest.get("generation_mode") != "controlled-generation"
            or manifest.get("verification_commands")
            != ["./mvnw validate", "./mvnw test", "./mvnw package"]
        ):
            raise ValueError("脚手架生成元数据清单与当前批准合同或固定验证命令不一致")
        bootstrap_pom = required_files[1].read_text(encoding="utf-8")
        plugin_versions = re.findall(
            r"<artifactId>smart-doc-maven-plugin</artifactId>\s*<version>([^<]+)</version>",
            bootstrap_pom,
        )
        if plugin_versions != ["yss-4.0.0"]:
            raise ValueError("smart-doc-maven-plugin 必须且只能使用 yss-4.0.0")

        binary_suffixes = {".class", ".db", ".jar", ".png", ".jpg", ".jpeg", ".gif"}
        for path in self.project_root.rglob("*"):
            if not path.is_file() or path.suffix in binary_suffixes:
                continue
            content = path.read_text(encoding="utf-8")
            if "{{" in content or "root/root" in content:
                raise ValueError(f"生成文件包含未替换占位符或明文凭据: {path}")

    def _create_project_structure(self):
        """创建不含业务文件的项目目录结构。"""
        print("📁 创建项目目录结构...")
        modules = [
            f"{self.project_name}-domain",
            f"{self.project_name}-application",
            f"{self.project_name}-infrastructure",
            f"{self.project_name}-adapter",
            f"{self.project_name}-bootstrap",
        ]

        for module in modules:
            module_path = self.project_root / module
            (module_path / "src/main/java" / self.package_path).mkdir(
                parents=True, exist_ok=True
            )
            (module_path / "src/main/resources").mkdir(parents=True, exist_ok=True)
            (module_path / "src/test/java" / self.package_path).mkdir(
                parents=True, exist_ok=True
            )
            print(f"  ✓ {module}")

        web_module = (
            self.project_root
            / f"{self.project_name}-adapter"
            / f"{self.project_name}-web"
        )
        (web_module / "src/main/java" / self.package_path / "rest").mkdir(
            parents=True, exist_ok=True
        )
        print(f"  ✓ {self.project_name}-adapter/{self.project_name}-web")

        (self.project_root / "db").mkdir(parents=True, exist_ok=True)
        print("  ✓ db")

    def _generate_pom_files(self):
        """生成 Maven POM 文件。"""
        print("\n📝 生成 Maven POM 文件...")
        pom_templates: List[Tuple[Path, Path]] = [
            (self.pom_template_dir / "parent-pom.xml.template", self.project_root / "pom.xml"),
            (
                self.pom_template_dir / "domain-pom.xml.template",
                self.project_root / f"{self.project_name}-domain" / "pom.xml",
            ),
            (
                self.pom_template_dir / "application-pom.xml.template",
                self.project_root / f"{self.project_name}-application" / "pom.xml",
            ),
            (
                self.pom_template_dir / "infrastructure-pom.xml.template",
                self.project_root / f"{self.project_name}-infrastructure" / "pom.xml",
            ),
            (
                self.pom_template_dir / "adapter-pom.xml.template",
                self.project_root / f"{self.project_name}-adapter" / "pom.xml",
            ),
            (
                self.pom_template_dir / "web-pom.xml.template",
                self.project_root
                / f"{self.project_name}-adapter"
                / f"{self.project_name}-web"
                / "pom.xml",
            ),
            (
                self.pom_template_dir / "bootstrap-pom.xml.template",
                self.project_root / f"{self.project_name}-bootstrap" / "pom.xml",
            ),
        ]
        self._render_and_write_templates(pom_templates)
        print("  ✓ 父级 pom.xml")
        print("  ✓ domain pom.xml")
        print("  ✓ application pom.xml")
        print("  ✓ infrastructure pom.xml")
        print("  ✓ adapter pom.xml")
        print("  ✓ web pom.xml")
        print("  ✓ bootstrap pom.xml")

    def _generate_config_files(self):
        """生成不含业务行为的工程配置文件。"""
        print("\n⚙️  生成配置文件...")
        config_templates: List[Tuple[Path, Path]] = [
            (
                self.config_template_dir / "application.yml.template",
                self.project_root
                / f"{self.project_name}-bootstrap"
                / "src/main/resources/application.yml",
            ),
            (
                self.config_template_dir / "logback-spring.xml.template",
                self.project_root
                / f"{self.project_name}-bootstrap"
                / "src/main/resources/logback-spring.xml",
            ),
            (
                self.config_template_dir / "smart-doc.json.template",
                self.project_root
                / f"{self.project_name}-bootstrap"
                / "src/main/resources/smart-doc.json",
            ),
        ]
        self._render_and_write_templates(config_templates)
        print("  ✓ application.yml")
        print("  ✓ logback-spring.xml")
        print("  ✓ smart-doc.json")

    def _generate_database_scripts(self):
        """只保留数据库目录布局，不生成业务表或初始化数据。"""
        print("\n🗃️  保留数据库目录布局...")
        print("  ✓ db/（业务 schema 和初始化数据由批准切片合同生成）")

    def _generate_documentation(self):
        """生成不包含业务 API 的项目说明。"""
        print("\n📚 生成项目文档...")
        readme_content = self._render_text(
            "# {{project_name}}\n\n"
            "## 模块说明\n\n"
            "- {{project_name}}-domain\n"
            "- {{project_name}}-application\n"
            "- {{project_name}}-infrastructure\n"
            "- {{project_name}}-adapter\n"
            "- {{project_name}}-bootstrap\n\n"
            "业务 API、领域模型、数据结构和权限行为必须在冻结的 "
            "Slice Implementation Contract 下，由对应 YSS skill 逐切片实现。\n\n"
            "## 快速开始\n\n"
            "```bash\n"
            "cd {{project_name}}\n"
            "./mvnw clean compile\n"
            "./mvnw spring-boot:run -pl {{project_name}}-bootstrap\n"
            "```\n",
            self._template_vars(),
        )
        self._write_file(self.project_root / "README.md", readme_content)
        print("  ✓ README.md")

    def _write_generation_manifest(self):
        """把脚手架合同引用和生成输入写入非业务元数据清单。"""
        manifest = {
            "schema_version": 1,
            "contract_id": self.contract_id,
            "contract_version": self.contract_version,
            "approval_ref": self.approval_ref,
            "router_draft_ref": self.router_draft_ref,
            "persisted_ref": self.persisted_ref,
            "contract_file_ref": str(self.contract_file),
            "slice_id": self.scaffold_contract["slice_id"],
            "lifecycle_approval_ref": self.scaffold_contract["lifecycle_approval_ref"],
            "current_version": self.scaffold_contract["current_version"],
            "approver": self.scaffold_contract["approval"]["approver"],
            "allowed_write_paths": self.scaffold_contract["allowed_write_paths"],
            "expected_evidence_files": self.scaffold_contract["expected_evidence_files"],
            "project_name": self.project_name,
            "base_package": self.base_package,
            "database": self.database,
            "generation_mode": "controlled-generation",
            "force": self.force,
            "overwrite_scope": self.overwrite_scope,
            "rollback_ref": self.rollback_ref,
            "verification_commands": [
                "./mvnw validate",
                "./mvnw test",
                "./mvnw package",
            ],
            "generated_at": datetime.now().astimezone().isoformat(),
        }
        self._write_file(
            self.project_root / ".yss/scaffold-generation.json",
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        )
        print("  ✓ .yss/scaffold-generation.json")

    def _copy_wrapper_files(self):
        wrapper_dir = self.template_root.parent / "wrapper"
        for filename in ["mvnw", "mvnw.cmd"]:
            source = wrapper_dir / filename
            target = self.project_root / filename
            if source.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
        mvn_dir_source = wrapper_dir / ".mvn"
        mvn_dir_target = self.project_root / ".mvn"
        if mvn_dir_source.exists():
            if mvn_dir_target.exists():
                shutil.rmtree(mvn_dir_target)
            shutil.copytree(mvn_dir_source, mvn_dir_target)

    def _render_and_write_templates(self, items: List[Tuple[Path, Path]]):
        variables = self._template_vars()
        for template_path, output_path in items:
            content = self._load_template(template_path)
            rendered = self._render_text(content, variables)
            self._write_file(output_path, rendered)

    def _load_template(self, template_path: Path) -> str:
        if not template_path.exists():
            raise FileNotFoundError(f"模板文件不存在: {template_path}")
        return template_path.read_text(encoding="utf-8")

    def _write_file(self, output_path: Path, content: str):
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding="utf-8")

    def _render_text(self, template: str, variables: Dict[str, str]) -> str:
        content = template
        for key, value in variables.items():
            content = content.replace(f"{{{{{key}}}}}", str(value))
        return content

    def _template_vars(self) -> Dict[str, str]:
        return {
            "project_name": self.project_name,
            "base_package": self.base_package,
            "group_id": self.group_id,
            "project_description": self.project_description,
            "author": self.author,
            "date": self.date,
            "database": self.database,
            "driver_class": self.driver_class,
            "db_name": self.db_name,
            "jdbc_url": self.jdbc_url,
            "db_dependency": self.db_dependency,
        }

    def _resolve_group_id(self, base_package: str) -> str:
        parts = base_package.split(".")
        if len(parts) >= 2:
            return ".".join(parts[:2])
        return base_package

    def _resolve_driver_class(self, database: str) -> str:
        drivers = {
            "mysql": "com.mysql.cj.jdbc.Driver",
            "postgres": "org.postgresql.Driver",
            "oracle": "oracle.jdbc.OracleDriver",
            "sqlite": "org.sqlite.JDBC",
        }
        return drivers.get(database, "com.mysql.cj.jdbc.Driver")

    def _resolve_jdbc_url(self, database: str, db_name: str) -> str:
        if database == "sqlite":
            return f"jdbc:sqlite:{db_name}.db"
        if database == "mysql":
            return (
                f"jdbc:mysql://localhost:3306/{db_name}?useUnicode=true&"
                "characterEncoding=utf8&serverTimezone=Asia/Shanghai"
            )
        if database == "postgres":
            return f"jdbc:postgresql://localhost:5432/{db_name}"
        return ""

    def _resolve_db_dependency(self, database: str) -> str:
        if database == "sqlite":
            return """<dependency>
            <groupId>org.xerial</groupId>
            <artifactId>sqlite-jdbc</artifactId>
            <version>3.51.1.0</version>
        </dependency>"""
        if database == "mysql":
            return """<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <version>8.4.0</version>
    <scope>compile</scope>
</dependency>"""
        if database == "postgres":
            return """<dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <version>42.7.3</version>
        </dependency>"""
        return ""


def main():
    """命令行入口。"""
    parser = argparse.ArgumentParser(
        description="YSS DDD 脚手架生成器",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python generate_scaffold.py --project-name my-service --base-package com.yss.myservice --output-dir /path/to/repo
  python generate_scaffold.py --project-name order-service --base-package com.yss.order --output-dir /path/to/repo --database mysql
        """,
    )
    parser.add_argument(
        "--project-name",
        required=True,
        help="项目名称 (kebab-case, 例如: user-service)",
    )
    parser.add_argument(
        "--base-package",
        required=True,
        help="基础包名 (例如: com.yss.user)",
    )
    parser.add_argument("--output-dir", required=True, help="输出目录；必须显式指定")
    example_group = parser.add_mutually_exclusive_group()
    example_group.add_argument(
        "--with-example",
        dest="with_example",
        action="store_true",
        help="已禁用：业务示例必须按批准切片合同生成",
    )
    example_group.add_argument(
        "--without-example",
        dest="with_example",
        action="store_false",
        help="不生成示例代码（默认）",
    )
    parser.set_defaults(with_example=False)
    parser.add_argument(
        "--database",
        default="mysql",
        choices=["mysql"],
        help="数据库类型；当前仅支持经过验证的 mysql（默认）",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="显式允许写入非空输出目录；必须同时提供批准合同元数据",
    )
    parser.add_argument("--contract-id", help="脚手架合同 ID；生成时必填")
    parser.add_argument(
        "--contract-version",
        type=int,
        help="脚手架合同版本；生成时必填",
    )
    parser.add_argument(
        "--approval-ref",
        help="生命周期批准引用；生成时必填",
    )
    parser.add_argument(
        "--router-draft-ref",
        help="Router 脚手架合同 draft 引用；生成时必填",
    )
    parser.add_argument(
        "--persisted-ref",
        help="已持久化脚手架合同引用；生成时必填",
    )
    parser.add_argument(
        "--contract-file",
        required=True,
        help="已批准且已持久化的结构化脚手架合同 JSON 文件；生成时必填",
    )
    parser.add_argument(
        "--overwrite-scope",
        help="合同批准的覆盖范围；非空目录使用 --force 时必填",
    )
    parser.add_argument(
        "--rollback-ref",
        help="可回滚 checkpoint 引用；非空目录使用 --force 时必填",
    )

    args = parser.parse_args()

    if not re.match(r"^[a-z][a-z0-9-]*$", args.project_name):
        print("❌ 错误: 项目名称必须是 kebab-case 格式 (例如: user-service)")
        sys.exit(1)
    if not re.match(r"^[a-z](?:[a-z0-9]*)(?:\.[a-z](?:[a-z0-9]*)?)*$", args.base_package):
        print("❌ 错误: 包名格式不正确 (例如: com.yss.user)")
        sys.exit(1)
    if args.with_example:
        parser.error("--with-example 已禁用；业务代码必须由批准的 YSS Slice skill 逐切片生成")

    try:
        generator = ScaffoldGenerator(
            project_name=args.project_name,
            base_package=args.base_package,
            output_dir=args.output_dir,
            with_example=args.with_example,
            database=args.database,
            force=args.force,
            contract_id=args.contract_id,
            contract_version=args.contract_version,
            approval_ref=args.approval_ref,
            router_draft_ref=args.router_draft_ref,
            persisted_ref=args.persisted_ref,
            contract_file=args.contract_file,
            overwrite_scope=args.overwrite_scope,
            rollback_ref=args.rollback_ref,
        )
        generator.generate()
    except Exception as exception:
        print(f"\n❌ 生成失败: {str(exception)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
