---
name: yss-layered-mvc-scaffold-generator
description: 用于在生命周期已批准的脚手架合同下生成按批准 Spring Boot / Java 平台生成通用 YSS 分层 MVC 后端工程；核心模块为 server、service、repository，并按能力确定性增加 adapter、client、feign-client。
---

# YSS Layered MVC Scaffold Generator

本 skill 只为已登记的全新 backend project 生成机械工程骨架，不创建 `project-instance`、不初始化 Git、不生成业务 Controller、DTO、查询、状态机或 Mock 数据。

## 进入条件

- backend `scaffold_status=required`，目标目录已确认且不存在。
- `scaffold-architecture-decisions.yaml` 中对应项目已达到 `lifecycle-approved`，确认架构为 `layered-mvc`。
- `yss-implementation-contract-compiler` 已编译统一 Project Scaffold Contract schema v4，并绑定批准且当前的 Technical Design、Data Architecture Decision v1、API Contract Decision v1 和真实工程合同批准记录。API `required` 时 Draft、Validation、独立 Review、Freeze 与工程批准必须绑定同一 OpenAPI YAML 字节；`not-applicable` 时必须有评估、原因和证据且不得携带占位资产。合同须由生命周期批准并持久化。
- 合同中的 `decision_id`、文件 digest、Profile、能力闭包、写路径和验证命令仍为当前版本。

任一条件缺失时返回 `blocked`。本生成器无交互、无默认回退；用户选择由 `yss-product-lifecycle` 在 `work-unit.technical-analysis` 的工程基线内完成。

## Spring Boot / Java 平台选择

调用本技能前由生命周期编排器展示 `scripts/backend-platforms` 的精确版本清单及兼容状态，并通过 `gate.backend-architecture-platform-approved` 把架构、Spring Boot、Java 和 YSS 父 POM/BOM 合并展示、取得真实用户确认；生成器不提问、不猜版本、不使用 `x` 或 `latest`。已有批准且当前的选择展示摘要后复用；既有工程核验并复用登记值，不触发该门禁。

- 候选平台：Boot 2.7.18 / Java 8，Boot 3.5.16 / Java 17 或 21，Boot 4.1.1 / Java 17 或 21。新 Boot 默认推荐 Java 17；候选不等于可生成。
- 独立子项目可继承主项目组合或覆盖，必须逐项目确认（允许一次确认明确列出的项目）；同一 Maven Reactor 使用一个平台。
- 只开放共享兼容清单中已有真实 YSS 构建、依赖和启动证据的组合。缺少兼容父 POM、BOM、starter 或相应能力证据即 `blocked`；不替换官方组件、不降级回退。
- 新生成合同必须有 `platform_configuration` v2，与架构决策、Maven 坐标及兼容条目摘要一致。Boot、Java、YSS 坐标或依赖配方变化时回生命周期重新确认并编译合同；仅追加同配置验证记录不重复确认，仍核验证据有效性。
- Spring MVC、Servlet、Validation、Jackson 和 starter 坐标消费共享平台清单；Boot 3.5 / 4.1 拒绝 Java 8/11。Jakarta 转换不包括 `javax.sql` 等 Java SE API。
- 平台候选维护验证产物标记 `platform_verification=candidate`，不能交给业务生成、升级完成等级或进入首切片验证。测试夹具不证明 YSS 兼容。

版本清单、合同字段、候选验证和支持晋级规则见 仓库共享合同 `docs/engineering/backend-platforms.md`。

## 架构与 Profile

- 固定核心模块：`server`、`service`、`repository`。
- `external-integration` 增加 `adapter`。
- `published-client` 增加 `client`。
- `feign-client` 增加 `client`、`feign-client`。
- 平台来自批准的 `platform_configuration`；保留 YSS BOM、MyBatis-Plus，不固定单一 Boot/Java/Validation 命名空间。
- 固定 architecture_profile=layered-mvc-service；verification_database=h2、production_database=not-bound。测试使用 H2，本地运行显式启用 scaffold-local；不引入外部驱动/数据源。

能力解析规则、模块职责和依赖方向见 [architecture.md](references/architecture.md)。生成器必须同时校验 `requested_capabilities` 与 `resolved_modules`，不得自行补猜模块。

## 执行

优先使用一键入口：

```bash
node scripts/generate_and_verify_scaffold.mjs \
  --project-name my-service \
  --base-package com.yss.myservice \
  --output-dir /path/to/backend-container \
  --contract-file /path/to/approved-scaffold-contract.json \
  --contract-id <id> \
  --contract-version <version> \
  --approval-ref <approval-ref> \
  --compiler-draft-ref <compiler-ref> \
  --persisted-ref <persisted-ref> \
  --group-id com.yss.example \
  --project-version 1.0.0-SNAPSHOT \
  --parent-group-id com.yss.cloud \
  --parent-artifact-id yss-cloud-microservice \
  --parent-version 2.0.0-SNAPSHOT \
  --yss-components-version 2.0.0-SNAPSHOT \
  --evidence-dir /path/to/evidence
```

受控工作流必须在项目根实际执行 `./mvnw validate`、`./mvnw test`、`./mvnw package`，逐条记录退出码、时间、stdout/stderr 和失败分类。全部通过后只得到 `empty-scaffold-verified`。

## 硬约束

- 新生成只接受包含 API Contract Decision 的统一 schema v4；缺 API 字段的预发布 v4 不得静默接受。验证器可只读检查历史 Manifest v3，恢复必须另行完成所有权审计、技术/数据/API 设计补齐与当前批准。历史 v2/v3 均不用于新生成。
- `architecture_family` 必须为 `layered-mvc`，`generator_skill` 必须为本 skill。
- 目标存在、`--force`、旧项目迁移、模板升级均为 `unsupported`。
- Harness 内只允许以 `apps/backend/` 为输出父容器；外部实现仓库使用已登记真实路径。
- 不生成业务示例。健康检查、上下文加载测试和架构测试只能验证机械工程能力，不定义用户可见 API。
- 生成后业务实现必须回到当前批准的 Slice Implementation Contract，使用适用 YSS skills 和 `behavior-tdd`。
- DDD/MVC 互转不属于脚手架生成；已生成项目改变架构时必须建立独立迁移工作单元。
