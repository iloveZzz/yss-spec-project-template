---
status: active
owner: ai
---

# 产品研发生命周期产物映射表

本文是本仓库产品研发流程的权威索引。日常执行使用 9 个主阶段；21 个门禁 / 职责点用于审查、路由和补齐缺失资产。小需求、Bug、局部样式或配置调整不重跑完整流程，只从最早受影响资产开始补齐下游门禁。

## 9 个主阶段

| 主阶段 | 目标 | 必须产物 | 条件产物 | 下一门禁 |
|---|---|---|---|---|
| 1. 入口分诊 | 判断任务类型、风险等级、最近可信阶段和最小技能集 | 分诊结论或 issue / change 备注 | `yss-product-lifecycle` 路由结果、Git checkpoint 判断 | 是否需要机会 / PRD / API / 架构 / Comet |
| 2. 机会与 Discovery | 收敛用户、痛点、为什么现在做、MVP、非目标和成功标准 | `docs/discovery/<feature>-discovery.md` 或等价说明 | 竞品矩阵、市场分析、用户痛点文档 | 是否足以进入业务架构和 PRD |
| 3. 业务 / PRD / 功能架构 | 明确产品边界、用户旅程、功能域、模块边界、优先级和验收标准 | `docs/requirements/<feature>-prd.md` | 业务架构、功能架构、CONTEXT 术语回填 | PRD Review / 产品设计准备度 |
| 4. 产品设计与需求冻结 | 对 UI、页面流、状态矩阵、异常路径和 PRD 回填做闭环 | 有 UI 时：交互说明和原型评审结论；无 UI 时：需求冻结记录 | 状态矩阵、页面地图、原型链接 | PRD 校准 / OpenAPI Draft 准备度 |
| 5. API Draft 与工程基线 | 形成可评审接口草案，并确认 YSS DDD / 工程约束 | API 影响结论；有 API 时：`docs/api/specs/<feature>.yaml` Draft | OpenAPI Draft Review、工程基线审查 | 系统 / 数据架构准备度 |
| 6. 系统 / 数据架构与设计审查 | 收束服务边界、部署、集成、NFR、数据模型、版本、血缘和回滚策略 | 系统概要设计或等价架构记录；Design Review 结论 | 数据架构、ADR、架构图 | OpenAPI Freeze 准备度 |
| 7. 契约冻结与 OpenSpec / Comet | 冻结契约并创建或选择正式 change 作为交付锚点 | OpenAPI Freeze 记录或无 API 影响记录；active OpenSpec / Comet change | `.comet.yaml`、proposal、design、tasks、delta spec | 垂直切片准备度 |
| 8. 垂直切片与 TDD 实现 | 将冻结范围拆成端到端切片并按 TDD 实现 | 垂直切片 Issue、实现计划、测试 / 验证记录 | YSS skill routing、代码审查报告、清理简化记录 | Fresh verification / Release Review |
| 9. 验证发布与复盘 | 保留发布、实施、验证和经验沉淀证据 | fresh verification、发布说明、复盘记录 | 实施记录、用户手册、AGENTS / CONTEXT / ADR 更新 | 下一轮规划 |

## 21 个门禁 / 职责点映射

| 原职责点 | 归属主阶段 | 产物要求 | 是否必需 |
|---|---|---|---|
| 0. 入口分诊 | 1. 入口分诊 | 分诊结论、最小技能集、最近可信阶段 | 必需 |
| 1. 机会探索 | 2. 机会与 Discovery | 机会输入、MVP 边界、非目标范围 | 新产品 / 新模块必需 |
| 2. 业务架构 | 3. 业务 / PRD / 功能架构 | 业务架构或 PRD 中等价章节 | 新产品 / 新业务域必需 |
| 3. 需求澄清 | 3. 业务 / PRD / 功能架构 | `grill-with-docs` 结论或等价澄清记录 | 新功能 / 较大改动必需 |
| 4. 需求基线 / 功能架构 | 3. 业务 / PRD / 功能架构 | PRD、功能域、模块边界、验收标准 | 新功能 / 较大改动必需 |
| 5. 页面 / 原型 / 交互设计 | 4. 产品设计与需求冻结 | 交互说明、页面清单、状态矩阵 | 有 UI 时必需 |
| 6. 原型评审 | 4. 产品设计与需求冻结 | Prototype Review 结论 | 有 UI 时必需 |
| 7. PRD 校准 / 需求冻结 | 4. 产品设计与需求冻结 | 需求冻结记录或校准后的 PRD | 必需；无 UI 可轻量化 |
| 8. 契约草案 | 5. API Draft 与工程基线 | OpenAPI Draft 或无 API 影响记录 | 有 API 影响时必需 |
| 9. 工程基线 | 5. API Draft 与工程基线 | 工程基线 / YSS DDD Review | 新服务 / 新模块 / 后端结构变化时必需 |
| 10. 系统总体架构 / 方案设计 | 6. 系统 / 数据架构与设计审查 | 系统概要设计、ADR 候选 | 服务边界、集成、NFR、运维变化时必需 |
| 11. 数据架构 / 元模型设计 | 6. 系统 / 数据架构与设计审查 | 数据架构 | 持久化、元数据、版本、血缘、查询 / 搜索变化时必需 |
| 12. 设计审查 | 6. 系统 / 数据架构与设计审查 | Design Review 结论 | 进入 Freeze 前必需 |
| 13. 契约冻结 | 7. 契约冻结与 OpenSpec / Comet | OpenAPI Freeze 记录或无 API 影响记录 | 有 API 影响时必需 |
| 14. OpenSpec / Comet change formalization | 7. 契约冻结与 OpenSpec / Comet | active change、proposal、design、tasks、spec、`.comet.yaml` | 正式垂直切片前必需 |
| 15. 实施计划 | 8. 垂直切片与 TDD 实现 | 垂直切片 Issue、实施计划、回滚点 | 正式开发前必需 |
| 16. 开发实现 | 8. 垂直切片与 TDD 实现 | TDD 证据、代码实现、契约对齐 | 代码变更时必需 |
| 17. 独立审查 | 8. 垂直切片与 TDD 实现 | Review Report 或 MR / PR 评论 | 合并 / 发布前必需 |
| 18. 清理简化 | 8. 垂直切片与 TDD 实现 | 清理项记录或 review 建议 | 有复用 / 可读性 / 性能问题时执行 |
| 19. 验证发布 | 9. 验证发布与复盘 | fresh verification、发布说明、实施 / 回滚说明 | 发布 / 可合并结论前必需 |
| 20. 复盘沉淀 | 9. 验证发布与复盘 | 复盘、CONTEXT / AGENTS / ADR 更新 | 发布后或阶段性复盘时必需 |

