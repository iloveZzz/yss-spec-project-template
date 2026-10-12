# YSS 生命周期产物与门禁地图

本文是模板仓库与模板实例共享的生命周期派生阅读视图。结构化事实源是 `.template-spec/process/lifecycle-registry.yaml`；本文解释主阶段、条件门禁、必须持久化的产物和退出标准。具体项目只有在触发条件命中时才执行对应门禁。

<!-- lifecycle-registry:structure:start -->
> 此结构区由 `.template-spec/process/lifecycle-registry.yaml` 生成。当前为 `active` 模式：正式门禁、内部检查和派生文档共同消费此事实源。

## 1. 主阶段

| 稳定 ID | 阶段 | 目标 | 退出标准 |
|---|---|---|---|
| `stage.entry-triage` | 入口分诊 | 确认仓库身份、问题范围和影响面。 | yss-project.yaml 合法，影响面和最近可信阶段可解释。 |
| `stage.plan` | Plan（战略规划） | 确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。 | 命中的业务边界与阶段决策检查通过，用户统一批准当前 Plan；关键问题已解决，非关键项有责任人、解决时点和接收方；下游可进入 Spec，不代表可实现。 |
| `stage.spec-architecture` | Spec / 功能架构 | 固化解决方案和功能边界。 | Spec 基线和功能边界可审查。 |
| `stage.product-design` | 产品设计 | 在存在产品设计影响时校准页面流和状态。 | 命中的设计门禁通过；未命中项记录 not-applicable 及原因。 |
| `stage.system-data-engineering` | 系统 / 数据架构与工程契约 | 固化系统、数据、工程基线和 API 契约。 | 受影响工程契约冻结或记录无 API 影响；required 脚手架证据齐全。 |
| `stage.ticket-formalization` | Ticket 正式化 | 在既有功能追踪入口下，将冻结范围正式化为垂直切片。 | 工作单元窄、依赖清晰、验收和测试 seam 可执行。 |
| `stage.vertical-slice-implementation` | 垂直切片实现 | 以批准合同驱动 TDD 实现和跨仓库协作。 | 允许写路径、禁止模式、证据和验证命令全部满足。 |
| `stage.verification-release-retrospective` | 验证 / 发布 / 复盘 | 完成 fresh verification、发布和回顾。 | 所有命中门禁通过，人工审查点已完成，checkpoint 可追溯。 |

## 2. 生命周期对象

门禁是需要裁决的审查点；产物、工作单元和证据不是门禁的同义词。未命中条件的门禁记录 `not-applicable` 及原因，不生成空文档。

### 2.1 条件门禁

| 稳定 ID | 门禁 | 所属阶段 | 触发条件 | 前置门禁 / 检查 | 必须留下的证据 |
|---|---|---|---|---|---|
| `gate.plan-approved` | Plan 批准 | `stage.plan` | Plan 结论进入 Spec；汇总业务边界与阶段决策检查，核验当前规划范围的原始批准。 | `check.domain-strategy-approved`、`check.stage-decision-package-approved` | `evidence.approval-record` |
| `gate.spec-baseline-approved` | Spec 基线批准 | `stage.spec-architecture` | 新功能、行为变化或范围扩大进入 Spec 基线。 | 无 | `evidence.approval-record` |
| `gate.product-design-approved` | 产品设计批准 | `stage.product-design` | 存在产品设计影响；原型评审与交付物验证通过后，由当前真实负责人确认体验取舍。 | `check.prototype-reviewed`、`check.prototype-verified` | `evidence.prototype-confirmation` |
| `gate.strategic-design-handoff-approved` | 业务方案交接验收 | `stage.ticket-formalization` | 业务方案设计已完成，需要形成完整、可验证且可接收的交付包。 | `gate.plan-approved`、`gate.spec-baseline-approved`、`gate.product-design-approved` | `evidence.strategic-design-handoff`、`evidence.approval-record`、`evidence.fresh-verification` |

### 内部检查与自动前置条件

检查失败仍阻断。专业审查记录作为聚合门禁证据，不单独请求用户批准；自动检查通过不授权实现或发布。

