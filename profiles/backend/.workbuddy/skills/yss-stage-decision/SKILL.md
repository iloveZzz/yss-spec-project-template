---
name: yss-stage-decision
description: 编排 Plan 到 Spec 入口的方案决策与业务边界、协作和规则设计；当需求、业务责任区、统一业务词汇或下游影响尚未稳定时使用。
disable-model-invocation: true
---

# 业务边界与方案决策

从用户目标、现有需求、业务故事和 CONTEXT.md 整理事实、规则、假设、约束与待决定事项。按需使用 yss-research、grilling 和 domain-modeling。

说明每个业务责任区的职责、关键对象、规则提供方和使用方、交接信息、失败路径与非目标。业务依赖方向与 HTTP 或消息方向分开表达，不从数据库表反推业务边界。

复用已有 Plan、Spec 或 ADR 写明选择、理由、代价与重新考虑条件。记录影响当前工作的重要未决项；不要求固定 Schema、稳定 ID、阶段包、检查命令或批准状态。

输出可供设计和实现使用的业务说明。技术架构与 API 设计按实际任务交给相应技能，不增加流程前置。
