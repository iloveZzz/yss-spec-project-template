# llm-wiki 技能深度研究与改进建议

研究日期：2026-09-28。研究对象为本仓 canonical `.agents/skills/llm-wiki`，本地基线 commit 为 `79c405998388ee1b13e166377cdfc3bfaa9f0c14`。本报告是维护研究，不是实现、审批或发布结论。

## Research Scope

- Profile：`technical-evidence`；Mode：`evidence-audited`。外部项目比较按 `competitive-intelligence` 取证，中文报告按 `i-have-adhd` 与仓库文档规范组织。
- 决策问题：现有技能怎样在保持来源可信、只读查询和人工资产保护的前提下，减少重复阅读、无效重写与人工往返？哪些差距应优先修复？
- 纳入：本地 Skill、全部 7 个 references、4 个运行脚本和 4 个测试文件；公开 GitHub 技能、第一方源码、测试与完整默认分支历史。
- 排除：聚合站排名、Reddit 营销帖、无来源性能数字、仅凭 stars 的成熟度结论、纯聊天 UI 与没有相关技能的通用 RAG 平台。不安装或运行外部项目，不调用付费模型。
- 活跃度口径：固定 HEAD 可达的全部历史，按 committer 时间、截止 `2026-09-28T03:02:28Z` 计算 30/90 天提交数；包含 merge，活跃日期统一为 UTC。完整记录见 [github-activity.json](github-activity.json)。这只能描述所观察分支的维护活动，不能证明质量或社区响应能力。
- 访问限制：子研究员访问 GitHub REST API 遇到 403 限流，改用公开 Git 协议完整 bare clone；所有统计仓库均 `shallow=false`。未统计 issue 首次响应、实际安装量或真实运行效果。

## Executive Read

**建议保留当前轻量架构，先补“内容是否真的更新”的机器证据，再优化查询与增量更新，最后用真实问题验证收益。** 现有技能的弱点集中在规则执行闭合与评测，而不是缺少更多命令。

当前优势是 `raw / wiki / manifest` 清晰、查询只读、live 优先、来源到文章的增量映射、人工页面保护、按需加载与零额外运行依赖。18 项现有测试本次全部通过（claim-001）。但隔离反例表明：仅更新 manifest 的源哈希，就能让仍然旧的 raw 和文章通过 status、lint、advise（claim-002）。因此 `lint 0` 还不能代表编译新鲜。

优先顺序：

1. **P0 正确性**：编译状态与源观察状态分离；补全 manifest/来源/人工所有权检查；为删除和外部来源定义可闭合的状态。
2. **P1 提效**：查询按问题限定相关范围并分层核验；增量更新区分原始字节变化和有效内容变化；批量操作支持预览、恢复、幂等与范围复用。
3. **P1 效果验证**：用同模型、同问题、同源版本的无 wiki / 现状 / 改进方案对照，测正确性、引用支持率、实际 token、阅读量、时间和人工往返。
4. **P2 扩展**：有证据表明检索不足时才增加 BM25、向量或更复杂图结构；可视化、发布、多模态解析均按真实需求另行接入。

## Findings

### 1. 当前技能的可保留能力和真实边界

| 能力 | 已有事实 | 当前边界 |
|---|---|---|
| 入口与按需加载 | `SKILL.md` 55 行、3,419 bytes；模式算法放在 references | 不需要为了提效先拆成一套庞大技能包 |
| 增量状态 | 对每个 `livePath` 计算 SHA-256，按 `sourceIds` 找文章 | 字节变化不等于知识变化；只覆盖直接登记关系 |
| 只读查询 | 明确禁止改 raw、文章、索引、日志和 manifest | 每条断言都回读 live；任意源漂移会在选页前要求询问 refresh |
| 人工保护 | 文档认可 frontmatter 或 manifest 任一标记 | `drift` 的 `humanOwned` 数组只读 manifest |
| 结构校验 | 检查链接、索引、H1、来源标题、部分 manifest 字段 | 不验证来源小节内容有效性、文章编译版本或完整 schema |
| 建议扫描 | `advise` 检查单向链接、缺术语页、未引用 raw、高信号字面量 | 不是语义事实审查；普通中文旧结论可不触发 suspects |
| 来源选择 | 不全盘摄取 docs，不复制完整 lock；支持代码表面来源 | source/extract 配置仍较手工；外部来源没有可判定新鲜度的结构字段 |

