# CLAUDE.md — YSS Spec Project Template Wiki 规范

本文档是本 wiki 的 schema（结构契约），描述 Karpathy 模式三层知识库的组织约定。wiki 内所有内容以简体中文撰写，英文专有名词与代码标识保持原样。

## 三层结构

- **`raw/`** — 不可变原始源文档。从模板仓库复制的权威资产（AGENTS.md、CONTEXT.md、README.md、ADR、契约等）。只读，不修改。
- **文章（`*.md`，wiki 根目录）** — LLM 生成的知识文章。每篇对应模板的一个核心主题，使用 `[[wikilink]]` 互相引用。文件名即文章 ID（不含扩展名），必须全局唯一。
- **`index.md`** — 内容目录。`##` 节标题定义分类（topic），节下列出该分类下的文章 `[[wikilink]]`。

## 文章写作约定

- 首行为 `# H1` 标题，随后紧跟首段摘要（解析器会提取为 summary）。
- 正文使用 `[[目标文章名]]` 引用其他文章；目标必须是 wiki 内存在的文章文件名（不含 `.md`）。
- 引用真实事实：所有论断必须能追溯到 `raw/` 中的权威源文档或模板仓库资产。
- 分类归属由 `index.md` 决定，文章内不需要声明分类。

## 基础设施文件

`index.md`、`log.md`、`CLAUDE.md`、`AGENTS.md`、`soul.md` 为基础设施文件，不视为文章。

## 操作日志

`log.md` 记录 wiki 的每次操作，格式：`## [YYYY-MM-DD] OPERATION | 描述`（OPERATION 使用 CREATE / UPDATE / LINK / FIX 等动词）。