## 模板索引

| 产物 | 推荐路径 | 模板 |
|---|---|---|
| Discovery 收敛 | `docs/discovery/<feature>-discovery.md` | `docs/discovery/templates/discovery-template.md` |
| 竞品矩阵 | `docs/discovery/reports/<feature>-competitive-matrix.md` | `docs/discovery/templates/competitive-matrix-template.md` |
| PRD | `docs/requirements/<feature>-prd.md` | `docs/templates/prd-template.md` |
| 业务架构 | `docs/architecture/<feature>-business-architecture.md` | `docs/architecture/templates/business-architecture-template.md` |
| 功能架构 | `docs/architecture/<feature>-functional-architecture.md` | `docs/architecture/templates/functional-architecture-template.md` |
| 产品总体设计 | `docs/design/<feature>-product-overview-design.md` | `docs/design/templates/product-overview-design-template.md` |
| 交互说明 | `docs/design/<feature>-interaction-spec.md` | `docs/design/templates/interaction-spec-template.md` |
| 状态矩阵 | `docs/design/<feature>-state-matrix.md` | `docs/design/templates/state-matrix-template.md` |
| 原型评审 | `docs/design/<feature>-prototype-review.md` | `docs/design/templates/prototype-review-checklist.md` |
| 需求冻结 | `docs/requirements/<feature>-requirement-freeze.md` | `docs/templates/requirement-freeze-template.md` |
| OpenAPI Draft | `docs/api/specs/<feature>.yaml` | `docs/templates/openapi-spec-template.yaml` |
| OpenAPI Draft Review | `docs/api/<feature>-openapi-draft-review.md` | `docs/api/templates/openapi-draft-review-checklist.md` |
| 工程基线审查 | `docs/architecture/<feature>-engineering-baseline-review.md` | `docs/architecture/templates/engineering-baseline-review-template.md` |
| 系统概要设计 | `docs/architecture/<feature>-system-overview-design.md` | `docs/architecture/templates/system-overview-design-template.md` |
| 数据架构 | `docs/architecture/<feature>-data-architecture.md` | `docs/architecture/templates/data-architecture-template.md` |
| 架构 / 设计审查 | `docs/architecture/<feature>-architecture-review.md` | `docs/architecture/templates/architecture-review-checklist.md` |
| OpenAPI Freeze | `docs/api/<feature>-openapi-freeze.md` | `docs/api/templates/openapi-freeze-record-template.md` |
| 垂直切片 Issue | GitHub Issues 或 `docs/requirements/issues/<feature>-slice.md` | `docs/templates/vertical-slice-issue-template.md` |
| 实现路由 | `docs/requirements/issues/<feature>-implementation-routing.md` | `docs/templates/implementation-routing-template.md` |
| 审查报告 | MR / PR 评论或 `docs/requirements/issues/<feature>-review.md` | `docs/templates/review-report-template.md` |
| Fresh verification | issue / MR / release note 或 `docs/testing/<feature>-verification.md` | `docs/templates/verification-record-template.md` |
| 发布说明 | `docs/releases/<version>-<feature>.md` | `docs/templates/release-note-template.md` |
| 实施记录 | `docs/implementation/<feature>-rollout.md` | `docs/templates/implementation-plan-template.md` |
| 用户手册 | `docs/user-guide/<feature>.md` | `docs/user-guide/templates/user-guide-template.md` |
| 复盘 | `docs/process/sprint-retros/<date>-<topic>.md` | `docs/templates/retro-report-template.md` |

## 执行规则

- 每次开始前先判断任务类型和最近可信阶段；不要把小文案、局部样式、单点 Bug 套进完整新功能流程。
- 每个主阶段结束都要做 Git checkpoint 判断：列出变更产物、排除无关脏文件，并说明提交 / 推送 / 暂缓原因。
- 触碰安全红线时，模板中必须标记 `TODO-HUMAN-REVIEW`，Agent 只能生成草案。
- 任何“完成 / 可合并 / 可发布”结论必须有 fresh verification 证据。
