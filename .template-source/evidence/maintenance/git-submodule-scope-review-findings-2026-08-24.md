# git-submodule 正式独立审查 findings 与回流

日期：2026-08-24

审查入口：`.template-source/evidence/maintenance/git-submodule-scope-l3-review-request-2026-08-24.md`

审查者按五题作答。实施者不在审查请求中填写结论。本文件只记录 findings 与回流范围；修订后候选须再经非实施者正式独立审查，当前不得声称可合并 / 可发布。

## 审查答案

| # | 问题 | 答案 | 裁决 |
|---|---|---|---|
| 1 | 三种 scope 在登记字段、Git 身份和写路径上是否可区分，有无误路由窗口 | 是的 | finding：存在误路由窗口 |
| 2 | 空 gitlink / detached HEAD / `--force` 覆盖挂载点是否仍会被脚手架或 Agent 当成普通目录 | 是的 | finding：仍会当成普通目录 |
| 3 | 先子后父 commit/push 与 `superproject-gitlink-update` 是否覆盖跨仓切片交付 | 是的 | 通过 |
| 4 | CLI 不接管 `.gitmodules` 与 gitlink 是否与 `create-yss-spec` 契约一致 | 是 | 通过 |
| 5 | 压力场景是否覆盖未知 scope、layout 错配、同源 url、复制源码进 Harness | 不覆盖 | finding：缺少具名压力场景 |

## 回流范围

- 强制 `git-submodule` 登记 `git_entry_mode: 160000`、`gitlink_path`、`superproject_git_url`、`checkout_state`；`harness-apps` / `external-repository` 禁止 gitlink 身份字段。
- 工作树对照 `inspectWorkingTreeScope`：声明 `harness-apps` 但实际 gitlink 阻断。
- 空 gitlink、detached HEAD、`--force` 覆盖挂载点不得当成普通目录；`scaffold_status=required` 与生成器均阻断。
- `scripts/verify-repository-scope-scenarios` 输出具名压力场景：`unknown_scope`、`layout_mismatch`、`same_origin_url`、`copy_source_into_harness`，并补 `missing_git_entry_mode`、`declared_harness_apps_actual_gitlink`、`empty_gitlink_as_regular_dir`、`detached_head_as_regular_dir`、`force_overlay_mount`。
