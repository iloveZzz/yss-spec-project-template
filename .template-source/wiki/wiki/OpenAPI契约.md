# OpenAPI契约

API 契约变更先形成 OpenAPI 3.1 Draft，经必要的工程基线、系统 / 数据架构和设计审查后 Freeze，再进入实现。Draft 是 review-only：Freeze 前不得作为前后端稳定实现契约，也不得用来生成客户端或固化契约测试。

Draft 属于待冻结资产，状态为 `ready-for-human`，见 [[Ticket与流程状态]]。Spec 模板把 OpenAPI 影响写成「无 / 需要 API 影响分析 / 需要 review-only OpenAPI Draft」，Draft 路径为 `docs/.scratch/<feature>/api/<feature>.yaml`。该 YAML 必须是唯一权威的单一 OAS 3.1 document；JSON 只能在 Freeze 后由受锁定工具派生。有 UI 且尚未完成用户确认时，不得进入 OpenAPI Draft 评审。

`work-unit.technical-analysis` 消费冻结 [[Spec基线]]、适用的原型和 API / 数据 / 工程影响面，产出 OpenAPI、数据架构、工程基线、架构审查和 Slice 合同草案。命中契约必须冻结；无 API 影响要有可读记录。相关门禁按影响面强制，未命中记 `not-applicable`：`gate.openapi-draft-reviewed`、`gate.design-reviewed`、`gate.engineering-baseline-accepted`、`gate.architecture-reviewed`、`gate.openapi-frozen`，见 [[条件强制门禁]]。

OpenAPI Freeze 是已通过评审、可作为前后端实现和契约测试输入的 OpenAPI 3.1 契约。Freeze 后变更必须回到 API 影响分析和设计审查，重新进入 Draft 循环，不能在实现中直接改契约冒充稳定来源。Router 也要求 API 变化回到生命周期 Draft / Review / Freeze，半成品 backend 不得充当 source of truth。

OpenAPI Freeze 或无 API 影响记录完成后，由生命周期原生 Ticket 正式化工作单元拆成窄垂直切片；用户显式 `to-tickets` 只是兼容入口。切片实现必须消费冻结契约或明确的无 API 影响记录，见 [[垂直切片Ticket]] 与 [[切片实现合同]]。需要页面动作反推端点时，先完成 [[产品设计影响与原型]]，再进入本契约循环。整条链路挂在 [[产品研发生命周期]] 的 `stage.system-data-engineering`；YSS 响应包装与 DTO wire shape 的专项规则由 [[YSS工程技能体系]] 在 Freeze 后执行，不把 Draft 当生成输入。

## 来源

- `CONTEXT.md`
- `AGENTS.md`
- `docs/templates/spec-template.md`
- `docs/process/lifecycle-registry.yaml`
- `docs/api/templates/openapi-draft-review-checklist.md`
- `.agents/skills/yss-router/SKILL.md`
