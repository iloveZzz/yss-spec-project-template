---
name: yss-ddd-scaffold-generator
description: 用于生成完整的 YSS DDD 多模块后端脚手架。当用户要求从零创建符合 YSS 规范的 Domain、Application、Infrastructure、Adapter、Bootstrap 工程骨架时调用。
---

# yss-ddd-scaffold-generator

这是一个脚手架生成型 skill。优先运行脚本和模板，不要手工拼装整套多模块工程。

在产品生命周期中，本 skill 属于 Engineering Baseline / YSS DDD Review 阶段：用于从零创建后端服务骨架，或为架构设计提供标准模块边界输入。它不是业务实现阶段的替代品。

## 何时使用

- 用户要求从零创建新的 YSS 后端服务。
- 用户要求一次性生成完整多模块工程骨架。
- 用户需要标准的 Domain、Application、Infrastructure、Adapter、Bootstrap 目录和基础模板。

## 不适用

- 只补单个领域模型时，优先 `yss-domain`。
- 只补持久层时，优先 `yss-repository`。
- 只补 Web 层时，优先 `yss-web-controller`。

## 优先流程

1. 确认项目名、基础包名、输出目录、数据库类型。
   Harness 内输出目录必须是 `apps/backend/` 容器，生成器再以 `project_name` 创建 `apps/backend/<project>/`；禁止使用 `app/backend/`、`app/frontend/` 或把 `apps/backend/` 之外的容器根当作后端项目根。
2. 运行 `node scripts/generate_scaffold.mjs` 生成骨架。
3. 检查生成的模块名、POM、基础配置文件和包路径。
4. 由生命周期受控工作单元在生成项目根目录实际执行 `./mvnw validate`、`./mvnw test` 和 `./mvnw package`；生成器打印的下一步命令不构成验证证据。
5. 如需继续细化，再追加其他 YSS skill 补全领域、仓储和 Web。

受控验证命令由本 skill 的 `node scripts/run_scaffold_verification.mjs` 固定执行；验证器先检查 `.yss/scaffold-generation.json` 的合同元数据，再在指定 evidence 目录写入每条命令的 stdout/stderr、`exit_code`、耗时、执行时间和 `scaffold-verification.json`；任何一条命令失败或未执行都必须阻断。

## 推荐命令

```bash
node scripts/generate_scaffold.mjs \
  --project-name my-service \
  --base-package com.yss.myservice \
  --output-dir /path/to/implementation-repo \
  --database mysql \
  --contract-id <approved-scaffold-contract-id> \
  --contract-version <current-version> \
  --approval-ref <lifecycle-approval-ref> \
  --router-draft-ref <router-draft-ref> \
  --persisted-ref <persisted-contract-ref> \
  --contract-file /path/to/persisted-scaffold-contract.json
```

## 生成结果应包含

- 父工程 POM
- `*-domain`
- `*-application`
- `*-infrastructure`
- `*-adapter`
- `*-bootstrap`
- 基础配置、机械模板、构建脚本

## 使用约束

