---
name: yss-mvc-data-analysis-project-initializer
description: 迁移历史数据分析初始化合同到 yss-layered-mvc-scaffold-generator 的 mvc-data-analysis-v1 Profile。
---

# 数据分析 MVC 项目初始化（Deprecated）

本入口处于 `migration-only`。`mvc-data-analysis-v1` 已由 `yss-layered-mvc-scaffold-generator` 原生持有；本入口不得进入新的 Project Scaffold Contract、Recipe、typed dependency 或任务包。

发现旧合同或调用方引用本 ID 时返回 `skill-deprecated`，将合同标记为 `stale`，改由编译器生成绑定 `generator_skill=yss-layered-mvc-scaffold-generator` 与 `architecture_profile=mvc-data-analysis-v1` 的新合同。不得静默替换、继承批准或自动设置 `ready-for-agent`。

`scripts/run_scaffold_verification.mjs` 仅为历史已生成项目保留只读恢复验证；它不允许新生成。迁移关系由 `docs/agents/skill-migrations.md` 记录；引用归零后删除本目录，不建立 alias。
