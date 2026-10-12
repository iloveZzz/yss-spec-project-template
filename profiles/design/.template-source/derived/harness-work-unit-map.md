# Harness 工作单元地图

<!-- lifecycle-registry:work-units:start -->
> 此表由 `.template-spec/process/lifecycle-registry.yaml` 生成；工作单元按 `scope` 区分模板维护与项目实例流程。

| 稳定 ID | 范围 | 工作单元 | 输入 | 输出 | 完成条件 |
|---|---|---|---|---|---|
| `work-unit.entry-triage` | template-source | 入口分诊 | 用户请求、仓库身份。 | 影响面与最近可信阶段。 | 身份和影响面可解释。 |
| `work-unit.ssot-update` | template-source | 单一事实源更新 | 变更合同。 | 权威文档或脚本。 | 其他投影可由脚本生成。 |
| `work-unit.skill-projection-sync` | template-source | 技能投影同步 | .agents/skills。 | Agent root 投影、skills lock。 | --check 通过。 |
| `work-unit.template-snapshot-build` | template-source | 模板快照构建 | 固定模板 commit。 | CLI bundled snapshot。 | commit 与 tree hash 可追踪。 |
| `work-unit.attach-sync-integration` | template-source | attach / sync 集成 | 目标仓库、dry-run 计划。 | 受管资产和 metadata。 | 验证通过或完整回滚。 |
| `work-unit.intensity-aware-verification` | template-source | 分级 Fresh verification | 变更仓库、强度分级与对应最低证据。 | 命令输出与证据。 | 日常按当前影响及依赖完成分级证据：L1 相关实际检查，L2 最小反例、自检和 Fresh Verification，L3 自检和 Fresh Verification；仅命中风险触发项补定向反例。等级不强制完整套件；main 集成验证和正式发布另核验完整适用集合。 |
| `work-unit.intensity-aware-review` | template-source | 分级审查 | 变更 diff、强度分级与验证证据。 | 维护者自检结论与阻断项；按需记录独立审查结果。 | 日常完成维护者自检并处理适用阻断项；L2/L3 不自动要求独立审查或冻结候选，明确采用独立审查路径时执行其严格合同。 |
| `work-unit.release-and-rollback` | template-source | 发布与回滚 | 已审查 commit。 | release note、观察信号、回滚点。 | 两仓库顺序和恢复动作明确。 |
| `work-unit.plan-opportunity` | project-instance | 机会调研 | 用户问题、市场/竞品事实需求和现有上下文。 | Plan 机会结论、证据、替代方案和关键假设。 | 机会继续/停止建议可审查；事实已 research 或记录为假设。 |
| `work-unit.plan-requirements` | project-instance | 需求分析 | 机会结论、用户反馈和领域词汇。 | 用户、MVP、非目标、成功标准、测试 seam 和未决项。 | frontier 清空；用户确认；无 runnable blocker。 |
| `work-unit.domain-strategy-design` | project-instance | 业务边界与协作梳理 | 已澄清的业务故事、业务词汇、约束和现有协作关系。 | 业务板块、业务责任区、协作与交接关系、统一业务词汇、已发生的业务事实、待确认的关键业务对象和不可违反的业务规则。 | 边界、语义方向、规则所有权和关键场景可审查；无未解释冲突。 |
| `work-unit.stage-decision` | project-instance | 方案决策包综合 | Plan、业务边界与规则设计、产品和商务输入。 | 带版本、digest、证据和下游映射的方案决策包。 | 必填字段、引用、影响面和下游消费验证通过；批准门禁完成。 |
| `work-unit.spec-synthesis` | project-instance | Spec 综合 | 已确认的 Plan 记录和测试 seam。 | Spec、产品总体设计和功能架构。 | Spec 与业务 Ticket 草案集合同时可审查，FR/AC 覆盖可读取；尚不具备实现资格。 |
| `work-unit.prototype-design` | project-instance | 原型设计与验证 | Spec、产品设计影响和状态矩阵。 | 交互说明、低/高保真原型、评审、AntD CLI 和浏览器证据。 | 原型评审、高保真验证和用户确认门禁均通过。 |
| `work-unit.technical-analysis` | project-instance | 技术分析与契约冻结 | Spec、原型、API/数据/工程影响面。 | OpenAPI、数据架构、Tactical DDD Check、工程基线、架构审查和 Slice 合同草案。 | 命中契约已冻结；无 API 影响有可读记录；命中领域影响时战术模型无未解释冲突；工程基线通过。 |
| `work-unit.ticket-decomposition` | project-instance | 垂直切片 Ticket 正式化 | 冻结 Spec、设计、契约和阻塞关系。 | 更新既有功能父 Ticket 的关联、形成垂直切片和批准的 Slice Implementation Contract。 | 切片可独立验证；生命周期复算后才能 ready-for-agent。 |
| `work-unit.business-ticket-formalization` | project-instance | 业务级 Ticket 正式化 | 已批准的 Spec、页面原型、业务边界与规则设计和方案决策包。 | 可追溯 FR/AC、规则、场景与设计的业务 Ticket 集；保持 ready-for-human。 | Ticket 范围、优先级、验收、依赖和业务风险可审查，并可纳入业务方案交接包。 |
| `work-unit.strategic-design-handoff` | project-instance | 业务方案交接 | 批准的业务边界与规则设计、方案决策包、Spec、页面原型和业务级 Ticket 集。 | 面向下游研发团队的业务方案交接包。 | Handoff v5 与来源资产已获当前批准；不可变交付目录自动成包并整包验证通过，交付记录已写入 checkpoint。研发接收可异步进行，不阻断本工作单元完成。 |
| `work-unit.slice-implementation` | project-instance | 垂直切片实现 | 当前版本 Slice Implementation Contract 和允许写路径。 | 前后端实现、TDD 和 YSS Skill Execution Result。 | 行为通过 `behavior-tdd`；UI 影响完成还原验证计划；无 drift/violation。 |
| `work-unit.frontend-implementation-verification` | project-instance | 前端实现还原验证 | 冻结原型、状态矩阵、实现候选和视觉验收用例。 | 桌面/窄屏视觉、状态、交互、console 和 pnpm 验证证据。 | 关键场景无未解释差异；独立 Reviewer 通过 UI fidelity 轴。 |
| `work-unit.code-review` | project-instance | 独立代码审查与验证 | 不可变候选快照、Spec、Ticket、合同和执行结果。 | Standards、Spec、UI fidelity 三轴 Review 与 fresh verification。 | findings 已处理；首轮覆盖全部适用审查项，修复后按差异、受影响结论及直接 / 传递依赖定向复审；未受影响结论仅凭可核验依据复用，全部结论重新绑定当前候选。 |
| `work-unit.release-and-retrospective` | project-instance | 发布与复盘 | 已审查候选、发布窗口和回滚点。 | 发布/回滚证据和复盘记录。 | 人工发布裁决、fresh verification 和治理回流均完成。 |
<!-- lifecycle-registry:work-units:end -->
