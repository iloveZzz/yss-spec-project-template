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
| topology | `分仓接入` / `新建一体仓` / `已有一体仓` |
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
| backend_repo | 一体仓可与 `frontend_repo` 为同一 `git_url` |
| backend_branch |  |
| backend_mr_pr | 一体仓可与前端同一 MR |
| backend_ci |  |
| backend_verification |  |
| backend_project_root | 按 `layout_policy` 填真实根或 `apps/backend/<project>/` |
| backend_status | pending / ready / blocked / not-applicable |

## 4. Frontend

| 字段 | 值 |
|---|---|
| frontend_repo | 一体仓可与 `backend_repo` 为同一 `git_url` |
| frontend_branch |  |
| frontend_mr_pr | 一体仓可与后端同一 MR |
| frontend_ci |  |
| frontend_verification |  |
| frontend_project_root | 按 `layout_policy` 填真实根或 `apps/frontend/<project>/` |
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
