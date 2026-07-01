---
pipeline: data-modeling-workbench
stage: design-review
status: approved-for-openapi-draft-remediation
owner: ai
created_at: 2026-07-02
source:
  - docs/requirements/2026-07-01-data-modeling-workbench-prd.md
  - docs/design/data-modeling-workbench-interaction-spec.md
  - docs/api/specs/data-modeling-workbench.yaml
  - docs/architecture/2026-07-02-data-modeling-workbench-architecture-design.md
  - docs/architecture/2026-07-02-data-modeling-workbench-data-architecture.md
---

# 企业数据模型协作工作台 MVP Design Review

> 本文用于 Design Review 阶段，重点审查数据架构与 PRD、交互设计、OpenAPI Draft、系统架构之间的一致性，并明确 OpenAPI Freeze 前需要回改的契约项。

## 1. 评审结论

结论：Design Review 条件通过，但暂不进入 OpenAPI Freeze。

通过原因：

1. PRD、交互设计、系统架构和数据架构对 MVP 主范围一致：多个模型项目、首个“绩效风控指标模型复用”试点项目、8 张试点表、Excel 导入、逻辑/物理模型、字段映射、覆盖率、规范检查、单一架构师评审、发布快照和三类异步导出。
2. 数据架构补齐了系统架构中需要落库和版本化的关键约束：草稿态归一化元数据、发布态不可变快照、字段映射覆盖率、规范检查运行、导入/导出任务、审计和 PostgreSQL 存储边界。
3. OpenAPI Draft 覆盖主路径和 P0 能力，去除文档 frontmatter 后可解析为 OpenAPI 3.1，包含 41 个路径、102 个 schema、473 个 `$ref`，未发现断引用。
4. 安全边界在 PRD、交互、架构和数据架构中一致：DDL 只生成 PostgreSQL 草案，不连接生产库，不执行数据库迁移，数据库迁移、原生 SQL、认证授权、下载 URL 和审计保留策略需人工审查。

暂缓 OpenAPI Freeze 的原因：存在 5 个 Freeze Blocker，均集中在 OpenAPI 可消费性和关键契约强约束上。关闭这些问题后，可进入 OpenAPI Freeze。

## 2. 输入资产完整性

| 资产 | 状态 | 评审意见 |
|---|---|---|
| PRD | 已冻结供 OpenAPI Draft 使用 | P0 范围、门禁、非目标和验收标准清晰。 |
| 交互说明 | 已通过原型评审 | 页面地图、主流程、异常流程、状态矩阵、权限策略和 OpenAPI 反推清单完整。 |
| OpenAPI Draft | Draft 可继续修正 | 主路径完整；需要在 Freeze 前修正机器可读性、幂等、DDL 确认、快照字段和评审再次提交策略。 |
| 系统架构 | 可进入 Design Review | 领域边界、聚合、状态机、YSS DDD 分层、Application 用例、Gateway/Repository 边界和安全审查点清晰。 |
| 数据架构 | 可进入 Design Review | 概念/逻辑/物理模型、元模型、版本快照、映射、检查、任务、审计、索引和迁移约束已补齐。 |

## 3. 一致性矩阵

