---
status: accepted
owner: ai
review_state: approved
---

# YSS 阶段 7 实现编排与 Router 增强设计

> 日期：2026-07-21
> 仓库身份：`template-source`
> 方法：`grill-with-docs` + `domain-modeling` + `writing-skills` RED / GREEN / REFACTOR
> 范围：定义并落地 `yss-router`、核心 YSS skills、实现合同、执行结果和阶段 7 验证方案。

## 1. 目标

将 `yss-router` 从“技能推荐器”增强为阶段 7 的“实现合同编译器”。它读取冻结的生命周期资产和垂直切片，计算影响面与技能依赖闭包，生成可由 `yss-product-lifecycle` 审查和持久化的 `Slice Implementation Contract` 草案。

职责边界：

| 角色 | 责任 | 不负责 |
|---|---|---|
| `yss-product-lifecycle` | 核验上游门禁、批准并持久化合同、控制 `ready-for-agent` 和阶段状态 | 编造专项实现规范 |
| `yss-router` | 编译合同草案、技能闭包、TDD 模式、证据和验证要求 | 自行批准合同或宣布完成 |
| Matt `implement` / `tdd` | 驱动行为切片和 RED/GREEN/REFACTOR | 取代 YSS 专项规范 |
| YSS 专项 skill | 在合同范围内实现并返回结构化证据 | 修改生命周期门禁或扩大授权范围 |
| 独立 Reviewer | 复核合同符合性、Spec fidelity、YSS 规范和验证证据 | 信任实现者自报结论 |

## 2. 已确认的设计决策

1. 建立统一 `Slice Implementation Contract`，包含 `common/frontend/backend/contract/cross_repo` 子合同。
2. 保留 `Backend Slice Implementation Contract` 的强约束，作为统一合同的 `backend` 子合同。
3. Router 只允许输出 `draft`、`blocked`、`ready-for-lifecycle-review`。
4. 生命周期编排器拥有合同批准、持久化、状态推进和 `ready-for-agent` 裁决权。
5. 核心实现链提升为共享 skills；长尾组件 skills 按需保留平台专属，并由 Router 检查可用性。
6. 核心 YSS skills 统一返回 `YSS Skill Execution Result`；自报 `implemented` 不构成最终通过。
7. Router 为每个工作单元指定 `behavior-tdd` 或 `controlled-generation`，专项 skill 不得自行豁免 TDD。
8. 使用三级机制：切片基线路由、工作单元增量路由、条件触发完整重路由。
9. Router 不得只列技能名；必须生成允许路径、禁止模式、预期证据、实际验证命令和人工审查点。
10. 实现中发现新影响时，先使当前合同相关部分失效，再回到 Router 或更早生命周期阶段。

## 3. RED：当前动态基线失败

两名独立只读 Agent 使用当前未增强 Router 和专项 skills 模拟六个场景，没有修改文件。

| 场景 | 当前实际行为 | RED 结论 |
|---|---|---|
| 端到端后端 CRUD | 路由 `domain-modeling/domain/dto/repository/web-controller` | 遗漏 Application、Alibaba；MapStruct/Lombok 仅靠专项二次触发 |
| 要求完整实现合同 | 只能列技能和产物类别 | 无法可靠生成 allowed paths、真实证据文件、模块化验证命令和 seam |
| UI 页面但高保真原型未确认 | 路由页面、组件、hook、API skills | Router 没有 UI 生命周期边界，存在误放行 |
| 实现中新增 API/schema | 能自然语言退回生命周期 | 无 `new_impacts`、合同失效、重路由或恢复协议 |
| 状态机与脚手架混合 | 专项 skill 自行解释测试 | 无 `behavior-tdd/controlled-generation` 选择，可能把业务行为混入批量生成 |
| 非 Codex Agent 进入实现 | 核心 Router/YSS skills 不可用 | 生命周期共享但阶段 7 实现链断裂 |

其他失败证据：

- `yss-router` 的 CRUD 组合与审查模板不对称：审查要求 Application、MapStruct、Lombok、Alibaba，而路由不要求。
- `implementation-routing-template.md` 比 Router 的输出严格，导致必填字段由 Agent 临场拼接。
- `yss-page-module-development` 不消费批准后的产品设计、正式原型和状态矩阵。
- scaffold Domain/Infrastructure references 广泛推荐 `@Data`，与当前实体/POJO 风险约束存在冲突。
- 核心 skills 没有统一 contract ref/version、changed files、evidence、verification results、deviations 和 new impacts。

