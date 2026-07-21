#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
YSS DDD 脚手架生成器
用于快速创建基于 DDD 的后端项目结构
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List
import re
import shutil
import sqlite3
from datetime import datetime

class ScaffoldGenerator:
    """脚手架生成器主类"""

    def __init__(self, project_name: str, base_package: str, output_dir: str,
                 with_example: bool = True, database: str = 'sqlite'):
        self.project_name = project_name
        self.base_package = base_package
        self.output_dir = Path(output_dir)
        self.with_example = with_example
        self.database = database
        self.template_root = Path(__file__).resolve().parents[1] / "assets" / "templates"
        self.config_template_dir = self.template_root / "config"
        self.pom_template_dir = self.template_root / "pom"
        if not self.pom_template_dir.exists():
            self.pom_template_dir = self.config_template_dir

        # 转换包名为路径
        self.package_path = base_package.replace('.', '/')

        # 项目根目录
        self.project_root = self.output_dir / project_name

        self.author = os.getenv("USER", "yss-team")
        self.date = datetime.now().strftime("%Y-%m-%d")
        self.group_id = self._resolve_group_id(base_package)
        self.project_description = f"{self.project_name} service"
        self.db_name = self.project_name.replace("-", "_")
        self.driver_class = self._resolve_driver_class(self.database)
        self.jdbc_url = self._resolve_jdbc_url(self.database, self.db_name)
        self.db_username = "root" if self.database == "mysql" else ""
        self.db_password = "root" if self.database == "mysql" else ""
        self.db_dependency = self._resolve_db_dependency(self.database)

    def generate(self):
        """生成完整的脚手架项目"""
        print(f"🚀 开始生成项目: {self.project_name}")
        print(f"📦 基础包名: {self.base_package}")
        print(f"📁 输出目录: {self.output_dir}")
        print()

        # 创建项目结构
        self._create_project_structure()

        # 生成 POM 文件
        self._generate_pom_files()

        # 生成配置文件
        self._generate_config_files()

        # 生成示例代码
        if self.with_example:
            self._generate_example_code()

        # 生成数据库脚本
        self._generate_database_scripts()

        # 生成文档
        self._generate_documentation()

        self._copy_wrapper_files()

        print()
        print("✅ 项目生成完成!")
        print(f"📂 项目位置: {self.project_root}")
        print()
        print("🎯 下一步:")
        print(f"  cd {self.project_root}")
        print("  ./mvnw clean install")
        print("  ./mvnw spring-boot:run -pl {}-bootstrap".format(self.project_name))

    def _create_project_structure(self):
        """创建项目目录结构"""
        print("📁 创建项目目录结构...")

        modules = [
            f"{self.project_name}-domain",
            f"{self.project_name}-application",
            f"{self.project_name}-infrastructure",
            f"{self.project_name}-adapter",
            f"{self.project_name}-bootstrap"
        ]

        for module in modules:
            module_path = self.project_root / module

            # 创建 src/main/java 目录
            java_path = module_path / "src" / "main" / "java" / self.package_path
            java_path.mkdir(parents=True, exist_ok=True)

            # 创建 src/main/resources 目录
            resources_path = module_path / "src" / "main" / "resources"
            resources_path.mkdir(parents=True, exist_ok=True)

            # 创建 src/test/java 目录
            test_path = module_path / "src" / "test" / "java" / self.package_path
            test_path.mkdir(parents=True, exist_ok=True)

            print(f"  ✓ {module}")

        # 创建 adapter 子模块
        web_module = self.project_root / f"{self.project_name}-adapter" / f"{self.project_name}-web"
        web_java_path = web_module / "src" / "main" / "java" / self.package_path / "rest"
        web_java_path.mkdir(parents=True, exist_ok=True)
        print(f"  ✓ {self.project_name}-adapter/{self.project_name}-web")

        # 创建数据库脚本目录
        db_path = self.project_root / "db"
        db_path.mkdir(parents=True, exist_ok=True)
        print(f"  ✓ db")

    def _generate_pom_files(self):
        """生成 Maven POM 文件"""
        print("\n📝 生成 Maven POM 文件...")
        pom_templates = [
            (self.pom_template_dir / "parent-pom.xml.template", self.project_root / "pom.xml"),
            (self.pom_template_dir / "domain-pom.xml.template", self.project_root / f"{self.project_name}-domain" / "pom.xml"),
            (self.pom_template_dir / "application-pom.xml.template", self.project_root / f"{self.project_name}-application" / "pom.xml"),
            (self.pom_template_dir / "infrastructure-pom.xml.template", self.project_root / f"{self.project_name}-infrastructure" / "pom.xml"),
            (self.pom_template_dir / "adapter-pom.xml.template", self.project_root / f"{self.project_name}-adapter" / "pom.xml"),
            (self.pom_template_dir / "web-pom.xml.template", self.project_root / f"{self.project_name}-adapter" / f"{self.project_name}-web" / "pom.xml"),
            (self.pom_template_dir / "bootstrap-pom.xml.template", self.project_root / f"{self.project_name}-bootstrap" / "pom.xml"),
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
        """生成配置文件"""
        print("\n⚙️  生成配置文件...")
        config_templates = [
            (self.config_template_dir / "application.yml.template", self.project_root / f"{self.project_name}-bootstrap" / "src" / "main" / "resources" / "application.yml"),
            (self.config_template_dir / "logback-spring.xml.template", self.project_root / f"{self.project_name}-bootstrap" / "src" / "main" / "resources" / "logback-spring.xml"),
        ]
        self._render_and_write_templates(config_templates)
        print("  ✓ application.yml")
        print("  ✓ logback-spring.xml")

    def _generate_example_code(self):
        """生成示例代码"""
        print("\n💻 生成示例代码 (User CRUD)...")
        domain_root = self.project_root / f"{self.project_name}-domain" / "src" / "main" / "java" / self.package_path
        application_root = self.project_root / f"{self.project_name}-application" / "src" / "main" / "java" / self.package_path
        infrastructure_root = self.project_root / f"{self.project_name}-infrastructure" / "src" / "main" / "java" / self.package_path
        adapter_root = self.project_root / f"{self.project_name}-adapter" / f"{self.project_name}-web" / "src" / "main" / "java" / self.package_path
        bootstrap_root = self.project_root / f"{self.project_name}-bootstrap" / "src" / "main" / "java" / self.package_path

        example_templates = [
            (self.template_root / "domain" / "UserAddCmd.java.template", domain_root / "client" / "dto" / "cmd" / "UserAddCmd.java"),
            (self.template_root / "domain" / "UserUpdateCmd.java.template", domain_root / "client" / "dto" / "cmd" / "UserUpdateCmd.java"),
            (self.template_root / "domain" / "UserPageQuery.java.template", domain_root / "client" / "dto" / "query" / "UserPageQuery.java"),
            (self.template_root / "domain" / "UserVO.java.template", domain_root / "client" / "vo" / "UserVO.java"),
            (self.template_root / "domain" / "UserGateway.java.template", domain_root / "domain" / "user" / "gateway" / "UserGateway.java"),
            (self.template_root / "domain" / "User.java.template", domain_root / "domain" / "user" / "model" / "User.java"),
            (self.template_root / "application" / "UserService.java.template", application_root / "core" / "service" / "UserService.java"),
            (self.template_root / "application" / "UserServiceImpl.java.template", application_root / "core" / "service" / "impl" / "UserServiceImpl.java"),
            (self.template_root / "application" / "UserConvertor.java.template", application_root / "core" / "service" / "convertor" / "UserConvertor.java"),
            (self.template_root / "infrastructure" / "AuditableEntity.java.template", infrastructure_root / "repository" / "entity" / "AuditableEntity.java"),
            (self.template_root / "infrastructure" / "UserPO.java.template", infrastructure_root / "repository" / "entity" / "UserPO.java"),
            (self.template_root / "infrastructure" / "UserRepository.java.template", infrastructure_root / "repository" / "UserRepository.java"),
            (self.template_root / "infrastructure" / "UserGatewayImpl.java.template", infrastructure_root / "repository" / "gateway" / "impl" / "UserGatewayImpl.java"),
            (self.template_root / "infrastructure" / "UserPOConvertor.java.template", infrastructure_root / "repository" / "convertor" / "UserPOConvertor.java"),
            (self.template_root / "infrastructure" / "PageUtil.java.template", infrastructure_root / "repository" / "util" / "PageUtil.java"),
            (self.template_root / "infrastructure" / "YssDataMybatisConfig.java.template", infrastructure_root / "repository" / "config" / "YssDataMybatisConfig.java"),
            (self.template_root / "adapter" / "UserController.java.template", adapter_root / "rest" / "UserController.java"),
            (self.template_root / "bootstrap" / "YssDatamiddleApplication.java.template", bootstrap_root / "YssDatamiddleApplication.java"),
        ]
        self._render_and_write_templates(example_templates)
        print("  ✓ Domain 层: UserAddCmd, UserUpdateCmd, UserPageQuery, UserVO, UserGateway, User")
        print("  ✓ Application 层: UserService, UserServiceImpl, UserConvertor")
        print("  ✓ Infrastructure 层: UserPO, UserRepository, UserGatewayImpl, UserPOConvertor, PageUtil,YssDataMybatisConfig")
        print("  ✓ Adapter 层: UserController")
        print("  ✓ Bootstrap 层: YssDatamiddleApplication 启动类")

    def _generate_database_scripts(self):
        """生成数据库脚本"""
        print("\n🗃️  生成数据库脚本...")

        # 针对 SQLite 的特殊处理
        if self.database == 'sqlite':
            schema_content = """-- 用户表
CREATE TABLE t_user (
  id INTEGER PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100),
  status INTEGER NOT NULL DEFAULT 1,
  description VARCHAR(500),
  deleted INTEGER NOT NULL DEFAULT 0,
  created_by VARCHAR(50),
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_modified_by VARCHAR(50),
  last_modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_username ON t_user (username);
CREATE INDEX idx_status ON t_user (status);
CREATE INDEX idx_created_date ON t_user (created_date);

-- Leaf Alloc 表
CREATE TABLE leaf_alloc (
  biz_tag VARCHAR(128) NOT NULL PRIMARY KEY,
  max_id BIGINT NOT NULL,
  step INT NOT NULL,
  description VARCHAR(256),
  update_time VARCHAR(256)
);
"""
            # 直接写入 schema.sql
            schema_path = self.project_root / "db" / "schema.sql"
            self._write_file(schema_path, schema_content)

            # data.sql 模板处理 (如果有差异也可以在这里处理，暂时复用模板但需注意语法)
            # SQLite 的 data.sql 可以复用 MySQL 的 INSERT 语句，只要没有特殊函数
            data_templates = [
                (self.config_template_dir / "data.sql.template", self.project_root / "db" / "data.sql"),
            ]
            self._render_and_write_templates(data_templates)

            # 初始化 SQLite 数据库
            print("  Initializing SQLite database...")
            try:
                db_file = self.project_root / f"{self.project_name}-bootstrap" / f"{self.db_name}.db"
                # 如果文件存在先删除，确保干净的初始化
                if db_file.exists():
                    db_file.unlink()

                conn = sqlite3.connect(str(db_file))
                cursor = conn.cursor()

                # 执行 schema.sql
                if schema_path.exists():
                    cursor.executescript(schema_path.read_text(encoding='utf-8'))
                    print("    ✓ Executed schema.sql")

                # 执行 data.sql
                data_path = self.project_root / "db" / "data.sql"
                if data_path.exists():
                    cursor.executescript(data_path.read_text(encoding='utf-8'))
                    print("    ✓ Executed data.sql")

                conn.commit()
                conn.close()
                print(f"    ✓ Created database: {db_file.name}")
            except Exception as e:
                print(f"    ❌ Failed to initialize SQLite database: {e}")

        else:
            # 默认 (MySQL) 处理
            db_templates = [
                (self.config_template_dir / "schema.sql.template", self.project_root / "db" / "schema.sql"),
                (self.config_template_dir / "data.sql.template", self.project_root / "db" / "data.sql"),
            ]
            self._render_and_write_templates(db_templates)

        print("  ✓ schema.sql (建表脚本)")
        print("  ✓ data.sql (初始化数据)")

    def _generate_documentation(self):
        """生成项目文档"""
        print("\n📚 生成项目文档...")
        readme_path = self.project_root / "README.md"
        api_path = self.project_root / "API.md"
        readme_content = self._render_text(
            "# {{project_name}}\n\n"
            "## 模块说明\n\n"
            "- {{project_name}}-domain\n"
            "- {{project_name}}-application\n"
            "- {{project_name}}-infrastructure\n"
            "- {{project_name}}-adapter\n"
            "- {{project_name}}-bootstrap\n\n"
            "## 快速开始\n\n"
            "```bash\n"
            "cd {{project_name}}\n"
            "./mvnw clean compile\n"
            "./mvnw spring-boot:run -pl {{project_name}}-bootstrap\n"
            "```\n",
            self._template_vars()
        )
        api_content = self._render_text(
            "# {{project_name}} API\n\n"
            "## 用户接口\n\n"
            "- POST /api/users/page\n"
            "- GET /api/users/{id}\n"
            "- POST /api/users\n"
            "- PUT /api/users\n"
            "- DELETE /api/users/{id}\n",
            self._template_vars()
        )
        self._write_file(readme_path, readme_content)
        self._write_file(api_path, api_content)
        print("  ✓ README.md")
        print("  ✓ API.md")

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

    def _render_and_write_templates(self, items: List[tuple]):
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
            "db_username": self.db_username,
            "db_password": self.db_password,
            "db_dependency": self.db_dependency
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
            "sqlite": "org.sqlite.JDBC"
        }
        return drivers.get(database, "com.mysql.cj.jdbc.Driver")

    def _resolve_jdbc_url(self, database: str, db_name: str) -> str:
        if database == "sqlite":
            return f"jdbc:sqlite:{db_name}.db"
        elif database == "mysql":
            return f"jdbc:mysql://localhost:3306/{db_name}?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai"
        elif database == "postgres":
            return f"jdbc:postgresql://localhost:5432/{db_name}"
        return ""

    def _resolve_db_dependency(self, database: str) -> str:
        if database == "sqlite":
            return """<dependency>
            <groupId>org.xerial</groupId>
            <artifactId>sqlite-jdbc</artifactId>
            <version>3.51.1.0</version>
        </dependency>"""
        elif database == "mysql":
            return """<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <version>8.4.0</version>
    <scope>compile</scope>
</dependency>"""
        elif database == "postgres":
            return """<dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <version>42.7.3</version>
        </dependency>"""

        return ""


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='YSS DDD 脚手架生成器',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  python generate_scaffold.py --project-name my-service --base-package com.yss.myservice
  python generate_scaffold.py --project-name user-service --base-package com.yss.user --output-dir ./output
        '''
    )

    parser.add_argument('--project-name', required=True,
                       help='项目名称 (kebab-case, 例如: user-service)')
    parser.add_argument('--base-package', required=True,
                       help='基础包名 (例如: com.yss.user)')
    parser.add_argument('--output-dir', default='./output',
                       help='输出目录 (默认: ./output)')
    parser.add_argument('--with-example', type=bool, default=True,
                       help='是否包含示例代码 (默认: True)')
    parser.add_argument('--database', default='sqlite',
                       choices=['mysql', 'postgres', 'oracle', 'sqlite'],
                       help='数据库类型 (默认: sqlite)')

    args = parser.parse_args()

    # 验证项目名称格式
    if not re.match(r'^[a-z][a-z0-9-]*$', args.project_name):
        print("❌ 错误: 项目名称必须是 kebab-case 格式 (例如: user-service)")
        sys.exit(1)

    # 验证包名格式
    if not re.match(r'^[a-z][a-z0-9.]*$', args.base_package):
        print("❌ 错误: 包名格式不正确 (例如: com.yss.user)")
        sys.exit(1)

    # 创建生成器并执行
    generator = ScaffoldGenerator(
        project_name=args.project_name,
        base_package=args.base_package,
        output_dir=args.output_dir,
        with_example=args.with_example,
        database=args.database
    )

    try:
        generator.generate()
    except Exception as e:
        print(f"\n❌ 生成失败: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()