| 稳定 ID | 检查 | 阶段 | 触发条件 |
|---|---|---|---|
| `check.repository-identity-valid` | 仓库身份校验 | `stage.entry-triage` | 每次进入流程。 |
| `check.domain-strategy-approved` | 业务边界与规则评审 | `stage.plan` | 需要确定业务板块、责任区、统一词汇、协作关系或关键规则。 |
| `check.stage-decision-package-approved` | 方案决策包评审 | `stage.plan` | Plan 到 Spec 入口需要稳定、可追溯的方案决策合同。 |
| `check.prototype-reviewed` | 原型评审 | `stage.product-design` | 命中产品设计影响，需要独立评审页面、流程、状态和异常路径。 |
| `check.prototype-verified` | 原型交付物验证 | `stage.product-design` | 产品设计影响需要通过 H1/H2 原型进行视觉或流程校准。 |

### 2.2 生命周期产物

| 稳定 ID | 产物 | 所属阶段 | 触发条件 |
|---|---|---|---|
| `artifact.impact-assessment` | 影响面分析 | `stage.entry-triage` | 每次变更。 |
| `artifact.domain-strategy` | 业务边界与规则设计 | `stage.plan` | 新产品/模块、跨责任区协作、业务词汇冲突、责任边界或关键规则变化。 |
| `artifact.stage-decision-package` | 方案决策包 | `stage.plan` | Plan 到 Spec 入口需要结构化上游决策。 |
| `artifact.strategic-design-handoff` | 业务方案交接包 | `stage.ticket-formalization` | 业务方案设计 Harness 完成业务边界与规则设计、Spec、页面原型和业务级 Ticket，需要交付下游研发团队。 |
| `artifact.plan-record` | Plan 记录 | `stage.plan` | 新问题或边界不清。 |
| `artifact.spec` | Spec | `stage.spec-architecture` | 新功能、行为变化或范围扩大。 |
| `artifact.product-overview` | 产品总体设计 | `stage.spec-architecture` | 进入 Spec 基线。 |
| `artifact.functional-architecture` | 功能架构 | `stage.spec-architecture` | 新模块或跨边界变化。 |
| `artifact.interaction-spec` | 交互说明 | `stage.product-design` | 命中产品设计影响。 |
| `artifact.low-fidelity-prototype` | 低保真原型 | `stage.product-design` | 命中产品设计影响。 |
| `artifact.state-matrix` | 状态矩阵 | `stage.product-design` | 存在状态流转、异常或恢复。 |
| `artifact.high-fidelity-html-prototype` | 高保真 HTML 原型 | `stage.product-design` | 需要视觉与交互校准。 |
| `artifact.prototype-review` | 原型评审记录 | `stage.product-design` | 命中 check.prototype-reviewed。 |
| `artifact.prototype-confirmation` | 原型确认记录 | `stage.product-design` | 命中 gate.product-design-approved。 |
| `artifact.openapi-draft` | OpenAPI Draft | `stage.system-data-engineering` | 有 API 影响。 |
| `artifact.openapi-freeze-record` | OpenAPI Freeze 记录 | `stage.system-data-engineering` | API 进入实现。 |
| `artifact.data-architecture` | 数据架构 | `stage.system-data-engineering` | 数据模型、存储或一致性变化。 |
| `artifact.engineering-baseline` | 工程基线记录 | `stage.system-data-engineering` | 后端、前端或高风险工程变化。 |
| `artifact.architecture-review` | 架构审查记录 | `stage.system-data-engineering` | 高风险或跨边界变化。 |
| `artifact.tactical-design` | DDD 战术设计 | `stage.system-data-engineering` | 聚合边界、状态机、一致性或持久化映射复杂到无法在系统概要设计的 Tactical DDD Check 中清楚表达。 |
| `artifact.spec-delta` | Spec Delta | `stage.spec-architecture` | 已有冻结 Spec 的高风险行为变化。 |
| `artifact.parent-ticket` | 功能父 Ticket | `stage.plan` | 每个功能首次进入 Plan 或最近可信接入阶段时建立，正式化时复用；Design profile 不创建工程父 Ticket。 |
| `artifact.vertical-slice-ticket` | 垂直切片 Ticket | `stage.ticket-formalization` | 进入实现前。 |
| `artifact.slice-implementation-contract` | Slice Implementation Contract | `stage.ticket-formalization` | Agent 进入实现。 |
| `artifact.frontend-implementation-plan` | 前端实现还原计划 | `stage.ticket-formalization` | UI 影响切片提升 ready-for-agent 前。 |
| `artifact.frontend-implementation-verification` | 前端实现还原验证记录 | `stage.verification-release-retrospective` | UI 影响切片完成实现并准备合并、发布或阶段完成。 |
| `artifact.business-ticket-set` | 业务级 Ticket 集 | `stage.ticket-formalization` | 产品角色需要将已批准的 Spec 和原型拆成业务能力、用户行为和验收级 Ticket。 |
| `artifact.retrospective` | 复盘记录 | `stage.verification-release-retrospective` | 发布后或阶段性完成后满足复盘触发条件。 |

