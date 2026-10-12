# YSS 生命周期产物与门禁地图

本文是模板仓库与模板实例共享的生命周期派生阅读视图。结构化事实源是 `.template-spec/process/lifecycle-registry.yaml`；本文解释主阶段、条件门禁、必须持久化的产物和退出标准。具体项目只有在触发条件命中时才执行对应门禁。

<!-- lifecycle-registry:structure:start -->
> 此结构区由 `.template-spec/process/lifecycle-registry.yaml` 生成。当前为 `active` 模式：它校验结构和派生文档，不改变运行时状态 schema 或人工批准语义。

## 1. 主阶段

| 稳定 ID | 阶段 | 目标 | 退出标准 |
|---|---|---|---|
| `stage.harness-entry` | Harness 入口 | 校验仓库身份、上游输入、影响面和实现仓库上下文。 | 上游输入版本当前，影响面、项目根、分支、写入范围和验证命令可解释。 |
| `stage.slice-contract` | Slice Contract | 将当前前端工程设计、条件化后端交付和冻结契约编译为前端垂直切片实现合同。 | 合同版本当前、四个角色分区完整、写路径和验证命令明确，且就绪公式满足。 |
| `stage.slice-implementation` | 垂直切片实现 | 由前端、后端和测试 Agent 按同一合同并行实现和验证。 | 行为实现、测试证据、契约一致性和写入边界均满足合同。 |
| `stage.verification` | 独立验证 | 由测试 Agent 以独立执行态完成 Fresh Verification 和合并前复核。 | 所有命中门禁通过，阻塞信号清空，证据可读且 checkpoint 可追溯。 |
| `stage.frontend-engineering-design` | 前端工程设计 | 联合输入通过后定义组件、状态管理、API 消费和前端测试边界。 | 前端实现计划可审阅；本地无领域影响已记录 not-applicable，新领域问题回交上游。 |
| `stage.plan` | Plan（战略规划） | 确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。 | 命中的战略与阶段决策检查通过，用户统一批准当前 Plan；影响业务边界、关键规则或 MVP 的问题已解决，其他未决项有责任人和解决时点；下游可进入 Spec，不代表可实现。 |
| `stage.spec-architecture` | Spec / 功能架构 | 固化解决方案和功能边界。 | Spec 基线和功能边界可审查。 |
| `stage.product-design` | 产品设计 | 在存在产品设计影响时校准页面流和状态。 | 命中的设计门禁通过；未命中项记录 not-applicable 及原因。 |

## 2. 生命周期对象

门禁是需要裁决的审查点；产物、工作单元和证据不是门禁的同义词。未命中条件的门禁记录 `not-applicable` 及原因，不生成空文档。

### 2.1 条件门禁

