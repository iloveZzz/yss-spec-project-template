# Slice Implementation Contract

Router 生成草案；`yss-product-lifecycle` 核验并持久化。合同缺少必填字段时状态为 `blocked`。

```yaml
slice_contract:
  schema_version: 1
  contract_id:
  contract_version: 1
  slice_id:
  status: draft
  suggested_owner_role_id: # role.frontend-engineer | role.backend-engineer | role.test-engineer；Router 只建议，编排器派活并批准
  lifecycle_refs:
    spec:
    ticket:
    requirement_freeze:
    low_fidelity_review:
    prototype_review:
    high_fidelity_html:
    prototype_verification:
    antd_cli_evidence:
    browser_verification_evidence:
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
  common:
    impacted_areas: []
    implementation_path_policy: harness-apps-multi-project # or external-repository-native | git-submodule-harness-apps
    project_roots: []
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

`work_units` 中的前端、后端和测试任务是切片级子任务，不是新的生命周期阶段。每个子任务必须引用独立任务包；任务包只能消费同一份已批准且版本当前的 Slice Contract。`workflow_status` 追踪执行过程，不能替代生命周期状态；`contract_id` 或 `contract_version` 不一致时必须阻断并回到 Router。
