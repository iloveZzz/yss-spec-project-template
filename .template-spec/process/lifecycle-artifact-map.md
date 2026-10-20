# YSS 生命周期产物与门禁地图

本文是模板仓库与模板实例共享的生命周期派生阅读视图。结构化事实源是 `.template-spec/process/lifecycle-registry.yaml`；本文解释主阶段、条件门禁、必须持久化的产物和退出标准。具体项目只有在触发条件命中时才执行对应门禁。

<!-- lifecycle-registry:structure:start -->
> 此结构区由 `.template-spec/process/lifecycle-registry.yaml` 生成。当前为 `active` 模式：正式门禁、内部检查和派生文档共同消费此事实源。

## 1. 主阶段

| 稳定 ID | 阶段 | 目标 | 退出标准 |
|---|---|---|---|
| `stage.entry-triage` | 入口分诊 | 确认仓库身份、问题范围和影响面。 | yss-project.yaml 合法，影响面和最近可信阶段可解释。 |
| `stage.plan` | Plan（战略规划） | 确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。 | 命中的战略与阶段决策检查通过，用户统一批准当前 Plan；影响业务边界、关键规则或 MVP 的问题已解决，其他未决项有责任人和解决时点；下游可进入 Spec，不代表可实现。 |
| `stage.spec-architecture` | Spec / 功能架构 | 固化解决方案和功能边界，同时按用户行为与验收结果起草业务 Ticket。 | Spec 基线和功能边界可审查；适用业务 Ticket 草案及 FR/AC 覆盖可读取。 |
| `stage.product-design` | 产品设计与业务 Ticket 正式化 | 按产品设计影响校准页面流、状态和业务 Ticket；在技术分析前完成适用业务 Ticket 正式化。 | 命中的设计门禁通过，适用业务 Ticket 正式化及当前审查闭合；无产品设计影响时记录依据，从 Spec 进入业务正式化，不生成空原型。 |
| `stage.system-data-engineering` | 系统 / 数据架构与工程契约 | 消费已正式化业务 Ticket 和当前批准的 Spec / 设计，围绕当前交付范围固化系统、数据、工程基线及 API 契约。 | 新建后端已由用户确认 DDD / MVC 与精确 Spring Boot 版本，既有工程已核验并复用登记值；受影响工程契约冻结或记录无 API 影响；required 脚手架证据齐全。 |
| `stage.ticket-formalization` | 实现切片拆分与合同准入 | 消费当前工程契约与实现仓库准备，将业务 Ticket 细化为可独立验证的切片并复算实施准入。 | 切片范围窄、依赖清晰、验收与测试 seam 可执行；当前合同、工程与适用 API 条件通过，自动形成实施准入。 |
| `stage.vertical-slice-implementation` | 垂直切片实现 | 以批准合同驱动 TDD 实现和跨仓库协作。 | 允许写路径、禁止模式、证据和验证命令全部满足。 |
| `stage.verification-release-retrospective` | 验证 / 发布 / 复盘 | 完成 fresh verification、发布和回顾。 | 所有命中门禁通过，人工审查点已完成，checkpoint 可追溯。 |

## 2. 生命周期对象

门禁是需要裁决的审查点；产物、工作单元和证据不是门禁的同义词。未命中条件的门禁记录 `not-applicable` 及原因，不生成空文档。

### 2.1 条件门禁

| 稳定 ID | 门禁 | 所属阶段 | 触发条件 | 前置门禁 / 检查 | 必须留下的证据 |
|---|---|---|---|---|---|
| `gate.plan-approved` | Plan 批准 | `stage.plan` | Plan 结论进入 Spec；汇总战略检查，核验当前规划范围的原始批准或有效授权延续。 | 无 | `evidence.approval-record` |
| `gate.spec-baseline-approved` | Spec 基线批准 | `stage.spec-architecture` | Spec 与适用产品设计、业务验收基线一并确认，只形成一份阶段记录。 | 无 | `evidence.approval-record` |
| `gate.implementation-admitted` | 实施准入 | `stage.ticket-formalization` | 当前 Slice、授权范围、工程和适用 API 条件通过；自动准入，不再申请独立工程或切片批准。 | 无 | `evidence.contract-approval` |
| `gate.delivery-accepted` | 交付验收 | `stage.verification-release-retrospective` | 当前实现与约定验收实际通过，消费真实验收决定或有效延续；不授予提交、合并、发布或部署。 | 无 | `evidence.fresh-verification`、`evidence.checkpoint-and-rollback` |

### 内部检查与自动前置条件

检查失败仍阻断。专业审查记录作为聚合门禁证据，不单独请求用户批准；自动检查通过不授权实现或发布。

