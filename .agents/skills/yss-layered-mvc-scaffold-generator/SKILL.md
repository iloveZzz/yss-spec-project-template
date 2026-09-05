---
name: yss-layered-mvc-scaffold-generator
description: 用于在生命周期已批准的脚手架合同下生成通用 YSS Java 8 分层 MVC 后端工程；核心模块为 server、service、repository，并按能力确定性增加 adapter、client、feign-client。
---

# YSS Layered MVC Scaffold Generator

本 skill 只为已登记的全新 backend project 生成机械工程骨架，不创建 `project-instance`、不初始化 Git、不生成业务 Controller、DTO、查询、状态机或 Mock 数据。

## 进入条件

- backend `scaffold_status=required`，目标目录已确认且不存在。
- `scaffold-architecture-decisions.yaml` 中对应项目已达到 `lifecycle-approved`，确认架构为 `layered-mvc`。
- `yss-implementation-contract-compiler` 已编译 scaffold contract schema v3，生命周期已批准并持久化。
- 合同中的 `decision_id`、文件 digest、Profile、能力闭包、写路径和验证命令仍为当前版本。

任一条件缺失时返回 `blocked`。本生成器无交互、无默认回退；用户选择由 `yss-product-lifecycle` 在 `work-unit.technical-analysis` 的工程基线内完成。

## 架构与 Profile

- 固定核心模块：`server`、`service`、`repository`。
- `external-integration` 增加 `adapter`。
- `published-client` 增加 `client`。
- `feign-client` 增加 `client`、`feign-client`。
- 固定平台：Java 8、Spring Boot 2.7、`javax`、YSS BOM、MyBatis-Plus。
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

- 只接受 scaffold contract schema v3 和 Manifest schema v3；历史 v2 只读兼容，不用于新生成。
- `architecture_family` 必须为 `layered-mvc`，`generator_skill` 必须为本 skill。
- 目标存在、`--force`、旧项目迁移、模板升级均为 `unsupported`。
- Harness 内只允许以 `apps/backend/` 为输出父容器；外部实现仓库使用已登记真实路径。
- 不生成业务示例。健康检查、上下文加载测试和架构测试只能验证机械工程能力，不定义用户可见 API。
- 生成后业务实现必须回到当前批准的 Slice Implementation Contract，使用适用 YSS skills 和 `behavior-tdd`。
- DDD/MVC 互转不属于脚手架生成；已生成项目改变架构时必须建立独立迁移工作单元。
