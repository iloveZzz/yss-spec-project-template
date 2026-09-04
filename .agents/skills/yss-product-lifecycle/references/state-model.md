# 生命周期状态模型

## 命名空间

| 域 | 允许值 |
|---|---|
| `lifecycle.status` | `routing`、`running`、`paused-human-gate`、`blocked`、`completed` |
| `workflow.status` | `not-started`、`active`、`paused`、`resolved`、`failed` |
| `artifacts.*.status` | `missing`、`draft`、`ready-for-human`、`approved`、`stale`、`not-applicable` |
| `gates.*.status` | `not-evaluated`、`blocked`、`ready-for-human`、`approved`、`stale`、`not-applicable` |
| `tracker.kind` | `local-markdown`、`github`、`gitlab` |
| `ticket.role` | `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix` |

Matt 五态不得扩义。资产的 `ready-for-human` 与 Ticket label 必须带命名空间表达。`paused-human-gate` 表示等待 `docs/agents/digital-human-roles.yaml` 指定的会签人（数字人或生物人），不是「必须是生物人」。

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

`to-questionnaire` 的暂停使用 `pause.reason_code: external-input-required`，并保存 `questionnaire_ref`、`recipient_role`、`requested_outputs` 和 `resume_route`。答案回流后补 `response_ref`、`reclassified_impact` 和 `updated_authoritative_asset`，然后重新计算 `stale`、门禁和可执行 frontier。

## `ready-for-agent` 公式

仅当以下全部为真，垂直切片 Ticket 才能获得该 Ticket 状态：

```text
required gates ∈ {approved, not-applicable}
AND related artifacts 不含 stale（若命中领域影响，`artifact.tactical-design` 或嵌入式 Tactical DDD Check 引用必须为当前版本）
AND blocking edges 全部关闭
AND implementation repo/branch/CI/test/rollback 已明确
AND `work-unit.ticket-decomposition` 已返回 `completed`，且其 `ticket_decomposition_result_ref` 证据可读取
AND `vertical_slice_ticket_ref` 指向 `docs/.scratch/<feature>/issues/` 下的垂直切片 Ticket
AND `vertical_slice_ticket_kind=vertical-slice-ticket` 且 `vertical_slice_ticket_role=ready-for-agent`
AND `vertical_slice_ticket_ref` 不得指向 `parent-ticket.md`
AND Slice Implementation Contract 已由生命周期编排器批准并持久化
AND Slice Implementation Contract 的 `ticket_ref` 与 `vertical_slice_ticket_ref` 完全一致
AND 当前工作单元消费的 contract_id/version 与最新批准版本一致
AND Backend Slice Implementation Contract（后端适用）和 Build Architecture Checklist 已完成
AND backend 影响且 scaffold_status=required 时，原型确认后的脚手架策略、`yss-backend-scaffold-parent` 基线、Wrapper 验证和 实现合同编译器 重编译均已完成
AND 所有后续生成代码均绑定主 YSS skill、依赖闭包、允许写路径、预期证据和 YSS Skill Execution Result
AND UI 影响切片的前端实现还原计划已通过 schema 校验、`template=false`、`status=approved`，且基线引用可读取
```

父 Ticket、Spec、设计、原型、OpenAPI Draft、wayfinder map 和 decision ticket 不得使用 `ready-for-agent`。

发布前还必须满足所有已触发门禁均为 `approved` 或 `not-applicable`；UI 影响切片必须额外通过 `gate.frontend-implementation-verified`，不能只凭 fresh verification 和回滚点放行。

用户显式运行 `to-tickets` 后，垂直切片初始 Ticket 状态固定为 `ready-for-human`。原生路径执行 `work-unit.ticket-decomposition` 时同样必须产生等价的垂直切片和 `Workflow Execution Result` 证据。只有 `yss-product-lifecycle` 复算上述公式全部为真后，才能把它提升为 `ready-for-agent`；生命周期不会自动调用 `to-tickets`，但不得跳过 Ticket 正式化工作单元。其默认标签也不参与该裁决。

