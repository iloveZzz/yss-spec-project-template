---
name: backend-delivery
description: 从需求、已有 Spec 或设计继续 YSS 后端交付，或恢复已绑定治理项目；连接项目本地生命周期主控，覆盖 Plan、Spec、Design、后端实现与交付。
---

# YSS 需求到后端交付

完整流程：Plan → Spec → Design → 工程契约 → 实现准备 → Ticket / Slice → 后端实现与验证 → Backend Delivery。

本技能仅负责接入；唯一业务主控是通过版本核验的治理项目本地 `yss-product-lifecycle`。先从本 SKILL.md 所在位置解析插件根（上两级），用绝对路径调用包内 `scripts/plugin.mjs`，不要依赖当前目录或把安装目录当治理项目。

1. 执行 `verify` 和 `doctor`。诊断通过不表示业务批准；条件外部提供者须在当前会话实际发现。
2. 根据意图选择 **新建、复用上游、恢复**；优先读取用户已给的路径、资产及目标，只问实际缺口。
3. 普通目录或代码仓不能直接当治理项目。新建时收集治理输出目录、项目名称、业务领域、团队规模和 tracker，运行 `project-plan` 展示写入计划，再依据当前明确的初始化授权运行 `project-apply`。既有后端只登记候选路径，不重建或覆盖源码。
4. 已有治理项目先运行 `project-check`。旧版身份冲突走 `project-migration-plan`，展示具体文件变更和证据影响；只有用户明确授权该份迁移计划后运行 `project-migration-apply`。不得直接改绑定记录。
5. 执行 `project-entry --target-dir <治理根> --mode new|reuse|resume --input <输入 JSON>`。new 输入可为 `{}`；reuse 输入为 `{ "artifact_refs": ["项目内相对路径"] }`，有 checkpoint 时同时提供 `checkpoint`；resume 必须提供 `checkpoint`。返回的是核验交接信息，不是阶段完成或实现许可。
6. 接收正式设计方案时，先运行 `project-import-design --target-dir <治理根> --bundle <交付目录或ZIP>`；再向 reuse/resume 输入传入返回的 `import_receipt_ref`。入口重新核验包、原批准和消费者路线，仅允许继续目标词汇对账、工程设计与逐条消费；不把导入当作实现批准。
7. **读取返回的 `effective_orchestrator` 绝对路径并执行其中流程**；先读取同一治理根的 yss-project.yaml、CONTEXT.md 和返回的输入资产。不得调用缓存中的旧版同名包装入口，也不得消费另一个仓库的主控。来源冲突时停止并解释。
8. 主控重新核验最近可信阶段、批准、门禁和上下文，依据当前授权继续实际工作；不要仅展示命令就声称已启动业务。`stage_verification_required` 为 true 的资产只作为分诊输入，必须由本地主控核验后才可跨阶段。

新后端按当前批准 Slice 实现；已有后端先接入、核验、补差，再采集证据。Design 包含产品设计和工程设计，不能因本轮只做后端而跳过命中的产品设计门禁。生产前端交给下游。

终点仅表示当前切片后端可交付。完成后不得恢复实现、自动发布或宣布整个业务完成。实际 Git、远端写入、部署和发布按主控的独立授权要求处理。当前开发版的真实交付验收仍须补齐。

阅读已有合同优先使用接收项目的 `scripts/contract view <资产> --kind <类型>`；任务约束用 `--profile task --unit <ID>`，摘要明细用 `--profile full`。来源自动准备和 API v2 显式迁移见接收项目 `.template-spec/process/contract-reading.md`。视图不授予执行权限，仍核验原批准与当前来源。
