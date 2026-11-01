# Spec 图解表达引入实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将 ShowMe 的图解方法融入现有 Spec 文档能力，使详细规格、业务状态流和交互说明具有可核对的表达，覆盖必要规则、权限和变更说明。

**Architecture:** 唯一图解正文位于 `i-have-adhd/references/visual-explanation.md`，业务分析、规格综合与产品设计各自负责内容含义。项目安装复用共享技能，独立公开包只投影必要参考与许可；不新增 ShowMe 入口或渲染引擎。

**Tech Stack:** Markdown、Mermaid、现有 JSON/YAML 元数据和宿主预览能力；HTML 仅作为必要时的自包含说明形式。复用现有 YSS CLI 和主整合计划的 Bundle 构建，不新增依赖、脚本或测试套件。

**Spec:** [已批准设计](2026-11-01-spec-visual-explanation-design.md)，用户于 2026-11-01 批准；与 [Spec 整合实施计划](2026-11-01-spec-skills-integration-plan.md) 协调。

## Global Constraints

- 采用方案 A，不新增独立 `show-me`、别名、全局模式、插件依赖、渲染服务或自动化引擎。
- 保持主整合设计的 16 个目标入口；本次图解增量不扩大默认集合。当前源配置仍为 `project` 7 项、`skills` 10 项，不能直接宣称已达到目标。
- 完整产品 Spec 交付仍包含规格、原型和说明；图表不形成第四类必需交付物，静态说明不替代交互验证。
- 共享方法只负责表达，业务状态、权限、例外与未决项由原内容负责人持有；不补造规则，不引入第二份规则模型。
- `i-have-adhd` 保留当前文档范围和 `allow_implicit_invocation: true`；`to-spec` 等显式入口政策不因图解改变。
- 不要求每份文档生成六类图表；纯文字要求、单条规则、局部改字不产生无必要文件、HTML 或原型。
- HumanLayer 固定提交为 `69d5fc61d6ca6f7056d283a2ee2a045be741a1d6`；保留完整 MIT 声明及原 `ayghri/i-have-adhd` 主来源，不伪造上游升级。
- `.agents/skills` 是共享内容源，Backend 保留专有覆盖和默认集合；分发副本不成为第二份编辑源。
- 不新增持久维护脚本、测试套件、门禁或批准包；使用现有工具、临时样例和一次性断言，不照搬通用计划中的强制 TDD、逐任务提交或评审门禁。
- 不改动其他未跟踪设计/计划，不操作用户业务实例；提交、推送、公开发布、发行和替换工具遵循对应真实授权。

## Review Focus

| 容易遗漏的输入或条件 | 预期结果 | 所属任务 |
|---|---|---|
| 业务处于审批中，但页面加载失败 | 业务状态不因显示失败被改写；交互说明保留重试和未决信息 | 任务 1、4 |
| 撤回权限或目标状态尚未决定 | 不补造允许/拒绝及默认状态，保留具体缺口 | 任务 1、2、4 |
| 修改规则后图示仍为旧行为，且没有可访问旧版本 | 指出当前不一致；同步授权范围，不能虚构 Before | 任务 2、4 |
| 单独安装公开消费者，未安装 i-have-adhd | 必要方法、来源与许可在包内可达，不要求读者补装依赖 | 任务 3 |
| 纯文字要求、目标不支持 Mermaid、预览不可用 | 使用可读文字/表格，准确声明未预览，不自动装工具或上传资料 | 任务 1、4 |

---

## 执行范围与衔接

`TPL/` 指当前模板仓根目录；以下路径均相对该根目录。使用独立工作树时以其真实路径为准，已有未跟踪设计文件不能通过切换工作树丢失或被覆盖。实施开始先记录 `git status --short` 和 `git rev-parse HEAD`，确认当前源内容，不更新 CodeGraph 或 Graphify 索引。

