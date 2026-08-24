# git-submodule repository_scope 修订后正式独立审查请求

> 实施者不得在本文件填写审查结论。`result=pass` 只表示本请求可被 checkpoint 校验器解析，不表示审查已通过。

## 范围

针对 `.template-source/evidence/maintenance/git-submodule-scope-review-findings-2026-08-24.md` 的 findings 修订后候选：闭合三种 `repository_scope` 误路由窗口，禁止把空 gitlink / detached HEAD / `--force` 挂载点当成普通目录，并为未知 scope、layout 错配、同源 url、复制源码进 Harness 增加具名压力场景。

上一轮审查第 3、4 题已通过，本请求只审回流是否真正闭合 findings。不得根据实施者自述宣布可合并或模板可发布。

## 请审查

1. 缺 `git_entry_mode`、`harness-apps` 填写 gitlink 身份字段、工作树 gitlink 却声明 `harness-apps` 是否仍可误路由。
2. 空 gitlink、detached HEAD、`--force` 覆盖挂载点是否仍会被脚手架或 Agent 当成普通目录。
3. `scripts/verify-repository-scope-scenarios` 是否以 `named stress <id>: PASS` 覆盖 `unknown_scope`、`layout_mismatch`、`same_origin_url`、`copy_source_into_harness`。

## 关键路径

- `scripts/lib/repository-scope-policy.mjs`
- `scripts/verify-repository-scope-scenarios`
- `docs/process/implementation-repo-integration.md` §1.3
- `.agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs`
- `.template-source/evidence/maintenance/git-submodule-scope-review-findings-2026-08-24.md`
