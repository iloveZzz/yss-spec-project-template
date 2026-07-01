---
pipeline: data-modeling-workbench
stage: prd-calibration
status: approved-for-openapi-draft
owner: ai
source:
  - docs/requirements/2026-07-01-data-modeling-workbench-prd.md
  - docs/design/data-modeling-workbench-interaction-spec.md
  - docs/design/data-modeling-workbench-prototype-review.md
calibrated_at: 2026-07-02
---

# 企业数据模型协作工作台 PRD 校准与需求冻结记录

## 结论

Approved for OpenAPI Draft。

企业数据模型协作工作台 MVP 已完成 PRD 校准和需求冻结。页面地图、线框原型、状态矩阵和 OpenAPI 反推清单已经通过 `prototype-review` 复审；P0 范围、非目标范围、关键验收标准和安全边界已经可以作为 OpenAPI Draft 输入。

## 输入资产

| 资产 | 路径 | 状态 |
|---|---|---|
| PRD 基线 | `docs/requirements/2026-07-01-data-modeling-workbench-prd.md` | 已校准，状态更新为 `frozen-for-openapi-draft` |
| 交互说明 | `docs/design/data-modeling-workbench-interaction-spec.md` | 已通过复审 |
| 原型评审报告 | `docs/design/data-modeling-workbench-prototype-review.md` | 复审 Approved |
| GitHub Issue | #1 `PRD: 企业数据模型协作工作台 MVP` | 已同步校准后 PRD |

## 冻结范围

| 范围 | 冻结内容 |
|---|---|
| 顶层协作单元 | 工作台支持多个模型项目；“绩效风控指标模型复用”只是首个 P0 试点项目。 |
| 试点业务边界 | 主题域为“绩效风控”，首批子域为“产品绩效收益模型”，首批纳入已确认 8 张 P0 表。 |
| 核心闭环 | 项目 / 主题域边界、Excel 导入、逻辑模型、物理模型、字段映射、覆盖率、规范检查、单一架构师评审、版本发布、异步导出。 |
| 覆盖率门禁 | 提交评审整体覆盖率 80%；发布整体覆盖率 85%；P0 必填字段覆盖率 95%。 |
| 权限策略 | 页面无权不泄露数据；关键流程动作禁用并给原因；入口型动作可隐藏；后端兜底拒绝。 |
| Excel 导入 | 模型工具标准模板为规范模板，兼容现有公司 Excel 表头别名，无法识别时阻断并要求人工整理。 |
| 导出策略 | SQL、Markdown、Excel 三类交付资产统一异步导出，状态为 queued、running、succeeded、failed、expired。 |
| 数据库边界 | P0 只生成 PostgreSQL DDL 草案，不连接数据库，不自动执行迁移。 |

## 校准变更

1. PRD frontmatter 从 `stage: prd` / `status: draft` 更新为 `stage: prd-calibration` / `status: frozen-for-openapi-draft`。
2. PRD source 增加交互说明和原型评审报告，形成 Discovery -> PRD -> Prototype Review -> PRD Calibration 的追溯链。
3. 功能需求新增 FR-021：模型项目、字段映射和版本历史列表需要支持分页、筛选和排序。
4. OpenAPI 影响新增“查询排序”能力域，为后续 Draft 统一 `page`、`size`、`sort`、`direction` 参数命名。
5. 测试决策新增查询排序 seam，覆盖默认排序和显式排序参数。
6. PRD 新增“PRD 校准 / 需求冻结记录”，写明冻结范围和冻结后变更控制。

## OpenAPI Draft 输入

下一阶段创建 `docs/api/specs/data-modeling-workbench.yaml` 时，应至少覆盖以下能力域：

| 能力域 | Draft 要点 |
|---|---|
| 模型项目与主题域 | 项目分页、详情、创建、更新、负责人、主题域、子域、业务对象树。 |
| 导入 | Excel 上传、预览、应用、取消、模板下载、表头别名。 |
| 映射与覆盖率 | 字段映射列表、保存映射、覆盖率摘要、未映射字段和 P0 缺口。 |
| 规范检查 | 检查触发、检查结果、字段路径、阻断 / 警告 severity。 |
| 评审 | 提交评审、评审详情、评论、通过、驳回、再次提交。 |
| 发布与版本 | 发布检查、发布版本、历史版本、发布快照摘要。 |
| 异步导出 | 创建导出任务、查询任务、失败重试、下载地址、过期时间。 |
| 权限动作 | `actions[].visible`、`actions[].enabled`、`actions[].disabledReason`。 |
| 并发控制 | `draftVersion` 或乐观锁 token，冲突返回 `VERSION_CONFLICT`。 |

建议抽取复用 schema：

- `ActionPermission`
- `FieldError`
- `CoverageSummary`
- `ValidationIssue`
- `ExportTask`
- `DraftVersion`
- `PageResult`

## 非目标确认

以下内容保持非目标，不进入 P0 OpenAPI Draft：

1. 数据集成、ETL 编排、任务调度和运维监控。
2. 自动执行数据库迁移脚本。
3. 完整指标平台配置、指标发布和指标消费。
4. 完整血缘引擎、资产地图、BI 语义层和分析门户。
5. 多级审批、复杂工单流和企业级权限中台。
6. 数据库元数据直连采集。
7. AI 自动建模或自然语言问数。

## 后续动作

1. GitHub Issue #1 已更新为校准后的 PRD 内容。
2. 下一步创建 `docs/api/specs/data-modeling-workbench.yaml` OpenAPI Draft。
3. OpenAPI Draft 通过 API / 前后端 / 架构评审后，再进入工程基线和垂直切片拆分。
