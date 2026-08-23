# 操作日志

## [2026-08-09] CREATE | 初始化 yss-spec-project-template 知识 wiki 骨架

创建三层结构：`raw/`（不可变源）、文章目录、`index.md`、`log.md`、`CLAUDE.md`。

## [2026-08-09] CREATE | 收录模板权威资产至 raw/

复制 9 份权威源文档：AGENTS.md、CONTEXT.md、README.md、yss-project.yaml、skills-lock.json、ADR-0002、create-yss-spec 契约、Spec 模板、垂直切片 Ticket 模板。

## [2026-08-09] CREATE | 编写知识文章

为入口身份、生命周期、契约资产、技能实现、质量治理五大类编写 22 篇文章，全部使用 `[[wikilink]]` 建立主题关联。

## [2026-08-09] ANALYZE | 生成知识图谱

运行 understand-knowledge 解析 wiki，生成交互式知识图谱。

## [2026-08-23] REBUILD | 按 llm-wiki schema 重编译本仓知识库

接入 `llm-wiki` 后走 rebuild（已有 `wiki/index.md`，禁止 init 覆盖）。重建 `.wiki-manifest.json`（schemaVersion 1，profile: documents），raw 对齐 live 并扩展流程 / Agent / 契约源；`skills-lock.json` 只保留技能名派生摘录。保留原 22 个文章 ID，新增 `LLM Wiki`。LLM 页全量重写并补 `## 来源`。`inventory.mjs hash` 后 `lint-wikilinks` 23 篇文章 / 203 条 wikilink 通过。抽查 5 条 claim 对照 live 源。

## [2026-08-23] FIX | 按 code-review 对齐 lint 契约与 wiki 边界

lint 脚本改为失败跨路径 wikilink、校验 manifest sha256，并要求 H1 等于文章 ID。通用 skill 不再写死本仓文档语言。`documents` profile 去掉 `code-surface`。H1 与 `CLAUDE.md` 按审查结论收束。

## [2026-08-23] REFRESH | 登记前端 pnpm / 后端 mvnw 验证命令

`AGENTS.md` 与根目录 `CLAUDE.md` 写入 frontend `pnpm`、backend `./mvnw` 优先序；细则落在 `docs/process/implementation-repo-integration.md`。刷新 [[Agent入口规则]] 与 [[实现仓库与跨仓库契约]]。

## [2026-08-23] REFRESH | llm-wiki 去掉外部技能关联

技能正文不再点名其他 skill。刷新 [[LLM Wiki]]：一次性笔记标为范围外，删除图谱配对与 `/deep-research` 分流表述。

## [2026-08-23] FIX | 按 skill-names 配方重放 derived 摘录

`skills-lock.json` 登记 `extract.kind: skill-names`，用 `extract.mjs` 重写 `raw/skills-lock-names.md`（只含稳定排序的技能名）。

## [2026-08-23] REFRESH | llm-wiki I1–I5 源状态、advise、ingest 与 Status
- changed: AGENTS.md, CONTEXT.md, skills-lock.json
- articles: Agent入口规则, LLM Wiki, 模板总览, 技能投影与锁定
- unmapped: (none)

同步 raw 中的 `AGENTS.md` / `CONTEXT.md`，重放 `skill-names` 摘录（内容未变）。刷新 [[Agent入口规则]]、[[LLM Wiki]] 与 [[模板总览]] 中与 ingest / refresh 分界相关的句子；新增基础设施 `concept-table.md`；`CLAUDE.md` 补 Status / INGEST。未改其余命中页：AGENTS 仅增 ingest 入口句，CONTEXT 仅澄清 ingest 不替代权威源，锁文件只变 `effectiveHash`。
