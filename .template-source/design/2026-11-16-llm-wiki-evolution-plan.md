# llm-wiki 能力增强实施计划

> 执行版依据用户于 2026-11-16 批准的设计及 review 补充。推荐主执行者使用 executing-plans 顺序维护共享文件，独立 Agent 按需承担临时演练和只读核对。采用 subagent-driven-development 时沿用同一文件责任和任务依赖。勾选记录实际完成情况。

**Goal**

增强本地 Wiki 的跨来源综合、证据维护、来源变化处理、巡检与查询方法，使知识更新和回答范围可追溯。

**Architecture**

以 `.agents/skills/llm-wiki/` 为共享源，沿用现有四份参考和约定模板，新增 `references/lint.md`。先完成知识综合与维护，再完善持续使用，最后同步消费副本、能力地图和既有有效树哈希。

**Tech Stack**

Markdown、现有技能元数据、既有 Profile JSON 与文件工具。方法演练使用临时目录和宿主已有能力。

**Spec**

[llm-wiki 能力增强设计](2026-11-16-llm-wiki-evolution-design.md)，已批准路线 A。本计划对应设计的两个连续增量，工具接入依据设计中的触发条件另行细化。各任务的实施与演练结果记录在实际执行时填写。

## Global Constraints

- 交付范围为技能正文、参考、约定模板、既有副本及相关元信息。
- 本仓不维护或分发脚本与测试套件。
- 提交、推送、部署、发行及向外部发送内容使用对应动作的真实授权。
- `SKILL.md` 使用 `disable-model-invocation: true`，`agents/openai.yaml` 使用 `policy.allow_implicit_invocation: false`。
- 查询保持文章、索引、日志、缓存和反馈文件只读。复合请求使用实际已有的对应保存或修复授权。
- 人工正文、用户修改、已有目录和来源身份按设计及现有保护约定处理。
- 方法来源在技能内记录本地整理与直接链接，原始来源锁字段保留其身份语义。

## Review Focus

1. 同名实体、同源转载、派生内容互链与时间差异容易造成误合并或误判证据，任务 1 演练核对身份、原始证据链和适用时间。
2. 唯一来源撤回、间接依赖、过期旧版与受保护正文需要连续处理，任务 2 演练核对剩余依据、传播范围及后续查询。
3. 查询、检查、保存与修复的复合请求容易混淆授权，任务 2、3、4 演练核对文件行为和显式调用政策。
4. 旧 Wiki 缺索引、路径移动、解析缺失和摄取中断可能影响读取，任务 3 演练核对引用连续性、覆盖范围、续办和人工变更。
5. 副本、哈希、未跟踪文件和 Profile 范围容易遗漏或扩大，任务 5 核对完整技能树、变更清单、现有消费位置与真实观察边界。

### 代表性演练的固定输入与判据

以下材料均为临时演练资料。实施时先按此表固定期望证据、回答状态和文件变化，再观察候选技能的实际表现。各任务复用同一组初始资料，每个场景从初始资料复制到独立临时目录。结果记录在当前任务或已有维护说明。

- 查询时点设为 2026-03-01，历史问题询问 2026-01-15。
- `raw/rules-v1.md` 记载组织甲的项目“松果”在 2026-01-01 至 2026-01-31 每批最多 20 条。
- `raw/rules-v2.md` 记载同一项目自 2026-02-01 每批最多 50 条，并明确替代旧版，原件包含 `## Limit` 标题。
- `raw/other.md` 记载组织乙的同名项目每批最多 10 条，身份独立。
- `wiki/source-note.md` 引用新版原件，`wiki/topic.md` 引用摘要，`wiki/answer.md` 引用主题。重摄取的答案仍是派生内容。移动场景另在主题保留原件链接 `../raw/rules-v2.md#limit`。
- 撤回场景另加入 `raw/withdrawal.md`，记载组织甲于 2026-03-01 确认新版撤回，旧版期满，当前上限另行通知。人工保护场景在主题声明 `human-owned: true`，来源摘要为已授权维护区域。

