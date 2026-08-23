# skills.sh / GitHub 上的 LLM Wiki 技能与能力（外部一手调研）

- 调研日期：2026-08-23
- 范围：外部公开一手源（skills.sh 页面、GitHub 仓库源码、gist、README、`SKILL.md`）
- 不覆盖：本仓 skill 适配建议、二手博客、未落到 `SKILL.md` / README 的评论转述
- 存放：`.template-source/research/`。对照与借鉴建议见同目录 `research-llm-wiki-skills-sh-github-2026-08-23.md`。本文件不得放进已 `complete` 的 `evidence/reviews/`。

数字（安装数、stars）均为该日抓取时页面或 GitHub REST API 明示值；skills.sh 安装数与 GitHub stars 口径不同，且部分 stars 属于宿主大仓而非单个 skill。

---

## 1. 研究范围与方法

### 1.1 问题

Karpathy 提出的 LLM Wiki pattern 在公开 Agent Skills 生态中有哪些实现，各自声明了哪些可核验能力（模式、三层架构、源类型、增量、lint、图谱、发布、多模态、查询时是否回读 live 源）。

### 1.2 方法

1. 读取 `https://www.skills.sh/` 首页、`/about`、`/docs`，以及 [vercel-labs/skills README](https://github.com/vercel-labs/skills)。
2. 抓取任务指定的 8 条 skills.sh 条目页，并对照对应 GitHub 仓库的 `SKILL.md` / README / 目录。
3. 抓取 Karpathy gist 原文，以及任务列出的额外 GitHub 实现。
4. 用 GitHub 仓库搜索（`llm-wiki in:name`，按 stars）和 `filename:SKILL.md` 代码搜索补高 star / 高安装量变体；每条只在落到 `SKILL.md` 或 README 后写入对照。
5. 安装数仅记录 skills.sh 条目页明示的 `Installs`；stars 仅记录 GitHub API `stargazers_count` 或 skills.sh 条目页明示的 `GitHub Stars`。

### 1.3 覆盖清单

| 类别 | 实现 |
| --- | --- |
| 权威 pattern | Karpathy gist |
| 指定 skills.sh 条目 | astro-han/karpathy-llm-wiki；ar9av/obsidian-wiki；alirezarezvani/claude-skills `llm-wiki`；nousresearch/hermes-agent `llm-wiki`；nanzhipro/Karpathy-llm-wiki-bootstrap-skill；ndjordjevic/pin-llm-wiki；egonex-ai/understand-anything（原 lum1104）；guanyang/llm-wiki |
| 指定额外 GitHub | llmrix-inc/llm-wiki-skill（`llmrix/llm-wiki-skill` 301 到此）；One4Shell/llm-wiki-skill；noaul/llm-wiki（`uovme/llm-wiki` 301 到此）；JanYork/llm-wiki-cli |
| 补入对照的高 star / 高安装变体 | nashsu/llm_wiki + nashsu/llm_wiki_skill；sdyckjq-lab/llm-wiki-skill；SamurAIGPT/llm-wiki-agent；atomicstrata/llm-wiki-compiler；nvk/llm-wiki；aaronoah/llm-wiki-skill |

---

## 2. skills.sh 平台本身

### 2.1 它是什么

首页标题为 “The Agent Skills Directory / The Open Agent Skills Ecosystem”，并写：

> Skills are reusable capabilities for AI agents. Install them with a single command to enhance your agents with access to procedural knowledge.

来源：<https://www.skills.sh/>（2026-08-23 抓取）。

About 页写明运营方与索引机制：

> skills.sh is the open directory for AI agent skills.
>
> We index every public skill that ships through the open skills CLI and rank them by anonymous install telemetry. Every skill page shows the source repo, install count, originating organization, agents the skill is most-used on, and security audit results from our partners.
>
> skills.sh is operated by Vercel as part of the open agent skills ecosystem. The CLI, the ingestion pipeline, and this site are open source.

来源：<https://www.skills.sh/about>。

文档页写明 CLI 仓库：

> The `skills` CLI that powers this leaderboard is open source at github.com/vercel-labs/skills.

来源：<https://www.skills.sh/docs>。

### 2.2 如何发现与安装技能

首页提供搜索框（“Search skills...”）和 “Skills Leaderboard”（按 8W Activity / Installs）。2026-08-23 首页排行榜前排是 `find-skills`、`grill-me`、`frontend-design` 等，**未见 llm-wiki 条目进入首页可见榜单**。来源：<https://www.skills.sh/>。

安装协议由 CLI 定义。`vercel-labs/skills` README：

```bash
npx skills add vercel-labs/agent-skills
```

并列出源格式：`owner/repo`、完整 GitHub URL、仓库内 skill 路径、GitLab URL、任意 git URL、本地路径。另有 `npx skills use ...`（不安装、生成临时 prompt）。来源：<https://github.com/vercel-labs/skills/blob/main/README.md>。

About 页对排名口径：

> Rankings come from anonymous, deduplicated install counts collected by the skills CLI when users opt in. We track which skills are installed and on which agents, but no personal information or session content is collected. Deduplication runs hourly to prevent artificial inflation.

安全：

> Every indexed skill goes through routine security audits performed by partner providers. ... Skills that fail every partner audit are excluded from the directory entirely.

来源：<https://www.skills.sh/about>。

文档还提供 README badge：`https://skills.sh/b/owner/repo`。来源：<https://www.skills.sh/docs>。

### 2.3 首页与 llm-wiki 相关条目

首页排行榜未列出 llm-wiki。相关条目通过搜索或直接 URL 访问。本轮在 skills.sh 上核验到的 llm-wiki 相关条目见第 4 节各实现的 “skills.sh” 行。

另有搜索命中但未作为对照主条目的页面：

| URL | 安装数（页面明示） | 备注 |
| --- | --- | --- |
| <https://www.skills.sh/kiluazen/kstack/llm-wiki> | 15 | GitHub stars 1；`SKILL.md` 摘要可见 |
| <https://www.skills.sh/karlorz/llm-wiki/wiki-init> | 1 | 仅 bootstrap `wiki-init` |
| <https://www.skills.sh/kfchou/wiki-skills/wiki-init> | 66 | 仅 bootstrap |
| <https://www.skills.sh/aradotso/trending-skills/llm-wiki-skill> | （2026-08-23 返回 404） | 搜索摘要曾显示 523 installs、Security Audits Fail；当日无法复核 |

---

## 3. Karpathy 原始 pattern

- URL：<https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>
- 原始文本：<https://gist.githubusercontent.com/karpathy/442a6bf555914893e9891c11519de94f/raw>
- 性质：idea file，不是可安装 skill；“designed to be copy pasted to your own LLM Agent”。

### 3.1 核心主张（原文）

> Instead of just retrieving from raw documents at query time, the LLM **incrementally builds and maintains a persistent wiki** ... The knowledge is compiled once and then *kept current*, not re-derived on every query.
>
> This is the key difference: **the wiki is a persistent, compounding artifact.**
>
> You never (or rarely) write the wiki yourself — the LLM writes and maintains all of it.
>
> Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase.

### 3.2 三层架构（原文）

1. **Raw sources**：articles, papers, images, data files；immutable；LLM 只读不改。
2. **The wiki**：LLM-generated markdown；LLM 完全拥有该层。
3. **The schema**：如 `CLAUDE.md` / `AGENTS.md`；约定结构与 ingest / query / lint 工作流。

### 3.3 操作（原文）

- **Ingest**：源进入 raw，讨论要点，写 summary，更新 index / entity / concept，追加 log；“A single source might touch 10-15 wiki pages.”
- **Query**：在 wiki 上搜索并带引用作答；答案可回写为新页。“good answers can be filed back into the wiki as new pages.”
- **Lint**：矛盾、过时主张、orphan、缺页、缺交叉引用、可用 web search 填的数据缺口。

特殊文件：`index.md`（内容目录）、`log.md`（append-only；建议 `## [2026-04-02] ingest | Article Title` 前缀）。

### 3.4 源类型与可选工具（原文）

源示例：articles, papers, images, data files, journal entries, podcast notes, Slack, transcripts, PDFs（作为 raw）。可选：Obsidian Web Clipper、本地下载图片、graph view、Marp、Dataview、git。可选 CLI：`qmd`（BM25/vector + MCP）。

文档末尾声明：

> This document is intentionally abstract. It describes the idea, not a specific implementation. ... Everything mentioned above is optional and modular.

因此后续实现的目录名、子命令、脚本、图谱、发布层都是各仓自己的具体化，不是 gist 强制合同。

---

## 4. 各实现能力清单

### 4.1 astro-han / karpathy-llm-wiki

- 仓库：<https://github.com/Astro-Han/karpathy-llm-wiki>
- skills.sh：<https://www.skills.sh/astro-han/karpathy-llm-wiki/karpathy-llm-wiki>
- 技能名：`karpathy-llm-wiki`
- 安装命令（skills.sh）：`npx skills add https://github.com/astro-han/karpathy-llm-wiki --skill karpathy-llm-wiki`
- README 另写：`npx add-skill Astro-Han/karpathy-llm-wiki`
- skills.sh Installs：6.6K；First Seen：Apr 5, 2026；Security Audits：Gen Agent Trust Hub Pass
- GitHub stars（API，2026-08-23）：1987（skills.sh 显示 2.0K）

**模式：** ingest / query / lint。无独立 `init` 子命令；首次 ingest 时创建 `raw/`、`wiki/`、`wiki/index.md`、`wiki/log.md`。Query 默认不写文件；用户明确 archive 才写新页。另有显式 “Research (multi-source ingest)”。来源：仓库根 `SKILL.md`。

**三层：** `raw/`（只读）+ `wiki/<topic>/<article>.md`（一层 topic）+ **本 `SKILL.md` 即 schema 层**。无独立 `SCHEMA.md` / inbox / Obsidian vault 约定。来源：`SKILL.md` “Architecture”。

**源类型：** README FAQ：“Web pages, papers, blog posts, PDFs, markdown files, text files, and pasted text.” 无 YouTube / 图片一等公民声明。

**增量 / 矛盾 / 引用 / human-owned / lint：**

- Triage：New / Update / Disputed / No material。
- 冲突标 `Status: Disputed`；取代标 `Status: Outdated`；“Never silently rewrite history.”
- Grounding Invariant：数字、日期、直接引语必须能在 Raw 链接的 raw 文件中 verbatim 找到。
- Query 默认不写；archive 页无 Raw 字段。
- Lint：index 一致性、内链、Raw 引用、See Also 可自动修；`scripts/check_evidence.py` 做 source fidelity（只报告不自动改事实）；判断类报告含矛盾、orphan、缺交叉引用。

**脚本：** `scripts/check_evidence.py`。无独立 CLI 产品。

**查询是否回读 live 源：** `SKILL.md` Query 步骤只读 `wiki/index.md` 与 wiki 全文搜索；“Prefer wiki content over your own training knowledge.” 未要求回读 raw 或现场网页。Research 模式才会 web search 并写入 raw。

**刻意不做（README Design Boundaries）：** source-hash freshness、行号引用、数值置信度、per-article review dates、vector/graph search、typed relationship ontologies、MCP/UI。

---

### 4.2 ar9av / obsidian-wiki

- 仓库：<https://github.com/Ar9av/obsidian-wiki>
- skills.sh：<https://www.skills.sh/ar9av/obsidian-wiki/llm-wiki>
- 技能名：`llm-wiki`（理论 skill）；同仓还有 `wiki-ingest`、`wiki-query`、`wiki-lint`、`wiki-capture`、`wiki-rebuild` 等共 39 个 skill（README：“All 39 skills”）
- 安装：`npx skills add https://github.com/ar9av/obsidian-wiki --skill llm-wiki`；README 主路径是 `pip install obsidian-wiki` + `obsidian-wiki setup --vault ~/brain`
- skills.sh Installs：3.6K；First Seen：Apr 6, 2026；Pass
- GitHub stars（API）：3267（skills.sh 显示 3.3K）

**模式（README + `.skills/` 目录）：** setup / ingest / update（代码仓蒸馏）/ capture / history-ingest（claude/codex/copilot/hermes/openclaw/pi）/ query / narrate / digest / lint / dedup / cross-linker / status / rebuild（archive/rebuild/restore）/ export / import / synthesize / research / graph-colorize / dashboard / stage-commit 等。

**三层：**

- Layer 1：用户原始文档，路径由 `OBSIDIAN_SOURCES_DIR` 配置；**不是** vault 内 `_raw/`。
- `_raw/`：scratch inbox，给 `wiki-capture` / `wiki-ingest` 暂存；promote 时 move 不 delete。
- Layer 2：Obsidian vault（`OBSIDIAN_VAULT_PATH`），`concepts/` `entities/` `skills/` `references/` `synthesis/` `journal/` + `projects/<name>/`。
- Layer 3：本 skill + config / `AGENTS.md`。
- `.manifest.json`：增量 delta 的骨干。
- 另有 `_archives/`、`_staging/`（`WIKI_STAGED_WRITES`）、`_meta/trust-ledger.json`。

来源：`.skills/llm-wiki/SKILL.md`。

**源类型：** README：“docs, PDFs, chat exports, meeting transcripts, screenshots, URLs”；skill 将 images 作为 first-class（Read tool vision）；学术论文有 Paper Deep-Dive Template（LaTeX、图表、PDF 页嵌入）。代码仓由 `wiki-update` + CodeGraph。

**增量 / 矛盾 / 引用 / human-owned / lint：**

- Append / Rebuild / Restore；manifest 做 delta。
- 主张标记：默认 extracted；`^[inferred]` / `^[ambiguous]`。
- `relationships:` 类型含 `contradicts`。
- `lifecycle: draft | reviewed | verified | disputed | archived`；**reviewed / verified / disputed 仅人类可改**（“Human edit only”）。
- `base_confidence` 公式 + source-quality buckets；lint 校验 trust-ledger，不从 URL 字符串重算。
- `tier: core | supporting | peripheral`；human override always wins。
- 可选 QMD 语义索引；vault 才是 SoT。

**脚本 / CLI：** `obsidian-wiki` CLI（setup、sessions-build、sessions-query 等）；`scripts/manifest.py`、`daily-update.sh`。可 Docker/HTTP/MCP 部署（README Deployment）。

**查询是否回读 live 源：** `wiki-query` 走 index / frontmatter / grep / 可选 QMD；技能描述为对已编译 wiki 作答。未在 `llm-wiki` skill 中要求查询时重抓 URL。`wiki-research` 是单独的研究 skill。

---

### 4.3 alirezarezvani / claude-skills（llm-wiki）

- 仓库：<https://github.com/alirezarezvani/claude-skills>
- skill 路径：`engineering/llm-wiki/skills/llm-wiki/SKILL.md`（另有 `.gemini/skills/llm-wiki/SKILL.md`）
- skills.sh：<https://www.skills.sh/alirezarezvani/claude-skills/llm-wiki>
- 技能名：`llm-wiki`；version 2.9.0
- 安装：`npx skills add https://github.com/alirezarezvani/claude-skills --skill llm-wiki`
- skills.sh Installs：686；First Seen：Apr 12, 2026；Pass
- GitHub stars（API）：24828（**整个 claude-skills 大仓**，skills.sh 显示 24.8K）

**模式：** `/wiki-init` `/wiki-ingest` `/wiki-query` `/wiki-lint` `/wiki-log`。子代理：`wiki-ingestor`、`wiki-linter`、`wiki-librarian`。来源：该 `SKILL.md`。

**三层：** `raw/` + `wiki/{index,log,entities,concepts,sources,comparisons,synthesis}` + `CLAUDE.md` / `AGENTS.md`。明确 Obsidian vault。

**源类型：** “Articles, papers, PDFs, images, data”；quick start 示例 PDF。Obsidian Web Clipper + `raw/assets/`。

**增量 / 矛盾 / lint：** ingest 讨论后更新 10–15 页；lint 含 contradictions、stale、orphans、missing cross-refs、gaps（可 web search）。Iron rule：LLM 永不改 `raw/`。

**脚本：** 纯 stdlib Python：`init_vault.py`、`ingest_source.py`、`update_index.py`、`append_log.py`、`wiki_search.py`（BM25）、`lint_wiki.py`、`graph_analyzer.py`、`export_marp.py`。

**查询是否回读 live 源：** Query 读 `index.md` 再下钻 wiki；“Good answers get filed back”。未声明默认回读 raw 或现场网页。规模超约 500 页时文档指向另接 RAG（`rag-design`）。

---

### 4.4 nousresearch / hermes-agent（llm-wiki）

- 仓库：<https://github.com/nousresearch/hermes-agent>
- skill 路径：`skills/research/llm-wiki/SKILL.md`（version 2.1.0）
- skills.sh：<https://www.skills.sh/nousresearch/hermes-agent/llm-wiki>
- 技能名：`llm-wiki`
- 安装：`npx skills add https://github.com/nousresearch/hermes-agent --skill llm-wiki`
- skills.sh Installs：414；First Seen：Apr 8, 2026；Security Audits：**Warn**
- GitHub stars（API）：234521（**整个 hermes-agent**，skills.sh 显示 234.4K）

**模式：** init（创建目录 + SCHEMA）/ ingest / query / lint / archive。每会话强制 orientation：读 `SCHEMA.md`、`index.md`、最近 log。来源：该 `SKILL.md`。

**三层：** 默认 `WIKI_PATH` 或 `~/wiki`。`raw/{articles,papers,transcripts,assets}` 与 wiki 页（`entities/` `concepts/` `comparisons/` `queries/`）同根；`SCHEMA.md` 为 Layer 3。index/log 在 wiki 根，不在 `wiki/` 子目录。

**源类型：** URL（`web_extract`）、PDF、粘贴文本。Obsidian 兼容；可选 `obsidian-headless` 同步。

**增量 / 矛盾 / 引用 / lint：**

- raw frontmatter `sha256`：同 URL 再 ingest 时跳过或标 drift。
- 页阈值：2+ sources 或对单源 central 才建页。
- 矛盾：记双方 + `contradictions:` + `contested: true`。
- Provenance：`^[raw/articles/source-file.md]`。
- Lint 含 orphan、broken wikilinks、index 完整性、frontmatter、stale（>90 天）、contradictions、confidence、source drift、页长 >200、tag 审计、log 轮转（>500 条）。

**脚本：** skill 内无独立 CLI；lint 用 `execute_code` 扫描。提到外部 [atomicmemory/llm-wiki-compiler](https://github.com/atomicmemory/llm-wiki-compiler)（现公开仓名为 atomicstrata/llm-wiki-compiler）。

**查询是否回读 live 源：** Query 读 index +（100+ 页时）`search_files`，再读 wiki 页。未要求回读 raw 或现场网页。

---

### 4.5 nanzhipro / Karpathy-llm-wiki-bootstrap-skill

- 仓库：<https://github.com/nanzhipro/Karpathy-llm-wiki-bootstrap-skill>（GitHub 显示 `Karpathy-llm-wiki-bootstrap-skill`；skills.sh slug 为小写）
- skill 路径：`skill/SKILL.md`（name: `llm-wiki-bootstrap`，version 0.1.0）
- skills.sh：<https://www.skills.sh/nanzhipro/karpathy-llm-wiki-bootstrap-skill/llm-wiki-bootstrap>
- 安装（README）：`npx skills add nanzhipro/Karpathy-llm-wiki-bootstrap-skill@llm-wiki-bootstrap`
- skills.sh 页：`npx skills add https://github.com/nanzhipro/karpathy-llm-wiki-bootstrap-skill --skill llm-wiki-bootstrap`
- skills.sh Installs：265；First Seen：Apr 12, 2026；Pass
- GitHub stars（API）：105

**模式：** bootstrap / ingest / query / lint / BM25 / 配置 `EXTEND.md`。来源：`skill/SKILL.md` Intent Router。

**三层：** `raw/` + `wiki/` + **`SCHEMA.md` 为生成 wiki 内唯一操作合同**；`CLAUDE.md` / `AGENTS.md` / `.github/copilot-instructions.md` 只做薄指针。另有 `wiki/concept-table.md`、`wiki/overview.md`、可选 `scripts/wiki_fts.py`、`indexes/`、`exports/`。仓内 `llm-wiki/` 是参考 wiki，不是 skill 包本身。

**源类型：** README：“articles, papers, books, research notes”；bootstrap 问卷示例 “Web articles”。硬规则：“Preserve source language during ingest unless the user asks for a different wiki language.”

**增量 / 矛盾 / lint：** ingest 编译进 wiki 并更新 concept-table；lint 含 contradictions、stale claims、orphans、concept-table drift、broken links、BM25 freshness。Query 缺信息时建议源或建 stub，**不自动 web 回写**（`skill/references/workflows/query.md` “When Wiki Cannot Answer”）。

**脚本：** 技能包内模板 `references/templates/wiki_fts.py`，生成后成为 wiki 的 `scripts/wiki_fts.py`（doctor/build/search/stats）。无独立产品 CLI。

**查询是否回读 live 源：** “Never answer directly from BM25 snippets; open and read the returned wiki pages first.” 不回读 raw，不默认现场网页。

---

### 4.6 ndjordjevic / pin-llm-wiki

- 仓库：<https://github.com/ndjordjevic/pin-llm-wiki>
- skill 路径：`skills/pin-llm-wiki/SKILL.md`
- skills.sh：<https://www.skills.sh/ndjordjevic/pin-llm-wiki/pin-llm-wiki>
- 技能名：`pin-llm-wiki`
- 安装（README）：`npx skills@latest add ndjordjevic/pin-llm-wiki`；skills.sh：`npx skills add https://github.com/ndjordjevic/pin-llm-wiki --skill pin-llm-wiki`
- skills.sh Installs：70；First Seen：Apr 30, 2026；Pass
- GitHub stars（API）：76

**模式：** `/pin-llm-wiki` 子命令 `init` / `ingest [<url>]` / `lint` / `queue` / `remove`。SKILL.md Git policy 还提到 `refresh`，但 Phase 1 子命令表未把 `refresh` 标为 implemented。Guard：除 init 外必须存在 `.pin-llm-wiki.yml`。来源：`SKILL.md`、README。

**三层：** `inbox.md`（人类丢 URL）→ `raw/{github,youtube,web}` → `wiki/{index,overview,log,sources,.archive}` + 生成的 `AGENTS.md` + `.pin-llm-wiki.yml`。无独立 SCHEMA.md 文件名；schema 在生成的 `AGENTS.md`。

**源类型：** GitHub（`gh`）、YouTube（`yt-dlp` 字幕）、Web（crawl + 可选 companion GitHub）。GitHub URL 带 `/blob/` 等路径时只当单页 web。

**增量 / 矛盾 / 引用 / lint：** inbox 队列；ingest 写 cited wiki 页。README Limits：“Phase 1 lint defers contradiction and terminology-collision checks.” `lint.md` 列出 12 项，#2 contradictions 与 #6 terminology collisions 为 deferred。citation path 格式强制相对路径。`remove` soft-delete 到 `wiki/.archive/`。

**脚本：** 无独立 CLI 二进制；依赖环境里的 `gh` / `yt-dlp`。禁止 skill 自动 `git commit` / `git push`。

**查询是否回读 live 源：** 无独立 query 子命令。生成 `AGENTS.md` 指示：先读 `wiki/index.md`；wiki 没有答案时再 “fetch current information online”。这是生成 wiki 的 agent 手册，不是 pin skill 的 query 协议。

---

### 4.7 lum1104 → egonex-ai / understand-anything（understand-knowledge）

- 仓库：<https://github.com/Egonex-AI/Understand-Anything>（`lum1104/understand-anything` API 301 到此）
- README 写：“Originally created by Lum1104.”
- skill 路径：`understand-anything-plugin/skills/understand-knowledge/SKILL.md`
- skills.sh：<https://www.skills.sh/lum1104/understand-anything/understand-knowledge>（页上安装命令已指向 `egonex-ai/understand-anything`）
- 技能名：`understand-knowledge`
- 安装（skills.sh）：`npx skills add https://github.com/egonex-ai/understand-anything --skill understand-knowledge`
- skills.sh Installs：2.1K；First Seen：Apr 12, 2026；Pass
- GitHub stars（API）：80166（**整个 Understand-Anything 产品**，skills.sh 显示 80.1K）

**模式：** 这是 **分析器 / 图谱生成器**，不是 wiki 维护器。Phase：DETECT → SCAN → ANALYZE → MERGE → SAVE → 自动 `/understand-dashboard`。来源：该 `SKILL.md`。

**三层检测：** raw sources、wiki markdown（`[[target]]`）、schema（`CLAUDE.md` / `AGENTS.md`）、`index.md`、`log.md`。检测信号：`index.md` + 多个带 wikilink 的 `.md`。

**源类型：** 解析 wiki markdown 与 raw 文件名/大小；“we don't parse PDFs or binary files.”

**增量 / lint / 维护：** 不提供 ingest/query/lint。输出 `$UA_DIR/knowledge-graph.json`（`.ua/` 或遗留 `.understand-anything/`）。

**脚本：** `parse-knowledge-base.py`、`merge-knowledge-graph.py`。

**查询是否回读 live 源：** 不适用；读本地 wiki 文件做图，不维护知识。

---

### 4.8 guanyang / llm-wiki

- 仓库：<https://github.com/guanyang/llm-wiki>
- skill 路径：`skills/llm-wiki/SKILL.md`（metadata version 4.1）
- skills.sh：<https://www.skills.sh/guanyang/llm-wiki/llm-wiki>
- 技能名：`llm-wiki`
- 安装：`npx skills add https://github.com/guanyang/llm-wiki --skill llm-wiki`
- skills.sh Installs：2；First Seen：Apr 28, 2026；Pass
- GitHub stars（API）：27

**模式：** `ingest` / `query` / `lint` / **`publish`** / **`refresh`**。publish 类型：`post | report | slides | tutorial | newsletter`。来源：`SKILL.md`。

**三层 + 输出层：** `raw/{articles,papers,docs,transcripts,visual,assets}` + `wiki/{index,log,log-archive,lifecycle?,entities,concepts,summaries,comparisons,synthesis}` + `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` + **`output/`** 发布层。`lifecycle.md` 可插拔。另有 visual-canvas / visual-excalidraw / visual-mermaid skills。

**源类型：** 文章、论文、文档摘录、transcripts、视觉源文件、assets。refresh 经用户确认后写入 `raw/articles/[date]-[topic].md`。

**增量 / 矛盾 / 引用 / lint：**

- 矛盾标注并引用新旧源；若有 lifecycle，矛盾页 confidence −0.15。
- 四层记忆：summaries → entities/concepts → comparisons/synthesis → output。
- confidence 0–1、遗忘曲线、active→stale→archived、superseded_by。
- Query：confidence < 0.6 或 stale 时 **主动 web search**；“When wiki information is insufficient, you may refer back to `raw/` for supplementation, and update the wiki accordingly.”
- refresh 必须等用户确认才把网页结果写入 raw。
- Lint 脚本：`lint-check.py`、`lifecycle-check.py`、`log-archive.py`；语义检查含矛盾、单向链接、降级、refresh 建议。

**脚本：** 上述三个 Python 脚本。无独立产品 CLI。

**查询是否回读 live 源：** **是（有条件）**：stale / 低置信度会 web search；wiki 不足可回读 raw 并更新 wiki。web 新发现需用户确认才持久化到 raw。

---

### 4.9 Karpathy gist（权威源头，非 skill）

见第 3 节。无安装数 / stars（gist）。无 CLI。Query 针对已编译 wiki；未要求查询时回读原始 URL。

---

### 4.10 llmrix-inc / llm-wiki-skill

- 仓库：<https://github.com/llmrix-inc/llm-wiki-skill>
- `https://github.com/llmrix/llm-wiki-skill` API **301 → llmrix-inc/llm-wiki-skill**
- GitHub stars（API）：15
- skills.sh：本轮未找到稳定条目页
- 技能名（`skills/llm-wiki/SKILL.md`）：`llm-wiki`
- 安装：README 未给 `npx skills add` 一行；以 Claude Code skill 命令描述

**模式：** `wiki-config` / `wiki-input` / `wiki-ingest` / `wiki-query` / `wiki-lint` / `wiki-graph`。来源：README 与 `skills/llm-wiki/SKILL.md`。

**三层：** `raw/<topic>/` + `wiki/{index,overview,log,sources,entities,concepts,syntheses,archive}` + **`graph/{graph.json,graph.html}`**。

**源类型：** PDF（pdfplumber）、DOCX、PPTX、XLSX/CSV、md/txt、图片（Claude vision：图、流程图、截图、白板、表）。

**增量 / 矛盾：** ingest 更新 overview、flag contradictions、写 log。Query 可归档到 `wiki/syntheses/`。Graph 边分 `EXTRACTED` 与 `INFERRED`（confidence ≥ 0.5）。

**脚本：** 多模态抽取依赖 Python 库（README 表）。无独立发布层。

**查询是否回读 live 源：** Query 读 `wiki/index.md` 再综合；未声明回读原始文件或现场 URL。

---

### 4.11 One4Shell / llm-wiki-skill

- 仓库：<https://github.com/One4Shell/llm-wiki-skill>
- GitHub stars（API）：6
- 技能名：`llm-wiki`
- 安装（README）：`npx skills add https://github.com/One4Shell/llm-wiki-skill --skill llm-wiki`；或 `install.sh`

**模式：** Setup（`scripts/init.sh`）/ ingest / query / lint。来源：`skills/llm-wiki/SKILL.md`。

**三层：** `raw/` + `wiki/{sources,entities,concepts,synthesis}` + schema 文件（`AGENTS.md` 或 `CLAUDE.md`）。接近 gist 的模块化实例。

**源类型：** “text articles, PDFs, images, Slack/meeting transcripts, mixed”。

**增量 / 矛盾：** “Flag contradictions, don't silently overwrite.” 好答案回写 wiki。

**脚本：** `scripts/init.sh`（幂等、不覆盖）。

**查询是否回读 live 源：** Query 走 `references/query.md`（本次未整篇摘录）；入口 skill 将 query 定义为 “answered from and then filed back into a wiki”，未写默认 live URL。

---

### 4.12 noaul / llm-wiki 与 uovme / llm-wiki

- <https://github.com/noaul/llm-wiki>：API `fork: true`，`parent: Astro-Han/karpathy-llm-wiki`，stars **0**。`SKILL.md` / README 与上游 karpathy-llm-wiki 同类（抓到的 README/SKILL 内容一致）。
- <https://github.com/uovme/llm-wiki>：API **301 → noaul/llm-wiki**。
- 无独立 skills.sh 条目。能力等同 4.1 的 fork 副本，不另列能力差。

---

### 4.13 JanYork / llm-wiki-cli（LWC）

- 仓库：<https://github.com/JanYork/llm-wiki-cli>
- skills.sh：<https://www.skills.sh/janyork/llm-wiki-cli/using-lwc>（Installs **5**；README badge 指向此页）
- 技能/产品名：`lwc` / bundled skill `using-lwc`
- 安装：npm `@i-xor/lwc`、crates.io `lwc`；README：“Ask your Agent to activate the bundled canonical …”
- GitHub stars（API）：47

**模式（README Quick Start / 命令）：** `lwc init`、`schema set`、`purpose set`、`source add-dir`、`source status` / `diff` / `refs`、`lwc ingest next|analyze|claim|complete`、`lwc search`、`lwc lint`。强调 **Agent 驱动 CLI，人不要手搓日常命令**。

**三层：** 项目内 `.lwc/`（可 git exclude）；sources 以 SHA-256 去重；schema/purpose 为显式合同。Wiki 是 “source-grounded Wiki whose pages, citations, links, contradictions, and history are revised”。

**源类型：** 目录添加；拒绝高置信凭据标记（除非 `--acknowledge-sensitive-source`）。`source status` **对 live 文件做 SHA-256**，报告 `modified/missing/...`。

**增量 / 引用 / lint：** ingest 为 claim/complete 任务流；search 有 page/source granularity；`lwc lint` 存在。声明不需要 embeddings。

**脚本 / CLI：** 完整 Rust/Node CLI，有 CI。

**查询是否回读 live 源：** `source status` 会哈希当前磁盘文件（只读）。日常 query/search 针对已维护 Wiki；live 文件漂移通过 source status/diff 显式检查，不是每次问答静默重抓 URL。

---

### 4.14 nashsu / llm_wiki（桌面应用）+ nashsu / llm_wiki_skill

- 应用仓：<https://github.com/nashsu/llm_wiki>，stars **16679**（本轮 GitHub `llm-wiki in:name` 最高）
- skill 仓：<https://github.com/nashsu/llm_wiki_skill>，stars **131**
- skills.sh：<https://www.skills.sh/nashsu/llm_wiki_skill/llm-wiki>
- 技能名：`llm-wiki`
- 安装：`npx skills add https://github.com/nashsu/llm_wiki_skill --skill llm-wiki`
- skills.sh Installs（2026-08-23 页）：**1.4K**（同日较早搜索摘要曾显示 1.2K / 仓库页 1.1K）
- First Seen：May 19, 2026；Pass

**应用 README 声明的能力：** Two-Step CoT ingest、多模态图片、PDF/Office/EPUB/图片/媒体/web clips/URL 批次、Read Sources Only、4-signal knowledge graph、Louvain、LanceDB 向量检索、ingest queue、folder watch、Deep Research（Tavily/SerpApi/SearXNG）、本地 HTTP API `127.0.0.1:19828` + MCP、Chrome clipper。三层与 ingest/query/lint 明确“kept from Karpathy”。

**skill 性质：** “This skill is **documentation only**.” 教 agent 调桌面 API：hybrid search、读 `wiki/**` 与 `raw/sources/**`、图谱邻域、`sources/rescan`。只读除 rescan。不自己编译 wiki。

**查询是否回读 live 源：** API 可读 wiki 页与（白名单）raw 文本；应用另有 “Read Sources Only mode”。rescan 对源文件夹做队列 diff，不是每次 query 重抓外网。

---

### 4.15 sdyckjq-lab / llm-wiki-skill

- 仓库：<https://github.com/sdyckjq-lab/llm-wiki-skill>
- skills.sh：<https://www.skills.sh/sdyckjq-lab/llm-wiki-skill/llm-wiki>
- 技能名：`llm-wiki`（SKILL.md version 3.6.4）
- 安装：页面命令未在本次 HTML 全文抽出；可用 `npx skills add https://github.com/sdyckjq-lab/llm-wiki-skill --skill llm-wiki`（与目录惯例一致，skills.sh 条目存在）
- skills.sh Installs：**132**
- GitHub stars（API）：2366

**模式（`SKILL.md` 工作流路由）：** init / ingest / batch-ingest / query / lint / status / digest / graph / delete / crystallize。可选适配器：网页、X/Twitter、微信公众号、YouTube、知乎、小红书、PDF、本地文件。

**三层：** 本地 markdown wiki + `purpose.md` + `.wiki-cache.json` + `.wiki-schema.md`（别名词表）。`init-wiki.sh` 脚手架。

**源类型：** 网页、推特、公众号、小红书、知乎、YouTube、PDF、本地文件；图片建议下载到 `raw/assets/`。

**增量 / 矛盾 / 引用：** query 用别名展开；综合 ≥3 源才建议持久化到 `wiki/queries/`；`derived: true`；自引用防护（query 页后续作 INFERRED）。ingest 对多观点分别列出。

**脚本：** `scripts/init-wiki.sh`、`install.sh --with-optional-adapters`。

**查询是否回读 live 源：** Query 工作流只搜 `index.md` 与 `wiki/`，不写 web refresh。ingest 才拉 URL。

---

### 4.16 SamurAIGPT / llm-wiki-agent

- 仓库：<https://github.com/SamurAIGPT/llm-wiki-agent>
- GitHub stars（API）：3437
- 本轮未核验到 skills.sh 条目
- 安装：`git clone` 后由 `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` 驱动；Claude 有 `/wiki-ingest` `/wiki-query` `/wiki-lint` `/wiki-graph`

**模式：** ingest / query / lint / build graph。

**三层：** `raw/` + `wiki/{index,log,overview,sources,entities,concepts,syntheses}` + `graph/{graph.json,graph.html}`。

**源类型：** markdown、PDF、DOCX、PPTX、XLSX、HTML、TXT、CSV、JSON、XML、RST、EPUB 等；非 md 经 markitdown 转换。

**增量 / 矛盾：** “contradictions already flagged”；lint 找 orphans、contradictions、gaps。graph.json SHA256-cached。

**查询是否回读 live 源：** query 从 wiki 页综合；未声明现场网页。

---

### 4.17 atomicstrata / llm-wiki-compiler（llmwiki）

- 仓库：<https://github.com/atomicstrata/llm-wiki-compiler>
- 文档站：<https://llmwiki.atomicstrata.ai>
- GitHub stars（API）：1954
- 产品名：`llmwiki` / npm `llm-wiki-compiler`
- 本轮未把 skills.sh 条目作为主安装面（它是 CLI/SDK/MCP 编译器）

**模式（README）：** ingest / compile / query / lint / refresh --stale / view / eval / serve (MCP) / export（OKF、JSON、JSON-LD、GraphML、Marp、`llms.txt`）/ profile / template / workflow。

**三层：** raw → 两阶段 LLM 编译出 typed pages（concept/entity/comparison/overview）+ `.llmwiki/profile.json`（CLP）。无 profile 时保持 pre-1.0 concepts-and-queries。

**源类型：** “papers, notes, READMEs, transcripts, PDFs, images, or web pages”；模板可 Crossref。

**增量 / 矛盾 / 引用 / human-owned：** 段落/主张引用源文件与行号；`llmwiki lint` 校验链接；review queue；freshness repair；runtime trust gates（relation/evidence/artifact/human/agent）写路径强制。外部 OKF 默认进 review queue。

**脚本 / CLI：** 完整 Node CLI + TypeScript SDK + MCP。

**查询是否回读 live 源：** hybrid retrieval（semantic + BM25 + wikilink expansion）针对编译产物；`refresh --stale` 是显式修复，不是每个 query 默认重抓。

---

### 4.18 nvk / llm-wiki

- 仓库：<https://github.com/nvk/llm-wiki>
- 站点：<https://llm-wiki.net/>
- GitHub stars（API）：1058
- 安装：`claude plugin install wiki@llm-wiki`；Codex marketplace `nvk/llm-wiki`
- 本轮未核验独立 skills.sh 高安装条目

**模式（README 命令表）：** `/wiki:research` `/wiki:thesis` `/wiki:collect` `/wiki:query` `/wiki:ingest` `/wiki:ingest-collection` `/wiki:inventory` `/wiki:dataset` `/wiki:archive` `/wiki:compile` `/wiki:audit` `/wiki:output` `/wiki:checkpoint` `/wiki:portfolio` `/wiki:specialist` 等。远超 gist 三操作。

**三层：** 多 topic wiki hub；Ideas → 批准后 promote 为 Projects；inbox/；Obsidian-compatible。另有 private adapter 协议、远程写治理、session memory。

**源类型：** URL、inbox 文件、GitHub 集合、MediaWiki dump、CSV、Wayback CDX、外部 dataset（只编目不搬进仓）。

**增量 / 审计：** compile 处理未处理源；audit 跨 outputs + wiki + fresh research；checkpoint 导出带 hash/隐私证明，**从不授权 commit/publish/import**。

**查询是否回读 live 源：** `/wiki:query` 问 wiki；`--deep` 交叉引用。`/wiki:audit` 与 research 会做 fresh research。query 本身按 README 是 “Ask the wiki”。

---

### 4.19 aaronoah / llm-wiki-skill

- 仓库：<https://github.com/aaronoah/llm-wiki-skill>
- skills.sh：<https://www.skills.sh/aaronoah/llm-wiki-skill/llm-wiki-skill>
- 技能名：`llm-wiki-skill`
- 安装：`npx skills add https://github.com/aaronoah/llm-wiki-skill --skill llm-wiki-skill`
- skills.sh Installs：**56**
- GitHub stars（API）：28

**模式：** create / ingest / query / lint / archive / delete。必须在 wiki 根目录调用（有 `SCHEMA.md`、`index.md`、`log.md`、`raw/`、`generated/`）。

**三层：** `raw/{documents,assets}` + **`generated/{entities,topics,comparisons}`**（wiki 层不叫 `wiki/`）+ `SCHEMA.md`。

**源类型：** “Any single document in different formats”；assets 含 images、video links。

**增量 / 矛盾：** 页阈值 2+ sources；矛盾记双方 + `contradictions:` + 交人审。最低 2 条出边 wikilink。log 超 500 轮转。

**脚本：** README 称 CLI based；本轮以 `SKILL.md` 工作流为主，未再核独立二进制。

**查询是否回读 live 源：** 激活条件含 query；未在已读 `SKILL.md` 前 150 行要求 live URL。

---

## 5. 能力对照表

图例：`Y` = 一手源明确声明；`P` = 部分 / 可选 / Phase 未完成；`—` = 未声明或不适用。安装数来自 skills.sh 条目页（无条目则空）。stars 来自 GitHub API（大仓已标注）。

| 实现 | 安装数 | stars | init | ingest | query | lint | refresh | publish | graph | capture/inbox | 源类型（声明） | 增量 | 矛盾 | 多模态 | 查询回读 live |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Karpathy gist | — | — | 协商 | Y | Y | Y | — | Marp 可选 | Obsidian 图可选 | — | 文/论文/图/数据 | 编译一次保持更新 | ingest 标注 | 图可选 | 否（读 wiki） |
| astro-han | 6.6K | 1987 | 隐式 | Y | Y | Y+证据脚本 | — | — | 刻意不做 | — | web/论文/PDF/md/文本 | triage+cascade | Disputed/Outdated | 否 | 否 |
| ar9av | 3.6K | 3267 | wiki-setup | Y | Y | Y | rebuild | export | 导出+着色 | capture+_raw+history | 文/PDF/图/URL/代码/会话 | manifest delta | inferred/ambiguous + lifecycle | 图 first-class | 否（可选 QMD） |
| alirezarezvani | 686 | 24828† | wiki-init | Y | Y | Y | — | Marp export | graph_analyzer | — | 文/PDF/图/数据 | 10–15 页更新 | lint 标矛盾 | 图下载 | 否 |
| hermes | 414 | 234521† | Y | Y | Y | Y | sha 再 ingest | — | Obsidian | — | URL/PDF/粘贴 | sha256 skip/drift | frontmatter | assets | 否 |
| nanzhipro | 265 | 105 | bootstrap | Y | Y | Y | — | exports 可选 | concept-table | — | 文/论文/书/笔记 | concept-table | lint 块 | — | 否 |
| pin-llm-wiki | 70 | 76 | Y | Y | 经 AGENTS | Y（#2/#6 延期） | 文案有、表未实现 | — | — | inbox.md | GitHub/YT/Web | 队列 | Phase1 延期 | YT 字幕 | wiki 无答案才上网 |
| understand-knowledge | 2.1K | 80166† | — | — | — | — | — | dashboard | **主能力** | — | 读已有 wiki | — | 抽 claims | 不解析 PDF | 不适用 |
| guanyang | 2 | 27 | — | Y | Y | Y | **Y** | **Y** | Canvas/Excalidraw/Mermaid | — | 文/论文/文档/transcript/视觉 | lifecycle | 标注+降权 | visual/ | **条件是**（web+raw） |
| llmrix-inc | — | 15 | config | input/ingest | Y | Y | — | — | **graph.html** | — | Office/PDF/图 | overview 更新 | flag | **vision** | 否 |
| One4Shell | — | 6 | init.sh | Y | Y | Y | — | — | — | — | 文/PDF/图/transcript | 回写答案 | 不静默覆盖 | 图 workaround | 否 |
| JanYork LWC | 5 | 47 | lwc init | ingest 任务流 | search | Y | source status | — | — | source add | 目录文件 | SHA 去重 | 声明维护 | — | 显式 status 哈希磁盘 |
| nashsu app+skill | 1.4K | 16679 / 131 | 应用内 | Y | Y | Y | rescan/watch | 工作区输出 | 4-signal+Louvain | clipper | 多格式+图+URL | 队列+缓存 | review 系统 | **Y** | 可选 Read Sources Only |
| sdyckjq-lab | 132 | 2366 | Y | Y+batch | Y | Y | — | digest | Mermaid+HTML | — | 中文平台+YT+PDF | cache/schema | 多观点列出 | 图路径 | 否 |
| SamurAIGPT | — | 3437 | — | Y | Y | Y | — | — | graph.html | — | markitdown 多格式 | 实体累加 | lint | — | 否 |
| atomicstrata | — | 1954 | profile/template | ingest+compile | Y | Y | refresh --stale | OKF/Marp/llms.txt | view+GraphML | connectors | 文/PDF/图/web | CLP gates | review queue | 图 | 否（显式 refresh） |
| nvk | — | 1058 | research --new-topic | ingest+compile | Y | audit | research/audit | output/checkpoint | portfolio | inbox+collect | URL/dump/CSV/Wayback | compile 未处理源 | audit | collect 媒体 | query 读 wiki；audit 可 fresh |
| aaronoah | 56 | 28 | Y | Y | Y | Y | — | — | — | — | documents/assets | 2+ 源建页 | contradictions | assets | 否 |

† stars 属于宿主大仓（claude-skills / hermes-agent / Understand-Anything），不能当成该 skill 单独受欢迎度。

---

## 6. 未验证 / 无法访问的项

| 项 | 状态 |
| --- | --- |
| <https://www.skills.sh/aradotso/trending-skills/llm-wiki-skill> | 2026-08-23 HTTP 404。搜索引擎缓存曾显示 523 installs、Security Fail。 |
| <https://www.skills.sh/ar9av/obsidian-wiki/llm-wiki> | 首次 WebFetch 超时，重试成功。 |
| Karpathy gist HTML 页 | gist.github.com 页面超时；**raw gist 成功**，以 raw 为准。 |
| `github.com/llmrix/llm-wiki-skill` | 301 到 `llmrix-inc/llm-wiki-skill`，按目标仓记录。 |
| `github.com/uovme/llm-wiki` | 301 到 `noaul/llm-wiki`（Astro-Han fork，0 star）。 |
| lum1104/understand-anything | 301 到 Egonex-AI/Understand-Anything；skills.sh 旧路径仍可打开，安装命令已改指向 egonex-ai。 |
| alirezarezvani / hermes / understand / nanzhipro / pin / guanyang 根目录 `SKILL.md` | 不在仓库根；已用 GitHub 目录与 `search_code` 定位到真实路径。 |
| skills.sh 首页排行榜上的 llm-wiki | 当日首页可见榜单无 llm-wiki；发现依赖搜索或直接 URL。 |
| ar9av 全部 39 个 companion `SKILL.md` 正文 | 已读 `llm-wiki` 理论 skill + README 技能列表；未逐份打开 `wiki-ingest` 等操作 skill 全文。 |
| nanzhipro `references/workflows/ingest.md` 全文每条规则 | 已读 SKILL + query/lint workflow；ingest 细节以 README 表与 SKILL 硬规则为准。 |
| pin `ingest.md` 17158 字节协议全文 | 已读 SKILL/README/lint.md；源类型与 companion/deep split 以 README 表为准。 |
| guanyang `references/*.md` 与 `lifecycle-spec.md` 公式 | 以 `SKILL.md` + README 声明为准，未逐条核衰减系数实现。 |
| nashsu 桌面应用二进制行为 | 仅 README / skill / API 文档；未运行应用。 |
| nvk / atomicstrata / JanYork 的全部子命令实现 | 以 README 明示命令与能力表为准，未读完各自 docs 树。 |
| GitHub code search `filename:SKILL.md` “Karpathy LLM Wiki” | 返回 total_count 1772，大量镜像/registry 副本；未把镜像仓当作独立实现。 |
| kiluazen/kstack、karlorz/llm-wiki、kfchou/wiki-skills | skills.sh 有条目但安装量低，未写入第 5 节主表。 |
| 安装数时间漂移 | nashsu skill 同日不同抓取显示 1.1K / 1.2K / 1.4K；以最后一次条目页 1.4K 记录，并在此注明不一致。 |

未把以下高 star 仓写入对照主表（缺少本轮读到的 `SKILL.md` 或与 “skill/能力” 弱相关）：`kytmanov/obsidian-llm-wiki-local`、`jason-effi-lab/karpathy-llm-wiki-vault`、`green-dalii/obsidian-llm-wiki`（Obsidian 插件）等。GitHub 搜索可见其存在与 star 数，但未完成 SKILL/README 精读。

---

## 7. 来源列表

### 7.1 skills.sh 与 CLI

- <https://www.skills.sh/>
- <https://www.skills.sh/about>
- <https://www.skills.sh/docs>
- <https://github.com/vercel-labs/skills/blob/main/README.md>
- <https://www.skills.sh/astro-han/karpathy-llm-wiki/karpathy-llm-wiki>
- <https://www.skills.sh/ar9av/obsidian-wiki/llm-wiki>
- <https://www.skills.sh/alirezarezvani/claude-skills/llm-wiki>
- <https://www.skills.sh/nousresearch/hermes-agent/llm-wiki>
- <https://www.skills.sh/nanzhipro/karpathy-llm-wiki-bootstrap-skill/llm-wiki-bootstrap>
- <https://www.skills.sh/ndjordjevic/pin-llm-wiki/pin-llm-wiki>
- <https://www.skills.sh/lum1104/understand-anything/understand-knowledge>
- <https://www.skills.sh/guanyang/llm-wiki/llm-wiki>
- <https://www.skills.sh/nashsu/llm_wiki_skill/llm-wiki>
- <https://www.skills.sh/aaronoah/llm-wiki-skill/llm-wiki-skill>
- <https://www.skills.sh/sdyckjq-lab/llm-wiki-skill/llm-wiki>
- <https://www.skills.sh/janyork/llm-wiki-cli/using-lwc>
- <https://www.skills.sh/kiluazen/kstack/llm-wiki>（仅发现，未深读）

### 7.2 Gist 与指定仓库文件

- <https://gist.githubusercontent.com/karpathy/442a6bf555914893e9891c11519de94f/raw>
- <https://github.com/Astro-Han/karpathy-llm-wiki/blob/main/SKILL.md>
- <https://github.com/Astro-Han/karpathy-llm-wiki/blob/main/README.md>
- <https://github.com/Ar9av/obsidian-wiki/blob/main/.skills/llm-wiki/SKILL.md>
- <https://github.com/Ar9av/obsidian-wiki/blob/main/README.md>
- <https://github.com/alirezarezvani/claude-skills/blob/main/engineering/llm-wiki/skills/llm-wiki/SKILL.md>
- <https://github.com/NousResearch/hermes-agent/blob/main/skills/research/llm-wiki/SKILL.md>
- <https://github.com/nanzhipro/Karpathy-llm-wiki-bootstrap-skill/blob/main/skill/SKILL.md>
- <https://github.com/nanzhipro/Karpathy-llm-wiki-bootstrap-skill/blob/main/README.md>
- <https://github.com/nanzhipro/Karpathy-llm-wiki-bootstrap-skill/blob/main/skill/references/workflows/query.md>
- <https://github.com/nanzhipro/Karpathy-llm-wiki-bootstrap-skill/blob/main/skill/references/workflows/lint.md>
- <https://github.com/ndjordjevic/pin-llm-wiki/blob/main/skills/pin-llm-wiki/SKILL.md>
- <https://github.com/ndjordjevic/pin-llm-wiki/blob/main/README.md>
- <https://github.com/ndjordjevic/pin-llm-wiki/blob/main/skills/pin-llm-wiki/lint.md>
- <https://github.com/Egonex-AI/Understand-Anything/blob/main/understand-anything-plugin/skills/understand-knowledge/SKILL.md>
- <https://github.com/Egonex-AI/Understand-Anything/blob/main/README.md>
- <https://github.com/guanyang/llm-wiki/blob/main/skills/llm-wiki/SKILL.md>
- <https://github.com/guanyang/llm-wiki/blob/main/README.md>
- <https://github.com/llmrix-inc/llm-wiki-skill/blob/main/README.md>
- <https://github.com/llmrix-inc/llm-wiki-skill/blob/main/skills/llm-wiki/SKILL.md>
- <https://github.com/One4Shell/llm-wiki-skill/blob/main/README.md>
- <https://github.com/One4Shell/llm-wiki-skill/blob/main/skills/llm-wiki/SKILL.md>
- <https://github.com/noaul/llm-wiki>（fork 元数据 + SKILL.md/README）
- <https://github.com/JanYork/llm-wiki-cli/blob/main/README.md>
- <https://github.com/nashsu/llm_wiki/blob/main/README.md>
- <https://github.com/nashsu/llm_wiki_skill/blob/main/README.md>
- <https://github.com/nashsu/llm_wiki_skill/blob/main/SKILL.md>
- <https://github.com/sdyckjq-lab/llm-wiki-skill/blob/main/SKILL.md>
- <https://github.com/SamurAIGPT/llm-wiki-agent/blob/main/README.md>
- <https://github.com/atomicstrata/llm-wiki-compiler/blob/main/README.md>
- <https://github.com/nvk/llm-wiki/blob/master/README.md>
- <https://github.com/aaronoah/llm-wiki-skill/blob/main/SKILL.md>

### 7.3 API / 搜索

- GitHub REST：`GET /repos/{owner}/{repo}`（stars、fork、parent、301）
- GitHub Search repositories：`llm-wiki in:name`（按 stars）
- GitHub Search code：`filename:SKILL.md` + Karpathy/LLM Wiki

抓取时刻：2026-08-23。未使用二手博客作为事实来源。
