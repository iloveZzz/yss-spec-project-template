# Harness 执行蓝图

Harness 以仓库身份、影响面、条件门禁和可读证据串联研发流程。执行编排器只推进第一个未阻塞工作单元，并在人工暂停、handoff、实现、合并和发布边界集中回写 checkpoint。

## 当前分支 profile：业务上游战略设计交付

本分支启用 `harness.business-ddd-strategy-handoff`，本地目标用户仅为产品、需求和商务。`role.lifecycle-orchestrator` 是控制平面，不作为业务用户；项目经理、前后端工程师和测试工程师只作为下游完整研发模板的兼容角色保留。

本地终点不是 Spec、OpenAPI 或代码，而是 Strategic Design Handoff：引用批准且版本当前的 DDD 战略设计与阶段决策包，明确下游战术设计问题、延后决策责任和证据 digest，交付给 `downstream-rd-team` 使用 `yss-tactical-design` 接管。

机器可读边界见 [`docs/process/harness-profile.yaml`](harness-profile.yaml)，交付包模板和 Schema 见 [`docs/templates/strategic-design-handoff-template.yaml`](../templates/strategic-design-handoff-template.yaml) 与 [`docs/process/schemas/strategic-design-handoff.schema.json`](schemas/strategic-design-handoff.schema.json)。

## 核心不变量

- `template-source` 只维护流程模板，不生成具体产品资产。
- `project-instance` 必须从最近可信阶段进入，不以目录猜测门禁状态。
- 命中条件的门禁未通过时，状态保持 blocked 或 needs-human。
- 没有 fresh verification 和可解析 evidence refs 时，不宣布完成。
