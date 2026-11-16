# llm-wiki 可选 QMD 检索实施计划

> 执行者先读配套设计。本计划建议沿用 executing-plans 顺序维护共享文件，独立 Agent 可承担隔离场景观察。步骤记录实际完成情况。

**Goal**

通过既有 QMD CLI 为 llm-wiki 提供可选本地检索，保留知识内容保护、当前原文回查和可定位的派生状态维护。

**Architecture**

新增技能内 `references/qmd.md`，既有发现、查询和摄取方法按条件读取。程序与工具状态使用独立临时目录验证，主源与两份 WorkBuddy 沿现有分发同步。

**Tech Stack**

Markdown、QMD `@tobilu/qmd@2.8.3`、Node.js 22 及以上、宿主现有文件工具。模型路径按实际混合查询准备范围配置。

**Spec**

[QMD 可选检索设计](2026-11-16-llm-wiki-qmd-design.md)。用户已于 2026-11-16 批准实施，CLI 优先和专用工具工作区为本轮采用机制。

## Global Constraints

- 本仓不维护或分发脚本与测试套件。
- 提交、推送、部署、发行及向外部发送内容使用对应动作的真实授权。
- 真实项目资料、用户级宿主配置和全局安装按对应目标及授权处理。
- 普通文件查询与纯检查按现有约定保持知识内容、导航、日志及既有缓存只读。
- 已授权使用 QMD 时，知识目录保持只读，派生写入限定选定工具工作区。
- 入口 `disable-model-invocation: true` 与 `policy.allow_implicit_invocation: false` 沿用现有显式调用政策。
- 当前依赖是上一轮未提交候选树 `b55a9ed1ae979dac73ab1e86a061e119f82abcfd808c4f40f80460911d285c6a`，执行前核对实际差异并保护已有工作。

## Review Focus

1. 把 BM25 当成所有文件零写入会误述权限，任务 1、2 分别核对约定与实际文件变化。
2. 默认索引、同名集合或路径逃出范围会混入资料，任务 2 固定程序、状态和集合，任务 3 回查实际路径。
3. 索引快照、删除停用与当前证据不同步会保留旧结论，任务 3 检查当前原文与派生清除。
4. 未备模型、中文 embedding 或未知旗标会产生虚假能力承诺，任务 2、4 依据安装来源、帮助和实际结果判断。
5. 新参考、地图或锁字段遗漏会造成不同平台行为漂移，任务 5 核对完整树、元数据与结果表述。

## 文件责任与顺序

当前工作树为 `/Users/zhudaoming/.codex/worktrees/llm-wiki-evolution/yss-spec-project-template`。沿用本轮技能维护约定，单一集成者顺序修改共享文件。演练在独立临时目录进行，每个变更场景从相同初始资料复制。

| 文件 | 处理 |
| --- | --- |
| `.agents/skills/llm-wiki/references/qmd.md` | 新增 QMD 的版本、准备、查询、维护和故障处理方法 |
| `.agents/skills/llm-wiki/SKILL.md` | 增加条件读取入口及可见写入边界 |
| `.agents/skills/llm-wiki/references/query.md` | 区分普通文件查询与已启用 QMD 的工具状态 |
| `.agents/skills/llm-wiki/references/discover.md` | 使用 QMD 的条件与准备入口 |
| `.agents/skills/llm-wiki/references/ingest.md` | 已启用派生索引随来源变化处理 |
| `.agents/skills/llm-wiki/assets/CLAUDE.md.template` | 简短说明可选工具与知识内容保护 |
| `.workbuddy/skills/llm-wiki/`、`profiles/backend/.workbuddy/skills/llm-wiki/` | 同步受影响文件和新增参考 |
| 三份 `.template-spec/agents/profile-skills.md` | 同步查询保护与工具状态授权说明 |
| `profiles/backend/skills-lock.json` | 仅重算本技能既有 `effectiveHash` |

顺序为任务 1 → 任务 2 → 任务 3 → 任务 4 → 任务 5。任务 2–4 依次补齐同一 QMD 参考，避免并行覆盖。

## Task 1，操作约定与入口

**Files**

- 新增 `.agents/skills/llm-wiki/references/qmd.md`。
- 修改 `.agents/skills/llm-wiki/SKILL.md`、`references/query.md`、`references/discover.md` 和 `assets/CLAUDE.md.template`。

**Interfaces**

- 输入为本设计的权限表、当前查询方法、选定工具程序与状态范围。
- 输出为后续任务共同使用的 QMD 启用信息和引用路径，权限约定由入口到参考一致表达。

