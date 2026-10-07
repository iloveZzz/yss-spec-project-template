# 生命周期状态模型

本文件定义 `governed` 的正式状态及兼容历史记录。已合格 `daily` 只在普通 Ticket / PR 保留结果、实际测试和独立审查，按 [普通任务交付](daily-delivery.md) 校验；不生成本文件的阶段 checkpoint、正式 Slice、`approved` 或 `ready-for-agent`。本任务已绑定正式状态时按原规则恢复，不得降级。

## 命名空间

| 域 | 允许值 |
|---|---|
| `lifecycle.status` | `routing`、`running`、`paused-human-gate`、`blocked`、`completed` |
| `workflow.status` | `not-started`、`active`、`paused`、`resolved`、`failed` |
| `artifacts.*.status` | `missing`、`draft`、`ready-for-human`、`approved`、`stale`、`not-applicable` |
| `checks.*.status` | `pending`、`passed`、`approved`、`failed`、`stale`、`not-applicable` |
| `gates.*.status` | `not-evaluated`、`blocked`、`ready-for-human`、`approved`、`stale`、`not-applicable` |
| `tracker.kind` | `local-markdown`、`github`、`gitlab` |
| `ticket.role` | `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix` |

Matt 五态不得扩义。资产的 `ready-for-human` 与 Ticket label 必须带命名空间表达。`paused-human-gate` 表示等待 `.template-spec/agents/digital-human-roles.yaml` 指定的会签人（数字人或生物人），不是「必须是生物人」。但 `user_decision_policy` 命中的关键决定还必须有真实用户回复，数字人会签不能解除该等待。

等待态不自动产生用户问题。按编排合同 `blocking_disposition`，专业等待自主派发或核对现有任务并等待；验证失败修复 / 路由，未知影响先调查。只有真实决定、新授权或无法自主取得的必要输入缺失，才先展示可审阅材料后询问，同时继续无依赖工作。完成结论本身不新增暂停，状态值和历史记录不因该执行规则改写。

