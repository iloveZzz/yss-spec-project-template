---
pipeline: <feature-id>
stage: cross-repo-slice
status: draft
owner: ai
---

# <切片名称>跨仓库垂直切片记录

> 用于绑定一个 Harness change 下的前端、后端、契约、验证和发布证据。没有影响的实现仓库必须标记 `not-applicable`，不能留空。

## 1. Harness 绑定

| 字段 | 值 |
|---|---|
| harness_change |  |
| slice_id |  |
| vertical_slice_issue |  |
| implementation_routing |  |
| build_architecture_checklist |  |

## 2. Contract 绑定

| 字段 | 值 |
|---|---|
| openapi_spec |  |
| freeze_record |  |
| generated_client |  |
| contract_verification |  |

## 3. Backend

| 字段 | 值 |
|---|---|
| backend_repo |  |
| backend_branch |  |
| backend_mr_pr |  |
| backend_ci |  |
| backend_verification |  |
| backend_status | pending / ready / blocked / not-applicable |

## 4. Frontend

| 字段 | 值 |
|---|---|
| frontend_repo |  |
| frontend_branch |  |
| frontend_mr_pr |  |
| frontend_ci |  |
| frontend_verification |  |
| frontend_status | pending / ready / blocked / not-applicable |

## 5. Fresh Verification

| 字段 | 值 |
|---|---|
| fresh_verification |  |

| 验证项 | 命令 / 证据 | 结果 |
|---|---|---|
| Contract |  | pass / fail / not-applicable |
| Backend |  | pass / fail / not-applicable |
| Frontend |  | pass / fail / not-applicable |
| E2E / 关键路径 |  | pass / fail / not-applicable |

## 6. Release And Rollback

| 字段 | 值 |
|---|---|
| release_and_rollback |  |
| release_note |  |
| rollout_record |  |
| rollback_point |  |
| observe_signal |  |
| human_review |  |

## 7. 结论

- 是否允许进入 review / merge：
- 阻断项：
- 下一步：
