# 编排策略责任与消费者

每个顶层策略、每个工作单元均独立登记。代码引用只表示消费该策略，非完整运行验收。以下 Agent 步骤是本次显式登记的消费责任，不声称已有机器检查覆盖。

| 策略 | owner | 事实源 | 消费者 |
|---|---|---|---|
| `supported_state_schema_versions` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/identity.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `supported_state_schema_versions` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `modes` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/identity.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:255` 校验模式，318 行返回该模式规则 |
| `entry_routing` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/identity.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `entry_routing` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `skill_source_contract` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/identity.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `skill_source_contract` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `skill_preflight` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/identity.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `skill_preflight` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `matt_skill_result` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/results.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `matt_skill_result` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `workflow_execution_result` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/results.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `workflow_execution_result` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `matt_invocation_boundary` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/results.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `matt_invocation_boundary` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `lifecycle_native_entries` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/results.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `lifecycle_native_entries` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `checkpoint_policy` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `checkpoint_policy` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `tracker` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `tracker` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `setup_readiness` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `setup_readiness` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `phase_boundary` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `phase_boundary` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `stage_tracking` | `yss-product-lifecycle` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `stage_tracking` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `implementation_path_policy` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/implementation.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `implementation_path_policy` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `ticket_formalization` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/implementation.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `ticket_formalization` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `implementation_repository_preparation` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/implementation.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `implementation_repository_preparation` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `git_authorization` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/implementation.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `git_authorization` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `backend_scaffold` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/implementation.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `backend_scaffold` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `post_scaffold_generated_code_policy` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/implementation.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `post_scaffold_generated_code_policy` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `ready_for_agent` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/implementation.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `ready_for_agent` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `planning` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/planning.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `planning` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `grill_exit` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/planning.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `grill_exit` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `progression_target` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/progression.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `progression_target` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `profile_guidance` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/progression.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `profile_guidance` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `execution_scopes` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/progression.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `execution_scopes` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `consumer_entry_routes` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/progression.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `consumer_entry_routes` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `review_input` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/review.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `review_input` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `release_readiness` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/review.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `release_readiness` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `context_engineering` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/review.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `context_engineering` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `doubt_driven_review` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/review.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `doubt_driven_review` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `impact_propagation` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/review.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `impact_propagation` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `user_decision_evidence` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/review.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `user_decision_evidence` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `gate_consolidation` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/review.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `gate_consolidation` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `blocking_disposition` | `yss-product-lifecycle` | `.template-spec/process/orchestration/domain/review.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `blocking_disposition` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `document_writing` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/execution.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `document_writing` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `user_progress_report` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/execution.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `user_progress_report` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `execution_efficiency` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/execution.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `execution_efficiency` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `backend_architecture_identity_policy` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `backend_architecture_identity_policy` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `review_verification` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `review_verification` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `task_package` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `task_package` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `compatibility_flow_preconditions` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `compatibility_flow_preconditions` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `ticket_role_transition` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `ticket_role_transition` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `seam_deferred_required` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `seam_deferred_required` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `scaffold_architecture_decision` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `scaffold_architecture_decision` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `scaffold_work_unit_policy` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `scaffold_work_unit_policy` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `lifecycle_owned_work_units` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `lifecycle_owned_work_units` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `lifecycle_work_unit_requirements` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `lifecycle_work_unit_requirements` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `wayfinder_completion` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `wayfinder_completion` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `wayfinder_mode` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `wayfinder_mode` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `quality_baseline_reuse` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `quality_baseline_reuse` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `unknown_impact` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `unknown_impact` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `prototype_return_evidence` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `prototype_return_evidence` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `external_input_pause` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `external_input_pause` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `prototype_modes` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `prototype_modes` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `behavioral_invariants` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `behavioral_invariants` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `request_triage` | `yss-product-lifecycle` | `.template-spec/process/orchestration/entry/request-triage.yaml` | Agent 步骤：yss-product-lifecycle 在采用 `request_triage` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `transition_graph` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/transitions.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:265` 校验当前节点，274 行返回后续路线 |
| `work_unit_routes.work-unit.backend-delivery` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.backend-delivery.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.business-ticket-formalization` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.business-ticket-formalization.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.code-review` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.code-review.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.domain-strategy-design` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.domain-strategy-design.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.implementation-repository-preparation` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.implementation-repository-preparation.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.maintenance-research` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.maintenance-research.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.plan-opportunity` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.plan-opportunity.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.plan-requirements` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.plan-requirements.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.prototype-design-v2` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.prototype-design-v2.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.release-and-retrospective` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.release-and-retrospective.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.slice-implementation` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.slice-implementation.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.spec-synthesis` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.spec-synthesis.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.stage-decision` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.stage-decision.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.strategic-design-handoff` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.strategic-design-handoff.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.technical-analysis` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.technical-analysis.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.ticket-decomposition` | `yss-product-lifecycle` | `.template-spec/process/orchestration/workflow/work-units/work-unit.ticket-decomposition.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |

## Agent 执行位置

入口：`.agents/skills/yss-product-lifecycle/SKILL.md`。主控在当前任务开始与工作单元切换时按本表定位适用策略，在作出对应决定前读取事实源中的完整键值；不把规则读取等同于批准或执行授权。规则不适用时不加载无关分片。当前工作单元消费 `work_unit_routes.<id>`；授权、阶段流转、暂停、职责、证据与发布决定分别消费本表同名策略，不能仅依据摘要输出放行。

本次不删除原有策略；原 AR-13 遗漏的策略继续保留于 entry/profile-policy.yaml，均在上表逐项登记。

## 编排政策 2 的合同边界

政策 2 的结构已定义，必须同时具备 `role-independent-governance-v1`、根实例身份 2、Profile 3、Bundle 4 与 metadata 4 的原生消费者才能向实例写入。模板源身份仍为 1；Schema 检查不授予执行资格。政策 1、任务 1/2、审批/审查包 1/2、延续 1 与历史 Design 按原合同只读解释，不重写历史字段或摘要。任务 2 仍只读 intake。

以下字段由 `orchestration/domain/review.yaml` 唯一维护；原生 `kernel/approval/contracts/lifecycle` 消费者必须按当前明确 Profile 与版本选择，缺失或未知输入不能降级。此表列的是接入合同，并不声称 B1 已完成原生执行验收。

| 策略 | 消费责任与拒绝边界 |
|---|---|
| `governance_versions` | 身份、任务、阶段 writer 在计划和应用时核验完整版本组合及总能力；旧政策只允许读、核验、显式迁移 |
| `profile_admission` | init/profile prepare 仅新建 Spec/Backend；旧 Design 原身份只读，显式迁移不得静默改成 Spec；Backend 不获整体业务验收权限 |
| `technical_checks` | 按 work unit、实际影响和精确 Profile 计算 Skills；`capability.*` 仅为历史延续的检查组 ID，无持有人或岗位资格；未知检查组拒绝 |
| `gate_policy` | 只选 `profiles.spec` 或 `profiles.backend` 的完整门禁集，保留全部原检查 ID；禁止把另一个 Profile 的缺失边界当作可跳过 |
| `user_decision_policy` | 使用 `profile_scope` 与 `continuation.boundaries_by_profile`；真实用户消息 schema1 不变，原决定/冻结快照/当前候选/逐项差异/受影响检查与实际验证必须绑定；禁止链式扩权 |
| `review_modes` | 默认自检；明确用户或已知外部规则才要求独立复核；另一实际上下文、执行来源、同一冻结候选与范围、只读审查缺一不可；角色名、模型名、runtime 名不能证明独立 |
| `external_rules_policy` | 未声明且未发现具体规则时无须空制度；已知无法核验则仅阻断依赖动作；新事实重新计算适用范围，不伪称平台批准 |
| `preparation_policy` | 已授权准备范围内可消费前序草稿并继续起草 Plan/Spec/必要设计；不得产出批准、ready-for-agent 或业务验收；正式实现仍消费具体当前资产的真实决定与合同 |
| `impact_review_matrix` | 保留 API Draft→内容审查→Freeze→实现、权限/不可逆变化反例与恢复、跨仓来源/路径/摘要约束；不可靠分类先只读调查 |

`entry/profile-policy.yaml` 的任务 3 与 `entry/request-triage.yaml` 的 daily/standard 2 复用上述政策。daily 的同一 Ticket JSON 显式声明 `schema_version: 2`、`policy_version: 2`；`implementation.provenance` 替代必需 actor 身份，审查记录的 `assessment` 使用共用复核结构，原始审查记录与结果、阻断项、assessment、当前候选摘要一致。API 使用 `api_digest`，代码使用 `candidate_digest`，二者不可互换。缺版本是历史输入，不能猜为 2。

## 旧强约束的去向

| 原位置/约束 | 新位置或退休理由 | 消费者处置 |
|---|---|---|
| `digital-human-roles.yaml` 岗位、runtimes、orchestrator、人数、岗位技能白名单 | 从新写入资格退休；用户和外部工具管理执行编排，不建立替代岗位表 | 新 kernel 权威加载、task Skill 解析及预检不得读取这些资格；旧读取器保留原角色文件，不能以缺文件启用新模式 |
| `review_capabilities.eligible_roles` | 仅删除资格映射；检查组 ID、专业 Skills 迁到 `technical_checks` | review compiler 按 Profile/工作单元/影响选检查，核验实际 Skill 存在和摘要 |
| `gate_policy` drafter/countersigners/default 独立人数 | 默认单执行者及 `review_modes` 条件独立 | approval、review-bundle、daily、API 和 continuation 按新版本分派；旧字段仍按旧合同要求 |
| 自动检查、技术检查、已列出的 gate/check 与未列拒绝 | `gate_policy.profiles`；Backend 原 evidence-only 和契约批准边界单独保留 | 原生 GateChecks 和审批当前性核验不得静默忽略未知边界 |
| 用户决定、委托、撤回、来源与决定范围 | `user_decision_policy`，user-decision schema1 原字节结构不变 | 原始人类回复验证、当前候选/范围与决定依据比较仍由原生消费者执行 |
| continuation 独立岗位与“外部制度先确认” | continuation2 自检默认；`external_rules_policy` 三态 | 原始授权快照对照及新字节验证不可省；已知规则不可核验时受影响动作继续阻断 |
| task1/2 与 Slice3 的 role/runtime/actor 资格 | task3 与 Slice4 去除资格；Slice4 使用已有 Skills 加 `check_ids` | task/Slice 编译、视图、结果绑定迁到新格式；旧 Slice2/3 原读取语义保留，不能改旧审批摘要 |
| 固定前序人工批准阻止草稿准备 | `preparation_policy` 与各 work-unit 的准备引用 | planning、transition 和 route 必须区分草稿准备与正式完成/实施，不因此提升 ready-for-agent |
| 固定独立实现/验证者与发布默认独立 | `review_verification`、`review_modes`、适用复核证据 | 明确独立要求仍满足；自检不能签独立结果；提交/推送/发布和外部动作仍需已有有效用户授权 |
| 路径/仓库/摘要/输入/冻结/真实日志/版本/候选约束 | 原位置保留，task3 新增明确输入绑定、基线和来源 | 原生路径规范化、symlink 防逃逸、实际命令/退出码/日志与候选校验不得因去岗位而放宽 |

历史战略交接与回执格式不因无关岗位清理改写；新的 source approval 必须按其冻结源政策版本解释。Bundle/source-lock 的历史闭包由后续分发工作验证，旧 source snapshot、Design 身份、target_profile_id 与回执摘要必须保留。
