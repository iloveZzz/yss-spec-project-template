# 资产依赖与失效传播

## 基础依赖

```text
Discovery → Spec → Product Overview / Functional Architecture
Spec + Product Overview → Product Design / Requirement Freeze
Spec + Product Overview → API Impact / OpenAPI Draft
Spec + Product Overview → System / Data Architecture
API impact = yes: Requirement Freeze + Design Review + Draft Review → OpenAPI Freeze
API impact = no: API Impact Assessment approved → No-API-Impact record；Draft/Freeze gates = not-applicable
Frozen Contract → Vertical Slice Tickets
Tickets + Architecture → Implementation Contract / Build Architecture Checklist
Implementation → Independent Review → Fresh Verification → Release
```

## 传播算法

1. 分类变化：文案、UI 状态、权限、API schema、状态机、数据模型、服务边界、NFR、部署、安全。
2. 只遍历与变化类型相关的边。
3. 受影响下游先标记 `stale`；不要删除或立即重建。
4. 移除相关切片的 `ready-for-agent`，直到必要门禁重新为 `approved/not-applicable`。
5. 重新审查后优先恢复原 Ticket；仅在范围或验收目标根本变化时重建。
6. 原 `not-applicable` 的条件被推翻时，改为 `missing` 或 `draft`。

具体 `impact type → artifact/gate → direct/transitive → when` 以 `orchestration-contract.yaml` 为机器可执行事实。条件满足时，`direct` 节点直接标记 `stale`；`transitive` 节点仅在其依赖的 direct 节点发生语义变化时传播。条件不满足时保持原状态，尤其不得把 `not-applicable` 改成 `stale`。表中未列出的节点不传播；无法分类的变化暂停影响面裁决，不得猜测。

每个 `stale` 节点必须记录 `stale_by`、影响类型、证据引用和重新批准条件。重新批准 direct 节点后，逐个重新核验 transitive 节点；只有其全部受影响上游恢复为 `approved/not-applicable` 且本节点重新验证通过，才能移除 `stale`。

权限/状态机变化通常影响 Spec/Spec Delta、页面权限状态、OpenAPI security/errors、Design Review、Ticket 验收和测试映射；不会自动使竞品情报或完整业务架构失效。

OpenAPI Freeze 后发生上游变化时，不得仅因父 Ticket 仍写阶段 6 就继续实现。先做影响分析，再精准更新相关资产和门禁。