本计划是图解增量，不重新编写主整合计划中的研究归并、资产移动、默认集合调整或通用安装验证。主整合尚未落地时，将任务 1、2 插入其任务 5 完成前；任务 3 并入其任务 6；任务 4 复用其任务 7、8 的同一开发构建和临时项目。主整合已完成时按本计划顺序执行。

如主整合未获执行授权或未完成，可完成独立的图解源内容和可用范围核对，但整体安装交付仍列为未完成，不擅自执行无关整合或报告 16 项安装成功。CLI 仓库操作只在对应授权范围内进行。

| 任务 | 文件责任 | 后续消费 |
|---|---|---|
| 1 | 共享方法、入口元数据、来源和许可 | 可独立阅读的图解方法及明确触发范围 |
| 2 | Spec、业务分析、产品设计与评审的引用和模板 | 内容所有者直接消费共享方法 |
| 3 | 注册、依赖、锁、副本和独立包导出说明 | 可分发且资源可达的候选内容 |
| 4 | 复用开发构建和仓外样例；只回修发现的问题 | 实际安装、行为、呈现与未验证范围 |

任务 1 → 2 → 3 → 4 顺序执行。建议同一执行者维护共享文档、注册表和分发配置，避免并发覆盖同一文件；若选择子代理，逐任务划定写入责任，并明确不得回退他人改动。

## Task 1：提供共享图解方法和来源信息

**Files:** 新增 `.agents/skills/i-have-adhd/references/visual-explanation.md`、`references/show-me-LICENSE.txt`；修改该技能的 `SKILL.md`、`references/document-writing.md`、`references/yss-adaptation.md`、`agents/openai.yaml`。保留原 `LICENSE`。

**Interfaces:** 消费已批准设计第 2、3、5 节和固定上游正文；产出唯一方法路径 `.agents/skills/i-have-adhd/references/visual-explanation.md`。后续任务只引用此正文，不复制成另一套方法。

- [x] 读取上述当前源文件、适用 `AGENTS.md` 和固定上游正文/许可证。确认本轮文件状态与主整合、Matt 收敛工作重叠处；已有有效改动作为基线，不用历史稿覆盖。
- [x] 编写图解参考，包含表达选择、六类适用内容、状态/界面区别、图文对应与变更、呈现方式和真实检查边界。表格或文字足够时不画图；沿用已有图稿格式，不强制迁移。
- [x] 在同一参考内添加少量明确标为教学的例子：状态与转换条件、交互失败保留输入、规则变化影响；加入“撤回规则未定，不能补造目标状态”的反例。示例规则只对该教学输入成立，不进入真实产品 Context 或 Spec。
- [x] 在 `SKILL.md` 和共用写作规范中增加条件指针：用户要求图解，或跨角色、状态、条件、交互和变更关系需要关联阅读时加载；主题命中不等于强制产图。普通改字、纯文字和临时解释保持原作用域。
- [x] 更新 OpenAI 界面描述，使其包含按需图解；保留技能名称、`policy.allow_implicit_invocation: true`、原有规则和证据完整性要求，不加入上游的禁止隐式调用字段。
- [x] 在适配说明追加 HumanLayer 固定提交、文件 URL、2026-11-01 调研日期和本地适配差异；将该提交的完整 MIT 正文保存到 `show-me-LICENSE.txt`。保留 `ayghri/i-have-adhd` 原主来源与许可证，不写成本次升级了其上游。
- [x] 针对 Review Focus 的状态混淆、未决撤回和纯文字三类输入走读方法：预期分别保持业务状态、保留未知、无额外图稿。核对所有示例标签与输入一致，不按行数或图数评分。

**完成依据：** 方法、触发、限制和许可已在同一技能包内可读；查看 `git diff -- .agents/skills/i-have-adhd`，仅含本次方法增量，现有保护规则和来源仍在。此步为内容核对，不宣称真实宿主已采用新方法。

## Task 2：接入内容所有者和 Spec 模板

