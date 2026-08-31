# 模板验证效率优化 L3 Lead 独立审查 Round 2

## 审查身份与冻结点

- reviewer_id: reviewer.template-verification-efficiency-l3-review-checkpoint-round2-2026-09-01.lead.r2
- implementation_actor_id: worker.template-verification-efficiency
- review_axis: lead
- review_round: 2
- candidate_kind: yss-worktree-candidate-v1
- storage: packed-stream
- candidate_digest: 9dec90f0541bfdcaa5bf07f2030c8b5b44901bb05317ddd6c37fd625eb081272
- conclusion: blocked
- next_state: needs-human

本审查只消费 Round 2 任务包允许读取的冻结 candidate manifest、`candidate.bin`、`tracked.diff`、checkpoint、Round 1 summary、冻结 fresh-verification、`scripts/verify-template` 与适用规则。未把 live worktree 当作候选，未预先消费其他 Round 2 轴报告，未修改实现、候选、checkpoint、其他报告或 Git。

## Round 1 合同缺口闭环

Round 1 的五项 finding 均指向 Reviewer 读取授权或 fresh-verification 绑定不足。Round 2 任务包已把同一新 digest 的 manifest、stream、diff、checkpoint、Round 1 summary 和 fresh-verification 全部纳入 `inputs` / `allowed_read_paths`，并携带三条有时间、耗时、退出码和 evidence ref 的 `verification_results`。

独立复核结果：

- `candidate.bin` 实际 SHA-256 为 `9dec90f0541bfdcaa5bf07f2030c8b5b44901bb05317ddd6c37fd625eb081272`，与 manifest、checkpoint、任务包一致。
- packed stream 的 tracked record 与外部 `tracked.diff` 字节完全一致；`tracked.diff` SHA-256 为 `d0e8350ac8f28190c8a26acb69c1d0f188671017c64970169a6e64c437620554`。
- stream 含 19 个按 raw path bytewise 严格排序的 untracked record，路径、mode、类型和内容可读；冻结 trial 与任务包允许读取的 fresh-verification 文件逐字节一致，SHA-256 为 `31ed90cf35331b103179d716e518f1d3fa5ea50b47c7be5710d300bf0f6cdc24`。

因此，Round 1 的“Reviewer 无法读取候选主体 / fresh verification”合同缺口已关闭。以下 Round 2 findings 是对已可读实现的新独立判断。

## Lead 收敛核对

| 关注点 | Round 2 判断 |
|---|---|
| 旧 release 门禁等价 | `scripts/verify-template` 仅变为 release profile Adapter；冻结 profile 保留旧门禁全部行为命令，runner 仍强制 Node 版本、必需文件、syntax check、Ruby 禁止、`git diff --check` 与执行前后 worktree 状态一致。冻结场景显式比较旧命令基线，initial release verification 记录 exit `0`。该项通过。 |
| 状态机 | `implementation-ready` / `review-ready` / `release-ready` / `needs-human` 的 profile、round、digest 与必需证据约束已落入 checkpoint validator；当前 checkpoint 为 `review-ready`、candidate profile、Round 2、精确 digest，未越级。该项通过。 |
| 两轮停止 | evaluator 对 Round 1 blocker 返回 `repair-and-refreeze`，对 Round 2 blocker 返回 `needs-human` / `stop-automatic-review`，Round 3 输入直接拒绝；场景覆盖 blocker 与 judgement-call 分流。该项通过；因本报告仍有 violation，本轮应落 `needs-human`。 |
| CI | PR 使用 candidate profile 并以 base SHA 计算影响面；核心核验资产或未知路径 fail-safe 升级 release；push 继续执行完整 `scripts/verify-template`。该项通过。 |
| 固定 commit 缓存 | 缓存键绑定 repository URL + 40 位 commit；miss 精确 fetch 并核对 `FETCH_HEAD^{commit}`，hit 重验 metadata 与 commit object 解析；缓存目录被 Git 忽略，篡改、缺失、离线与浮动 ref 有负例。该项通过。 |
| packed candidate | 当前冻结流摘要、外部 diff、19 个 untracked record 与 manifest inventory 一致；manifest 不含 `untracked_content_refs`，任务包只绑定 manifest、stream、tracked diff 三个候选文件。当前候选的三文件表示成立，但捕获器的通用边界仍有下述两个 violation。 |
| 发布边界 | 当前只处于 `review-ready`。正式独立审查后仍需最终完整 release Fresh Verification，`release-ready` 也不替代生物人 `gate.release-ready`；本报告不批准发布。该项通过。 |

## Findings

### LEAD-R2-001 — `violation` — `--exclude` 可排除未跟踪实现资产

- severity: IMPORTANT
- disposition: violation
- status: open
- evidence: 冻结的 `captureMaintenanceCandidate` 只校验 exclusion 为仓库内相对路径，随后直接从 untracked inventory 过滤任何匹配路径；没有把 exclusion 限制为审查任务包、报告、checkpoint 或旧候选等治理证据目录，也没有拒绝 `scripts/**`、`docs/process/**` 等实现 / 权威资产。场景只验证排除 `review-evidence` 的正例，没有“排除实现资产必须失败”的反例。
- violated invariant: `docs/process/harness-process-tailoring.md` 明确规定排除机制只用于把审查任务包、报告和旧候选目录与实现字节分离，且“不得排除实现资产”。当前接口可通过 `--exclude scripts/new-validator` 等方式使新增实现字节不进入 `candidate_digest`，破坏冻结候选完整性。
- required closure: 将 exclusion 约束为明确的治理证据 allowlist / 受控分类，并新增排除 untracked 实现资产必须 fail closed 的压力场景；修复后重新捕获候选。

### LEAD-R2-002 — `violation` — 捕获器不保证输出目录实际恰好三文件

- severity: IMPORTANT
- disposition: violation
- status: open
- evidence: 冻结的 `captureMaintenanceCandidate` 对 `outputDir` 仅执行 `mkdirSync(..., {recursive:true})`，然后覆盖写入 manifest、stream、tracked diff；既不要求输出目录不存在 / 为空，也不以临时目录原子替换，且 inspector 不检查目录 entry 数量。若复用旧的逐文件候选目录，历史 `untracked-content/000xxx` 或其他残留会继续存在，同时捕获结果仍声称 `files.length === 3`。现有场景只在全新临时目录验证返回数组长度为 3，未覆盖残留文件。
- violated invariant: 权威规则要求新 packed capture 默认只保存 `candidate-manifest.yaml`、`candidate.bin`、`tracked.diff`，本轮优化的核心目标之一也是把证据文件数量收敛到三文件。返回三个路径不等于落盘目录恰好三文件。
- required closure: 对输出目录采用不存在 / 空目录前置条件或 staging + 原子替换，并由 inspector / 场景确认实际目录 entry 恰好为三个规范文件；修复后重新捕获候选。

## Finding 分类汇总

- violation: 2（`LEAD-R2-001`、`LEAD-R2-002`，均 open）
- drift: 0
- new_impacts: 0
- judgement-call: 0

## 结论

结论：blocked / needs-human

Round 1 的审查合同缺口已经关闭，release 门禁等价、状态机、两轮停止、CI、缓存和发布边界在当前冻结候选中均已收敛；但 packed capture 仍允许遗漏未跟踪实现资产，且不能保证证据目录实际恰好三文件。这两项直接违反冻结候选完整性与文件数量收敛合同。

本次为最终自动 Round 2。依照两轮停止规则，不得自动开启 Round 3；编排器应把状态转换为 `needs-human`，由人工决定后续修复与重新审查路径。本报告不批准 `release-ready` 或发布。
