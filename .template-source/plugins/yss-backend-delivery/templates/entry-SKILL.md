---
name: backend-delivery
description: 接收 PR/MR 交接并继续 YSS 后端实现与本地验证，或恢复已绑定的 Backend 治理项目。
---

# YSS 需求到后端交付

接收方通过在线读取 PR/MR 固定 head 和文件变更核验上游产物，再执行 Backend 本地流程。

本技能仅负责接入；唯一业务主控是通过版本核验的治理项目本地 `harness-orchestrator`。先从本 SKILL.md 所在位置解析插件根（上两级），用绝对路径调用包内 `scripts/plugin.mjs`，不要依赖当前目录或把安装目录当治理项目。

1. 执行 `verify` 和 `doctor`。诊断通过不表示业务批准；条件外部提供者须在当前会话实际发现。
2. 根据意图选择 **新建、复用上游、恢复**；优先读取用户已给的路径、资产及目标，只问实际缺口。
3. 普通目录或代码仓不能直接当治理项目。新建时收集治理输出目录、项目名称、业务领域、团队规模和 tracker，运行 `project-plan` 展示写入计划，再依据当前明确的初始化授权运行 `project-apply`。既有后端只登记候选路径，不重建或覆盖源码。
4. 已有治理项目先运行 `project-check`。同 Profile 插件版本升级走 `project-upgrade-plan`，展示原生保存计划、具体文件变更和证据影响；按已有迁移范围授权运行匹配的 apply。身份与 `.yss-backend-plugin.json` 在同一 yss 事务写入，旧 Spec 身份和 `.yss-plugin.json` 不支持自动迁移，保留原字节。不得直接改绑定记录。
5. 执行 `project-entry --target-dir <治理根> --mode new|reuse|resume --input <输入 JSON>`。new 输入可为 `{}`；reuse 可提供项目内 `artifact_refs`，或使用 `{ "pull_request_ref": { "url": "<PR/MR URL>", "head_sha": "<完整提交 SHA>", "paths": ["<变更文件路径>"] } }`；有 checkpoint 时同时提供 `checkpoint`，resume 必须提供 `checkpoint`。PR/MR 定位未经网络验证，不是阶段完成、文件已读取或实现许可。
   只有 URL 时先用可用平台工具获取实际 source 仓、head 和用户选定的变更路径，再构造输入。返回定位后交由 `effective_orchestrator` 在线核验完整变更及固定 head 并读取文件；缺工具、权限或文件时报告缺口，不从 URL 或本地同名文件推断内容。
6. 旧 `project-import-design` 和 `import_receipt_ref` 不支持；新交接使用上述 PR/MR 定位，历史绑定不能当作当前验证通过。
7. **读取返回的 `effective_orchestrator` 绝对路径并执行其中流程**；先读取同一治理根的 yss-project.yaml、CONTEXT.md 和返回的输入资产。不得调用缓存中的旧版同名包装入口，也不得消费另一个仓库的主控。来源冲突时停止并解释。
8. 主控重新核验最近可信阶段、批准、门禁和上下文，依据当前授权继续实际工作；不要仅展示命令就声称已启动业务。`stage_verification_required` 为 true 的资产只作为分诊输入，必须由本地主控核验后才可跨阶段。

新后端按当前批准 Slice 实现；已有后端先接入、核验、补差，再采集证据。上游 Issue 是 Spec 权威来源，PR/MR 中的文件是交接时快照；按本地 Backend 合同核验工程设计与实现。

事务状态用 `project-status`；`project-recover` / `project-rollback` 默认只读，写入需 `--apply`。回退包含原生身份、治理文件和绑定，摘要漂移时保留现场；旧格式未完成事务使用归档中的固定旧执行器，不能交给新版猜测恢复。

终点仅表示当前切片后端可交付。完成后不得恢复实现、自动发布或宣布整个业务完成。实际 Git、远端写入、部署和发布按主控的独立授权要求处理。当前开发版的真实交付验收仍须补齐。

阅读已有合同优先使用接收项目的 `scripts/contract view <资产> --kind <类型>`；任务约束用 `--profile task --unit <ID>`，摘要明细用 `--profile full`。来源自动准备和 API v2 显式迁移见接收项目 `.template-spec/process/contract-reading.md`。视图不授予执行权限，仍核验原批准与当前来源。
