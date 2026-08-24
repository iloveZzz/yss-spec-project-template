# git-submodule 显式 writable 与普通覆盖路径 正式独立审查请求

> 实施者不得在本文件填写审查结论。`result=pass` 只表示本请求可被 checkpoint 校验器解析，不表示审查已通过。

## 范围

针对第三轮审查三题：空 gitlink 的 `inspectWorkingTreeScope` 仍返回可写、detached HEAD 子仓内脚手架仍会生成、`--force` 覆盖 gitlink 仍走普通目录覆盖路径。

本请求只审这三项回流是否真正闭合。不得根据实施者自述宣布可合并或模板可发布。

## 请审查

1. 已正确登记为 `git-submodule` 的空 gitlink，`inspectWorkingTreeScope` 是否仍返回可写。
2. 在 detached HEAD 子仓工作树内调用脚手架（`--output-dir` 指向子仓）是否仍会生成工程。
3. `--force` 覆盖 gitlink 挂载点是否仍走普通目录覆盖路径。

## 关键路径

- `scripts/lib/repository-scope-policy.mjs`（`inspectWorkingTreeScope`、`isWorkingTreeWritable`、`gitSubmoduleScaffoldViolation`）
- `.agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs`（`refuseGitlinkAsRegularDirectory`）
- `.agents/skills/yss-ddd-scaffold-generator/scripts/scaffold-generator.test.mjs`
- `scripts/verify-repository-scope-scenarios`
- `.template-source/evidence/maintenance/git-submodule-scope-review-findings-writable-api-2026-08-24.md`
