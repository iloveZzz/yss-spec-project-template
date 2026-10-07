---
name: yss-ddd-scaffold-generator
description: 用于生成完整的 YSS DDD 多模块后端脚手架。当用户要求从零创建符合 YSS 规范的 Domain、Application、Infrastructure、Adapter、Bootstrap 工程骨架时调用。
---

功能包根只从 `.template-spec/agents/issue-tracker.md` 的 `tracker.root` 读取；本文 `.work/` 路径是新项目示例，已有项目沿用已配置的根。

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

## Spring Boot / Java 平台选择

核验新工程平台时读取 [平台选择与证据](references/platform-selection.md)。只消费生命周期经 `gate.backend-architecture-platform-approved` 取得的真实用户确认和当前 `platform_configuration` v2；以 `scripts/backend-platforms` 的已验证可选组合为准。生成器不提问、不默认、不降级；缺证据即 `blocked`。

## 优先流程

合同与输出范围通过后，运行生成器前读取 [受控生成与验证](references/generation-workflow.md)。入口为 `scripts/generate_and_verify_scaffold.mjs`；根 `./mvnw validate/test/package` 必须真实执行并全部成功，仅获得 `empty-scaffold-verified`。首切片等级另由 `run_first_slice_verification.mjs` 核验。

## 推荐命令

输入和合同已核验后，按 [受控生成命令示例](references/command-examples.md) 组装当前参数；示例值不授予生成或覆盖权限。

## 生成结果应包含

- 父工程 POM
- `*-domain`
- `*-application`
- `*-infrastructure`
- `*-adapter`
- `*-bootstrap`
- `*-bootstrap` 下可被 Spring Boot Maven Plugin 发现的机械 `*Application` 启动入口
- 基础配置、机械模板、构建脚本

生成前预检与生成后内容验收须读取 [工程内容检查](references/engineering-checks.md)，并消费既有 [工程基线](references/engineering-baseline.md)。凭据仅从安全环境注入，日志须脱敏。

## 使用约束

