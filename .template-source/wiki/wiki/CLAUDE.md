# CLAUDE.md — Wiki schema

本文档是本 wiki 的 schema（结构契约）。正文语言遵循宿主项目的文档语言规则；英文专有名词、类名、枚举值、表名与 API 路径保持原样。

本 wiki 收录本仓库模板源流程知识。权威事实以 live 文件为准。

## 三层结构

- **`raw/`** — 当前完整来源快照或标明抽取规则的派生摘要。依据 live 通过统一事务刷新；旧字节保存在仓外恢复材料，不通过手改快照修正事实。
- **文章（`wiki/*.md`）** — LLM 生成的知识文章。文件名（不含 `.md`）即文章 ID，必须全局唯一。使用 `[[wikilink]]` 互引。
- **`index.md`** — 内容目录。`##` 节标题定义分类；节下列出该分类下的 `[[wikilink]]`。

## 文章写作约定

- 首行为 `# H1`，H1 文本等于文章 ID，随后紧跟首段摘要。
- 正文使用 `[[目标文章名]]`；目标必须是本 wiki 内存在的文章文件名（不含 `.md`）。
- 论断必须能追溯到 `raw/` 或 live 代码路径。文末使用 `## 来源`。
- 分类归属由 `index.md` 决定。
- 可选 frontmatter：`human-owned: true` 时 refresh / rebuild 不得重写正文。
- 仅当多个来源冲突，或 live 与旧 raw 不一致时写可选 `## Status`（`Disputed` / `Outdated`）。单一 live 正确则不写。`human-owned` 页不写 Status。

## 基础设施文件

`index.md`、`log.md`、`CLAUDE.md`、`AGENTS.md`、`soul.md`、`concept-table.md` 为基础设施文件，不视为文章。

## 操作日志

本模板源的 `log.md` 仅保留最新运行入口。完整计划、旧日志、迁移备份及事务收据位于当前工作区仓外 `maintenance:wiki/<wiki-id>/`。

`.wiki-manifest.json` 使用 schema v2：文章消费来源版本与逐条证据，结构检查和当前性分开核验。所有写入通过 canonical `llm-wiki` 的 plan/apply 事务；历史版本只读，迁移本身不表示内容已经刷新。
