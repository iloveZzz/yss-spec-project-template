# Harness 工作单元地图

<!-- lifecycle-registry:work-units:start -->
> 此表由 `.template-spec/process/lifecycle-registry.yaml` 生成；工作单元按 `scope` 区分模板维护与项目实例流程。

| 稳定 ID | 范围 | 工作单元 | 输入 | 输出 | 完成条件 |
|---|---|---|---|---|---|
| `work-unit.harness-entry` | project-instance | Harness 入口校验 | yss-project.yaml、CONTEXT.md 和已确认的上游输入。 | 影响面、仓库上下文和上游输入证据。 | 身份、输入版本和写入边界可解释。 |
| `work-unit.slice-contract` | project-instance | Slice Contract 编译与批准 | 当前上游资产、前端工程设计、条件化 Backend Delivery、API / 数据 / UI 影响和实现仓库登记。 | 当前版本 Slice Implementation Contract 和四角色任务包草案。 | 合同通过校验并满足 ready-for-agent 公式。 |
| `work-unit.slice-implementation` | project-instance | 垂直切片实现 | 已批准且版本当前的 Slice Implementation Contract。 | 前端、后端和测试实现及 YSS Skill Execution Result。 | 行为测试、工程验证、契约一致性和写入边界全部满足。 |
| `work-unit.verification` | project-instance | 独立验证 | 实现候选、合同、验收标准和测试 seam。 | Fresh Verification、Review 结果和 checkpoint。 | 测试 Agent 独立验证通过，且无阻塞信号。 |
| `work-unit.ssot-update` | template-source | Harness 权威资产更新 | 模板维护变更合同。 | 权威文档、schema、脚本或技能。 | 权威资产可被校验器读取。 |
| `work-unit.skill-projection-sync` | template-source | 技能投影同步 | .agents/skills 和 skills-lock.json。 | 各 Agent runtime root 的同步投影。 | scripts/sync-skills --check 通过。 |
| `work-unit.intensity-aware-verification` | template-source | 分级 Fresh Verification | 变更仓库、维护强度和最低证据。 | 校验命令输出与维护证据。 | 命中等级的结构、行为和压力验证通过。 |
| `work-unit.intensity-aware-review` | template-source | 分级独立审查 | 变更 diff、维护强度和验证证据。 | self-check、聚焦审查或正式独立审查结论。 | 没有未处理阻断项。 |
| `work-unit.release-and-rollback` | template-source | Harness Checkpoint 与回滚 | 已审查模板资产。 | Checkpoint、回滚点和发布说明。 | 变更边界和恢复动作可追溯。 |
| `work-unit.frontend-engineering-design` | project-instance | 前端工程设计 | 当前战略与后端联合接收结果、视觉基线、真实接口和实现仓约束。 | 前端工程设计、frontend_implementation_plan 草案与可执行验收用例。 | 输入仍然有效，设计可审阅且可进入前端 Slice Contract 准备；不放行代码实现。 |
| `work-unit.plan-opportunity` | project-instance | 机会调研 | 用户问题、市场/竞品事实需求和现有上下文。 | Plan 机会结论、证据、替代方案和关键假设。 | 机会继续/停止建议可审查；事实已 research 或记录为假设。 |
| `work-unit.plan-requirements` | project-instance | 需求分析 | 机会结论、用户反馈和领域词汇。 | 用户、MVP、非目标、成功标准、测试 seam 和未决项。 | frontier 清空；用户确认；无 runnable blocker。 |
| `work-unit.domain-strategy-design` | project-instance | DDD 战略设计 | 已澄清的业务场景、领域词汇、约束和现有上下文。 | 子域、限界上下文、Context Map、统一语言、事件、核心领域概念候选和不变量。 | 边界、语义方向、规则所有权和关键场景可审查；无未解释冲突。 |
| `work-unit.stage-decision` | project-instance | 阶段决策包综合 | Plan、DDD 战略设计以及产品经理负责的商业约束输入。 | 带版本、digest、证据和下游映射的阶段决策包。 | 必填字段、引用、影响面和下游消费验证通过；批准门禁完成。 |
| `work-unit.spec-synthesis` | project-instance | Spec 综合 | 已确认的 Plan 记录和测试 seam。 | Spec、产品总体设计、功能架构及业务 Ticket 草案集合。 | Spec 和业务 Ticket 草案可审查，FR/AC 覆盖与依赖可读取；进入 ready-for-human，下游推进仍需 gate.spec-baseline-approved。 |
| `work-unit.prototype-design-v2` | project-instance | 原型设计与验证 | Spec、产品设计影响和状态矩阵。 | 交互说明、低保真、状态矩阵、H1/H2 原型交付物、统一 Design QA、档位验证证据与前端实现交接事项。 | 低保真评审、schema v4 原型交付物验证和用户确认门禁均通过；Visual Baseline Bundle 和生产组件待验事项已交接到前端实现计划。 同步校准业务 Ticket，复用稳定 ID，随后进入业务正式化。 |
<!-- lifecycle-registry:work-units:end -->