- [x] **Step 1，写入使用条件。** 明确用户要求 QMD 或已有明确启用信息时读取 `references/qmd.md`，其余请求使用现有文件路径。启用信息包含程序、版本、索引、集合、知识根与状态目录。
- [x] **Step 2，写入派生状态边界。** 在入口、查询和模板中明确知识文件只读与工具工作区可写的范围，普通文件查询沿既有严格约定。用户已有同范围授权可复用。
- [x] **Step 3，接通发现入口。** discover 将具体检索需求指向 QMD 参考，准备模型、索引和集合使用对应操作范围。
- [x] **Step 4，走查授权场景。** 对“只回答”“用已启用 QMD 查询”“准备专用 QMD”“查询并保存”逐项列出实际可读和可写目录，确认没有依靠工具安装或来源指令扩大范围。

## Task 2，隔离准备与 BM25 定位

**Files**

- 完善 `.agents/skills/llm-wiki/references/qmd.md`。
- 临时目录保存程序、合成 Wiki、状态及观察记录。

**Interfaces**

- 使用任务 1 的程序、状态目录、索引及集合信息。
- 产生经过实际帮助和运行核对的准备命令、BM25 查询方法、文件写入观察和缺失工具回退。

- [x] **Step 1，核对运行环境。** 读取当前 `node --version`，优先核实已有 QMD 的安装来源、`--version` 和 `--help`。缺少工具时在临时目录安装固定发布包，并记录来源与版本。
- [x] **Step 2，创建隔离集合。** 清除继承的 `INDEX_PATH`，使用进程级官方目录设置和固定命名索引，仅添加已核实真实路径的合成 Wiki。读取生成配置，核对集合路径、mask 和 update hook。另以独立合成目录构造其他集合、同名集合的其他索引和越界链接，作为范围对照输入。
- [x] **Step 3，运行 BM25。** 使用下列发布版命令形状，实际调用前核对本机帮助。以中文标题、英文别名和同名对象查询并回查原文，记录命中、遗漏和实际文件变化。
- [x] **Step 4，核对缺失和严格只读场景。** 工具不可用、未启用或要求全部派生状态零写入时，运行现有文件检索完成可做部分。比较知识目录前后文件清单与原始字节 SHA-256，QMD 状态单独盘点。

安装与目录设置仅用于实施阶段的隔离观察。`wiki_qmd_tools`、`wiki_qmd_state`、`wiki_qmd_sources` 由执行者创建为实际临时绝对路径，知识目录中保留中文与空格路径样本。

```sh
npm install --prefix "$wiki_qmd_tools" --cache "$wiki_qmd_state/npm-cache" @tobilu/qmd@2.8.3
wiki_qmd_bin="$wiki_qmd_tools/node_modules/.bin/qmd"
env -u INDEX_PATH QMD_CONFIG_DIR="$wiki_qmd_state/config" XDG_CACHE_HOME="$wiki_qmd_state/cache" "$wiki_qmd_bin" --version
env -u INDEX_PATH QMD_CONFIG_DIR="$wiki_qmd_state/config" XDG_CACHE_HOME="$wiki_qmd_state/cache" "$wiki_qmd_bin" --help
env -u INDEX_PATH QMD_CONFIG_DIR="$wiki_qmd_state/config" XDG_CACHE_HOME="$wiki_qmd_state/cache" "$wiki_qmd_bin" --index llm-wiki collection add "$wiki_qmd_sources" --name wiki --mask '**/*.md'
env -u INDEX_PATH QMD_CONFIG_DIR="$wiki_qmd_state/config" XDG_CACHE_HOME="$wiki_qmd_state/cache" "$wiki_qmd_bin" --index llm-wiki search '松果 Pinecone' -c wiki -n 10 --format json
```

预期业务集合仅包含指定目录，查询结果限定选定索引与集合，知识目录字节不变。对照目录放置唯一文本 `QMD_CONTROL_SENTINEL`，在选定 `wiki` 集合搜索该文本应无命中，在对应对照集合搜索应命中。结合索引文件的实际定位核对并处理越界链接。状态目录中的初始化和缓存行为按实际输出记录。示例结果数量只控制返回数量，证据缺口决定是否追加读取。

## Task 3，当前原文、更新与清除

**Files**

- 完善 `.agents/skills/llm-wiki/references/qmd.md`。
- 修改 `.agents/skills/llm-wiki/references/query.md` 与 `references/ingest.md`。

**Interfaces**

