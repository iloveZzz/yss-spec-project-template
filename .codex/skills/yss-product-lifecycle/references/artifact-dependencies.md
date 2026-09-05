# 资产依赖与失效传播

## 基础依赖

```text
Discovery → Spec → Product Overview / Functional Architecture
Root CONTEXT.md + current work-unit changes → Context Reconciliation → approval / next work unit
Spec + Product Overview → Product Design / Requirement Freeze
Spec + Product Overview → API Impact / OpenAPI Draft
Spec + Product Overview → System / Data Architecture
System / Data Architecture + domain impact → Tactical DDD Check / tactical-design contract
Tactical DDD contract → Architecture Review / Engineering Baseline / Slice Implementation Contract
API impact = yes: Requirement Freeze + Design Review + Draft Review → OpenAPI Freeze
API impact = no: API Impact Assessment approved → No-API-Impact record；Draft/Freeze gates = not-applicable
Frozen Contract → Vertical Slice Tickets
Tickets + Architecture → Implementation Contract / Build Architecture Checklist
Implementation → Independent Review → Fresh Verification → Release
```

## 传播算法

1. 分类变化：文案、UI 状态、API schema、状态机、数据模型、服务边界、NFR、部署。
2. 只遍历与变化类型相关的边。
3. 受影响下游先标记 `stale`；不要删除或立即重建。
4. 移除相关切片的 `ready-for-agent`，直到必要门禁重新为 `approved/not-applicable`。
5. 重新审查后优先恢复原 Ticket；仅在范围或验收目标根本变化时重建。
6. 原 `not-applicable` 的条件被推翻时，改为 `missing` 或 `draft`。

具体 `impact type → artifact/gate → direct/transitive → when` 以 `orchestration-contract.yaml` 为机器可执行事实。条件满足时，`direct` 节点直接标记 `stale`；`transitive` 节点仅在其依赖的 direct 节点发生语义变化时传播。条件不满足时保持原状态，尤其不得把 `not-applicable` 改成 `stale`。表中未列出的节点不传播；无法分类的变化暂停影响面裁决，不得猜测。

每个 `stale` 节点必须记录 `stale_by`、影响类型、证据引用和重新批准条件。重新批准 direct 节点后，逐个重新核验 transitive 节点；只有其全部受影响上游恢复为 `approved/not-applicable` 且本节点重新验证通过，才能移除 `stale`。

明确写入需求的认证、授权、租户隔离、敏感数据或合规行为变化不使用独立影响类型；按它实际改变的 UI 状态、API schema、状态机、数据模型或服务边界传播。普通 action 注册、SQL / DDL / 迁移和上传 / 下载只使用既有技术影响类型，不增加安全 / 权限传播。

OpenAPI Freeze 后发生上游变化时，不得仅因父 Ticket 仍写阶段 6 就继续实现。先做影响分析，再精准更新相关资产和门禁。

战术设计合同上游引用发生版本变化时，先将 tactical-design 标记为 `stale`，再传播到 Slice Contract；发现新的聚合、状态、不变量、一致性或 Gateway 影响时标记 `drift` / `new_impacts` 并重新路由。

`CONTEXT.md` 全文摘要变化时，先复核当前和下游资产保存的 `document_digest`；只有其 `referenced_terms_digest` 也变化，才将实际引用这些术语的资产精准标记为 `stale`。无法解析、作用域变化或候选术语未确认时阻断批准/流转，不得用嵌套文件、跨仓路径或 Markdown 锚点绕过。
