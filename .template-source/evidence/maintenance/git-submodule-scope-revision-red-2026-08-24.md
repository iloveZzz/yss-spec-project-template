# git-submodule 审查回流 RED 基线

日期：2026-08-24

对应 findings：`.template-source/evidence/maintenance/git-submodule-scope-review-findings-2026-08-24.md`

在补强制字段、工作树对照和具名压力场景之前，对当时 HEAD 政策库探测：

```text
missing_git_entry_mode null
detached_head_scaffold_required null
harness_apps_gitlink_path_only null
named stress lines: 0
实现仓库 repository_scope 压力场景验证通过
```

失败语义：

- `git-submodule` 缺少 `git_entry_mode` 仍返回 `null`，可被当成普通 `apps/` 目录。
- `checkout_state: detached-head` 且 `scaffold_status: required` 仍返回 `null`。
- `harness-apps` 填写 `gitlink_path` / `gitmodules_name` 仍返回 `null`。
- `scripts/verify-repository-scope-scenarios` 不输出 `named stress unknown_scope` 等具名 oracle。
- `inspectWorkingTreeScope` 尚未导出。
