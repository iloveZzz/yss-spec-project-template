---
name: yss-stage-decision
description: 编排 Discovery 到 Spec 入口的阶段决策与 DDD 战略设计；当需求、领域边界、统一语言或下游影响尚未稳定时使用。
---

# YSS Stage Decision

`yss-stage-decision` 是由 `yss-strategic-design` 调度的上游决策技能空间，负责把需求、产品、商务输入和 DDD 战略设计结果整理成可审查、可版本化、可被下游消费的阶段决策包。它不替代战略设计主控，也不生成产品代码、原型、OpenAPI 或垂直切片 Ticket。

## 适用边界

- 适用于 `project-instance` 的 Discovery → Spec 入口。
- `template-source` 只维护本技能、Schema、验证器和合成 Fixture，不生成具体产品领域资产。
- DDD 工作单元只做子域、限界上下文、Context Map、统一语言、关键场景、事件、核心领域概念候选和业务不变量。
- Entity、Aggregate、Repository、Java 类、数据库表和 OpenAPI Freeze 留给下游工作单元。

## 执行顺序

1. 读取 `yss-project.yaml`、`CONTEXT.md`、既有 Discovery/Spec、ADR 和父 Ticket/checkpoint。
2. 分离事实、决策、假设、约束和未决项；技术事实走 `research`，市场/竞品事实走 `competitive-intelligence`。
3. 从业务场景、事件、规则、责任人和失败路径识别子域及限界上下文，不从数据库表或调用链直接反推边界。
4. 为每个上下文建立本地统一语言；为跨上下文关系记录语义上游/下游、业务决策权、技术传输方向和翻译责任。
5. 记录核心领域概念候选，不提前锁定 Entity 或 Aggregate。
6. 生成 `domain_strategy` 和 `stage_decision_package`，绑定版本、digest、证据和下游影响映射。
7. 运行 Schema、引用、语义一致性和传播验证；发现关键冲突时返回 `blocked`，不得生成 `approved` 包。

在 `harness.business-ddd-strategy-handoff` profile 中，以上两个批准资产是本地最终事实源；战略设计主控将它们封装为 Strategic Design Handoff，交付给下游研发团队。下游才负责 Tactical Design；本技能仍不得直接生成 Aggregate、Entity、Repository 或 API。

## 语义方向规则

`semantic_upstream` 是拥有业务规则、决策语义或权威模型的一方；`semantic_downstream` 是消费、适配或依赖该语义的一方。二者不等于 HTTP、事件或数据库的技术方向。每条 Context Map 关系必须独立记录 `transport_direction` 和 `translation_responsibility`；同一对上下文可以存在多条相反方向的语义边。

## 产物与批准

- DDD 资产是事实源，阶段决策包只通过 `domain_strategy_ref` 引用它们。
- `stage_decision_package` 必须经过 `draft → ready-for-human → approved`；起草者不得自签。
- 建议门禁为 `gate.domain-strategy-approved` 和 `gate.stage-decision-package-approved`，实际状态由 `yss-strategic-design` 维护；阶段包批准引用必须通过 `scripts/verify-approval-record`，不得用不可读路径或聊天确认替代。
- 下游只能消费批准且版本当前的包；发现语义冲突返回 `drift` / `new_impacts`，不得静默修改上游。

## 结果合同

返回标准 `Workflow Execution Result`，至少包含 `work_unit`、`workflow_reference`、`result`、`evidence_refs`、`changed_artifacts`、`new_impacts`、`stale_candidates`、`next_route` 和 `blocking_signals`。`blocked` 必须包含冲突、责任人、恢复条件和下一工作单元。

## 禁止事项

- 不把阶段包当作第二套领域事实源。
- 不按数据库、微服务、菜单或 HTTP 调用方向自动划分上下文。
- 不把同名术语强行合并为全局概念。
- 不在战略设计阶段生成 Entity、Aggregate、Repository、生产代码或 API 契约。
- 不把模板 Fixture 当作具体项目的业务事实。

详细合同、字段和验证规则见 `references/domain-strategy-contract.md`、`references/stage-decision-package-contract.md` 与 `references/validation-rules.md`。机器可读合同分别为 `references/domain-strategy.schema.json` 和 `references/stage-decision-package.schema.json`；对应验证器为 `scripts/validate-domain-strategy.mjs` 与 `scripts/validate-stage-decision-package.mjs`。
