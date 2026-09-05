---
name: yss-mvc-data-analysis-project-initializer
description: 在生命周期批准的初始化合同下创建独立 Git 管理的数据分析 project-instance；固定 mvc-data-analysis-v1 六模块、Java 8 和本地测试 H2。
---

# 数据分析 MVC 项目初始化

这是 `work-unit.service-project-initialization` 的执行器，不是通用 MVC 脚手架。通用 MVC 使用 `yss-layered-mvc-scaffold-generator`；DDD 使用 `yss-ddd-scaffold-generator`。旧 `yss-mvc-scaffold-generator` 已退役且不提供自动别名。

## 执行合同

- 必须有生命周期批准且当前的 schema v3 scaffold contract，绑定 `architecture_profile=mvc-data-analysis-v1`、本生成器及已批准的架构决策。
- 固定 server/core/client/repository/adapter/feign-client；core 是薄应用层，规则见 `docs/agents/backend-architecture-profiles.md`。不生成业务接口、SQL、DDL、Mock、生产数据库配置或额外数据源。
- `verification_database=h2` / `production_database=not-bound`；Java 8 / Boot 2.7 / javax。目标不存在，禁止覆盖、迁移、自动提交和推送。
- 合同必须包含 `context_handoff_ref`、`context_handoff_digest`：批准交接的完整根 CONTEXT.md（含 schema frontmatter），不得用跨仓路径替代本仓词汇表。初始化只复制已确认内容，不创造业务术语；父项目只保留服务引用和 handoff 证据。
- `allowed_write_paths` 必须覆盖目标项目及同级 skillUtils。已有 skillUtils 锁不匹配即 blocked，不替换别的项目正在使用的工具包。

## 命令与结果

`node scripts/generate_project.mjs` 使用通用 MVC 生成器相同的批准合同与 Maven 坐标参数（`--output-dir` 是父容器）；无 `--database`、`--with-mock` 或交互选项。

输出独立 project-instance、初始化但未提交的 main Git、生命周期资产、完整锁定 skillUtils、架构身份及 Manifest。使用共享 `run_scaffold_verification.mjs <project> <evidence>` 实跑三条 Wrapper 命令；只在实际成功后报告 empty-scaffold-verified。Profile 仍须独立首切片 fixture 达标才能晋升 supported。
