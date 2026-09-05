# 方案决策包合同

内部对象 `stage_decision_package` 是 Discovery、需求/产品/商务决策与业务边界和规则设计之间的冻结入口。它记录“做什么、为什么做、范围是什么、哪些仍未决”，不复制业务边界与规则事实。

## 必须包含

- 问题陈述、目标用户、MVP、非目标、成功标准和可执行的测试 seam；
- 已确认决策、假设、约束和未决项；
- `context_snapshot`：只引用根 `CONTEXT.md`，并绑定结构化术语身份、全文摘要和引用集摘要；
- `domain_strategy_ref`：领域战略合同的稳定 ID、版本、digest 和批准状态；
- UI/API/Data/Backend/Frontend/跨仓/高风险影响面布尔值；
- 每个下游消费者的传播方式、重新批准条件、证据引用和批准记录。`approval.approval_ref` 必须指向可读取且通过 `scripts/verify-approval-record` 的 `gate.stage-decision-package-approved` 会签记录；`approval.approver` 必须与记录中的 `role_id` 一致。

## 未决项规则

`blocker` 必须阻断批准；`deferred` 必须同时记录责任人、下一动作和目标版本/发布日期。没有责任人或恢复路径的未决项不得隐藏在备注中。

## 下游消费规则

只有 `approved` 且引用的领域战略为 `approved`、版本当前的阶段包，才可以进入 Spec synthesis。任何领域战略 digest、版本或影响面变化都使阶段包 `stale`，并要求重新评估。

阶段包使用 `schema_version: 2`。旧版字符串路径或 Markdown 锚点只能通过迁移器读取；无法唯一映射到 `<ContextId>/<EnglishIdentifier>` 时返回 `migration-required`，不得猜测。
