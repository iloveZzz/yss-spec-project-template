# Harness 流程裁剪指南

本文定义 Harness 工程在不同任务规模下的最小流程、最近可信阶段和升级条件。它补充 `docs/process/lifecycle-artifact-map.md`，不替代其中的 9 个主阶段和 21 个门禁。

## 三档流程

| 档位 | 适用场景 | 最小入口 | 最小产物 | 最小验证 | 典型退出标准 |
|---|---|---|---|---|---|
| 小改动 | 文案、局部样式、配置微调、无 API / 数据 / 权限影响的低风险修正 | 影响面评估 | change / issue 备注或简短实施说明 | 相关页面 / 命令 / 文档检查 | 变更范围清楚、验证新鲜、无安全红线 |
| 中等变更 | 已有功能迭代、已有页面 / API 的局部扩展、非核心流程调整 | 最近可信阶段 | 受影响 PRD / 设计 / OpenAPI / 架构 / Comet 资产的增量更新 | 受影响切片测试、契约检查、review | 下游门禁补齐，未受影响资产不重跑 |
| 新模块 / 高风险变更 | 新产品、新业务域、新模块、跨端协作、服务边界、数据模型、权限、安全或发布回滚变化 | 入口分诊 | Discovery、PRD、设计、OpenAPI、架构、OpenSpec / Comet、垂直切片 | TDD、契约验证、独立审查、fresh verification | 完整生命周期关键门禁都有证据 |

## 最近可信阶段判定表

| 当前输入 / 变更事实 | 最近可信阶段 | 需要补齐的下游 |
|---|---|---|
| 只有模糊想法、业务机会或竞品输入 | 2. 机会与 Discovery | Discovery、PRD、业务 / 功能架构 |
| 已有清晰 PRD，但用户、痛点、MVP 或非目标不稳 | 3. 业务 / PRD / 功能架构 | PRD Review、功能架构、必要的产品设计 |
| 有 UI 变更但缺页面流、状态矩阵或原型评审 | 4. 产品设计与需求冻结 | 交互说明、状态矩阵、Prototype Review、PRD 回填 |
| API 路径、schema、错误结构、分页或权限发生变化 | 5. API Draft 与工程基线 | OpenAPI Draft / Review、系统 / 数据架构、Freeze、OpenSpec / Comet |
| 服务边界、集成、部署、性能、可靠性或运维变化 | 6. 系统 / 数据架构与设计审查 | 系统架构、Design Review、Build Architecture Checklist |
| 持久化、元数据、版本、血缘、搜索、索引或迁移变化 | 6. 系统 / 数据架构与设计审查 | 数据架构、人审点、Repository / MyBatis 前置审查 |
| OpenAPI 已冻结但没有 active change 或 change 资产不完整 | 7. 契约冻结与 OpenSpec / Comet | proposal、design、tasks、spec、`.comet.yaml` |
| 已有 active Comet change，但 build entry 条件不完整 | 8. 垂直切片与 TDD 实现 | 实施计划、垂直切片、Build Architecture Checklist |
| 只有代码修复或测试失败 | 8. 垂直切片与 TDD 实现 | 可复现命令、失败测试、最小修复、fresh verification |
| 准备发布或宣称完成 | 9. 验证发布与复盘 | fresh verification、发布说明、回滚方案、复盘入口 |

## 升级条件

任一条件命中时，不得按小改动处理，必须升级到对应最近可信阶段：

- API 契约、OpenAPI schema、错误结构、分页、权限或版本发生变化。
- 认证、授权、支付、加密、SQL 原生查询、数据库迁移、公共基础库 API 等安全红线被触碰。
- 数据模型、Repository / Gateway、持久化边界、审计日志、文件上传下载、临时 URL、版本快照、血缘或查询索引变化。
- 服务边界、外部系统集成、部署、回滚、可观测性、性能、可靠性或运维约束变化。
- UI 变更影响用户主流程、权限状态、异常状态、页面导航或 OpenAPI 反推清单。
- 实现与既有架构、CONTEXT 术语、ADR 或 Comet design 出现漂移。
- 无法给出 fresh verification 证据。

## 裁剪原则

- 裁剪的是不相关阶段和产物，不裁剪证据链。
- 中等变更只补受影响阶段及其下游，不回到机会探索。
- 小改动必须保留影响面评估、验证证据和 Git checkpoint 判断。
- 安全红线只能进入人工审查或草案状态，不能因任务小而跳过。

