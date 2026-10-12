# 需求澄清与 Context 对账

`work-unit.harness-entry` 的需求澄清 由 `harness-orchestrator` 或当前 profile 编排器执行，按需使用 `grilling` 和 `domain-modeling`，不另建批准入口。

1. 读取 yss-project.yaml 与唯一根 CONTEXT.md，执行 `yss context check --root . --json`。缺失、大小写错误、嵌套合同、跨仓路径、伪锚点或不支持的 schema 都阻断；格式消费 `domain-modeling/CONTEXT-FORMAT.md`。
2. 先查可发现事实；真正用户决定才组成当前决策前沿，每个问题给出建议，保留原始回复。未确认的术语留在 Plan，不能写成稳定事实。
3. 确认后由 domain-modeling 维护五列业务词汇表，以 `<ContextId>/<EnglishIdentifier>` 标识；非 Global 的 ContextId 来自已确认业务责任区。只有难以逆转、非显然且有真实取舍的决定才形成 ADR。研究和实际验证保留可读证据。
4. `project-instance` 批准或返回下一工作单元前生成 `context_reconciliation`，保存可读 ref、document_digest、referenced_terms_digest 与 term_refs，并执行对账验证。候选、别名、范围冲突或摘要漂移均阻断；对账不另增门禁。`template-source` 仅校验模板合同并记录有原因的 `not-applicable`，不虚构业务术语。
5. 结束时列出已确认决定、未决假设、变更文档、对账状态与引用、下一授权动作。按既有退出判定确认用户、问题、MVP、非目标、成功标准及测试 seam，未回流 blocker 不得进入 Spec。
6. 共享理解与变更范围未确认前不改实现合同或代码；澄清结果不能批准资产、设置 ready-for-agent 或自行推进阶段，交回当前编排器验收。

起草 Plan 使用 `.template-spec/plan/templates/plan-template.md`，Spec 使用 `.template-spec/templates/spec-template.md`；显式 `to-spec` 使用同一模板。可选只读诊断及未评估项见 `.template-spec/process/plan-spec-quality.md`，不增加阶段门禁。
