# 垂直切片 Issue：DMW-008 三类异步导出资产

## 父级

- OpenSpec / Comet change：`openspec/changes/data-modeling-workbench-mvp`
- GitHub Issue：[#9](https://github.com/iloveZzz/yss-spec-project-template/issues/9)
- PRD：`docs/requirements/2026-07-01-data-modeling-workbench-prd.md`
- OpenAPI Freeze：`docs/api/freeze/2026-07-02-data-modeling-workbench-openapi-freeze.md`
- ADR：`docs/adr/0001-data-modeling-workbench-ddl-draft-only.md`

## 要构建什么

交付发布版本的异步导出闭环。完成后，数仓开发工程师可以从已发布版本创建 SQL DDL 草案、Markdown 模型文档和 Excel 字段清单导出任务，查看任务状态，失败后重试，并在成功后获取受控下载引用；草稿版本不得导出。

## 覆盖的用户故事

- PRD 用户故事 24-26
- FR-013、FR-014、FR-015、FR-020

## OpenAPI 影响

- [x] 基于冻结 OpenAPI：`docs/api/specs/data-modeling-workbench.yaml`
- [ ] 需要修改 OpenAPI

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| POST | `/api/v1/modeling/versions/{versionId}/exports` | 创建导出任务 |
| GET | `/api/v1/modeling/exports/{exportId}` | 查询导出任务 |
| POST | `/api/v1/modeling/exports/{exportId}/retry` | 重试失败导出 |

## 验收标准

- [ ] 只允许从已发布版本创建导出任务，草稿导出返回错误。
- [ ] 导出任务状态覆盖 queued、running、succeeded、failed、expired。
- [ ] 失败后重试保留 `originalExportId` 和失败原因。
- [ ] 下载 URL 短期有效、绑定权限，过期后状态变为 expired 或返回受控错误。
- [ ] SQL DDL 文件必须明确标识“草案”，且系统不存在 DDL 执行入口。
- [ ] Markdown 和 Excel 导出内容与版本快照一致。

## 测试 Seam

- 主要公共接口：Export Application 用例、ExportTask 聚合、File Gateway、Export Renderer、导出中心页面。
- 必需测试：
  - [ ] 行为 / 领域测试：草稿禁止导出、状态流转、重试、URL 过期。
  - [ ] API / 契约测试：CT-080 至 CT-085、CT-004。
  - [ ] UI / 组件测试：导出创建、轮询、失败重试、下载过期。
  - [ ] E2E 测试：从发布版本导出 Markdown / Excel / DDL 草案并下载。

## 阻塞关系

- DMW-007 发布版本与新草稿。

## AI / 人工审查点

- [ ] SQL / DDL：仅生成草案，`TODO-HUMAN-REVIEW`。
- [ ] 文件下载安全：`TODO-HUMAN-REVIEW`，下载 URL 必须短期有效且绑定权限。
- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`。
- [ ] 数据库迁移：仅生成模板，`TODO-HUMAN-REVIEW`。

## 完成定义

- [ ] 三类导出任务主路径、失败重试和过期路径可演示。
- [ ] 已新增并通过行为、API、UI、E2E 测试。
- [ ] 不修改已冻结 OpenAPI。
- [ ] DDL 草案红线有人工确认记录。
