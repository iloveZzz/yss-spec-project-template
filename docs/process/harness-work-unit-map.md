# Harness 13 个工作单元映射表

本文把《产品全生命周期 AI 研发工程化体系》PPT 中的 13 个可治理工作单元，映射到本仓库现行的 8 个主阶段和 21 个门禁 / 职责点。13 个工作单元只作为轻量表达层；执行、审查和追踪仍以 `docs/process/lifecycle-artifact-map.md` 为权威来源。

## 使用方式

- 对外沟通时使用 13 个工作单元讲清楚端到端链路。
- 对内执行时按映射表回到 8 个主阶段、21 个门禁、模板和 Skill。
- 小改动、中等变更和新模块是否裁剪，以 `docs/process/harness-process-tailoring.md` 为准。

## 映射表

| 工作单元 | 对应主阶段 | 对应门禁 / 职责点 | 关键产物 | 推荐 Skill / 能力 | 可裁剪 | 自动化潜力 |
|---|---|---|---|---|---|---|
| 0. 机会 / 问题收集 | 1. 入口分诊；2. 机会与 Discovery | 0. 入口分诊；1. 机会探索 | 分诊结论、Discovery 收敛、MVP 边界 | `yss-product-lifecycle`、`competitive-intelligence`、Discovery 模板 | 小改动可跳过；新产品 / 新模块必需 | 半自动生成分诊清单、竞品情报简报和 Discovery 模板 |
| 1. 需求澄清 | 3. 业务 / Spec / 功能架构 | 3. 需求澄清 | 澄清记录、用户 / 痛点 / 验收标准 | `grill-with-docs`、`to-spec` | 小文案 / 单点 bug 可轻量化 | 半自动生成澄清问题和缺口清单 |
| 2. Spec -> 产品总体设计 -> 原型校准 | 3. 业务 / Spec / 功能架构；4. 产品设计与需求冻结 | 4. 需求基线 / 功能架构；5. 页面 / 原型 / 交互设计；6. 原型评审；7. Spec 校准 / 需求冻结 | Spec、产品总体设计 / 功能架构、低保真原型、页面清单、状态矩阵、原型评审、Ant Design v6 高保真 HTML 原型、AntD CLI 校验证据、用户确认记录、需求冻结 | `yss-design-system`、`product-design:index`、Product Design focused skills（`$get-context` / `$ideate` / `$prototype` / `$image-to-code` / `$url-to-code`）、`antd`、`prototype-review` | 无 UI 可省略后续交互原型；进入 Spec 初稿 / 需求基线流程时不得省略产品总体设计及其低保真原型；有 UI 时产品原型产出以 `product-design:index` 路由为主，低保真评审通过后不得省略高保真 HTML 原型，可由系统 / Agent 自动产出，产出前后必须使用 `antd` CLI 校验并在产出后获得用户确认；中等变更只补受影响页面 | 半自动检查 Spec 字段、产品总体设计、低保真原型、状态矩阵、原型评审、高保真 HTML 原型、AntD CLI 校验证据和用户确认记录 |
| 3. SDD 研发规范基线 | 5. 系统 / 数据架构与工程契约设计审查；6. 契约冻结与 Ticket | 8. API 影响分析 / 契约草案；9. 工程基线；13. 契约冻结；14. Ticket formalization | API 影响记录、契约草案 / OpenAPI Draft / Freeze、Spec Delta、工程基线、垂直切片 Ticket、实施路由、验证证据 | `to-tickets`、`yss-router` | 无 API / 无工程边界变化时记录无影响结论；低风险小改动跳过 Spec Delta | 自动检查 OpenAPI Freeze / no API impact / Spec Delta / vertical slice ticket / implementation routing |
| 4. DDD 领域建模 | 3. 业务 / Spec / 功能架构；5. 系统 / 数据架构与工程契约设计审查 | 2. 业务架构；10. 系统总体架构；11. 数据架构 | CONTEXT 术语、业务能力、领域边界、聚合 / 状态规则 | `domain-modeling`、`yss-domain-modeling`、`yss-domain` | 小改动只校验是否影响既有术语或边界 | 半自动检查术语回填和领域边界审查项 |
| 5. 架构设计 | 5. 系统 / 数据架构与工程契约设计审查 | 8. API 影响分析 / 契约草案；9. 工程基线；10. 系统总体架构；11. 数据架构；12. 设计审查 | API 影响记录、工程基线、系统概要设计、数据架构、ADR 候选、架构评审 | `codebase-design`、`improve-codebase-architecture`、YSS 架构模板 | 不触碰 API、工程边界、服务边界、数据、NFR、部署时可轻量记录无影响 | 半自动生成 Architecture Review checklist |
| 6. 垂直切片 Ticket | 7. 垂直切片与 TDD 实现 | 15. 实施计划 | 垂直切片 Ticket、实现路由、Build Architecture Checklist | `to-tickets`、`yss-router`、`implement` | 小改动可用单一 Ticket / 实施备注替代 | 半自动检查切片是否端到端而非横向拆层 |
| 7. 垂直 Ticket 详细设计 | 7. 垂直切片与 TDD 实现 | 15. 实施计划 | 切片设计、接口字段映射、回滚点、架构约束绑定 | 实现计划模板、Build Architecture Checklist 模板 | 低风险小改动可合并到实施说明 | 半自动生成字段映射和架构约束回勾表 |
| 8. TDD 并行开发 | 7. 垂直切片与 TDD 实现 | 16. 开发实现 | 失败测试、最小实现、重构记录 | `tdd`、YSS 实现专项 Skill | 文档-only 变更可说明 TDD 例外 | 自动执行测试命令并收集 fresh verification |
| 9. 测试验证 | 7. 垂直切片与 TDD 实现；8. 验证发布与复盘 | 16. 开发实现；19. 验证发布 | 测试报告、验收映射、fresh verification | fresh verification 记录、验证模板 | 不可裁剪为“未验证”；只能裁剪验证范围 | 自动跑命令、汇总覆盖率和验收映射 |
| 10. Code Review | 7. 垂直切片与 TDD 实现 | 17. 独立审查；18. 清理简化 | Review Report、MR / PR 评论、清理项 | `code-review`、`code-review-process` | 合并 / 发布前不可跳过；小改动可轻量 review | 半自动生成 review checklist，人工确认风险 |
| 11. 发布部署 | 8. 验证发布与复盘 | 19. 验证发布 | 发布说明、实施记录、回滚方案、观察窗口 | Release 模板、实施记录模板 | 未发布的文档 / 草案可记录不适用 | 半自动生成发布检查和回滚清单 |
| 12. 反馈复盘 | 8. 验证发布与复盘 | 20. 复盘沉淀 | 复盘、模板 / Skill 更新、CONTEXT / ADR 回流 | `writing-skills`、复盘模板、Skill 治理规则 | 小改动可阶段性合并复盘 | 半自动生成指标和待沉淀动作清单 |

## 不变规则

- 13 个工作单元不能替代 OpenAPI Freeze、Ticket formalization、Build Architecture Checklist、安全红线和 fresh verification。
- 裁剪只能减少不相关产物，不能裁剪关键追踪关系和验证证据。
- 触碰安全红线时必须进入人工审查，不能被自动化门禁放行。
