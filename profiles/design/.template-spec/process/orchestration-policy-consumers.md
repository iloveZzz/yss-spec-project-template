# 编排策略责任与消费者

每个顶层策略、每个工作单元均独立登记。代码引用只表示消费该策略，非完整运行验收。以下 Agent 步骤是本次显式登记的消费责任，不声称已有机器检查覆盖。

| 策略 | owner | 事实源 | 消费者 |
|---|---|---|---|
| `supported_state_schema_versions` | `yss-strategic-design` | `.template-spec/process/orchestration/core/identity.yaml` | Agent 步骤：yss-strategic-design 在采用 `supported_state_schema_versions` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `modes` | `yss-strategic-design` | `.template-spec/process/orchestration/core/identity.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:255` 校验模式，318 行返回该模式规则 |
| `entry_routing` | `yss-strategic-design` | `.template-spec/process/orchestration/core/identity.yaml` | Agent 步骤：yss-strategic-design 在采用 `entry_routing` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `skill_source_contract` | `yss-strategic-design` | `.template-spec/process/orchestration/core/identity.yaml` | Agent 步骤：yss-strategic-design 在采用 `skill_source_contract` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `skill_preflight` | `yss-strategic-design` | `.template-spec/process/orchestration/core/identity.yaml` | Agent 步骤：yss-strategic-design 在采用 `skill_preflight` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `matt_skill_result` | `yss-strategic-design` | `.template-spec/process/orchestration/core/results.yaml` | Agent 步骤：yss-strategic-design 在采用 `matt_skill_result` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `workflow_execution_result` | `yss-strategic-design` | `.template-spec/process/orchestration/core/results.yaml` | Agent 步骤：yss-strategic-design 在采用 `workflow_execution_result` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `matt_invocation_boundary` | `yss-strategic-design` | `.template-spec/process/orchestration/core/results.yaml` | Agent 步骤：yss-strategic-design 在采用 `matt_invocation_boundary` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `lifecycle_native_entries` | `yss-strategic-design` | `.template-spec/process/orchestration/core/results.yaml` | Agent 步骤：yss-strategic-design 在采用 `lifecycle_native_entries` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `checkpoint_policy` | `yss-strategic-design` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：yss-strategic-design 在采用 `checkpoint_policy` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `tracker` | `yss-strategic-design` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：yss-strategic-design 在采用 `tracker` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `setup_readiness` | `yss-strategic-design` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：yss-strategic-design 在采用 `setup_readiness` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `phase_boundary` | `yss-strategic-design` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：yss-strategic-design 在采用 `phase_boundary` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `stage_tracking` | `yss-strategic-design` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：yss-strategic-design 在采用 `stage_tracking` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `git_authorization` | `yss-strategic-design` | `.template-spec/process/orchestration/domain/implementation.yaml` | Agent 步骤：yss-strategic-design 在采用 `git_authorization` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `planning` | `yss-strategic-design` | `.template-spec/process/orchestration/domain/planning.yaml` | Agent 步骤：yss-strategic-design 在采用 `planning` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `grill_exit` | `yss-strategic-design` | `.template-spec/process/orchestration/domain/planning.yaml` | Agent 步骤：yss-strategic-design 在采用 `grill_exit` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `progression_target` | `yss-strategic-design` | `.template-spec/process/orchestration/domain/progression.yaml` | Agent 步骤：yss-strategic-design 在采用 `progression_target` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `consumer_entry_routes` | `yss-strategic-design` | `.template-spec/process/orchestration/domain/progression.yaml` | Agent 步骤：yss-strategic-design 在采用 `consumer_entry_routes` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `profile_guidance` | `yss-strategic-design` | `.template-spec/process/orchestration/domain/progression.yaml` | Agent 步骤：yss-strategic-design 在采用 `profile_guidance` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `impact_propagation` | `yss-strategic-design` | `.template-spec/process/orchestration/domain/review.yaml` | Agent 步骤：yss-strategic-design 在采用 `impact_propagation` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `document_writing` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/execution.yaml` | Agent 步骤：yss-strategic-design 在采用 `document_writing` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `user_progress_report` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/execution.yaml` | Agent 步骤：yss-strategic-design 在采用 `user_progress_report` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `profile_registry` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-strategic-design 在采用 `profile_registry` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `task_package` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-strategic-design 在采用 `task_package` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `compatibility_flow_preconditions` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-strategic-design 在采用 `compatibility_flow_preconditions` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `seam_deferred_required` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-strategic-design 在采用 `seam_deferred_required` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `unknown_impact` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-strategic-design 在采用 `unknown_impact` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `prototype_return_evidence` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-strategic-design 在采用 `prototype_return_evidence` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `external_input_pause` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-strategic-design 在采用 `external_input_pause` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `prototype_profiles` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-strategic-design 在采用 `prototype_profiles` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `behavioral_invariants` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：yss-strategic-design 在采用 `behavioral_invariants` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `request_triage` | `yss-strategic-design` | `.template-spec/process/orchestration/entry/request-triage.yaml` | Agent 步骤：yss-strategic-design 在采用 `request_triage` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `transition_graph` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/transitions.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:265` 校验当前节点，274 行返回后续路线 |
| `work_unit_routes.work-unit.business-ticket-formalization` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.business-ticket-formalization.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.code-review` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.code-review.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.domain-strategy-design` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.domain-strategy-design.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.plan-opportunity` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.plan-opportunity.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.plan-requirements` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.plan-requirements.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.prototype-design` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.prototype-design.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.release-and-retrospective` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.release-and-retrospective.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.slice-implementation` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.slice-implementation.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.spec-synthesis` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.spec-synthesis.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.stage-decision` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.stage-decision.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.strategic-design-handoff` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.strategic-design-handoff.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.technical-analysis` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.technical-analysis.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.ticket-decomposition` | `yss-strategic-design` | `.template-spec/process/orchestration/workflow/work-units/work-unit.ticket-decomposition.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |

## Agent 执行位置

入口：`.agents/skills/yss-strategic-design/SKILL.md`。主控在当前任务开始与工作单元切换时按本表定位适用策略，在作出对应决定前读取事实源中的完整键值；不把规则读取等同于批准或执行授权。规则不适用时不加载无关分片。当前工作单元消费 `work_unit_routes.<id>`；授权、阶段流转、暂停、职责、证据与发布决定分别消费本表同名策略，不能仅依据摘要输出放行。

本次不删除原有策略；原 AR-13 遗漏的策略继续保留于 entry/profile-policy.yaml，均在上表逐项登记。
