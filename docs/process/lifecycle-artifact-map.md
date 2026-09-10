# YSS 生命周期产物与门禁地图

本文是模板仓库与模板实例共享的生命周期派生阅读视图。结构化事实源是 `docs/process/lifecycle-registry.yaml`；本文解释主阶段、条件门禁、必须持久化的产物和退出标准。具体项目只有在触发条件命中时才执行对应门禁。

<!-- lifecycle-registry:structure:start -->
> 此结构区由 `docs/process/lifecycle-registry.yaml` 生成。当前为 `active` 模式：正式门禁、内部检查和派生文档共同消费此事实源。

## 1. 主阶段

| 稳定 ID | 阶段 | 目标 | 退出标准 |
|---|---|---|---|
| `stage.entry-triage` | 入口分诊 | 确认仓库身份、问题范围和影响面。 | yss-project.yaml 合法，影响面和最近可信阶段可解释。 |
| `stage.plan` | Plan（战略规划） | 确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。 | 命中的战略与阶段决策检查通过，用户统一批准当前 Plan；影响业务边界、关键规则或 MVP 的问题已解决，其他未决项有责任人和解决时点；下游可进入 Spec，不代表可实现。 |
| `stage.spec-architecture` | Spec / 功能架构 | 固化解决方案和功能边界。 | Spec 基线和功能边界可审查。 |
| `stage.product-design` | 产品设计 | 在存在产品设计影响时校准页面流和状态。 | 命中的设计门禁通过；未命中项记录 not-applicable 及原因。 |
| `stage.system-data-engineering` | 系统 / 数据架构与工程契约 | 固化系统、数据、工程基线和 API 契约。 | 受影响工程契约冻结或记录无 API 影响；required 脚手架证据齐全。 |
| `stage.ticket-formalization` | Ticket 正式化 | 将冻结范围拆为可追踪的父 Ticket 和垂直切片。 | 工作单元窄、依赖清晰、验收和测试 seam 可执行。 |
| `stage.vertical-slice-implementation` | 垂直切片实现 | 以批准合同驱动 TDD 实现和跨仓库协作。 | 允许写路径、禁止模式、证据和验证命令全部满足。 |
| `stage.verification-release-retrospective` | 验证 / 发布 / 复盘 | 完成 fresh verification、发布和回顾。 | 所有命中门禁通过，人工审查点已完成，checkpoint 可追溯。 |

## 2. 生命周期对象

门禁是需要裁决的审查点；产物、工作单元和证据不是门禁的同义词。未命中条件的门禁记录 `not-applicable` 及原因，不生成空文档。

### 2.1 条件门禁

| 稳定 ID | 门禁 | 所属阶段 | 触发条件 | 前置门禁 / 检查 | 必须留下的证据 |
|---|---|---|---|---|---|
| `gate.plan-approved` | Plan 批准 | `stage.plan` | Plan 结论进入 Spec；汇总战略检查后仅确认一次当前规划范围。 | `check.domain-strategy-approved`、`check.stage-decision-package-approved` | `evidence.approval-record` |
| `gate.spec-baseline-approved` | Spec 基线批准 | `stage.spec-architecture` | 新功能、行为变化或范围扩大进入 Spec 基线。 | 无 | `evidence.approval-record` |
| `gate.product-design-approved` | 产品设计批准 | `stage.product-design` | 存在产品设计影响；独立原型评审与交付物验证通过后确认最终原型。 | `check.prototype-reviewed`、`check.prototype-verified` | `evidence.prototype-confirmation` |
| `gate.engineering-contract-approved` | 工程契约批准 | `stage.system-data-engineering` | 存在 API、架构或工程基线影响；完成适用专业审查后统一批准，有 API 影响时同时冻结当前 OpenAPI。 | `check.openapi-draft-reviewed`、`check.design-reviewed`、`check.architecture-reviewed`、`check.engineering-baseline-accepted`、`check.openapi-frozen` | `evidence.approval-record`、`evidence.fresh-verification` |
| `gate.slice-contract-approved` | 切片合同批准 | `stage.ticket-formalization` | 主控在已授权范围内批准已持久化且当前的垂直切片合同；不代替就绪计算。 | 无 | `evidence.contract-approval` |
| `gate.delivery-accepted` | 交付验收 | `stage.verification-release-retrospective` | 实现交付验收；汇总独立审查、Fresh Verification 和回滚证据，不授予合并或发布权限。 | `check.frontend-implementation-verified` | `evidence.fresh-verification`、`evidence.checkpoint-and-rollback` |

### 内部检查与自动前置条件

检查失败仍阻断。专业审查记录作为聚合门禁证据，不单独请求用户批准；自动检查通过不授权实现或发布。

