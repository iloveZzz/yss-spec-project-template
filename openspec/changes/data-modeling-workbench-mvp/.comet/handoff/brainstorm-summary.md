# Brainstorming 检查点

- Change：data-modeling-workbench-mvp
- 日期：2026-07-02
- 状态：用户已确认方案 A

## 已确认的生命周期决策

1. DMW-002 保持为一个垂直切片，统一覆盖模型对象树、逻辑模型和物理模型字段维护。
2. DMW-003 Excel 导入在 DMW-001 后可与 DMW-002 并行；DMW-004 汇合两者产物，进入字段映射与覆盖率能力。
3. DMW-009 保留为安全、审计与契约收口 issue；DMW-001 至 DMW-008 仍各自携带本切片内的安全门禁。

## 确认的技术方案

以冻结 OpenAPI、系统架构和数据架构为权威输入。OpenSpec 保持一个 MVP change，不拆成多个 change；实现通过 9 个已确认的端到端垂直切片推进。每个切片都贯穿 UI、Web Adapter、Application use case、Domain 行为、Gateway / Repository 接口、Infrastructure 持久化或外部网关、契约测试、审计和 fresh verification。

DMW-001 先建立模型项目边界和权限动作语言。DMW-002 与 DMW-003 随后并行：DMW-002 负责可编辑的模型对象与字段，DMW-003 负责 Excel 导入预览、应用、取消和导入任务安全。DMW-004 将逻辑资产与物理资产汇合为字段映射和覆盖率。DMW-005 至 DMW-008 形成治理发布链路：规范检查、评审、发布版本和异步导出。DMW-009 跨切片验证 fail-closed 授权、审计覆盖、幂等、分页、错误结构一致性和人工审查证据。

## 关键取舍与风险

单 change、多切片方案能保持对冻结 MVP 契约的一体追溯，但必须严格维护切片边界，避免退化成横向的前端/后端任务。DMW-002 与 DMW-003 并行可以提升吞吐，但 DMW-004 必须统一处理“手工创建物理字段”和“Excel 导入物理字段”的语义差异。DMW-009 作为收口 issue 能降低安全证据分散的风险，但不能替代每个切片内的安全检查。

安全红线仍作为人工审查门禁：认证/授权中间件、数据库迁移模板、原生 SQL 或 DDL 草案生成、Excel 上传加固、受控下载 URL 和审计保留策略。

## 测试策略

每个垂直切片采用 TDD。先在最小可验证范围写行为测试，再补充 `docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md` 中的契约测试。反复出现的必测项包括 OpenAPI 契约解析、`X-Idempotency-Key`、`draftVersion` 冲突、统一错误结构、权限 fail-closed、审计事件和 UI 禁用态行为。DMW-009 在实现收口前汇总跨切片 verification 证据。

## Spec Patch

暂无。现有 OpenSpec specs 已覆盖本次确认的切片决策和安全门禁。