| 主题 | PRD / 交互 | 系统架构 | 数据架构 | OpenAPI Draft | 评审结论 |
|---|---|---|---|---|---|
| 多模型项目 | PRD 明确工作台承载多个业务数据模型项目；交互第一页为模型工作台。 | `ModelProject` 为项目边界聚合根。 | `dmw_model_project` 为顶层元数据表。 | `/api/v1/modeling/projects` 覆盖列表、创建、详情、更新、归档。 | 一致。 |
| 试点边界 | PRD 固定首个项目、主题域、子域和 8 张表。 | `PilotTable` 和边界守卫防止越界。 | `dmw_pilot_table` 约束导入目标表。 | 项目详情、导入 apply、预览错误码覆盖越界。 | 一致。 |
| 逻辑/物理模型 | PRD 覆盖业务对象、逻辑字段、物理表、PostgreSQL 类型。 | `ModelObjectCatalog` 独立于项目聚合。 | 逻辑字段是覆盖率分母，物理字段用于 DDL 草案。 | 对象树、业务对象、逻辑实体、逻辑字段、物理表、物理字段路径齐全。 | 一致。 |
| 字段映射与覆盖率 | 80% 提交、85% 发布、P0 95% 发布门禁。 | `CoverageDomainService` 和评审/发布 Gate。 | 有效映射条件和覆盖率公式明确。 | mapping、coverage、review、publish-check 路径覆盖。 | 一致。 |
| 规范检查 | 命名、分层、类型、注释、敏感标记、待分级状态、映射完整性。 | `ValidationRuleSet` 和 `ValidationRun` 聚合。 | 检查运行不可变，绑定 `draftVersion + ruleSetVersion`。 | validation-rules、validations、ValidationIssue 覆盖。 | 一致。 |
| 单一架构师审批 | PRD 要求提交、评论、驳回、通过、再次提交。 | 再次提交策略待 Design Review 确定。 | 建议每次提交生成新 `reviewId`。 | 有提交评审接口，但未显式描述再次提交策略。 | Freeze 前需回改。 |
| 发布版本快照 | PRD 要求不可变发布快照和历史版本。 | `ModelVersion` 不可变，从版本创建草稿。 | 快照 payload、checksum、schema version 策略明确。 | 版本详情有 snapshot，但缺 `snapshotChecksum` / `snapshotSchemaVersion`。 | Freeze 前需回改。 |
| DDL 草案安全 | PRD 和交互明确只导出草案、不执行。 | 无执行端点，`DdlDraftGateway` 只生成文本。 | PostgreSQL 不存业务事实，不执行生产 DDL。 | 无执行端点，但发布请求未强制 `ddlDraftAcknowledged`。 | Freeze 前需回改。 |
| 异步导出 | SQL / Markdown / Excel 统一异步，失败可重试。 | `ExportTask` 绑定发布版本，重试新 exportId。 | `dmw_export_task` 和下载 URL 过期策略明确。 | export 创建、查询、重试路径覆盖。 | 一致；过期时间实现前确认即可。 |
| 权限与审计 | 无查看权限不泄露，动作禁用给原因，后端 403。 | `PermissionGateway`、`AuditLogGateway` 隔离。 | `dmw_audit_event` append-only。 | PermissionSet、actions、403、ApiError 覆盖；P0 无审计查询 API。 | 一致。 |
| 乐观锁与幂等 | 交互要求冲突提示和防重复提交。 | `draftVersion`、幂等键和审计为 Application 统一职责。 | `IdempotencyRecord` 明确关键命令防重复。 | `draftVersion` 覆盖较好；`X-Idempotency-Key` 为 optional。 | Freeze 前需回改。 |

## 4. Freeze Blockers

### DR-B1 OpenAPI 文件带 frontmatter，标准工具不可直接消费

- 位置：`docs/api/specs/data-modeling-workbench.yaml:1`
- 证据：文件第 1-11 行是生命周期 frontmatter，第 12 行才是 `openapi: 3.1.0`。标准 OpenAPI 工具通常要求根文档从 OpenAPI 对象开始。
- 影响：Orval、OpenAPI Generator、契约测试和后端校验工具可能无法直接读取 Draft。当前评审只能通过剥离 frontmatter 后解析。
- 回改建议：移除 YAML frontmatter，把生命周期信息改为 OpenAPI root 扩展字段，例如 `x-yss-lifecycle`，或放入单独 review/freeze 文档。
- 阻断范围：阻断 OpenAPI Freeze，不阻断 Design Review 结论。

### DR-B2 关键命令的幂等键仍为 optional

- 位置：`docs/api/specs/data-modeling-workbench.yaml:1780`
- 证据：`X-Idempotency-Key` 定义为 `required: false`。数据架构已明确关键命令需要幂等键，尤其是 apply import、submit review、decision、publish、create export、retry export。
- 影响：重复应用导入、重复提交评审、重复审批、重复发布、重复导出任务在契约层没有强约束，契约测试无法稳定断言防重行为。
- 回改建议：将 mutating command 使用的 `IdempotencyKey` 改为 required；如少数命令确实不需要幂等，拆分 `RequiredIdempotencyKey` 和 `OptionalIdempotencyKey` 两个参数。至少以下路径必须 required：
  - `POST /api/v1/modeling/imports/{importId}/apply`
  - `POST /api/v1/modeling/projects/{projectId}/reviews`
  - `POST /api/v1/modeling/reviews/{reviewId}/decision`
  - `POST /api/v1/modeling/projects/{projectId}/versions`
  - `POST /api/v1/modeling/versions/{versionId}/exports`
  - `POST /api/v1/modeling/exports/{exportId}/retry`
- 阻断范围：阻断 OpenAPI Freeze 和实现前契约测试。

### DR-B3 发布请求没有强制确认 DDL 仅为草案

- 位置：`docs/api/specs/data-modeling-workbench.yaml:3450`
- 证据：`CreateVersionRequest` 的 required 只有 `publishNote`，`ddlDraftAcknowledged` 虽然有 `const: true`，但不是必填。
- 影响：前端发布弹窗要求用户明确确认“DDL 仅为草案”，但 API 契约允许请求不携带该字段，无法证明发布动作完成了安全确认。
- 回改建议：将 `CreateVersionRequest` 第二段 allOf 的 required 改为 `[publishNote, ddlDraftAcknowledged]`；补充 422 错误示例，错误码可复用或新增 `DDL_DRAFT_ACK_REQUIRED`。
- 阻断范围：阻断 OpenAPI Freeze。

