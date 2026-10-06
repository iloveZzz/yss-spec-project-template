# 需求澄清与 Context 对账

`work-unit.plan-requirements` 由 `yss-product-lifecycle` 或当前 profile 编排器执行。发现必须确认的需求、业务规则、范围或取舍未决项时，按 `planning.clarification_policy` 主动调用 `grilling`；术语工作使用 `domain-modeling`。不另建批准入口。

1. 读取 yss-project.yaml 与唯一根 CONTEXT.md，执行 `yss context check --root . --json`。缺失、大小写错误、嵌套合同、跨仓路径、伪锚点或不支持的 schema 都阻断；格式消费 `domain-modeling/CONTEXT-FORMAT.md`。
2. 自行查证可发现事实，技术事实路由 `yss-research`，可执行阻塞安排原型或实际验证，专业审查由主控派发，验证失败修复或补证。真正用户决定才组成当前决策前沿；调查未完成只等待依赖该事实的问题，其他必要问题和独立已授权工作继续。未确认的术语留在 Plan，不能写成稳定事实。
3. 依问题依赖分轮询问全部当前可回答的必要问题，每题给出建议，保留真实原始回复；回复后再推进依赖问题。复用未变化的确认，用户纠正理解时只重开受影响问题及依赖。不能用口头同意代替事实、实验或审查证据。
4. 确认后由 domain-modeling 维护五列业务词汇表，以 `<ContextId>/<EnglishIdentifier>` 标识；非 Global 的 ContextId 来自已确认业务责任区。只有难以逆转、非显然且有真实取舍的决定才形成 ADR。研究和实际验证保留可读证据。
5. `project-instance` 批准或返回下一工作单元前生成 `context_reconciliation`，保存可读 ref、document_digest、referenced_terms_digest 与 term_refs，并执行对账验证。候选、别名、范围冲突或摘要漂移均阻断；对账不另增门禁。`template-source` 仅校验模板合同并记录有原因的 `not-applicable`，不虚构业务术语。
6. 收敛时回述用户问题、目标、MVP、非目标、关键规则、验收例子、未决项结论及剩余不确定性，核对解决证据和非关键延期交接。`checks.grill_exit=passed` 表示准备就绪，仍待最终真实决定。固定完整 Plan 审阅包后，将共同理解与当前 Plan 批准范围合并展示、取得同一真实回复；回复存入外部 `plan_user_decision_ref`，不回写审阅包或其 `basis`。入口通过准备检查和当前决定后才判定完整 `grill_exit`；既有批准仅按用户决定协议核验延续。
7. 结束时列出已确认决定、未决假设、变更文档、对账状态与引用、下一授权动作。未回流 blocker 不得进入 Spec。共同理解与变更范围未确认前不改实现合同或代码；澄清结果不能批准资产、设置 ready-for-agent 或自行推进阶段，交回当前编排器验收。

起草 Plan 使用 `.template-spec/plan/templates/plan-template.md`，Spec 使用 `.template-spec/templates/spec-template.md`；显式 `to-spec` 使用同一模板。可选只读诊断及未评估项见 `.template-spec/process/plan-spec-quality.md`，不增加阶段门禁。