- 使用任务 2 的集合与实际状态目录，继续使用既有主张证据及人工保护规则。
- 输出为从 URI、docid 或片段定位当前文件的方法，以及已授权更新、失效传播和派生清除路径。

- [x] **Step 1，补结果回源。** 核对结果与集合根的实际映射、真实路径及读取范围，读当前磁盘正文后引用。`get` 的行号只定位其索引快照，最终引用核对当前文件行。
- [x] **Step 2，演练陈旧索引。** 先索引含上限 50 条的页面，再在知识文件中改成 75 条。纯查询读取当前原文并说明快照状态，已授权维护时核对配置后运行 `qmd --index llm-wiki update`，再次搜索并回源。
- [x] **Step 3，演练移动与 hook。** 移动、删除已索引页面并查询旧路径，核对定位限制和文件检索回退。给隔离配置加入一个写临时标记的演练 hook，比较查询和明确 update 的实际行为，保持知识目录保护。
- [x] **Step 4，演练敏感派生清除。** 添加合成敏感标记并建立索引，再按用户明确删除范围处理知识与已知 QMD 状态。核对旧片段、文档快照、数据库/WAL及缓存，无法证明细粒度清除时移除本次专用派生状态并从剩余资料重建，说明实际处理位置。

所有 QMD 调用沿用任务 2 的目录环境和选定程序。测试修改来源和测试 hook 都限定在独立合成场景，与纯查询场景分别记录。

## Task 4，中文混合查询与故障边界

**Files**

- 完善 `.agents/skills/llm-wiki/references/qmd.md` 中中文、模型与故障部分。
- 按观察结果调整 `.agents/skills/llm-wiki/references/query.md` 的选择条件。

**Interfaces**

- 使用任务 2、3 的隔离运行路径和固定期望来源。
- 输出为可用模型条件、中文查询观察、降级路径及实际限制，模型准备范围单独说明。

- [x] **Step 1，固定问题与来源。** 使用上一轮松果/Pinecone 的当前 50 条、历史 20 条和组织乙同名项目 10 条资料，合成 Wiki 中为甲乙分别提供内容页并链接其原件。增加“离线导入上限多少”与原件“离线每批最多 15 条”这一中文表达对照，先固定各问题必需的原件，再观察实际命中。
- [x] **Step 2，准备已授权模型。** 核对发布版模型说明及本机帮助，在选定状态目录准备实际需要的模型。Qwen3 示例使用 `QMD_EMBED_MODEL=hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf`，通过 `embed -f` 重建向量，后续调用沿用相同配置。扩展和重排继续核对其各自实际模型需求。
- [x] **Step 3，比较混合查询。** 使用 `qmd --index llm-wiki query '问题' -c wiki -n 10 --format json`，回读当前正文，比较必要证据、答案支撑及可观测资源。把模型缺失、下载失败、运行超时与检索未命中分别记录。
- [x] **Step 4，收敛实际方法。** 有证据支持的参数和流程进入 QMD 参考，实际不可用部分注明条件并采用 BM25 或文件检索回退。网络隔离行为只有实际测到时才声明离线。

模型下载、扩展和重排均可能增加资源与派生状态。缺少相关运行条件时交付已验证路径并保留混合查询未验证状态，正文中的能力描述与观察一致。

## Task 5，分发与完整核对

**Files**

- 同步 `.workbuddy/skills/llm-wiki/`、`profiles/backend/.workbuddy/skills/llm-wiki/`。
- 同步根、Backend、Frontend 的 `.template-spec/agents/profile-skills.md` 查询约定摘要。
- 更新 `profiles/backend/skills-lock.json` 的 `skills.shared.llm-wiki.effectiveHash`。
- 将实际结果回填本计划。

**Interfaces**

- 使用任务 1–4 的最终源树、实际命令和观察结果。
- 输出为三处一致的 9 文件技能树、统一约定、正确有效哈希及有边界的交付说明。

- [x] **Step 1，同步副本与地图。** 写前读取目标，只同步本次受影响内容。三份地图都明确知识文件保护和工具工作区写入范围，Frontend 安装关系按当前白名单处理。
- [x] **Step 2，核对树与引用。** 比较主源和两份 WorkBuddy 全树，逐项打开新增和修改链接，核对显式调用元数据。新参考随技能树分发，外部叶子依赖继续依据真实引用维护。
- [x] **Step 3，核对清单与哈希。** 解析相关 JSON，按现有维护算法重算 Backend 已有有效哈希。结合 `git status --short`、未跟踪清单和新增文件格式检查核对本次范围。
- [x] **Step 4，记录实际结果。** 在当前任务或本计划写明工具发布来源、模型配置、资料范围、实际命中、知识字节保护、派生写入、清除结果和未验证项。完成一次整体独立审查并处理有依据的问题。

