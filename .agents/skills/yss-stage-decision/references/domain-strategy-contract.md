# 业务边界与规则设计合同

## 顶层结构

机器可读合同使用 `references/domain-strategy.schema.json`。顶层必须包含：

- `schema_version: 2`、`domain_strategy_id`、`domain_version`、`status`；
- `contexts`、`subdomains`、`relationships`、`scenarios`；
- `concept_candidates`、`invariants`、`context_snapshot`；
- `downstream_mapping`、`evidence_refs`、`approval`。

## 业务责任区

每个业务责任区声明内部 `context_id`、职责边界、非职责、业务板块分类、责任人、关键场景和本地词汇引用。`context_id` 是稳定身份，由 Agent 维护；不得使用代码模块、数据库 schema 或菜单路径替代。

`context_snapshot.context_ref` 固定为 `CONTEXT.md`，`term_refs` 使用 `<ContextId>/<EnglishIdentifier>` 或 `Global/<EnglishIdentifier>`；同时记录完整文档 `document_digest` 与引用术语集 `referenced_terms_digest`。v1 `terminology_refs` 只读并进入迁移检查，只有唯一映射时才可确定性迁移。

## 关系

协作关系必须声明内部字段 `relationship_pattern`、`semantic_upstream`、`semantic_downstream`、`business_authority`、`model_change_impact`、`transport_direction` 和 `translation_responsibility`。业务人员只需确认协作方式、规则提供方和使用方、业务决策权、信息方向与口径转换负责人；Agent 再映射到合同允许值。

## 待确认的关键业务对象

使用内部类型 `domain_concept_candidate` 表达待确认的关键业务对象，记录识别特征、生命周期、不可违反规则引用、可能的技术映射和置信度。不得在该合同中直接批准技术模型。

## 方案决策包

方案决策包应通过内部字段 `domain_strategy_ref` 引用本合同的当前版本和 digest，并使用 `domain_to_downstream_mapping` 描述业务变化对 Spec、设计、API、数据、Ticket 和测试 seam 的传播。

## 便携交付的逐条追溯

正式导出要求 `traceability_version: 1`、`rule_catalog`、场景 `rule_refs / critical / success_results` 和不变量 `rule_ref`。已有 v2 文档继续只读兼容；缺稳定规则 ID 或未重新批准时禁止正式导出。具体合同见 `docs/process/strategic-handoff-package.md`，不得由导出器发明业务身份。
