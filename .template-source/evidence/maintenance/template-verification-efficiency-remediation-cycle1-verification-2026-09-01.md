# 模板核验效率整改：人工授权周期 1 验证记录

## 身份与范围

- 原阻塞 checkpoint：`.template-source/evidence/maintenance/template-verification-efficiency-l3-needs-human-checkpoint-2026-09-01.yaml`
- 人工裁决：批准新整改周期
- implementation_actor_id：`worker.template-verification-efficiency`
- 新候选摘要：`aa139a1ffb80e0214b06a29407beb44aa6d18c37ba9e25a4803c221625bd1faa`
- 新候选 manifest：`.template-source/evidence/maintenance/reviews/template-verification-efficiency-remediation-cycle1-candidate-2026-09-01/candidate-manifest.yaml`

## RED

- `scripts/verify-maintenance-review-workflow-scenarios` 在实现前因任务包仍要求调用者提供 `candidateKind` 而失败；补齐 manifest 派生后继续因任意实现路径 exclusion 未被拒绝而失败。
- `scripts/verify-maintenance-intensity-scenarios` 在实现前接受了 `initial-release-verification.command: echo pass`，负例按预期失败。

## GREEN / 压力场景

以下命令 fresh 执行并通过：

```text
scripts/verify-maintenance-review-workflow-scenarios
scripts/verify-maintenance-intensity-scenarios
scripts/verify-digital-human-task-package-scenarios
scripts/verify-skill-governance
node --check scripts/lib/maintenance-candidate.mjs
node --check scripts/lib/maintenance-review-workflow.mjs
node --check scripts/lib/maintenance-intensity.mjs
git diff --check
```

覆盖结果：

- `--exclude scripts/new-validator.mjs` 被 fail-closed 拒绝；只允许 `.template-source/evidence/maintenance/` 下的维护证据。
- 候选捕获要求输出目录不存在，使用 staging 原子落盘。
- inspector 对多余残留文件失败，并核对外部 `tracked.diff` 与 packed stream。
- Reviewer `candidate_kind` 从 manifest 派生，显式 mismatch 被拒绝。
- `initial-release-verification` 和 `final-release-verification` 的命令身份固定为 `scripts/verify-template`。

## 首次冻结前完整门禁

- command：`scripts/verify-template`
- exit_code：`0`
- measured_duration_ms：`9489`
- recorded_at：`2026-08-31T16:46:50Z`
- result：release profile 全部检查通过。

该结果执行于本周期所有实现修复之后、新候选捕获之前，不复用旧 Round 2 的完整门禁结果。

## 候选只读检查

- command：`scripts/inspect-maintenance-candidate .template-source/evidence/maintenance/reviews/template-verification-efficiency-remediation-cycle1-candidate-2026-09-01/candidate-manifest.yaml`
- exit_code：`0`
- candidate_digest：`aa139a1ffb80e0214b06a29407beb44aa6d18c37ba9e25a4803c221625bd1faa`
- tracked_diff_bytes：`57743`
- actual_files：`candidate-manifest.yaml`、`candidate.bin`、`tracked.diff`
- `shasum -a 256 candidate.bin` 与 manifest 摘要一致。

核验结束后 `git diff --check` 通过；核验命令没有修改候选或实现资产。

## 发布前最终完整门禁

- command：`scripts/verify-template`
- exit_code：`0`
- measured_duration_ms：`9207`
- recorded_at：`2026-08-31T16:57:37Z`
- result：release profile 全部检查通过。

该命令在 Standards、Spec、Lead 三轴均批准摘要 `aa139a1ffb80e0214b06a29407beb44aa6d18c37ba9e25a4803c221625bd1faa` 后执行，是本整改生命周期第二次且最后一次完整门禁。执行后 `candidate.bin` 的 SHA-256 仍为同一摘要，`git diff --check` 通过。