**Files:** 修改 `.agents/skills/yss-product-lifecycle/references/spec-workflow.md`、`.agents/skills/yss-stage-decision/SKILL.md`、`.agents/skills/yss-design-system/references/spec-design.md`、`.agents/skills/prototype-review/SKILL.md`、`.template-spec/templates/spec-template.md`、`.template-spec/process/document-writing.md`。主整合已新增的 `yss-stage-decision/references/business-analysis.md` 或 `yss-design-system/references/product-prototype.md` 若承担同一职责，则把相关指针放入对应位置，避免两处重复。

**Interfaces:** 消费任务 1 的唯一参考；状态和权限由业务分析负责，页面及操作由产品设计负责，规格综合保持既有输入与调用政策。图表引用已有章节、编号或锚点，不定义新 ID 协议。

- [x] 在共享规格方法的规则、状态、交互说明位置接入图解参考；保留详细规格、原型、说明的三类交付要求，以及普通查询和局部修改的范围例外。
- [x] 在业务分析入口/现有参考说明转换角色、触发、条件、目标状态与拒绝结果的内容责任；在产品设计参考说明入口、动作、反馈、权限和恢复的内容责任。只引用表达方法，不复制制作流程，不提前选择技术架构。
- [x] 在评审入口的原检查范围内补充图文一致性和业务/界面状态区别；图稿与静态原型只证明实际观察范围，不新增独立评审或必需图表。
- [x] 在 Spec 模板现有规则、状态与产品设计章节加入适用表达提示；长规则引用一个权威位置，简单转换表可直接承载规则。不要新增固定“六类图表”章节或第二份图解版规格。
- [x] 在通用文档说明中链接唯一参考；检查 `to-spec` 经共享规格方法可达，`yss-research` 经文档配套可达。已可达的入口不为本任务新增重复正文。
- [x] 用一份临时输入检查“文字允许撤回，但图中标为禁止；规则来源未注明新旧”的处理：应指出冲突和需澄清的决定，不随意选边。再提供明确已确认的新规则，要求只同步授权范围内的受影响说明与验收。
- [x] 对无可读旧版本的变更说明核对：只陈述当前方案与历史限制，不编造 Before；未决权限仍保留。确认 `to-spec` 等入口的显式调用政策未变。

**完成依据：** 从消费者正文能定位任务 1 的参考，术语与业务条件完整，职责没有被表达技能接管；现役说明未重新引入旧阶段门禁。主整合负责的旧入口删除不在本任务重复执行。

## Task 3：同步分发、宿主副本和独立包资源

**Files:** 按实际依赖修改 `.template-spec/agents/yss-skill-registry.yaml`、`.template-source/distribution/bundle-profile.json`、`skills-lock.json`，以及 `.agents/skills/publish-skills-sh/references/yss-export.md`。同步根 `.workbuddy/skills/`、核对 `.claude/skills/` 链接；按实际影响更新 `profiles/backend/.workbuddy/skills/`、`profiles/backend/.template-spec/agents/yss-skill-registry.yaml`、`profiles/backend/skills-lock.json` 和其现有分发配置。独立包样例仅保存于仓外任务临时目录。

**Interfaces:** 消费任务 1、2 的真实引用和主整合任务 6 的配置；项目共享方法保持原路径。独立包产出 `skills/<consumer>/references/shared/visual-explanation.md`、`show-me-LICENSE.txt`、`show-me-source.md`，其中最后一项仅记录来源和投影关系，不重复方法。