### 2.3 执行证据

| 稳定 ID | 证据 | 说明 |
|---|---|---|
| `evidence.context-reconciliation` | Context Reconciliation 证据 | 工作单元在批准或流转前对根目录唯一 CONTEXT.md 的稳定术语回写、作用域解析和双摘要核对结果；不新增门禁。 |
| `evidence.impact-assessment` | 影响面分析记录 | 受影响仓库、资产、风险与最近可信阶段。 |
| `evidence.domain-strategy-review` | 业务边界与规则评审证据 | 业务板块、业务责任区、统一业务词汇、协作与交接关系、关键场景和不可违反规则的结构化评审结果。 |
| `evidence.tactical-design-review` | DDD 战术设计评审证据 | 聚合、Entity、Value Object、不变量、状态机、一致性、Gateway 与 API 隔离的结构化评审结果。 |
| `evidence.stage-decision-package` | 阶段决策包验证证据 | 阶段决策包的 Schema、引用、语义一致性、影响传播和下游消费验证结果。 |
| `evidence.strategic-design-handoff` | 业务方案交接包验证证据 | 业务方案交接包的来源 digest、业务级 Ticket、研发待决问题和交付完整性验证结果。 |
| `evidence.maintenance-intensity-checkpoint` | 模板维护强度 checkpoint | 当前 template-source 按 maintenance-intensity.yaml 的 L1 / L2 分级，记录触发项、最低验证证据、review 模式和升级依据。 |
| `evidence.repository-identity-check` | 仓库身份校验结果 | yss-project.yaml 的合法性与 repository_mode 裁决。 |
| `evidence.approval-record` | 人工批准记录 | 对需要人工批准的 Spec、设计、契约或发布裁决的可追溯记录。 |
| `evidence.design-review-result` | 设计审查结果 | API、架构或产品设计审查意见及处理结果。 |
| `evidence.prototype-review-result` | 原型评审结果 | 低保真页面、流程、状态与 API 反推的独立评审结论和阻断项。 |
| `evidence.antd-cli-validation` | Ant Design CLI 校验证据 | 设计语言、组件、demo、token、semantic 与 lint 的实际 CLI/目标版本和可读输出引用。 |
| `evidence.browser-prototype-verification` | 浏览器原型验证证据 | 高保真原型的非空渲染、主流程、异常状态、视口和控制台验证记录。 |
| `evidence.prototype-confirmation` | 原型用户确认记录 | 高保真原型、验证清单和进入下游阶段范围的人工确认结论。 |
| `evidence.openapi-draft-review` | OpenAPI Draft 审查记录 | P0、错误、分页、幂等和契约测试审查记录。 |
| `evidence.contract-approval` | Slice 合同批准记录 | 生命周期编排器批准且已持久化的当前版本合同引用。 |
| `evidence.yss-skill-execution-result` | YSS Skill Execution Result | 专项 skill 的合同版本、写入、验证、延期 seam 与偏离证据。 |
| `evidence.frontend-implementation-verification` | 前端实现还原验证证据 | UI 实现相对冻结原型和 Spec 的桌面/窄屏视觉、状态、交互、控制台与 pnpm 验证记录。 |
| `evidence.fresh-verification` | Fresh Verification 记录 | 本轮实际执行的验证命令、结果和时间。 |
| `evidence.checkpoint-and-rollback` | Checkpoint 与回滚点 | 可追溯的变更边界、发布记录和恢复动作。 |
<!-- lifecycle-registry:structure:end -->

完成结论必须同时包含批准的 Slice Implementation Contract 与 YSS Skill Execution Result（若进入实现阶段）。

安全 / 权限不形成独立门禁。只有需求或冻结资产明确改变相关业务行为时，才把它写入普通产物，并按实际 UI、API、Backend、Data、High-risk 影响使用上表既有门禁。

## 3. 退出与 checkpoint

阶段退出以“当前命中的门禁已通过、阻塞边已清除、证据可读、下一阶段入口明确”为准。连续推进时集中记录阶段因果、Ticket 同步状态、验证证据、风险、人工审查点和 Git checkpoint；不把单个阶段的口头汇报当作完成证明。
