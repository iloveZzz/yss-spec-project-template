---
pipeline: data-modeling-workbench
stage: engineering-baseline-api-review
status: approved-for-architecture-design
owner: ai
reviewed_at: 2026-07-02
rereviewed_at: 2026-07-02
rereview_result: approved
source:
  - docs/api/specs/data-modeling-workbench.yaml
  - docs/requirements/2026-07-01-data-modeling-workbench-prd.md
  - docs/design/data-modeling-workbench-interaction-spec.md
  - .codex/skills/yss-ddd-scaffold-generator/references/yss-backend-scaffold-parent/SKILL.md
---

# 企业数据模型协作工作台 Engineering Baseline / API 契约评审

## 评审结论

复审结论：Approved for Architecture / OpenSpec / Comet design。

OpenAPI Draft 已完成阻断项修正。复审确认：模型对象管理、规范检查规则配置、YSS 分页响应包装、发布版本新建草稿变更入口均已进入契约；Draft 语法、引用、路径参数和 Redocly lint 均通过。当前可进入 Architecture / OpenSpec / Comet design，但仍需在后续设计阶段继续处理安全人工审查、契约测试落地和领域聚合边界。

## Re-Review Result (2026-07-02)

Approved。

| 原阻断项 | 关闭结论 | 修正内容 |
|---|---|---|
| B-001 模型对象管理契约不完整 | 已关闭 | 新增业务对象、逻辑实体、物理表、项目归档相关端点与 schema。 |
| B-002 规范检查规则配置契约缺失 | 已关闭 | 新增 `GET/PUT /api/v1/modeling/projects/{projectId}/validation-rules` 与规则配置 schema。 |
| B-003 分页响应包装与 YSS 工程基线不一致 | 已关闭 | 模型项目、字段映射、版本历史分页响应改为 `PageResult_*` 形态。 |
| B-004 发布版本只读后新建草稿变更入口缺失 | 已关闭 | 新增 `POST /api/v1/modeling/versions/{versionId}/drafts`。 |

## 验证记录

| 检查项 | 结果 |
|---|---|
| OpenAPI 3.1 YAML 解析 | 通过 |
| OpenAPI 规模 | 41 个 paths，102 个 schemas |
| `$ref` 解析 | 通过，126 个引用均可解析 |
| path 参数声明 | 通过 |
| Redocly lint | 通过 |
| `git diff --check` | 通过 |

## 原阻断项（已关闭）

| ID | 严重级别 | 问题 | 依据 | 影响 | 进入下一阶段前要求 |
|---|---|---|---|---|---|
| B-001 | P0 | 模型对象管理契约不完整。PRD 要求模型项目、主题域、业务对象、逻辑实体、物理表和字段维护；当前 Draft 只有对象树查询、逻辑字段、物理字段接口，缺少业务对象、逻辑实体、物理表的创建 / 更新 / 删除或归档契约，也缺少模型项目归档契约。 | PRD FR-001、FR-003、FR-005：`docs/requirements/2026-07-01-data-modeling-workbench-prd.md:66`、`:68`、`:70`；OpenAPI 影响：`:239`-`:241`；当前 Draft 仅有 `GET /object-tree`、`POST/PATCH logical-fields`、`POST/PATCH physical-fields`：`docs/api/specs/data-modeling-workbench.yaml:247`-`:408`。 | 架构设计无法确认 ModelProject、BusinessObject、LogicalEntity、PhysicalTable 等聚合边界和用例闭环；前端也无法完成“模型设计工作台”的对象维护。 | 补充业务对象、逻辑实体、物理表、项目归档等契约；或明确 P0 只支持预置/导入生成这些对象，并回写 PRD 与交互说明。 |
| B-002 | P0 | 规范检查“规则配置”契约缺失。PRD OpenAPI 影响明确包含规则配置，当前 Draft 只提供运行检查和查询检查结果。 | PRD OpenAPI 影响：`docs/requirements/2026-07-01-data-modeling-workbench-prd.md:243`；当前 Draft 只有 `POST /projects/{projectId}/validations` 和 `GET /validations/{validationRunId}`：`docs/api/specs/data-modeling-workbench.yaml:784`-`:843`。 | 无法定义哪些规则是 blocker / warning，也无法让数据架构师配置检查强度；后续领域服务和测试 seam 会缺失规则来源。 | 补充规则配置查询、更新、版本或模板契约，例如 validation-rules / validation-profiles；或明确规则配置 P0 固化不开放，并同步 PRD。 |
| B-003 | P0 | 分页响应包装与 YSS 工程基线不一致。YSS 基线要求单对象 `SingleResult<T>`、列表 `MultiResult<T>`、分页 `PageResult<T>`；当前 Draft 将分页结果包装成 `SingleResult<ModelProjectPage>` / `SingleResult<FieldMappingPage>` / `SingleResult<ModelVersionPage>`。 | YSS 基线：`.codex/skills/yss-ddd-scaffold-generator/references/yss-backend-scaffold-parent/SKILL.md:103`-`:110`；当前 Draft：`docs/api/specs/data-modeling-workbench.yaml:121`-`:125`、`:662`-`:666`、`:1048`-`:1052`。 | 后端统一响应、前端 Orval 类型、契约测试和既有 YSS 约定容易不一致；冻结后再改会牵动前后端。 | 定义并使用 `PageResult<T>` / `MultiResult<T>` 等 OpenAPI schema，或形成 ADR 明确本模块例外。 |
| B-004 | P1/P0 边界待定 | 已发布版本只读后“新建草稿变更入口”没有契约。PRD 验收要求打开已发布版本时提供新建草稿变更入口；当前 Draft 只有查询发布版本和导出，没有从版本创建新草稿或变更草稿的端点。 | PRD 验收：`docs/requirements/2026-07-01-data-modeling-workbench-prd.md:213`-`:215`；当前版本详情和导出：`docs/api/specs/data-modeling-workbench.yaml:1093`-`:1118`。 | 已发布版本不可变与后续修改流程无法闭环；前端只能展示入口但无法调用。 | 补充从版本创建草稿的契约，例如 `POST /api/v1/modeling/versions/{versionId}/drafts`，或明确 P0 不支持发布后再开草稿并更新验收标准。 |

