# git-submodule 空 gitlink / detached HEAD 写入门禁 GREEN

日期：2026-08-24

命令：`scripts/verify-template`

退出码：0

摘录：

```
named stress empty_gitlink_as_regular_dir: PASS
named stress detached_head_as_regular_dir: PASS
named stress force_overlay_mount: PASS
实现仓库 repository_scope 压力场景验证通过
YSS 脚手架生成器受控生成场景验证通过
模板发布校验通过
```

脚手架回归：`拒绝在 detached HEAD 子仓工作树内当成普通目录生成` 通过。`inspectWorkingTreeScope` 对已登记的空 gitlink / detached HEAD 返回写入阻断。本轮不宣布可合并或模板可发布。
