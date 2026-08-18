# 模板维护发布候选 L3 记录

## 范围与分级

- 强度：L3。
- 触发项：`lifecycle-gate`、`permission-boundary`、`core-validator`、`aggregate-behavior-change`、`release-candidate`。
- 范围：本候选从 `9f1b423882eb79c13911da3b49d78c5b1ded4a72` 起的全部未提交技能、生命周期规则、校验器、投影、锁文件、派生文档和审查记录。
- 原因：候选同时改变 lifecycle work unit 的 user-invoked 边界、Git 授权与正式资产所有权，更新核心模板验证，并退役共享 skill；必须作为整体发布候选审查，不能分别降级。

## RED

- 在临时 detached worktree 中保留固定基线 `9f1b423882eb79c13911da3b49d78c5b1ded4a72`，仅置换候选 `scripts/lib/scenario-checks.mjs` 与 `scripts/verify-matt-yss-integration-scenarios` 后执行后者，基线以缺少 `Workflow Execution Result` 返回失败。
- 向 `scripts/verify-maintenance-intensity-scenarios` 增加“校验器不得硬编码 `LEVEL_BY_TRIGGER`，且必须加载 `maintenance-intensity.yaml`”断言；修订前以该断言返回失败。

## GREEN

- 将维护强度 trigger → 最低等级映射迁移到 `docs/process/maintenance-intensity.yaml`；`scripts/lib/maintenance-intensity.mjs` 只解析并执行该权威策略。
- `scripts/verify-maintenance-intensity-scenarios` 覆盖该消费边界，并继续覆盖 L1/L2/L3 的接受与拒绝场景。
- 生命周期调用边界、`Workflow Execution Result`、Git 授权和投影一致性由 Matt/YSS 压力场景验证。

## 审查补正：完成态结果协议

- RED：`scripts/verify-matt-yss-integration-scenarios` 在 canonical 契约缺少 `workflow_reference`、完成态证据和阻断信号字段时返回失败。
- GREEN：canonical `workflow_execution_result` 明确 `result_values`、`required`、`blocking_signals`、完成态空/非空字段、可读证据和无阻断信号条件；场景以一个可完成结果和缺 `workflow_reference`、空证据、不可读证据、`drift`、新影响五类变异验证。
- REFACTOR：旧 `matt_skill_result` 保持只读兼容，不再承载 canonical 路由约束；新协议成为完成态裁决的唯一结构来源。

## REFACTOR 与验证

- 流程文档只解释分级决策，`AGENTS.md` 明确映射的唯一事实来源；不再与校验器重复维护 trigger 列表。
- `scripts/verify-template` 将维护强度策略列为模板必需文件，防止分发候选缺失该权威资产。

正式独立审查会固定功能候选的 commit SHA；审查完成后，审查报告与可执行的 Maintenance checkpoint 作为只含证据的后续 checkpoint 提交，避免证据写入本身使被冻结候选失效。