## 非阻断建议

| ID | 建议 | 原因 |
|---|---|---|
| S-001 | 保留带 frontmatter 的文档资产时，另提供可被 Redocly / Orval / smart-doc 下游直接消费的纯 OpenAPI 输出，或沉淀统一剥离 frontmatter 的脚本。 | 当前 Draft 需要剥离 frontmatter 后才能直接进入通用 OpenAPI 工具链；这不阻断设计，但会影响 Freeze 后自动化。 |
| S-002 | 为 `ActionPermission` 增加更强约束或示例：当 `enabled=false` 时 `disabledReason` 必填；当 `visible=false` 时前端不得展示入口。 | 当前 schema 只有描述性约束，契约测试不容易自动判断权限状态。 |
| S-003 | 为主要 422 错误补充 examples：覆盖率低于 80%、发布 85% / P0 95% 不达标、模板缺列、目标表越界、PostgreSQL 类型不支持、阻断级检查问题。 | 便于前端 mock、错误态组件故事和契约测试。 |
| S-004 | 将导入任务和导出任务的状态轮询策略写清楚，例如建议返回 `retryAfterSeconds`、`progressPercent`、`failureReason`、`expiredAt`。 | 当前异步状态可表达，但前端重试、轮询和进度展示仍会靠约定。 |
| S-005 | 对关键变更接口要求 `X-Idempotency-Key` 必填，至少覆盖 apply import、submit review、review decision、publish、create export、retry export。 | 这些接口存在重复提交风险；目前 header 是 optional。 |
| S-006 | 对 `ApiError.fieldErrors` 区分模型级错误和字段级错误，可补充 `objectType`、`objectId`、`fieldPath` 和 `rowNo` 示例。 | 导入预览、规范检查、发布门禁的前端定位需要稳定结构。 |
| S-007 | 在架构设计中显式区分 Domain 内部状态枚举和 UI 查询状态枚举，避免 `ModelProjectStatus` 直接成为数据库状态机。 | OpenAPI 枚举适合前端展示，但领域状态需要描述转移规则、守卫条件和事件。 |

## 安全红线与人工审查点

| 范围 | 当前 Draft 状态 | 评审意见 |
|---|---|---|
| 认证 / 授权 | 使用 `bearerAuth`、`PermissionSet`、`ActionPermission` 和 403 错误。 | 只能作为草案；进入 OpenAPI Freeze 前需要人工确认角色、资源范围、越权拒绝和无权不泄露数据策略。 |
| DDL 草案 / SQL 文本 | Draft 明确“仅生成 PostgreSQL DDL 草案，不提供数据库连接或自动执行迁移端点”。 | 方向正确；后续架构设计必须继续禁止执行端点，并对下载 URL、审计日志、脱敏和过期策略做安全审查。 |
| SQL 原生查询 / 数据库迁移 | 当前没有自动执行 DDL 或迁移端点。 | 通过当前阶段安全边界；实现阶段仍需人工审查 SQL 生成和下载资产。 |
| 敏感字段分级 | 仅保留 `sensitiveFlag` 和 `classificationStatus`。 | 符合 P0 后置策略；后续不可把正式分级规则偷偷并入 P0。 |

## 工程基线评审

