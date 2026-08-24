# git-submodule 修订审查 findings（第二轮）

日期：2026-08-24

审查入口：`.template-source/evidence/maintenance/git-submodule-scope-l3-review-request-revision-2026-08-24.md`

| # | 问题 | 答案 | 裁决 |
|---|---|---|---|
| 1 | 缺 `git_entry_mode`、`harness-apps` 填写 gitlink 身份字段、工作树 gitlink 却声明 `harness-apps` 是否仍可误路由 | 不可以 | 通过 |
| 2 | 空 gitlink、detached HEAD、`--force` 覆盖挂载点是否仍会被脚手架或 Agent 当成普通目录 | 是 | finding：仍会 |
| 3 | 具名压力场景是否覆盖 `unknown_scope`、`layout_mismatch`、`same_origin_url`、`copy_source_into_harness` | 是 | 通过 |

## 回流

- Agent 门禁：即使已登记为 `git-submodule`，`inspectWorkingTreeScope` 对空 gitlink / detached HEAD 也必须阻断写入。
- 脚手架：不得把 detached HEAD 子仓工作树当成普通 `--output-dir` 生成；`implementationWriteViolation` 覆盖挂载点覆盖与工作树内写入。