- [x] 从实际引用核对注册表：已有 `yss-stage-decision`、`yss-product-lifecycle`、`prototype-review` 的 `i-have-adhd` 文档条件依赖继续复用；为实际新增消费者补齐相同 `lifecycle-document-output` 条件，不新增技能 ID 或运行时条件。
- [x] 核对两种安装范围的 `skillReferences` 和规范技能路径能收集新参考与许可；没有收集能力的自然语言提及不能充当分发依赖。默认数组由主整合统一到 16 项，本任务不自行添加第 17 项。
- [x] 同步共享源对应的根 WorkBuddy 文件并核对 Claude 链接。Backend 根据共享源加专有覆盖组合，只更新实际受影响内容；其 `yss-stage-decision` 专有入口不被根版本覆盖，不连带引入 Spec UI 技能。
- [x] 原 `i-have-adhd` 锁条目的 `source`、`sourceRevision`、`upstreamHash` 保持；HumanLayer 补充来源在适配说明内。根锁不新增 `effectiveHash`。Backend 已有有效哈希的变更条目按主整合任务 6 规定的现行树哈希口径重算，不恢复历史维护脚本或更改锁 Schema。
- [x] 更新现有导出说明，列出唯一来源到三个独立包文件的对应；仅独立包缺少共享技能时投影必要参考与许可，改为包内引用，不复制业务文件、私有绝对路径或整个无关技能库。不增加公开 `show-me` 或强制公开 `i-have-adhd`。
- [x] 用 `mktemp -d /private/tmp/yss-spec-visual.XXXXXX` 创建本任务拥有的临时目录；同批整合已有目录时复用。分别暂存 `yss-product-lifecycle`、`yss-design-system` 独立包，处理本次图解链接，并按原导出约定保留其其他必要资源；不推送公开仓库。
- [x] 对实际受影响 Markdown 引用运行一次性路径检查，解析 JSON 配置并断言默认集合没有新增 ShowMe；主整合完成时两种集合应同为 16 项。逐文件比较 WorkBuddy 与有效源，独立包方法和许可与唯一源字节一致、所有必需方法链接均在包内可达。此检查不验证 Agent 行为。

**完成依据：** `git diff --check` 无新增空白问题；源、副本与实际资源一致；独立消费者即使没有安装 `i-have-adhd`，也能读取图解参考及来源许可。已有跨包问题若不属于本增量，单独报告，不以图解投影完成宣称整个旧包完全可用。

## Task 4：复用开发安装并观察代表性行为

**Files:** 不新增永久测试文件。复用主整合任务 7 的 `CLI/internal/bundle/assets/bundles.json.gz`、仓外 `new-yss` 和临时项目；样例与观察输出置于任务临时目录。发现问题只修正本次负责的源及相关投影。

**Interfaces:** 消费任务 3 的候选内容和主整合任务 7、8 的开发构建、安装及 Agent 上下文。输出区分内容核对、实际安装、实际调用、呈现/交互观察和未验证项。

- [x] 在有对应 CLI 仓库授权时，按主整合任务 7 的现行命令将当前模板工作树打包为开发程序；主计划已完成同一候选构建时直接复用，不重复构建。核对开发程序 `version`、`help`，不使用旧安装的 `yss 3.0.3` 证明新 Bundle 已生效。
- [x] 复用主整合的新安装；若没有，执行下列命令验证两个全新目标。`TASK_TMP`、`YSS_CANDIDATE` 均指本任务已确认的真实临时路径，不覆盖系统变量或用户安装。

```sh
"$YSS_CANDIDATE" init --root "$TASK_TMP/spec-project" --profile spec --installation project --json
"$YSS_CANDIDATE" init --root "$TASK_TMP/spec-skills" --profile spec --installation skills --json
"$YSS_CANDIDATE" skills list --root "$TASK_TMP/spec-project" --json
"$YSS_CANDIDATE" skills list --root "$TASK_TMP/spec-skills" --json
```

预期命令成功；两种安装在主整合完成时均为 16 个入口。实际读取新参考、许可、调用方和元数据，确认没有依赖 `.template-source`；存在的旧临时目标不能靠清空重用。

- [x] 复用 Backend 临时安装和有效 Bundle，检查其默认仍为 `setup-yss-harness`、`implement`、`code-review`、`handoff`，专有业务分析入口未改变。本次仅共享说明增强，不能声称 Backend 全部行为已回归。
- [x] 在实际可用的独立 Agent 上下文加载候选安装，按下表观察行为；可合并同源输入为一次任务，不要求机械启动六个会话。所有教学业务输入标为样例，不回写真实产品资料。

