# LLM Wiki

LLM Wiki 是由 `raw/`、`wiki/` 与 `.wiki-manifest.json` 组成的本地持久知识库。文章提供理解和导航，事实定义仍由 live 权威源持有。

该知识库与 `yss-research` 的一次性研究包分开；`ingest` 将用户点名外源或已落盘研究笔记编入 IR，不改 live 权威文件。根 `CONTEXT.md` 明确本仓模板源 Wiki 入口为 `.template-source/wiki`；模板实例分发面不包含这棵编译树。现行阅读树保留在模板源，维护日志、审查候选与历史证据位于仓外运行目录。

注册表中 `llm-wiki` 是 `layer: core`、`maturity: verified`、`instance_default_discoverable: true` 的质量技能。共享技能目录 `.agents/skills` 是权威内容，各运行时入口使用生成投影；客户端入口和成熟度以注册表为准。

Wiki 中的解释不能另定义阶段、门禁、工作单元或 Skill 路由。词汇回查根 `CONTEXT.md`，生命周期回查注册表，Skill 来源和投影回查 `skills-lock.json`。如阅读视图与权威源不一致，以当前权威源核对并修订阅读视图。

编译、查询、manifest 合同与事务规则分别见 canonical `llm-wiki/SKILL.md` 及其 `references/schema.md`、`references/compile.md`、`references/query.md`、`references/transactions.md`。本页只解释知识库在模板中的位置；执行工具时从现行技能入口加载适用合同。

共享技能发生变更时用 `maintaining-skills`，同步投影、更新锁文件并按影响面验证。技能维护见 [[技能投影与锁定]]，事实源回流见 [[复盘与权威资产修订]]，总体入口见 [[模板总览]]。

## 来源

- `CONTEXT.md:79-79`、`CONTEXT.md:101-110`。
- `AGENTS.md:14-24`、`AGENTS.md:33-39`。
- `.template-spec/agents/yss-skill-registry.yaml:435-440`。
- `.template-source/agents/skills-maintenance.md:7-12`、`:36-68`。
