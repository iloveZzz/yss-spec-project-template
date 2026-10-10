# Matt技能体系

Matt Engineering Skills 来自 `mattpocock/skills`，用于澄清、Spec、Ticket、实现、TDD、诊断、审查和架构治理，与 [[YSS工程技能体系]] 的专项规范共同工作。

上游技能基线保存可追溯 revision 与未经项目适配的内容；YSS 适配保存仓库身份、门禁、状态和授权约束。当前有效技能应同时保留上游内容哈希、有效内容哈希与适配依据。来源基线和当前生效内容按 [[技能投影与锁定]] 核对，不能从 README 中的版本描述推断当前技能内容。

正式新功能与较大变更先进入 Plan，再由 `yss-product-lifecycle` 推进 Spec、工程契约和 Ticket。`to-spec`、`to-tickets`、`implement` 是用户显式兼容入口，不能建立第二套生命周期或越过门禁；垂直切片按用户行为拆窄，禁止只按技术层横拆。现行锁定技能名保留 `code-review`、`grilling`、`domain-modeling`、`tdd` 和这些显式入口。

合格日常任务从同一 Ticket/PR 的已确认验收和当前工程基线取得公开测试 seam，不先创建批准 Slice；正式实现从当前批准 Slice 及用户决定证据取得 seam。seam 缺失或实质变化先调查并暂停依赖测试，未变确认不因时间或无关文件变化重复询问。

技术事实、标准、第三方 API 与框架行为使用 `yss-research`；竞品、市场和口碑使用 `competitive-intelligence`。业务行为默认按 `tdd` 的 `behavior-tdd`，使用已确认公开 seam 逐切片实现。一次性生成、纯配置或流程文档不适用时，记录例外理由与可执行验证。

模板按 YSS capability 白名单收录通用技能。生命周期外部输入问卷以 `external-input-required` 暂停，答案回流后重新分类影响面；`prototype` 的单文件 HTML 是回流输入，YSS 原型仍需完成现行低保真评审、档位路由、证据合同与用户确认。人工 checkpoint 与诊断输出必须脱敏。

维护与更新使用 `maintaining-skills`，由影响面决定验证强度；通用技能结果回交生命周期验收。持久知识库入口见 [[LLM Wiki]]，实现与审查边界见 [[Fresh验证与独立审查]]。

## 来源

- `CONTEXT.md`：39–43、98–100 行。
- `.template-source/agents/skills-maintenance.md`：18–35、39–68 行。
- `AGENTS.md`：5–7、11–19、34–38 行。
- `skills-lock.json`：56、125、242、287、460、490、505 行。
- `.agents/skills/tdd/SKILL.md`：20–26 行。
- `.template-spec/process/lifecycle-registry.yaml`：40–88 行。
