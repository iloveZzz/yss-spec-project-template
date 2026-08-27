# Tactical DDD Design Contract

## 输入

必须引用批准且版本当前的 Spec、功能架构、战略 DDD、原型状态矩阵、OpenAPI Draft / Freeze（或无 API 影响记录）、ADR 和工程约束。所有引用都必须带版本或 digest；不可读或过期引用返回 `blocked` / `stale`。

## 输出

```yaml
schema_version: 1
tactical_design_id: tactical-design.<feature>
tactical_version: v1
status: draft | ready-for-human | approved | blocked | stale | drift | new_impacts | not-applicable
context_ref: <限界上下文引用>
aggregate_catalog: []
entity_catalog: []
value_object_catalog: []
behavior_catalog: []
invariant_catalog: []
state_transition_catalog: []
consistency_policy: {}
domain_event_catalog: []
gateway_catalog: []
persistence_mapping: []
test_seams: []
adr_candidates: []
upstream_impact: {}
version: v1
digest: sha256:<digest>
evidence_refs: []
```

## 设计规则

1. 聚合边界由业务行为和不变量决定，不由数据库表或外键自动推导。
2. 每个聚合根必须列出行为、不变量和一致性边界。
3. 状态转换必须绑定领域行为，禁止只有状态字段而没有行为语义。
4. Gateway 接口属于 Domain，Repository / Mapper / GatewayImpl 属于 Infrastructure。
5. OpenAPI schema 使用上下文公开语言，不泄漏内部聚合或持久化结构。
6. 复杂跨聚合一致性、并发、幂等、事件补偿或持久化错位必须写明策略，必要时升级独立文档。
7. 实现发现新影响时必须阻断并回到生命周期重新路由。