- 先在生命周期批准的脚手架受控生成合同下生成骨架，再做业务化定制；不要直接把脚手架当最终代码交付。
- 永不生成 `User CRUD` 示例；`--with-example` 已禁用，业务代码必须按批准的 Slice Implementation Contract 逐切片实现。
- 若仓库已经存在相同工程，先核对覆盖范围。
- 输出目录必须显式指定；非空目录默认拒绝写入，确认覆盖时才使用 `--force`。
- Harness 内多项目布局必须使用 `apps/backend/<project>/`；`apps/backend/` 只能是生成器的父容器，`app/backend/`、`app/frontend/` 及其子路径一律拒绝。
- 不要在 skill 里硬编码用户业务字段或真实连接信息。
- 生成后要检查依赖关系是否仍符合分层约束。
- 生成后必须继续使用 `yss-backend-scaffold-parent` 校验工程基线，再按垂直切片加载 `yss-domain`、`yss-application`、`yss-repository`、`yss-web-controller` 等行为 skill；各 skill 的 `references/*-layer-guide.md` 承载分层开发规范。
- 当前脚手架第一阶段仅支持经过验证的 `mysql`；未提供完整模板和验证的数据库类型不得伪装成已支持。
- 生成后的后端工程必须使用项目根目录 `./mvnw ...` 执行构建、测试、运行和 CI 验证；不得在 README、实施记录、Ticket、Review 或 Release 中默认写裸 `mvn ...`。既有仓库确实无法使用 wrapper 时，必须记录受控例外。
- 原型确认后，`scaffold_status=required` 才能进入本 skill；本 skill 的生成边界是工程结构、POM、配置、Wrapper 和机械模板，不是业务实现。
- 脚手架合同必须携带 `contract_id`、`contract_version`、Router draft 引用、生命周期批准引用、持久化引用、当前版本、允许写路径、预期证据文件和验证命令；字段缺失或版本过期时阻断。
- 运行生成器必须传入 `--contract-file`；生成器会校验合同 `status=approved`、`current_version`、`primary_skill`、`controlled-generation` 和固定三条验证命令，不接受仅凭任意字符串引用的放行。
- 生成项目必须写入非业务元数据清单 `.yss/scaffold-generation.json`，回勾合同 ID、版本、批准引用、生成输入、受控模式和固定验证命令；清单缺失时不得交给后续 Router。
- 严禁把领域规则、状态机、权限、事务、复杂查询、错误映射、业务字段或用户可见行为塞进脚手架生成步骤。`./mvnw validate`、输出目录存在或“生成成功”都不等于生命周期批准、架构放行或 `ready-for-agent`。
- 生命周期脚手架生成必须关闭 `--with-example`，不得把 User CRUD 或业务字段当作样板；非空目标目录使用 `--force` 默认禁止，除非覆盖范围、备份、回滚点和批准引用已经进入当前合同。
- 脚手架完成后，所有后续生成的后端代码必须回到 `yss-router`，消费批准且版本当前的 Slice Implementation Contract 和对应 YSS skill；业务行为使用 `behavior-tdd`，机械生成才使用 `controlled-generation`。
- `.mvn/settings.xml` 只能通过 `${env.MAVEN_REPO_USERNAME}` 和 `${env.MAVEN_REPO_PASSWORD}` 读取 Maven 仓库凭据；内部仓库构建前由 CI 或本地安全环境注入变量，禁止把 Maven 仓库用户名、明文密码或 Maven 加密密码写入 skill、模板或生成工程。
- 涉及 API 契约时，先确认 `docs/.scratch/<feature>/api/<feature>.yaml` 中的 OpenAPI Draft / Freeze 状态；不要用脚手架生成结果反向替代产品契约设计。

## 按需读取

- 主脚本：`scripts/generate_scaffold.mjs`
- 受控验证器：`scripts/run_scaffold_verification.mjs`
- 模板目录：`assets/templates/`
- 分层细化参考：`references/yss-backend-scaffold-parent/` 及其子 skill

## 阶段 7 合同

- 仅在实现仓库/输出目录、`scaffold_status=required` 和批准合同明确时运行。
- 工程骨架属于 `controlled-generation`，必须记录生成器输入、预期文件和 `./mvnw ...` 编译/测试结果；不得将业务状态机、权限、事务或查询逻辑混入生成步骤。
- 生成结果必须包含 `.yss/scaffold-generation.json`，并由验证器回勾该清单；清单与批准合同不一致时阻断。
- `./mvnw validate`、`./mvnw test`、`./mvnw package` 必须由受控工作单元真实执行，并记录每条命令的 `exit_code`、耗时、stdout/stderr 引用和执行时间；只列命令计划、生成器成功或打印输出均视为缺失证据并阻断。
- 生成后按统一 `YSS Skill Execution Result` 返回 changed/evidence files、实际验证结果和新增影响，再由 Router 为业务工作单元重新路由。
