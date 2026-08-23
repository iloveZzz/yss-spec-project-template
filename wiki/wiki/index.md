# YSS Spec Project Template 知识索引

本 wiki 收录模板源仓库的核心知识：仓库身份、研发生命周期、契约资产、技能体系与质量治理。事实以仓库 live 权威源为准；`raw/` 是不可变拷贝或派生摘录。

## 入口与身份

- [[模板总览]] — 模板定位、结构与 Quickstart
- [[仓库身份与路由]] — `template-source` 与 `project-instance`
- [[Agent入口规则]] — Agent 入口、硬门禁与禁止事项

## 生命周期与流程

- [[产品研发生命周期]] — 主阶段、产物与工作单元
- [[条件强制门禁]] — 按影响面强制的生命周期门禁
- [[影响面分诊与流程裁剪]] — 影响面分诊与流程裁剪
- [[模板维护流程]] — 模板源维护与 L1 / L2 / L3

## 契约资产

- [[Spec基线]] — Spec 基线：产品研发规格
- [[SpecDelta]] — Spec Delta：相对冻结基线的高风险差异
- [[OpenAPI契约]] — OpenAPI Draft 与 Freeze
- [[产品设计影响与原型]] — 产品设计影响与原型
- [[垂直切片Ticket]] — 垂直切片 Ticket
- [[切片实现合同]] — Slice Implementation Contract

## 技能与实现

- [[YSS路由与合同编译]] — YSS 路由与实现合同编译
- [[YSS工程技能体系]] — YSS 工程技能体系
- [[Matt技能体系]] — Matt Engineering Skills
- [[技能投影与锁定]] — 技能投影与 `skills-lock.json`
- [[实现仓库与跨仓库契约]] — 实现仓库与跨仓库契约
- [[LLM Wiki]] — 本地持久知识库的 init / refresh / rebuild

## 质量与治理

- [[Ticket与流程状态]] — Ticket 与五态流程状态
- [[Fresh验证与独立审查]] — Fresh Verification 与独立审查
- [[模板发布门禁与验证]] — `scripts/verify-template`
- [[复盘与权威资产修订]] — 复盘与权威资产修订
