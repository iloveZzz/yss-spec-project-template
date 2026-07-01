---
pipeline: data-modeling-workbench
stage: prototype-review
status: approved-for-prd-calibration
owner: ai
source:
  - docs/design/data-modeling-workbench-interaction-spec.md
  - docs/requirements/2026-07-01-data-modeling-workbench-prd.md
reviewed_at: 2026-07-01
resolved_at: 2026-07-02
rereviewed_at: 2026-07-02
rereview_result: approved
---

# 企业数据模型协作工作台原型评审报告

> 评审采用 fail-closed。结论为阻断时，不进入 PRD 校准、OpenAPI Draft 或垂直切片拆分；先回到产品设计阶段补齐阻断决策。

## Re-Review Result (2026-07-02)

Approved。

本次复审聚焦页面地图、Markdown 低保真线框、状态矩阵和 OpenAPI 反推清单。2026-07-01 原评审的 4 个阻断项已在交互说明和 PRD 中补齐，当前设计资产足以驱动 PRD 校准、前端组件故事拆分和 OpenAPI Draft。

## Re-Review Gate Checklist

| 门禁项 | 是否通过 | 复审意见 |
|---|---|---|
| 页面地图覆盖所有入口、出口和主要页面 | 通过 | 已覆盖模型工作台、项目详情、导入向导、模型设计工作台、字段 / 映射抽屉、规范检查面板、评审页、发布弹窗、版本历史与导出中心。 |
| 线框覆盖主要工作页面和弹窗 / 抽屉 | 通过 | Markdown 低保真原型已覆盖工作台、项目详情、导入、设计、字段编辑、映射编辑、评审、发布和导出。 |
| 主流程从开始到完成清楚 | 通过 | 已覆盖进入工作台、确认试点边界、导入 Excel、生成物理草稿、维护逻辑 / 物理 / 映射、检查、评审、发布、导出。 |
| 异常流程覆盖取消、重试、校验失败、权限失败和并发冲突 | 通过 | 第 4.3 节补齐导入、抽屉、提交评审、驳回、发布、异步导出和草稿冲突的恢复行为。 |
| 状态矩阵覆盖 loading、empty、error、no-permission、readonly、disabled、conflict、dirty-form | 通过 | 第 7 节已覆盖工作台、项目详情、导入、模型设计、评审、发布、版本历史和导出任务状态。 |
| 权限行为能区分隐藏、禁用和调用后拒绝 | 通过 | 第 6.6 节明确页面无权不泄露数据、关键流程动作禁用并给原因、入口型动作可隐藏、后端兜底 403。 |
| 可见字段、筛选、分页、表单、抽屉、弹窗和操作按钮已列出 | 通过 | 页面细节和线框已列出主要字段、筛选、表格、表单、抽屉、弹窗和动作。排序字段仍建议在 PRD 校准 / OpenAPI Draft 中补充为非阻断项。 |
| 校验错误能区分模型级和字段级展示位置 | 通过 | 已覆盖顶部阻断、导入行级错误、字段路径错误、检查面板、发布门禁和异步导出错误。 |
| 能从界面需求反推出 OpenAPI Draft | 通过 | 已列出项目、对象树、导入、映射、覆盖率、检查、评审、发布、版本、导出、权限和错误码路径。 |
| 前端验收、组件故事和 mock 数据方向明确 | 通过 | 第 10 节和 PRD 测试 seam 足以拆出组件故事和 E2E 路径；mock 数据集仍作为非阻断建议。 |
| 安全红线已标记人工审查 | 通过 | DDL 草案、不自动执行数据库迁移、授权、原生 SQL、敏感分级后置均已标记。 |

## Review Result

Approved。

### Blocking Findings

- 无。

### Non-Blocking Suggestions

- PRD 校准或 OpenAPI Draft 时补充模型工作台、映射表格、版本历史的默认排序与可排序字段，建议至少包含最近更新时间、状态、整体覆盖率、P0 覆盖率、阻断问题数、发布时间。
- 组件故事阶段准备最小 mock 数据集：3 个模型项目、1 个试点项目、8 张试点表、覆盖率 78% / 86% / 96% 三组状态、导入错误样例、评审驳回样例、导出失败样例。
- OpenAPI Draft 中将 `actions`、`fieldErrors`、`coverageSummary`、`exportTask`、`draftVersion` 抽成可复用 schema。

