# 垂直切片 Issue：DMW-003 Excel 导入物理模型草稿

## 父级

- OpenSpec / Comet change：`openspec/changes/data-modeling-workbench-mvp`
- GitHub Issue：[#4](https://github.com/iloveZzz/yss-spec-project-template/issues/4)
- PRD：`docs/requirements/2026-07-01-data-modeling-workbench-prd.md`
- OpenAPI Freeze：`docs/api/freeze/2026-07-02-data-modeling-workbench-openapi-freeze.md`
- 契约测试清单：`docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`

## 要构建什么

交付 Excel 导入已有表结构为物理模型草稿的端到端流程。完成后，数仓开发工程师可以下载模板、查看表头别名、上传 Excel、看到导入预览和校验结果，并在确认后 apply 到项目草稿；存在 blocker 时不得写入模型草稿。

## 覆盖的用户故事

- PRD 用户故事 9、10、28
- FR-004、FR-020

## OpenAPI 影响

- [x] 基于冻结 OpenAPI：`docs/api/specs/data-modeling-workbench.yaml`
- [ ] 需要修改 OpenAPI

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| POST | `/api/v1/modeling/imports` | 创建导入任务 |
| GET | `/api/v1/modeling/imports/{importId}/preview` | 查询导入预览 |
| POST | `/api/v1/modeling/imports/{importId}/apply` | 应用导入结果 |
| POST | `/api/v1/modeling/imports/{importId}/cancel` | 取消导入任务 |
| GET | `/api/v1/modeling/import-templates/excel`、`/aliases` | 模板与别名 |

## 验收标准

- [ ] 上传 Excel 只创建导入任务和预览结果，不直接写入模型草稿。
- [ ] 缺少必填模板列、重复字段、表头别名不支持、目标表不在首批 8 张表范围、PostgreSQL 类型无法转换时返回明确 blocker。
- [ ] 只有 warning 且用户确认 apply 时，生成物理表和物理字段草稿并递增 `draftVersion`。
- [ ] 重复 apply 同一幂等键不会重复创建字段。
- [ ] 取消导入任务后不可再次 apply。
- [ ] 导入向导支持返回、取消、重试和草稿保留规则。

## 测试 Seam

- 主要公共接口：导入 Application 用例、Excel 解析 Gateway、导入任务聚合、物理模型 Repository、导入向导页面。
- 必需测试：
  - [ ] 行为 / 领域测试：preview-before-apply、blocker 不写草稿、幂等 apply。
  - [ ] API / 契约测试：CT-030 至 CT-038、CT-093。
  - [ ] UI / 组件测试：上传、预览、问题列表、apply、cancel、retry 状态。
  - [ ] E2E 测试：上传合法 Excel，预览后 apply，物理模型草稿出现新表字段。

## 阻塞关系

- DMW-001 模型项目与边界闭环。
- 可与 DMW-002 并行；DMW-004 需要同时依赖 DMW-002 和 DMW-003。

## AI / 人工审查点

- [ ] 文件上传安全：`TODO-HUMAN-REVIEW`，包括文件类型、大小、公式注入、恶意内容和存储策略。
- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`。
- [ ] 数据库迁移：仅生成模板，`TODO-HUMAN-REVIEW`。
- [ ] 原生 SQL：仅生成草案或通过 Repository 约束。

## 完成定义

- [ ] 导入向导主路径和 blocker 路径均可演示。
- [ ] 已新增并通过行为、API、UI、E2E 测试。
- [ ] 不修改已冻结 OpenAPI。
- [ ] 文件上传安全人工确认项有记录。
