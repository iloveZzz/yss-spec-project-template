---
pipeline: data-modeling-workbench
stage: openapi-freeze
status: contract-test-checklist
owner: ai
created_at: 2026-07-02
source:
  - docs/api/specs/data-modeling-workbench.yaml
  - docs/api/freeze/2026-07-02-data-modeling-workbench-openapi-freeze.md
---

# 企业数据模型协作工作台 MVP 契约测试清单

## 1. OpenAPI 基础可消费性

| ID | 场景 | 预期 |
|---|---|---|
| CT-001 | 解析 `docs/api/specs/data-modeling-workbench.yaml` | 标准 YAML / OpenAPI 工具可直接读取，根对象包含 `openapi: 3.1.0`。 |
| CT-002 | 校验 `$ref` | 所有本地 `$ref` 均可解析。 |
| CT-003 | 校验路径参数 | 路径中的 `{projectId}`、`{reviewId}`、`{versionId}` 等均有 path parameter 定义。 |
| CT-004 | 校验无 DDL 执行端点 | 不存在 database connection、execute DDL、migration / migrate 类路径。 |

## 2. 通用契约

| ID | 场景 | 预期 |
|---|---|---|
| CT-010 | 单对象响应 | 使用 `SingleResult<T>` 包装。 |
| CT-011 | 分页列表响应 | 使用 `PageResult<T>`，包含 `pageMeta`。 |
| CT-012 | 业务校验失败 | 返回 `ApiError`，必要时包含 `fieldErrors`。 |
| CT-013 | 无查看权限 | 返回 403 + `PERMISSION_DENIED`，不得返回模型项目、主题域、表或字段数据。 |
| CT-014 | 操作无权限但可查看页面 | 返回 `actions[].enabled=false` 和 `disabledReason`，直接调用命令接口返回 403。 |
| CT-015 | mutating command 缺少 `X-Idempotency-Key` | 请求失败，不能执行状态变更。 |

## 3. 模型项目与边界

| ID | 场景 | 预期 |
|---|---|---|
| CT-020 | 查询模型项目列表 | 支持 page、size、keyword、status、owner、reviewStatus、coverageMin/Max、sort、direction。 |
| CT-021 | 创建模型项目缺项目边界或主题域边界 | 返回 422，错误码 `PROJECT_BOUNDARY_INCOMPLETE` 或字段级错误。 |
| CT-022 | 更新项目时 `draftVersion` 冲突 | 返回 409 `VERSION_CONFLICT`，不覆盖他人修改。 |
| CT-023 | 归档项目 | 已发布版本和审计追溯不被删除。 |

## 4. Excel 导入

| ID | 场景 | 预期 |
|---|---|---|
| CT-030 | 上传 Excel 创建导入任务 | 返回 202 + `ImportJob`，上传本身不写入模型草稿。 |
| CT-031 | Excel 缺少必填模板列 | 返回 422 或 preview blocker，错误码 `IMPORT_TEMPLATE_MISMATCH`。 |
| CT-032 | Excel 表头别名不支持 | 返回 `IMPORT_COLUMN_ALIAS_UNSUPPORTED`，提示标准模板入口。 |
| CT-033 | Excel 存在重复字段 | 预览返回 `IMPORT_DUPLICATE_FIELD` 和行列定位。 |
| CT-034 | 目标表不在首批 8 张表范围 | 预览 blocker，不允许 apply。 |
| CT-035 | PostgreSQL 类型无法转换 | 返回 `POSTGRES_TYPE_UNSUPPORTED`，要求人工选择类型。 |
| CT-036 | apply 预览存在 blocker | 返回 422，不生成物理模型草稿。 |
| CT-037 | apply 只有 warning 且带说明 | 成功生成物理模型草稿并递增 `draftVersion`。 |
| CT-038 | 重复 apply 同一幂等键 | 返回同一结果或安全重试结果，不重复创建字段。 |

## 5. 字段映射与覆盖率

| ID | 场景 | 预期 |
|---|---|---|
| CT-040 | 查询字段映射列表 | 支持表、未映射、P0、问题等级筛选和分页。 |
| CT-041 | 保存映射缺少映射说明 | 返回字段级错误。 |
| CT-042 | 保存映射引用越界逻辑字段或物理字段 | 返回 422，不进入有效覆盖率。 |
| CT-043 | 计算整体覆盖率 | 按有效映射逻辑字段数 / 范围内有效逻辑字段总数计算。 |
| CT-044 | 计算 P0 覆盖率 | 按有效映射 P0 必填逻辑字段数 / 范围内 P0 必填逻辑字段总数计算。 |
| CT-045 | 映射保存 `draftVersion` 冲突 | 返回 409 `VERSION_CONFLICT`。 |

