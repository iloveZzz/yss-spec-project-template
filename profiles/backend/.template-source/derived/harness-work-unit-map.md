# Harness 工作单元地图

<!-- lifecycle-registry:work-units:start -->
> 此表由 `.template-spec/process/lifecycle-registry.yaml` 生成；工作单元按 `scope` 区分模板维护与项目实例流程。

| 稳定 ID | 范围 | 工作单元 | 输入 | 输出 | 完成条件 |
|---|---|---|---|---|---|
| `work-unit.harness-entry` | project-instance | Harness 入口校验 | yss-project.yaml、CONTEXT.md 和已确认的上游输入。 | 影响面、仓库上下文和上游输入证据。 | 身份、输入版本和写入边界可解释。 |
| `work-unit.technical-design` | project-instance | 技术设计 | Spec、战略设计、状态矩阵、API / 数据约束和工程约束；新建后端的架构与平台候选，或既有工程当前登记的架构与固定工程基线。 | 新建后端的 DDD / MVC 与精确 Spring Boot 版本用户决定，或既有工程复用核验；Technical Design Contract、架构决策和测试 seam。 | 新建后端的 gate.backend-architecture-platform-approved 已通过，既有工程已核验复用并记录该门禁不适用；后端 Technical Design 已批准且当前；数据架构决定完整；工程合同批准记录真实、当前并绑定资产摘要。 |
| `work-unit.implementation-repository-preparation` | project-instance | 实现仓库准备 | Strategic Handoff 消费结果、Context reconciliation、批准且当前的 Technical Design、Data Architecture Decision、工程合同批准和实现仓库位置。 | Repository Onboarding Result，或 Scaffold Contract/Manifest v4 与 empty-scaffold-verified 证据；汇总 Preparation Result v2。 | 既有仓库接入完成或纯机械骨架验证完成；历史 v3 仅在所有权未改、设计补齐和恢复批准通过时复用；提前业务代码保持 blocked。 |
| `work-unit.slice-contract` | project-instance | Slice Contract 编译与批准 | 当前上游资产、Tactical Design、API / 数据 / UI 影响和实现仓库登记。 | 当前版本 Slice Implementation Contract 和四角色任务包草案。 | 合同通过校验并满足 ready-for-agent 公式。 |
| `work-unit.slice-implementation` | project-instance | 垂直切片实现 | 已批准且版本当前的 Slice Implementation Contract。 | 前端、后端和测试实现及 YSS Skill Execution Result。 | 行为测试、工程验证、契约一致性和写入边界全部满足。 |
| `work-unit.verification` | project-instance | 独立验证 | 实现候选、合同、验收标准和测试 seam。 | Fresh Verification、Review 结果和 checkpoint。 | 测试 Agent 独立验证通过，且无阻塞信号。 |
| `work-unit.ssot-update` | template-source | Harness 权威资产更新 | 模板维护变更合同。 | 权威文档、schema、脚本或技能。 | 权威资产可被校验器读取。 |
| `work-unit.skill-projection-sync` | template-source | 技能投影同步 | .agents/skills 和 skills-lock.json。 | 各 Agent runtime root 的同步投影。 | scripts/sync-skills --check 通过。 |
| `work-unit.intensity-aware-verification` | template-source | 分级 Fresh Verification | 变更仓库、维护强度和最低证据。 | 校验命令输出与维护证据。 | 命中等级的结构、行为和压力验证通过。 |
| `work-unit.intensity-aware-review` | template-source | 分级独立审查 | 变更 diff、维护强度和验证证据。 | self-check、聚焦审查或正式独立审查结论。 | 没有未处理阻断项。 |
| `work-unit.release-and-rollback` | template-source | Harness Checkpoint 与回滚 | 已审查模板资产。 | Checkpoint、回滚点和发布说明。 | 变更边界和恢复动作可追溯。 |
| `work-unit.plan-opportunity` | project-instance | 机会调研 | 用户问题、市场/竞品事实需求和现有上下文。 | Plan 机会结论、证据、替代方案和关键假设。 | 机会继续/停止建议可审查；事实已 research 或记录为假设。 |
| `work-unit.plan-requirements` | project-instance | 需求分析 | 机会结论、用户反馈和领域词汇。 | 用户、MVP、非目标、成功标准、测试 seam 和未决项。 | frontier 清空；用户确认；无 runnable blocker。 |
| `work-unit.domain-strategy-design` | project-instance | DDD 战略设计 | 已澄清的业务场景、领域词汇、约束和现有上下文。 | 子域、限界上下文、Context Map、统一语言、事件、核心领域概念候选和不变量。 | 边界、语义方向、规则所有权和关键场景可审查；无未解释冲突。 |
| `work-unit.stage-decision` | project-instance | 阶段决策包综合 | Plan、DDD 战略设计以及产品经理负责的商业约束输入。 | 带版本、digest、证据和下游映射的阶段决策包。 | 必填字段、引用、影响面和下游消费验证通过；批准门禁完成。 |
| `work-unit.spec-synthesis` | project-instance | Spec 综合 | 已确认的 Plan 记录和测试 seam。 | Spec、产品总体设计、功能架构及业务 Ticket 草案集合。 | Spec 和业务 Ticket 草案可审查，FR/AC 覆盖与依赖可读取；进入 ready-for-human，下游推进仍需 gate.spec-baseline-approved。 |
<!-- lifecycle-registry:work-units:end -->
