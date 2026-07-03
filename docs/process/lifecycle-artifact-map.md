---
status: active
owner: ai
---

# 产品研发生命周期产物映射表

本文是本仓库产品研发流程的权威索引。日常执行使用 8 个主阶段；21 个门禁 / 职责点用于审查、路由和补齐缺失资产。小需求、Bug、局部样式或配置调整不重跑完整流程，只从最早受影响资产开始补齐下游门禁。

补充执行资产：

- 13 个对外工作单元与本表的映射见 `docs/process/harness-work-unit-map.md`。
- 小改动 / 中等变更 / 新模块的流程裁剪和最近可信阶段判定见 `docs/process/harness-process-tailoring.md`。
- 外部前端 / 后端实现仓库的接入和跨仓库切片绑定见 `docs/process/implementation-repo-integration.md`。
- 阶段结束的 Issue 同步与 Git checkpoint 记录可使用 `docs/process/templates/stage-checkpoint-template.md`。

## 8 个主阶段

| 主阶段 | 目标 | 必须产物 | 条件产物 | 下一门禁 |
|---|---|---|---|---|
| 1. 入口分诊 | 判断任务类型、风险等级、最近可信阶段和最小技能集 | 分诊结论或 issue / change 备注 | `yss-product-lifecycle` 路由结果、Git checkpoint 判断 | 是否需要机会 / PRD / API / 架构 / Comet |
| 2. 机会与 Discovery | 收敛用户、痛点、为什么现在做、MVP、非目标、成功标准、产品功能指引和下游影响信号 | `docs/discovery/<feature>-discovery.md` 或等价说明 | 竞品分析、竞品矩阵、机会说明、产品功能指引、下游影响清单、市场分析、用户痛点文档 | 是否足以进入业务架构和 PRD |
| 3. 业务 / PRD / 功能架构 | 明确产品边界、用户旅程、功能域、模块边界、优先级和验收标准 | `docs/requirements/<feature>-prd.md` | 业务架构、功能架构、CONTEXT 术语回填 | PRD Review / 产品设计准备度 |
| 4. 产品设计与需求冻结 | 对 UI、页面流、状态矩阵、异常路径和 PRD 回填做闭环 | 有 UI 时：交互说明和原型评审结论；无 UI 时：需求冻结记录 | 状态矩阵、页面地图、原型链接 | PRD 校准 / 工程契约与架构设计准备度 |
| 5. 系统 / 数据架构与工程契约设计审查 | 合并 API 影响分析、契约草案、工程基线、系统架构、数据架构和 Design Review；Draft 仅用于评审，Freeze 前不得作为实现或生成客户端契约 | 系统概要设计或等价架构记录；Design Review 结论；有 API 时：API 影响记录和契约草案 / review-only OpenAPI Draft；有后端结构影响时：工程基线审查 | OpenAPI Draft Review、工程基线审查、无 API 影响记录、数据架构、ADR、架构图 | OpenAPI Freeze 准备度 |
| 6. 契约冻结与 OpenSpec / Comet | 冻结契约并创建或选择正式 change 作为交付锚点 | OpenAPI Freeze 记录或无 API 影响记录；active OpenSpec / Comet change | `.comet.yaml`、proposal、design、tasks、delta spec | 垂直切片准备度 |
| 7. 垂直切片与 TDD 实现 | 将冻结范围拆成端到端切片并按 TDD 实现 | 垂直切片 Issue、实施计划、Build Architecture Checklist、测试 / 验证记录 | YSS skill routing、代码审查报告、清理简化记录、Architecture Re-check | Fresh verification / Release Review |
| 8. 验证发布与复盘 | 保留发布、实施、验证和经验沉淀证据 | fresh verification、发布说明、复盘记录 | 实施记录、用户手册、AGENTS / CONTEXT / ADR 更新 | 下一轮规划 |

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
| 8. API 影响分析 / 契约草案 | 5. 系统 / 数据架构与工程契约设计审查 | API 影响记录、契约草案 / OpenAPI Draft 或无 API 影响记录；Draft 在 Freeze 前仅可评审 | 有 API 影响时必需 |
| 9. 工程基线 | 5. 系统 / 数据架构与工程契约设计审查 | 工程基线 / YSS DDD Review | 新服务 / 新模块 / 后端结构变化时必需 |
| 10. 系统总体架构 / 方案设计 | 5. 系统 / 数据架构与工程契约设计审查 | 系统概要设计、ADR 候选 | 服务边界、集成、NFR、运维变化时必需 |
| 11. 数据架构 / 元模型设计 | 5. 系统 / 数据架构与工程契约设计审查 | 数据架构 | 持久化、元数据、版本、血缘、查询 / 搜索变化时必需 |
| 12. 设计审查 | 5. 系统 / 数据架构与工程契约设计审查 | Design Review 结论 | 进入 Freeze 前必需 |
| 13. 契约冻结 | 6. 契约冻结与 OpenSpec / Comet | OpenAPI Freeze 记录或无 API 影响记录 | 有 API 影响时必需 |
| 14. OpenSpec / Comet change formalization | 6. 契约冻结与 OpenSpec / Comet | active change、proposal、design、tasks、spec、`.comet.yaml` | 正式垂直切片前必需 |
| 15. 实施计划 | 7. 垂直切片与 TDD 实现 | 垂直切片 Issue、实施计划、Build Architecture Checklist、回滚点 | 正式开发前必需 |
| 16. 开发实现 | 7. 垂直切片与 TDD 实现 | TDD 证据、代码实现、契约对齐、架构约束回勾 | 代码变更时必需 |
| 17. 独立审查 | 7. 垂直切片与 TDD 实现 | Review Report 或 MR / PR 评论 | 合并 / 发布前必需 |
| 18. 清理简化 | 7. 垂直切片与 TDD 实现 | 清理项记录或 review 建议 | 有复用 / 可读性 / 性能问题时执行 |
| 19. 验证发布 | 8. 验证发布与复盘 | fresh verification、发布说明、实施 / 回滚说明 | 发布 / 可合并结论前必需 |
| 20. 复盘沉淀 | 8. 验证发布与复盘 | 复盘、CONTEXT / AGENTS / ADR 更新 | 发布后或阶段性复盘时必需 |

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
| API 影响分析 / 契约草案 / OpenAPI Draft | API 影响记录、issue note 或 `docs/api/specs/<feature>.yaml` | `docs/templates/openapi-spec-template.yaml` |
| OpenAPI Draft Review | `docs/api/<feature>-openapi-draft-review.md` | `docs/api/templates/openapi-draft-review-checklist.md` |
| 工程基线审查 | `docs/architecture/<feature>-engineering-baseline-review.md` | `docs/architecture/templates/engineering-baseline-review-template.md` |
| 系统概要设计 | `docs/architecture/<feature>-system-overview-design.md` | `docs/architecture/templates/system-overview-design-template.md` |
| 数据架构 | `docs/architecture/<feature>-data-architecture.md` | `docs/architecture/templates/data-architecture-template.md` |
| 架构 / 设计审查 | `docs/architecture/<feature>-architecture-review.md` | `docs/architecture/templates/architecture-review-checklist.md` |
| OpenAPI Freeze | `docs/api/<feature>-openapi-freeze.md` | `docs/api/templates/openapi-freeze-record-template.md` |
| 垂直切片 Issue | GitLab / GitHub Issues 或 `docs/requirements/issues/<feature>-slice.md` | `docs/templates/vertical-slice-issue-template.md` |
| 实现路由 | `docs/requirements/issues/<feature>-implementation-routing.md` | `docs/templates/implementation-routing-template.md` |
| 实现仓库登记 | change design / build entry review / `docs/implementation/<feature>-repo-registry.md` | `docs/templates/implementation-repo-registry-template.md` |
| 跨仓库切片记录 | change tasks / 垂直切片 Issue / `docs/implementation/<feature>-cross-repo-slice.md` | `docs/templates/cross-repo-slice-template.md` |
| Build Architecture Checklist | `docs/implementation/<feature>-build-architecture-checklist.md` 或 build entry review / `.comet/subagent-progress.md` | `docs/templates/build-architecture-checklist-template.md` |
| 审查报告 | MR / PR 评论或 `docs/requirements/issues/<feature>-review.md` | `docs/templates/review-report-template.md` |
| Fresh verification | issue / MR / release note 或 `docs/testing/<feature>-verification.md` | `docs/templates/verification-record-template.md` |
| 发布说明 | `docs/releases/<version>-<feature>.md` | `docs/templates/release-note-template.md` |
| 实施记录 | `docs/implementation/<feature>-rollout.md` | `docs/templates/implementation-plan-template.md` |
| 用户手册 | `docs/user-guide/<feature>.md` | `docs/user-guide/templates/user-guide-template.md` |
| 复盘 | `docs/process/sprint-retros/<date>-<topic>.md` | `docs/templates/retro-report-template.md` |
| Harness 工作单元映射 | `docs/process/harness-work-unit-map.md` | 直接维护 |
| Harness 流程裁剪 | `docs/process/harness-process-tailoring.md` | 直接维护 |
| Harness 试点选择 | `docs/process/harness-pilot-selection.md` | 直接维护 |
| 阶段 checkpoint | Issue / MR / PR 评论或阶段文档 | `docs/process/templates/stage-checkpoint-template.md` |
| Harness 自动化候选 | `docs/process/harness-automation-candidates.md` | 直接维护 |
| Skill 沉淀治理 | `docs/process/skill-governance.md` | 直接维护 |
| Harness 对外蓝图 | `docs/process/harness-executive-blueprint.md` | 直接维护 |
| Harness 试点复盘指标 | `docs/process/harness-pilot-retro-metrics.md` | 直接维护 |
| Harness 状态模型评估 | `docs/process/harness-state-model-evaluation.md` | 直接维护 |

