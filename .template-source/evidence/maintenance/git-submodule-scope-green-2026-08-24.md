# git-submodule repository_scope GREEN / fresh verification

日期：2026-08-24

命令：`scripts/verify-template`

退出码：0

摘录：

```
技能路由注册表校验通过（shadow，80 个共享，2 个平台）
生命周期注册表验证通过（shadow）
实现项目路径策略压力场景验证通过
实现仓库 repository_scope 压力场景验证通过
YSS 脚手架生成器受控生成场景验证通过
Matt/YSS 集成压力场景验证通过
YSS Router stage 7 scenarios passed
模板发布校验通过
```

`pnpm --dir .template-source/tooling/node test`：16 pass / 0 fail，含 `repository_scope git-submodule is a first-class layout distinct from harness-apps`。
