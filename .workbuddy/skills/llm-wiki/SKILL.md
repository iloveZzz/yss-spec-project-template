---
name: llm-wiki
description: "Build or refresh a local LLM wiki; use for wiki init, ingest, rebuild, lint, or source-backed wiki questions."
disable-model-invocation: true
---

# 本地知识库

按用户要求直接创建、更新或查询本地 Markdown wiki。真实代码和文档是事实来源，wiki 是可追溯的整理结果。

默认使用 wiki/，模板源可使用 .template-source/wiki/。先阅读已有 index.md 和相关页面，增量编辑；不要覆盖已有知识库或为查询自动创建文件。

构建时整理主题、概念、关系和来源，保留必要原始材料，使用有效的相对链接。更新时只修改受影响文章，并简要记录变更。查询时引用来源并区分事实、推断与未知。

不要求脚本、manifest、事务包、结构 lint 或测试报告。大范围重建和删除须在用户授权范围内，不能用新摘要掩盖未知来源。
