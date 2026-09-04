# Slice Implementation Contract

`yss-implementation-contract-compiler` 生成草案；`yss-product-lifecycle` 核验、批准并持久化。合同缺少必填字段时状态为 `blocked`。schema v1 已停止支持，必须重新编译为 v2，不提供自动升级。

```yaml
slice_contract:
  schema_version: 2
  contract_id:
  contract_version: 1
  slice_id:
  status: draft
  suggested_owner_role_id: # role.frontend-engineer | role.backend-engineer | role.test-engineer；编译器只建议，生命周期编排器派活并批准
  lifecycle_refs:
    spec:
    ticket:
    requirement_freeze:
    low_fidelity_review:
    prototype_review:
    prototype_profile_decision:
    prototype_deliverable:
    prototype_deliverable_verification:
    prototype_confirmation:
    openapi_freeze_or_no_impact:
    architecture_review:
    data_architecture:
    engineering_baseline:
    tactical_design:
    build_architecture_checklist:
    implementation_repository:
    frontend_repository:
    backend_repository:
    maven_wrapper:
  readiness:
    blockers: []
    stale_inputs: []
    not_applicable:
      - item:
        reason:
  resolution:
    required_capabilities: []
    required_skills: []
    recipe_ids: []
    conditions: []
    reason_chains: {}
    registry_digest: # sha256 of normalized docs/agents/yss-skill-registry.yaml
    compiler_contract_digest: # sha256 of normalized compiler-contract.yaml
    compiled_at:
    freshness: current # digest 变化后为 stale
  common:
    impacted_areas: []
    implementation_path_policy: harness-apps-multi-project # or external-repository-native | git-submodule-harness-apps
    project_roots: []
    required_capabilities: []
    required_skills: []
    optional_skills: []
    unavailable_skills:
      - skill:
        provider:
        fallback: blocked | approved-equivalent
        resolution:
    allowed_write_paths: []
    forbidden_patterns: []
    expected_evidence_files: []
    verification_commands: []
    human_review_points: []
    full_reroute_triggers: []
    quality_baseline_ref:
    context_plan:
      required_context_refs: []
      on_demand_context_refs: []
      context_stop_rule: minimal-sufficient-evidence
      missing_context_action: blocked # or reroute
    doubt_driven_review:
      status: not-applicable # or required / completed / blocked
      trigger_impacts: []
      claim:
      counterclaim:
      evidence_refs: []
      residual_risks: []
      reviewer_ref:
  frontend:
    status: not-applicable
    required_skills: []
    approved_prototype_ref:
    state_matrix_ref:
    generated_api_client_ref:
    allowed_write_paths: []
    component_test_seams: []
    e2e_paths: []
  backend:
    status: not-applicable
    affected_layers: []
    component_impacts: []
    required_skills: []
    application_boundary:
    transaction_boundary:
    persistence_strategy:
    tactical_design_ref:
    tactical_design_version:
    aggregate_refs: []
    invariant_refs: []
    state_behavior_refs: []
    gateway_boundary_ref:
    domain_test_seams: []
    application_test_seams: []
    tactical_ddd:
      status: not-applicable
      tactical_design_ref:
      tactical_design_version:
      aggregate_refs: []
      invariant_refs: []
      state_behavior_refs: []
      gateway_boundary_ref:
      domain_test_seams: []
      application_test_seams: []
    allowed_write_paths: []
    forbidden_patterns: []
    expected_evidence_files: []
    seam_deferred: []
    verification_commands: []
  contract:
    api_impact: false
    freeze_ref:
    no_api_impact_ref:
    generated_clients: []
    contract_tests: []
    regeneration_commands: []
  cross_repo:
    repositories: []
    delivery_order: []
    integration_verification: []
    rollback_order: []
  work_units:
    - id: slice-frontend
      role_id: role.frontend-engineer
      runtime_id: runtime.skill-projection
      execution_state: Worker
      workflow_status: not-started
      task_package_ref:
      contract_id: # must equal slice_contract.contract_id
      contract_version: # must equal slice_contract.contract_version
      downstream_consumers: []
      convergence_ref:
      work_unit:
        behavior:
        primary_skill:
        supporting_skills: []
        tdd_mode: behavior-tdd
        allowed_write_paths: []
        expected_evidence: []
        verification_commands: []
    - id: slice-backend
      role_id: role.backend-engineer
      runtime_id: runtime.skill-projection
      execution_state: Worker
      workflow_status: not-started
      task_package_ref:
      contract_id:
      contract_version:
      downstream_consumers: []
      convergence_ref:
      work_unit:
        behavior:
        primary_skill:
        supporting_skills: []
        tdd_mode: behavior-tdd
        allowed_write_paths: []
        expected_evidence: []
        verification_commands: []
```

工作单元：

```yaml
work_unit:
  id:
  behavior:
  primary_skill:
  supporting_skills: []
  tdd_mode: behavior-tdd
  allowed_write_paths: []
  expected_evidence: []
  verification_commands: []
  controlled_generation:
    exception_reason:
    generator:
    generator_inputs: []
    expected_files: []
    verification_commands: []
    behavior_tests_after_generation: []
```

`controlled_generation` 仅在 `tdd_mode: controlled-generation` 时必填；其他模式标记 `not-applicable`。明确写入需求的权限业务行为仍使用 `behavior-tdd`；API schema 与 database schema 分别触发契约或数据架构回退，不得用一个含糊的 schema 类型决定路线。

`work_units` 中的前端、后端和测试任务是切片级子任务，不是新的生命周期阶段。每个子任务必须引用独立任务包；任务包只能消费同一份已批准且版本当前的 Slice Contract。`workflow_status` 追踪执行过程，不能替代生命周期状态；`contract_id`、`contract_version` 或 resolution digest 不一致时必须阻断并回到实现合同编译器。

一个切片可以组合多个窄 Recipe，但只计算一次闭包。Recipe 只能引用 capability；合同同时冻结 `required_capabilities`、`required_skills`、完整原因链和 Registry/Compiler digest。任一 digest 改变时，当前合同标记 `stale`，重新编译后仍须由 `yss-product-lifecycle` 再批准。