### OpenAPI Draft Readiness

Ready after PRD calibration。

可直接用于 Draft 的接口范围：

- `GET /api/v1/modeling/projects`
- `GET /api/v1/modeling/projects/{projectId}`
- `POST /api/v1/modeling/projects`
- `PATCH /api/v1/modeling/projects/{projectId}`
- `GET /api/v1/modeling/projects/{projectId}/object-tree`
- `POST /api/v1/modeling/imports`
- `GET /api/v1/modeling/imports/{importId}/preview`
- `POST /api/v1/modeling/imports/{importId}/apply`
- `POST /api/v1/modeling/imports/{importId}/cancel`
- `GET /api/v1/modeling/import-templates/excel`
- `GET /api/v1/modeling/import-templates/excel/aliases`
- `GET /api/v1/modeling/projects/{projectId}/mappings`
- `PUT /api/v1/modeling/mappings/{mappingId}` 或批量保存接口
- `GET /api/v1/modeling/projects/{projectId}/coverage`
- `POST /api/v1/modeling/projects/{projectId}/validations`
- `GET /api/v1/modeling/validations/{validationRunId}`
- `POST /api/v1/modeling/projects/{projectId}/reviews`
- `GET /api/v1/modeling/reviews/{reviewId}`
- `POST /api/v1/modeling/reviews/{reviewId}/decision`
- `POST /api/v1/modeling/projects/{projectId}/publish-check`
- `POST /api/v1/modeling/projects/{projectId}/versions`
- `GET /api/v1/modeling/projects/{projectId}/versions`
- `POST /api/v1/modeling/versions/{versionId}/exports`
- `GET /api/v1/modeling/exports/{exportId}`
- `POST /api/v1/modeling/exports/{exportId}/retry`

Draft 注意事项：

- 列表接口补充 `sort`、`direction` 或等价排序参数。
- 详情和列表返回 `actions[].visible`、`actions[].enabled`、`actions[].disabledReason`。
- 所有写操作携带 `draftVersion` 或乐观锁 token。
- 错误包装需要支持 `code`、`message`、`fieldErrors[].path`、`severity`、`suggestion`。
- 导出任务统一 `queued`、`running`、`succeeded`、`failed`、`expired`。

### PRD Calibration Readiness

Ready。

PRD 校准时需要把以下内容作为冻结项确认：

- 权限策略：页面无权不泄露数据、关键流程动作禁用并给原因、入口型动作可隐藏、后端兜底 403。
- Excel 策略：模型工具标准模板为规范模板，兼容现有公司 Excel 表头别名，无法识别时阻断。
- 导出策略：SQL、Markdown、Excel 统一异步导出。
- 流程恢复：导入、抽屉、评审、发布、导出、草稿冲突的取消 / 返回 / 重试 / 保留规则。
- 覆盖率口径：整体覆盖率和 P0 覆盖率按逻辑字段有效映射计算。

### Frontend Prototype Readiness

Ready for component-story-prototype。

建议下一步组件故事覆盖：

- 模型工作台：加载、空数据、筛选空、无权限、列表错误、低覆盖率项目。
- 模型项目详情：边界完整、边界不完整、已发布只读、首批 8 张表分批导入。
- 导入向导：上传中、模板不匹配、重复字段、类型警告、取消导入、生成草稿成功。
- 模型设计工作台：未映射、P0 缺口、阻断问题、字段级错误、并发冲突、脏表单离开。
- 模型评审页：待评审、非评审人只读、驳回待修改、通过评审。
- 发布与导出：门禁失败、发布中、发布失败、发布成功、导出生成中、导出失败重试、导出过期、DDL 草案预览。

### Next Action

- PRD 校准 / 需求冻结已完成。
- 下一步创建 `docs/api/specs/data-modeling-workbench.yaml` OpenAPI Draft。
- 并行准备 `component-story-prototype` 和 mock 数据集。

## Review Result (2026-07-01)

Blocked。

当前交互说明已经具备页面地图、主流程、低保真线框、状态矩阵、OpenAPI 反推清单和 PRD 回填记录，方向正确，且足以支撑一次有质量的产品评审。但仍有 4 类阻断决策未冻结，会直接影响权限态、导入契约、导出契约和前端验收，因此暂不建议进入 PRD 校准。

