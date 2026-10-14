# 编排策略责任与消费者

每个顶层策略、每个工作单元均独立登记。代码引用只表示消费该策略，非完整运行验收。以下 Agent 步骤是本次显式登记的消费责任，不声称已有机器检查覆盖。

| 策略 | owner | 事实源 | 消费者 |
|---|---|---|---|
| `skill_preflight` | `harness-orchestrator` | `.template-spec/process/orchestration/core/identity.yaml` | Agent 步骤：harness-orchestrator 在采用 `skill_preflight` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `stage_tracking` | `harness-orchestrator` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：harness-orchestrator 在采用 `stage_tracking` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `phase_boundary` | `harness-orchestrator` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：harness-orchestrator 在采用 `phase_boundary` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `checkpoint_policy` | `harness-orchestrator` | `.template-spec/process/orchestration/core/state.yaml` | Agent 步骤：harness-orchestrator 在采用 `checkpoint_policy` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `backend_scaffold` | `harness-orchestrator` | `.template-spec/process/orchestration/domain/implementation.yaml` | Agent 步骤：harness-orchestrator 在采用 `backend_scaffold` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `planning` | `harness-orchestrator` | `.template-spec/process/orchestration/domain/planning.yaml` | Agent 步骤：harness-orchestrator 在采用 `planning` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `progression_target` | `harness-orchestrator` | `.template-spec/process/orchestration/domain/progression.yaml` | Agent 步骤：harness-orchestrator 在采用 `progression_target` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `consumer_entry_routes` | `harness-orchestrator` | `.template-spec/process/orchestration/domain/progression.yaml` | Agent 步骤：harness-orchestrator 在采用 `consumer_entry_routes` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `profile_guidance` | `harness-orchestrator` | `.template-spec/process/orchestration/domain/progression.yaml` | Agent 步骤：harness-orchestrator 在采用 `profile_guidance` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `document_writing` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/execution.yaml` | Agent 步骤：harness-orchestrator 在采用 `document_writing` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `user_progress_report` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/execution.yaml` | Agent 步骤：harness-orchestrator 在采用 `user_progress_report` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `contract_id` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `contract_id` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `status` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `status` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `owner` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `owner` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `target_scope` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `target_scope` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `orchestrator` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `orchestrator` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `roles` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `roles` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `states` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `states` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `execution_states` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `execution_states` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `entry` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `entry` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `technical_design` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `technical_design` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `slice_contract` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `slice_contract` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `readiness` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `readiness` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `parallelism` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `parallelism` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `gates` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `gates` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `re_route_on` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `re_route_on` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `scaffold_architecture_decision` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `scaffold_architecture_decision` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `business_input` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/profile-policy.yaml` | Agent 步骤：harness-orchestrator 在采用 `business_input` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `request_triage` | `harness-orchestrator` | `.template-spec/process/orchestration/entry/request-triage.yaml` | Agent 步骤：harness-orchestrator 在采用 `request_triage` 所辖决定前读取并执行该条；执行位置见本清单下方 |
| `work_unit_routes.work-unit.domain-strategy-design` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.domain-strategy-design.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.harness-entry` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.harness-entry.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.implementation-repository-preparation` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.implementation-repository-preparation.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.intensity-aware-review` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.intensity-aware-review.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.intensity-aware-verification` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.intensity-aware-verification.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.plan-opportunity` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.plan-opportunity.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.plan-requirements` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.plan-requirements.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.release-and-rollback` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.release-and-rollback.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.skill-projection-sync` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.skill-projection-sync.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.slice-contract` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.slice-contract.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.slice-implementation` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.slice-implementation.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.spec-synthesis` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.spec-synthesis.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.ssot-update` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.ssot-update.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.stage-decision` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.stage-decision.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.technical-design` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.technical-design.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |
| `work_unit_routes.work-unit.verification` | `harness-orchestrator` | `.template-spec/process/orchestration/workflow/work-units/work-unit.verification.yaml` | `scripts/lib/lifecycle-context-query-core.mjs:261` 按工作单元键选择完整规则 |

## Agent 执行位置

入口：`.agents/skills/harness-orchestrator/SKILL.md`。主控在当前任务开始与工作单元切换时按本表定位适用策略，在作出对应决定前读取事实源中的完整键值；不把规则读取等同于批准或执行授权。规则不适用时不加载无关分片。当前工作单元消费 `work_unit_routes.<id>`；授权、阶段流转、暂停、职责、证据与发布决定分别消费本表同名策略，不能仅依据摘要输出放行。

本次不删除原有策略；原 AR-13 遗漏的策略继续保留于 entry/profile-policy.yaml，均在上表逐项登记。