文件、地图与哈希核对复用 [上一轮计划](2026-11-16-llm-wiki-evolution-plan.md) 中的只读命令，实际有效树包含新增 `references/qmd.md`。

## 计划核对

本设计的使用约定由任务 1 承担，环境、集合与 BM25 由任务 2 承担，当前原文和生命周期由任务 3 承担，中文混合查询由任务 4 承担，分发与结果由任务 5 承担。五项 Review Focus 均有具体输入及预期行为。

本轮已实施技能与分发更新，并完成下列本机运行观察。首次执行完成 18 个步骤，用户要求继续后补齐 Task 4 的模型准备与混合查询，共 20 个步骤完成。


## 本轮实施与运行记录

2026-11-16 在 `codex/llm-wiki-evolution` 工作树执行，沿用上一轮未提交内容。主源增加 `references/qmd.md`，更新操作入口、查询、发现、摄取、新建约定及两份平台副本。为统一巡检的派生状态边界，同步补充 `references/lint.md` 的一条 QMD 约定。

| 项目 | 实际结果 |
| --- | --- |
| 程序与环境 | 在临时目录安装 `@tobilu/qmd@2.8.3`，CLI 输出 `qmd 2.8.3 (facd35e)`，使用 Node v24.14.1、npm 12.1.0 |
| 词法检索 | 英文别名 Pinecone 命中 2 页，中文“松果”命中 4 页，长问句“离线导入上限多少”命中 0 页，短词“离线”命中 1 页 |
| 范围与内容保护 | 集合与命名索引对照哨兵隔离通过，文件和目录符号链接未带入越界内容，中文空格目录可索引，查询前后知识与原件字节相同 |
| 普通文件回退 | 全状态严格只读场景使用 rg 读取原文，知识与 QMD 状态字节均保持一致 |
| 原文与快照 | 原文由 50 改为 75 后 get 仍返回旧快照，回读磁盘得到 75，授权 update 后 get 返回 75 |
| 移动与 hook | 更新前可见旧路径，更新后定位到新路径。search 未执行演练 hook，update 执行了配置中的受控 hook |
| 派生清除 | update 停用文档后 SQL dump 仍含正文。cleanup 后释放读取连接，SQL dump 和数据库旁路文件中均未检出唯一演练标记 |
| 共享正文 | 仍有活跃副本时 cleanup 保留相同正文，清除全部已授权活跃副本后正文移除，指引已明确范围内外的处理 |
| 格式与未知参数 | 搜索 JSON 字段及 URI 的 `?index=` 已核验。单篇 get 加 JSON 参数仍输出文本，传入未知 readonly 参数仍创建 SQLite |
| 实际方法观察 | 独立 Agent 运行 7 条查询命令并回读四份知识与四份原件，按给定 2026-03-01 时点得到 75/10/历史20/离线15，根执行者核对知识字节一致 |

### 整体审查与修复

一次整体独立审查发现 1 项 Important，无 Critical 或 Minor。继承的 `INDEX_PATH` 会覆盖命名索引位置，原调用可修改工作区外的数据库。

根执行者用临时哨兵库复现该行为，随后在所有示例中加入 `env -u INDEX_PATH`，并说明其他宿主使用等效进程环境清除方式。修正命令保留哨兵库原字节且仅创建选定数据库，完整运行探针重跑通过。清除前后行为均有实际断言。

继续处理后的独立复核未发现 Critical 或 Important，发现一处设计总结仍引用首次验证状态，已同步为三模型、混合查询、Codex CLI 与剩余范围的实际结果。主源、副本、地图、哈希及临时运行证据均已复核。

### 首次模型准备与后续恢复

首次 Qwen3 embedding 准备在 240 秒整体期限后超时，另从官方权重地址直接下载约 6.26 MB 后连接重置。未完成下载在本次临时目录内清理，当时未完成 embedding 与混合查询。

2026-11-16 用户要求继续处理后，在同一临时工作区新建 `tools-compatible`、`models-complete`、`hybrid-state` 和合成资料副本。原生依赖安装与模型下载分别在独立目录并行处理，根执行者完成混合查询及真实宿主观察。