## 评审输入

| 输入 | 路径 / 链接 | 是否具备 | 评审意见 |
|---|---|---|---|
| PRD | `docs/requirements/2026-07-01-data-modeling-workbench-prd.md` | 是 | 已覆盖 MVP 目标、用户故事、功能需求、验收标准、非目标和安全红线。 |
| 交互说明 | `docs/design/data-modeling-workbench-interaction-spec.md` | 是 | 已覆盖竞品参考、页面地图、用户流程、线框、状态矩阵和 OpenAPI 反推。 |
| 原型 / 线框图 | `docs/design/data-modeling-workbench-interaction-spec.md` 第 5 节 | 是 | Markdown 低保真足以评审主干流程。 |
| 状态矩阵 | `docs/design/data-modeling-workbench-interaction-spec.md` 第 7 节 | 是 | 覆盖 loading、empty、error、readonly、no-permission、conflict、dirty-form 等主要状态。 |
| 现有 API 草案 | `docs/api/specs/data-modeling-workbench.yaml` | 否 | 现阶段可选；需要评审通过后再创建 OpenAPI Draft。 |

## 门禁清单

| 门禁项 | 是否通过 | 发现的问题 |
|---|---|---|
| 页面地图覆盖所有入口、出口和主要页面 | 通过 | 已覆盖模型工作台、项目详情、导入向导、设计工作台、字段 / 映射抽屉、检查面板、评审页、发布弹窗、版本历史与导出中心。 |
| 主流程从开始到完成是清楚的 | 部分通过 | 主干闭环清楚，但导入向导、抽屉编辑、评审 / 发布、导出失败后的取消、返回、保留草稿、放弃修改和重试规则还不够明确。 |
| 异常流程覆盖取消、重试、校验失败、权限失败和并发冲突 | 部分通过 | 校验失败、权限失败、并发冲突已覆盖；取消 / 返回 / 重试的恢复行为需要补齐。 |
| 状态矩阵覆盖 loading、empty、error、no-permission、readonly、disabled、conflict、dirty-form | 部分通过 | 状态类型基本覆盖；无权限操作到底隐藏、禁用还是调用后拒绝尚未冻结。 |
| 可见字段、筛选、排序、分页、表单、抽屉、弹窗和操作按钮已列出 | 部分通过 | 可见字段、筛选、分页、表单、抽屉、弹窗和操作按钮已列出；列表排序字段和默认排序缺失。 |
| 权限行为能区分隐藏、禁用和调用后拒绝 | 原始评审不通过，已复审通过 | 2026-07-01 原评审发现权限策略未冻结；2026-07-02 已在交互说明第 6.6 节补齐并复审通过。 |
| 校验错误能区分模型级和字段级展示位置 | 通过 | 已区分顶部阻断、导入行级错误、字段路径错误、右侧检查面板和发布弹窗门禁。 |
| 能从界面需求反推出 OpenAPI Draft | 部分通过 | 路径和能力域清楚；权限策略、导入模板来源、导出同步 / 异步会影响 API 形态，需先冻结。 |
| 前端验收、Storybook / Histoire 或 mock 数据需要已明确 | 部分通过 | 前端验收方向已列出；组件故事、mock 数据集和 E2E 分支还需在评审通过后细化。 |
| 安全红线已标记人工审查 | 通过 | DDL 草案、数据库迁移、认证 / 授权、原生 SQL、敏感分级均已标记人工审查或后置。 |

## Original Blocking Findings (2026-07-01)

1. 权限交互策略未冻结，阻断 PRD 校准和 OpenAPI Draft。

   交互说明一方面要求返回 `actions / permissions`，另一方面在原评审时尚未区分页面级无查看权限、可见但不可操作、调用后 403 三类行为的适用场景，导致前端状态、API 权限字段和验收标准无法一致。

2. Excel 导入模板策略未冻结，阻断导入契约。

   PRD 确认现有公司级字段标准、命名词典和码表资产形态为 Excel，交互说明又提供下载模板入口，但仍未确定“模型工具自定义模板”还是“直接兼容现有字段标准 Excel”。这会影响必填列、字段映射、模板下载接口、导入预览错误结构和验收用例。

