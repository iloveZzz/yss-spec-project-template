# 生命周期状态模型

## 命名空间

| 域 | 允许值 |
|---|---|
| `lifecycle.status` | `routing`、`running`、`paused-human-gate`、`blocked`、`completed` |
| `workflow.status` | `not-started`、`active`、`paused`、`resolved`、`failed` |
| `artifacts.*.status` | `missing`、`draft`、`ready-for-human`、`approved`、`stale`、`not-applicable` |
| `gates.*.status` | `not-evaluated`、`blocked`、`ready-for-human`、`approved`、`stale`、`not-applicable` |
| `tracker.kind` | `local-markdown`、`github`、`gitlab` |
| `ticket.role` | `needs-triage`、`needs-info`、`ready-for-human`、`wontfix`；`ready-for-agent` 仅供下游研发 profile 使用 |

Matt 五态不得扩义。资产的 `ready-for-human` 与 Ticket label 必须带命名空间表达。`paused-human-gate` 表示等待 `.template-spec/agents/digital-human-roles.yaml` 指定的会签人（数字人或生物人），不是「必须是生物人」。

## 上下文与外部输入证据

状态模型不新增 context 状态域。阶段边界只在状态块或 checkpoint 中保存可选证据：

```yaml
phase_boundary:
  decision: continue # continue / clear / handoff / subagent / compact
  reason: <why-this-choice>
  source_ref: null
  destination_ref: null
  task_package_ref: null
  convergence_ref: null
  next_phase: null
```

`handoff` 必须有来源和目的地；subagent 必须有任务包和汇合证据；`compact` 必须有下一阶段。`Continue`、`clear` 不要求跨上下文引用，但仍应记录判断理由。

生命周期外部输入问卷 的暂停使用 `pause.reason_code: external-input-required`，并保存 `questionnaire_ref`、`recipient_role`、`requested_outputs` 和 `resume_route`。答案回流后补 `response_ref`、`reclassified_impact` 和 `updated_authoritative_asset`，然后重新计算 `stale`、门禁和可执行 frontier。

## 战略设计交付状态

本 profile 不产生 `ready-for-agent`、垂直切片或实现合同。业务级 Ticket 只有在以下条件满足后才能进入 `ready-for-human` 并纳入交付包：

```text
required strategic gates ∈ {approved, not-applicable}
AND Spec、DDD 战略设计、阶段决策包和页面原型均为当前版本
AND blocking edges 全部关闭
AND Ticket 范围、优先级、验收标准、依赖和业务风险可审查
AND 下游 Tactical DDD 问题、责任人和目标版本已记录
```

Strategic Design Handoff 批准后 `next_route=null`；任何技术契约、垂直切片、实现或发布状态由下游研发 profile 重新计算。

用户显式运行 `to-tickets` 后，业务级 Ticket 初始状态固定为 `ready-for-human`。原生路径执行 `work-unit.business-ticket-formalization` 时同样必须产生等价的业务 Ticket 和 `Workflow Execution Result` 证据。本 profile 不使用 `ready-for-agent`；由 `yss-strategic-design` 复算业务 Ticket 的范围、验收、依赖和风险后，在 Strategic Design Handoff 中交付下游。生命周期不会自动调用 `to-tickets`，但不得跳过业务 Ticket 正式化工作单元。

## Git 授权状态

Git 动作分别保存 `commit_authorized`、`commit_scope`、`commit_authorization_ref`、`push_authorized`、`push_scope`、`push_authorization_ref`。只有授权值严格为 `true`、范围和用户授权引用均非空时才执行相应动作；缺失授权时保持工作区不变并记录 checkpoint 判断。`git-submodule` 另保存每仓授权、`checkout_state` 和先子后父顺序；空 gitlink、detached HEAD 或 `--force` 覆盖挂载点时不得当成普通目录 commit / 脚手架。

## 状态块

checkpoint 是唯一机器状态事实源，使用 `.template-spec/process/templates/lifecycle-checkpoint-template.yaml` 的 schema v1 形状。`.work/<feature>/map.md` 仅展示状态并引用 `gates/lifecycle-checkpoint.yaml`；业务 Ticket 独立存放。远程 tracker 也保留本地 checkpoint，不建立第二份状态权威。

```yaml
lifecycle:
  schema_version: 1
  mode: resume
  stage: product-design
  status: blocked
workflow:
  matt_flow: main
  active_skill: yss-prototype-stage
  status: paused
artifacts:
  spec: {status: approved, ref: .work/example/spec.md}
  prototype: {status: stale, ref: .work/example/design/prototype-evidence.yaml, stale_by: [spec]}
gates:
  prototype_verified: {status: stale}
tracker:
  kind: local-markdown
  root: .work
  refs: [.work/example/map.md]
  role: ready-for-human
pause:
  reason_code: human-gate
  gate_ref: gate.product-design-approved
  owner_or_authority: role.biological-human
  resume_condition: product-design-approved
  next_work_unit: work-unit.prototype-design
```

## Schema 兼容与迁移

- 当前只支持 `schema_version: 1`，支持版本列表以 `orchestration-contract.yaml` 为准。
- 版本缺失、解析失败或版本不在支持列表时，必须暂停并进入迁移检查；不得按 v1 猜测、覆盖或降级写回。
- checkpoint 优先，map.md 只作派生导航；旧 `ticket_sync.parent_ticket` 仅作历史引用。新旧索引必须明确指向同一 checkpoint；不可读、越界、循环或指向冲突即阻断，不静默合并、不自动产生批准。
- 不得用旧版本状态覆盖较新版本。迁移记录至少包含来源版本、目标版本、来源载体、冲突、真实资产证据、迁移人和时间。
- 活动 `.work/<feature>/` 出现旧战略 gate 时返回 `STRATEGIC_GATE_MIGRATION_REQUIRED`。先用 `scripts/migrate-strategic-gates --plan` 生成零写入计划，再用 `--apply` 消费同一计划；冻结的 `docs/deliveries/**` 不改写，旧批准只标记为 `historical-only`。

## Resume

读取状态块后必须重新读取引用资产、审查记录、Ticket 最新事件和相关 Git 变化。时间戳只能提示变化，不能单独证明语义失效；应比较内容和影响面。冲突时以权威资产为准，记录修复原因，然后重算依赖、门禁和可执行 frontier。

所有暂停/阻塞必须填写结构化 `pause`：`reason_code`、`gate_ref` 或证据引用、`owner_or_authority`、`resume_condition`、`next_work_unit`。`lifecycle.status` 保持粗粒度，恢复条件以 `pause` 为准。

索引 Markdown front matter 使用 `checkpoint_ref` 指向仓库相对 checkpoint 路径，可选 `index_refs` 引用其它索引。业务 Ticket 的 `Status:` 保留业务五态中的非实现状态。校验器只读；导航展示过期由主控重新派生，不反向更改批准。旧索引无法明确对应时先澄清引用，不猜测身份。
