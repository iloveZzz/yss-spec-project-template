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

1. 确认服务级 `scaffold_request_id`、项目名、基础包名、Maven 项目坐标、父 POM GAV、YSS Components BOM 版本、输出目录和批准 Profile。Java `base_package` 与 Maven `group_id` 是两个独立输入，不得相互推导；脚手架发生在 Ticket 正式化前，不使用 `slice_id` 伪造切片身份。
   Harness 内输出目录必须是 `apps/backend/` 容器，生成器再以 `project_name` 创建 `apps/backend/<project>/`；禁止使用 `app/backend/`、`app/frontend/` 或把 `apps/backend/` 之外的容器根当作后端项目根。
2. 优先运行 `node scripts/generate_and_verify_scaffold.mjs`，在同一个受控工作流中生成骨架并执行真实 Maven 验证。`generate_scaffold.mjs` 只是底层生成原语，单独返回 0 不代表脚手架完成。
3. 检查生成的模块名、POM、机械启动入口、基础配置文件和包路径。
4. 受控工作流必须在生成项目根目录实际执行 `./mvnw validate`、`./mvnw test` 和 `./mvnw package`；三条命令全部返回 0 后才能报告完成。
5. 三条 Wrapper 命令通过只得到 `empty-scaffold-verified`。如需声称已满足下游技能的首切片就绪条件，必须使用 `node scripts/run_first_slice_verification.mjs` 校验批准且版本当前的 Slice Implementation Contract、完整分层产物、skill tree digest 与根 Wrapper；只有验证器成功更新 Manifest 后才得到 `first-slice-verified`。

受控验证命令由本 skill 的 `node scripts/run_scaffold_verification.mjs` 固定执行；验证器先检查 `.yss/scaffold-generation.json` 的合同元数据和 Wrapper、Java、项目级 Maven settings/profile、仓库凭据是否就绪，再在指定 evidence 目录写入每条命令的 stdout/stderr、`exit_code`、`failure_category`、耗时、执行时间和 `scaffold-verification.json`。仓库或凭据失败归为 `repository-access`，与 `project-model`、`compilation`、`bootstrap-entrypoint`、`test-failure`、`packaging` 分开；任何一条命令失败或未执行都必须阻断。

## 推荐命令

```bash
node scripts/generate_and_verify_scaffold.mjs \
  --project-name my-service \
  --base-package com.yss.myservice \
  --group-id com.yss.datamiddle \
  --project-version 1.0.0-SNAPSHOT \
  --parent-group-id com.yss.datamiddle \
  --parent-artifact-id yss-datamiddle-parent \
  --parent-version 2.0.0-SNAPSHOT \
  --yss-components-version 2.0.0-SNAPSHOT \
  --output-dir /path/to/implementation-repo \
  --database mysql \
  --contract-id <approved-scaffold-contract-id> \
  --contract-version <current-version> \
  --approval-ref <lifecycle-approval-ref> \
  --router-draft-ref <router-draft-ref> \
  --persisted-ref <persisted-contract-ref> \
  --contract-file /path/to/persisted-scaffold-contract.json \
  --evidence-dir /path/to/evidence/scaffold
```

完成批准的 golden first slice 后运行：

```bash
node scripts/run_first_slice_verification.mjs \
  --project-root /path/to/implementation-repo/my-service \
  --slice-contract-file /path/to/approved-slice-contract.json \
  --evidence-dir /path/to/evidence/first-slice
```

## 生成结果应包含

- 父工程 POM
- `*-domain`
- `*-application`
- `*-infrastructure`
- `*-adapter`
- `*-bootstrap`
- `*-bootstrap` 下可被 Spring Boot Maven Plugin 发现的机械 `*Application` 启动入口
- 基础配置、机械模板、构建脚本

## 使用约束

