# 模板核验效率 L3 Standards 轴 Round 2 独立审查

## 审查身份与冻结点

- `reviewer_id`: `reviewer.template-verification-efficiency-l3-review-checkpoint-round2-2026-09-01.standards.r2`
- `implementation_actor_id`: `worker.template-verification-efficiency`
- `role_id`: `role.test-engineer`
- `runtime_id`: `runtime.skill-projection`
- `execution_state`: `Reviewer`
- `review_round`: `2`
- `candidate_digest`: `9dec90f0541bfdcaa5bf07f2030c8b5b44901bb05317ddd6c37fd625eb081272`
- 结论：`changes-requested/blocked`
- 收敛状态：`needs-human`

本复审只消费 Round 2 任务包明确授权的 manifest、`candidate.bin`、`tracked.diff`、checkpoint、旧试运行记录、Round 1 summary 与适用规则；未把 live worktree 后续状态作为候选字节。`candidate.bin` 的实际 SHA-256 已复核为 `9dec90f0541bfdcaa5bf07f2030c8b5b44901bb05317ddd6c37fd625eb081272`，与 manifest、checkpoint 和任务包一致。

## Round 1 finding 闭环

| Round 1 finding | Round 2 状态 | 判断 |
|---|---|---|
| ST-R1-001：任务包未授权读取 `candidate.bin` / `tracked.diff` | `closed` | Round 2 的 `inputs` 与 `allowed_read_paths` 已同时包含 manifest、stream、diff、checkpoint 和 source evidence。 |
| ST-R1-002：任务包缺少可消费的 fresh verification results | `open` | Round 2 虽填入三项结构化结果，但完整门禁仍是 `2026-09-01T00:00:00Z` 的旧执行；新候选 inspect / diff 是 `00:20:00Z`。共同的 evidence_ref 指向 8 月 31 日试运行记录，该记录既不包含 Round 2 digest，也不证明 Round 1 修复后的候选执行过完整门禁。见 ST-R2-001。 |

## Findings

### ST-R2-001 — `violation` — CRITICAL — 完整门禁证据早于 Round 1 修复和新候选冻结

Round 2 checkpoint 明确声明“Round 1 发现任务包生成器缺口；生成器修复并以新摘要重新冻结”。但是任务包与 checkpoint 中的 `scripts/verify-template` 结果仍记录为 `2026-09-01T00:00:00Z`、10.773 秒，而 Round 2 候选检查和 `git diff --check` 记录为 `00:20:00Z`。其 evidence_ref 仍是 `.template-source/evidence/maintenance/template-verification-efficiency-trial-2026-08-31.md`；该文档只描述旧试运行和原 packed candidate，不包含 digest `9dec90f...`、Round 1 修复内容或修复后完整门禁输出。

冻结候选显示 Round 2 新增了 Reviewer 读取路径、verification result 投影、显式排除与相应场景，这些核心验证器字节并未被 `00:00Z` 的旧完整门禁覆盖。把旧结果复制进新任务包不构成 fresh verification，违反 `AGENTS.md` 的完成证据门禁和 `maintaining-skills` 对 L3 核心验证器的要求。

需要：在修复后的确切实现上重新执行会因核心验证器变化而升级到 release 的候选门禁或完整 `scripts/verify-template`，保存包含命令、退出码、时间、候选摘要和实际输出的可读取证据，再重新冻结并审查。由于本轮已是 Round 2，不能自动开启 Round 3。

### ST-R2-002 — `violation` — CRITICAL — 任意 `--exclude` 可把实现变化移出冻结候选

冻结的 `scripts/capture-maintenance-candidate` 对外暴露可重复的 `--exclude`；`captureMaintenanceCandidate` 只检查排除值是仓库内相对路径，随后从 untracked inventory 中无条件过滤该路径及其全部后代。没有规则限制排除项只能是当前候选输出目录或已验证的审查证据目录，也没有检查被排除路径是否包含实现资产。

因此调用者可以传入 `--exclude scripts`、`--exclude docs/process` 或某个具体实现文件，使相关未跟踪实现字节完全不进入 `candidate.bin`，同时仍得到合法摘要和通过的 inspect 结果。这破坏了“Reviewer 消费完整冻结候选”的核心不变量；manifest 记录 `excluded_paths` 只能披露绕过，不能阻断它。

需要：将排除策略收敛为 validator 持有的固定审查证据路径规则，或对每个排除项做类型 / 所有权 allowlist 校验并拒绝任何实现资产；增加“尝试排除实现文件必须 fail closed”的压力场景。修复后须重捕获新 digest。

### ST-R2-003 — `violation` — IMPORTANT — Reviewer 任务包的候选类型未与 manifest 机器一致

冻结 manifest 声明 `candidate_kind: yss-worktree-candidate-v1`，Round 2 Standards 任务包却声明 `candidate_kind: worktree-packed`，并把 `candidate_requirement` 写成自然语言句子。冻结的任务包生成器只比较 candidate digest，`candidateKind` 与 `candidateRequirement` 均由 CLI 调用者自由传入，没有从 manifest 派生或校验一致性。

这使任务、record 与 manifest 无法形成单一可机器比较的候选类型绑定，也允许调用者在摘要相同的情况下签发错误候选类型任务。需要从 manifest 直接派生 `candidate_kind`，并把人类说明保留在 objective；生成器必须拒绝任何调用参数与 manifest 类型不一致。

## Finding 分类汇总

- `violation`: 3（ST-R2-001、ST-R2-002、ST-R2-003，均为 open / blocking）。
- `drift`: 0。
- `new_impacts`: 0。
- `judgement-call`: 0。

UI、Java、Backend specialist：`not-applicable`；本候选只改变模板治理、验证器、审查工作流与证据捕获工具。

## Standards 判断

候选将 761 个逐文件证据收敛为 packed stream 的方向符合既定目标，Round 2 也确实关闭了读取授权缺口。但候选完整性仍可被任意排除参数绕过，任务候选类型未机器一致，且新摘要没有修复后的 fresh 完整门禁证据。这些不是 backlog judgement call，而是冻结候选与已适用 L3 / 独立审查规则的直接冲突。

本轮是最终自动 Round 2，仍存在 open `violation`，因此 Standards 轴必须返回 `changes-requested/blocked` 并进入 `needs-human`；禁止自动开启 Round 3、批准发布或把本报告解释为候选通过。Reviewer 未修改实现、候选、checkpoint、其他报告或 Git。