## 4. Router 输入合同

```yaml
routing_input:
  schema_version: 1
  slice_id: order-create
  lifecycle:
    parent_ticket_ref:
    slice_ticket_ref:
    spec_ref:
    requirement_freeze_ref:
    prototype_confirmation_ref:
    openapi_freeze_or_no_impact_ref:
    architecture_review_ref:
    data_architecture_ref:
    build_architecture_checklist_ref:
  implementation:
    repositories: []
    branches: []
    scaffold_status: {}
    ci_commands: []
    rollback_points: []
  acceptance:
    behaviors: []
    confirmed_test_seams: []
    human_review_points: []
```

Router 必须按影响面核验输入：

- UI 影响：需求冻结、低保真评审、高保真 HTML、AntD CLI 证据、用户确认。
- API 影响：OpenAPI Freeze；无 API 时必须有 no-impact record。
- 数据影响：数据架构和迁移/索引/查询约束。
- 后端结构影响：工程基线、实现仓库和 Maven Wrapper 命令。
- 跨仓库：仓库、分支、集成验证、发布与回滚顺序。
- 任一相关资产为 `stale`、`missing` 或未批准：Router 输出 `blocked`，指明回退阶段。

## 5. 统一 Slice Implementation Contract

```yaml
slice_contract:
  schema_version: 1
  contract_id: order-create-v1
  contract_version: 1
  slice_id: order-create
  status: draft # draft / blocked / ready-for-lifecycle-review
  compiled_by: yss-router

  lifecycle_refs:
    spec:
    ticket:
    requirement_freeze:
    low_fidelity_review:
    high_fidelity_html:
    antd_cli_evidence:
    prototype_confirmation:
    openapi_freeze_or_no_impact:
    architecture_review:
    data_architecture:
    engineering_baseline:
    build_architecture_checklist:
    implementation_repository:
    frontend_repository:
    backend_repository:
    maven_wrapper:

  readiness:
    blockers: []
    stale_inputs: []
    not_applicable: []

  common:
    impacted_areas: []
    required_skills: []
    optional_skills: []
    unavailable_skills: []
    allowed_write_paths: []
    forbidden_patterns: []
    expected_evidence_files: []
    verification_commands: []
    human_review_points: []
    full_reroute_triggers: []

  frontend:
    status: required # required / not-applicable
    required_skills: []
    approved_prototype_ref:
    state_matrix_ref:
    generated_api_client_ref:
    allowed_write_paths: []
    component_test_seams: []
    e2e_paths: []

  backend:
    status: required
    affected_layers: []
    required_skills: []
    application_boundary:
    transaction_boundary:
    persistence_strategy:
    allowed_write_paths: []
    forbidden_patterns: []
    expected_evidence_files: []
    seam_deferred: []
    verification_commands: []

  contract:
    api_impact: true
    freeze_ref:
    no_api_impact_ref:
    generated_clients: []
    contract_tests: []
    regeneration_commands: []

  cross_repo:
    repositories: []
    delivery_order: []
    integration_verification: []
    rollback_order: []
```

Router 不得输出 `approved`、`ready-for-agent` 或 `completed`。只有生命周期编排器核验真实资产后才能批准并持久化合同。

## 6. 技能依赖闭包

Router 先选择主 skill，再按可观察影响自动补齐强制依赖。

| 主影响 | 主 skills | 强制依赖 |
|---|---|---|
| Domain 行为/状态机 | `yss-domain-modeling`、`yss-domain`、`yss-backend-scaffold-domain` | `alibaba-java-code-style`；POJO 命中时 `lombok` |
| Application 用例/事务 | `yss-backend-scaffold-application` | `mapstruct`、`lombok`、`alibaba-java-code-style` 按对象影响触发 |
| Repository/持久化 | `yss-repository`、`yss-backend-scaffold-infrastructure` | `mapstruct`、`lombok`、`alibaba-java-code-style`；MyBatis 命中时 `yss-mybatis` |
| Web/DTO | `yss-web-controller`、`yss-dto`、`yss-backend-scaffold-web` | `mapstruct`、`lombok`、`alibaba-java-code-style` |
| 页面模块 | `yss-page-module-development` | 按影响增加 `yss-components`、`yss-hook`、`yss-formily`、`api-integration` |
| API 集成 | `api-integration` | 冻结客户端；需要重生成时 `yss-openapi` |