| 稳定 ID | 门禁 | 所属阶段 | 触发条件 | 前置门禁 | 必须留下的证据 |
|---|---|---|---|---|---|
| `gate.frontend-delivery-inputs-verified` | 前端联合输入核验 | `stage.frontend-engineering-design` | 专职前端 profile 或显式 frontend_delivery 绑定的任务启动、恢复、合同编译、实现和验证；实际执行 scripts/verify-frontend-delivery，输入就绪不等于实现获批。 | 无 | `evidence.fresh-verification` |
| `gate.repository-identity-valid` | 仓库身份有效 | `stage.harness-entry` | 每次进入 Harness。 | 无 | `evidence.repository-identity-check` |
| `gate.high-risk-architecture-confirmed` | 高风险架构确认 | `stage.frontend-engineering-design` | 存在不可逆或跨边界的前端架构取舍。 | 无 | `evidence.architecture-decision`、`evidence.approval-record` |
| `gate.slice-contract-approved` | Slice Contract 批准 | `stage.slice-contract` | 任一 Agent 进入切片实现前。 | `check.design-reviewed` | `evidence.contract-approval` |
| `gate.slice-ready-for-agent` | 切片实现就绪 | `stage.slice-contract` | Slice Contract 满足完整就绪公式。 | 无 | `evidence.contract-approval` |
| `gate.openapi-freeze-confirmed` | OpenAPI Freeze 确认 | `stage.slice-contract` | 切片有 API 影响且契约进入实现。 | 无 | `evidence.approval-record` |
| `gate.fresh-verification-passed` | Fresh Verification 通过 | `stage.verification` | 实现完成并准备进入合并前复核。 | 无 | `evidence.fresh-verification`、`evidence.test-verification` |
| `gate.merge-approved` | 合并批准 | `stage.verification` | 切片完成合并前裁决。 | 无 | `evidence.approval-record`、`evidence.checkpoint-and-rollback` |
| `gate.plan-approved` | Plan 批准 | `stage.plan` | Plan 结论进入 Spec；汇总战略检查，核验当前规划范围的原始批准或有效授权延续。 | `check.domain-strategy-approved`、`check.stage-decision-package-approved` | `evidence.approval-record` |
| `gate.spec-baseline-approved` | Spec 基线批准 | `stage.spec-architecture` | 新功能、行为变化或范围扩大进入 Spec 基线；已授权范围内细化复用当前有效授权，实质变化重新决定。 | 无 | `evidence.approval-record` |
| `gate.strategic-design-handoff-approved` | 业务方案交接验收 | `stage.product-design` | 明确绑定外部 Backend 或 Frontend 实现消费者；Design 仅消费 SpecBaseline，本地综合研发直接消费资产时不适用。 | `gate.plan-approved`、`gate.spec-baseline-approved`、`gate.product-design-approved` | `evidence.strategic-design-handoff`、`evidence.approval-record`、`evidence.fresh-verification` |
| `gate.product-design-approved` | 产品设计批准 | `stage.product-design` | 存在产品设计影响；独立原型评审与交付物验证通过后核验原批准或授权延续，新增体验取舍由用户决定。 | `check.prototype-reviewed`、`check.prototype-verified` | `evidence.prototype-confirmation` |

### 2.1.1 内部专业检查

| 稳定 ID | 检查 | 所属阶段 | 触发条件 | 必须留下的证据 |
|---|---|---|---|---|
| `check.frontend-implementation-verified` | 前端实现还原验证 | `stage.verification` | UI 影响切片完成实现并准备合并、发布或阶段完成。 | `evidence.frontend-implementation-verification` |
| `check.design-reviewed` | Slice 工程设计独立审查 | `stage.slice-contract` | 当前编译并持久化的 Slice v3 在批准实施前；独立专业审查绑定当前合同 ID、版本、原字节摘要与审查主体，不复用旧工程设计批准。 | `evidence.contract-approval`、`evidence.approval-record` |
| `check.domain-strategy-approved` | 业务边界与规则评审 | `stage.plan` | 存在 DDD 战略设计影响或需要确定领域边界、统一语言和核心规则。 | `evidence.domain-strategy-review`、`evidence.approval-record` |
| `check.stage-decision-package-approved` | 阶段决策包评审 | `stage.plan` | Plan 到 Spec 入口需要稳定的阶段决策合同。 | `evidence.stage-decision-package`、`evidence.approval-record` |
| `check.prototype-reviewed` | 原型评审 | `stage.product-design` | 命中产品设计影响，且低保真页面、流程、状态或 API 反推需要独立评审。 | `evidence.prototype-review-result` |
| `check.prototype-verified` | 原型交付物验证 | `stage.product-design` | 产品设计影响需要通过 H1/H2 原型交付物进行视觉或流程校准；真实组件验证留到前端实现阶段。 | `evidence.prototype-profile-decision`、`evidence.prototype-deliverable-verification` |

### 2.2 生命周期产物

