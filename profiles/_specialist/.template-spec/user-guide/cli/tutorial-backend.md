# Backend 项目与脚手架

本教程以 Rust CLI `3.8.0` 与内嵌 Template `5.8.0` 为操作基线。先运行 `yss version` 和 `yss --help`，核对实际版本及 Bundle 来源。已有工程按自己的 POM、effective POM 和解析依赖选择平台。

## 接入已有工程

已有普通 Java 工程先接入 Backend 技能。已有受管工程使用 sync 沿原 Profile 和安装范围更新。

```text
yss attach --root <已有后端工程> --profile backend --installation skills
yss skills list --root <受管后端工程>
yss sync --root <受管后端工程> --dry-run
```

需要全新方法目录时使用 `init --root <新目录或空目录> --profile backend`。应用骨架使用以下 scaffold 命令单独生成。

## 生成 Java 骨架

新骨架先读 `scaffold catalog --json` 和对应子命令帮助，再使用 `scaffold ddd` 或 `scaffold mvc`。最少五项工程参数为 `--project-name`、`--base-package`、`--output-dir`、`--group-id`、`--project-version`，工程版本继续必填。CLI `3.8.0` 从 catalog 的 `defaultRecipeId` 补齐 YSS `4.0.0-SNAPSHOT`、Boot `4.1.2`、Java `17`、Parent `com.yss.cloud:yss-cloud-microservice:4.0.0-SNAPSHOT` 和同版本 `com.yss.cloud:yss-components-bom`。显式技术参数优先，仅补齐唯一匹配组合。只选组件 `3.2.0-SNAPSHOT` 时补齐其 Parent 与 Boot `3.5.16` / Java `17`，歧义按错误补参数，未知版本需显式提供 Parent 等缺项。完整自定义输入沿用实际输入与兼容 warnings。三个完整场景见项目根 `.agents/skills/yss-ddd-scaffold-generator/references/command-examples.md`。旧 CLI 先核对实际帮助，已有工程从 POM/effective POM 与解析依赖选择平台。`--dry-run` 只在内存预览，不创建目标、控制目录或计划。目标必须不存在，输出路径不能经过符号链接，已有工程不能用脚手架覆盖。

以下示例在当前已存在父目录生成 MVC 工程，需要 DDD 分层时将 mvc 替换为 ddd。

```text
yss scaffold catalog --json
yss scaffold mvc --project-name sample-api --base-package com.example.sample --output-dir . --group-id com.example --project-version 1.0.0-SNAPSHOT --dry-run
yss scaffold mvc --project-name sample-api --base-package com.example.sample --output-dir . --group-id com.example --project-version 1.0.0-SNAPSHOT
yss attach --root ./sample-api --profile backend --installation skills
```

最后一条用于已明确要求安装项目技能的任务。选择旧组件配方时，在生成命令中增加 `--yss-components-version 3.2.0-SNAPSHOT`。完整自定义 Parent 与 BOM 时，按 catalog 与帮助补齐精确技术参数。

4.0 默认配方的 evidenceStatus 仍为 candidate。已登记证据覆盖本地源码构件、macOS ARM64 上的 MVC/DDD 构建和启动监听，以及代表性 H2/PostgreSQL 消费场景。远程当前 SNAPSHOT、Windows 原生运行及本次新工程的实际结果须另行核验，warnings 随配方证据返回。

当前生成空模块、POM、机械启动配置、Maven Wrapper 和 `.yss/scaffold.json` 来源收据。教学 reference 按需参考，业务实现后续按需求添加。生成不需要合同、批准或平台资格证据，不生成测试与门禁，也不自动执行 Maven。后续业务实现复用适用 YSS 技能，工程命令优先根 `./mvnw`。按任务实际需要验证并报告结果。

## 完整研发技能

本基线的 CLI 在 Backend `project` / `skills` 两种安装下均默认安装 42 项，库中另有 12 项可按需补装，共 54 项。CLI 3.13.0 内嵌的 Template 5.13.0 加入 `yss-help`，默认 43 项，可用 55 项。以 `skills list` 的实际结果为准。模板改动不会更新已经安装的二进制。

`implement` 承接 Spec/明确需求，按需使用 `to-tickets` 细化研发实现切片、`yss-technical-design` 完成架构/方案/详细设计、对应脚手架与分层技能实现，再用 `yss-backend-testing` 选择并解释实际验证。切片依据真实工程、技术栈与适用设计，不猜测已确认方案，不要求先补业务票。缺失事实列明影响。DDD 建模才使用 `yss-tactical-design`。MVC 沿用 Service，普通测试不强制 TDD。一次安装具备完整能力，不等于每个任务执行全部技能。

完整交付维护有源码依据的构建部署手册，优先更新已有 README/运维说明，结构参考 `.template-spec/templates/build-deploy-guide-template.md`。部署当前仅交付说明。未知平台、健康入口和回滚限制如实注明，不执行部署、建设 CI/CD 或云资源。构建、测试、启动和部署的实际结果分别说明。

12 项按需技能为 `to-spec`、`yss-analyze-business`、`triage`、`yss-map-decisions`、`llm-wiki`、`yss-backend-spec-review`、`yss-up-springboot3`、`yss-security-algorithm`、`setup-matt-pocock-skills`、`maintaining-skills`、`writing-for-agents`、`publish-skills-sh`。历史安全算法组件仍禁止新生产接入。提交、交接和来源索引维护保持显式调用及原授权边界。

数据库设计、结构审查、元信息说明书及 DDL 使用默认技能 `database-analysis-docs`。Backend 版本只分发技能说明和参考，采集、表格和 SQL 核对使用实际可用的宿主工具。保留逻辑关系与必要基础约束，不默认创建外键、自增或特殊数据库机制。安装技能不授权连接未指定的数据库或执行 DDL。

## 从源码生成接入专业技能

源码生成、方法安装和 Home 关系是三项独立结果。仅要源码时生成即结束。用户已要求项目技能时，使用同一已核验的 CLI，继续 `attach --root <生成目录> --profile backend --installation skills`。新安装默认 project 继续支持完整资料，源码后接入建议显式 skills，避免把已有 README 当作待覆盖模板。

CLI `3.6.0` 起在 scaffold 成功后给出 attach 的独立参数数组。沿用本次已核验的程序路径执行 command.args。attach 冲突时保留源码及原入口，说明技能接入未完成，不删除工程或退回 project。已有自定义 .gitignore/AGENTS 等仍可能冲突，按实际内容处理。

若有上游 Home/规格且允许维护本仓入口，优先复用 README 的规格来源区，再让 AGENTS 引用实际位置。已有等价导航不重复建立。无上游不造链接，只有 Home 写入权限时不修改工程。
