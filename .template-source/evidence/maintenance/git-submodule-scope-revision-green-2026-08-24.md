# git-submodule 审查回流 GREEN / fresh verification

日期：2026-08-24

命令：`scripts/verify-template`

退出码：0

摘录：

```
named stress unknown_scope: PASS
named stress layout_mismatch: PASS
named stress same_origin_url: PASS
named stress copy_source_into_harness: PASS
named stress missing_git_entry_mode: PASS
named stress empty_gitlink_as_regular_dir: PASS
named stress declared_harness_apps_actual_gitlink: PASS
named stress detached_head_as_regular_dir: PASS
named stress force_overlay_mount: PASS
实现仓库 repository_scope 压力场景验证通过
YSS 脚手架生成器受控生成场景验证通过
Matt/YSS 集成压力场景验证通过
YSS Router stage 7 scenarios passed
模板发布校验通过
```

`pnpm --dir .template-source/tooling/node test`：16 pass / 0 fail。

本轮闭合了独立审查 findings 的机器检查，但不宣布可合并或模板可发布；修订后候选见 `.template-source/evidence/maintenance/git-submodule-scope-l3-review-request-revision-2026-08-24.md`。
