# Archify L3 正式独立审查 — Lead 汇总轴（Round 1）

## 裁决

**blocked**。本轴只汇总绑定以下摘要的 `yss-worktree-candidate-v1` packed candidate 及 Standards / Spec 两轴报告，不把当前工作树或后续审查证据视为实现候选。

- `candidate_digest`: `54b23c365d3a1625bfd116e3fede67db03a41bdf6bd03bbf2c87457be137f269`
- `review_mode`: `worktree`
- `review_base_ref` / `merge_base`: `b62d97da2bdf6e0253e3a530179eaa8a0db924da`
- `review_round`: `1`
- Standards 轴：`blocked`，2 个 `violation`、1 个 `missing_evidence`
- Spec 轴：`blocked`，2 个 `violation`
- 去重后：4 个 open `violation`

候选不能进入 `release-ready`，也不能形成通过型 formal review record。下一路由为 `repair-and-refreeze`：交回原实施者在原维护合同范围修复，补齐跨仓不可变审查输入，重新执行验证并捕获新 candidate digest；旧摘要及本轮三轴报告随候选变化失效，Round 2 必须对新摘要重跑 Standards、Spec、Lead 全轴审查。

## 候选与输入完整性

- `scripts/inspect-maintenance-candidate .../candidate-manifest.yaml` 退出 `0`；`tracked_diff_bytes=7508919`，无 untracked 文件。
- `candidate.bin` 的 SHA-256 为 `54b23c365d3a1625bfd116e3fede67db03a41bdf6bd03bbf2c87457be137f269`，与 manifest、任务包及两轴报告一致。
- Standards 与 Spec 报告均明确只审查该 packed candidate，且均给出 `blocked` 结论。
- 冻结 diff 复核了安全包装器的 receipt 临时写入、Skill 交付示例、REFACTOR 证据原文和三个 gitlink；未以 live submodule 或当前工作树补足候选缺失内容。

## 去重 Findings

| ID | 严重度 | disposition | status | 来源 | 位置 / 范围 |
|---|---|---|---|---|---|
| LEAD-ARCHIFY-001 | P1 | violation | open | STD-ARCHIFY-001 | `.agents/skills/archify/scripts/yss-safe-deliver.mjs` receipt 临时写入 |
| LEAD-ARCHIFY-002 | P1 | violation | open | STD-ARCHIFY-002 | `.template-source/evidence/maintenance/archify-integration-refactor-2026-09-01.md` |
| LEAD-ARCHIFY-003 | P1 | violation | open | STD-ARCHIFY-003 + SPEC-001 | 主模板、战术模板与两套 CLI 的跨仓候选及发布合同 |
| LEAD-ARCHIFY-004 | P1 | violation | open | SPEC-002 | `.agents/skills/archify/SKILL.md` 稳定交付命令示例 |

### LEAD-ARCHIFY-001 — receipt 临时文件违反声明的覆盖与符号链接边界

冻结候选使用可预测的 ```${receipt}.tmp-${process.pid}```，并以默认 `writeFileSync` 直接写入。预先存在的同名符号链接可被跟随并截断链接目标，同名普通文件也会被覆盖；之后的 `renameSync` 不能撤销已经发生的外部写入。该行为与候选声明的“拒绝符号链接逃逸、无关文件覆盖”矛盾，且属于已命中的 `permission-boundary`。

修复要求：采用同目录、不可预测、exclusive/no-follow 的临时创建方式，保证失败清理；补充临时 receipt 被符号链接和普通文件预占用的压力测试，并同步主模板、战术模板、投影与两套 CLI 快照后重捕获候选。

### LEAD-ARCHIFY-002 — REFACTOR 证据的提交状态与冻结候选不一致

REFACTOR 证据声称“本轮没有提交或推送任何用户仓库”，但冻结候选和首次完整门禁已绑定实现候选 `4725f6ab99ab819f36047b9e88aba9ff410eae75`，且含三个新 submodule gitlink。即使尚未 push，“没有提交”也不是该候选的真实时间线，不能作为当前候选的有效执行证据。

修复要求：按实际时间线区分“已提交”和“尚未推送”，更新证据后随实现修复一起重捕获候选。

### LEAD-ARCHIFY-003 — 跨仓实现内容与发布合同没有绑定到可独立复核的候选

Standards 的 `STD-ARCHIFY-003` 与 Spec 的 `SPEC-001` 指向同一根因，合并为一条 finding。packed candidate 只包含三个 mode `160000` gitlink，没有绑定三个子仓固定提交的实现字节或等价不可变审查输入；现有证据也没有完整登记四仓分支、CI / 实际验证、依赖发布顺序和逐仓回滚点。因此两轴无法独立复核“主模板、战术模板及两套 CLI 已同步”的跨仓整体声明。

该缺口直接违反跨仓模板维护的强制合同，Lead 采用 Spec 轴的 `violation` 分类；Standards 轴的 `missing_evidence` 作为同一 finding 的证据维度保留，不重复计数。

修复要求：提供四仓不可变 commit、分支、CI / 实际命令及结果、发布顺序、逐仓回滚点，并把三个子仓固定提交的 packed diff / 可取回不可变对象或等价审查资料纳入新任务包的允许读取输入。

### LEAD-ARCHIFY-004 — 稳定交付命令示例按原样执行会被同一包装器拒绝

Skill 先要求“从仓库根调用”，示例却传入仓库根下的裸 `<diagram-id>.archify.json` 与 `<diagram-id>.html`；后续文字规定的稳定根为 `docs/architecture/diagrams/...` 或 `.template-source/evidence/maintenance/diagrams/...`。按候选包装器合同，复制示例执行会因稳定 source/output 不在允许根而失败。

修复要求：把示例改为可直接执行的 `project-instance` / `template-source` 配对路径，或提供不会展开为裸仓库根路径的明确变量示例，并保证 source、HTML 与 receipt 命名一致。

## 冲突与新增影响判断

- 两轴对跨仓问题的分类不同，但事实、范围和修复要求一致；Lead 将其去重并按强制合同缺失裁决为 `violation`。
- 未发现需要升级为 `drift` 或 `new_impacts` 的事实；四项均可在既有 L3 `generation-semantics`、`cross-repo-contract`、`permission-boundary`、`aggregate-behavior-change` 合同内修复。
- 未接受任何 `judgement-call`，也未把审查偏好升级为新硬要求。

## Round 1 路由

Round 1 存在 4 个 open `violation`，必须 `repair-and-refreeze`。实施者修复后应完成聚焦检查与跨仓验证，更新 RED / GREEN / REFACTOR / pressure / checkpoint 中受影响事实，重新捕获 packed candidate 并生成绑定新摘要的 Round 2 三轴任务包。只有 Round 2 findings 全部关闭且最终完整 `scripts/verify-template` fresh verification 通过，才可评估 `release-ready`；本报告不批准发布、提交或推送。
