# 垂直切片 Issue：DMW-007 发布版本与新草稿

## 父级

- OpenSpec / Comet change：`openspec/changes/data-modeling-workbench-mvp`
- PRD：`docs/requirements/2026-07-01-data-modeling-workbench-prd.md`
- 数据架构：`docs/architecture/2026-07-02-data-modeling-workbench-data-architecture.md`
- 契约测试清单：`docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`

## 要构建什么

交付发布检查、发布版本、不可变发布快照、历史版本查看和从版本创建新草稿的完整闭环。完成后，数仓负责人可以发布已通过评审的模型版本，架构师可以查看历史版本、发布人、发布时间、发布说明和快照校验信息，开发工程师可以从已发布版本创建新草稿继续演进。

## 覆盖的用户故事

- PRD 用户故事 22、23、27
- FR-012、FR-019、FR-020、FR-021

## OpenAPI 影响

- [x] 基于冻结 OpenAPI：`docs/api/specs/data-modeling-workbench.yaml`
- [ ] 需要修改 OpenAPI

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| POST | `/api/v1/modeling/projects/{projectId}/publish-check` | 发布前检查 |
| GET / POST | `/api/v1/modeling/projects/{projectId}/versions` | 版本列表与发布 |
| GET | `/api/v1/modeling/versions/{versionId}` | 版本详情 |
| POST | `/api/v1/modeling/versions/{versionId}/drafts` | 从版本创建草稿 |

## 验收标准

- [ ] 发布检查整体覆盖率低于 85% 返回 `PUBLISH_COVERAGE_BELOW_THRESHOLD`。
- [ ] 发布检查 P0 覆盖率低于 95% 返回 `P0_COVERAGE_BELOW_THRESHOLD`。
- [ ] 发布请求缺少 `ddlDraftAcknowledged: true` 时不生成版本。
- [ ] 发布成功生成不可变版本、`snapshotChecksum`、`snapshotSchemaVersion` 和只读快照。
- [ ] 打开发布版本时编辑入口禁用，命令接口拒绝修改。
- [ ] 从版本创建草稿记录 `sourceVersionId`，不修改原发布快照。

## 测试 Seam

- 主要公共接口：Publish Application 用例、VersionSnapshot 聚合、Snapshot Repository、发布弹窗、版本中心。
- 必需测试：
  - [ ] 行为 / 领域测试：发布前置条件、快照不可变、从版本建草稿。
  - [ ] API / 契约测试：CT-070 至 CT-075。
  - [ ] UI / 组件测试：发布弹窗、发布检查、版本列表筛选排序、只读详情。
  - [ ] E2E 测试：通过评审后发布版本，查看版本详情，从版本创建草稿。

## 阻塞关系

- DMW-006 单一架构师评审。

## AI / 人工审查点

- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`。
- [ ] 数据库迁移：仅生成模板，`TODO-HUMAN-REVIEW`。
- [ ] DDL 草案确认：发布请求中的 `ddlDraftAcknowledged` 不能等同于自动执行 DDL。
- [ ] 审计：发布、查看快照、从版本建草稿必须记录。

## 完成定义

- [ ] 发布版本和从版本创建草稿可演示。
- [ ] 已新增并通过行为、API、UI、E2E 测试。
- [ ] 不修改已冻结 OpenAPI。
- [ ] 版本快照不可变性有测试证据。
