# DDD 战略设计合同

## 顶层结构

机器可读合同使用 `references/domain-strategy.schema.json`。顶层必须包含：

- `schema_version`、`domain_strategy_id`、`domain_version`、`status`；
- `contexts`、`subdomains`、`relationships`、`scenarios`；
- `concept_candidates`、`invariants`、`terminology_refs`；
- `downstream_mapping`、`evidence_refs`、`approval`。

## 上下文

每个上下文声明 `context_id`、职责边界、非职责、子域分类、模型所有者、关键场景和本地词汇引用。`context_id` 是稳定身份，不得使用代码模块、数据库 schema 或菜单路径替代。

## 关系

关系必须声明 `relationship_pattern`、`semantic_upstream`、`semantic_downstream`、`business_authority`、`model_change_impact`、`transport_direction` 和 `translation_responsibility`。语义方向与技术方向可以不同；关系模式只能使用合同中列出的 DDD 模式。

## 核心概念

使用 `domain_concept_candidate` 表达战略阶段的核心概念候选，记录身份特征、生命周期、不变量引用、可能的战术角色和置信度。不得在该合同中把概念直接批准为 Entity 或 Aggregate Root。

## 阶段决策包

阶段包应通过 `domain_strategy_ref` 引用 DDD 合同的当前版本和 digest，并使用 `domain_to_downstream_mapping` 描述领域变化对 Spec、设计、API、数据、Ticket 和测试 seam 的传播。
