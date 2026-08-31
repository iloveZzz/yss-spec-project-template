# 模板验证效率整改 Spec 轴独立审查（Round 2）

- reviewer_id: `reviewer.template-verification-efficiency-l3-review-checkpoint-round2-2026-09-01.spec.r2`
- implementation_actor_id: `worker.template-verification-efficiency`
- review_axis: `spec`
- review_round: `2`
- candidate_kind: `worktree-packed`
- candidate_digest: `9dec90f0541bfdcaa5bf07f2030c8b5b44901bb05317ddd6c37fd625eb081272`
- conclusion: `changes-requested/blocked`
- convergence_state: `needs-human`

本轮严格消费任务包允许的冻结输入，没有把 live implementation worktree 当作候选，也没有修改实现、候选、checkpoint、其他报告或 Git。`scripts/inspect-maintenance-candidate` 对冻结 manifest 的只读检查通过；Reviewer 另从 `candidate.bin` 解析 tracked record，并确认其与冻结 `tracked.diff` 字节完全一致（均为 54,746 bytes，SHA-256 均为 `d0e8350ac8f28190c8a26acb69c1d0f188671017c64970169a6e64c437620554`）。

## Round 1 findings 复核

- `SPEC-R1-001` 已闭合：Round 2 任务包的 `allowed_read_paths` 同时包含 manifest、`candidate.bin` 与 `tracked.diff`；Reviewer 已实际消费并复核这些冻结字节。
- `SPEC-R1-002` 已闭合：任务包 `verification_results` 提供了 candidate inspection、首次完整 `scripts/verify-template` 和 `git diff --check` 的 command、exit code、执行时间及可读 evidence ref，并由任务包 contract/checkpoint 共同绑定本轮 candidate digest。

## 已满足的整改语义

- 三级出口已在 `CONTEXT.md` 和 `harness-process-tailoring.md` 中统一为 `implementation-ready`、`review-ready`、`release-ready`，实现包含 checkpoint schema v2 状态校验。
- 两轮上限已进入 Reviewer 合同、`evaluateMaintenanceReviewRound` 和压力场景；Round 2 仍有阻断时返回 `needs-human`，不允许自动 Round 3。
- PR 使用 candidate 入口、push 使用完整 release 入口；核心核验资产和未映射路径会 fail-safe 升级 release。
- 固定远程模板缓存以 URL + 40 位 commit 为键，命中时复核 metadata 与 Git commit object。
- 新候选收敛为 manifest、`candidate.bin`、`tracked.diff` 三个文件，不再生成逐文件 `untracked-content/000xxx`。

上述实现覆盖了整改主路径，但以下两个旁路仍违反已冻结规格，因此不能批准。

## Findings

### SPEC-R2-001 — `violation` — L3 两次完整门禁仅按 evidence kind 校验，可用任意命令冒充

规格要求首次正式冻结前和最终发布前必须各执行一次不可裁剪的 `scripts/verify-template`（`AGENTS.md:44`；`docs/process/harness-process-tailoring.md:49-53,76`；`maintaining-skills` Working Contract 9）。冻结候选在 `tracked.diff:245-300` 新增的 `validateCheckpointState` 只检查 `initial-release-verification` / `final-release-verification` kind 是否存在，没有校验其 `command` 必须是完整 `scripts/verify-template`。相应场景在 `tracked.diff:403-437` 通过通用 `evidence(...)` 构造这些 kind，也没有负例拒绝 `echo ok`、focused/candidate 命令或其他非完整门禁命令。

因此 schema v2 checkpoint 可以在未执行完整发布门禁时取得 `review-ready` 或 `release-ready`，行为上降低了 L3。当前 checkpoint 的首次门禁命令填写正确，不能消除校验器对后续候选开放的旁路。需要让状态校验 fail-closed 绑定两类 evidence 的规范命令/可验证命令身份，并增加错误命令的拒绝场景。

### SPEC-R2-002 — `violation` — packed candidate 的 `--exclude` 可排除任意 untracked 实现资产

规格只允许把审查任务包、报告和旧候选等 evidence 与实现字节分离，并明确“不得排除实现资产”（`docs/process/harness-process-tailoring.md:80`）。冻结 `candidate.bin` 中的 `scripts/lib/maintenance-candidate.mjs` 对 `excludePaths` 只做“仓库内相对路径”校验，随后无条件从 untracked inventory 过滤该路径；调用者可以传入 `--exclude scripts/new-implementation`、`--exclude docs/process/new-authority.yaml` 等实现/权威资产，使其不进入 stream 与 candidate digest。`scripts/verify-maintenance-review-workflow-scenarios` 只覆盖合法 evidence 排除，没有非法实现排除的拒绝场景。

这会使 Reviewer 看到的冻结候选缺少实际实现字节，却仍得到有效 digest 和 manifest，违反 packed candidate 完整性合同。需要将排除范围 fail-closed 限定为明确的 evidence/candidate 路径合同，或以等价可执行策略拒绝实现资产，并补充压力负例。

## 分类与结论

- `violation`: 2
- `drift`: 0
- `new_impacts`: 0
- `judgement-call`: 0

未发现可判定的范围蔓延；新增资产均服务于三级核验、缓存、packed candidate 和两轮审查合同。由于本轮是最终自动 Round 2，以上未关闭 `violation` 按 `harness-process-tailoring.md` 和任务包 convergence 合同必须进入 `needs-human`，禁止自动开启 Round 3。结论为 `changes-requested/blocked`。
