---
name: product-design
description: 从需求、已批准的 Plan 或 Spec 开始 YSS 产品设计，或恢复已绑定设计项目；形成可由 yss-backend-delivery 接收消费的正式方案包。
---

# YSS 需求到产品设计

流程：Plan → Spec / 功能架构 → 产品设计与验证 → 正式方案交接。唯一主控是版本匹配的项目本地 `yss-product-lifecycle`；本入口不批准阶段、不实现后端。

1. 从当前 SKILL.md 上两级定位插件根，以绝对路径运行 `node <插件根>/scripts/plugin.mjs verify` 与 `doctor`。所需外部设计提供者必须在会话中实际可用；默认 HTML 适配不依赖外部提供者。
2. 普通目录或代码仓作为需求输入。先运行 `project-plan --target-dir <独立治理目录> --project-name <名称> --business-domain <领域>` 展示写入范围，按当前初始化授权运行 `project-apply --plan <JSON文件>`。团队规模和 tracker 可显式提供，默认 1 / local-markdown。
3. 既有设计实例先 `project-check`；仅精确匹配而未绑定的实例可 `project-bind-plan`、`project-bind-apply`。来源不匹配或漂移时保留项目，不能手改 metadata 或套用后端迁移。
4. 执行 `project-entry --target-dir <治理根> --mode new|reuse|resume --input <JSON文件>`。new 用 `{}`；reuse 提供 `artifact_refs` 项目内路径数组或 `checkpoint`；resume 必须提供 `checkpoint`。原型和 checkpoint 都不是批准替代物。
5. 实际读取返回的 `effective_orchestrator`、同根身份、CONTEXT.md、profile 与输入资产，按项目本地主控从最近可信阶段继续。新建仅开启新工作单元，不清除既有交付。
6. 复用战略 profile 的 Plan、Spec、产品设计、业务级任务和战略交接。首版支持新原型与既有 UI 基线；纯无 UI 的正式交付需另行扩展合同，不能生成空原型。
7. 原型遵守 `yss-prototype-stage`，包括独立评审、浏览器证据和真实用户决定。使用 `strategic-handoff finalize/verify` 交付 Handoff v5。交接 checkpoint 完成必须绑定当前包及验证；恢复已完成 checkpoint 只复验并返回终点。

交付后说明包位置、版本、未决项和后端接收方式：在独立后端治理项目调用 `yss-backend-delivery` 的 `project-import-design --target-dir <治理根> --bundle <交付目录或ZIP>`，再以 `project-entry --mode reuse` 的 `import_receipt_ref` 继续。接收方完成词汇对账、工程设计、逐条消费与 Slice Contract 批准后才能实现。

设计交付完成不代表后端已接收、前端已实现或业务已发布。Git、远端写入与发布沿用项目主控授权边界。

阅读已有合同优先使用接收项目的 `scripts/contract view <资产> --kind <类型>`；任务约束用 `--profile task --unit <ID>`，摘要明细用 `--profile full`。来源自动准备和 API v2 显式迁移见接收项目 `.template-spec/process/contract-reading.md`。视图不授予执行权限，仍核验原批准与当前来源。