| 任务与输入 | 期望证据和答案 | 允许的文件行为 |
| --- | --- | --- |
| 任务 1，当前与历史查询及同名对象 | 组织甲当前 50 条、1 月 20 条，组织乙 10 条，分别回到对应原件与有效时间 | 查询保持只读 |
| 任务 1，答案导出后重摄取并互链 | 50 条的独立支撑仍追溯新版原件，派生互链保持其身份 | 授权摄取涉及的页面及必要导航 |
| 任务 2，正式撤回新版且旧版明确已失效 | 摘要、主题、保存答案均重评，组织甲当前上限待核实，1 月历史仍为 20 条 | 授权范围内逐层修订并列明受限依赖 |
| 任务 2，仅新版 URL 暂时不可访问 | 说明核验限制，快照支持的历史或已记录范围可定位 | 纯查询或检查保持只读 |
| 任务 2，主题为人工所有，另有可维护来源页 | 人工正文受保护，来源页保留影响说明，再次独立查询得出当前待核实 | 授权来源说明和生成区域，保留人工正文 |
| 任务 3，只有 README 和文章，缺少索引 | 从现有链接和正文定位已有证据，说明导航范围 | 查询保持只读 |
| 任务 3，新版原件移至 `raw/2026/rules.md`，主题移至 `wiki/topics/topic.md` | 复用同一来源，主题的原件链接解析为 `../../raw/2026/rules.md#limit`，原有锚点和 wikilink 目标可达 | 授权整理范围内的页面、入链、出链和导航 |

独立查询演练只提供当前 Wiki 与来源，依据文件中的状态得出结果。其他输入如同路径内容改版、解析失败和中断恢复继续按所属任务的具体场景补充。

演练时显式指定候选 `.agents/skills/llm-wiki/SKILL.md` 的实际绝对路径及本场景参考。每次只授予该临时目录和对应操作范围。纯查询或检查前后比较全目录相对路径与文件原始字节 SHA-256，结果应完全相同。人工保护场景单独比较受保护正文的字节摘要。

同一组查询可在修改前用旧技能观察，再在修改后用候选技能观察，保留实际结果。基线没有出现失败时如实记录。缺索引场景使用 README 指向实际文章，移动场景显式保留既有入链、相对出链和一个 wikilink 供核对。不可访问、解析失败和截断采用模拟输入时在结果中注明模拟范围。

## 文件结构与实施顺序

路径均相对 `/Users/zhudaoming/Projects/yss-spec-project-template`。执行开始先核对当前分支、工作树和本计划关联差异，保护同时进行的用户工作。确需并行隔离时沿用既有 worktree 方法。共享源的连续任务由一个集成者维护，适用观察可委派只读 Agent。

编制执行版时，模板仓位于 `main@18fd61598ccca45f3bd2d91033c1f5a1e6e47176`，本设计和计划为未跟踪文件。主源及两份 WorkBuddy 当前各 7 文件，根 Claude 链接有效。Node `v24.14.1` 与 Python `3.12.1` 可供一次性核对使用，这些版本记录本次环境。执行时再次核对实际工具与差异，按下表定位责任。

| 路径 | 职责与处理 |
| --- | --- |
| `.agents/skills/llm-wiki/SKILL.md` | 操作入口、描述及按需读取路由 |
| `.agents/skills/llm-wiki/references/writing.md` | 页面粒度、实体、证据、时间、人工内容与方法来源 |
| `.agents/skills/llm-wiki/references/ingest.md` | 综合、来源变化、保存、整理和中断恢复 |
| `.agents/skills/llm-wiki/references/query.md` | 问题类型、检索路径、停止条件与只读行为 |
| `.agents/skills/llm-wiki/references/discover.md` | 来源范围、多格式可读性与工具选择条件 |
| `.agents/skills/llm-wiki/references/lint.md` | 新增有证据的巡检方法 |
| `.agents/skills/llm-wiki/assets/CLAUDE.md.template` | 新建 Wiki 的简短约定，沿用已有目录优先 |
| `.agents/skills/llm-wiki/agents/openai.yaml` | 核对显式调用值，参与完整树比较与哈希 |
| `.workbuddy/skills/llm-wiki/` | 根 WorkBuddy 完整普通文件副本 |
| `profiles/backend/.workbuddy/skills/llm-wiki/` | Backend 现有消费副本，继承共享有效内容 |
| `.claude/skills/llm-wiki` | 根链接，目标为 `../../.agents/skills/llm-wiki` |
| `.template-spec/agents/profile-skills.md` 及 Backend、Frontend 同路径 | 三份共享能力地图，同步职责摘要 |
| `profiles/backend/skills-lock.json` | 仅更新 `skills.shared.llm-wiki.effectiveHash` |

