# YSS 生命周期产物与门禁地图

本文是模板仓库与模板实例共享的生命周期派生阅读视图。结构化事实源是 `docs/process/lifecycle-registry.yaml`；本文解释主阶段、条件门禁、必须持久化的产物和退出标准。具体项目只有在触发条件命中时才执行对应门禁。

<!-- lifecycle-registry:structure:start -->
> 此结构区由 `docs/process/lifecycle-registry.yaml` 生成。当前为 `shadow` 模式：它校验结构和派生文档，不改变运行时状态 schema 或人工批准语义。

## 1. 主阶段

| 稳定 ID | 阶段 | 目标 | 退出标准 |
|---|---|---|---|
| `stage.entry-triage` | 入口分诊 | 确认仓库身份、问题范围和影响面。 | yss-project.yaml 合法，影响面和最近可信阶段可解释。 |
| `stage.discovery` | Discovery | 澄清问题、用户、约束和机会。 | 问题边界、关键假设和待确认项已记录。 |
| `stage.spec-architecture` | Spec / 功能架构 | 固化解决方案和功能边界。 | Spec 基线和功能边界可审查。 |
| `stage.product-design` | 产品设计 | 在存在产品设计影响时校准页面流和状态。 | 命中的设计门禁通过；未命中项记录 not-applicable 及原因。 |
| `stage.system-data-engineering` | 系统 / 数据架构与工程契约 | 固化系统、数据、工程基线和 API 契约。 | 受影响工程契约冻结或记录无 API 影响；required 脚手架证据齐全。 |
| `stage.ticket-formalization` | Ticket 正式化 | 将冻结范围拆为可追踪的父 Ticket 和垂直切片。 | 工作单元窄、依赖清晰、验收和测试 seam 可执行。 |
| `stage.vertical-slice-implementation` | 垂直切片实现 | 以批准合同驱动 TDD 实现和跨仓库协作。 | 允许写路径、禁止模式、证据和验证命令全部满足。 |
| `stage.verification-release-retrospective` | 验证 / 发布 / 复盘 | 完成 fresh verification、发布和回顾。 | 所有命中门禁通过，人工审查点已完成，checkpoint 可追溯。 |

## 2. 生命周期对象

门禁是需要裁决的审查点；产物、工作单元和证据不是门禁的同义词。未命中条件的门禁记录 `not-applicable` 及原因，不生成空文档。

### 2.1 条件门禁

| 稳定 ID | 门禁 | 所属阶段 | 触发条件 | 前置门禁 | 必须留下的证据 |
|---|---|---|---|---|---|
| `gate.repository-identity-valid` | 仓库身份校验 | `stage.entry-triage` | 每次进入流程。 | 无 | `evidence.repository-identity-check` |
| `gate.spec-baseline-approved` | Spec 基线批准 | `stage.spec-architecture` | 新功能、行为变化或范围扩大进入 Spec 基线。 | 无 | `evidence.approval-record` |
| `gate.prototype-reviewed` | 原型评审 | `stage.product-design` | 命中产品设计影响，且低保真页面、流程、状态或 API 反推需要独立评审。 | 无 | `evidence.prototype-review-result` |
| `gate.prototype-verified` | 高保真原型验证 | `stage.product-design` | 需要高保真 HTML 原型进行视觉与交互校准。 | 无 | `evidence.antd-cli-validation`、`evidence.browser-prototype-verification` |
| `gate.user-confirmation` | 用户确认 | `stage.product-design` | 产品设计影响尚未被人工确认。 | 无 | `evidence.prototype-confirmation` |
| `gate.openapi-draft-reviewed` | OpenAPI Draft Review | `stage.system-data-engineering` | 有 API 影响且 Draft 已生成。 | 无 | `evidence.openapi-draft-review` |
| `gate.design-reviewed` | 设计审查 | `stage.system-data-engineering` | API 或架构影响。 | 无 | `evidence.design-review-result` |
| `gate.openapi-frozen` | OpenAPI Freeze | `stage.system-data-engineering` | API 进入实现。 | 无 | `evidence.approval-record` |
| `gate.engineering-baseline-accepted` | 工程基线 | `stage.system-data-engineering` | 后端、前端或高风险工程变化。 | 无 | `evidence.fresh-verification` |
| `gate.architecture-reviewed` | 架构审查 | `stage.system-data-engineering` | 高风险或跨边界变化。 | 无 | `evidence.design-review-result` |
| `gate.slice-contract-approved` | Slice Implementation Contract 批准 | `stage.ticket-formalization` | Agent 进入实现；脚手架完成后每个后续生成代码工作单元。 | 无 | `evidence.contract-approval` |
| `gate.slice-ready-for-agent` | 垂直切片实现就绪 | `stage.ticket-formalization` | 垂直切片具备直接实现条件。 | 无 | `evidence.contract-approval`、`evidence.approval-record` |
| `gate.frontend-implementation-verified` | 前端实现还原验证 | `stage.verification-release-retrospective` | UI 影响切片完成实现并准备合并、发布或阶段完成。 | 无 | `evidence.frontend-implementation-verification` |
| `gate.release-ready` | 发布就绪 | `stage.verification-release-retrospective` | 合并、发布或阶段完成。 | `gate.frontend-implementation-verified` | `evidence.fresh-verification`、`evidence.checkpoint-and-rollback` |

