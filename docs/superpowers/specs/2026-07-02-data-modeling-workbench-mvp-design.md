---
comet_change: data-modeling-workbench-mvp
role: technical-design
canonical_spec: openspec
---

# 企业数据模型协作工作台 MVP 技术设计

## 1. 设计目标

本设计把已冻结的产品、交互、OpenAPI、系统架构和数据架构转化为 Comet build 可执行输入。OpenSpec delta spec 仍是行为规格事实源，本文只记录实现组织方式、垂直切片边界、测试策略、风险门禁和 build 交接约束。

本 change 保持一个 MVP OpenSpec change，不拆成多个 change。实现阶段按 9 个端到端垂直切片推进，每个切片都必须覆盖 UI、Web Adapter、Application use case、Domain behavior、Gateway/Repository interface、Infrastructure implementation 或外部 gateway、契约测试、审计和 fresh verification。

## 2. 采用方案

采用方案 A：单 change + 9 个垂直切片。

1. DMW-001 先建立模型项目边界、主题域/子域、权限动作、乐观锁、统一错误和审计基础。
2. DMW-002 与 DMW-003 在 DMW-001 后并行推进。DMW-002 负责对象树、业务对象、逻辑实体/字段、物理表/字段的人工维护；DMW-003 负责 Excel 导入模板、预览、应用、取消、幂等和上传安全。
3. DMW-004 作为 DMW-002 和 DMW-003 的汇合点，统一处理逻辑字段到物理字段的映射、覆盖率、未映射提示和阈值。
4. DMW-005 至 DMW-008 形成治理发布链路：规范检查、单一架构师评审、发布不可变版本、异步导出 SQL DDL 草案/Markdown/Excel。
5. DMW-009 保留为安全、审计与契约收口切片；DMW-001 至 DMW-008 仍各自包含局部安全门禁，DMW-009 只做跨切片最终闭环。

不采用方案 B（多个 OpenSpec changes），因为冻结的 OpenAPI、PRD 和数据架构是一个 MVP 契约；拆成多个 change 会增加跨 change 契约漂移和审查重复。不采用方案 C（取消 DMW-009 独立收口），因为授权、上传、DDL 草案、下载、审计和幂等证据需要跨切片统一验收。

## 3. 分层与接口边界

后端实现遵守 YSS DDD 调用方向：

```text
Web Adapter
-> Application Use Case / Command Handler
-> Domain Aggregate / Domain Service
-> Domain Gateway / Repository Interface
-> Infrastructure GatewayImpl / Repository
-> Database / File Storage / Excel Parser / Standard Assets / Audit
```

Adapter 层只做协议适配、基础参数校验、统一响应包装和错误映射，不直接访问 Repository，不计算覆盖率、评审门禁或发布门禁。

Application 层负责编排切片用例、幂等检查、权限动作校验、`draftVersion` 乐观锁、跨聚合读取和审计触发。跨聚合流程必须在 Application 中通过 Domain Service 和 Gateway 组合完成。

Domain 层表达聚合、不变量和状态规则，包括 `ModelProject`、`ModelObjectCatalog`、`ImportJob`、`FieldMappingSet`、`ValidationRuleSet`、`ValidationRun`、`ModelReview`、`ModelVersion`、`ExportTask`，以及覆盖率、评审门禁、发布门禁和快照生成服务。

Infrastructure 层实现 PostgreSQL 元数据存储、Excel 解析、文件存储、DDL 草案生成、标准资产读取、权限查询和审计落库。生产数据库连接、自动执行 DDL、数据库迁移执行端点均不属于本 change。

## 4. 数据与状态流

草稿态数据采用归一化元数据，发布态数据采用不可变版本快照。导入和导出均为异步任务模型。

1. 项目创建后进入 draft，任何草稿写入必须携带当前 `draftVersion`。
2. Excel 上传只创建导入任务和预览，不修改模型草稿；apply 成功后才写入物理表/字段并递增草稿版本。
3. 映射覆盖率按有效逻辑字段计算，整体覆盖率 80% 允许提交评审，85% 允许发布，P0 必填字段覆盖率 95% 是发布门禁。
4. 规范检查运行绑定 `projectId`、`draftVersion`、`ruleSetVersion`，结果不可变；草稿变化后旧检查只能作为历史证据。
5. 评审驳回后再次提交生成新的 `reviewId`，旧 rejected review 保留历史。
6. 发布生成 `ModelVersion` 和 `VersionSnapshot`，快照不可变；从版本创建草稿只复制快照内容，不修改原版本。
7. 导出只允许绑定发布版本，SQL DDL 输出必须标记为草案，下载引用必须短期有效、权限绑定并产生审计。

## 5. 测试策略

业务行为实现默认 TDD。每个切片先写能失败的行为测试，再写最小实现，最后补契约、集成或 UI 验证。

通用验证基线：

1. OpenAPI 可解析，`$ref` 完整，路径参数定义完整。
2. 所有 mutating command 缺少 `X-Idempotency-Key` 时失败。
3. `draftVersion` 冲突返回 409 且不覆盖他人修改。
4. 权限 fail-closed：无查看权限不泄露数据，有查看但无操作权限返回 disabled action，直接调用命令返回 403。
5. 统一错误结构使用冻结的 `ApiError` / `FieldError`。
6. 审批、发布、导入 apply、导出创建和越权命令写审计。
7. DDL 草案、迁移模板、原生 SQL、授权中间件、Excel 上传和下载 URL 均保留人工审查证据。

契约测试以 `docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md` 为基线。DMW-009 汇总 CT-001 至 CT-004、CT-010 至 CT-015、CT-090 至 CT-094，以及各切片产生的人审证据和 fresh verification。

## 6. 风险与门禁

实现阶段的主要风险和门禁如下：

1. **切片漂移为横向任务**：每个切片必须保持端到端交付，不允许只做 Adapter、Domain 或 UI 单层任务。
2. **契约漂移**：Frozen OpenAPI 默认不回改；发现缺口必须回到 OpenAPI Draft / Review / Freeze 或明确发起新的变更。
3. **并行切片不一致**：DMW-002 人工维护的物理字段和 DMW-003 导入的物理字段必须在 DMW-004 统一进入映射和覆盖率模型。
4. **安全红线**：授权中间件、数据库迁移脚本、原生 SQL、DDL 草案生成、Excel 上传安全和下载 URL 策略必须标记 `TODO-HUMAN-REVIEW` 或附审批证据。
5. **审计证据不足**：关键命令、越权、发布、导出和下载审计必须在每个切片本地验证，并在 DMW-009 收口。

## 7. Build 交接

进入 build 前需要生成 implementation plan。计划应按 DMW-001 至 DMW-009 拆分任务，保留 DMW-002 与 DMW-003 可并行、DMW-004 汇合的依赖关系。

推荐 build 选择：

1. 隔离方式：创建分支，除非用户需要并行 worktree。
2. 执行方式：优先使用 subagent-driven-development，因为任务数多且跨 UI/API/DDD/持久化/安全审计。
3. TDD 模式：`tdd`。
4. Review 模式：`thorough`，因为该 change 涉及安全红线、API 契约、持久化和多模块协作。

## 8. Spec Patch

当前不需要回写 OpenSpec delta spec。现有三个 capability spec 已覆盖本设计确认的切片决策、并行依赖、阈值、不可变快照、权限动作、审计和人审门禁。