| 稳定 ID | 产物 | 所属阶段 | 触发条件 |
|---|---|---|---|
| `artifact.frontend-implementation-verification` | 前端实现还原验证记录 | `stage.verification` | UI 影响切片完成实现并准备合并、发布或阶段完成。 |
| `artifact.impact-assessment` | 影响面分析 | `stage.harness-entry` | 每次进入 Harness。 |
| `artifact.upstream-inputs` | 上游输入包 | `stage.harness-entry` | 进入前端工程设计前。 |
| `artifact.frontend-engineering-design` | 前端工程设计 | `stage.frontend-engineering-design` | 存在 UI 或前端工程影响。 |
| `artifact.api-boundary` | API 边界 | `stage.slice-contract` | 存在 API 影响。 |
| `artifact.openapi-draft` | OpenAPI Draft | `stage.slice-contract` | 存在 API 影响且需要进入 Freeze 审查。 |
| `artifact.data-architecture` | 数据架构 | `stage.slice-contract` | 存在数据模型、存储或一致性影响。 |
| `artifact.slice-implementation-contract` | Slice Implementation Contract | `stage.slice-contract` | 任一 Agent 进入实现。 |
| `artifact.frontend-implementation-plan` | 前端实现计划 | `stage.slice-contract` | 存在 UI 影响。 |
| `artifact.test-strategy` | 测试策略 | `stage.slice-contract` | 每个行为切片。 |
| `artifact.test-seams` | 测试 seam 与 fixture | `stage.slice-contract` | 进入实现前。 |
| `artifact.fresh-verification` | Fresh Verification | `stage.verification` | 实现完成后。 |
| `artifact.checkpoint` | Git Checkpoint | `stage.verification` | 合并前或发生阻塞 / 责任变化时。 |
| `artifact.business-ticket-set` | 上游业务 Ticket 集 | `stage.harness-entry` | 只读消费已批准战略来源，核验业务 Ticket 与原 FR/AC、规则和场景，随后细化实现 Slice。 |
| `artifact.domain-strategy` | DDD 战略设计 | `stage.plan` | 新产品/模块、跨上下文功能、统一语言冲突、服务边界或核心规则变化。 |
| `artifact.stage-decision-package` | 阶段决策包 | `stage.plan` | Plan 到 Spec 入口需要结构化上游决策。 |
| `artifact.plan-record` | Plan 记录 | `stage.plan` | 新问题或边界不清。 |
| `artifact.spec` | Spec | `stage.spec-architecture` | 新功能、行为变化或范围扩大。 |
| `artifact.product-overview` | 产品总体设计 | `stage.spec-architecture` | 进入 Spec 基线。 |
| `artifact.functional-architecture` | 功能架构 | `stage.spec-architecture` | 新模块或跨边界变化。 |
| `artifact.spec-delta` | Spec Delta | `stage.spec-architecture` | 已有冻结 Spec 的高风险行为变化。 |
| `artifact.parent-ticket` | 功能父 Ticket | `stage.plan` | 每个功能首次进入 Plan 或最近可信接入阶段时建立，正式化时复用；Design profile 不创建工程父 Ticket。 |
| `artifact.strategic-design-handoff` | 业务方案交接包 | `stage.product-design` | 同一功能明确交付外部 Backend 或 Frontend 实现消费者，需要冻结战略来源并形成可验证交付目录。 |
| `artifact.interaction-spec` | 交互说明 | `stage.product-design` | 命中产品设计影响。 |
| `artifact.low-fidelity-prototype` | 低保真原型 | `stage.product-design` | 命中产品设计影响。 |
| `artifact.state-matrix` | 状态矩阵 | `stage.product-design` | 存在状态流转、异常或恢复。 |
| `artifact.prototype-deliverable` | 原型交付物 | `stage.product-design` | 低保真评审后需要 H1 视觉或 H2 流程校准。 |
| `artifact.prototype-review-v2` | 原型评审记录 | `stage.product-design` | 命中 check.prototype-reviewed。 |
| `artifact.prototype-confirmation-v2` | 原型确认记录 | `stage.product-design` | 命中 gate.product-design-approved。 |

