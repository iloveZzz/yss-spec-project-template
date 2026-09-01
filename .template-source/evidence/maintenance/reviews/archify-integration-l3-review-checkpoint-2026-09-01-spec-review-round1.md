# Archify L3 正式独立审查 — Spec 轴（Round 1）

- 结论：`blocked`
- 审查模式：`worktree` / `yss-worktree-candidate-v1`
- 基线：`b62d97da2bdf6e0253e3a530179eaa8a0db924da`
- `candidate_digest`：`54b23c365d3a1625bfd116e3fede67db03a41bdf6bd03bbf2c87457be137f269`
- 摘要复核：`candidate.bin` SHA-256 与 manifest 一致；`tracked_diff_bytes=7508919`，无 untracked 文件。
- 覆盖：流程语义、范围、单一事实来源、主模板 / 战术模板 / 两套 CLI 的跨仓契约。只消费冻结的 packed candidate 与任务包证据，未把当前工作树或后续审查资产纳入候选。

## Findings

### SPEC-001 — 跨仓发布合同缺少强制绑定信息

- 类型：`violation`
- 状态：`open`
- 处置：`implementer-fix-and-recapture`
- 依据：`docs/process/harness-process-tailoring.md:24` 要求跨仓记录绑定“实现仓库、分支、CI、验证命令、发布顺序和回滚点”；`:28` 还要求集中 checkpoint 记录范围、受影响仓库、阻塞项和下一步。
- 观察：冻结候选只携带三个 submodule gitlink，GREEN 证据只给出测试计数与包体信息；现有 checkpoint / 首次门禁证据未绑定四个仓库的分支、CI、发布顺序和回滚点。任务包也未提供子仓候选字节或可读取的等价审查证据，因此“主模板、战术模板及两套 CLI 已同步”的声明无法由本 Spec 轴独立复核。
- 修复要求：补齐四仓不可变 commit、分支、CI / 实际验证、依赖发布顺序和逐仓回滚点，并把可读取的跨仓候选证据纳入审查输入；随后重捕获候选并全轴复审。

### SPEC-002 — 稳定交付命令示例违反同一 Skill 的路径合同

- 类型：`violation`
- 状态：`open`
- 处置：`implementer-fix-and-recapture`
- 依据：候选 `docs/agents/archify-integration.md:14-15` 要求稳定资产只能位于仓库模式允许根；候选 `.agents/skills/archify/SKILL.md:21-27` 同样规定从仓库根调用安全包装器并遵守该根目录。
- 观察：同一 Skill 的命令示例使用仓库根下的裸路径 `<diagram-id>.archify.json <diagram-id>.html`。按候选包装器 `stableContract` 的实现，该调用不位于 `docs/architecture/diagrams/...` 或 `.template-source/evidence/maintenance/diagrams/...`，必然被拒绝，导致按文档执行无法完成稳定交付。
- 修复要求：分别给出 `project-instance` 与 `template-source` 的完整配对路径（或一个不会产生裸根路径的明确变量示例），并保持 JSON / HTML / receipt 命名一致；随后重捕获候选并全轴复审。

## 汇总

Spec 轴共 2 个 finding：2 个 `violation`、均为 `open`；最严重问题是跨仓发布合同缺少强制证据绑定。当前摘要不得进入 `release-ready`。
