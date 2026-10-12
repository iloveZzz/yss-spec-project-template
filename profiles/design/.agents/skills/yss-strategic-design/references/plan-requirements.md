# 需求澄清与 Context 对账

`work-unit.plan-requirements` 由 `yss-strategic-design` 或当前 profile 编排器执行。主控按 `orchestration-contract.yaml` 的 `planning.clarification_policy` 对必须解决的需求、业务规则、范围或取舍决策未决项主动调用 `grilling`；术语整理按需使用 `domain-modeling`，不另建批准入口。

1. 读取 yss-project.yaml 与唯一根 CONTEXT.md，执行 `yss context check --root . --json`。缺失、大小写错误、嵌套合同、跨仓路径、伪锚点或不支持的 schema 都阻断；格式消费 `domain-modeling/CONTEXT-FORMAT.md`。
2. 先查可发现事实；事实缺口自行调查或交 `yss-research`，执行阻塞安排原型或实际验证，专业审查等待由主控自主派发，验证失败和缺证据先修复或补证。口头同意不能关闭这些问题；未确认的术语留在 Plan，不能写成稳定事实。
3. 调用 `grilling` 时提供当前范围、已核查事实与证据、已有且未变化的真实确认、未决项及问题依赖。同轮询问全部前提已明确的必要决策并给出建议，保留原始回复；依赖调查结果的问题暂缓，其他问题和无依赖工作继续。每轮回复后重算前沿，复用有效确认；用户纠正已有理解时只重开受影响的问题、结论及下游依赖。
4. 确认后由 domain-modeling 维护五列业务词汇表，以 `<ContextId>/<EnglishIdentifier>` 标识；非 Global 的 ContextId 来自已确认业务责任区。只有难以逆转、非显然且有真实取舍的决定才形成 ADR。研究和实际验证保留可读证据；非关键、非执行阻塞细节满足现有延期字段并随最终审阅包取得用户确认后才可交接。
5. `project-instance` 批准或返回下一工作单元前生成 `context_reconciliation`，保存可读 ref、document_digest、referenced_terms_digest 与 term_refs，并执行对账验证。候选、别名、范围冲突或摘要漂移均阻断；对账不另增门禁。`template-source` 仅校验模板合同并记录有原因的 `not-applicable`，不虚构业务术语。
6. 收敛时回述用户、问题与目标、MVP、非目标、成功标准、关键规则、验收例子及测试 seam、未决项结论与解决证据、剩余不确定性、对账状态和下一动作。按入口审阅合同固定完整包，把最终共同理解与 Plan 批准合并一次确认；中间各轮的决策回复不能替代此回复。
7. `checks.grill_exit=passed` 只表示澄清材料与前置条件就绪。完整 `grill_exit` 由主控结合当前真实 `gate.plan-approved` 决定和入口验证判定；最终回复前不宣布共同理解确认或 Plan 批准。外部 `plan_user_decision_ref` 不回写审阅包或其 `basis`，避免摘要循环；未回流 blocker 不得进入 Spec。
8. 共享理解与变更范围未确认前不改实现合同或代码；澄清结果不能批准资产、设置 ready-for-agent 或自行推进阶段，交回当前编排器验收。

起草 Plan 使用 `.template-spec/plan/templates/plan-template.md`，Spec 使用 `.template-spec/templates/spec-template.md`；显式 `to-spec` 使用同一模板。可选只读诊断及未评估项见 `.template-spec/process/plan-spec-quality.md`，不增加阶段门禁。
