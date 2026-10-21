# 业务边界与规则设计合同

## 顶层结构

当前机器可读合同使用 `references/domain-strategy-v3.schema.json`；`references/domain-strategy-v2.schema.json` 仅用于历史读取。顶层必须包含：

- `schema_version: 3`、`domain_strategy_id`、`domain_version`、`status`、`traceability_version: 1`；
- 带稳定 `rule_id` 与证据的 `rule_catalog`；
- `contexts`、`subdomains`、`relationships`、`scenarios`；
- `concept_candidates`、`invariants`、`context_snapshot`；
- `downstream_mapping`、`evidence_refs`、`approval`。

专业检查的 `approval_ref` 可以指向 `check.domain-strategy-approved` 单条记录，或指向包含该唯一结论的组合审查包。approval3 按实际任务、审查主体、范围、依据及证据核验，不比较 `role_id`；已有无版本注解中的 `approval.approver` 仅供历史批准记录匹配。bundle 中另一项检查的结论不能替代本检查。

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

正式导出要求场景 `rule_refs / critical / success_results / evidence_refs` 和不变量 `rule_ref / evidence_refs`。`downstream_mapping` 必须使用稳定 `mapping_id`、来源 ID、消费者能力、影响项、传播规则和证据。已有 v2 文档继续只读兼容；修改或重发须显式迁移为 v3 `draft` 并重新批准。具体合同见 `.template-spec/process/strategic-handoff-package.md`，不得由导出器发明业务身份。

新治理政策的战略/阶段批准注解使用显式 `schema_version: 2`，引用已完成的 Plan 审阅包及其实际批准记录，不填写 `approver` 或岗位身份。内嵌 `approval.approval_context` 使用显式版本 2 绑定当前主体、范围和依据；approval3 的 `artifact_bindings` 保留资产 ID、版本和摘要，资产必须已被实际审查。注解版本 2 和批准记录版本 3 是两个独立版本。历史批准记录只按来源原政策只读核验；已有无版本注解引用当前有效 approval3 时，不重新施加旧角色限制。

## 批准注解迁移

`node .agents/skills/yss-stage-decision/scripts/migrate-contract-v3.mjs <asset.json> --kind domain-strategy --root . --approval-context <context.json>` 同时支持领域策略 v2 内容迁移和已有 v3 资产的批准注解迁移。上下文文件须提供真实的 `schema_version: 2`、`subject_ref`、`approval_scope` 与带摘要的非空 `basis`；当前实例缺少上下文时返回 `migration-required`，不猜测主体、范围或证据。历史政策的 v2 内容迁移继续支持原输入格式。

工具只向标准输出生成版本递增的 `draft`，使用 `approval_ref: migration-required`，不改原文件、不生成批准记录。完成实际审查后再绑定有效记录并复验。领域策略变化后，须更新阶段包 `domain_strategy_ref` 的版本与摘要，再复验阶段包；不能沿用旧绑定。