## Review 与 Git 授权状态

进入代码审查时保存 `review_mode`、`review_base_ref`、`implementation_candidate_ref`、`candidate_snapshot_ref`、`candidate_digest` 及 Spec、Ticket、合同、Checklist、YSS Execution Result 引用，并记录专项检查覆盖与机器检查结果。`worktree` 候选必须一次捕获 committed、staged、unstaged 和 untracked 文件；manifest 的按模式必填字段以及 `yss-worktree-candidate-v1`（raw path、uint64 big-endian 长度、tracked/untracked record、symlink 和不支持条目）以 `orchestration-contract.yaml.review_input` 为唯一执行定义。两个 Reviewer 消费同一不可变快照；返回后或完成 checkpoint 摘要变化则返回 `blocked` 并重新审查。Finding 分流不新增生命周期状态：`violation` 仍在当前合同路径由实现者修复后复审；`drift` / `new_impacts` 把合同标 `stale` 并走既有重路由。该清单只作为审查证据。

Git 动作分别保存 `commit_authorized`、`commit_scope`、`commit_authorization_ref`、`push_authorized`、`push_scope`、`push_authorization_ref`。只有授权值严格为 `true`、范围和用户授权引用均非空时才执行相应动作；缺失授权时保持工作区不变并记录 checkpoint 判断。`git-submodule` 另保存每仓授权、`checkout_state` 和先子后父顺序；空 gitlink、detached HEAD 或 `--force` 覆盖挂载点时不得当成普通目录 commit / 脚手架。

## 状态块

状态块位于主 tracker 的功能父 Ticket，并使用 `docs/process/templates/lifecycle-checkpoint-template.yaml` 的结构化形状和 `lifecycle-checkpoint.schema.json` 校验；Local Markdown 使用 `docs/.scratch/<feature>/parent-ticket.md`，可将完整 checkpoint 保存在 `docs/.scratch/<feature>/gates/lifecycle-checkpoint.yaml` 后由父 Ticket 引用，远程 tracker 使用 Issue 并在本地功能包保留引用。平台不可用时才位于 stage checkpoint。只保存索引、状态、引用和因果关系：

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
  spec: {status: approved, ref: docs/.scratch/example/spec.md}
  openapi: {status: stale, ref: docs/.scratch/example/api/example.yaml, stale_by: [spec]}
gates:
  openapi_freeze: {status: stale}
tracker:
  kind: local-markdown
  root: docs/.scratch
  parent_ticket: docs/.scratch/example/parent-ticket.md
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
- 主 tracker 的父 Ticket 状态块优先作为主索引；Local Markdown 的 `docs/.scratch/<feature>/parent-ticket.md` 是主载体，远程 Issue 只是显式选择远程 tracker 时的主载体。根 `.scratch/` 与 `docs/requirements/tickets/` 只作为旧路径迁移来源。stage checkpoint 只在选定平台不可用时降级。两者版本或内容冲突时，不做字段级静默合并：读取真实资产重建新状态，保留旧块引用和迁移记录，再由人工确认主载体。
- 不得用旧版本状态覆盖较新版本。迁移记录至少包含来源版本、目标版本、来源载体、冲突、真实资产证据、迁移人和时间。

## Resume

读取状态块后必须重新读取引用资产、审查记录、Ticket 最新事件和相关 Git 变化。时间戳只能提示变化，不能单独证明语义失效；应比较内容和影响面。冲突时以权威资产为准，记录修复原因，然后重算依赖、门禁和可执行 frontier。

所有暂停/阻塞必须填写结构化 `pause`：`reason_code`、`gate_ref` 或证据引用、`owner_or_authority`、`resume_condition`、`next_work_unit`。`lifecycle.status` 保持粗粒度，恢复条件以 `pause` 为准。
