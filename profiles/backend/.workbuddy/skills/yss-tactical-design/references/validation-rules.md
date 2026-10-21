# Tactical DDD Validation Rules

- 根对象必须包含合同要求的字段，状态只能使用生命周期状态集合。
- `aggregate_catalog`、`behavior_catalog`、`invariant_catalog`、`state_transition_catalog`、`consistency_policy` 和 `test_seams` 不能为空。
- 聚合、Entity、Value Object、行为、不变量、状态转换、事件和 Gateway ID 必须唯一且引用已声明对象。
- 聚合根必须是 Entity；Entity 和 Value Object 不得跨聚合隐式共享身份。
- 每个行为至少引用一个聚合和一个不变量；每个状态转换必须引用已声明行为。
- `api_exposure: internal-only` 是内部聚合的唯一允许值；其他值需要回到 API 影响分析。
- Gateway 的 `layer` 必须为 `Domain`，持久化实现不得出现在 Domain 目录。
- `consistency_policy` 必须说明事务边界、并发、幂等和跨聚合策略。
- 上游引用发生版本变化时，设计标记为 `stale`，不得进入 `approved` 或 `ready-for-agent`。
- 若合同标记 `model_origin: strategic-concept`，必须阻断并要求完成战术细化。
- 当 `complexity.escalate_to_standalone` 为真时，必须提供独立文档引用；否则仅允许作为嵌入式 Tactical DDD Check 消费。