顺序为任务 1 → 任务 2 → 任务 3 → 任务 4 → 任务 5。前两项交付增量一，第三项交付增量二，后两项完成入口与既有分发的集成。

主执行者负责全部共享源、能力地图、两份副本与锁字段。独立 Agent 可在候选文件写稳后领取相应场景，各自只写独立临时目录并回报。任务 2、3 连续修改 `ingest.md`，任务 2、4 连续修改 `SKILL.md`，执行者据此顺序整合。设计和计划若带入其他 worktree，使用本轮实际读取内容并核对文件摘要。

## 操作入口与参考交接

| 操作入口 | 必要参考 | 复用条件 |
| --- | --- | --- |
| 创建、发现来源 | `references/discover.md` | 进入实际写作时继续读取 ingest 与 writing |
| 摄取、刷新、重建、保存、整理、来源变化 | `references/ingest.md` | 写作身份、证据或人工内容涉及修改时读取 writing |
| 查询 | `references/query.md` | 需要保存时按复合请求的实际授权进入 ingest |
| 巡检 | `references/lint.md` | 已授权修复依问题类型进入 ingest 或 writing |
| 新建 Wiki 约定 | `assets/CLAUDE.md.template` | 实际新建需要约定时采用，已有约定优先 |

上表是任务 4 入口集成的固定交接路径，相关相对链接均由技能目录承载。

## Task 1，主题综合、实体与证据

**Files**

- 修改 `.agents/skills/llm-wiki/references/writing.md`。
- 修改 `.agents/skills/llm-wiki/references/ingest.md` 中的摄取方法。

**Interfaces**

- 输入为授权来源、已有索引或等价导航、相关页面及其人工所有约定。
- 输出为后续任务复用的页面粒度、实体归一、主张证据和时间表达方法。来源摘要、实体、概念、主题综合、决定作为可选内容示例。

- [x] **Step 1，补写作判断。** 在 writing 中说明创建页面的独立读取价值，以及同名、别名、缩写的身份核对。沿用已有结构和用户编辑保护。
- [x] **Step 2，补证据与时间。** 写入关键主张到原始证据片段的对应关系，以及记录时间、查证时间、事实有效时间和决定来源。明确派生页、生成答案与导出互链的来源身份，链路中断时保留核验限制。
- [x] **Step 3，补摄取综合。** 在 ingest 中按设计的五步摄取流程表达新增、条件、例外、反例、分歧及重复信息。更新主题整体认识，同源转载追溯共同出处。
- [x] **Step 4，记录方法来源。** 在 writing 末尾用简短正文与直接链接说明本地方法整理，引用设计研究依据中的 Karpathy、llm-wiki-kit 等实际借鉴来源。
- [x] **Step 5，演练综合与归一。** 使用固定输入核对当前、历史与同名对象，追加中英文同一实体、同源转载和反例。保存答案后重新摄取并形成互链，检查原始证据与推断身份。再次摄取相同资料，检查重复页面和实质变化。

完成依据为具体方法能指导上述场景，关键主张可回到来源。核对结果须分别给出组织甲历史 20 条、当前 50 条、组织乙 10 条的证据，派生互链追溯同一原件。重复摄取比较文件与正文的实际变化，演练结果使用实际观察记录。

## Task 2，来源变化与巡检

**Files**