### 2.2 生命周期产物

| 稳定 ID | 产物 | 所属阶段 | 触发条件 |
|---|---|---|---|
| `artifact.impact-assessment` | 影响面分析 | `stage.entry-triage` | 每次变更。 |
| `artifact.discovery-record` | Discovery 记录 | `stage.discovery` | 新问题或边界不清。 |
| `artifact.spec` | Spec | `stage.spec-architecture` | 新功能、行为变化或范围扩大。 |
| `artifact.product-overview` | 产品总体设计 | `stage.spec-architecture` | 进入 Spec 基线。 |
| `artifact.functional-architecture` | 功能架构 | `stage.spec-architecture` | 新模块或跨边界变化。 |
| `artifact.interaction-spec` | 交互说明 | `stage.product-design` | 命中产品设计影响。 |
| `artifact.low-fidelity-prototype` | 低保真原型 | `stage.product-design` | 命中产品设计影响。 |
| `artifact.state-matrix` | 状态矩阵 | `stage.product-design` | 存在状态流转、异常或恢复。 |
| `artifact.high-fidelity-html-prototype` | 高保真 HTML 原型 | `stage.product-design` | 需要视觉与交互校准。 |
| `artifact.prototype-review` | 原型评审记录 | `stage.product-design` | 命中 gate.prototype-reviewed。 |
| `artifact.prototype-confirmation` | 原型确认记录 | `stage.product-design` | 命中 gate.user-confirmation。 |
| `artifact.openapi-draft` | OpenAPI Draft | `stage.system-data-engineering` | 有 API 影响。 |
| `artifact.openapi-freeze-record` | OpenAPI Freeze 记录 | `stage.system-data-engineering` | API 进入实现。 |
| `artifact.data-architecture` | 数据架构 | `stage.system-data-engineering` | 数据模型、存储或一致性变化。 |
| `artifact.engineering-baseline` | 工程基线记录 | `stage.system-data-engineering` | 后端、前端或高风险工程变化。 |
| `artifact.architecture-review` | 架构审查记录 | `stage.system-data-engineering` | 高风险或跨边界变化。 |
| `artifact.spec-delta` | Spec Delta | `stage.spec-architecture` | 已有冻结 Spec 的高风险行为变化。 |
| `artifact.parent-ticket` | 功能父 Ticket | `stage.ticket-formalization` | 每个进入追踪的功能。 |
| `artifact.vertical-slice-ticket` | 垂直切片 Ticket | `stage.ticket-formalization` | 进入实现前。 |
| `artifact.slice-implementation-contract` | Slice Implementation Contract | `stage.ticket-formalization` | Agent 进入实现。 |
| `artifact.frontend-implementation-plan` | 前端实现还原计划 | `stage.ticket-formalization` | UI 影响切片提升 ready-for-agent 前。 |
| `artifact.frontend-implementation-verification` | 前端实现还原验证记录 | `stage.verification-release-retrospective` | UI 影响切片完成实现并准备合并、发布或阶段完成。 |
| `artifact.retrospective` | 复盘记录 | `stage.verification-release-retrospective` | 发布后或阶段性完成后满足复盘触发条件。 |

### 2.3 执行证据

| 稳定 ID | 证据 | 说明 |
|---|---|---|
| `evidence.impact-assessment` | 影响面分析记录 | 受影响仓库、资产、风险与最近可信阶段。 |
| `evidence.maintenance-intensity-checkpoint` | 模板维护强度 checkpoint | template-source 变更的 L1 / L2 / L3 分级、触发项、最低验证证据、review 模式和升级记录。 |
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