- 先在生命周期批准的脚手架受控生成合同下生成骨架，再做业务化定制；不要直接把脚手架当最终代码交付。
- 永不生成 `User CRUD` 示例；`--with-example` 已禁用，业务代码必须按批准的 Slice Implementation Contract 逐切片实现。
- 若目标工程已经存在，直接返回 `unsupported`。旧项目继续按原工程维护；需要现代化时单独立项、先评估再逐切片迁移，不属于本 skill。
- 输出目录必须显式指定；目标工程目录必须不存在，`--force` 永久拒绝。
- Harness 内多项目布局必须使用 `apps/backend/<project>/`；`apps/backend/` 只能是生成器的父容器，`app/backend/`、`app/frontend/` 及其子路径一律拒绝。`git-submodule` gitlink、空挂载点、detached HEAD 工作树不得覆盖生成，即使传入 `--force` 也不得当成普通目录，且不得走「请显式传入 `--force`」普通目录覆盖 / rename 路径。`--output-dir` 指向 detached HEAD 子仓时不得 mkdir、staging 或生成工程。先 `git submodule update --init` 并在子仓附加分支工作树内生成。生成器必须先调用 `gitSubmoduleScaffoldViolation`，再在 exists / `--force` / rename 之前调用 `refuseGitlinkAsRegularDirectory`。
- 不要在 skill 里硬编码用户业务字段或真实连接信息。
- 生成后要检查依赖关系是否仍符合分层约束。
- 生成时的静态依赖由技能注册表与 Router 共同约束为 `yss-backend-scaffold-parent`、`alibaba-java-code-style`。生成后必须回到 Router，并按批准切片加载 `yss-domain`、`yss-application`、`yss-repository`、`yss-mybatis`、`yss-web-controller`、`yss-dto`、`yss-exception`、`yss-validation`、`mapstruct`、`lombok`、`alibaba-java-code-style` 等实际命中的行为 skill。
- 当前脚手架第一阶段仅支持经过验证的 `mysql`；未提供完整模板和验证的数据库类型不得伪装成已支持。
- 生成后的后端工程必须使用项目根目录 `./mvnw ...` 执行构建、测试、运行和 CI 验证；不得在 README、实施记录、Ticket、Review 或 Release 中默认写裸 `mvn ...`。既有仓库确实无法使用 wrapper 时，必须记录受控例外。
- 原型确认后，`scaffold_status=required` 才能进入本 skill；本 skill 的生成边界是工程结构、POM、配置、Wrapper 和机械模板，不是业务实现。
- 脚手架合同必须携带 `contract_id`、`contract_version`、Router draft 引用、生命周期批准引用、持久化引用、当前版本、允许写路径、预期证据文件和验证命令；字段缺失或版本过期时阻断。
- 新脚手架合同只接受 schema v2，必须分别携带 `project_name`、`base_package` 和 `maven_coordinates`；后者包含项目 `group_id` / `project_version`、父 POM GAV 与 `yss_components_version`，并由 CLI 原样传入。schema v1 为 `unsupported`，直接拒绝且不自动升级。
- 合同 `profiles` 只支持 `target-domain-model`、`mybatis-plus`、`mysql`、`spring-boot-2.7-jdk8`、`javax`、`web`、`yss-internal`。普通 MyBatis、Boot 3、独立 client module、client-in-domain 和其他旧架构均为 `unsupported`，不提供回退分支。
- 运行生成器必须传入 `--contract-file`；生成器会校验合同 `status=approved`、`current_version`、`primary_skill`、`controlled-generation`、实际输出路径和固定三条验证命令，不接受仅凭任意字符串引用的放行。
- 生成项目必须写入 Manifest v2 `.yss/scaffold-generation.json`，记录合同 digest、Target Profile、模板 digest、下游完整 skill tree digest、脚手架父合同与 Router 合同 digest、generator-owned 文件 hash、严格 `generation_policy` 和完成等级；清单缺失或不一致时不得交给后续 Router。
- `first-slice-verified` 只能由 `run_first_slice_verification.mjs` 写入。手工改 Manifest、只生成 Controller、只通过局部模块测试或仅有结构扫描都不能升级完成等级。
- 严禁把领域规则、状态机、权限、事务、复杂查询、错误映射、业务字段或用户可见行为塞进脚手架生成步骤。`./mvnw validate`、输出目录存在或“生成成功”都不等于生命周期批准、架构放行或 `ready-for-agent`。
- 生命周期脚手架生成必须关闭 `--with-example`，不得把 User CRUD 或业务字段当作样板。生成器严格 `initialize-only`：非空目标、`--force`、旧项目迁移和当前模板升级一律 `unsupported`。未来若支持同一 Target Profile 内的模板升级，必须另行设计和批准，当前不预留可执行承诺。
- 脚手架完成后，所有后续生成的后端代码必须回到 `yss-router`，消费批准且版本当前的 Slice Implementation Contract 和对应 YSS skill；业务行为使用 `behavior-tdd`，机械生成才使用 `controlled-generation`。
- `.mvn/settings.xml` 只能通过 `${env.MAVEN_REPO_USERNAME}` 和 `${env.MAVEN_REPO_PASSWORD}` 读取 Maven 仓库凭据；内部仓库构建前由 CI 或本地安全环境注入变量，禁止把 Maven 仓库用户名、明文密码或 Maven 加密密码写入 skill、模板或生成工程。
- `.mvn/maven.config` 必须显式加载项目级 `.mvn/settings.xml` 并激活 `yss-internal`；仓库 URL 来自 `YSS_MAVEN_REPOSITORY_URL`，凭据来自 `MAVEN_REPO_USERNAME` / `MAVEN_REPO_PASSWORD`。预检缺失时先于 Maven 执行阻断，日志必须脱敏。
- Domain POM 不得依赖 YSS DTO/Exception、Web Validation、Swagger 或 Jackson；DTO/Exception/OpenAPI 注解属于 Web。MapStruct 统一 `componentModel="spring"`，父 POM 负责 processor 与 `lombok-mapstruct-binding`。
- 生成工程必须携带 ArchUnit、Maven Enforcer 和 Wrapper checksum；DEBUG 与 MyBatis stdout SQL 只能进入 `application-local.yml`。
- 涉及 API 契约时，先确认 `docs/.scratch/<feature>/api/<feature>.yaml` 中的 OpenAPI Draft / Freeze 状态；不要用脚手架生成结果反向替代产品契约设计。

