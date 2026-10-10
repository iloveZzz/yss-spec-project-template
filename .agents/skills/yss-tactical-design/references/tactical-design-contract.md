# Tactical DDD Design Contract

## 输入

必须引用批准且版本当前的 Spec、功能架构、战略 DDD、适用 UI 状态矩阵、OpenAPI Draft / Freeze（或无 API 影响记录）、ADR 和工程约束。来自 Strategic Design Handoff 时，按仓库 `.template-spec/process/strategic-handoff-package.md` 的版本与消费者规则绑定交接包、`strategic_context_import_ref` 和目标仓 `context_reconciliation_ref`；历史 v3/v4 只按冻结 schema 兼容读取，新交付使用 v5。原型或 existing UI baseline 须符合该包的来源分支；目标根 `CONTEXT.md` 未完成增量对账前返回 `blocked`。所有引用都必须带版本或 digest；不可读或过期引用返回 `blocked` / `stale`。

## 输出

以下 v1 结构作为新 Technical Design Contract v2 的 DDD `design` 内容使用。旧独立 v1 文件保持显式只读兼容；新合同共同头与战略交接绑定由 `yss-technical-design` 持有，分支不重复保存。

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

对象命名及阿里/COLA 适配消费 `.template-spec/agents/backend-architecture-profiles.md` 的“对象命名与外部规范适配”。`entity_catalog` 记录领域身份与行为；`persistence_mapping` 记录对应持久化 PO、字段/值对象转换及职责归属，不把数据库 DO 的表结构复制成领域模型。类型名来自当前工程基线和设计，不新增第二套命名合同。

跨仓快照消费在 v2 共同头（旧独立 v1 则为根对象）绑定 `strategic_handoff`；字段与实际命令以 `.template-spec/process/strategic-handoff-package.md` 为准。