- 修改 `.agents/skills/llm-wiki/references/ingest.md`。
- 新增 `.agents/skills/llm-wiki/references/lint.md`。
- 修改 `.agents/skills/llm-wiki/SKILL.md` 中来源维护和巡检的读取路由。

**Interfaces**

- 使用任务 1 的证据、身份和时间方法。
- 输出为更正、替代、撤回、不可访问、删除的处理规则，以及独立可读取的巡检参考。巡检发现包含位置、证据、影响、确定程度和建议动作。

- [x] **Step 1，补变化处理。** 按设计区分六种来源情况，沿已知派生层传播影响，逐项核对剩余支撑的独立性、版本和有效时间，重评唯一来源主张与共享内容，明确受限依赖。恢复旧版当前效力使用实际有效依据。
- [x] **Step 2，补授权和人工内容分支。** 写清受保护正文、范围外依赖、删除敏感内容及已知派生副本的处理。受保护主张失效时在已有可维护且获授权位置保留定位说明，查询沿链核验。Git 历史、远端与外部索引按实际位置和权限报告结果。
- [x] **Step 3，编写巡检参考。** 覆盖设计中的内容问题与导航问题。矛盾须给双方依据并核对适用范围，孤立页结合导航与用途判断。注明实际读取范围及可信限制。
- [x] **Step 4，接通操作路由。** 在 SKILL 中将来源变化指向 ingest，巡检指向 lint。区分检查请求和已授权修复，复用当前来源安全和人工保护规则。
- [x] **Step 5，演练变化与只读。** 使用固定输入核对来源到摘要、主题、保存答案的连续传播、新版撤回后过期旧版的处理，以及受保护正文失效后的独立查询。追加共享来源之一撤回和用户删除指定敏感内容场景。对纯检查请求比较前后文件清单与内容摘要，确认只读。

完成依据为各来源状态具有对应动作，巡检输出可定位，修复范围符合实际请求。撤回后独立查询应报告组织甲当前待核实并保留 1 月 20 条的历史范围，摘要、主题和保存答案的处理位置可逐项说明。人工保护和只读请求的字节摘要核对结果随场景回报。

## Task 3，查询、多格式输入与连续维护

**Files**

- 修改 `.agents/skills/llm-wiki/references/query.md`。
- 修改 `.agents/skills/llm-wiki/references/discover.md`。
- 修改 `.agents/skills/llm-wiki/references/ingest.md` 中保存、整理与恢复部分。

**Interfaces**

- 使用任务 1、2 的证据、时效、来源变化和授权方法。
- 输出为按问题选择读取路径、说明覆盖范围、按授权保存成果和恢复中断的方法。工具提示按设计中的真实信号触发。

- [x] **Step 1，补查询路径。** 对具体事实、比较、全局主题、当前状态和历史状态说明读取起点。缺少 index 时从现有 README、目录、标题和正文继续只读定位。按证据缺口扩展，核对原始依据及失效说明，答案区分事实、推断与未知，并使用设计中的停止条件与范围表达。
- [x] **Step 2，补多格式发现。** 在 discover 中明确原件位置、抽取方法、缺失内容及表头、单位、顺序、图片的抽查。关键内容缺失时结论依据实际读取范围。工具选择引用设计中的适用条件。
- [x] **Step 3，补保存与整理。** 用户要求保存时优先合入已有主题并附证据。区分来源身份、位置与版本，移动或重命名时核对原、新路径的内容连续性，按页面所在目录维护相对入链、出链、锚点及 wikilink。合并、拆分或归档沿用人工保护。
- [x] **Step 4，补中断恢复。** 重试先复读正文、索引和已有记录，识别已完成修改、遗漏及人工变化后续办。沿用现有变更记录，结果区分完成与剩余事项。
- [x] **Step 5，演练连续使用。** 按固定输入核对缺索引、来源移动、页面跨目录整理及移动后重复摄取。追加同路径实质内容更新、超长索引、截断正文、缺单位的表格抽取和中断后人工修改，检查范围、引用连续性和续办行为。分别发出“只回答”“回答并保存”，核对文件行为与保存位置。

