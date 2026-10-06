# Harness 工作单元地图

<!-- lifecycle-registry:work-units:start -->
> 此表由 `.template-spec/process/lifecycle-registry.yaml` 生成；工作单元按 `scope` 区分模板维护与项目实例流程。

| 稳定 ID | 范围 | 工作单元 | 输入 | 输出 | 完成条件 |
|---|---|---|---|---|---|
| `work-unit.maintenance-research` | template-source | 模板维护研究 | 已明确范围的技术或策略研究请求。 | 研究简报、证据台账和绑定当前输入的验证记录。 | 当前研究包校验通过、执行阻断关闭；独立结束或在已授权范围内继续模板维护。 |
| `work-unit.entry-triage` | template-source | 入口分诊 | 用户请求、仓库身份。 | 影响面与最近可信阶段。 | 身份和影响面可解释。 |
| `work-unit.ssot-update` | template-source | 单一事实源更新 | 变更合同。 | 权威文档或脚本。 | 其他投影可由脚本生成。 |
| `work-unit.skill-projection-sync` | template-source | 技能投影同步 | .agents/skills。 | Agent root 投影、skills lock。 | --check 通过。 |
| `work-unit.template-snapshot-build` | template-source | 模板快照构建 | 固定模板 commit。 | CLI bundled snapshot。 | commit 与 tree hash 可追踪。 |
| `work-unit.attach-sync-integration` | template-source | attach / sync 集成 | 目标仓库、dry-run 计划。 | 受管资产和 metadata。 | 验证通过或完整回滚。 |
| `work-unit.intensity-aware-verification-v2` | template-source | 分级 Fresh verification | 变更仓库、强度分级与对应最低证据。 | 命令输出与证据。 | 日常完成本轮影响及依赖的定向检查、分级反例与维护者自检；fast 计划扩大到全量时记录范围并改做定向检查，不冒充完整 profile 通过。main 集成验证与正式发布另运行 scripts/verify-template；其完整适用集合、baseline、资格及 legacy-full 回退由验证 profile 核验。 |
| `work-unit.intensity-aware-review-v2` | template-source | 分级审查 | 变更 diff、强度分级与验证证据。 | 维护者自检结论与阻断项；按需记录聚焦独立审查结果。 | 已完成命中等级要求的维护者自检并处理阻断项；独立审查仅在另行触发时执行，不由 L2 或 L3 自动强制。 |
| `work-unit.release-and-rollback` | template-source | 发布与回滚 | 已审查 commit。 | release note、观察信号、回滚点。 | 两仓库顺序和恢复动作明确。 |
| `work-unit.plan-opportunity` | project-instance | 机会调研 | 用户问题、市场/竞品事实需求和现有上下文。 | Plan 机会结论、证据、替代方案和关键假设。 | 机会继续/停止建议可审查；事实已 research 或记录为假设。 |
| `work-unit.plan-requirements` | project-instance | 需求分析 | 机会结论、用户反馈和领域词汇。 | 用户、MVP、非目标、成功标准、测试 seam 和未决项。 | frontier 清空；用户确认；无 runnable blocker。 |
| `work-unit.domain-strategy-design` | project-instance | 业务边界与协作梳理 | 已澄清的业务故事、业务词汇、约束和现有协作关系。 | 业务板块、业务责任区、协作与交接关系、统一业务词汇、已发生的业务事实、待确认的关键业务对象和不可违反的业务规则。 | 边界、语义方向、规则所有权和关键场景可审查；无未解释冲突。 |
| `work-unit.stage-decision` | project-instance | 方案决策包综合 | Plan、业务边界与规则设计以及产品经理负责的商业约束输入。 | 汇总规划结论、业务边界和商业约束，形成带版本、内容摘要、证据及后续 Spec 使用关系的方案决策包。 | 必填字段、引用、影响面和下游消费验证通过；批准门禁完成。 |
| `work-unit.spec-synthesis` | project-instance | Spec 综合 | 已确认的 Plan 记录和测试 seam。 | Spec、产品总体设计、功能架构及业务 Ticket 草案集合。 | Spec 和业务 Ticket 草案可审查，FR/AC 覆盖与依赖可读取；进入 ready-for-human，下游推进仍需 gate.spec-baseline-approved。 |
| `work-unit.prototype-design-v2` | project-instance | 原型设计与验证 | Spec、产品设计影响和状态矩阵。 | 交互说明、低保真、状态矩阵、H1/H2 原型交付物、统一 Design QA、档位验证证据与前端实现交接事项。 | 低保真评审、schema v4 原型交付物验证和用户确认门禁均通过；Visual Baseline Bundle 和生产组件待验事项已交接到前端实现计划。 同步校准业务 Ticket，复用稳定 ID，随后进入业务正式化。 |
| `work-unit.technical-analysis` | project-instance | 技术分析与契约冻结 | 已正式化业务 Ticket 集及 Spec、原型、API/数据/工程影响面；新建后端的架构与平台候选，或既有工程当前登记的架构与平台配置。 | 新建后端的 DDD / MVC 与精确 Spring Boot 版本用户决定，或既有工程复用核验；OpenAPI、数据架构、按确认架构形成的 DDD / MVC 技术设计合同、工程基线、架构审查和 Slice 合同草案。 | 新建后端的 gate.backend-architecture-platform-approved 已通过，既有工程已核验复用并记录该门禁不适用；命中契约已冻结；无 API 影响有可读记录；所有后端交付均有批准且当前的 Technical Design；数据影响为真时数据架构已批准，否则有可核验的不适用记录；架构、规则与场景承接无未解释冲突；gate.engineering-contract-approved 通过。 |
| `work-unit.implementation-repository-preparation` | project-instance | 实现仓库准备 | 已完成的技术分析执行结果、Context reconciliation、战略交接消费结果、工程合同批准、工程影响面和实现仓库位置；新建后端还需批准且当前并绑定设计前置的 Project Scaffold Contract v4。 | 已有工程的 Repository Onboarding Result，或新工程的 Scaffold Manifest v4 与 Scaffold Verification；并汇总 Implementation Repository Preparation Result v2。 | 每个后端项目均携带技术/数据设计门禁结果；新生成只接受 v4；历史 v3 仅在机械骨架未修改、设计补齐和恢复批准均通过时对账复用；检测到提前业务实现时保持 blocked。每个命中的交付面均为 existing-and-onboarded 或 initialized-and-verified，未命中的交付面有带原因的 not-applicable；聚合结果当前且证据可读。 |
| `work-unit.service-project-initialization` | project-instance | 独立服务项目初始化 | 逐项目批准的架构决策、Technical Design、Data Architecture Decision、工程合同批准、schema v4 初始化合同、战略上下文交接及目标/skillUtils 写范围。 | 独立 Git project-instance、锁定 skillUtils、唯一根 CONTEXT、架构身份、Manifest 和验证证据；父项目仅保留引用。 | 当前合同与交接摘要一致，真实 Wrapper 三命令通过后仅 empty-scaffold-verified；首切片仍须独立批准和验证。 |
| `work-unit.ticket-decomposition` | project-instance | 垂直切片 Ticket 正式化 | 已正式化业务 Ticket、冻结 Spec、设计、契约、当前实现仓库准备和阻塞关系。 | 更新既有功能父 Ticket 的关联、形成垂直切片和批准的 Slice Implementation Contract。 | 切片可独立验证；生命周期复算后才能 ready-for-agent。 |
| `work-unit.slice-implementation` | project-instance | 垂直切片实现 | 当前版本 Slice Implementation Contract 和允许写路径。 | 前后端实现、TDD 和 YSS Skill Execution Result。 | 行为通过 `behavior-tdd`；UI 影响完成还原验证计划；无 drift/violation。 |
| `work-unit.frontend-implementation-verification` | project-instance | 前端实现还原验证 | 冻结原型、状态矩阵、实现候选和视觉验收用例。 | 桌面/窄屏视觉、状态、交互、console 和 pnpm 验证证据。 | 关键场景无未解释差异；独立 Reviewer 通过 UI fidelity 轴。 |
| `work-unit.code-review` | project-instance | 独立代码审查与验证 | 不可变候选快照、Spec、Ticket、合同和执行结果。 | Standards、Spec、UI fidelity 三轴 Review 与 fresh verification。 | findings 已处理；首轮覆盖全部适用审查项，修复后按差异、受影响结论及直接 / 传递依赖定向复审；未受影响结论仅凭可核验依据复用，全部结论重新绑定当前候选。 |
| `work-unit.backend-delivery` | project-instance | 后端职责交付终点 | plan-to-backend 职责范围、当前 Slice 批准与独立代码审查、Backend Delivery 源文件及正式导出包。 | 绑定当前源、独立审查和正式包的后端终点记录及下游前端待办。 | 完整复验源文件与正式包；仅后端可交付，不能宣布全业务完成或自动发布。 |
| `work-unit.release-and-retrospective` | project-instance | 发布与复盘 | 已审查候选、发布窗口和回滚点。 | 发布/回滚证据和复盘记录。 | 人工发布裁决、fresh verification 和治理回流均完成。 |
| `work-unit.business-ticket-formalization` | project-instance | 业务 Ticket 正式化 | 当前 Spec、适用的产品设计批准、业务 Ticket 草案集合和独立专业审查。 | 可追溯 FR/AC、规则、场景与设计的业务 Ticket 集；保持 ready-for-human。 | 当前业务覆盖完整，无阻断未决项；既有批准或授权延续有效，专业审查当前。战略交接或技术分析可继续，不授予 ready-for-agent。 |
<!-- lifecycle-registry:work-units:end -->