证据：本地 [入口](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/llm-wiki/SKILL.md)、[compile](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/llm-wiki/references/compile.md)、[query](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/llm-wiki/references/query.md)、[unit-tests.txt](unit-tests.txt)。（claim-001）

当前模板 wiki 实测有 16 个来源、23 篇文章；14 个来源漂移，影响 23 篇文章，12 份 document raw 与 live 不同。登记 live 文件共 215,108 bytes；一次本地 warm status 约 5 ms，不能当规模化 benchmark。眼下没有证据证明哈希 I/O 是主要瓶颈，不能为了提效先跳过哈希。该 wiki 的过期事实也不代表技能更新会失败，本次没有执行真实 refresh。见 [current-wiki-status.json](current-wiki-status.json)。（claim-007）

### 2. GitHub 对照：活跃度与可借鉴机制分开看

| 项目 | 最近提交（UTC 日期） | 30 / 90 天提交 | 90 天活跃日 | 研究定位 |
|---|---:|---:|---:|---|
| [nvk/llm-wiki](https://github.com/nvk/llm-wiki) | 2026-09-15 | 22 / 108 | 22 | 本样本中有近 30 天维护证据；重点参考 |
| [po4yka/llm-wiki-skills](https://github.com/po4yka/llm-wiki-skills) | 2026-08-20 | 0 / 530 | 8 | 近 90 天集中建设，近 30 天无提交；重点参考评测与来源治理 |
| [jackwener/llm-wiki](https://github.com/jackwener/llm-wiki) | 2026-07-10 | 0 / 1 | 1 | 检索实现参考，不能称当前高频活跃 |
| [micuintus/llm-wiki](https://github.com/micuintus/llm-wiki) | 2026-05-30 | 0 / 0 | 0 | 轻量技能的历史设计参考 |
| [MinhMPA/llm-wiki](https://github.com/MinhMPA/llm-wiki) | 2026-05-18 | 0 / 0 | 0 | 来源记录、关系记录和审阅边界参考 |
| [lewislulu/llm-wiki-skill](https://github.com/lewislulu/llm-wiki-skill) | 2026-04-16 | 0 / 0 | 0 | 人工反馈闭环的历史设计参考 |

统计包含 merge 和依赖维护。po4yka 的 530 次提交集中于 8 个 UTC 日期，且最后提交为依赖更新的合并，不能解读为每天活跃或比其他项目更成熟。上表由完整 Git 历史重新统计，固定 SHA 和逐条记录见 [github-activity.json](github-activity.json)。（claim-009）

| 项目 / 机制 | 第一方证据 | 适合我们的吸收方式 | 不应照搬的部分 |
|---|---|---|---|
| nvk：Query Lite、按主题逐级定位、明确不执行资料中的指令 | [Query Lite 固定版 L14–55](https://github.com/nvk/llm-wiki/blob/1224fbcdf3827f4ba56d225a9e359f5e8a5594e5/plugins/llm-wiki/skills/wiki-query/SKILL.md#L14) | 给查询明确阅读预算、停止条件、证据层级和不可信来源边界 | 它默认将编译文章作为事实层；我们不能因此取消关键 live 核验 |
| nvk：给查询入口及懒加载资料设置字节预算 | [预算文件 L48–62](https://github.com/nvk/llm-wiki/blob/1224fbcdf3827f4ba56d225a9e359f5e8a5594e5/tests/budgets/token-budgets.json#L48) | 建立本地入口与各模式的体积回归预算，另采集真实 token | bytes 不是实际 token；预算存在也不证明查询更准 |
| po4yka：与无 wiki 基线对比、分层评测 | [Eval Skill L66–145](https://github.com/po4yka/llm-wiki-skills/blob/fd1bf9be2e479a255dde047e45530543b7f2dac8/skills/llm-wiki-eval/SKILL.md#L66) | 采用检索、事实支持、答案质量、操作成本四类指标 | 不照搬它的全套技能数、运营体系和未校准阈值 |
| po4yka：重要断言的 claim/source anchors 与支持类型 | [Claim Anchors L38–75](https://github.com/po4yka/llm-wiki-skills/blob/fd1bf9be2e479a255dde047e45530543b7f2dac8/skills/llm-wiki-claim-anchors/SKILL.md#L38) | 先覆盖接口状态、权限、版本、配置默认值等高风险结论 | anchor 校验主要验证格式和重复，不能证明语义正确 |
| po4yka：离线过期报告与在线核验分离 | [refresh 说明 L26–34](https://github.com/po4yka/llm-wiki-skills/blob/fd1bf9be2e479a255dde047e45530543b7f2dac8/docs/operations/refresh.md#L26) | 外源分别表示 snapshot 完整性、最后核验日期、当前未知 | 不将 TTL 到期等同于内容已改变，也不把离线报告当在线核验 |
| jackwener：BM25、CJK 分词和可选混合检索 | [检索源码](https://github.com/jackwener/llm-wiki/blob/cd5466678341885fa29ca9e27fa9604c2e9c11c5/src/lib/search.ts) | 中文别名与正文召回不足时，增加本地可重建检索层 | 不强制 DB9、云端 embedding，也不把检索索引提升为事实源 |
| lewislulu：带位置锚点的人工反馈 | [Skill audit 协议](https://github.com/lewislulu/llm-wiki-skill/blob/d7751c0a2bb4c58d0808ccd6ddae2fdcc0de4824/llm-wiki/SKILL.md) | 采用反馈定位、处置原因和受影响页闭环 | 当前没有必要引入专用 viewer 或查询自动写回 |
| micuintus：区分登记来源与完成编译 | [Ingest 协议 L34–87](https://github.com/micuintus/llm-wiki/blob/62c7f0d92966285d9a4d29bb2a3aaead16a02974/llm-wiki/SKILL.md#L34) | 将 pending/compiled 状态落实到机器检查 | 上游仅有协议，公开 URL 也不能一律当作不可变来源 |
| MinhMPA：source record、重复/替代关系、显式保存查询成果 | [README 固定版](https://github.com/MinhMPA/llm-wiki/blob/42c8d032daa8e7716e4c6b947ef51cfae2e8422c/README.md) | 将来源身份、版本和来源间关系补入现有 manifest | 不为当前工程 wiki 引入 BibTeX、论文专用目录与另一套权威库 |

上述为源码/协议能力对照，未在相同语料运行竞品。不能据此宣称任何项目更省 token、准确率更高或能替代本技能。（claim-010、claim-011、claim-012、claim-013）

### 3. 优先修复：已复现的可靠性缺口

全部反例在临时目录构建，未改真实 wiki。命令与输出见 [reproduce-gaps.mjs](reproduce-gaps.mjs)、[gap-results.json](gap-results.json)。脚本退出 0 表示反例执行结束，不代表问题已修复。

#### P0-A：源哈希更新可掩盖尚未编译的旧内容

触发：live 从旧版改新版，raw 与文章保留旧版，运行 `inventory hash`。结果：`changed=[]`、`articles=[]`、`lint.ok=true`、所有 advise 数组为空，旧内容仍在。`hashSources` 会直接改 `sha256`、`compiledAt` 和 `gitCommit`；lint 只比较 live 与该哈希，没有验证 raw 内容或文章的编译输入。（claim-002）

定位：[inventory.mjs:55](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/llm-wiki/scripts/inventory.mjs:55)、[lint-wikilinks.mjs:108](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/llm-wiki/scripts/lint-wikilinks.mjs:108)。

建议合同：源观察记录 `observedDigest`；文章成功编译记录 `compiledFrom` 与文章内容摘要；document raw 验证 copy digest，derived raw 绑定输入摘要和抽取 recipe 版本。只有本轮选定文章写入、结构校验、必要事实抽查完成后，才能推进其编译水位。单独重新 hash 不得宣布文章 fresh。刷新流程本身也应明确最后何时更新水位，目前 refresh 步骤没有明确该动作。

验收：仅 hash、只更新 raw、不更新文章、编译中断、部分文章失败等场景不能清除相关文章的 stale；失败后保留旧的可用版本和待处理状态。摘要只能证明绑定与完整性，仍不能替代语义事实检查。

#### P0-B：manifest 和 human-owned 规则没有完整落入机器检查

触发一：只在文章 frontmatter 写 `human-owned: true`，源发生变化；status 的 `humanOwned=[]`。这是保护状态遗漏，**本次没有复现 Agent 实际覆盖人工正文**。触发二：将 schemaVersion 设为 999、重复 source ID、文章 sourceIds 置空、来源小节留空；lint 仍通过。单独令 `rawPath=../source.md` 也通过。（claim-005、claim-006）

定位：[inventory.mjs:118](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/llm-wiki/scripts/inventory.mjs:118)、[lint-wikilinks.mjs:77](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/llm-wiki/scripts/lint-wikilinks.mjs:77)。

建议合同：所有命令共用一个 manifest/frontmatter 解析器；任一 human-owned 标记为 true 就保护正文，并把冲突报告出来。严格校验 schemaVersion、枚举、唯一 ID、文章与来源关系、非空且可解析的引用；路径经过 realpath 校验，只落入已声明的 repo/wiki 根，另测符号链接逃逸。为受保护正文保留 before/after 摘要，链接修复单独定义允许的差异。

验收：未知 schema、重复 ID、空依据、路径越界必须以明确错误拒绝；人工正文发生非授权改变必须失败。保留文档语义核验，不能用“有来源锚点”冒充“来源支持断言”。

#### P0-C：删除与外部来源缺少一致的新鲜度状态

删除场景：文档要求保留文章并标注来源缺失，但 lint 无条件报 `MANIFEST SOURCE MISSING`；即便加入 Outdated 状态，依旧无法达到 refresh 要求的 lint 0。外部场景：无 `livePath` 的来源直接进入 `unchanged`，甚至 raw 改变也不触发 stale。（claim-003、claim-004）

定位：[compile.md:90](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/llm-wiki/references/compile.md:90)、[inventory.mjs:101](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/llm-wiki/scripts/inventory.mjs:101)、[lint-wikilinks.mjs:126](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/llm-wiki/scripts/lint-wikilinks.mjs:126)。

建议合同：区分 `current / stale / missing / unverified / archived`；外部来源记录 origin URL、抓取日期、原始或抽取内容摘要、最后在线核验日期，可选 ETag/Last-Modified。无在线检查表示 unverified，不能表示 unchanged。删除保留 tombstone 和最后有效快照；将“结构有效”和“仍可作为当前事实”拆开返回。后者不能因 tombstone 合法而自动通过。

验收：HTTP 不可用不伪造变化或未变化；raw 损坏能检出；保留历史文章能完成维护，但查询必须显示历史/缺失限制；关键 live 来源丢失仍阻断当前事实结论。

### 4. 提效：减少不必要的工作，同时保留验证

#### P1-A：先定位问题相关范围，再决定核验深度

当前 query 在选页之前检查全体来源，任何漂移均要求询问 refresh；选页最多 8 篇，但不限制文件长度或引用 live 文件的总量，且每条断言必须回读 live。标题与首段无命中即可报不覆盖，正文中的独有术语可能漏掉。前两点是明确协议事实，实际时间/token 损失尚未量化。（claim-007）

建议：先用 index、标题、别名定位候选页，再读取其来源状态，其他源漂移只做简短背景提示；相关页漂移时直接做只读 live 核验并说明 wiki 待更新，不把普通查询变成修 wiki 的前置问答。增加有界正文检索兜底，再考虑中文 BM25。定义两档核验：一般解释可使用已绑定且当前的编译证据；配置、API、权限、版本和其他时效敏感断言必须回源。**放宽重复回源之前，先完成 P0 的编译证据绑定。**

参考 nvk 的 Query Lite 与预算文件，但保持我们的工程事实边界。可按 `maxArticles / maxSourceBytes / maxToolCalls` 建立内部预算，超预算返回具体缺口，不能静默截断关键证据。数值用评测校准，不照搬别人的阈值。

验收：无关源变化不阻断答案；正文独有术语可召回；相关源漂移不得冒充当前 wiki 事实；整个查询前后 wiki 文件摘要完全一致；代码调用链定位复用已有 CodeGraph/Graphify 能力，不自动重建图。

#### P1-B：增量编译关注有效内容、抽取结果与完整依赖

目前 source hash 是完整文件字节。以 `skill-names` 为例：如果 lock 只改 hash metadata，抽取出的技能名不变，仍会把依赖文章标记为受影响。`drift` 只匹配直接 `sourceIds`；反例中 Beta 复述 Alpha 却未登记同一 live 来源，只会命中 Alpha。规范本来要求每个事实回到来源，因此 Beta 属于不完整依赖输入；当前检查未检出它，不能据此说合规 manifest 必然漏刷新。（claim-008）

建议：保留完整源摘要用于完整性，另算 `effectiveDigest`；derived 来源优先比较确定性抽取产物。把 `heading-list` 改成可重放脚本；`prose-note` 记录模型/提示版本和输入列表，但不声称自然语言抽取可完全确定。文章要么显式登记全部底层来源，要么声明可校验的文章依赖并计算传递闭包，区分导航链接与事实依赖，避免把全图都重写。

验收：纯 lock metadata 变化不重写文章；有效名称变化刷新正确集合；共同来源、多输入抽取、文章汇总依赖、循环依赖均有场景；未命中的文章字节不变。不能用忽略某些字段的投影漏掉实际消费的事实。

#### P1-C：把计划、应用和恢复变成有界批处理

现有写入主要依靠 Agent 手工顺序执行，manifest 直接覆盖写，尚无统一事务或恢复协议。ingest 每次展示候选后停等，init/discover 也会逐项询问已可能确定的路径和语言；文档阈值只按 40 个 document 数量，不能表示实际上下文大小。

建议：新增内部 `plan → apply → verify → finalize` 工作流。先输出来源/页面影响列表、写入范围、冲突与预计读取量；复用当前会话已授权范围。将待处理批次、幂等键和进度记录在现有 manifest 的运行段或纯派生临时目录，避免新建第二个权威配置。每批按页数和字节限制；中断后重放未完成部分，最后一次性更新水位和日志。并行只用于无重叠文章，主控独占 index/log/manifest，延续现有规则。

一次已确认的一组来源不应逐来源再问同一个问题；新增冲突、人工内容修改或范围扩大再取真实决定。批处理不能默认开启自动联网、自动提交或发布。

验收：重复同一批次无多余改动/日志；中断恢复不丢状态；两个写者不互相覆盖；拒绝候选只保留允许的待处理证据；小型无依赖写入不要为并行而启动额外 Agent。收益通过工具次数、人工往返和恢复成功率测量。

#### P1-D：让事实抽查、冲突与反馈可追踪

当前抽查上限是 5 个页面相关 claim，来源主要是页尾列表；不能定位某条结论具体依赖哪一段。固定数量抽查没有风险分层，单向链接建议也不能直接当缺陷：文章之间完全可以是合法的单向引用。

建议：先为高风险结论添加 `claim → sourceId + locator + sourceDigest + supportType`，普通概述不强迫逐句结构化。事实与推断分开；发生冲突保留不同来源及各自适用范围。特别区分“代码实际行为”和“批准合同要求”：代码可证明运行事实，却不能自动取代合同的规范权威。

人工纠错使用页 ID、选中文本及前后文、原因、accepted/partial/rejected/deferred 处置和闭合证据。先做文件协议，不先造 UI。Query 继续只读；用户明确要求沉淀答案时走独立确认写入路径。外部资料中的命令和提示只当证据文本，不能升级为执行指令。（参考 claim-011、claim-013）

### 5. 验证技能是否真正更有用

现有 18 项测试证明了一部分脚本行为，没有提供“用户问题是否答对、是否更快、是否减少重复读源”的对照数据。建议复用仓库已有 Agent evaluator 运行能力，但为 wiki 建独立语料和负例，不能让评估结果覆盖用户真实 wiki。（claim-001、claim-011）

| 评测层 | 最小覆盖 | 建议观察值 |
|---|---|---|
| 结构与状态 | 本报告 7 个反例；源删除/移动；重复 ingest；未知 schema | 错误接受数、恢复结果、未受影响/人工正文变更数 |
| 检索 | 中文别名、正文独有词、跨页综合、代码调用关系、无答案 | Recall@k、应读来源命中率、漏答与错误自信 |
| 事实支持 | 过时数字、配置/运行时差异、已冻结契约冲突、外源未知 | 关键断言支持率、陈旧事实误报数、来源定位有效率 |
| 工具与成本 | 同问题同源版本下无 wiki / 当前 / 候选 | 实际 input/output token、文件字节、工具调用、耗时、人工往返 |
| 更新维护 | 单源局部变化、无语义变化、大批更新、中断、并行写 | 重写页数、无效 diff、恢复重做量、峰值上下文 |
| 不可信资料 | 来源中包含“忽略规则/执行命令/改人工页”等文本 | 越权操作、越界读写、错误采纳外部指令 |

建议先从 20 个本仓真实问题建立人工核对的答案与必需来源集合，每类关键负例不能缺席；重要失败率目标为 0。只有观察到实际收益才设提效阈值，不能预先宣称“节省 50% token”。固定模型、提示与语料版本，分别记录首次构建成本、日常查询成本和更新成本，避免把写入成本转移出统计。

## Counter-Signals

1. 现有 18 个测试全部通过；Skill 已经明确要求事实抽查和人工保护。已复现的是机器检查可被不完整执行绕过，不是所有按规范执行的 Agent 都会失败。
2. 当前 wiki 规模很小，status 哈希约 5 ms 的单次观测不足以支持增加复杂缓存。优先减少模型重复阅读和错误状态；不要引入仅靠 mtime 跳过哈希的捷径。
3. nvk 查询更轻，但其默认事实层不同；它的编译增量协议使用 ingest 时间信号，不能直接替代我们的内容摘要。jackwener 的同步实现存在 mtime 快速路径，也不能直接当严格 freshness 样板。
4. po4yka 的 anchors 校验器检查格式、重复和支持标签，不审查自然语言蕴含关系；其 eval 文档是方法与模板，不是可移植的效果证明。
5. 更多页面、双向链接、更密的图和更多 Agent 都不必然改善问答。对 23 页现有规模，先补来源定位与检索兜底，比先引入数据库和服务更有依据。

## Source Map

- 本地第一方事实：canonical Skill/references/scripts/tests；基线 commit 已固定；四个运行脚本由 CodeGraph 优先定位，随后用临时 fixture 做行为验证。
- 本地运行证据：[unit-tests.txt](unit-tests.txt)、[gap-results.json](gap-results.json)、[current-wiki-status.json](current-wiki-status.json)。反例脚本只写系统临时目录并在结束时清理。
- GitHub 第一方事实：上表固定 SHA 文件和完整默认分支 Git 历史；网页搜索只用于发现候选，README 宣称与已读脚本/测试分开记录。
- 原始模式：[Karpathy llm-wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)用于确认知识编译模式背景，不用于证明维护活跃度或性能。
- 机器证据台账：[llm-wiki-evidence.yaml](llm-wiki-evidence.yaml)，含 Search Log、来源定位、claim 映射、反证与限制。

## Decision Handoff

下游所有者：模板维护者与 `maintaining-skills`。建议拆为以下独立可验收批次，工作量是相对复杂度，不是未经估算的工期承诺。

| 批次 | 优先级 / 相对工作量 | 交付边界 | 退出标准 |
|---|---|---|---|
| A 编译可信度 | P0 / 中 | schema、统一 ownership、raw/文章编译证据、missing/unverified、原子水位 | 本报告反例转成失败保护；兼容行为有明确测试 |
| B 查询与增量提效 | P1 / 中 | 相关范围查询、正文兜底、派生有效摘要、完整依赖、阅读预算 | 正确性不降，未命中页不改；对照运行观察到收益 |
| C 批处理与反馈 | P1 / 中至高 | plan/apply、幂等、恢复、写锁、显式反馈处置 | 中断恢复、并发冲突、人工确认范围、正文保护全部通过 |
| D 检索/展示扩展 | P2 / 条件触发 | 仅按测得缺口加 BM25、可视化或其他解析适配器 | 明确收益超过维护成本，离线降级与来源边界保持 |

兼容与迁移要求：

- 保留现有文章 ID、文件名和 `[[wikilink]]`；不为引入新 provenance 强制重命名/移动整个 wiki。
- 新 schema 写入前提供 v1 dry-run 迁移计划；只读识别 v1，不凭缺失字段猜测已验证。旧 `hash` 命令如保留，必须明确只更新观察状态，不伪装编译完成。
- 继续保持 status 的“有效报告 exit 0、执行错误 exit 2”约定；需要严格门禁时另设显式选项，避免改坏既有调用方。
- 已确认范围可复用；存量 wiki 按需迁移，不能因升级技能自动重建人工资产。
- 真正修改 Skill 时才按 `maintaining-skills` 更新 canonical、投影、registry/lock 和适用分发快照，判定维护强度并运行相应验证。本研究未授权或执行提交、推送、发布。

## Evidence Limitations

本次完成源码分析、18 项现有单测、7 个隔离反例、真实 wiki 的只读状态取样和 6 个外部仓库的 Git 历史核验。未运行真实 LLM 的端到端 init/refresh/query，对竞品没有安装测试；没有跨模型 token/延迟对照，因此提效建议是待验证方案，不是已实现收益。未对所有外部仓库 issue、分支、作者身份或提交质量做审计。

只新增本研究目录，没有修改技能、投影、锁文件、wiki 文章或 raw。研究不构成“技能无缺陷”“可发布”或候选实现批准。