## 执行规则

- 每次开始前先判断任务类型和最近可信阶段；不要把小文案、局部样式、单点 Bug 套进完整新功能流程。
- 判断流程裁剪时先引用 `docs/process/harness-process-tailoring.md`；该指南只能减少不相关产物，不能裁剪关键追踪关系、安全人审或 fresh verification。
- Discovery 可以形成竞品矩阵、机会说明、产品功能指引和下游影响清单，但这些只是 PRD、功能架构、产品设计、API 和架构阶段的输入，不冻结后续设计。
- API 相关阶段必须区分“契约草案 / OpenAPI Draft”和“OpenAPI Freeze”：Draft 仅可用于评审和架构反审，Freeze 前不得作为前后端实现或生成客户端的稳定契约。
- 进入垂直切片实现前，必须将系统架构、数据架构、ADR、工程基线、OpenAPI Freeze 结论和安全红线转译成 `Build Architecture Checklist`。若架构文档仍是 `draft-for-design-review`、缺少 Design Review 结论，或 checklist 未建立，不得进入正式业务实现。
- 每个垂直切片完成时必须回勾 `Build Architecture Checklist`，用 `implemented`、`seam-deferred`、`drift`、`violation` 或 `not-applicable` 标记状态，并提供证据或补齐落点。`drift` 触发 Architecture Re-check；`violation` 阻断继续 build。
- Repository / Gateway / 持久化、权限 / 授权、审计、SQL / DDL / 迁移、文件上传下载、版本快照 / 元数据 / 血缘 / 查询索引、部署 / 回滚 / 运维约束，必须在 checklist 中逐项绑定切片和人审要求。
- 每个主阶段结束都要做 issue tracker 同步：按用户明确选择或当前仓库主远端路由到 GitLab / GitHub，更新对应 PRD、OpenSpec / Comet change、垂直切片 Issue、里程碑或评论，记录阶段状态、完成范围、验证证据、阻塞项、下一步和安全人审点。
- 每个主阶段结束都要做 Git checkpoint 判断：列出变更产物、Issue 同步状态、排除无关脏文件，并说明提交 / 推送 / 暂缓原因。
- 触碰安全红线时，模板中必须标记 `TODO-HUMAN-REVIEW`，Agent 只能生成草案。
- 任何“完成 / 可合并 / 可发布”结论必须有 fresh verification 证据。