3. 导出同步 / 异步策略未冻结，阻断导出契约和前端状态。

   交互说明的 OpenAPI 反推已经倾向 `POST exports` + `GET export task` 的异步模型，但原评审时导出契约仍存在同步 / 异步双轨风险。需要统一为一个 P0 行为，建议采用异步任务作为唯一交互契约，避免前端和 API 同时兼容两套模式。

4. 取消、返回、重试和草稿保留规则不完整，阻断前端验收。

   主流程闭环完整，但导入向导、字段编辑抽屉、映射编辑抽屉、发布确认、导出失败、并发冲突后的“上一步 / 取消 / 放弃本地修改 / 保存草稿 / 重试”规则还没有形成可执行验收标准。需要补齐每类中断后是否保留临时数据、是否产生草稿版本、是否需要二次确认。

## Blocking Findings Resolution

> 2026-07-02 已处理 4 个阻断项并重新执行 `prototype-review` 复审。原评审结论仍保留为历史结论；当前状态为复审通过。

| 阻断项 | 处理结果 | 已更新资产 |
|---|---|---|
| 权限交互策略未冻结 | 已冻结为“页面无权不泄露数据、关键流程动作禁用并给原因、入口型动作可隐藏、后端兜底拒绝”。 | `docs/design/data-modeling-workbench-interaction-spec.md` 第 6.6、8.1、10、11 节；`docs/requirements/2026-07-01-data-modeling-workbench-prd.md` FR-019、验收标准、实施决策、测试决策。 |
| Excel 导入模板策略未冻结 | 已冻结为“模型工具标准模板为唯一规范模板，同时兼容现有公司 Excel 表头别名；无法识别时阻断并要求人工整理”。 | `docs/design/data-modeling-workbench-interaction-spec.md` 第 6.7、8.3、8.6、9、11 节；`docs/requirements/2026-07-01-data-modeling-workbench-prd.md` 导入验收标准、实施决策、测试决策、风险缓解。 |
| 导出同步 / 异步策略未冻结 | 已冻结为“SQL、Markdown、Excel 三类交付资产统一异步导出”。 | `docs/design/data-modeling-workbench-interaction-spec.md` 第 6.8、7、8.5、8.6、9、11 节；`docs/requirements/2026-07-01-data-modeling-workbench-prd.md` 解决方案、验收标准、OpenAPI 影响、实施决策、测试决策。 |
| 取消、返回、重试和草稿保留规则不完整 | 已补齐导入、字段 / 映射抽屉、提交评审、评审驳回、发布、异步导出、草稿冲突的恢复行为。 | `docs/design/data-modeling-workbench-interaction-spec.md` 第 4.3、7 节；`docs/requirements/2026-07-01-data-modeling-workbench-prd.md` FR-020、验收标准、实施决策、测试决策。 |

复审判断：上述阻断项已具备复审输入。2026-07-02 已复审通过，可进入 PRD 校准 / 需求冻结。

## Non-Blocking Suggestions

1. 补充模型工作台和映射表格的默认排序与可排序字段，例如最近更新时间、状态、整体覆盖率、P0 覆盖率、阻断问题数。
2. 在交互说明中固定试点项目展示名，建议统一使用“绩效风控指标模型复用”，避免与“风险绩效指标模型”等口径混用。
3. 为后续 `component-story-prototype` 准备最小 mock 数据集：3 个模型项目、1 个试点项目、8 张试点表、覆盖率 78% / 86% / 96% 三组状态、导入错误样例、评审驳回样例。
4. 补充模型项目状态枚举和版本状态枚举，例如规划中、草稿、待评审、驳回待修改、评审通过、已发布、已归档。
5. 发布弹窗的 DDL 草案提示建议同时出现在导出结果页和 SQL 预览顶部，防止用户只看导出页面时忽略“不自动执行”的安全边界。

## OpenAPI Draft Readiness

原评审为暂不就绪。2026-07-02 已处理权限、Excel 导入模板、异步导出和流程恢复 4 个阻断项，并已复审通过；PRD 校准后可进入 `docs/api/specs/data-modeling-workbench.yaml` Draft。

已具备的 API 输入：

