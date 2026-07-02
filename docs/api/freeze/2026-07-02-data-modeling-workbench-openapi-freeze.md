---
pipeline: data-modeling-workbench
stage: openapi-freeze
status: frozen
owner: ai
created_at: 2026-07-02
source:
  - docs/api/specs/data-modeling-workbench.yaml
  - docs/architecture/2026-07-02-data-modeling-workbench-design-review-rerun.md
  - docs/requirements/2026-07-01-data-modeling-workbench-prd.md
  - docs/design/data-modeling-workbench-interaction-spec.md
  - docs/adr/0001-data-modeling-workbench-ddl-draft-only.md
  - docs/adr/0002-data-modeling-workbench-immutable-version-snapshot.md
---

# 企业数据模型协作工作台 MVP OpenAPI Freeze

## 1. 冻结结论

结论：Approved，企业数据模型协作工作台 MVP API 契约进入 OpenAPI Freeze。

冻结文件：

- `docs/api/specs/data-modeling-workbench.yaml`

冻结范围：

1. API 路径、HTTP 方法、operationId、请求体、响应体、错误结构和错误码。
2. YSS 统一响应包装：`SingleResult<T>`、`PageResult<T>`。
3. 分页、筛选、排序、权限动作、`draftVersion` 乐观锁和 `X-Idempotency-Key` 幂等契约。
4. Excel 导入、字段映射、覆盖率、规范检查、评审、发布、版本历史、异步导出和从版本创建草稿。
5. 安全边界：只生成 PostgreSQL DDL 草案，不提供数据库连接、DDL 执行或迁移端点。

冻结后变更规则：

1. 任何 API 路径、schema、错误码、权限动作、分页排序、幂等、乐观锁或安全边界变更，都必须重新进入契约评审。
2. 前后端实现、契约测试和垂直切片必须以本冻结版本为准。
3. 实现过程中发现契约缺口时，不得直接修改实现绕过契约；必须回到 OpenAPI Draft remediation 或变更流程。

## 2. 冻结依据

| 输入资产 | 状态 |
|---|---|
| PRD | `docs/requirements/2026-07-01-data-modeling-workbench-prd.md` 已冻结供 OpenAPI 使用。 |
| 交互说明 | `docs/design/data-modeling-workbench-interaction-spec.md` 已通过 Prototype Review 和 PRD 校准。 |
| Design Review 复审 | `docs/architecture/2026-07-02-data-modeling-workbench-design-review-rerun.md` 结论为 `approved-for-openapi-freeze`。 |
| OpenAPI 契约 | `docs/api/specs/data-modeling-workbench.yaml` 已标记 `stage: openapi-freeze`、`status: frozen`。 |
| ADR-0001 | DDL 仅草案，不执行迁移。 |
| ADR-0002 | 发布版本快照不可变。 |

## 3. 契约摘要

| 能力域 | 冻结契约 |
|---|---|
| 模型项目 | 列表、创建、详情、更新、归档；支持分页、筛选、排序、权限动作和 `draftVersion`。 |
| 模型对象 | 业务对象、逻辑实体、逻辑字段、物理表、物理字段的创建、更新和归档。 |
| Excel 导入 | 上传、预览、apply、cancel、模板下载和表头别名。 |
| 字段映射 | 字段映射列表、单条保存、批量保存、覆盖率摘要和未映射提示。 |
| 规范检查 | 规则集查询/更新、检查运行、检查结果和字段级定位。 |
| 模型评审 | 提交、详情、评论、审批；驳回后再次提交生成新 `reviewId`。 |
| 发布版本 | 发布检查、发布版本、版本历史、版本详情、从版本创建草稿。 |
| 异步导出 | SQL / Markdown / Excel 导出任务创建、查询、失败重试。 |
| 权限动作 | `PermissionSet`、`ActionPermission`、403 无数据泄露和禁用原因。 |
| 错误结构 | `ApiError`、`FieldError`、门禁错误码、冲突错误码和导出错误码。 |

## 4. Fresh Verification

本阶段执行的 fresh verification：

