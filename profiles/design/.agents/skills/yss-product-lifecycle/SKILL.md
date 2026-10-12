---
name: yss-product-lifecycle
description: 接入 YSS 战略设计 profile 的产品生命周期；从 Plan、Spec、产品设计到正式方案交接，复用项目既有主控合同与证据。
---

# 产品生命周期：战略设计 profile 入口

这是当前 profile 同一生命周期主控的兼容入口，不创建第二套状态或新的批准权。

本仓是产品与业务设计专职项目。产品设计里程碑与战略交接职责终点分别核验；主控汇总必须显式绑定同功能 checkpoint 和当前接收 Receipt。本地完成不等于整个业务验收，不写综合 Spec 主控的推进意图配置。

1. 读取项目根身份、CONTEXT.md 和 .template-spec/process/harness-profile.yaml，必须为 `project-instance` 与 `harness.business-ddd-strategy-handoff`；模板源只允许维护。
2. 实际读取并执行同一项目 `.agents/skills/yss-strategic-design/SKILL.md` 及其按需 references。它是此 profile 已有的主控实现，内部 `workflow_reference.source`、正式资产所有者与历史 checkpoint 继续使用 `yss-strategic-design`，不得改写历史身份。
3. 通过本地 `scripts/query-lifecycle-context` 读取同一份编排合同，从最近可信阶段继续。遵守全部当前用户决定、独立审查、词汇对账与原型验证要求。
4. 以 `work-unit.strategic-design-handoff` 为终点；批准、finalize、整包验证与 checkpoint 证据必须对应当前范围。后端工程设计和实现由另一治理项目接收方案包后执行。

公开插件入口是 `yss-product-design:product-design`。本技能是项目本地主控入口，不是公开插件包装技能；它不改变已有 profile、阶段、门禁或产物 ID。