典型端到端后端 CRUD 的闭包必须包含 Application，不得把 `Controller → Domain Gateway` 当作完整主路径。

Router 同时输出不适用项及原因，证明技能是经影响分析裁剪而非遗漏：

```yaml
not_applicable_skills:
  yss-mybatis: no-persistence-impact
  yss-openapi: frozen-client-reused
  yss-audit-log: no-audit-event
```

## 7. 核心共享技能与长尾平台技能

第一批提升为 `.agents/skills` 共享权威内容：

```text
yss-router
yss-domain-modeling
yss-domain
yss-backend-scaffold-application
yss-backend-scaffold-domain
yss-backend-scaffold-infrastructure
yss-backend-scaffold-web
yss-repository
yss-mybatis
yss-web-controller
yss-dto
yss-page-module-development
api-integration
mapstruct
lombok
alibaba-java-code-style
```

长尾组件 skills 暂按需保留平台专属。Router 必须检查技能可用性：

```yaml
skill_availability:
  yss-cache:
    status: available # available / unavailable
    provider: codex
    fallback: blocked # blocked / approved-equivalent
```

不可用时不得静默跳过或用通用知识冒充 YSS 规范。使用等价规范必须由生命周期编排器批准并记录证据。

## 8. 工作单元与 TDD 模式

Router 必须为每个工作单元选择一种模式。

### 8.1 `behavior-tdd`

适用于领域规则、状态机、事务行为、复杂查询、权限/错误映射、页面交互和用户可见状态：

```text
验收行为 → 公开测试 seam → 失败测试 → 最小 YSS 实现 → 转绿 → 合同回勾
```

### 8.2 `controlled-generation`

只适用于机械脚手架、DTO/PO 样板、MapStruct、冻结 OpenAPI client 和配置：

```yaml
tdd:
  mode: controlled-generation
  exception_reason: mechanical-scaffold
  generator:
  generator_inputs: []
  expected_files: []
  verification_commands: []
  behavior_tests_after_generation: []
```

生成器一旦包含状态变化、权限、业务过滤、事务或错误映射，相关工作单元必须拆出并改为 `behavior-tdd`。

## 9. 三级路由算法

### 9.1 切片基线路由

实现前运行，生成完整合同、技能闭包、前后端/契约/跨仓库子合同、验证和审查策略。

### 9.2 工作单元增量路由

每个 RED/GREEN 工作单元开始前生成：

```yaml
work_unit:
  id:
  behavior:
  primary_skill:
  supporting_skills: []
  tdd_mode: behavior-tdd
  allowed_write_paths: []
  expected_evidence: []
  verification_commands: []
```

### 9.3 完整重路由触发

- 新 API/schema、权限、状态机或数据模型影响。
- 新写入目录、实现仓库或 YSS skill。
- 原 `not-applicable` 被推翻。
- `drift`、`violation` 或新安全/迁移风险。
- `controlled-generation` 扩张为业务行为。
- 测试 seam、验证命令或发布顺序发生实质变化。

触发后当前合同标记 `stale`，相关工作单元暂停；不得先完成代码再补路由记录。

## 10. YSS Skill Execution Result

所有核心专项 skills 必须返回统一结果：

```yaml
execution_result:
  schema_version: 1
  skill: yss-repository
  slice_id: order-create
  work_unit_id: persist-order
  status: implemented # implemented / seam-deferred / drift / violation / not-applicable
  consumed_contract:
    contract_ref:
    contract_version:
  changed_files: []
  evidence_files: []
  verification_results:
    - command: ./mvnw -pl order-infrastructure -am test
      result: passed
      executed_at:
  constraint_results: []
  seam_deferred: []
  deviations: []
  new_impacts: []
```

验收规则：

- Router 校验 changed files 是否位于 allowed paths。
- expected evidence 缺失时不得汇总为 implemented。
- 只列计划命令、不含实际结果和时间不算验证。
- `new_impacts` 非空时暂停并判断增量/完整重路由或生命周期回退。
- `drift` 触发 Architecture Re-check；`violation` 阻断 build。
- 生命周期编排器和独立 Reviewer 不得直接信任执行者自报状态。

