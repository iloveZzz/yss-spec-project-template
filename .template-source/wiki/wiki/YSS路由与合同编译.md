# YSS路由与合同编译

`yss-implementation-contract-compiler` 把冻结资产与垂直切片编译成当前实现合同和最小 Skill 集。路由以登记的工程与影响面为输入，合同批准、实现就绪和最终完成由生命周期掌握。

先由生命周期唯一 `request_triage.delivery_path` 政策与支持的 CLI 判定任务路径。合格日常任务按需求验收选择适用 YSS 技术 Skill，在同一 Ticket/PR 留实现、测试、独立审查及回滚证据；正式切片才按下述合同编译、批准与就绪要求推进。专项技能不自行授予日常资格，已有正式绑定不能降级。

## 权威路由输入

实现前先按工程接入事实源登记仓库、项目根、分支、CI、验证命令和回滚点，再用 `yss-implementation-contract-compiler` 编译最小 Skill 集与当前合同。`CONTEXT.md` 在规划至实现全程消费；稳定术语先登记，再以 `<ContextId>/<EnglishIdentifier>` 引用，跨上下文使用 `Global/<EnglishIdentifier>`。

Skill 来源、版本和投影由 `skills-lock.json` 记录；路由由 `.template-spec/agents/yss-skill-registry.yaml` 记录。当前 active 注册表、校验通过的 canonical Skill 及 alias 解析结果必须由实现合同编译器、生命周期和实例发现面共同消费。`.agents/skills` 是共享 Skill 权威目录，其他 Agent root 的同名文件为生成投影。

## 选择与权限边界

核心 Skill 提供生命周期控制和通用研发入口；专项 Skill 根据前端、后端、OpenAPI 或组件影响按需选择，试验 Skill 不进入合同编译器默认 Skill 闭包。用户显式调用的兼容入口写入前仍需生命周期预检，不能另起生命周期或越过门禁。

合同编译器只生成 Slice 草案，由生命周期批准并持久化；它不能批准合同、设置 `ready-for-agent` 或宣布完成。新 Slice v3 单点保存依据、范围、冻结 Skill、工作单元和验证要求，专项实现消费批准且当前的合同。

无工程时先确认外部仓库或输出目录。Backend `scaffold_status=required` 时，生命周期推荐 `domain-driven` 或 `layered-mvc`，用户逐项目确认后路由；Frontend 使用 `yss-frontend-scaffold-generator`，缺目录不会改变路由。脚手架还需已确认且当前的架构决策与批准的 Project Scaffold Contract schema v4。

## 执行结果与重路由

专项 Skill 返回 YSS Skill Execution Result，记录合同版本、变更文件、证据、实际验证、延期 seam、偏离与新增影响；实现者自报结果仍需编译器、生命周期和独立 Reviewer 复核。

路径越界、证据缺失、未执行验证、`drift`、`violation` 或 `new_impacts` 时停止实现并重新路由。工作区接入见 [[实现仓库与跨仓库契约]]，行为输入见 [[垂直切片Ticket]]，批准边界见 [[切片实现合同]]，共享技能治理见 [[技能投影与锁定]] 和 [[YSS工程技能体系]]。

## 来源

- `AGENTS.md`：5–7、11–19、34–38 行。
- `CONTEXT.md`：64、64–65、65、95–98、100 行。
- `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml`：205–226、1158–1172、1210–1229 行。
- `.template-spec/agents/yss-skill-registry.yaml`：1–15 行。
- `.template-spec/process/implementation-repo-integration.md`：7–15 行。
- `.agents/skills/code-review/references/yss-review-standards.md`：54–65 行。