完成依据为查询范围、资料质量和恢复状态在结果中可辨，保存行为与用户请求对应。缺索引查询须定位实际文章，移动后的原件链接为 `../../raw/2026/rules.md#limit`。中断场景先保留已写内容，再加入一处人工修改，恢复后逐项核对已完成、补齐和保护的内容。

## Task 4，入口、约定与能力地图

**Files**

- 修改 `.agents/skills/llm-wiki/SKILL.md`。
- 修改 `.agents/skills/llm-wiki/assets/CLAUDE.md.template`。
- 修改 `.template-spec/agents/profile-skills.md`。
- 同步 `profiles/backend/.template-spec/agents/profile-skills.md`、`profiles/frontend/.template-spec/agents/profile-skills.md`。
- 读取核对 `.agents/skills/llm-wiki/agents/openai.yaml` 与根、Backend registry。

**Interfaces**

- 使用任务 1–3 的操作与参考路径。
- 输出为与实际能力相符的入口、按需参考导航、新建约定和三份共享能力摘要。

- [x] **Step 1，更新 description。** 使用设计固定的 `Maintain a local, source-backed Markdown wiki for explicit creation, ingest, refresh, rebuild, queries, lint, source updates or withdrawal, and saving research synthesis.`。
- [x] **Step 2，整理入口路由。** 覆盖创建、摄取/刷新/重建、来源变化、查询、巡检、保存及整理。细节进入对应参考，已有 Wiki 优先，普通资料查询沿用当前目标。
- [x] **Step 3，更新新建约定。** 将综合、关键证据、来源变化、人工保护和查询只读压缩为模板的必要约定，沿用已有 Wiki 规则。实际原件和页面目录由当前项目决定。
- [x] **Step 4，同步能力地图。** 三份地图使用设计固定的职责文案“仅显式请求时创建、查询、摄取、巡检和维护有来源的知识库，按授权保存研究成果。查询保持只读。”。
- [x] **Step 5，核对调用与引用。** 检查两处显式调用值和 registry 的 `invocation_mode: user`。逐一打开入口的相关引用。以普通文章总结、显式 Wiki 巡检、查询并保存、来源内嵌命令及范围外路径走查操作边界。

完成依据为入口能力、引用和调用政策一致，模板与地图能说明实际行为。逐一按上表打开必需参考，三份地图职责行一致，显式调用元数据与 registry 对应。

## Task 5，副本、有效树与观察结果

**Files**

- 同步 `.workbuddy/skills/llm-wiki/` 与 `profiles/backend/.workbuddy/skills/llm-wiki/` 的受影响文件。
- 核对 `.claude/skills/llm-wiki`。
- 修改 `profiles/backend/skills-lock.json` 的 `skills.shared.llm-wiki.effectiveHash`。
- 读取核对 `.template-source/distribution/bundle-profile.json`、`profiles/backend/.template-source/distribution/bundle-profile.json`、`profiles/frontend/.template-source/distribution/bundle-profile.json`。
- 读取核对根及 Backend 的 `.template-spec/agents/yss-skill-registry.yaml`、根 `yss-public-skills.json`、根及 Frontend 的 `skills-lock.json`。

**Interfaces**

- 使用任务 1–4 的最终共享树、三份地图和 `.template-source/agents/skills-maintenance.md` 的算法。
- 输出为完整一致的现有消费副本、正确的 Backend 有效哈希，以及区分内容核对、方法演练和实际宿主行为的结果说明。

