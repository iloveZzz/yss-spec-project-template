# Slice Implementation Contract

Router 生成草案；`yss-product-lifecycle` 核验并持久化。合同缺少必填字段时状态为 `blocked`。

```yaml
slice_contract:
  schema_version: 1
  contract_id:
  contract_version: 1
  slice_id:
  status: draft
  lifecycle_refs:
    spec:
    ticket:
    requirement_freeze:
    low_fidelity_review:
    high_fidelity_html:
    antd_cli_evidence:
    prototype_confirmation:
    openapi_freeze_or_no_impact:
    architecture_review:
    data_architecture:
    engineering_baseline:
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
    required_skills: []
    application_boundary:
    transaction_boundary:
    persistence_strategy:
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
  work_units: []
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

`controlled_generation` 仅在 `tdd_mode: controlled-generation` 时必填；其他模式标记 `not-applicable`。API schema 与 database schema 分别触发契约或数据架构回退，不得用一个含糊的 schema 类型决定路线。