## 6. 规范检查

| ID | 场景 | 预期 |
|---|---|---|
| CT-050 | 更新规则集 | 需要 `draftVersion` 和幂等键，成功后规则集版本可追溯。 |
| CT-051 | 发起检查 | 返回 `ValidationRun`，绑定 `projectId`、`draftVersion`、`ruleSetVersion`。 |
| CT-052 | 检查结果包含字段定位 | `ValidationIssue` 包含 `objectType`、`objectId`、`fieldPath`、`rowNo`、`message`、`suggestion`。 |
| CT-053 | 存在 blocker 提交评审 | 返回 422 `VALIDATION_BLOCKING_ISSUES`。 |
| CT-054 | 草稿变更后旧检查结果 | 旧 `ValidationRun` 只作为历史证据，不作为当前门禁。 |

## 7. 评审

| ID | 场景 | 预期 |
|---|---|---|
| CT-060 | 覆盖率低于 80% 提交评审 | 返回 422 `REVIEW_COVERAGE_BELOW_THRESHOLD`。 |
| CT-061 | 提交评审成功 | 返回新的 `reviewId`、coverage snapshot、actions。 |
| CT-062 | 非指定评审人审批 | 返回 403 `PERMISSION_DENIED`，状态不变。 |
| CT-063 | 驳回缺少原因 | 返回字段级错误。 |
| CT-064 | 驳回后再次提交 | 生成新 `reviewId`，旧 review 保持 rejected；新 review 可通过 `previousReviewId` 追溯。 |
| CT-065 | 重复审批同一 review | 返回 `REVIEW_DECISION_CONFLICT` 或幂等安全结果。 |

## 8. 发布与版本快照

| ID | 场景 | 预期 |
|---|---|---|
| CT-070 | 发布检查整体覆盖率低于 85% | 返回 `PUBLISH_COVERAGE_BELOW_THRESHOLD`。 |
| CT-071 | 发布检查 P0 覆盖率低于 95% | 返回 `P0_COVERAGE_BELOW_THRESHOLD`。 |
| CT-072 | 发布请求缺少 `ddlDraftAcknowledged: true` | 返回 422 `DDL_DRAFT_ACK_REQUIRED` 或字段级错误，不生成版本。 |
| CT-073 | 发布成功 | 返回不可变版本、`snapshotChecksum`、`snapshotSchemaVersion` 和只读快照。 |
| CT-074 | 打开发布版本尝试编辑 | 编辑入口禁用；命令接口拒绝修改。 |
| CT-075 | 从版本创建草稿 | 新草稿记录 `sourceVersionId`，发布快照不被修改。 |

## 9. 异步导出

| ID | 场景 | 预期 |
|---|---|---|
| CT-080 | 从发布版本创建 SQL 导出 | 返回 `ExportTask`，状态为 queued/running/succeeded/failed/expired 之一。 |
| CT-081 | 从草稿创建导出 | 返回 422 或 404，不允许导出未发布草稿。 |
| CT-082 | 导出失败后重试 | 创建新的 `exportId`，保留 `originalExportId` 和失败原因。 |
| CT-083 | 下载 URL 过期 | 状态变为 expired，不复用过期 URL。 |
| CT-084 | 下载成功 | 记录下载审计，URL 短期有效且绑定权限。 |
| CT-085 | 导出 DDL 草案 | 文件明确标识草案，不存在执行入口。 |

## 10. 安全与审计

| ID | 场景 | 预期 |
|---|---|---|
| CT-090 | 越权查看项目详情 | 403 且响应不包含业务数据。 |
| CT-091 | 越权审批 / 发布 / 导出 | 403，写安全审计，状态不变。 |
| CT-092 | 发布、审批、导入 apply、导出创建成功 | 写业务审计。 |
| CT-093 | Excel 上传包含公式注入风险内容 | 导出/预览时按安全规则处理或阻断。 |
| CT-094 | 搜索和分页 size 过大 | 返回校验错误或按最大 size 限制。 |

## 11. 实现前补充

实现前建议把以下检查固化为自动化：

1. 标准 OpenAPI validator。
2. `$ref` 完整性检查。
3. mutating 操作幂等键覆盖检查。
4. 安全路径黑名单检查。
5. 契约测试集成到前后端 CI。