1. 标准 YAML 解析通过，根对象为 `openapi: 3.1.0`。
2. OpenAPI 规模：41 个 paths，102 个 schemas。
3. `$ref` 完整性：474 个 `$ref`，缺失 0 个。
4. 路径参数检查：缺失 0 个。
5. mutating 操作幂等覆盖：31 个 mutating 操作，缺失 0 个。
6. 发布请求检查：`publishNote` 和 `ddlDraftAcknowledged` 均 required；`ddlDraftAcknowledged.const=true`。
7. 快照字段检查：`ModelVersionSummary.snapshotChecksum`、`VersionSnapshot.snapshotSchemaVersion` 均存在并 required。
8. 安全路径检查：未发现 database connection、execute DDL、migration 类路径。
9. `git diff --check` 通过。

说明：当前本地环境未安装专门 OpenAPI validator 包，未执行标准 validator；已用 YAML、`$ref`、路径参数、幂等覆盖和安全路径脚本替代验证。实现前建议把标准 OpenAPI validator 纳入本地或 CI 验证。

## 5. 契约测试清单

契约测试清单独立记录在：

- `docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`

OpenAPI Freeze 后、进入实现前至少应覆盖：

1. OpenAPI 文档可被标准工具直接解析。
2. 所有 mutating command 缺少 `X-Idempotency-Key` 时失败。
3. `draftVersion` 冲突返回 409 且不覆盖他人修改。
4. 发布缺少 `ddlDraftAcknowledged: true` 时返回 422，不生成版本。
5. 驳回后再次提交生成新 `reviewId`，旧 review 保留 rejected。
6. 发布版本详情返回 `snapshotChecksum` 和 `snapshotSchemaVersion`。
7. 无查看权限返回 403 且不泄露业务数据。
8. OpenAPI 中不存在数据库连接、执行 DDL 或迁移端点。

## 6. ADR 与人工安全确认项

已接受 ADR：

| ADR | 决策 |
|---|---|
| `docs/adr/0001-data-modeling-workbench-ddl-draft-only.md` | 本系统只生成 PostgreSQL DDL 草案，不执行数据库迁移。 |
| `docs/adr/0002-data-modeling-workbench-immutable-version-snapshot.md` | 发布版本快照不可变，后续修改必须从版本创建草稿。 |

进入实现前需要人工确认或标记 `TODO-HUMAN-REVIEW` 的事项：

| 项 | 原因 | 门禁 |
|---|---|---|
| 认证 / 授权中间件 | 触碰 AGENTS 安全红线。 | 只能生成草案，需人工 review。 |
| 数据库迁移脚本 | 触碰 AGENTS 安全红线。 | 只能生成模板，需 DBA / 后端负责人 review。 |
| 原生 SQL / DDL 文本生成 | 触碰 AGENTS 安全红线，且存在误执行风险。 | DDL 生成器和 SQL 输出需人工 review。 |
| 下载 URL 权限与过期策略 | 导出资产可能泄露模型和字段信息。 | 实现前确认短期有效、权限绑定、下载审计。 |
| Excel 上传安全 | 存在超大文件、恶意文件和公式注入风险。 | 实现前确认文件大小、类型、行数、解析隔离和 Excel 公式防护。 |
| 审计保留策略 | 发布、审批、导出、越权需要追溯。 | 实现前确认保留期和不可由普通业务操作删除。 |

## 7. 非目标确认

以下能力不在 MVP API 冻结范围内：

1. 数据库直连采集。
2. 自动执行 DDL、数据库迁移或一键落库。
3. 完整血缘引擎、资产地图、指标平台、BI 语义层和调度编排。
4. 正式敏感分级体系。
5. 审计查询 API。
6. Oracle、Hive、Doris、ClickHouse、StarRocks 等多数据库 DDL 适配。

## 8. 下一阶段

下一阶段：Vertical slices / to-issues。

进入垂直切片前需要先处理：

1. 创建或选择正式 OpenSpec / Comet change。当前 `openspec list --json` 返回仓库尚未初始化 OpenSpec changes。
2. 基于冻结 API、PRD、交互说明、系统架构和数据架构拆分端到端垂直切片。
3. 每个切片必须包含 Adapter、Application、Domain、Infrastructure、前端交互、契约测试、权限/审计和 fresh verification。
4. 实现前通过 `yss-router` 选择最小 YSS 技能集。
