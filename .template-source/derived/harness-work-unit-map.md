# Harness 工作单元地图

<!-- lifecycle-registry:work-units:start -->
> 此表由 `docs/process/lifecycle-registry.yaml` 生成；工作单元按 `scope` 区分模板维护与项目实例流程。

| 稳定 ID | 范围 | 工作单元 | 输入 | 输出 | 完成条件 |
|---|---|---|---|---|---|
| `work-unit.entry-triage` | template-source | 入口分诊 | 用户请求、仓库身份。 | 影响面与最近可信阶段。 | 身份和影响面可解释。 |
| `work-unit.ssot-update` | template-source | 单一事实源更新 | 变更合同。 | 权威文档或脚本。 | 其他投影可由脚本生成。 |
| `work-unit.skill-projection-sync` | template-source | 技能投影同步 | .agents/skills。 | Agent root 投影、skills lock。 | --check 通过。 |
| `work-unit.template-snapshot-build` | template-source | 模板快照构建 | 固定模板 commit。 | CLI bundled snapshot。 | commit 与 tree hash 可追踪。 |
| `work-unit.attach-sync-integration` | template-source | attach / sync 集成 | 目标仓库、dry-run 计划。 | 受管资产和 metadata。 | 验证通过或完整回滚。 |
| `work-unit.intensity-aware-verification` | template-source | 分级 Fresh verification | 变更仓库、强度分级与对应最低证据。 | 命令输出与证据。 | L1 相关检查、L2 最小反例与 fresh verification、L3 完整 RED / GREEN / REFACTOR 与 fresh verification 按命中等级通过。 |
| `work-unit.intensity-aware-review` | template-source | 分级审查 | 变更 diff、强度分级与验证证据。 | L1 self-check / 人工 checkpoint、L2 聚焦独立审查或 L3 正式独立审查结论。 | 已按命中等级完成审查且无未处理阻断项；L1 不强制独立 reviewer。 |
| `work-unit.release-and-rollback` | template-source | 发布与回滚 | 已审查 commit。 | release note、观察信号、回滚点。 | 两仓库顺序和恢复动作明确。 |
| `work-unit.discovery-opportunity` | project-instance | 机会调研 | 用户问题、市场/竞品事实需求和现有上下文。 | Discovery 机会结论、证据、替代方案和关键假设。 | 机会继续/停止建议可审查；事实已 research 或记录为假设。 |
| `work-unit.discovery-requirements` | project-instance | 需求分析 | 机会结论、用户反馈和领域词汇。 | 用户、MVP、非目标、成功标准、测试 seam 和未决项。 | frontier 清空；用户确认；无 runnable blocker。 |
| `work-unit.domain-strategy-design` | project-instance | DDD 战略设计 | 已澄清的业务场景、领域词汇、约束和现有上下文。 | 子域、限界上下文、Context Map、统一语言、事件、核心领域概念候选和不变量。 | 边界、语义方向、规则所有权和关键场景可审查；无未解释冲突。 |
| `work-unit.stage-decision` | project-instance | 阶段决策包综合 | Discovery、DDD 战略设计以及产品经理负责的商业约束输入。 | 带版本、digest、证据和下游映射的阶段决策包。 | 必填字段、引用、影响面和下游消费验证通过；批准门禁完成。 |
| `work-unit.spec-synthesis` | project-instance | Spec 综合 | 已确认的 Discovery 记录和测试 seam。 | Spec、产品总体设计和功能架构。 | Spec 内容完整并进入 ready-for-human；下游推进仍需 gate.spec-baseline-approved。 |
| `work-unit.prototype-design` | project-instance | 原型设计与验证 | Spec、产品设计影响和状态矩阵。 | 交互说明、低/高保真原型、评审、AntD CLI 和浏览器证据。 | 原型评审、高保真验证和用户确认门禁均通过。 |
| `work-unit.technical-analysis` | project-instance | 技术分析与契约冻结 | Spec、原型、API/数据/工程影响面。 | OpenAPI、数据架构、Tactical DDD Check、工程基线、架构审查和 Slice 合同草案。 | 命中契约已冻结；无 API 影响有可读记录；命中领域影响时战术模型无未解释冲突；工程基线通过。 |
| `work-unit.ticket-decomposition` | project-instance | 垂直切片 Ticket 正式化 | 冻结 Spec、设计、契约和阻塞关系。 | 功能父 Ticket、垂直切片和批准的 Slice Implementation Contract。 | 切片可独立验证；生命周期复算后才能 ready-for-agent。 |
| `work-unit.slice-implementation` | project-instance | 垂直切片实现 | 当前版本 Slice Implementation Contract 和允许写路径。 | 前后端实现、TDD 和 YSS Skill Execution Result。 | 行为通过 `behavior-tdd`；UI 影响完成还原验证计划；无 drift/violation。 |
| `work-unit.frontend-implementation-verification` | project-instance | 前端实现还原验证 | 冻结原型、状态矩阵、实现候选和视觉验收用例。 | 桌面/窄屏视觉、状态、交互、console 和 pnpm 验证证据。 | 关键场景无未解释差异；独立 Reviewer 通过 UI fidelity 轴。 |
| `work-unit.code-review` | project-instance | 独立代码审查与验证 | 不可变候选快照、Spec、Ticket、合同和执行结果。 | Standards、Spec、UI fidelity 三轴 Review 与 fresh verification。 | findings 已处理；修复后重新捕获候选并全量复审。 |
| `work-unit.release-and-retrospective` | project-instance | 发布与复盘 | 已审查候选、发布窗口和回滚点。 | 发布/回滚证据和复盘记录。 | 人工发布裁决、fresh verification 和治理回流均完成。 |
<!-- lifecycle-registry:work-units:end -->
