# 垂直切片 Issue：DMW-006 单一架构师评审

## 父级

- OpenSpec / Comet change：`openspec/changes/data-modeling-workbench-mvp`
- PRD：`docs/requirements/2026-07-01-data-modeling-workbench-prd.md`
- 交互设计：`docs/design/data-modeling-workbench-interaction-spec.md`
- 契约测试清单：`docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`

## 要构建什么

交付提交评审、查看评审详情、评论、驳回、通过和驳回后再次提交的完整闭环。完成后，指定数据架构师可以在评审页集中查看 diff、规范检查结果、覆盖率和评论区，并给出单一审批结论；驳回后再次提交生成新的 `reviewId` 并保留历史。

## 覆盖的用户故事

- PRD 用户故事 19-21
- FR-010、FR-011、FR-019、FR-020

## OpenAPI 影响

- [x] 基于冻结 OpenAPI：`docs/api/specs/data-modeling-workbench.yaml`
- [ ] 需要修改 OpenAPI

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| POST | `/api/v1/modeling/projects/{projectId}/reviews` | 提交评审 |
| GET | `/api/v1/modeling/reviews/{reviewId}` | 评审详情 |
| POST | `/api/v1/modeling/reviews/{reviewId}/comments` | 评审评论 |
| POST | `/api/v1/modeling/reviews/{reviewId}/decision` | 审批 / 驳回 |

## 验收标准

- [ ] 覆盖率低于 80% 或存在当前 blocker 时无法提交评审。
- [ ] 提交成功返回新的 `reviewId`、覆盖率快照、检查快照和可用动作。
- [ ] 非指定评审人审批返回 403，状态不变。
- [ ] 驳回必须填写原因，驳回后旧 review 保持 rejected。
- [ ] 驳回后修改并再次提交生成新 `reviewId`，通过 `previousReviewId` 追溯。
- [ ] 重复审批同一 review 返回冲突或幂等安全结果。

## 测试 Seam

- 主要公共接口：Review Application 用例、Review 聚合状态机、Diff Gateway、Review Repository、评审页。
- 必需测试：
  - [ ] 行为 / 领域测试：单活跃评审、审批状态机、驳回重提、重复审批。
  - [ ] API / 契约测试：CT-060 至 CT-065。
  - [ ] UI / 组件测试：评审详情、diff、评论、审批按钮权限、驳回原因。
  - [ ] E2E 测试：提交评审，架构师驳回，修改后再次提交并通过。

## 阻塞关系

- DMW-005 规范规则与检查运行。

## AI / 人工审查点

- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`，指定评审人校验必须后端执行。
- [ ] 数据库迁移：仅生成模板，`TODO-HUMAN-REVIEW`。
- [ ] 审计：提交、评论、驳回、通过必须记录。
- [ ] 原生 SQL：仅生成草案或通过 Repository 约束。

## 完成定义

- [ ] 评审闭环和驳回重提可演示。
- [ ] 已新增并通过行为、API、UI、E2E 测试。
- [ ] 不修改已冻结 OpenAPI。
- [ ] 审批权限和审计证据已通过人工确认。