| 稳定 ID | 检查 | 阶段 | 触发条件 |
|---|---|---|---|
| `check.frontend-delivery-inputs-verified` | 前端联合输入核验 | `stage.system-data-engineering` | 专职前端 profile 或显式 frontend_delivery 绑定的任务启动、恢复、合同编译、实现和验证；实际执行 scripts/verify-frontend-delivery，输入就绪不等于实现获批。 |
| `check.repository-identity-valid` | 仓库身份校验 | `stage.entry-triage` | 每次进入流程。 |
| `check.domain-strategy-approved` | 业务边界与规则评审 | `stage.plan` | 需要确定业务板块、业务责任区、统一业务词汇、协作关系或关键规则。 |
| `check.stage-decision-package-approved` | 阶段决策包评审 | `stage.plan` | Plan 到 Spec 入口需要稳定的阶段决策合同。 |
| `check.prototype-reviewed` | 原型评审 | `stage.product-design` | 命中产品设计影响，且低保真页面、流程、状态或 API 反推需要独立评审。 |
| `check.prototype-verified` | 原型交付物验证 | `stage.product-design` | 产品设计影响需要通过 H1/H2 原型交付物进行视觉或流程校准；真实组件验证留到前端实现阶段。 |
| `check.openapi-draft-reviewed` | OpenAPI Draft Review | `stage.system-data-engineering` | 有 API 影响且 Draft 已生成。 |
| `check.design-reviewed` | 设计审查 | `stage.system-data-engineering` | API 或架构影响。 |
| `check.openapi-frozen` | OpenAPI 冻结准备 | `stage.system-data-engineering` | 有 API 影响；确认待冻结版本、Draft 审查和契约绑定，工程契约批准后原子冻结同一版本。 |
| `check.engineering-baseline-accepted` | 工程基线 | `stage.system-data-engineering` | 后端、前端或高风险工程变化。 |
| `check.architecture-reviewed` | 架构审查 | `stage.system-data-engineering` | 高风险或跨边界变化。 |
| `check.implementation-repositories-ready` | 实现仓库准备就绪 | `stage.system-data-engineering` | 后端或前端交付面进入 Ticket 正式化；未命中的交付面须记录带原因的 not-applicable。 |
| `check.slice-ready-for-agent` | 垂直切片实现就绪 | `stage.ticket-formalization` | 垂直切片具备直接实现条件。 |
| `check.frontend-implementation-verified` | 前端实现还原验证 | `stage.verification-release-retrospective` | UI 影响切片完成实现并准备合并、发布或阶段完成。 |

### 2.2 生命周期产物

