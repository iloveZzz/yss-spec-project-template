# Harness 状态模型评估

本文评估是否需要为 Harness 工程引入统一状态模型。当前只做评估，不直接引入状态机实现。

## 现状

当前状态分布在多个载体中：

- Issue tracker：需求、阶段同步、里程碑、评论和标签。
- OpenSpec / Comet：change 状态、proposal、design、tasks、spec、`.comet.yaml`。
- 文档资产：PRD、OpenAPI Freeze、Architecture Review、Build Architecture Checklist、verification、release note、retro。
- Git：分支、提交、推送、MR / PR 和 checkpoint。

这种方式灵活，但随着自动化增强，可能出现状态重复、状态冲突或推进条件不一致。

## 引入统一状态模型的收益

| 收益 | 说明 |
|---|---|
| 降低状态冲突 | 明确当前 change 到底处于 Discovery、Design、Freeze、Build、Review、Release 还是 Retro |
| 支撑自动化门禁 | 自动化脚本可以根据统一状态判断下一步可做什么 |
| 提升可观测性 | 管理者和 Agent 能看到阶段、阻塞、人审和验证状态 |
| 减少重复记录 | 避免 Issue、Comet、文档各写一套互相不一致的状态 |

## 成本与风险

| 风险 | 说明 | 缓解 |
|---|---|---|
| 过早复杂化 | 试点前引入状态机可能增加流程负担 | 先用 checkpoint 和 Comet 状态跑试点 |
| 与 Issue / Comet 状态冲突 | 多个状态源可能互相覆盖 | 明确单一权威来源或只做派生视图 |
| 自动化误放行 | 状态模型若设计过粗，可能绕过人工审查 | 安全红线状态必须 fail-closed |
| 维护成本 | 状态字段需要持续更新 | 从自动生成状态摘要开始，不先做强制状态机 |

## 评估结论

当前阶段不建议立即引入独立 Harness 状态机。建议先采用轻量状态摘要：

- Issue tracker 继续作为协作和阶段同步入口。
- OpenSpec / Comet 继续作为规格变更和 build 状态锚点。
- 阶段 checkpoint 记录当前阶段、阻塞、安全人审和下一步。
- 自动化候选先读取现有状态，不写入新的权威状态源。

## 进入下一轮设计的触发条件

任一条件出现时，再启动统一 Harness 状态模型设计：

- 同一 change 的 Issue 状态、Comet phase 和文档阶段多次冲突。
- 自动化脚本需要稳定判断跨阶段准入条件。
- 多个团队并行使用 Harness，人工同步成本明显上升。
- 管理层需要统一看板展示阶段、阻塞、验证和发布状态。
- 试点复盘证明状态分散是主要瓶颈。

## 候选状态草案

仅供下一轮设计参考，不作为当前执行规则：

```text
intake
→ discovery
→ prd-ready
→ design-ready
→ api-draft
→ architecture-reviewed
→ contract-frozen
→ change-ready
→ build-ready
→ in-build
→ review
→ verified
→ released
→ retro
```

安全红线、人审阻断、架构漂移和验证失败应作为独立阻断状态或状态属性，不能被普通阶段推进覆盖。