### 2.3 执行证据

| 稳定 ID | 证据 | 说明 |
|---|---|---|
| `evidence.frontend-implementation-verification` | 前端实现还原验证证据 | UI 实现相对冻结原型和 Spec 的桌面/窄屏视觉、状态、交互、控制台与 pnpm 验证记录。 |
| `evidence.repository-identity-check` | 仓库身份校验结果 | yss-project.yaml 合法性与 repository_mode 裁决。 |
| `evidence.upstream-input-check` | 上游输入校验结果 | Spec、战略设计、原型、OpenAPI、数据架构和工程约束的版本与批准状态。 |
| `evidence.frontend-engineering-design-review` | 前端工程设计评审证据 | 组件边界、状态与交互、API 消费、视觉基线和前端测试 seam 的评审结果。 |
| `evidence.architecture-decision` | 架构决策证据 | API、数据、跨边界和高风险架构取舍的可追溯决策。 |
| `evidence.contract-approval` | Slice Contract 批准记录 | 当前版本 Slice Implementation Contract 的生成、校验和批准引用。 |
| `evidence.frontend-verification` | 前端验证证据 | 前端页面、状态、交互、组件和 pnpm 命令的实际验证结果。 |
| `evidence.backend-verification` | 后端验证证据 | Domain、Application、API、数据和 ./mvnw 命令的实际验证结果。 |
| `evidence.test-verification` | 测试验证证据 | 测试 seam、fixture、契约、集成、E2E 和覆盖率结果。 |
| `evidence.fresh-verification` | Fresh Verification 记录 | 本轮重新执行的验证命令、退出码、执行时间和可读输出引用。 |
| `evidence.checkpoint-and-rollback` | Checkpoint 与回滚点 | 变更边界、仓库顺序、提交引用和恢复动作。 |
| `evidence.approval-record` | 人工批准记录 | 高风险架构、OpenAPI Freeze 或合并裁决的可追溯记录。 |
| `evidence.domain-strategy-review` | DDD 战略设计评审证据 | 子域、限界上下文、统一语言、Context Map、场景和不变量的结构化评审结果。 |
| `evidence.stage-decision-package` | 阶段决策包验证证据 | 阶段决策包的 Schema、引用、语义一致性、影响传播和下游消费验证结果。 |
| `evidence.strategic-design-handoff` | 业务方案交接包验证证据 | 显式外部 Backend 或 Frontend 实现消费者所需 Handoff v5 来源批准、不可变交付目录与整包实际验证证据。 |
| `evidence.prototype-review-result` | 原型评审结果 | 低保真页面、流程、状态与 API 反推的独立评审结论和阻断项。 |
| `evidence.prototype-profile-decision` | 原型档位选择证据 | 基于低保真评审后的风险触发、决定目标、H1/H2 计算结果以及人工升降级依据。 |
| `evidence.prototype-deliverable-verification` | 原型交付物验证证据 | schema v3 共同证据与所选档位的浏览器、Design QA、无障碍、组件事实或真实组件合同验证结果。 |
| `evidence.prototype-confirmation` | 原型用户确认记录 | 高保真原型、验证清单和进入下游阶段范围的人工确认结论。 |
<!-- lifecycle-registry:structure:end -->

完成结论必须同时包含批准的 Slice Implementation Contract 与 YSS Skill Execution Result（若进入实现阶段）。

安全 / 权限不形成独立门禁。只有需求或冻结资产明确改变相关业务行为时，才把它写入普通产物，并按实际 UI、API、Backend、Data、High-risk 影响使用上表既有门禁。

## 3. 退出与 checkpoint

阶段退出以“当前命中的门禁已通过、阻塞边已清除、证据可读、下一阶段入口明确”为准。连续推进时集中记录阶段因果、Ticket 同步状态、验证证据、风险、人工审查点和 Git checkpoint；不把单个阶段的口头汇报当作完成证明。