Slice v3 冻结需求文件的 status 是冻结时快照，不能用来推断当前执行状态。状态流转和验收结果写入已配置主 tracker / 任务包；需求改版后重新编译、审查与绑定批准，见 [Slice 冻结需求协议](../../yss-implementation-contract-compiler/references/slice-implementation-contract.md#第二轮增量规则)。

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

## `ready-for-agent` 公式

仅当以下全部为真，垂直切片 Ticket 才能获得该 Ticket 状态：

```text
required gates ∈ {approved, not-applicable}
AND 关键决定及当前切片实施范围已有可追溯、当前且未撤回的真实用户批准
AND related artifacts 不含 stale（若命中技术设计影响，`artifact.technical-design` 必须已批准且版本当前、架构一致；旧 DDD 合同仅按显式兼容入口消费）
AND blocking edges 全部关闭
AND `check.implementation-repositories-ready` 已通过，所有命中的前后端项目均为 `existing-and-onboarded` 或 `initialized-and-verified`，未命中的交付面有带原因的 `not-applicable`
AND `work-unit.implementation-repository-preparation` 已返回当前且证据可读的 `completed` 结果
AND implementation repo/branch/CI/test/rollback 已明确
AND `work-unit.ticket-decomposition` 已返回 `completed`，且其 `ticket_decomposition_result_ref` 证据可读取
AND `vertical_slice_ticket_ref` 指向 `.work/<feature>/issues/` 下的垂直切片 Ticket
AND `vertical_slice_ticket_kind=vertical-slice-ticket` 且 `vertical_slice_ticket_role=ready-for-agent`
AND `vertical_slice_ticket_ref` 不得指向 `parent-ticket.md`
AND Slice Implementation Contract 已由生命周期编排器批准并持久化
AND Slice Implementation Contract 的 `ticket_ref` 与 `vertical_slice_ticket_ref` 完全一致
AND 当前工作单元消费的 contract_id/version 与最新批准版本一致
AND Backend Slice Implementation Contract（后端适用）和 Build Architecture Checklist 已完成
AND backend 影响且 scaffold_status=required 时，`gate.backend-architecture-platform-approved` 已由用户同时确认 DDD / MVC 与精确 Spring Boot 版本并达到 lifecycle-approved、统一 schema v4 合同与 Manifest 当前、对应 DDD / Layered MVC 基线、Wrapper 验证和 实现合同编译器重编译均已完成；既有工程只核验并复用当前登记值
AND frontend 影响且无已有工程时，统一 schema v4 Project Scaffold Contract 已批准、持久化且当前，模板 bundled manifest 摘要或 Git commit 已锁定，`pnpm install --frozen-lockfile` 与工程基线要求的 lint/type-check/build 已实际通过
AND 所有后续生成代码均绑定主 YSS skill、依赖闭包、允许写路径、预期证据和 YSS Skill Execution Result
AND UI 影响切片的前端实现还原计划已通过 schema 校验、`template=false`、`status=approved`，且基线引用可读取
```

父 Ticket、Spec、设计、原型、OpenAPI Draft、wayfinder map 和 decision ticket 不得使用 `ready-for-agent`。

发布前还必须满足所有已触发门禁均为 `approved` 或 `not-applicable`；UI 影响切片必须额外通过 `check.frontend-implementation-verified`，不能只凭 fresh verification 和回滚点放行。

任何 `project-instance` 工作单元进入下一步、任何阶段会签暂停或阶段完成 checkpoint，还必须引用当前工作单元的 `context_reconciliation`。其中 `status=reconciled`、`context_ref=CONTEXT.md`、`document_digest` 与 `referenced_terms_digest` 必须和根目录唯一 `CONTEXT.md` 一致；该证据不改变门禁数量。`template-source` 仅允许以带原因的 `not-applicable` 表示它只校验模板合同，不产生产品业务术语。

用户显式运行 `to-tickets` 后，垂直切片初始 Ticket 状态固定为 `ready-for-human`。原生路径执行 `work-unit.ticket-decomposition` 时同样必须产生等价的垂直切片和 `Workflow Execution Result` 证据。只有 `yss-product-lifecycle` 复算上述公式全部为真后，才能把它提升为 `ready-for-agent`；生命周期不会自动调用 `to-tickets`，但不得跳过实现仓库准备和 Ticket 正式化工作单元。旧实例恢复时若缺少当前工程准备结果，保留既有 Ticket，将 Ticket 与 Slice Contract 标为 `blocked` / `stale` 并回到阶段 5。其默认标签也不参与该裁决。

## Review 与 Git 授权状态

进入代码审查时保存 `review_mode`、`review_base_ref`、`implementation_candidate_ref`、`candidate_snapshot_ref`、`candidate_digest` 及 Spec、Ticket、合同、Checklist、YSS Execution Result 引用，并记录专项检查覆盖与机器检查结果。`worktree` 候选必须一次捕获 committed、staged、unstaged 和 untracked 文件；manifest 的按模式必填字段以及 `yss-worktree-candidate-v1`（raw path、uint64 big-endian 长度、tracked/untracked record、symlink 和不支持条目）以 `orchestration-contract.yaml.review_input` 为唯一执行定义。所有参与审查者（人数按 `orchestration-contract.yaml.gate_consolidation`） 消费同一不可变快照；返回后或完成 checkpoint 摘要变化则返回 `blocked` 并重新审查。Finding 分流不新增生命周期状态：`violation` 仍在当前合同路径由实现者修复后复审；`drift` / `new_impacts` 把合同标 `stale` 并走既有重路由。该清单只作为审查证据。

Git 动作分别保存 `commit_authorized`、`commit_scope`、`commit_authorization_ref`、`push_authorized`、`push_scope`、`push_authorization_ref`。Agent 按既有 [用户决定协议](user-decisions.md) 从明确动作与范围的真实回复整理字段并保留原始来源，不要求用户重填。只有对应授权值严格为 `true`、范围和引用非空、来源可读、未撤回且动作在范围内时才执行；commit 不隐含 push。任一不满足时不执行对应动作并记录 checkpoint 判断。`git-submodule` 另保存每仓授权、`checkout_state` 和先子后父顺序；空 gitlink、detached HEAD 或 `--force` 覆盖挂载点时不得当成普通目录 commit / 脚手架。

## 状态块

父 Ticket 是主 tracker 的追踪入口。新功能将机器状态持久化在实际 checkpoint 文件，由父 Ticket 明确引用；使用 `.template-spec/process/templates/lifecycle-checkpoint-template.yaml` 的结构及原 schema 校验。阶段、阻塞和下一工作单元通过 `scripts/lifecycle-status --root <项目> --checkpoint <ref>` 查询，阶段工作进度通过 `scripts/stage-tracking check` 查询。父 Ticket 保留 Ticket 五态、业务说明、资产和会签入口，不另填机器状态表；批准记录仍是批准依据。远程 tracker 同样引用本地 checkpoint，不自动生成阅读包。以下字段示意位于 checkpoint，不再复制到父 Ticket：

```yaml
lifecycle:
  schema_version: 1
  mode: resume
  stage: stage.spec-architecture
  status: needs-human
workflow:
  matt_flow: main
  active_skill: yss-product-lifecycle
  status: paused
artifacts:
  spec: {status: ready-for-human, ref: .work/example/spec.md}
  openapi: {status: stale, ref: .work/example/api/example.yaml, stale_by: [spec]}
gates:
  gate.spec-baseline-approved: {status: needs-human}
tracker:
  kind: local-markdown
  root: .work
  parent_ticket: .work/example/parent-ticket.md
  role: ready-for-human
pause:
  reason_code: human-gate
  gate_ref: gate.spec-baseline-approved
  owner_or_authority: product-owner
  resume_condition: gate.spec-baseline-approved approved
  next_work_unit: work-unit.technical-analysis
```

## Schema 兼容与迁移

- 当前只支持 `schema_version: 1`，支持版本列表以 `orchestration-contract.yaml` 为准。
- 版本缺失、解析失败或版本不在支持列表时，必须暂停并进入迁移检查；不得按 v1 猜测、覆盖或降级写回。
- 旧父 Ticket 内嵌状态块继续只读兼容；不按标题批量迁移。改造前保存原文并展示精确差异，明确既有 checkpoint 路径。双方字段冲突时列出两侧原值，保留原始证据，不自动裁定、不回写 checkpoint、不改变 Ticket 五态或批准状态。由已授权的单项迁移将父 Ticket 改为引用入口；业务状态纠偏单独处理。根 `.scratch/` 与 `docs/requirements/tickets/` 仍只作旧路径迁移来源。
- 不得用旧版本状态覆盖较新版本。迁移记录至少包含来源版本、目标版本、来源载体、冲突、真实资产证据、迁移人和时间。

## Resume

读取状态块后必须重新读取引用资产、审查记录、Ticket 最新事件和相关 Git 变化。时间戳只能提示变化，不能单独证明语义失效；应比较内容和影响面。冲突时以权威资产为准，记录修复原因，然后重算依赖、门禁和可执行 frontier。

所有暂停/阻塞必须填写结构化 `pause`：`reason_code`、`gate_ref` 或证据引用、`owner_or_authority`、`resume_condition`、`next_work_unit`。`lifecycle.status` 保持粗粒度，恢复条件以 `pause` 为准。

用户决定不新增状态；等待和恢复的引用字段、失效与复用规则见 [user-decisions.md](user-decisions.md)。
