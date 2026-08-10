# Stage Checkpoint

```yaml
schema_version: 1
mode: project-instance
stage: <lifecycle stage>
artifacts:
  - path: <artifact path>
    status: <draft|ready-for-human|ready-for-agent|completed|blocked|not-applicable>
gates:
  - name: <gate name>
    status: <passed|failed|blocked|not-applicable>
    reason: <why this status applies>
phase_boundary:
  decision: <continue|clear|handoff|subagent|compact>
  reason: <decision evidence>
  next_phase: <next phase or pause reason>
stage_trace:
  stage: <current stage>
  upstream_refs: []
  artifact_refs: []
  gate_decisions: []
  downstream_impacts: []
ticket_sync:
  status: <pending|synced|not-applicable>
  refs: []
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

阶段 checkpoint 只在人工暂停、handoff、进入实现、合并或发布边界集中回写；出现阻塞、责任人变化或资产单独批准时立即回写，并保留阶段因果。