- [x] **Step 1，同步完整内容。** 先读取目标，再同步本技能受影响文件和新 lint 参考。检查完整树，包括原有元数据。Frontend 的安装范围依据当前白名单，三份能力地图与技能安装关系分别核对。
- [x] **Step 2，更新既有有效哈希。** 对共享有效树内相对路径用 Node `localeCompare` 排序，依次输入路径、NUL、内容、NUL。无 NUL 的 UTF-8 文本将 CRLF 归一为 LF，忽略维护约定中的系统文件。只替换 Backend 的该字段，原始来源字段按其语义保留。
- [x] **Step 3，核对投影与引用闭包。** 新 lint 参考随整树进入现有消费位置，`skillReferences.llm-wiki` 继续承载空的外部叶子依赖。核对 Spec 默认、Backend 可选、Frontend 白名单及公开技能成员与实际树一致。
- [x] **Step 4，执行文件检查。** 运行下列命令，结合已跟踪差异与未跟踪清单核对全部变更，包括三份新增 lint 参考。对每个未跟踪新增文件执行 `git diff --no-index --check /dev/null <实际文件路径>` 并查看格式诊断。逐个核对本次内部相对链接，JSON 解析与哈希使用一次性命令核对。

```sh
set -e
git diff --check
git status --short
git ls-files --others --exclude-standard
diff -ru .agents/skills/llm-wiki .workbuddy/skills/llm-wiki
diff -ru .agents/skills/llm-wiki profiles/backend/.workbuddy/skills/llm-wiki
cmp .template-spec/agents/profile-skills.md profiles/backend/.template-spec/agents/profile-skills.md
cmp .template-spec/agents/profile-skills.md profiles/frontend/.template-spec/agents/profile-skills.md
readlink .claude/skills/llm-wiki
git diff --name-only
```

预期 diff 格式检查、两次树比较及两次地图比较无诊断且退出 0，链接输出 `../../.agents/skills/llm-wiki`，状态、未跟踪清单和已跟踪差异共同覆盖实际变更。新增文件的 `--no-index` 检查可能因存在新增内容返回 1，结合格式诊断判定。每项结果记录在当前任务。

有效树使用以下只读命令计算。任务 5 Step 2 依据 `actual` 的实际值更新指定锁字段，再执行一次确认 `matches` 为 `true`。当前基线为 `572632c7c47186fec931ed930a0c9a40f2d125969789e8a14395c25d0e5e5837`，实施后以实际完整树为准。

```sh
node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isUtf8 } = require('node:buffer');
const root = path.resolve('.agents/skills/llm-wiki');
const files = fs.readdirSync(root, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile())
  .map(entry => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
  .filter(file => !file.split('/').some(part => part === '__pycache__' || part === '.DS_Store'))
  .filter(file => !/\.(iml|pyc|pyo)$/.test(file))
  .sort((left, right) => left.localeCompare(right));
const hash = createHash('sha256');
for (const file of files) {
  let content = fs.readFileSync(path.join(root, file));
  if (!content.includes(0) && isUtf8(content)) {
    content = Buffer.from(content.toString('utf8').replace(/\r\n/g, '\n'));
  }
  hash.update(file);
  hash.update('\0');
  hash.update(content);
  hash.update('\0');
}
const actual = hash.digest('hex');
const recorded = JSON.parse(fs.readFileSync('profiles/backend/skills-lock.json', 'utf8'))
  .skills.shared['llm-wiki'].effectiveHash;
console.log(JSON.stringify({ actual, recorded, matches: actual === recorded }, null, 2));
NODE
```

JSON 清单按本节 Files 中的实际路径逐一解析，技能内部链接按所在文件目录核对。巡检参考在主源及两份 WorkBuddy 共三处存在，完整技能树在本计划范围内由 7 文件增加为 8 文件。

- [x] **Step 5，完成场景观察与交付。** 汇总任务 1–4 的实际演练，必要时在临时目录让子 Agent 读取本地候选进行方法演练。保留输入、技能路径、预期、观察和限制。只有取得宿主实际读取轨迹时报告对应调用事实，临时安装或已发布程序结果注明其 Bundle 版本。最终说明实际改动、未覆盖行为及后续工具触发信号。

完成依据为内容与副本一致、有效树字段可复核，演练与宿主事实的报告符合证据范围。

## 后续工具迭代的输入

上述任务完成后的真实使用记录可支持后续选型。反复出现中文召回遗漏时评估 QMD，复杂解析丢失时评估 Docling，稳定关系或历史查询需求出现时再评估 Basic Memory、Graphiti，存在目标消费者时评估 OKF 兼容。每项选型围绕具体语料、工具版本、文件写入、数据流向和观察结果形成独立实施范围。

