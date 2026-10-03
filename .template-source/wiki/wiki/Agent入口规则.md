# Agent入口规则

`AGENTS.md` 是 Agent 的启动入口，只保存身份路由、硬门禁和禁止事项。执行任务先核验根 `yss-project.yaml`，随后读取根目录唯一、大小写精确的 `CONTEXT.md`，并按影响面选择权威规则与工作单元。

## 读取顺序与事实源

`template-source` 走 [[模板维护流程]]，`project-instance` 走 [[产品研发生命周期]]。身份缺失、非法或 schema 不支持时停止并迁移检查。阶段、门禁、产物、工作单元、证据和稳定 ID 由生命周期注册表定义；阅读地图不另定义事实。Skill 来源、版本与投影由锁文件管理，路由由技能注册表管理；数字人角色、运行时和会签由角色表管理。

规划至实现全程消费 `CONTEXT.md` 的文首合同。词汇未冻结或不可读时保持 `blocked`，禁止创建嵌套词汇表、`CONTEXT-MAP.md` 或伪锚点。稳定业务术语先登记，引用用 `<ContextId>/<EnglishIdentifier>`；跨业务责任区用 `Global/<EnglishIdentifier>`。中文名称、英文词干、含义或适用范围变化都先回写词汇表。

持久化生命周期文档用简体中文，英文专名、代码 / API 标识、schema、命令、文件名和 metadata 保持原样。新流程统一用 Spec、Ticket、`to-spec`、`to-tickets`。项目实例在每个工作单元批准或流转前完成 `context_reconciliation`；模板源校验模板合同并写有原因的 `not-applicable`。

## 实现前必须就绪

实现仓库先登记项目根、分支、CI、验证命令和回滚点。正式切片只消费已批准、已持久化且当前的 [[切片实现合同]]；`yss-implementation-contract-compiler` 起草最小 Skill 集和合同，不能批准、设置 `ready-for-agent` 或宣布完成。

新建后端需要脚手架时，先逐项目确认 `domain-driven` / `layered-mvc` 架构，再持久化并批准 Project Scaffold Contract schema v4。生成器只生成机械骨架；既有工程不得重选或覆盖。UI 切片提升为 `ready-for-agent` 前，需要已校验的前端实现计划；实现后补还原验证，覆盖截图 / 视觉回归、状态交互、console warning 和实际 `pnpm` 退出码。

运行时代码默认进入已登记的独立仓库。用户明确选择后可使用 `apps/backend/<project>`、`apps/frontend/<project>`，或以真实 gitlink 接入子模块；禁止输出到 `app/backend/`、`app/frontend/`。前端验证优先 `pnpm`，后端优先根 `./mvnw`；缺失时记录受控例外与实际命令。

Spec、设计、原型、OpenAPI Draft 和待冻结资产用 `ready-for-human`。只有门禁通过、阻塞清除并可直接实现的垂直切片才能用 `ready-for-agent`。延期 seam 必须记录风险、责任人、后续 Ticket、验证计划及目标版本或发布日期，见 [[Ticket与流程状态]]。

## 专项路由与完成边界

技术事实与标准走 `yss-research`，竞品和市场口碑走 `competitive-intelligence`。产品设计由 `yss-prototype-stage` 持有合同，原型禁用生产实现 Skill `yss-ui`。业务行为默认用 `tdd` 的 `behavior-tdd`，消费已确认的公开 seam；纯配置、流程文档等不适用时记录例外及可执行验证。

实现者不做独立审查，Reviewer 不写实现。首轮覆盖全部适用检查；修复后按差异、受影响结论和依赖定向复审，并重绑当前候选。任何完成结论基于 Fresh Verification；历史结果或自述不能放行当前任务。`drift`、`violation`、`new_impacts` 或证据缺失时停止实现并重新路由，见 [[Fresh验证与独立审查]]。

用户关键决定必须绑定已展示资产和真实回复；数字人不能代答。会签按角色表核验，批准期望上下文来自当前任务或 checkpoint。交付验收不授予提交、推送或发布权限；这些动作按已取得的范围授权执行。Subagent 使用不重叠写范围的任务包，最终身份、Ticket 状态和完成结论由主控裁决。

## 来源

- `AGENTS.md`：5–39、41–94、96–98 行。
- `CONTEXT.md`：6–14、22–38、44–55、63–73、107–115 行。
