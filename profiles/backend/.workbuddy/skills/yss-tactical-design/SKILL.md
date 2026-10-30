---
name: yss-tactical-design
description: 在 YSS 技术分析阶段将批准的战略领域输入细化为可审查的聚合、行为、一致性和 Gateway 设计；不生成生产代码。
disable-model-invocation: true
---

# yss-tactical-design

已有生命周期资产优先用 `scripts/contract view <资产> --kind <类型>` 阅读；执行任务用 `--profile task --unit <ID>`，绑定与校验明细用 `--profile full`。视图不授予执行权限，仍按本 Skill 的原始来源和批准门禁处理。类型、准备和迁移见 `.template-spec/process/contract-reading.md`。

本 skill 负责 DDD 战术设计，不新增生命周期主阶段，也不替代 `yss-stage-decision` 或 `yss-domain`。

## 适用边界

- 由 `yss-technical-design` 在已确认 `domain-driven` 的技术设计分支中调用；新建后端必须先通过 `gate.backend-architecture-platform-approved`，由用户在同一次决定中确认 DDD / MVC 与精确 Spring Boot 版本。传统 MVC 由 `yss-technical-design` 自身的 `layered-mvc` 分支负责；既有工程直接核验并复用当前登记架构及固定工程基线/POM 中的实际 Spring Boot 版本，不重复询问。不得按状态、一致性影响、目录或默认值单独推断为 DDD。
- 输入必须是版本当前的 Spec、功能架构、战略 DDD、状态矩阵、OpenAPI Draft / Freeze、ADR 和工程约束。PR/MR 材料先按主控的在线固定提交核验；旧战略包消费验证已退役，历史绑定不得当作当前验证通过。目标业务词汇仍须对账。
- 默认将结果写入系统概要设计 / 数据架构中的 Tactical DDD Check；聚合、状态机、一致性或持久化映射复杂到无法清楚表达时，才升级为独立战术设计文档。
- 没有聚合、状态、不变量、一致性或领域边界影响时返回 `not-applicable` 及原因，不生成空设计。

## 设计内容

必须明确 Aggregate Root、Entity、Value Object、领域行为、状态转换、不变量、一致性 / 事务、幂等 / 并发、Domain Event、Gateway、持久化映射和 Domain / Application 测试 seam。

数据库表、HTTP 调用链或菜单结构不能单独决定聚合边界；OpenAPI 不得暴露内部聚合、Repository 或持久化表结构。

对象职责、命名及阿里/COLA 适配消费 `.template-spec/agents/backend-architecture-profiles.md` 的“对象命名与外部规范适配”。在既有 `entity_catalog` 与 `persistence_mapping` 中区分领域 Entity 和持久化 PO，具体类型名承接工程基线；手册/COLA 的数据库 DO 不能充当领域设计。

## 输出与状态

新产物输出 Technical Design Contract schema v2 的 DDD `design` 分支（沿用 v1 DDD 内容结构）；旧独立 tactical-design contract schema v1 仅显式兼容读取，不自动迁移或批准。输出验证结果、评审引用和影响标记；来自 Strategic Design Handoff 时保留 `strategic_context_import_ref` 与 `context_reconciliation_ref`。状态使用 `draft`、`ready-for-human`、`approved`、`blocked`、`stale`、`drift`、`new_impacts`。

当用户或当前技术分析 / 架构评审合同明确要求聚合关系、状态转换、调用链、数据流或 Before/After 图示时，提供相应图示。图必须从当前 Spec、ADR、OpenAPI、Tactical Design Contract 和代码证据派生，作为审查证据，不是新的事实源或批准门禁。

本 skill 不能自行批准资产、设置 `ready-for-agent`、创建 Ticket 或修改生命周期状态。批准由 `harness-orchestrator` 维护；独立架构评审使用 `evidence.tactical-design-review`。

## 与实现交接

批准且版本当前的战术设计合同由 `Slice Implementation Contract` 引用，再由 `yss-domain` 使用 `behavior-tdd` 实现。`yss-domain` 不得静默重新定义聚合或不变量；发现新的 API、状态、数据或架构影响时必须返回 `new_impacts` / `drift` 并重新路由。

起草 DDD `design` 时读取 [战术合同](references/tactical-design-contract.md)，按 [验证规则](references/validation-rules.md) 执行 `scripts/validate-tactical-design.mjs` 的只读校验；需要正文结构时读取 [输出模板](references/output-template.md)，不批量加载整个 references 目录。该 Skill 不生成 Java、Repository、Controller、DTO、OpenAPI Freeze、实现 Ticket 或生产代码。

## PR/MR 交接输入

PR/MR 材料按 [交接承接说明](references/strategic-handoff-routing.md) 核验并保留来源；旧战略包绑定的消费验证已退役，不得凭旧回执或补字段沿用批准。源变化或未知依赖仍阻断受影响工作。

## 后端脚手架平台承接

消费生命周期已确认的架构与 `platform_configuration` v2；不得自行选择、批准或静默升级 Boot/Java。平台清单执行 `scripts/backend-platforms` 查询；只允许已验证 YSS 组合，新生成缺少配置或证据即阻断。决定、合同、Manifest 与下游架构身份须绑定同一平台及兼容摘要。详见 仓库共享合同 `.template-spec/engineering/backend-platforms.md`。
