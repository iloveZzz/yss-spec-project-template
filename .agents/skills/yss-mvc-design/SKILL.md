---
name: yss-mvc-design
description: 迁移历史 yss-mvc-design 引用到 yss-technical-design；不再承接新的 MVC 技术设计。
---

# YSS MVC 技术设计（Deprecated）

本入口处于 `migration-only`。新的 MVC 技术设计统一使用 `yss-technical-design`；本入口不再拥有 capability、Recipe、typed dependency 或设计批准责任，也不得进入新的 Technical Design 或 Slice Contract。

发现旧合同、任务包或调用方引用本 ID 时，返回 `skill-deprecated`，报告替代入口 `yss-technical-design`，并把旧合同标记为 `stale` 后重新编译。不得静默替换 Skill、继承旧批准或自动设置 `ready-for-agent`。

`references/mvc-design.schema.json` 在退役期保持只读，仅用于与 `yss-technical-design/references/mvc-design.schema.json` 做语义等价检查。新合同不得引用本目录。迁移关系由 `docs/agents/skill-migrations.md` 记录；硬退役后不保留 alias。
