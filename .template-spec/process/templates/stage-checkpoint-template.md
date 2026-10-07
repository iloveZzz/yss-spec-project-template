# Stage Checkpoint

```yaml
schema_version: 1
repository_mode: <template-source|project-instance>
mode: <route|orchestrate|resume|audit>
status: <routing|running|paused-human-gate|blocked|completed>
stage: <lifecycle stage>
artifacts:
  <stable-artifact-id>:
    status: <missing|draft|ready-for-human|approved|stale|not-applicable>
    ref: <readable artifact reference>
    evidence_refs: []
gates:
  <stable-gate-id>:
    status: <not-evaluated|blocked|ready-for-human|approved|stale|not-applicable>
    reason: <why this status applies>
    evidence_refs: []
    approval_ref: <.work/<feature>/gates/<gate-id>-approval.yaml when approved countersign gate>
context_reconciliation:
  status: <pending|reconciled|not-applicable|blocked>
  ref: <.work/<feature>/evidence/context-reconciliation-<work-unit>.yaml>
  evidence_refs: [CONTEXT.md]
phase_boundary:
  decision: <continue|clear|handoff|subagent|compact>
  reason: <decision evidence>
  # compact 填当前 registry 的 stage ID；handoff 填 source_ref / destination_ref；
  # subagent 填 task_package_ref / convergence_ref。引用均为本地可读交接证据。
  next_phase: <stage ID，仅 compact 时填写>
stage_trace:
  stage: <current stage>
  completed_work_unit: <已完成前驱，仅声明当前流转时填写>
  upstream_refs: []
  artifact_refs: []
  gate_decisions: []
  downstream_impacts: []
ticket_sync:
  status: <pending|synced|not-applicable>
  # refs 关联消费者收据、反馈/裁决和交付验收等权威资产，不复制其机器状态。
  refs: []
next_work_unit: <stable work-unit id>
verification:
  commands: []
  evidence_refs: []
human_review:
  required: false
  status: <pending|completed|not-applicable>
git_checkpoint:
  required: false
  status: <pending|created|not-applicable>
blockers: []
rollback: []
```

阶段 checkpoint 只在会签暂停、handoff、进入实现、合并或发布边界集中回写；出现阻塞、责任人变化或资产单独批准时立即回写，并保留阶段因果。`paused-human-gate` 表示等待 YAML `gate_policy` 指定的会签人（数字人或生物人），不是「必须是生物人」。会签桶内门禁标为 `approved` 时必须有可读的 `approval_ref`。

当前边界必须具有非空 decision/reason 及完整 stage_trace；普通入口分诊不要求尚未产生的交接证据。`verify-lifecycle-checkpoint --history` 仅检查旧记录结构，不证明当前流转或批准。
