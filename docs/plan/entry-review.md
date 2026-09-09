# Plan → Spec 入口审阅

正式 Spec 起草之前必须通过 `node scripts/verify-plan-spec-entry <state.yaml>`；显式 `to-spec`、恢复、任务包派发和下一路由均不得绕过。Plan 不通过时可继续无依赖调研，不创建正式 Spec 草稿。此检查复用 `plan-conclusion` 用户决定，不新增批准阶段，也不授权实现。

检查 ID 与条件门禁取自 `docs/process/lifecycle-registry.yaml` 的 `stage.plan.spec_entry`。查询 Plan 或相关工作单元自动加载 `planning`、`grill_exit` 和全量检查，初始均为 `pending`。自动加载不代表勾选通过。

## 持久化合同

入口状态包含 `feature_id`、`plan_review_ref`、`plan_user_decision_ref`。这三个字段同样用于任务包、checkpoint 和完成态 Workflow Execution Result；不从历史阶段、路径或默认值推断。

`plan_review_ref` 指向 YAML / JSON：

- `schema_version: 1`、`kind: plan-entry-review`、与入口一致的 `feature_id`。
- `plan_ref`：本次 Plan 正文；`context_reconciliation_ref`：本次已通过的 Context 调和记录。
- `basis`：非空 `{ref, digest}` 列表，digest 为实际文件字节的 `sha256:` 摘要。必须包含 Plan 正文、根 `CONTEXT.md`、生命周期注册表、Context 调和记录及各检查和门禁引用的文件。远程事实先保存可追溯证据快照。
- `checks`：注册表要求的全部检查 ID，每项包含 `status: pending | passed` 和非空 `evidence_refs`，引用 `basis`。必需检查不接受 `not-applicable`。缺项、未知项、pending 均阻断。
- `open_items`：显式数组，空数组代表无未决项。每项有 `id`、`critical`、`runnable_blocker`、`status` 和 `evidence_refs`。影响业务边界、关键规则或 MVP 的问题属于 critical。`resolved` 须有解决证据；仅非关键、非可执行阻塞项可 `deferred`，并填写 `noncritical_reason`、`owner`、`resolution_point`、`downstream_recipient`。延期内容随整个审阅包展示并取得用户确认。
- `impacts`：显式评估 `domain_strategy`（领域边界、词汇、协作或核心规则影响）和 `stage_decision`（需要稳定阶段决策合同）。证据和判断必须呈现给用户；缺值不解释为 false。
- `gates`：注册表 Plan 门禁全部逐项记录。命中项须 `status: approved`、`approval_ref`、`subject_ref`、`approval_scope`、`evidence_refs`，会签记录及对应资产均加入 `basis`；未命中项须 `status: not-applicable`、`reason`、`evidence_refs`，并由用户确认影响面判断。阶段决策门禁的上游依赖必须批准，不能用 N/A 跳过。

先固定审阅包及依据，展示当前内容、范围、风险、延期、N/A 理由和下一动作，再取得真实用户回复。`plan_user_decision_ref` 采用 `docs/process/schemas/user-decision.schema.json`：边界为 `plan-conclusion`，subject 为当前 `plan_review_ref`，scope 包含当前 `feature_id`。不得将旧“继续”、数字人会签或合成测试回复当作本次批准。

审阅包、注册表、Plan、词汇、依据或批准来源变化均要求重新校验；摘要漂移时重新展示并取得当前确认。检查器保证结构、引用、摘要和回复绑定，不证明业务事实或身份来源绝对真实；主控仍须按证据核查影响面，不能为了放行而填 false 或空问题列表。
