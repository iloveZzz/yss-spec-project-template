# YSS 需求到后端交付

开发版 `yss-backend-delivery` 0.3.0-dev.1。唯一公开入口为 `backend-delivery`，通过版本核验后读取治理项目本地 `yss-product-lifecycle` 并继续工作；包内专业技能为分发资源，不再暴露 41 个同名诊断包装入口。

Plan → Spec → Design → 工程契约 → 实现准备 → Ticket / Slice → 后端实现与验证 → Backend Delivery。

产品设计按影响触发，工程设计完成适用的数据/API/技术合同。新后端按批准合同实现；已有后端先登记、核验、补差，再采集交付证据。仅后端交付不代表前端、整个业务或发布完成。

## 新建、复用、恢复

所有命令调用本包 `node scripts/plugin.mjs`，使用绝对路径定位包与治理项目。

- 新建：`project-plan --target-dir <独立治理目录> --project-name <名称> --business-domain <领域> --team-size <规模> --issue-tracker github|gitlab` 输出计划；按当前初始化授权用 `project-apply --plan <计划文件>` 创建并绑定。`--backend-root` 只登记既有后端候选，不批准写源码。
- 检查：`project-check --target-dir <治理目录>`。
- 主入口：`project-entry --target-dir <治理目录> --mode new|reuse|resume --input <JSON>`。new 输入为 `{}`；reuse 可用 `{ "artifact_refs": ["docs/spec.md"] }`；resume 必须给 `{ "checkpoint": "docs/.scratch/example/checkpoint.yaml" }`。
- 入口返回 `project-local-handoff` 和主控绝对路径。Agent 必须实际读取该路径并按项目本地主控执行；只读结果自身不批准阶段或实现。上游文件及 checkpoint 仍须重新核验资产、原始批准、摘要和门禁。
- `query-project`、`project-resume`、`project-dispatch` 保留原命令语义；派发只编译已批准任务包，不自动执行。

## 已登记开发项目迁移

支持包内登记精确摘要的 `yss-plan-to-backend` 0.1.0-dev.4 与 `yss-backend-delivery` 0.2 开发包，不接受相同版本号下任意来源。

新项目使用包内固定的 `create-yss-spec` 3.4.12，并安装后端交付所需 Skill；迁移预检另用固定的 3.4.9 核验旧项目，再由新版 CLI 同步并生成逐文件迁移计划。两个 CLI 包均随插件锁定摘要，不从本机全局安装取用。

`project-migration-plan --target-dir <旧治理目录>` 返回逐文件变化、原/目标摘要、备份路径及证据影响；用户审阅并明确授权后执行 `project-migration-apply --plan <计划文件>`。

预览在临时副本核验新规则，原项目不变。应用重新核验计划及全部项目文件摘要，备份本次受影响文件到治理根之外。失败恢复本次写入；发现并发修改则保留现场并报告冲突。原业务代码、Spec、Context、批准及 checkpoint 不改写。规则变化后的合同新鲜度由本地主控重新判断，迁移不授予 ready-for-agent。

M3、未知来源、核心漂移或已有后端终点的项目拒绝迁移。保留旧插件用于旧项目只读核验；不能把新插件当作通用自动升级器。

## 验证与限制

`verify` 校验精确文件集合、模式和摘要；`doctor` 检查运行依赖；`query-plan` 提供包内只读合同查询。源码仍保留 working-tree／development-only 标识，固定 CLI 原始包未被改写。

当前开发包的实际业务就绪、真实服务与交付验收、独立审查及发布前固定来源验证分别判断。不能靠修改布尔值、原批准或源码 SHA 放行。

安装后用新任务调用 `backend-delivery`。通过项目本地主控按条件发现外部 product-design 提供者，不能仅凭包内存在资源宣布运行可用。

## 产品设计方案接收

先运行 `project-import-design --target-dir <后端治理根> --bundle <Handoff-v5交付目录或ZIP>`；再将返回的 `import_receipt_ref` 传给 `project-entry --mode reuse --input <JSON>`。入口复验原包、批准与路线，映射到本地主控的 `work-unit.technical-analysis`，固定不授予实现权限。完成目标词汇对账、Technical Design v2 逐条消费、工程契约与 Slice Contract 批准后继续后端实现。源包的前端和协调路线保持未接管状态。

新版迁移同时接受登记的 M4 与 0.2 开发包精确摘要；未知同名版本、核心漂移及已完成后端终点拒绝迁移。迁移计划只预览，应用重新核验、备份并支持失败回滚，历史批准不自动延续。