## 按需读取

- 主脚本：`scripts/generate_scaffold.mjs`
- 推荐的一键生成验证入口：`scripts/generate_and_verify_scaffold.mjs`
- 受控验证器：`scripts/run_scaffold_verification.mjs`
- 首切片验证器：`scripts/run_first_slice_verification.mjs`
- 模板目录：`assets/templates/`
- 分层细化参考：`references/yss-backend-scaffold-parent/` 及其子 skill

## 阶段 7 合同

- 仅在实现仓库/输出目录、`scaffold_status=required` 和批准合同明确时运行。
- 工程骨架属于 `controlled-generation`，必须记录生成器输入、预期文件和 `./mvnw ...` 编译/测试结果；不得将业务状态机、权限、事务或查询逻辑混入生成步骤。
- 生成结果必须包含 `.yss/scaffold-generation.json`，并由验证器回勾该清单；清单与批准合同不一致时阻断。
- `./mvnw validate`、`./mvnw test`、`./mvnw package` 必须由受控工作单元真实执行，并记录每条命令的 `exit_code`、耗时、stdout/stderr 引用和执行时间；只列命令计划、生成器成功或打印输出均视为缺失证据并阻断。
- 生成后按统一 `YSS Skill Execution Result` 返回 changed/evidence files、实际验证结果和新增影响，再由 Router 为业务工作单元重新路由。