| 项目 | 继续执行的实际结果 |
| --- | --- |
| 安装兼容 | 使用现有 pnpm 10.15.0 与 Node v24.14.1，精确安装同一 QMD 发布版。仅在该工具目录配置依赖脚本许可，冻结锁重复安装无引擎或脚本警告，ignored-builds 为 None |
| 原生依赖 | 五个 tree-sitter 原生包与五个 WASM 资源、SQLite 查询、sqlite-vec 加载、node-llama-cpp Metal 初始化及释放通过。实际设备 Apple M3 Max |
| 模型下载 | 官方仓库固定 revision，16 连接严格 Range 下载，核对 Content-Range。三个完整文件共 2,560,742,688 字节，逐个核对官方 LFS SHA-256、长度与 GGUF v3，分块临时文件已清理 |
| 中文向量 | 本地 Qwen3-Embedding-0.6B Q8_0，网络阻断环境中 `embed -f -c wiki` 成功构建 4 文档、4 向量，约 2.35 秒 |
| 完整混合查询 | 使用 QMD 默认 1.7B Q4_K_M 扩展模型与 Qwen3-Reranker-0.6B Q8_0。离线、当前组织甲、组织乙、历史问题的必要来源排名为 1、1、2、1，调用约 3.67–4.52 秒，日志实际包含扩展、查询向量化与重排 |
| 中文长问句对照 | 同一“离线导入上限多少”问题的 BM25 为 0 命中，混合检索首位为离线规则，回源支持每批 15 条 |
| 同名消歧限制 | “组织乙的松果每批上限是多少”的正确页面排第二，添加 intent 后仍排第二。扩展中出现偏题词，已把身份、时间、候选与原件核对写入参考 |
| 实际离线 | macOS sandbox-exec 的 deny network* 阻断网络，受控本地 HTTP 对照在普通进程可达、隔离进程连接失败。清空本次专用 llm_cache 后，新进程完整查询成功，知识与原件字节一致 |
| 模型配置 | 复现索引 models 字段优先于环境变量，故意设置不存在的环境模型后 status 仍指向配置模型，配置字节一致。参考补充三种模型与生效位置核对 |
| 真实宿主 | codex-cli 0.167.2，现有 gpt-6.1-sol，通过 ephemeral 会话与进程级 MCP 配置运行。可见轨迹读取本轮技能、query/qmd 参考，调用 query 和 multi_get，回读四份当前知识及四份原件，回答 75/10/历史20/离线15 并引用原件第 2 行 |
| 内容与配置保护 | 混合查询和宿主观察前后，知识与原件字节一致。用户 config.toml 字节一致，宿主日志与 SQLite 放入本次专用目录 |

模型固定来源如下，完整 URL、官方元信息与文件校验见临时报告 `downloads-verification.json`。

| 模型 | 官方仓库与 revision | SHA-256 |
| --- | --- | --- |
| Embedding | Qwen/Qwen3-Embedding-0.6B-GGUF，370f27d7550e0def9b39c1f16d3fbaa13aa67728 | 06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439 |
| 扩展 | tobil/qmd-query-expansion-1.7B-gguf，7816de0b72572c6c860ca1eddf97ba9e7fb8cc65 | 000dfb1c06efa6a049e9f64ba921c3740e2454f62abab6fa10e77bd30bb2bcc0 |
| 重排 | ggml-org/Qwen3-Reranker-0.6B-Q8_0-GGUF，a02f48bb4f057028298c21fa033da2b30d7742d5 | 22c9979ce4fbcdc5acdc310c6641c32797eff1aa980b8f7a2db8a8ea23429a48 |

### 实际范围与剩余限制

本轮采用兼容 pnpm 完成专用工具安装。系统全局 npm 12.1.0 与 Node v24.14.1 的原版本组合仍会产生支持范围警告。额外 CPU-only 探测缺少预编译二进制，本次验证覆盖 Metal。宿主有无关图标路径和隔离状态库回退警告，实际查询退出 0，完整读取轨迹已核对。

当前样本为合成资料，真实用户语料规模、整体检索收益、其他硬件及平台保留待验证。离线结果覆盖本机 QMD 的模型推理与检索，真实宿主观察覆盖 Codex CLI 与 MCP。桌面宿主发现、Claude/WorkBuddy 实际调用和端到端离线 Agent 行为仍需相应实际观察。改动仍在当前工作树，未提交、推送或全局安装。

主源与两份 WorkBuddy 的完整 9 文件及三份能力地图一致，显式调用政策和 Profile 成员按既有范围核对。Backend 有效树 SHA-256 为 `efd61da7807bf9b019e34496df8a9eebea2cd5de31947524b211d31a57082513`。实际记录保存在 `/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/llm-wiki-qmd-pen9r3ca/reports/`。