- 模型项目分页、详情、创建、更新和对象树。
- Excel 上传、导入预览、生成草稿和模板下载。
- 字段映射、覆盖率摘要、规则检查和检查结果。
- 提交评审、评审详情、评审结论。
- 发布检查、发布版本、版本历史、导出资产和导出任务查询。
- 标准错误码、字段级错误路径、覆盖率门禁和冲突码。

OpenAPI Draft 前已补齐的关键决策：

- `actions / permissions` 的字段结构，以及隐藏、禁用、后端拒绝三类策略。
- Excel 模板来源、必填列、兼容规则和错误明细结构。
- 导出任务统一异步，以及 `exportStatus`、下载地址、失败重试、过期时间字段。
- 草稿并发控制字段，至少明确 `draftVersion` / `optimistic token` 的请求与错误响应。
- 分页、筛选、排序的统一参数命名。

## PRD Calibration Readiness

原评审为暂不就绪。2026-07-02 已将阻断项回填到 PRD 和交互说明，并已复审通过；当前可进入 PRD 校准。

已补齐的 PRD 校准条件：

1. 明确权限策略：页面无查看权限、可见不可操作、调用后拒绝分别适用于哪些页面和动作。
2. 明确 Excel 导入模板策略：P0 是平台模板、兼容现有 Excel，还是两者都支持；同时列出必填列和错误类型。
3. 明确导出策略：P0 统一异步任务或同步下载；若选择异步，PRD 增加生成中、成功、失败、可重试、下载过期状态。
4. 补齐流程恢复规则：导入、抽屉编辑、评审、发布、导出、并发冲突的取消 / 返回 / 重试 / 保存草稿行为。
5. 将覆盖率计算口径回填 PRD：整体覆盖率 = 已有效映射的范围内逻辑字段数 / 范围内逻辑字段总数；P0 覆盖率按 P0 必填逻辑字段计算。
6. 将已发布版本只读和新建草稿变更回填 PRD，并补充非评审人打开评审页时的只读 / 禁用验收标准。

## Frontend Prototype Readiness

低保真评审已具备，组件级原型暂不就绪。

评审通过后建议进入 `component-story-prototype` 或等价组件故事阶段，至少准备以下故事：

1. 模型工作台：加载、空数据、筛选空、无权限、列表错误、低覆盖率项目。
2. 模型项目详情：边界完整、边界不完整、已发布只读、首批 8 张表分批导入。
3. 导入向导：上传中、模板不匹配、重复字段、类型警告、生成草稿成功。
4. 模型设计工作台：未映射、P0 缺口、阻断问题、字段级错误、并发冲突、脏表单离开。
5. 模型评审页：待评审、非评审人只读、驳回待修改、通过评审。
6. 发布与导出：门禁失败、发布中、发布成功、导出生成中、导出失败重试、DDL 草案预览。

## PRD 回填项

| 回填项 | 来源 | 状态 | 说明 |
|---|---|---|---|
| 覆盖率计算口径 | 交互说明第 9 节 | 已回填 | 已写入 PRD 解决方案、验收标准和测试决策。 |
| Excel 导入模板约束 | 交互说明第 9 节和第 11 节 | 复审通过 | 已明确标准模板、表头别名、必填列、缺列、目标表越界和错误类型。 |
| 导出任务状态 | 交互说明第 7 / 9 / 11 节 | 复审通过 | 已统一异步导出，并补充 queued、running、succeeded、failed、expired。 |
| 多模型项目顶层结构 | PRD 问题陈述 / 解决方案已覆盖 | 基本完成 | PRD 已覆盖，校准时只需检查术语一致性。 |
| 项目 / 主题域边界字段 | PRD FR-001 和交互说明第 6 节 | 部分完成 | 建议补齐验收标准中的字段级必填规则。 |
| 已发布版本只读和新建草稿 | 交互说明状态矩阵 | 已回填 | 已补充已发布版本只读和新建草稿变更验收标准。 |
| 非评审人打开评审页 | 交互说明状态矩阵 | 复审通过 | 已明确非评审人可查看有权内容、审批按钮禁用并展示原因。 |
| DDL 草案安全边界 | PRD 已覆盖 | 已确认 | OpenAPI Draft 需要继续保证无执行端点。 |

## Next Action

本次复审已通过，PRD 校准 / 需求冻结已完成。下一步创建 `docs/api/specs/data-modeling-workbench.yaml` OpenAPI Draft。
