# Slice v2 历史格式

只读兼容；新合同使用 v3，不继承旧批准。

# Slice Implementation Contract v2

implementation_path_policy: git-submodule-harness-apps

由 `yss-implementation-contract-compiler` 生成草案，由 `harness-orchestrator` 校验、持久化和批准。合同以一个垂直切片为边界，四个 Agent 必须消费同一个 contract_id / contract_version 和 resolution digest。schema v1 已停止支持，必须重新编译，不自动升级。

## 合同结构

slice_contract:
  schema_version: 2
  contract_id: slice-implementation-contract-v2:<slice-id>
  contract_version: 1
  slice_id:
  status: draft
  lifecycle_refs:
    upstream_inputs:
    tactical_design:
    api_freeze_or_no_impact:
    data_architecture_or_no_impact:
    ui_inputs_or_no_impact:
    implementation_repositories:
  readiness:
    blockers: []
    stale_inputs: []
    not_applicable: []
  resolution:
    required_capabilities: []
    required_skills: []
    recipe_ids: []
    conditions: []
    reason_chains: {}
    registry_digest:
    compiler_contract_digest:
    compiled_at:
    freshness: current
  common:
    impacted_areas: []
    project_roots: []
    required_capabilities: []
    required_skills: []
    allowed_write_paths: []
    forbidden_patterns: []
    expected_evidence_files: []
    verification_commands: []
    full_reroute_triggers: []
  architecture:
    tactical_design_ref:
    tactical_design_version:
    aggregate_refs: []
    invariant_refs: []
    state_behavior_refs: []
    gateway_boundary_ref:
    decision_refs: []
  frontend:
    status: not-applicable
    required_skills: []
    approved_interaction_ref:
    state_matrix_ref:
    visual_baseline_ref:
    visual_baseline_case_ids: []
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
    allowed_write_paths: []
    forbidden_patterns: []
    expected_evidence_files: []
    verification_commands: []
  testing:
    status: draft
    required_skills: []
    test_strategy_ref:
    test_seams: []
    fixtures: []
    coverage_targets:
      domain_application: 90
      api: 80
      frontend_component: 75
    critical_flows: []
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
    delivery_order: [test-seams, backend, frontend, verification]
    integration_verification: []
    rollback_order: []
  work_units: []

## 就绪与重路由

只有当前批准的本地输入或已核验的上游输入、战术设计 / not-applicable、API / 数据 / UI 影响、实现仓库、写路径、测试 seam、验证命令和证据均满足，且不存在 blocked / stale / drift / violation / new_impacts 时，Orchestrator 才能把合同和切片设置为 ready-for-agent。

API schema、数据库 schema、状态机、Visual Baseline 版本或 digest、聚合、不变量、Gateway、写路径、测试 seam、验证命令、Registry digest 或 Compiler digest 发生实质变化时，当前合同变为 stale，所有下游任务暂停并递增 contract_version；重新编译后仍须由 Orchestrator 再批准。UI 切片只消费 `visual_baseline_case_ids` 指定的图片；Agent 必须先读 manifest 与语义引用，不得按目录 glob 猜测图片含义。

一个切片可以组合多个窄 Recipe，但只计算一次闭包。Recipe 只能引用 capability；合同必须同时冻结 `required_capabilities`、`required_skills`、原因链与两个 digest。

实现任务包使用 execution_state: Worker；测试 Agent 的独立 Review / Verifier 必须使用不同 actor_id。结果必须符合 workflow-execution-result-v1，并记录实际命令、退出码、执行时间和证据引用。

## 技术设计绑定

后端设计影响使用 `resolution.technical_design: {ref, version, digest}`，同时绑定 `slice_id` 和架构来源。当前批准的 v2 合同根据架构消费 `design`，DDD 专属字段仅适用于 `domain-driven`。旧 v1 DDD 可显式加 `legacy_ddd: true` 只读消费。编译与 freshness 都重验文件、版本、摘要、批准及切片依赖；不得自动迁移或批准。
