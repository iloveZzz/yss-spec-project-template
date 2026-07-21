# YSS Skill Execution Result

核心 YSS skill 必须消费已批准合同版本，并返回：

```yaml
execution_result:
  schema_version: 1
  skill:
  slice_id:
  work_unit_id:
  status: implemented
  consumed_contract:
    contract_ref:
    contract_id:
    contract_version:
  changed_files:
    - path:
      contract_area: common | frontend | backend | contract | cross_repo
  evidence_files:
    - path:
      evidence_type: code | test | generated | review | verification
      behavior_ref:
  verification_results:
    - command:
      result:
      executed_at:
  constraint_results:
    - constraint:
      status: passed | failed | not-applicable
      evidence_ref:
  seam_deferred:
    - risk:
      owner:
      follow_up_ticket:
      verification_plan:
  deviations:
    - rule:
      reason:
      approval_ref:
  new_impacts:
    - impact_type:
      evidence_ref:
  not_applicable_reason:
```

允许状态：`implemented`、`seam-deferred`、`drift`、`violation`、`not-applicable`。

Router 必须验证：

1. `consumed_contract.contract_version` 与当前批准版本一致。
2. `changed_files` 全部位于工作单元和切片允许路径内。
3. `expected_evidence_files` 全部存在并能回指行为。
4. 验证命令包含实际结果和时间；计划命令不算证据。
5. `seam_deferred` 有风险、责任人、补齐 Ticket 和验证计划。
6. `new_impacts` 非空时暂停并重路由。
7. `drift` 触发 Architecture Re-check；`violation` 阻断 build。
8. `status: not-applicable` 必须填写 `not_applicable_reason`；其他状态保留字段但可为空。

专项 skill 自报 `implemented` 不等于最终通过，生命周期编排器和独立 Reviewer 必须复核。

`verification_results` 不得为空，每项必须包含非空 `command`、`result` 和 `executed_at`。路径校验按完整目录边界判断，`apps/backend/order-escape` 不属于 `apps/backend/order/`。完整重路由时旧合同必须标记 `stale`，新合同版本递增并保留旧合同引用、失效原因和触发器。