### DR-B4 版本快照缺少 schema version / checksum 契约

- 位置：`docs/api/specs/data-modeling-workbench.yaml:3489`、`docs/api/specs/data-modeling-workbench.yaml:3561`
- 证据：数据架构要求发布版本保存快照校验值，并对快照结构演进采用 `snapshotSchemaVersion`；当前 `ModelVersionSummary` 和 `VersionSnapshot` 均未暴露 `snapshotChecksum` 或 `snapshotSchemaVersion`。
- 影响：版本历史、导出任务、人工审计和未来快照结构迁移缺少稳定追溯字段。
- 回改建议：在 `ModelVersionSummary` 或 `ModelVersionDetail` 中增加 `snapshotChecksum`；在 `VersionSnapshot` 中增加并 required `snapshotSchemaVersion`。如列表性能考虑不想在 summary 暴露完整信息，至少在 detail 和 export task 创建响应中可追溯到 checksum。
- 阻断范围：阻断 OpenAPI Freeze。

### DR-B5 评审再次提交策略仍未固化到契约

- 位置：`docs/architecture/2026-07-02-data-modeling-workbench-architecture-design.md:191`、`docs/architecture/2026-07-02-data-modeling-workbench-data-architecture.md:293`
- 证据：PRD 要求“驳回后修改并再次提交”，系统架构仍保留“新 reviewId 或 review revision”两种可能，数据架构建议每次提交生成新 `reviewId`，OpenAPI 未显式说明。
- 影响：前端评审历史、后端状态机、审计追溯和契约测试会对“再次提交”产生不同理解。
- 回改建议：Design Review 确认 P0 策略为“每次提交生成新 `reviewId`，原 review 保留为 rejected 历史”；更新 PRD/系统架构描述和 OpenAPI `submitModelReview` description。可在 `SubmitReviewRequest` 增加可选 `resubmissionOfReviewId`，或仅由后端根据项目当前 rejected review 自动关联。
- 阻断范围：阻断 OpenAPI Freeze，不阻断 Design Review。

## 5. 非阻断建议

| ID | 建议 | 理由 | 时机 |
|---|---|---|---|
| DR-S1 | 写 ADR：DDL 仅草案、不执行迁移。 | 这是安全边界和产品边界的硬决策，未来很容易被“一键落库”需求挑战。 | OpenAPI Freeze 前。 |
| DR-S2 | 写 ADR：发布快照不可变，后续修改必须从版本创建草稿。 | 版本不可变影响数据模型、API、Repository 和导出追溯。 | OpenAPI Freeze 前或 to-issues 前。 |
| DR-S3 | 确认导出文件默认过期 7 天、导入预览默认保留 30 天。 | 数据架构已有默认建议，需产品/安全认可后进入实现。 | 实现前。 |
| DR-S4 | 保留 P0 无审计查询 API，但每个关键命令必须写审计事件。 | 审计是安全验收能力，不一定需要前台查询页。 | 每个垂直切片完成门禁。 |
| DR-S5 | 创建正式 OpenSpec / Comet active change。 | 系统架构已说明当前尚未创建正式 change，Freeze 后进入切片前应补齐变更承载。 | OpenAPI Freeze 后、to-issues 前。 |

## 6. OpenAPI 回改清单

| 优先级 | 回改项 | 目标文件 | 验收标准 |
|---|---|---|---|
| P0 | 移除 OpenAPI frontmatter 或迁移为 `x-yss-lifecycle`。 | `docs/api/specs/data-modeling-workbench.yaml` | 标准 YAML 解析时根对象直接包含 `openapi: 3.1.0`。 |
| P0 | 关键 mutating command 强制 `X-Idempotency-Key`。 | `docs/api/specs/data-modeling-workbench.yaml` | apply import、submit review、decision、publish、create export、retry export 的参数 required。 |
| P0 | 发布请求强制 `ddlDraftAcknowledged: true`。 | `docs/api/specs/data-modeling-workbench.yaml` | `CreateVersionRequest.required` 包含 `publishNote` 和 `ddlDraftAcknowledged`。 |
| P0 | 增加快照结构版本和校验字段。 | `docs/api/specs/data-modeling-workbench.yaml` | `VersionSnapshot` required `snapshotSchemaVersion`；版本详情或摘要含 `snapshotChecksum`。 |
| P0 | 固化再次提交策略。 | PRD / 架构 / OpenAPI | 明确 P0 每次提交生成新 `reviewId`，原 rejected review 保留。 |
| P1 | 增加导出过期时间默认值说明。 | OpenAPI / 架构 | `ExportTask.expiresAt` 默认策略和安全约束明确。 |
| P1 | 增加发布快照和 DDL 安全 ADR。 | `docs/adr/` | ADR 被 Design Review 或 Freeze 文档引用。 |