| 稳定 ID | 产物 | 所属阶段 | 触发条件 |
|---|---|---|---|
| `artifact.impact-assessment` | 影响面分析 | `stage.entry-triage` | 每次变更。 |
| `artifact.domain-strategy` | 业务边界与规则设计 | `stage.plan` | 新产品/模块、跨责任区协作、业务词汇冲突、责任边界或关键规则变化。 |
| `artifact.stage-decision-package` | 方案决策包 | `stage.plan` | Plan 到 Spec 入口需要结构化上游决策。 |
| `artifact.plan-record` | Plan 记录 | `stage.plan` | 新问题或边界不清。 |
| `artifact.spec` | Spec | `stage.spec-architecture` | 新功能、行为变化或范围扩大。 |
| `artifact.product-overview` | 产品总体设计 | `stage.spec-architecture` | 进入 Spec 基线。 |
| `artifact.functional-architecture` | 功能架构 | `stage.spec-architecture` | 新模块或跨边界变化。 |
| `artifact.interaction-spec` | 交互说明 | `stage.product-design` | 命中产品设计影响。 |
| `artifact.low-fidelity-prototype` | 低保真原型 | `stage.product-design` | 命中产品设计影响。 |
| `artifact.state-matrix` | 状态矩阵 | `stage.product-design` | 存在状态流转、异常或恢复。 |
| `artifact.prototype-deliverable` | 原型交付物 | `stage.product-design` | 低保真评审后需要 H1 视觉或 H2 流程校准。 |
| `artifact.prototype-review` | 原型评审记录 | `stage.product-design` | 命中 gate.prototype-reviewed。 |
| `artifact.prototype-confirmation` | 原型确认记录 | `stage.product-design` | 命中 gate.user-confirmation。 |
| `artifact.openapi-draft` | OpenAPI Draft | `stage.system-data-engineering` | 有 API 影响。 |
| `artifact.openapi-freeze-record` | OpenAPI Freeze 记录 | `stage.system-data-engineering` | API 进入实现。 |
| `artifact.data-architecture` | 数据架构 | `stage.system-data-engineering` | 数据模型、存储或一致性变化。 |
| `artifact.engineering-baseline` | 工程基线记录 | `stage.system-data-engineering` | 后端、前端或高风险工程变化。 |
| `artifact.architecture-review` | 架构审查记录 | `stage.system-data-engineering` | 高风险或跨边界变化。 |
| `artifact.technical-design` | 技术设计合同 | `stage.system-data-engineering` | 后端技术设计需要按已确认 DDD 或 MVC 架构明确行为、分层、一致性或数据映射。 |
| `artifact.project-scaffold-contract` | Project Scaffold Contract | `stage.system-data-engineering` | 命中的前端或后端交付面选择初始化新工程。 |
| `artifact.implementation-repository-preparation-result` | 实现仓库准备结果 | `stage.system-data-engineering` | 后端或前端交付面进入 Ticket 正式化。 |
| `artifact.tactical-design` | DDD 战术设计 | `stage.system-data-engineering` | 聚合边界、状态机、一致性或持久化映射复杂到无法在系统概要设计的 Tactical DDD Check 中清楚表达。 |
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
| `evidence.context-reconciliation` | Context Reconciliation 证据 | 工作单元在批准或流转前对根目录唯一 CONTEXT.md 的稳定术语回写、作用域解析和双摘要核对结果；不新增门禁。 |
| `evidence.impact-assessment` | 影响面分析记录 | 受影响仓库、资产、风险与最近可信阶段。 |
| `evidence.domain-strategy-review` | 业务边界与规则评审证据 | 业务板块、业务责任区、统一业务词汇、协作与交接关系、关键场景和不可违反规则的结构化评审结果。 |
| `evidence.technical-design-review` | 技术设计评审证据 | 按已确认 DDD 或 MVC 架构审查规则与场景承接、分层、行为、一致性和测试边界。 |
| `evidence.tactical-design-review` | DDD 战术设计评审证据 | 聚合、Entity、Value Object、不变量、状态机、一致性、Gateway 与 API 隔离的结构化评审结果。 |
| `evidence.stage-decision-package` | 阶段决策包验证证据 | 阶段决策包的 Schema、引用、语义一致性、影响传播和下游消费验证结果。 |
| `evidence.maintenance-intensity-checkpoint` | 模板维护强度 checkpoint | template-source 变更的 L1 / L2 / L3 分级、触发项、最低验证证据、review 模式和升级记录。 |
| `evidence.repository-identity-check` | 仓库身份校验结果 | yss-project.yaml 的合法性与 repository_mode 裁决。 |
| `evidence.approval-record` | 人工批准记录 | 对需要人工批准的 Spec、设计、契约或发布裁决的可追溯记录。 |
| `evidence.design-review-result` | 设计审查结果 | API、架构或产品设计审查意见及处理结果。 |
| `evidence.prototype-review-result` | 原型评审结果 | 低保真页面、流程、状态与 API 反推的独立评审结论和阻断项。 |
| `evidence.antd-cli-validation` | Ant Design CLI 校验证据 | 设计语言、组件、demo、token、semantic 与 lint 的实际 CLI/目标版本和可读输出引用。 |
| `evidence.browser-prototype-verification` | 浏览器原型验证证据 | 高保真原型的非空渲染、主流程、异常状态、视口和控制台验证记录。 |
| `evidence.prototype-profile-decision` | 原型档位选择证据 | 基于低保真评审后的风险触发、决定目标、H1/H2 计算结果以及人工升降级依据。 |
| `evidence.prototype-deliverable-verification` | 原型交付物验证证据 | schema v3 共同证据与所选档位的浏览器、Design QA、无障碍、组件事实或真实组件合同验证结果。 |
| `evidence.prototype-confirmation` | 原型用户确认记录 | 高保真原型、验证清单和进入下游阶段范围的人工确认结论。 |
| `evidence.openapi-draft-review` | OpenAPI Draft 审查记录 | P0、错误、分页、幂等和契约测试审查记录。 |
| `evidence.contract-approval` | Slice 合同批准记录 | 生命周期编排器批准且已持久化的当前版本合同引用。 |
| `evidence.yss-skill-execution-result` | YSS Skill Execution Result | 专项 skill 的合同版本、写入、验证、延期 seam 与偏离证据。 |
| `evidence.frontend-implementation-verification` | 前端实现还原验证证据 | UI 实现相对冻结原型和 Spec 的桌面/窄屏视觉、状态、交互、控制台与 pnpm 验证记录。 |
| `evidence.fresh-verification` | Fresh Verification 记录 | 本轮实际执行的验证命令、结果和时间。 |
| `evidence.implementation-repository-preparation` | 实现仓库准备证据 | 按项目记录交付面、已有仓库接入或新脚手架合同、生成清单、实际验证结果、仓库位置、Git 边界和当前版本。 |
| `evidence.checkpoint-and-rollback` | Checkpoint 与回滚点 | 可追溯的变更边界、发布记录和恢复动作。 |
<!-- lifecycle-registry:structure:end -->

完成结论必须同时包含批准的 Slice Implementation Contract 与 YSS Skill Execution Result（若进入实现阶段）。

安全 / 权限不形成独立门禁。只有需求或冻结资产明确改变相关业务行为时，才把它写入普通产物，并按实际 UI、API、Backend、Data、High-risk 影响使用上表既有门禁。

## 3. 退出与 checkpoint

阶段退出以“当前命中的门禁已通过、阻塞边已清除、证据可读、下一阶段入口明确”为准。连续推进时集中记录阶段因果、Ticket 同步状态、验证证据、风险、人工审查点和 Git checkpoint；不把单个阶段的口头汇报当作完成证明。
