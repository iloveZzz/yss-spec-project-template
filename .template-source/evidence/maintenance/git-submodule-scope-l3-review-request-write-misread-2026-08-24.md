# git-submodule 空 gitlink / detached HEAD 写入门禁 正式独立审查请求

> 实施者不得在本文件填写审查结论。`result=pass` 只表示本请求可被 checkpoint 校验器解析，不表示审查已通过。

## 范围

针对第二轮审查第 2 题：空 gitlink、detached HEAD、`--force` 覆盖挂载点是否仍会被脚手架或 Agent 当成普通目录。

第 1、3 题已通过。本请求只审：Agent `inspectWorkingTreeScope` / `implementationWriteViolation` 与脚手架是否拒绝把空 gitlink 和 detached HEAD 工作树当普通目录。不得根据实施者自述宣布可合并或模板可发布。

## 请审查

1. 已正确登记为 `git-submodule` 的空 gitlink，`inspectWorkingTreeScope` 是否仍返回可写。
2. 在 detached HEAD 子仓工作树内调用脚手架（`--output-dir` 指向子仓）是否仍会生成工程。
3. `--force` 覆盖 gitlink 挂载点是否仍走普通目录覆盖路径。

## 关键路径

- `scripts/lib/repository-scope-policy.mjs`（`implementationWriteViolation`、`inspectWorkingTreeScope`、`gitSubmoduleScaffoldViolation`）
- `.agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs`
- `.agents/skills/yss-ddd-scaffold-generator/scripts/scaffold-generator.test.mjs`
- `scripts/verify-repository-scope-scenarios`
