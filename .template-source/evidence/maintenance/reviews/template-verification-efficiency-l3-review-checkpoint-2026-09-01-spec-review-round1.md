# 模板验证效率整改 Spec 轴独立审查（Round 1）

- reviewer_id: `reviewer.template-verification-efficiency-l3-review-checkpoint-2026-09-01.spec.r1`
- implementation_actor_id: `worker.template-verification-efficiency`
- review_axis: `spec`
- review_round: `1`
- candidate_kind: `worktree-packed`
- candidate_digest: `88eaeb90cf2458667bce277054dd8f215d421ef65829162457c5f06dca6168fc`
- conclusion: `changes-requested/blocked`

本审查严格消费任务包允许的六项输入；未读取 `candidate.bin`、`tracked.diff`、live implementation worktree 或后续证据，也未执行会读取未授权路径的验证命令。candidate manifest 声明的 digest 与任务包、checkpoint 一致，但不等于已复核 packed-stream 字节。

## 规格覆盖判断

- 三级出口已由 `implementation-ready`、`review-ready`、`release-ready` 定义，且状态语义在 `CONTEXT.md:54-57`、`AGENTS.md:44`、`harness-process-tailoring.md:49-76` 一致。
- 两轮上限及 Round 2 后转 `needs-human` 已在 `harness-process-tailoring.md:72-76` 明确。
- CI/PR 默认 candidate 入口见 `harness-process-tailoring.md:51-53`；缓存和 packed candidate 契约见 `harness-process-tailoring.md:80-82`。
- L3 未被降级：仍要求 RED/GREEN/REFACTOR/压力场景、冻结候选正式独立审查，以及首次冻结前和发布前完整 `scripts/verify-template`（`harness-process-tailoring.md:38,45-46,53,76`；`maintaining-skills:19-20`）。

以上只能证明规格文本已表达整改目标，不能证明冻结候选实现正确。

## Findings

### SPEC-R1-001 — `violation` — Reviewer 无权读取被要求审查的 packed 候选

任务包要求只审查 digest `88ea…8fc` 的 packed-stream 候选，但 `allowed_read_paths` 仅包含 `candidate-manifest.yaml`，未包含 manifest 指向的 `candidate.bin` 与 `tracked.diff`。`harness-process-tailoring.md:78-80` 要求任务包声明允许读取路径，并要求 Reviewer 消费同一冻结候选；当前授权只能看到 19 个 untracked 路径名称，无法检查其字节，也无法检查任何 tracked diff。三级出口、两轮上限、CI、缓存、packed 捕获和 L3 门禁均不能完成 Spec 对照。应把冻结 `candidate.bin`、`tracked.diff` 及只读 inspection 输出纳入任务包输入/授权，再重派 Round 1。

### SPEC-R1-002 — `violation` — 任务包没有可消费的候选与 CI fresh verification

任务包的 `verification_results` 为空；checkpoint 中的 `pass` 是实施者汇总，且其 fresh verification 引用的 trial 文档未在 `allowed_read_paths`。`AGENTS.md:118` 禁止用“之前跑过”或实施者自述形成完成结论。因而无法核验 `scripts/verify-template-candidate`、`git diff --check` 的实际结果，也无法确认 PR/CI 采用 candidate profile、缓存篡改 fail-closed 或 packed digest 可重算。应提供绑定同一 candidate digest 的可读 fresh verification（命令、exit code、时间与证据引用）。

## 分类与结论

- `violation`: 2
- `drift`: 0
- `new_impacts`: 0
- `judgement-call`: 0

未发现可判定的范围蔓延；由于候选字节不可读，不能据此宣称候选没有范围蔓延或错误实现。结论为 `changes-requested/blocked`。这是审查输入/证据合同阻断，不授权 Reviewer 修改实现或重捕获候选。
