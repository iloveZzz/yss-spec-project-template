# Archify L3 Standards 独立审查（Round 1）

## 结论

**blocked**。本报告只审查 `yss-worktree-candidate-v1` packed candidate，不使用当前工作树中的其他修改作为实现候选。候选存在 2 个 open `violation` 和 1 个 open `missing_evidence`；应交回实施者修复，重新捕获新摘要，并重跑全部审查轴。

- `candidate_digest`: `54b23c365d3a1625bfd116e3fede67db03a41bdf6bd03bbf2c87457be137f269`
- `review_mode`: `worktree`
- `review_base_ref` / `merge_base`: `b62d97da2bdf6e0253e3a530179eaa8a0db924da`
- packed tracked diff: `7,508,919` bytes
- packed untracked inventory: `[]`
- 审查轴：`standards`
- 审查轮次：`1`

## 检查证据

- `scripts/inspect-maintenance-candidate .../candidate-manifest.yaml`：审查开始与报告落盘前均退出 `0`；摘要均为 `54b23c...f269`，三文件 packed candidate 完整，无 untracked 文件。
- 任务包绑定的首次完整门禁：`scripts/verify-template` 于 `2026-09-01T14:20:50Z` 退出 `0`，证据记录为“模板核验通过（release）”。
- 本轴 fresh `scripts/verify-template`：退出 `0`；Node tooling `32/32`，skill projection / lock / registry / governance、Tactical Design、维护审查工作流及治理发布检查均通过。
- 本轴 fresh `git diff --check`：退出 `0`、无输出。该命令针对共享工作树，只作为补充检查；候选归属以 packed stream 和摘要为准。
- 适用规范：`AGENTS.md` 的 template-source / L3 / 独立审查 / 证据真实性 / 跨仓约束，`CONTEXT.md` 的执行证据与跨仓库契约术语，`docs/process/harness-process-tailoring.md` 的 L3、cross-repo 与 finding 闭环，`maintaining-skills` 的投影、锁、调用方和首次/最终完整门禁规则。
- 专项覆盖：本候选不是 Java、YSS Backend 或生产 UI 实现，Alibaba Java、YSS Backend、YSS UI fidelity 均未触发；适用的 skill 供应链、投影、registry、permission boundary 与跨仓分发规则已审查。机器检查通过不能覆盖下列人工发现。

## Findings

| ID | 严重度 | disposition | status | 位置 |
|---|---|---|---|---|
| STD-ARCHIFY-001 | P1 | violation | open | `.agents/skills/archify/scripts/yss-safe-deliver.mjs`，receipt 临时文件写入段 |
| STD-ARCHIFY-002 | P1 | violation | open | `.template-source/evidence/maintenance/archify-integration-refactor-2026-09-01.md` 末行 |
| STD-ARCHIFY-003 | P1 | missing_evidence | open | 三个 submodule gitlink hunk及 cross-repo 验证证据 |

### STD-ARCHIFY-001 — receipt 原子写入仍可跟随可预测符号链接

候选先构造 ``const temporaryReceipt = `${receipt}.tmp-${process.pid}`;``，随后直接执行 `fs.writeFileSync(temporaryReceipt, ...)`。这个名称可预测，且写入前没有使用 exclusive/no-follow 创建；如果同目录已存在该名字的符号链接，Node 的默认 `writeFileSync` 会跟随链接并截断链接目标。即使不是符号链接，也会覆盖同名的无关普通文件。之后的 `renameSync` 不会撤销该外部写入。

这直接违反候选自身 `docs/agents/archify-integration.md` 所声明的“安全启动器拒绝……符号链接逃逸、无关文件覆盖”，也违反本 L3 `permission-boundary` 触发项。现有 8 个 wrapper 测试只覆盖最终 HTML / receipt 路径，没有覆盖临时 receipt 预占用。应使用同目录、不可预测且 exclusive/no-follow 的临时文件创建方式，并补充符号链接与普通文件预占用压力用例；修复后重新捕获候选。机器检查未检测该 TOCTOU/临时路径边界。

### STD-ARCHIFY-002 — 冻结候选内的 REFACTOR 证据与候选事实矛盾

REFACTOR 证据末行写明“本轮没有提交或推送任何用户仓库”，但同一冻结候选和首次完整门禁证据明确绑定实现候选 `4725f6ab99ab819f36047b9e88aba9ff410eae75`，并把三个 submodule 指针更新到新的提交。即便当时尚未 push，“没有提交”在冻结候选中已不成立。

这违反 `CONTEXT.md` 对“执行证据”的真实性要求，也使 L3 checkpoint 引用的 `refactor` 证据不能原样支持当前候选。应把证据改为准确的时间线与提交/推送状态，并重新捕获摘要；不得在 Lead 聚合时把该 open finding 解释为已关闭。

### STD-ARCHIFY-003 — packed candidate 未提供三个子仓实现字节，跨仓 Standards 覆盖不可独立复核

packed candidate 对 `create-yss-harness-dev`、`create-yss-spec`、`yss-harness-dev-agent` 只保存 mode `160000` 的 gitlink SHA。任务包禁止把 live submodule 工作树纳入候选，输入证据仅以汇总句声称两套 CLI `56/56`、战术模板验证通过；没有把这些子仓固定提交的 diff/packed bytes、逐仓命令输出、分支/CI、回滚点或可读取报告绑定到本轴。因此本 reviewer 无法验证 gitlink 指向的内容是否与 root canonical skill、投影、锁文件和 CLI snapshot 一致。

`AGENTS.md` 与 `docs/process/harness-process-tailoring.md` 要求 cross-repo 合同绑定仓库、分支、CI、验证命令、发布顺序和回滚点；`code-review` 把缺失的适用 Standards 覆盖定义为 `missing_evidence`，不能以通过论。应提供每个固定子仓提交的不可变审查输入和可读取验证记录，或把它们纳入可验证的聚合候选合同，再重跑全部审查轴。

## Fowler smell baseline

未发现需要单列的 Fowler smell。`findProjectRoot` 与 `findRequestedProjectRoot` 的遍历形状相似，但两者有意区分真实路径与请求路径，用于阻止 symlink escape；不把该安全差异误报为 Duplicated Code。完整 vendoring 造成大 diff 是用户明确选择的供应链策略，不按 Speculative Generality 或 Shotgun Surgery 处理。

## 汇总

Standards：3 个 finding（2 `violation`、1 `missing_evidence`），最严重问题为 receipt 临时写入可越过声明的符号链接/覆盖边界；当前轴结论为 **blocked**。
