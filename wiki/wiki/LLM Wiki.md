# LLM Wiki

LLM Wiki 是由 `raw/`、`wiki/` 与 `.wiki-manifest.json` 组成的本地持久知识库。它是中间表示（IR），live 源才是事实；一次性笔记不在本技能范围，也不替代权威源。

三层布局：`raw/` 保存不可变拷贝与标明 live 输入的派生摘录，不得靠改 raw「修正」事实；`wiki/` 保存 LLM 文章以及 `index.md`、`log.md`、`CLAUDE.md`；`.wiki-manifest.json` 是编译图，与 `raw/`、`wiki/` 并列，不是文章也不是 raw 源。文章 ID 等于文件名去掉 `.md`。`index.md`、`log.md`、`CLAUDE.md`、`AGENTS.md`、`soul.md` 是基础设施文件，不视为文章。本模板 wiki 的入口分类见 [[模板总览]]。

模式只有 `init`、`refresh`、`rebuild`、`lint`。已有 `wiki/index.md` 禁止 `init` 覆盖，应询问 refresh 还是 rebuild。`refresh` 只改漂移命中的文章，且 `human-owned` 不改。`rebuild` 让 raw 对齐 live，保留稳定 ID 与 human-owned，全量重写 LLM 页。查询不是模式：有 wiki 就从 wiki 回答。

本技能只维护持久 wiki：`init` / `refresh` / `rebuild` / `lint`。强制入口见 [[Agent入口规则]]。查询不是模式：有 wiki 就从文章回答。

本 wiki 的 manifest 使用 `schemaVersion` `1`、`profile` `documents`。编译图还允许 `mixed`（文档 + 代码）与 `code`；source `kind` 为 `document`、`derived` 或 `code-surface`。Agent 填写 `id`、`kind`、`livePath`、`rawPath`、`role`、`articles`；脚本填充 `sha256`、`compiledAt`、`gitCommit`。文章以 `# H1`、摘要段、正文和 `## 来源` 写成，站内只用双方括号包裹的文章 ID 互引。

`llm-wiki` 已写入锁文件 `shared` 分组（`source: project`），并在 `yss-skill-registry.yaml` 中登记为 `layer: core`、`maturity: verified`、`instance_default_discoverable: true`、`impacts: [quality]`。该注册表仍是 `status: shadow`，不得据此裁剪 Router / 生命周期发现面。`llm-wiki` 不在 `yss-public-skills.json`；公开发布面只放 `yss-*` 工程技能（见 [[技能投影与锁定]] 与 [[YSS工程技能体系]]）。权威源修订后应 refresh / rebuild，复盘见 [[复盘与权威资产修订]]；技能变更强度走 [[模板维护流程]]。

## 来源

- `.agents/skills/llm-wiki/SKILL.md`
- `.agents/skills/llm-wiki/references/schema.md`
- `.agents/skills/llm-wiki/references/compile.md`
- `AGENTS.md`
- `CONTEXT.md`
- `skills-lock.json`
- `docs/agents/yss-skill-registry.yaml`
- `wiki/.wiki-manifest.json`
- `yss-public-skills.json`
