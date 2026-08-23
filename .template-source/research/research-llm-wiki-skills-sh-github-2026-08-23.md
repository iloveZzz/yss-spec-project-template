# skills.sh / GitHub llm-wiki 与本仓 `llm-wiki` 对比研究

> 日期：2026-08-23
>
> 仓库身份：`template-source`（`yss-project.yaml`）
>
> 研究性质：只读事实研究与能力对照。不修改 `.agents/skills/llm-wiki`，不宣布技能升级、可发布或应立即实现某项能力。
>
> 存放位置：`.template-source/research/`（模板源治理区）。不写入 `docs/`，避免进入模板实例分发面；不写入 `.template-source/evidence/reviews/`，避免破坏已 `complete` 的审查 Markdown archive 合同。

## 1. 研究范围与方法

问题：公开 Agent Skills 生态里的 llm-wiki / Karpathy LLM Wiki 实现有哪些能力，与本仓已落地的 `llm-wiki` 差在哪里，哪些值得借鉴。

一手源优先级：

1. Karpathy 原 gist（pattern 定义权）。
2. [skills.sh](https://www.skills.sh/) 目录页与各技能详情页（安装命令、安装数、仓库指针）。
3. 对应 GitHub 仓库的 `SKILL.md`、`README.md`、目录与脚本声明。
4. 本仓 canonical skill：`.agents/skills/llm-wiki/**`，以及本仓 wiki 实例 `wiki/`。

不把二手博客、安装数或 star 当作能力证明。安装数 / star 只记录 skills.sh 或仓库页面明示值，用于生态规模，不用于正确性。

本次直接打开并引用的实现：

| 实现 | 一手入口 |
|---|---|
| Karpathy 原 pattern | `https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f` |
| skills.sh 目录 | `https://www.skills.sh/` |
| astro-han/karpathy-llm-wiki | skills.sh 页 + GitHub `SKILL.md` |
| Ar9av/obsidian-wiki | skills.sh 页 + GitHub `.agents/skills/` 目录 |
| nanzhipro/Karpathy-llm-wiki-bootstrap-skill | skills.sh 页 + `skill/SKILL.md` |
| ndjordjevic/pin-llm-wiki | skills.sh 页 + `skills/pin-llm-wiki/SKILL.md` |
| guanyang/llm-wiki | skills.sh 页 + `skills/llm-wiki/SKILL.md` |
| JanYork/llm-wiki-cli（LWC） | gist 评论 + GitHub `README.md` |
| egonex-ai/understand-anything（`understand-knowledge`） | skills.sh 页（图谱分析，不是 wiki 编译器） |
| alirezarezvani/claude-skills `llm-wiki` | skills.sh 页（未整本拉取仓库） |
| nousresearch/hermes-agent `llm-wiki` | skills.sh 页（未整本拉取仓库） |
| karlorz/llm-wiki `wiki-ingest`、jackwener/llm-wiki `ingest`、vanillaflava `wiki-ingest` | skills.sh 摘要（补充生态形态，不作深度能力断言） |

本仓对照对象：`.agents/skills/llm-wiki/SKILL.md` 及其 `references/`、`scripts/`，以及已编译实例 `wiki/`。

## 2. skills.sh 平台本身

[skills.sh](https://www.skills.sh/) 自称 **The Open Agent Skills Ecosystem**。首页正文写明：Skills 是给 AI agent 用的可复用能力，用一条命令安装，以增强 agent 的程序性知识。安装形态是 `npx skills add <repo>`。

首页是安装量排行榜，不是按「Karpathy wiki」分类的官方 taxonomy。检索到的 llm-wiki 条目都是第三方仓库被目录索引后的技能页；每页给出：

- 安装命令（`npx skills add https://github.com/<owner>/<repo> --skill <name>`）
- 内嵌 `SKILL.md` 摘要
- Installs、GitHub Stars、First Seen、Security Audits

与本仓相关的事实：本仓 `llm-wiki` 在 `skills-lock.json` 的 `shared` 分组，`source: project`，`sourceType: local`，不在 `yss-public-skills.json`。wiki 文章 `LLM Wiki` 也写明公开发布面只放 `yss-*` 工程技能。因此 skills.sh 上目前看不到本仓实现；这是发布边界选择，不是能力缺失。

## 3. Karpathy 原始 pattern（权威源头）

gist `karpathy/llm-wiki.md`（创建于 2026-04-04）自称 **idea file**，不是实现规范。核心主张：

> Instead of just retrieving from raw documents at query time, the LLM incrementally builds and maintains a persistent wiki ... The knowledge is compiled once and then kept current, not re-derived on every query.

三层：

- **Raw sources**：不可变，LLM 只读。
- **The wiki**：LLM 拥有并维护的 markdown。
- **The schema**：`CLAUDE.md` / `AGENTS.md` 一类操作契约，与领域共演化。

三种操作：

| 操作 | gist 原话要点 |
|---|---|
| Ingest | 新源落入 raw；读源、讨论要点、写摘要、更新 index / 实体页 / 概念页、追加 log。单源可能触及 10–15 页。 |
| Query | 对 wiki 提问并引用；好答案可以回写为新页，探索也要复利。 |
| Lint | 矛盾、过期主张、孤儿页、缺页、缺交叉引用、可用 web 搜索补的数据缺口。 |

可选：Obsidian 作为 IDE、graph view、Web Clipper、本地图片、`qmd` 一类本地搜索、Marp、Dataview。gist 明确说这些都可选，目录结构由领域决定。

本仓已经吸收的 Karpathy 内核：三层、`index.md` / `log.md`、schema 文件、`[[wikilink]]`、查询读 wiki 而不是整库 RAG。本仓刻意收窄的部分：wiki 是 **IR**，live 权威源才是事实；查询禁止回写。

## 4. 外部实现能力清单

### 4.1 astro-han/karpathy-llm-wiki（安装量最高的独立 skill）

- skills.sh：`npx skills add https://github.com/astro-han/karpathy-llm-wiki --skill karpathy-llm-wiki`；页面写 Installs 6.6K，Stars 2.0K，First Seen Apr 5, 2026。
- GitHub `SKILL.md`（SHA `82cb4e28b9ac8a7779d866091697e317bdd3d146`）把 schema 放在 skill 自己身上，而不是 wiki 内独立契约文件。
- 目录：`raw/<topic>/`，`wiki/<topic>/<article>.md`（只允许一层主题子目录）。
- 操作：**Ingest / Query / Lint**。没有本仓意义上的 `refresh` / `rebuild` / manifest。
- Ingest 流水线：Fetch → Triage（New / Update / Disputed / No material）→ Compile → Cascade Updates → 更新 index / log。
- Grounding Invariant：数字、日期、直接引语必须能在文章 Raw 字段指向的 raw 文件里 verbatim 找到；`scripts/check_evidence.py` 用 grep 做机械核验。
- 冲突：`Status: Disputed` / `Outdated`，禁止静默改写历史。
- Query 默认不写文件；用户明确要求 archive 时新建归档页，不合并进既有文章。
- Lint 分三级：Safe Fixes（index / 断链自动修）、Mechanical Reports（证据脚本，不自动改正文）、Judgment Reports（矛盾、缺交叉引用、孤儿页，只报告）。
- Research 子流：用户显式要求时多源搜集；搜索可并行，编译必须串行（index / log / cascade 是共享状态）。

### 4.2 Ar9av/obsidian-wiki（产品化程度最高）

- skills.sh：`npx skills add https://github.com/ar9av/obsidian-wiki --skill llm-wiki`；Installs 3.6K，Stars 3.3K。
- 这不是单个 `SKILL.md`，而是一套 Obsidian vault + 多 skill。GitHub `.agents/skills/` 可见至少：`llm-wiki`、`wiki-setup`、`wiki-capture`、`wiki-ingest`、`wiki-query`、`wiki-lint`、`wiki-rebuild`、`wiki-update`、`wiki-export`、`wiki-digest`、`wiki-dashboard`、`wiki-research`、`wiki-synthesize`、`wiki-status`、`wiki-switch`、`cross-linker`、`tag-taxonomy`、`graph-colorize`、以及多条 `*-history-ingest`。
- skills.sh 内嵌 `SKILL.md` 声明：
  - Layer 1 raw 可在 vault 外（`OBSIDIAN_SOURCES_DIR`）。
  - 图片是一等源，靠 Read 工具的 vision；无 vision 则跳过并报告。
  - `_raw/` 是 inbox / 暂存，**不是** Layer 1；`wiki-ingest` 晋升时 move 而不是 delete。
- 能力面明显超出「编译仓库文档」：capture、history ingest、export、dashboard、跨链、标签分类、图谱着色。

### 4.3 nanzhipro/llm-wiki-bootstrap

- skills.sh：Installs 265，Stars 104。
- `skill/SKILL.md`（SHA `da4143d7668fbf2c8e2dc1f1e9d52e8516c695e2`）把生成 wiki 的单一操作契约定为 **`SCHEMA.md`**；`CLAUDE.md` / `AGENTS.md` / `.github/copilot-instructions.md` 只做薄指针，禁止复制规则。
- 另有 `wiki/concept-table.md`：概念、关系、源、状态、维护注记，补 `index.md`。
- Intent router：bootstrap / ingest / query / lint / BM25 / `EXTEND.md` 偏好。
- 硬规则：不覆盖已有 wiki；不改 raw（bootstrap 的 `.gitkeep` 除外）；**禁止直接用 BM25 片段作答**，必须先打开返回的 wiki 页；搜索索引失败时保留 wiki 编辑并回退到 index + 文本搜索。
- 可选产物：`scripts/wiki_fts.py`、`indexes/`、`exports/`。

### 4.4 ndjordjevic/pin-llm-wiki

- skills.sh：Installs 70，Stars 76。
- `skills/pin-llm-wiki/SKILL.md`：人类把 URL 丢进 `inbox.md`，技能 fetch → `raw/` → `wiki/` → lint。
- 子命令：`init`、`ingest`、`lint`、`queue`、`remove`。Guard：除 `init` 外必须存在 `.pin-llm-wiki.yml`。
- 源类型声明：web、GitHub、YouTube。
- Git 政策：任何子命令后默认不 `commit` / `push`，除非人类本轮明确要求。

### 4.5 guanyang/llm-wiki

- skills.sh：Installs 2，Stars 26。版本 metadata `4.1`。
- 子命令：`ingest`、`query`、`lint`、`publish`、`refresh`。
- 其 `refresh` **不是**本仓的 live-hash 漂移刷新，而是「对某主题做 web 搜索再验证」；写入 raw 前必须等人确认。
- `publish` 产出面向读者的独立成品：`post | report | slides | tutorial | newsletter`，输出到 `output/`，**禁止残留 `[[wikilink]]`**。
- 页面类型：`summaries/`、`entities/`、`concepts/`；可选 `lifecycle.md` 做 confidence 衰减 / 晋升 / 归档。
- 矛盾：显式标注并引用新旧源；若有 lifecycle，矛盾页 confidence −0.15。
- Query 在 confidence < 0.6 或 stale 时会主动 web 搜索，并询问是否把新发现落成 raw。
- Lint：`lint-check.py`（页数、孤儿、缺页、缺 frontmatter、单向链接）+ 可选 `lifecycle-check.py` + LLM 语义矛盾检查。

### 4.6 JanYork/llm-wiki-cli（LWC）

- gist 评论与 README 自称把 Karpathy pattern 做成 **agent-first Rust CLI**。
- README：SQLite 是权威存储，Markdown wiki 是可重建投影；人类不日常手改投影。
- 四层：Raw sources / Wiki / Temporal memory / Schema and purpose。
- 提供 `lwc search`（sentence / passage）、`lwc graph explore|neighbors|path|impact`、显式语义边（`DEPENDS_ON` 等须带 provenance / reason / confidence）。
- 安装面：CLI + canonical `using-lwc` skill + MCP + Hooks。skills.sh 有 `using-lwc` 徽章。
- 与本仓差异最大：本仓 wiki 是 git 内 markdown + manifest；LWC 把权威状态移出工作树 markdown。

### 4.7 understand-knowledge

- skills.sh 现指向 `egonex-ai/understand-anything`（旧 URL `lum1104/understand-anything` 仍能打开）。Installs 2.1K。
- 它 **分析** 已存在的 Karpathy wiki，产出交互知识图谱，不负责 init / refresh / rebuild。
- 检测信号：`index.md` + 多篇带 `[[wikilink]]` 的 markdown；可选 `raw/` 与 schema。
- 本仓 P1/P2 审查明确要求通用 skill **不要点名** 该外部 skill（`docs/reviews/llm-wiki-p12-focused-review-2026-08-23.md`）。图谱若要做，应是可选后处理，不能写进 `llm-wiki` 默认闭包。

### 4.8 其余 skills.sh 变体（形态补充）

这些条目说明生态已从「一个 SKILL.md」裂成 **ingest / query / lint 分包**：

- `karlorz/llm-wiki` 的 `wiki-ingest`：先 `skillwiki path` / `skillwiki lang` / `skillwiki fetch-guard`，再 fetch；本地源优先 commit-pinned GitHub blob，而不是 `file://`。
- `jackwener/llm-wiki` 的 `ingest`：用 `.llm-wiki/config.toml` 定位 vault，读 `wiki-purpose.md` / `wiki-schema.md` / `wiki-agent.md` 的 MUST / MAY / NEVER。
- `vanillaflava/llm-wiki-claude-skills` 的 `wiki-ingest`：以 `wiki-config.md` + YAML `wiki-schema.md` 定位；`raw/` 队列晋升到 `ingested/` 是原子提交。
- `alirezarezvani/claude-skills` 与 `nousresearch/hermes-agent` 的 `llm-wiki` 页复述 Karpathy「Obsidian 是 IDE」叙事，安装量分别约 686 / 369（skills.sh 页面值）。本次未整本拉取其仓库，不作超出页面的能力断言。

## 5. 本仓 `llm-wiki` 当前能力

Canonical 入口：`.agents/skills/llm-wiki/SKILL.md`。

定位（`CONTEXT.md` 术语表）：LLM Wiki 由 `raw/`、`wiki/` 与 `.wiki-manifest.json` 组成的本地持久知识库；**不是** `research` 一次性笔记，也 **不替代** 权威源。

| 维度 | 本仓现状 |
|---|---|
| 模式 | 编译模式只有 `init` / `refresh` / `rebuild` / `lint`。Query **不是**模式，见 `references/query.md`。 |
| 源模型 | `.wiki-manifest.json` 编译图：`document` 拷贝、`derived` 摘录、`code-surface` 不进 raw。脚本填 `sha256` / `compiledAt` / `gitCommit`。 |
| 增量 | `inventory.mjs drift` 按 livePath SHA-256 算影响集；只改命中文章；`humanOwned` 不改正文。 |
| 新文件 | 无映射的新 live 文件只列候选，禁止静默建页。删除源不静默删页。 |
| 发现 | `discover.md` 是 Agent 勾选表，不是扫描器；默认排除 `docs/reviews`、`docs/.scratch`、投影、整本 lock；超过约 40 个 document 先停。 |
| 查询 | 最多打开 `min(8, hit)` 篇文章；drift 非空则标 stale；**每条论断回读 live 路径**；query 不写 raw / 文章 / index / log / manifest。 |
| Lint | `lint-wikilinks.mjs`：断链、跨路径、H1=ID、孤儿、缺「来源」、manifest 闭合、derived 必须有 `extract.kind`。Agent 再抽查 `N=min(5, 变更页)` 条 live 事实。 |
| 写作 | 子 agent 按不相交文件列表并行；orchestrator 独占 index / log / manifest / CLAUDE.md。 |
| 测试 | `inventory.test.mjs`、`lint-wikilinks.test.mjs`、`extract.test.mjs`。 |
| 治理 | 锁文件 `source: project`；注册表 shadow 中 `layer: core`、`maturity: verified`；不进公开 `yss-*` 清单。 |

本仓实例 `wiki/` 已按该 skill rebuild：`schemaVersion` 1、`profile: documents`、23 篇文章（含 `LLM Wiki`）。

## 6. 能力对照表

符号：✓ 有；△ 部分 / 不同语义；— 无或明确不做。安装数取自 2026-08-23 读取的 skills.sh 页面，可能变动。

| 能力 | 本仓 | Karpathy gist | astro-han | Ar9av 套件 | nanzhipro | pin-llm-wiki | guanyang | LWC |
|---|---|---|---|---|---|---|---|---|
| raw + wiki + schema | ✓ + manifest | ✓ | ✓（schema=SKILL.md） | ✓ + 外置 raw + `_raw/` inbox | ✓ + `SCHEMA.md` + concept-table | ✓ + `inbox.md` + yml | ✓ + 可选 lifecycle | ✓ + SQLite 权威 + 时间记忆 |
| init / bootstrap | ✓ 禁覆盖 | 协作落地 | 首次 ingest 建骨架 | `wiki-setup` | bootstrap + EXTEND | `init` | 隐含 | `lwc init` |
| 单源 ingest + cascade | —（用 refresh 映射集） | ✓ | ✓ Triage/Cascade | `wiki-ingest` | ✓ | ✓ URL | ✓ 10–15 页 | `source`/`page` |
| live-hash 增量 refresh | ✓ | — | — | `wiki-update`/`rebuild`（未深读） | — | — | web-verify「refresh」 | 命令式修订 |
| 全局 rebuild | ✓ 保稳定 ID | — | — | `wiki-rebuild` | — | — | — | Markdown 投影重建 |
| query 读 wiki | ✓ + 回读 live | ✓ | ✓ | `wiki-query` | ✓ + BM25 只找候选 | 未单列 query | ✓ + 低置信度会上网 | recall + search/graph |
| query 回写 / archive | 明确禁止 | 鼓励 | 显式 archive | synthesize/digest | — | — | 询问后写入 comparisons/synthesis | write-back |
| 结构 lint 脚本 | ✓ 可测 | 建议 | `check_evidence.py` + 自动修 | `wiki-lint` | 工作流 | `lint` | `lint-check.py` | `graph verify` 等 |
| 矛盾 / Disputed | —（只抽查 live） | ✓ | ✓ Status 块 | 页面声称 | lint 工作流 | — | ✓ + confidence | 显式 relation |
| 证据 verbatim 核验 | Agent 抽查 5 条 | 建议 | 脚本 grep 数字/日期/引语 | —（未深读） | — | 引用协议 | frontmatter/lifecycle | span locator |
| 概念表 / 实体页类型 | 扁平文章 + index 分类 | 建议 | 主题子目录 | 分类 vault | `concept-table.md` | 页面模板 | summaries/entities/concepts | page types |
| 多模态 / URL / YouTube | 仓库内 md/代码 | 图片可选 | web/file fetch | 图片 + PDF 等 | 源 ingest | URL/GH/YouTube | web refresh | curated sources |
| inbox / queue | — | — | — | `_raw/` + capture | — | `inbox.md` + queue | — | — |
| 本地全文检索 | index + 专名匹配 | 可选 qmd | 全文搜索指令 | — | 可选 BM25 | — | index | FTS + span |
| 知识图谱 | 刻意不内置 | Obsidian graph | — | graph-colorize / dashboard | — | — | — | `lwc graph` |
| publish / export | — | Marp 可选 | — | `wiki-export` | `exports/` | — | post/report/slides | Markdown 投影 |
| human-owned | ✓ | 人类很少写 wiki | 归档页不 cascade | — | — | — | — | 人类不日常改投影 |
| 代码表面 / derived 摘录 | ✓ | — | — | — | — | — | — | 可选 CodeGraph |
| 公开 skills.sh | 不发布 | gist | ✓ 6.6K | ✓ 3.6K | ✓ 265 | ✓ 70 | ✓ 2 | `using-lwc` |

## 7. 本仓已经领先、不宜回退的点

这些不是「生态没有所以我们该抄」，而是本仓相对个人 second-brain 实现的工程优势。

1. **Wiki 是 IR，live 才是事实。** Query 必须回读 `## 来源` 里的 live 路径；drift 命中不得当新鲜事实。个人 wiki 多数把 raw 当唯一真相，适合外源剪藏，不适合模板 / 契约仓库。
2. **编译图 + SHA-256。** `.wiki-manifest.json` 把源 ↔ 文章做成可脚本化影响集。astro-han / guanyang 靠 Agent 搜索实体名做 cascade，无法对「哪一页因哪个 live 文件过期」给出确定性答案。
3. **derived / code-surface。** 锁文件只抽技能名、代码表面不进 raw，避免把 `skills-lock.json` 整本或源码树拷进 wiki。这是仓库治理需求，公开个人 wiki 基本没有。
4. **discover 勾选与 40 源刹车。** 禁止把 `docs/` 整树吞进去，排除审查与 scratch。个人 ingest 默认「用户丢什么吃什么」。
5. **human-owned + 稳定 ID + RETIRE。** rebuild 不是 `rm -rf wiki`。这保护了站内 `[[wikilink]]` 和外部引用。
6. **Query 只读。** 与 gist「好答案回写」相反，但是对模板权威源正确：一次问答不得改 IR。回写应走显式 `refresh` / 新源映射，而不是 query 副作用。
7. **可测脚本。** lint / drift / extract 有 node:test。多数公开 skill 把结构检查留给 Agent 判断。
8. **不把图谱 skill 写进默认入口。** 与已通过的 P1/P2 审查一致。

## 8. 可借鉴、可优化、可增强（按适配成本）

下列建议都服从本仓身份：`template-source` 的知识 IR，不是 Obsidian 第二大脑。标了「不要照搬」的项，只取其机制。

### 8.1 高适配：增强现有 compile / lint / query，不改产品定位

1. **Lint 增加「判断类报告」，但默认不自动改。**  
   来源：Karpathy lint；astro-han Judgment Reports；guanyang `lint-check.py` 的孤儿 / 单向链接。  
   本仓已有脚本化断链与孤儿。可增强为可选报告：高频提及但无专页的术语、只出不回的链接、raw 已登记但无文章引用。不要自动建页。

2. **证据抽查部分机械化。**  
   来源：astro-han `check_evidence.py`（数字、ISO 日期、较长引语必须出现在 cited raw/live）。  
   本仓现在是 Agent 抽 5 条。可对「来源」列出的 live 文件做高信号字面核验，失败只报告。不要把枚举/HTTP 语义改成 grep 即真理。

3. **Query 在 index 未命中时做同义词 / 全文兜底。**  
   来源：astro-han「index + 全文都空才能说没有」；nanzhipro「BM25 只找候选，必须打开页面」。  
   本仓 query 只匹配 index 分类与 `[[wikilink]]` 专名。中等规模（当前 23 页）可先加 `rg` 标题/首段搜索；不要引入向量库。仍遵守最多打开 8 页、回读 live。

4. **Refresh 影响集可视化。**  
   来源：astro-han ingest log 的 Disposition / Updated 列表。  
   `inventory.mjs drift` 已有 JSON。refresh 完成时应在 `log.md` 写清 changed/missing sourceId 与重写文章 ID，便于审查而不是只写一句 `REFRESH`。

5. **Triage 语义用于「新 live 文件」。**  
   来源：astro-han New / Update / Disputed / No material。  
   本仓已规定新文件只列候选。候选输出可改成这四态，避免「有新文件就想建页」。No material 应记 log、不建页。

### 8.2 中适配：补一个窄的 `ingest`，不要替代 refresh

Karpathy 与几乎所有公开实现的主动词是 **ingest**。本仓主动词是 **refresh/rebuild 已映射的 live 源**。空缺不在「增量」，而在「人类新丢进来的外源」没有一等入口。

建议的本仓 ingest（若做）必须是窄垂直能力：

- 输入：用户点名的 URL / 粘贴 / 仓库外文件，或 `research` 已落盘的一手笔记。
- 动作：写入 `raw/` 的 **labelled extract 或 copy**，在 manifest 登记 `kind: document|derived`，列出将更新的文章候选，等人确认后再写 wiki。
- 禁止：静默建页、query 顺手 ingest、把 `docs/reviews` 当源、改 live 权威文件。
- 与 `research` 的边界保持现状：一次性笔记走 `research`；要进持久 wiki 必须再走 `llm-wiki`。

pin-llm-wiki 的 `inbox.md` + `queue` 可借鉴为「待确认源队列」，但配置文件不要做成第二套权威；manifest 仍是编译图。

**不要**把 guanyang 那种 web-search `refresh` 接到模板权威页上。本仓 refresh 的对象是仓库 live 文件。外网复核属于 `research`，确认后再 ingest。

### 8.3 中适配：页面类型与冲突标注，保持扁平 ID

1. **可选 `Status` 块。**  
   astro-han 的 Disputed / Outdated 适合「两份 ADR / 两版技能文案打架」。本仓文章目前默认单一 live 源正确。增强点：当同一文章的多个 `sourceIds` 冲突，或 live 与旧 raw 冲突，写显式状态，而不是在 refresh 里静默以最新 live 覆盖并假装从未冲突。

2. **概念表可作为 index 附件，不要新开实体目录。**  
   nanzhipro `concept-table.md` 对 Agent 导航有用。本仓文章 ID = 文件名，分类在 `index.md` 的 `##`。若加概念表，应是基础设施文件（与 `index.md` 同类），不要改成 `wiki/entities/` 破坏稳定 ID。

3. **SCHEMA 与指针分离可学，但本仓已有等价物。**  
   nanzhipro 用 `SCHEMA.md` + 薄 `AGENTS.md`。本仓是 `wiki/CLAUDE.md` + 技能 `references/`。不必再引入第四份契约；若多 Agent 指针文件出现重复规则，再收束到一份 schema。

### 8.4 低优先级 / 明确不要当默认能力

| 生态能力 | 为何不默认并入本仓 |
|---|---|
| Obsidian vault、Web Clipper、graph-colorize、Dataview | 本仓 wiki 服务 Agent 与模板治理，不是个人笔记 IDE。 |
| 图片 / PDF / YouTube 一等 ingest | 模板权威源是 markdown / YAML / 代码。多模态会扩大语料并削弱 live-hash。 |
| Query 自动回写、confidence 加减分 | 与「query 只读 + live 为事实」冲突；分数不可验证。 |
| 把 SQLite 提成权威（LWC） | 本仓需要 git-diff 可审的 markdown IR 与 manifest。图谱/FTS 最多做派生日志。 |
| publish 出 newsletter/slides | 用户指南与审查报告已有出口；不要让 wiki 再长一套 `output/`。 |
| 挂 `understand-knowledge` 或 skills.sh 安装 | 已审查禁止外部 skill 点名；公开面仍只放 `yss-*`。 |
| 拆成 wiki-ingest / wiki-query / wiki-lint 十几个 skill | 本仓要最小发现面。现有一个 skill + references 按需加载已符合 writing-for-agents。 |

图谱若将来要做：独立可选后处理，消费 `[[wikilink]]` 与 manifest，输出不进 `wiki/*.md` 文章集合，也不进默认 `init`。

## 9. 建议的演进顺序（研究结论，不是实现授权）

若后续要把研究变成模板维护，按 `docs/process/harness-process-tailoring.md` 对 skill 行为变更分级；改 `SKILL.md` / 脚本通常至少 L2。

1. **先优化现有四模式**：lint 判断报告、drift/refresh log 结构化、query 未命中时的标题全文兜底、新文件四态 triage。证据可用现有 fixture 与 `wiki/`。
2. **再评估窄 ingest**：只服务「research 落 wiki」和「用户点名外源」。合同必须写清与 `research`、discover 排除表、query 只读的边界。
3. **最后才考虑** 可选 BM25 / 图谱 / publish，且默认关闭，不进 Router 闭包，不进 `yss-public-skills.json`。

## 10. 未验证项

- 未 clone 运行任何外部 skill，未复现其 lint 脚本或 BM25。
- 未整本读取 `alirezarezvani/claude-skills`、`nousresearch/hermes-agent`、`llmrix/llm-wiki-skill`、`One4Shell/llm-wiki-skill`、`noaul/llm-wiki` 的源码；web 搜索命中过这些仓库，但能力表不引用未打开的文件。
- skills.sh 安装数是页面快照，不是 API 保证。
- `understand-knowledge` 的仓库 owner 已从搜索中的 `lum1104` 变为页面上的 `egonex-ai`；以本次打开的 skills.sh 页为准。
- 后台调研代理若另写外部摘录，以该文件的引用为准做补充，不自动覆盖本对照结论。

## 11. 来源

- `https://www.skills.sh/`
- `https://www.skills.sh/astro-han/karpathy-llm-wiki/karpathy-llm-wiki`
- `https://www.skills.sh/ar9av/obsidian-wiki/llm-wiki`
- `https://www.skills.sh/alirezarezvani/claude-skills/llm-wiki`
- `https://www.skills.sh/nousresearch/hermes-agent/llm-wiki`
- `https://www.skills.sh/nanzhipro/karpathy-llm-wiki-bootstrap-skill/llm-wiki-bootstrap`
- `https://www.skills.sh/ndjordjevic/pin-llm-wiki/pin-llm-wiki`
- `https://www.skills.sh/lum1104/understand-anything/understand-knowledge`
- `https://www.skills.sh/egonex-ai/understand-anything/understand-knowledge`
- `https://www.skills.sh/guanyang/llm-wiki/llm-wiki`
- `https://www.skills.sh/karlorz/llm-wiki/wiki-ingest`
- `https://www.skills.sh/jackwener/llm-wiki/ingest`
- `https://www.skills.sh/vanillaflava/llm-wiki-claude-skills/wiki-ingest`
- `https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f`
- `https://github.com/Astro-Han/karpathy-llm-wiki/blob/eafcc77001e496cc43499e4923b663aec722c813/SKILL.md`
- `https://github.com/Ar9av/obsidian-wiki/tree/52c9f2bae2fccfdeff155a664af3cad0d4041b62/.agents/skills`
- `https://github.com/nanzhipro/Karpathy-llm-wiki-bootstrap-skill/blob/c69ee549f72976057f1ad83ddce92857b47b5385/skill/SKILL.md`
- `https://github.com/ndjordjevic/pin-llm-wiki/blob/e76e4012d8c393665517de6609a0197ede99a51d/skills/pin-llm-wiki/SKILL.md`
- `https://github.com/guanyang/llm-wiki/blob/e4aec872c98a950017605063f21745e6d927b94d/skills/llm-wiki/SKILL.md`
- `https://github.com/JanYork/llm-wiki-cli` README（本次下载 SHA `659fbf0802d04768f0351395eca02522e83a60e4`）
- `.agents/skills/llm-wiki/SKILL.md`
- `.agents/skills/llm-wiki/references/{schema,compile,query,discover,writing,lint}.md`
- `.agents/skills/llm-wiki/scripts/{inventory,lint-wikilinks,extract}.mjs`
- `CONTEXT.md`（LLM Wiki 术语）
- `yss-project.yaml`
- `skills-lock.json`（`llm-wiki` 条目）
- `wiki/wiki/LLM Wiki.md`
- `.template-source/README.md`（治理区边界）
- `docs/reviews/llm-wiki-p12-focused-review-2026-08-23.md`