- 先在生命周期批准的脚手架受控生成合同下生成骨架，再做业务化定制；不要直接把脚手架当最终代码交付。
- 永不生成 `User CRUD` 示例；`--with-example` 已禁用，业务代码必须按批准的 Slice Implementation Contract 逐切片实现。
- 输出目录必须显式指定，生成器严格 `initialize-only`；目标工程目录必须不存在。已有工程、非空目标、`--force`、旧项目迁移和当前模板升级均返回 `unsupported`。旧项目继续按原工程维护；现代化或未来同一 Target Profile 模板升级须另行设计、批准，当前不提供该执行能力。
- Harness 内多项目使用 `apps/backend/<project>/`，`apps/backend/` 只作输出父容器；`app/backend/`、`app/frontend/` 及其子路径一律拒绝。
- `git-submodule` gitlink、空挂载点和 detached HEAD 不作为普通目录覆盖或 rename，`--force` 不解除边界。`--output-dir` 指向 detached HEAD 子仓时不得 mkdir、staging 或生成；工程准备须先初始化 submodule 并在子仓附加分支工作树内生成。维护生成器时读取 [守卫顺序](references/generator-maintenance.md)。
- 生成工程基线由本 Skill 的 `references/engineering-baseline.md` 持有并绑定摘要，不是独立 Skill。后续实现的专项路由见 [分层 Skill 路由](references/layer-skill-routing.md)，由实现合同编译器按批准切片选择实际命中的技能。
- 生成后的后端工程必须使用项目根目录 `./mvnw ...` 执行构建、测试、运行和 CI 验证；不得在 README、实施记录、Ticket、Review 或 Release 中默认写裸 `mvn ...`。既有仓库确实无法使用 wrapper 时，必须记录受控例外。
- 原型确认后，`scaffold_status=required` 才能进入本 skill；本 skill 的生成边界是工程结构、POM、配置、Wrapper 和机械模板，不是业务实现。
- 脚手架合同必须携带 `contract_id`、`contract_version`、实现合同编译器 draft 引用、生命周期批准引用、持久化引用、当前版本、允许写路径、预期证据文件和验证命令；字段缺失或版本过期时阻断。
- 新脚手架只接受统一 Project Scaffold Contract schema v4，并必须以原始字节摘要绑定批准且当前的 Technical Design、Data Architecture Decision v1、API Contract Decision（新建 v2；历史 v1 只读兼容，准备与迁移见 `.template-spec/process/contract-reading.md`） 和真实工程合同批准记录。API `required` 必须闭包绑定同一 OpenAPI YAML 字节的 Validation、独立 Review、Freeze 与工程批准；`not-applicable` 必须绑定评估、明确原因和证据且禁止空占位资产。历史 Manifest 只读审计见 [历史兼容边界](references/generator-maintenance.md)，不得用于新生成。
- DDD 固定 `target-domain-model`、`mybatis-plus`、H2 验证、`web` DTO、`yss-internal`；平台与 Validation 命名空间由共享清单约束。普通 MyBatis、独立 client module、client-in-domain 和其他旧架构仍为 `unsupported`。
- 运行生成器必须传入 `--contract-file`；生成器会校验合同 `status=approved`、`current_version`、`primary_skill`、`controlled-generation`、实际输出路径和固定三条验证命令，不接受仅凭任意字符串引用的放行。
- 生成项目必须写入 Manifest v4 `.yss/scaffold-generation.json`，记录技术、数据与 API 设计门禁、架构选择及 digest、生成器、合同 digest、Target Profile、模块闭包、模板 digest、下游完整 当前合同 freshness、generator-owned 文件 hash、严格 `generation_policy` 和完成等级；清单缺失或不一致时不得交给后续 实现合同编译器。
- `first-slice-verified` 只能由 `run_first_slice_verification.mjs` 写入。手工改 Manifest、只生成 Controller、只通过局部模块测试或仅有结构扫描都不能升级完成等级。
- 严禁把领域规则、状态机、权限、事务、复杂查询、错误映射、业务字段或用户可见行为塞进脚手架生成步骤。`./mvnw validate`、输出目录存在或“生成成功”都不等于生命周期批准、架构放行或 `ready-for-agent`。
- 脚手架完成后，所有后续后端代码必须回到 `yss-implementation-contract-compiler`，消费批准且版本当前的 Slice Implementation Contract 和适用 YSS skill；业务行为使用 `behavior-tdd`，机械生成才使用 `controlled-generation`。
- 涉及 API 契约时，先确认 `.work/<feature>/api/<feature>.yaml` 中的 OpenAPI Draft / Freeze 状态；不要用脚手架生成结果反向替代产品契约设计。

## 按需读取

- 主脚本：`scripts/generate_scaffold.mjs`
- 推荐的一键生成验证入口：`scripts/generate_and_verify_scaffold.mjs`
- 受控验证器：`scripts/run_scaffold_verification.mjs`
- 首切片验证器：`scripts/run_first_slice_verification.mjs`
- 模板目录：`assets/templates/`
- Parent 工程约束使用内部 `references/engineering-baseline.md`；生成后的分层实现路由见 `references/layer-skill-routing.md`。旧工程基线合同必须迁移为 `readiness.contracts.engineering_baseline` 后重新验证。

## 阶段 7 合同

- 仅在实现仓库/输出目录、`scaffold_status=required` 和批准合同明确时运行。
- 工程骨架属于 `controlled-generation`，记录生成器输入、预期文件和实际编译/测试结果。
- 生成结果必须包含 `.yss/scaffold-generation.json`，并由验证器回勾该清单；清单与批准合同不一致时阻断。
- 三条根 Wrapper 验证必须按 [受控生成与验证](references/generation-workflow.md) 真实执行，逐条记录 `exit_code`、耗时、stdout/stderr 引用和执行时间；计划、生成器成功或打印输出不构成执行证据，缺失即阻断。
- 生成后按统一 `YSS Skill Execution Result` 返回 changed/evidence files、实际验证结果和新增影响，再由 实现合同编译器 为业务工作单元重新路由。