## 计划核对记录

本次已将设计中的综合与原始证据链分配到任务 1，连续失效传播与巡检分配到任务 2，旧 Wiki 查询、引用迁移、多格式、保存和恢复分配到任务 3，入口及模板分配到任务 4，分发、未跟踪新文件与观察分配到任务 5。Review Focus 五项均有对应场景，固定输入给出期望证据、回答状态和文件行为，现有字段和路径已按源仓核对。

本执行版已补充场景隔离、人工保护与只读字节判据、入口参考交接、具体元信息路径，以及可直接运行的副本、地图与哈希检查。各任务的实现结果以未来实际勾选、文件差异和观察为准。


## 本轮执行记录

2026-11-16 在宿主管理的工作树 `/Users/zhudaoming/.codex/worktrees/llm-wiki-evolution/yss-spec-project-template`、分支 `codex/llm-wiki-evolution` 完成任务 1–5。所用基线为 `18fd61598ccca45f3bd2d91033c1f5a1e6e47176`，变更保留于当前工作树。

| 任务 | 实际结果 |
| --- | --- |
| 1，综合与证据 | 已有主题补入常规 50 条、离线导入 15 条的条件与反例，别名复用同一实体，转载与生成回答保留派生身份，重复刷新字节稳定 |
| 2，变化与巡检 | 撤回沿摘要、主题、保存答案传播，过期旧版保留历史 20 条而当前待核实，独立有效公告支撑当前 50 条，人工正文原字节保留，独立查询核对到失效依据 |
| 3，连续使用 | 缺索引回退、快照限制、缺失单位、来源指令、跨目录引用、中断恢复 75 条、保存 50/10/差值 40 及范围内私密内容清除均完成对应方法观察 |
| 4，入口与地图 | 主入口、约定模板、显式调用元数据和三份能力地图已核对，入口内部引用可达，普通查询和复合请求的边界已走查 |
| 5，副本与核验 | 两份 WorkBuddy 各含完整 8 文件，源与副本字节一致，三份地图一致，JSON、Profile 集合、链接、未跟踪新文件格式及有效树哈希已核对 |

候选方法覆盖 14 个独立合成场景，另有 1 个旧技能基线查询及人工保护后的独立查询。根执行者复核了纯查询场景全目录字节不变、保护正文不变、授权修复仅改指定 README、私密内容清除范围，以及维护场景 96 条普通链接、14 处锚点和 1 个 wikilink 的实际目标。新条件、移动和保存场景的重复刷新在演练中保持稳定。

旧技能本次也在缺索引场景答对甲当前 50 条、乙 10 条及甲历史 20 条，结果只能说明该次材料中的方法观察。原始版本结构核对显示缺少巡检参考、显式派生证据/传播方法及缺索引回退说明，候选已补齐这些指引。

Backend 当前有效树 SHA-256 为 `b55a9ed1ae979dac73ab1e86a061e119f82abcfd808c4f40f80460911d285c6a`。一次整体独立审查覆盖全部差异、新增参考及方法记录，未发现 Critical、Important 或 Minor 缺陷。

### 实施决定与观察边界

- 验证采用批准计划中的临时方法演练与一次性结构检查，进度回填本计划。其证据范围是实际显式读取的候选技能及合成资料。
- 宿主实际发现与跨宿主执行保留待验证，调用政策按现有元数据表达。若宿主忽略这些字段，需要在该宿主另行核对入口行为。
- 外部搜索、解析和记忆工具沿设计中的触发条件作为后续接入。具体版本的质量、写入行为与数据流向需要对应场景验证。
- 相对旧技能的准确率、成本和效率收益保持未知。此次旧版基线也正确，真实使用收益应依靠后续语料和任务观察。

临时演练记录保存在 `/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/llm-wiki-evolution-gbdlwd8z/reports/`。这些记录属于本地方法观察，实际宿主自动调用、跨宿主行为及真实用户语料效果仍待验证。
