# Harness 工程一页蓝图

本文面向业务方、管理者和项目干系人，用于快速说明 Harness 工程为什么做、怎么跑、哪些门禁不能跳，以及如何从试点开始。

## 为什么做

AI 不能只作为一次性辅助工具使用。Harness 工程的目标，是把 AI 放进可治理的软件研发流水线，让需求、设计、契约、实现、审查、发布和复盘都有可追踪产物、质量门禁和验证证据。

## 怎么分阶段

对外可以用 13 个工作单元理解全链路：

```text
机会 / 问题收集
→ 需求澄清
→ PRD + 原型并行
→ SDD 研发规范基线
→ DDD 领域建模
→ 架构设计
→ 垂直切片 Issue
→ 垂直 Issue 详细设计
→ TDD 并行开发
→ 测试验证
→ Code Review
→ 发布部署
→ 反馈复盘
```

对内执行时，13 个工作单元映射到本仓库 8 个主阶段和 21 个门禁。权威执行索引仍是 `docs/process/lifecycle-artifact-map.md`。

## 哪些门禁不能跳

- API 变化必须先有 API 影响记录和契约草案 / review-only OpenAPI Draft，并在实现或生成客户端前完成 Freeze 或记录无 API 影响。
- 正式垂直切片前必须有 active OpenSpec / Comet change 和完整 change 资产。
- 架构、数据、ADR、工程基线和安全红线必须进入 Build Architecture Checklist。
- 支付、迁移、认证授权、加密、SQL、公共基础库 API 等安全红线必须人工审查。
- 完成、可合并或可发布结论必须有 fresh verification。
- 每个阶段结束必须记录 Issue 同步状态和 Git checkpoint 判断。

## 试点怎么跑

先选择一个真实、低风险、边界清晰的业务模块，按半自动闭环推进：

```text
PRD
→ API 影响分析 / 契约草案
→ review-only OpenAPI Draft（如需要）
→ Comet Change
→ 垂直切片
→ TDD
→ Review
→ Release
→ Retro
```

试点不追求一开始全自动。优先验证流程能否降低风险、减少返工、稳定沉淀模板和 Skill。

## 成功指标

- PRD Ready 一次通过率提升。
- 阶段产物一次通过率提升。
- 规范偏离次数下降。
- ready-for-agent 到可验证 PR 的周期缩短。
- 回归缺陷数下降。
- 模板、脚本和 Skill 能从复盘中持续更新。
