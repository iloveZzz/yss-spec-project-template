---
name: yss-tactical-design
description: 在 YSS 技术分析阶段将批准的战略领域输入细化为可审查的聚合、行为、一致性和 Gateway 设计；不生成生产代码。
---

# yss-tactical-design

本 skill 负责 DDD 战术设计，不新增生命周期主阶段，也不替代 `yss-stage-decision` 或 `yss-domain`。

## 适用边界

- 由 `yss-product-lifecycle` 在 `work-unit.technical-analysis` 中按领域影响条件调度。
- 输入必须是版本当前的 Spec、功能架构、战略 DDD、状态矩阵、OpenAPI Draft / Freeze、ADR 和工程约束。
- 默认将结果写入系统概要设计 / 数据架构中的 Tactical DDD Check；聚合、状态机、一致性或持久化映射复杂到无法清楚表达时，才升级为独立战术设计文档。
- 没有聚合、状态、不变量、一致性或领域边界影响时返回 `not-applicable` 及原因，不生成空设计。

## 设计内容

必须明确 Aggregate Root、Entity、Value Object、领域行为、状态转换、不变量、一致性 / 事务、幂等 / 并发、Domain Event、Gateway、持久化映射和 Domain / Application 测试 seam。

数据库表、HTTP 调用链或菜单结构不能单独决定聚合边界；OpenAPI 不得暴露内部聚合、Repository 或持久化表结构。

## 输出与状态

输出结构化 tactical-design contract、验证结果、评审引用和影响标记。状态使用 `draft`、`ready-for-human`、`approved`、`blocked`、`stale`、`drift`、`new_impacts`。

当用户或当前技术分析 / 架构评审合同明确要求聚合关系、状态转换、调用链、数据流或 Before/After 图示时，追加使用 `archify`。图必须从当前 Spec、ADR、OpenAPI、Tactical Design Contract 和代码证据派生，保存成 `*.archify.json`、`*.html` 与 `*.receipt.json` 配对资产；它是审查证据，不是新的事实源或批准门禁。没有明确图示要求时，不把 `archify` 加入 `required_skills`。

本 skill 不能自行批准资产、设置 `ready-for-agent`、创建 Ticket 或修改生命周期状态。批准由 `yss-product-lifecycle` 维护；独立架构评审使用 `evidence.tactical-design-review`。

## 与实现交接

批准且版本当前的战术设计合同由 `Slice Implementation Contract` 引用，再由 `yss-domain` 使用 `behavior-tdd` 实现。`yss-domain` 不得静默重新定义聚合或不变量；发现新的 API、状态、数据或架构影响时必须返回 `new_impacts` / `drift` 并重新路由。

合同、Schema、校验规则和示例见 `references/`；使用 `scripts/validate-tactical-design.mjs` 做只读验证。该 skill 不生成 Java、Repository、Controller、DTO、OpenAPI Freeze、实现 Ticket 或生产代码。