| 维度 | 结论 | 说明 |
|---|---|---|
| DDD 分层可落地性 | 有条件通过 | Draft 的业务能力足以识别初步聚合，但 B-001、B-002 会影响聚合和领域服务边界。 |
| Adapter 契约 | 有条件通过 | REST 路径整体清晰；需补响应包装基线和权限错误示例。 |
| Application 用例 | 有条件通过 | 导入、映射、检查、评审、发布、导出用例清楚；对象维护、规则配置、发布后新草稿用例缺失。 |
| Domain 边界 | 阻断 | 需要先明确 ModelProject、BusinessObject、LogicalEntity、PhysicalTable、Mapping、ValidationRule、Review、Version、ExportTask 的聚合关系。 |
| Infrastructure 风险 | 有条件通过 | Excel、文件导出、DDL 草案、数据库类型转换都属于 Infrastructure / Gateway；需要架构阶段定义隔离方式。 |
| 安全红线 | 有条件通过 | Draft 未越界，但认证授权、DDL 草案和 SQL 文本需要人工 review gate。 |

## API 契约评审矩阵

| 检查域 | 结论 | 说明 |
|---|---|---|
| 路径覆盖 | 阻断 | 主流程路径覆盖较好，但对象管理、规则配置、发布后新草稿缺失。 |
| Schema 完整性 | 有条件通过 | 语法和 `$ref` 通过；分页包装、权限条件、错误示例需增强。 |
| 错误结构 | 有条件通过 | 有 `ApiError`、`FieldError` 和关键错误码；需要更多门禁错误示例与字段定位。 |
| 权限动作 | 有条件通过 | `actions` 与 `permissions` 已有；需要条件约束和人工授权审查。 |
| 分页筛选排序 | 有条件通过 | 已覆盖模型项目、映射、版本历史；需与 YSS `PageResult<T>` 对齐。 |
| 乐观锁 | 有条件通过 | `draftVersion` 已覆盖主要草稿写入；发布后新草稿流程缺失。 |
| 前端可消费性 | 有条件通过 | 可生成大部分页面 mock；分页包装和错误 examples 会影响生成类型和组件故事。 |
| 后端可实现性 | 有条件通过 | 主流程可实现；对象维护、规则配置、响应包装需先定。 |
| 契约测试缺口 | 阻断 | 尚未形成契约测试清单；至少需要覆盖导入、覆盖率门禁、规则检查、评审、发布、导出、权限和乐观锁。 |

## 最小契约测试清单

进入 OpenAPI Freeze 前至少补齐以下契约测试场景：

1. 模型项目列表分页、筛选、排序返回 `PageResult` 兼容结构。
2. 无查看权限返回 403，且不返回模型项目、主题域、表和字段数据。
3. Excel 导入模板缺列、表头别名无法识别、重复字段、目标表越界、PostgreSQL 类型不支持。
4. 导入预览有 blocker 时 apply 被 422 阻断；warning 可带说明继续。
5. 覆盖率低于 80% 时提交评审被阻断。
6. 发布整体覆盖率低于 85% 或 P0 必填字段低于 95% 时发布被阻断。
7. 存在 blocker 级检查问题时提交评审 / 发布被阻断。
8. 非评审人调用评审结论接口返回 403。
9. `draftVersion` 冲突返回 409 + `VERSION_CONFLICT`，且不覆盖他人修改。
10. 发布成功生成不可变版本，版本详情只读。
11. 三类导出任务均返回 queued / running / succeeded / failed / expired 状态，并支持失败重试创建新 exportId。
12. PostgreSQL DDL 导出只返回草案文件或下载 URL，不存在执行数据库变更的端点。

## 进入 Architecture / OpenSpec / Comet Design 的条件

以下条件已满足，可进入架构 / OpenSpec / Comet design：

1. B-001 到 B-004 已修正。
2. 分页响应包装已使用 YSS `PageResult` 风格的 `PageResult_*` schema。
3. 规范检查规则配置的来源、状态和 blocker / warning 规则已在契约中可追溯。
4. 发布后新草稿变更入口的契约已确定。
5. 安全红线已转为架构设计中的人工审查项，包括认证授权、DDL 草案、SQL 文本、导出下载 URL 和审计日志。
6. 契约测试清单已纳入后续设计输入。

## 推荐下一步

进入 Architecture / OpenSpec / Comet design。设计阶段重点处理：

1. ModelProject、BusinessObject、LogicalEntity、PhysicalTable、Mapping、ValidationRule、Review、Version、ExportTask 的聚合边界。
2. Excel 导入、PostgreSQL DDL 草案生成、异步导出下载 URL 的 Gateway / Infrastructure 隔离方式。
3. 认证授权、DDL 草案、SQL 文本、下载资产、审计日志的人工安全审查点。
4. 契约测试清单到垂直切片的映射。