## 11. 核心专项技能改造要求

| 技能 | 必须补齐 |
|---|---|
| `yss-domain` | 消费合同/工作单元；状态机默认 `behavior-tdd`；输出领域行为与测试证据 |
| `yss-backend-scaffold-application` | 明确用例、事务边界、Application 测试和 MapStruct/Lombok 条件 |
| `yss-repository` | 数据架构前置；复杂查询 `behavior-tdd`；生成骨架才允许 controlled generation |
| `yss-web-controller` / `yss-dto` | OpenAPI Freeze、权限/错误映射、WebConvertor 和契约测试证据 |
| `yss-page-module-development` | 消费批准原型/状态矩阵；覆盖 loading/empty/error/permission；组件/E2E seam |
| `api-integration` | 只消费冻结客户端；禁止以半成品 backend 作为已实现 source of truth |
| scaffold references | 收敛 `@Data` 使用，遵守共享 `lombok` 风险规范；标明生成与业务实现边界 |

每个 skill 只声明自己的输入、影响区、禁止模式、验证和统一返回协议；不得复制完整生命周期规则。

## 12. 模板与审查闭环

需要同步：

- `implementation-routing-template.md`：升级为统一切片合同。
- `vertical-slice-ticket-template.md`：引用合同 ID/version、工作单元和重路由状态。
- `build-architecture-checklist-template.md`：绑定统一合同和执行结果。
- `review-report-template.md`：检查输入合同、路径、证据、TDD 模式和新影响。
- `yss-product-lifecycle` Matt/YSS adapter：消费 Router 草案和执行结果。

审查条件必须与 Router 生成条件对称，避免“审查时才首次要求 Application/MapStruct/Lombok/Alibaba”。

## 13. GREEN 目标与压力场景

| 场景 | GREEN 目标 |
|---|---|
| 后端 CRUD | 技能闭包包含 Application、MapStruct/Lombok/Alibaba 条件，并生成完整 Backend 子合同 |
| UI 未确认 | Router 输出 `blocked`，回阶段 4，不调用页面实现 skill |
| 数据架构缺失 | Repository 路由阻断，不能生成持久化工作单元 |
| API 实现中变化 | 合同 `stale`，输出 `new_impacts`，回生命周期 Draft/Review/Freeze |
| 状态机混入生成器 | 状态机拆为 `behavior-tdd`，生成器仅处理机械骨架 |
| 非 Codex Agent | 可加载共享核心链；长尾不可用时显式阻断 |
| changed file 越界 | Router 汇总为 `violation` |
| 缺实际验证时间 | 执行结果不被接受为 fresh evidence |
| 任一专项 skill 返回 drift | 触发 Architecture Re-check，不宣布完成 |
| 新模块 | Spec Delta 保持 `not-applicable`，不得因 Router 重路由错误激活 |

后续自动化应解析机器合同并执行正反断言，不能只检查关键词存在。

## 14. 实施顺序

1. 为 Router 编写机器可读 contract schema、依赖闭包和路由 fixtures。
2. 修改 `yss-router` 主 skill，只保留触发、输入、编译循环和输出契约；重型矩阵下沉 references。
3. 更新四个实现/审查模板，建立统一合同 ID/version 和执行结果引用。
4. 提升第一批核心 skills 到共享权威目录并刷新投影/锁文件。
5. 逐个核心 skill 接入 Execution Result；每个 skill 单独完成 RED/GREEN/REFACTOR 后再处理下一个。
6. 修订 scaffold references 的 `@Data`、TDD 模式和证据冲突。
7. 增强验证脚本，执行依赖闭包、门禁、TDD 模式、路径、证据和重路由正反场景。
8. 独立审查并执行 `scripts/verify-template`；外部 CLI 未集成前不得声称模板可发布。

## 15. 当前状态

- 设计状态：用户已确认，`approved`。
- Router/核心技能修改：未开始。
- RED 动态基线：已完成。
- GREEN/REFACTOR：待后续实现。
- 独立审查：设计文档待人工 checkpoint；后续 skill 修改必须独立审查。
