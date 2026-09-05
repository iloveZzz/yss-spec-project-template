---
name: yss-stage-decision
description: 编排 Discovery 到 Spec 入口的方案决策与业务边界、协作和规则设计；当需求、业务责任区、统一业务词汇或下游影响尚未稳定时使用。
---

# YSS Stage Decision

`yss-stage-decision` 是由生命周期主控调度的上游决策技能，负责把需求、产品、商务输入和业务边界与规则设计结果整理成可审查、可版本化、可被下游消费的方案决策包。它不替代生命周期主控，也不生成产品代码、原型、OpenAPI 或垂直切片 Ticket。

## 适用边界

- 适用于 `project-instance` 的 Discovery → Spec 入口。
- `template-source` 只维护本技能、Schema、验证器和合成 Fixture，不生成具体产品领域资产。
- 业务边界与协作工作单元只回答：有哪些业务板块、每个业务责任区负责什么、不同责任区如何交接、使用哪些统一业务词汇、发生哪些业务事实、有哪些待确认的关键业务对象和不可违反的业务规则。
- Entity、Aggregate、Repository、Java 类、数据库表和 OpenAPI Freeze 留给下游工作单元。

## 执行顺序

1. 读取 `yss-project.yaml`、`CONTEXT.md`、既有 Discovery/Spec、ADR 和父 Ticket/checkpoint。
2. 分离事实、决策、假设、约束和未决项；技术事实走 `yss-research` 的 `technical-evidence`，领域边界、业务规则、MVP、非目标、成功标准或阶段推进依据等决策证据走 `strategy-evidence`，市场/竞品事实走 `competitive-intelligence`。
3. 从业务故事、已发生的事实、规则、责任人和失败路径识别业务板块与业务责任区，不从数据库表或调用链直接反推边界。
4. 为每个业务责任区建立统一业务词汇；对跨责任区协作记录规则提供方、规则使用方、业务决策权、信息传递方向和口径转换负责人。
5. 记录待确认的关键业务对象，不提前指定技术模型。
6. 生成 schema v2 `domain_strategy` 和 `stage_decision_package`，使用 `context_snapshot` 绑定根 `CONTEXT.md`、术语身份、完整文档 digest、引用术语 digest、证据和下游影响映射。
7. 运行 Schema、根路径、术语引用、digest、语义一致性和传播验证；发现关键冲突时返回 `blocked`，不得生成 `approved` 包。v1 字符串引用只读并返回 `migration-required`；可唯一定位的旧锚点用 `scripts/migrate-context-references.mjs` 迁移，歧义引用不得猜测。

## 语义方向规则

内部字段 `semantic_upstream` 表示规则提供方，`semantic_downstream` 表示规则使用方。二者不等于 HTTP、消息或数据库的技术方向。每条协作关系必须独立记录 `transport_direction` 和 `translation_responsibility`；同一对业务责任区可以存在多条相反方向的信息关系。

## 产物与批准

- 业务边界与规则设计是本类事实的权威资产，方案决策包只通过内部字段 `domain_strategy_ref` 引用它。两个合同的 `context_snapshot.context_ref` 必须精确为仓库根 `CONTEXT.md`，禁止子目录、`CONTEXT-MAP.md`、绝对路径和 Markdown 伪锚点。
- 进入 `gate.domain-strategy-approved` 或 `gate.stage-decision-package-approved` 的外部决策证据必须引用通过校验的 `yss-research` `evidence-audited` 研究包；研究包只提供证据，不得直接修改本技能资产或批准门禁。
- `stage_decision_package` 必须经过 `draft → ready-for-human → approved`；起草者不得自签。
- 建议门禁为 `gate.domain-strategy-approved` 和 `gate.stage-decision-package-approved`，实际状态由 `yss-product-lifecycle` 维护；阶段包批准引用必须通过 `scripts/verify-approval-record`，不得用不可读路径或聊天确认替代。
- 下游只能消费批准且版本当前的包；发现语义冲突返回 `drift` / `new_impacts`，不得静默修改上游。

## 结果合同

返回标准 `Workflow Execution Result`，至少包含 `work_unit`、`workflow_reference`、`result`、`evidence_refs`、`changed_artifacts`、`new_impacts`、`stale_candidates`、`next_route` 和 `blocking_signals`。`blocked` 必须包含冲突、责任人、恢复条件和下一工作单元。

## 禁止事项

- 不把方案决策包当作第二套业务事实源。
- 不按数据库、微服务、菜单或 HTTP 调用方向自动划分上下文。
- 不把同名术语强行合并为全局概念。
- 不在业务方案设计阶段生成技术模型、生产代码或 API 契约。
- 不把模板 Fixture 当作具体项目的业务事实。

详细合同、字段和验证规则见 `references/domain-strategy-contract.md`、`references/stage-decision-package-contract.md` 与 `references/validation-rules.md`。机器可读合同分别为 `references/domain-strategy.schema.json` 和 `references/stage-decision-package.schema.json`；对应验证器为 `scripts/validate-domain-strategy.mjs` 与 `scripts/validate-stage-decision-package.mjs`。

## 战略交接快照包

跨仓交接使用 `scripts/strategic-handoff export / verify / import`。正式导出前补齐源战略的稳定规则 ID、关键场景和当前批准绑定；源资产原字节冻结、包内路径通过清单解析。目标导入只产生快照和对账/承接草案，正式 reconciliation 通过后才能进入战术设计。流程与字段见 `docs/process/strategic-handoff-package.md`。