| 输入 | 必须观察到的行为 |
|---|---|
| 明确给定角色、状态、操作和例外，要求整理详细 Spec 及状态/交互说明 | 关系复杂处有适当表达，详细条件与验收保留；没有要求本次制作原型时不冒称交付完整产品 |
| 对象审批中，页面请求失败；失败提示和重试行为已给定 | 业务状态保持审批中，加载失败属于界面显示；没有凭空增加业务失败状态 |
| 撤回角色和目标状态未决定 | 明确缺口和影响，不画成已经确定的转换 |
| 提供已确认的新权限规则，但保留一张旧图；另一个样例没有旧版本 | 前者定位并修正授权范围内的冲突，后者不虚构 Before |
| 要求一句纯文字解释，随后只改一个字段名 | 不生成图、HTML、原型或额外文件，不扩大修改范围 |
| 明确目标不支持 Mermaid且预览不可用，仍要求解释复杂状态 | 交付可读表格/文字及限制，不自动安装工具、上传资料或声称已预览 |

- [ ] 若确有 HTML 输出且预览工具可用，实际打开所生成文件，检查代表性窄屏、标签和适用键盘访问；检查自包含资源无未经授权的外链。没有发生 HTML 输出或工具不可用时如实说明，不为了覆盖分支另建网站。本次无 HTML 输出，此项未执行。
- [x] 记录实际宿主的隐式文档配套使用及显式入口政策；当前会话没有重载技能或只有静态 YAML 时，标为未验证。不得把作者按新方法生成的例子当作独立 Agent 已自动选用技能的证据。
- [x] 回修实际发现的本次问题，同步其副本并只重跑受影响检查；最终 diff 确认无脚本/测试套件、用户实例改动、来源漂移或未经授权外部动作。

**完成依据：** 各项结果有实际范围；未执行的构建、安装、宿主发现、HTML 预览和行为观察明确列出。未获 CLI 范围授权或主整合尚未完成时，继续交付已完成的独立内容，并将整体安装列为未完成，不能以文件存在代替运行结果。

## 计划自检与交付

设计第 2、3、5 节由任务 1、2 实现，第 6 节由任务 3 及主整合衔接实现，第 7、8 节的行为与限制由任务 4 观察。五类 Review Focus 均有对应输入；引用、许可、Backend 专有覆盖和独立分发分别检查，没有将结构检查当作业务理解效果。

2026-11-01 编写计划时实际读取了本机 `yss version`、`init --help`、`skills --help`、`skills list --help`、`skills ensure --help`。观察版本为 `3.0.3`；上述 init/list 参数存在。这仅核验命令形状，不证明旧二进制包含本设计，也不代替执行时核对候选帮助。

交付说明列出真实源修改、实际安装/行为结果、未覆盖项和公开分发状态。没有真实读者反馈时不声称提升理解速度或降低返工率。保留复核所需临时材料，不自动清理失败现场或用户文件。

用户已于 2026-11-01 批准本计划并选择 Native，四项图解增量已在独立工作区执行。下列结果区分已实施内容、实际观察和仍未验证的范围；未提交、合并或发布。

## 本次执行结果