| 稳定 ID | 检查 | 阶段 | 触发条件 |
|---|---|---|---|
| `check.repository-identity-valid` | 仓库身份校验 | `stage.entry-triage` | 每次进入流程。 |
| `check.domain-strategy-approved` | 业务边界与规则评审 | `stage.plan` | 需要确定业务板块、业务责任区、统一业务词汇、协作关系或关键规则。 |
| `check.stage-decision-package-approved` | 方案决策包评审 | `stage.plan` | Plan 到 Spec 入口需要稳定的阶段决策合同。 |
| `check.artifact-consistency-analyzed` | 跨资产一致性分析 | `stage.spec-architecture` | 申请 Spec 基线批准前；结论 incomplete 或存在未处置发现时不得申请批准，分析本身不授予批准或执行资格。 |
| `check.prototype-reviewed` | 原型评审 | `stage.product-design` | 命中产品设计影响，且低保真页面、流程、状态或 API 反推需要独立评审。 |
| `check.prototype-verified` | 原型交付物验证 | `stage.product-design` | 产品设计影响需要通过 H1/H2 原型交付物进行视觉或流程校准；真实组件验证留到前端实现阶段。 |
| `check.openapi-draft-reviewed` | OpenAPI Draft Review | `stage.system-data-engineering` | 有 API 影响且 Draft 已生成。 |
| `check.design-reviewed` | 设计审查 | `stage.system-data-engineering` | API 或架构影响。 |
| `check.openapi-frozen` | OpenAPI 冻结准备 | `stage.system-data-engineering` | 有 API 影响；确认待冻结版本、Draft 审查和契约绑定，工程契约批准后原子冻结同一版本。 |
| `check.engineering-baseline-accepted` | 工程基线 | `stage.system-data-engineering` | 后端、前端或高风险工程变化。 |
| `check.architecture-reviewed` | 架构审查 | `stage.system-data-engineering` | 高风险或跨边界变化。 |
| `check.implementation-repositories-ready` | 实现仓库准备就绪 | `stage.system-data-engineering` | 后端或前端交付面进入实现切片拆分与合同准入前；未命中的交付面须记录带原因的 not-applicable。 |
| `check.slice-ready-for-agent` | 垂直切片实现就绪 | `stage.ticket-formalization` | 垂直切片具备直接实现条件。 |

### 2.2 生命周期产物

| 稳定 ID | 产物 | 所属阶段 | 触发条件 |
|---|---|---|---|
| `artifact.strategic-design-handoff` | 业务方案交接包 | `stage.product-design` | 同一功能明确交付外部 Backend 或 Frontend 实现消费者，需要冻结战略来源并形成可验证交付目录。 |
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
| `artifact.prototype-review-v2` | 原型评审记录 | `stage.product-design` | 命中 check.prototype-reviewed。 |
| `artifact.prototype-confirmation-v2` | 原型确认记录 | `stage.product-design` | 命中 gate.spec-baseline-approved。 |
| `artifact.openapi-draft` | OpenAPI Draft | `stage.system-data-engineering` | 有 API 影响。 |
| `artifact.openapi-freeze-record` | OpenAPI Freeze 记录 | `stage.system-data-engineering` | API 进入实现。 |
| `artifact.data-architecture` | 数据架构 | `stage.system-data-engineering` | 数据模型、存储或一致性变化。 |
| `artifact.engineering-baseline` | 工程基线记录 | `stage.system-data-engineering` | 后端、前端或高风险工程变化。 |
| `artifact.architecture-review` | 架构审查记录 | `stage.system-data-engineering` | 高风险或跨边界变化。 |
| `artifact.technical-design` | 技术设计合同 | `stage.system-data-engineering` | 后端技术设计需要按已确认 DDD 或 MVC 架构明确行为、分层、一致性或数据映射。 |
| `artifact.project-scaffold-contract` | Project Scaffold Contract | `stage.system-data-engineering` | 命中的前端或后端交付面选择初始化新工程。 |
| `artifact.implementation-repository-preparation-result` | 实现仓库准备结果 | `stage.system-data-engineering` | 后端或前端交付面进入实现切片拆分与合同准入前。 |
| `artifact.tactical-design` | DDD 战术设计 | `stage.system-data-engineering` | 聚合边界、状态机、一致性或持久化映射复杂到无法在系统概要设计的 Tactical DDD Check 中清楚表达。 |
| `artifact.spec-delta` | Spec Delta | `stage.spec-architecture` | 已有冻结 Spec 的高风险行为变化。 |
| `artifact.parent-ticket` | 功能父 Ticket | `stage.plan` | 每个功能首次进入 Plan 或最近可信接入阶段时建立，正式化时复用。 |
| `artifact.vertical-slice-ticket` | 垂直切片 Ticket | `stage.ticket-formalization` | 进入实现前。 |
| `artifact.slice-implementation-contract` | Slice Implementation Contract | `stage.ticket-formalization` | Agent 进入实现。 |
| `artifact.retrospective` | 复盘记录 | `stage.verification-release-retrospective` | 发布后或阶段性完成后满足复盘触发条件。 |
| `artifact.business-ticket-set` | 业务 Ticket 集 | `stage.spec-architecture` | Spec 同步起草、产品设计校准和业务正式化；不依赖实现工程，不授予实现资格。 |

### 2.3 执行证据

