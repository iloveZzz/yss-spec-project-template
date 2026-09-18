---
name: yss-backend-scaffold-parent
description: 迁移历史 DDD scaffold parent 引用到 yss-ddd-scaffold-generator 的内部工程基线。
---

# YSS Backend Scaffold Parent（Deprecated）

本入口处于 `migration-only`，不再作为独立 Skill、capability、Recipe 或 typed dependency。DDD 工程基线由 `yss-ddd-scaffold-generator/references/engineering-baseline.md` 持有，并由生成器和首切片验证器绑定摘要。

发现旧合同、任务包或 Manifest 仍把 `yss-backend-scaffold-parent` 当作 Skill 时返回 `skill-deprecated`，将合同标记为 `stale` 后重新编译。不得静默替换、继承旧批准或自动设置 `ready-for-agent`。

历史 Manifest 中的 `readiness.contracts.scaffold_parent` 只允许验证器只读恢复；新 Manifest 写入 `readiness.contracts.engineering_baseline`。引用归零后删除本迁移壳，不建立 alias。
