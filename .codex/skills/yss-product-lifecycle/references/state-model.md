# 生命周期状态模型

## 命名空间

| 域 | 允许值 |
|---|---|
| `lifecycle.status` | `routing`、`running`、`paused-human-gate`、`blocked`、`completed` |
| `workflow.status` | `not-started`、`active`、`paused`、`resolved`、`failed` |
| `artifacts.*.status` | `missing`、`draft`、`ready-for-human`、`approved`、`stale`、`not-applicable` |
| `gates.*.status` | `not-evaluated`、`blocked`、`ready-for-human`、`approved`、`stale`、`not-applicable` |
| `ticket.role` | `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix` |

Matt 五态不得扩义。资产的 `ready-for-human` 与 Ticket label 必须带命名空间表达。

## `ready-for-agent` 公式

仅当以下全部为真，垂直切片 Ticket 才能获得该角色：

```text
required gates ∈ {approved, not-applicable}
AND related artifacts 不含 stale
AND blocking edges 全部关闭
AND implementation repo/branch/CI/test/rollback 已明确
AND Slice Implementation Contract 已由生命周期编排器批准并持久化
AND 当前工作单元消费的 contract_id/version 与最新批准版本一致
AND Backend Slice Implementation Contract（后端适用）和 Build Architecture Checklist 已完成
```

父 Ticket、Spec、设计、原型、OpenAPI Draft、wayfinder map 和 decision ticket 不得使用 `ready-for-agent`。

## 状态块

状态块位于功能父 Ticket；平台不可用时位于 stage checkpoint。只保存索引、状态、引用和因果关系：

```yaml
lifecycle:
  schema_version: 1
  mode: resume
  stage: system-data-architecture-and-contract-review
  status: blocked
workflow:
  matt_flow: main
  active_skill: yss-openapi-draft-review
  status: paused
artifacts:
  spec: {status: approved, ref: docs/requirements/example-spec.md}
  openapi: {status: stale, ref: docs/api/specs/example.yaml, stale_by: [spec]}
gates:
  openapi_freeze: {status: stale}
tracker:
  parent_ticket: <url>
  role: ready-for-human
pause:
  reason_code: human-gate
  gate_ref: requirement-freeze
  owner_or_authority: product-owner
  resume_condition: requirement-freeze-approved
  next_work_unit: api-impact-assessment
```

## Schema 兼容与迁移

- 当前只支持 `schema_version: 1`，支持版本列表以 `orchestration-contract.yaml` 为准。
- 版本缺失、解析失败或版本不在支持列表时，必须暂停并进入迁移检查；不得按 v1 猜测、覆盖或降级写回。
- 父 Ticket 状态块优先作为主索引；本地 checkpoint 只在平台不可用时降级。两者版本或内容冲突时，不做字段级静默合并：读取真实资产重建新状态，保留旧块引用和迁移记录，再由人工确认主载体。
- 不得用旧版本状态覆盖较新版本。迁移记录至少包含来源版本、目标版本、来源载体、冲突、真实资产证据、迁移人和时间。

## Resume

读取状态块后必须重新读取引用资产、审查记录、Ticket 最新事件和相关 Git 变化。时间戳只能提示变化，不能单独证明语义失效；应比较内容和影响面。冲突时以权威资产为准，记录修复原因，然后重算依赖、门禁和可执行 frontier。

所有暂停/阻塞必须填写结构化 `pause`：`reason_code`、`gate_ref` 或证据引用、`owner_or_authority`、`resume_condition`、`next_work_unit`。`lifecycle.status` 保持粗粒度，恢复条件以 `pause` 为准。