## 7. 契约测试清单

OpenAPI Freeze 后、实现前至少补齐以下契约测试 seam：

1. OpenAPI 文档可被标准工具直接解析，不需要剥离 frontmatter。
2. 所有关键 mutating command 缺少 `X-Idempotency-Key` 时返回 400 或契约层校验失败。
3. 发布请求缺少 `ddlDraftAcknowledged: true` 时返回 422，不生成版本。
4. 发布版本详情返回 `snapshotSchemaVersion` 和 `snapshotChecksum`，导出任务绑定该发布快照。
5. 驳回后再次提交生成新的 `reviewId`，旧 review 保持 rejected，不被覆盖。
6. 无查看权限返回 403 且不泄露项目、主题域、表和字段数据。
7. 低于 80% 覆盖率提交评审、低于 85% / 95% 发布均返回对应错误码。
8. 存在 blocker 级规范问题时提交评审或发布返回 `VALIDATION_BLOCKING_ISSUES`。
9. 草稿 `draftVersion` 冲突返回 409，不覆盖他人修改。
10. OpenAPI 中不存在数据库连接、执行 DDL 或数据库迁移端点。

## 8. 安全审查结论

| 安全项 | 结论 | 后续门禁 |
|---|---|---|
| 认证 / 授权 | 设计一致，但实现涉及认证/授权中间件，按 AGENTS 红线只能生成草案并需人工 review。 | 实现前人工确认。 |
| DDL 草案 | 产品、交互、架构、数据架构一致要求只生成草案。 | 写 ADR；OpenAPI 发布请求强制 `ddlDraftAcknowledged`。 |
| SQL 文本生成 | 只能从结构化物理模型生成 PostgreSQL DDL 草案，不接受用户自由 SQL。 | DDL 生成器代码和 SQL 文本人工 review。 |
| 数据库迁移 | 不在本系统内执行迁移，不生成可执行迁移脚本。 | 所有迁移脚本标记 `TODO-HUMAN-REVIEW`。 |
| 文件上传 | Excel 导入需要大小、类型、行数、公式注入防护。 | Excel Gateway 实现前列入安全测试。 |
| 下载 URL | 下载 URL 短期有效、权限绑定、下载审计。 | Export slice 必须验证。 |
| 审计 | 审计事件 append-only，P0 无审计查询 API 可接受。 | 每个关键 command 完成门禁包含审计记录。 |

## 9. 是否可进入下一阶段

| 下一阶段 | 结论 | 条件 |
|---|---|---|
| OpenAPI Draft remediation | 可以进入 | 关闭 DR-B1 至 DR-B5。 |
| OpenAPI Freeze | 暂不进入 | OpenAPI 回改完成，契约测试清单更新，ADR 或人工安全确认记录补齐。 |
| Vertical slices / to-issues | 暂不进入 | 必须先 OpenAPI Freeze。 |
| YSS frontend/backend implementation | 暂不进入 | 必须先 OpenAPI Freeze、垂直切片、`yss-router` 技能路由和 TDD 计划。 |

## 10. Design Review 通过条件

本次 Design Review 可视为通过，但进入 OpenAPI Freeze 前必须满足：

1. DR-B1 至 DR-B5 已在 OpenAPI Draft 或上游文档中关闭。
2. OpenAPI 可被标准解析器直接读取，且 `$ref` 完整。
3. 发布、评审、导入、导出等关键命令具备幂等和乐观锁契约。
4. DDL 草案安全确认成为发布请求必填契约。
5. 版本快照具备 schema version 和 checksum，支持不可变追溯。
6. 再次提交评审采用“新 `reviewId`”策略，并进入契约描述和测试。
7. 安全人工审查项已登记，特别是认证授权、DDL 草案、SQL 文本、文件上传、下载 URL、审计和迁移约束。

## 11. 验证记录

本次评审执行的只读验证：

1. 读取 PRD、交互说明、系统架构、数据架构和 OpenAPI Draft。
2. 去除 OpenAPI frontmatter 后解析成功：OpenAPI 3.1.0，41 个路径，102 个 schema。
3. `$ref` 完整性检查：473 个 `$ref`，缺失 0 个。
4. 定位关键契约缺口：frontmatter、`X-Idempotency-Key` optional、`ddlDraftAcknowledged` 非 required、快照 schema/checksum 缺失、评审再次提交策略未固化。
