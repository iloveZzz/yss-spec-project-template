# AI-DLC 与 YSS Plan 阶段对照

## Research Scope

`technical-evidence / evidence-audited`；面向模板维护者，核查 2026-09-09 可访问的 AWS Labs AI-DLC 官方阶段文档。仅纳入官方阶段职责，排除二手摘要、旧教程和将 Plan 误称官方阶段的解释。范围限于前置战略阶段，不复制完整 AI-DLC 编排运行时。

## Executive Read

Plan 是经用户确认的 YSS 战略规划适配名称。官方文档使用 Ideation 和 Inception；本地 Plan 的终点是进入 Spec 所需战略输入已确认，不等同于官方完整 Inception。

## Findings

`claim-phases`：官方当前阶段为 Initialization、Ideation、Inception、Construction、Operation。Ideation 确认意图、可行性、范围和批准交接；Inception 还包含需求、领域设计、契约和交付规划。[官方阶段文档](https://awslabs.github.io/aidlc-workflows/guide/04-phases-and-stages/)

推断：本地原 Discovery 已承载战略设计和阶段决策批准，改为战略规划能更准确表达责任。用户已在本会话分别确认 Plan 终点，以及未决项和迁移策略；这是本地决定，不是 AWS 规范要求。

## Counter-Signals

官方 Inception 延伸至 Units、Contract Design 和 Delivery Planning，范围大于本地 Plan；不能仅换名字就声称完整对齐，也不能据此吞并现有 Spec、原型或工程契约阶段。

## Source Map

官方在线阶段参考是直接证据；本地 `docs/process/lifecycle-registry.yaml` 的原阶段职责用于比较。网页检索结果中的二手 DeepWiki / 社区摘要没有作为决定依据。

## Decision Handoff

交给 `yss-product-lifecycle` 按 L3 模板维护更新注册表、编排说明和模板。用户后续明确修正：“discovery 不做兼容，后续开发项目不存在discovery阶段了，反馈给主任务”。最终方案不提供旧阶段、旧工作单元解析和兼容入口；历史冻结证据不改写。研究本身不批准生命周期资产，本轮不提交、推送或发布。

## Evidence Limitations

引用为 2026-09-09 访问到的滚动官方文档，未绑定不可变发布 tag；不能保证未来页面保持同样阶段。实现借鉴职责，不声称与 AWS 运行时逐项兼容。