| 稳定 ID | 证据 | 说明 |
|---|---|---|
| `evidence.strategic-design-handoff` | 业务方案交接包验证证据 | 显式外部 Backend 或 Frontend 实现消费者所需 Handoff v5 来源批准、不可变交付目录与整包实际验证证据。 |
| `evidence.context-reconciliation` | Context Reconciliation 证据 | 工作单元在批准或流转前对根目录唯一 CONTEXT.md 的稳定术语回写、作用域解析和双摘要核对结果；不新增门禁。 |
| `evidence.artifact-consistency-analysis` | 跨资产一致性分析证据 | 申请 Spec 基线批准前，scripts/analyze-artifacts 对功能包 Plan/Spec 质量、业务票覆盖与切片验收覆盖的汇总结论、发现与未评估项；status 为 consistent，或剩余发现已逐条处置。 |
| `evidence.impact-assessment` | 影响面分析记录 | 受影响仓库、资产、风险与最近可信阶段。 |
| `evidence.domain-strategy-review` | 业务边界与规则评审证据 | 业务板块、业务责任区、统一业务词汇、协作与交接关系、关键场景和不可违反规则的结构化评审结果。 |
| `evidence.technical-design-review` | 技术设计评审证据 | 按已确认 DDD 或 MVC 架构审查规则与场景承接、分层、行为、一致性和测试边界。 |
| `evidence.tactical-design-review` | DDD 战术设计评审证据 | 聚合、Entity、Value Object、不变量、状态机、一致性、Gateway 与 API 隔离的结构化评审结果。 |
| `evidence.stage-decision-package` | 方案决策包验证证据 | 阶段决策包的 Schema、引用、语义一致性、影响传播和下游消费验证结果。 |
| `evidence.maintenance-intensity-checkpoint` | 模板维护强度 checkpoint | 当前 template-source 按 maintenance-intensity.yaml 的 L1 / L2 分级，记录触发项、最低验证证据、review 模式和升级依据。 |
| `evidence.repository-identity-check` | 仓库身份校验结果 | yss-project.yaml 的合法性与 repository_mode 裁决。 |
| `evidence.approval-record` | 阶段决定记录 | Plan、Spec 与适用设计、交付验收的真实决定及当前成果绑定。 |
| `evidence.design-review-result` | 设计审查结果 | API、架构或产品设计审查意见及处理结果。 |
| `evidence.prototype-review-result` | 原型评审结果 | 低保真页面、流程、状态与 API 反推的内容复核结论和阻断项；按实际要求决定是否独立复核。 |
| `evidence.antd-cli-validation` | Ant Design CLI 校验证据 | 设计语言、组件、demo、token、semantic 与 lint 的实际 CLI/目标版本和可读输出引用。 |
| `evidence.browser-prototype-verification` | 浏览器原型验证证据 | 高保真原型的非空渲染、主流程、异常状态、视口和控制台验证记录。 |
| `evidence.prototype-profile-decision` | 原型档位选择证据 | 基于低保真评审后的风险触发、决定目标、H1/H2 计算结果以及人工升降级依据。 |
| `evidence.prototype-deliverable-verification` | 原型交付物验证证据 | 新原型证据采用 schema v4，包含共同证据、Visual Baseline Bundle、浏览器、Design QA、无障碍及档位验证结果；历史 v3 仅供只读兼容。 |
| `evidence.prototype-confirmation` | 原型用户确认记录 | 适用原型、验证清单和下游范围纳入同一次 Spec 基线阶段决定。 |
| `evidence.openapi-draft-review` | OpenAPI Draft 审查记录 | P0、错误、分页、幂等和契约测试审查记录。 |
| `evidence.contract-approval` | 实施准入记录 | 已授权基线范围内，当前 Slice 合同和工程、API 条件的自动准入结果。 |
| `evidence.yss-skill-execution-result` | YSS Skill Execution Result | 专项 skill 的合同版本、写入、验证、延期 seam 与偏离证据。 |
| `evidence.fresh-verification` | Fresh Verification 记录 | 本轮实际执行的验证命令、结果和时间。 |
| `evidence.implementation-repository-preparation` | 实现仓库准备证据 | 按项目记录交付面、已有仓库接入或新脚手架合同、生成清单、实际验证结果、仓库位置、Git 边界和当前版本。 |
| `evidence.checkpoint-and-rollback` | Checkpoint 与回滚点 | 可追溯的变更边界、发布记录和恢复动作。 |
<!-- lifecycle-registry:structure:end -->

完成结论必须同时包含批准的 Slice Implementation Contract 与 YSS Skill Execution Result（若进入实现阶段）。

安全 / 权限不形成独立门禁。只有需求或冻结资产明确改变相关业务行为时，才把它写入普通产物，并按实际 UI、API、Backend、Data、High-risk 影响使用上表既有门禁。

## 3. 退出与 checkpoint

阶段退出以“当前命中的门禁已通过、阻塞边已清除、证据可读、下一阶段入口明确”为准。连续推进时集中记录阶段因果、Ticket 同步状态、验证证据、风险、人工审查点和 Git checkpoint；不把单个阶段的口头汇报当作完成证明。