| 范围 | 实际结果 |
|---|---|
| 共享方法和调用方 | 新增图解参考及完整 HumanLayer MIT 声明，接入规格、业务分析、设计与复核；同步中文规范、模板和元数据 |
| 分发与副本 | 根 WorkBuddy、适用 Backend 共享副本与源一致，Claude 链接有效；两个 Backend 有效树哈希按既有口径更新，原主来源保留 |
| 分发配置取舍 | 现行两种 Spec 默认已包含 i-have-adhd，实测新参考随完整技能包安装；无需新增重复 skillReferences，原 7/10 默认集合未改 |
| 开发构建 | 从 CLI 受跟踪工作文件的临时副本生成 Bundle 并构建成功，原 CLI 仓库与其用户 docs/plans 未改；Bundle 记录模板提交 6d3d6608a1d0937f4f7f52b7ab5c7c9dddc4ad61 和 working-tree |
| 真实安装 | Spec project 为 7 项、skills 为 10 项，Backend skills 为 4 项；新参考、许可和元数据与源匹配；两次 dry-run 没有创建目标目录 |
| 可选技能消费 | Spec 补装设计、业务分析和复核成功；Backend 补装文档配套与专有业务分析成功，专有正文保持，未引入产品 UI 技能 |
| 独立公开包 | 两个临时消费者的图解参考、许可、来源说明及新增链接在包内可达，方法和许可字节与源一致；未公开发布，未全面迁移旧跨包引用 |
| 行为观察 | 独立上下文显式加载候选安装，完成六个请求及一次目标状态澄清：状态/界面分离、保留未知、规则变更、纯文字和不支持 Mermaid 的表达均符合输入；目标状态明确后生成对应状态图和条件表 |
| 独立审阅 | 最终只读审阅未发现 Critical、Important 或有用户影响的 Minor 问题；内容引用、JSON/YAML、空白、来源及副本检查通过 |

本次裁决：使用受管独立工作区保护原工作区；只做图解增量，不执行主整合的研究归并和旧入口删除；为避免规格模板与入口冲突，同步 `yss-product-lifecycle/SKILL.md` 的完整产品交付说明。Backend 专有正文保持原样，公开样例只证明新增图解资源闭包。未创建维护脚本、测试套件、检查包或提交。

临时开发产物和观察记录保留在 `/private/tmp/yss-spec-visual.kb0dspxo/`，包括 `new-yss`、构建日志、安装结果、`bundle-provenance.json`、`public/` 和 `behavior-samples.md`。CLI 源提交为 `8c5e1a90ff83ac83a0640a64b8c8109c3fc5a5e6`；临时构建沿用默认版本字串 `3.0.2`，CLI 自身报告来源 unknown，不能当作正式新发行或替换已安装工具。

仍未完成或验证：主整合的 16 项全新安装目标；宿主自动发现及隐式选择本方法；Mermaid 实际渲染与 HTML/原型操作（本次未产生 HTML）；真实读者理解效果。行为样例是显式加载后的输出观察，不证明自动选技，也不替代用户研究。保留工作区和未提交差异供后续处理。

## 后续审查修复

2026-11-01，按用户要求修复后续审查发现的两处问题：`yss-prototype-stage` 与 `yss-design-system` 明确完整产品 Spec 的原型和交互要求，将按需省略限制在普通查询、局部修订和独立设计范围；图解教学输入的 R2 明确“通过成功后进入已通过”，使图表目标状态有直接依据。

同步三个根 WorkBuddy 文件、Backend 图解参考及其有效哈希，以及两个临时独立包中受影响的参考。内容走读覆盖完整交付、纯展示、无 UI 和局部设计的选择边界；本地引用、副本字节、独立包图解资源、锁元数据与 `git diff --check` 核对通过，默认集合未变。

上表开发构建、安装和独立行为观察是此次修复前版本的证据；本次未重新构建 CLI、安装候选或运行独立 Agent，也未验证图形渲染。临时旧二进制和安装目录仍对应修复前内容，不用于证明此次修复已安装。未提交、合并或发布。

## GitHub 发行整合说明

2026-11-01：发布准备基于 GitHub 主线 `95c9d83c8851e5241aecd0c1df599ea37af48f86`，该主线已完成 Spec 16 项和 Backend 41 项默认技能整合。前文 7/10/4 项及主整合未执行的说明是先前工作区的历史状态。图解引用接入现行 `business-analysis.md`、`review-method.md` 和产品设计方法；保留已归并的职责与完整交付规则，不恢复已删除的 `yss-prototype-stage`。候选发行版本为 Template 5.0.5 / CLI 3.0.5，发布结果以实际 GitHub Release 为准。
