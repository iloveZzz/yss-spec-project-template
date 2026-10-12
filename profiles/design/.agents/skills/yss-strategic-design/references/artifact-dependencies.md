# 资产依赖与失效传播

## 本地依赖链

```text
Plan → Domain Strategy → Stage Decision Package
Plan + Stage Decision Package → Spec / Product Overview / Functional Architecture
Spec + Product Overview → Product Design → H1/H2 Prototype → User Confirmation
Approved strategic assets → Business Ticket Set → Strategic Design Handoff
```

Strategic Design Handoff 是本 profile 的终点。Tactical DDD、OpenAPI、技术 Ticket、Slice Contract、实现、代码审查和发布属于下游研发 profile；本地只能在交付包中记录其问题、责任人、验证建议和版本边界，不能创建或批准对应资产。

## 传播算法

1. 将变化分类为 `wording`、`ui-state`、`domain-boundary` 或 `business-invariant`。
2. 只遍历 `orchestration-contract.yaml.impact_propagation` 中与该类型匹配的边。
3. 受影响下游先标记 `stale`，保留原资产和因果引用，不立即重建。
4. 条件不满足时保持原状态，尤其不得把 `not-applicable` 改为 `stale`。
5. 无法分类时暂停影响面裁决；不得推测下游技术影响。

每个 `stale` 节点必须记录 `stale_by`、影响类型、证据引用和重新批准条件。direct 节点重新批准后，逐个复核 transitive 节点；仅当全部受影响上游恢复为 `approved/not-applicable` 且本节点重新验证通过，才能移除 `stale`。

明确写入需求的认证、授权、租户隔离、敏感数据或合规变化，按其实际改变的业务不变量、领域边界或 UI 状态传播；潜在 API、数据或实现影响写入 Strategic Design Handoff，交由下游重新分类。
