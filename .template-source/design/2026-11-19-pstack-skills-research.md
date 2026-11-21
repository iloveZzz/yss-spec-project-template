# pstack Skills 最新源码调研与宿主验证

**2026 年 11 月 19 日 · cursor/plugins 与 YSS Template**

GitHub `main` 已到 `35a90942`，pstack 仍是 **0.15.43**。这次同时核对了上游 Git 目录树和解包内容。`pstack/`、Claude Code 的派生目录及生成脚本，与 11 月 18 日报告采用的快照相同。新的结论来自本轮分发和宿主实测，以及 YSS 最新源码与 Spec 归属演练。[当前仓库快照][main] · [当前树对象][new-tree] · [上次树对象][old-tree] · [上一份详细设计报告][previous]

**对 YSS 的判断**是先沿用现有入口，借鉴 pstack 的任务交接和取证方式。一次调用要找对入口、让执行者实际读到适用规则、在授权范围内完成动作，并留下可以核对的结果。本轮在 Codex 实测中，仅复制 `architect` 和 `arena` 就能列出两项技能，`arena` 后续需要的主模式及原则文件仍然缺失。YSS 新版的一次联合原型演练也漏了写前通知。把主要精力放在能证明规则被执行的任务上，比增加默认入口更符合目前证据。[arena 的角色和原则依赖][arena] · [YSS 演练结果][yss-rehearsal]

## 1. 版本与比较口径

| 核查项 | 2026-11-19 的结果 | 对报告的影响 |
|---|---|---|
| `cursor/plugins` 的 `main` | 当前 `35a90942a7f02e1ebbc2443643179815f2147954`，上一轮 `93b916d4a1e806507e22f4716b352fa91f2b227e`。`35a90942` 合并的是 Hospitable 插件。[当前提交][main] · [上次提交][old-head] | 仓库主分支更新。 |
| pstack 本体 | 两个快照的 `pstack/` 树对象都是 `71d8e1d1d718e2149dc43b2535618064f29cba6b`，解包逐文件对比无差异。最近一个修改 pstack 的提交为 `2f87c854`，北京时间 11 月 17 日。Cursor 清单和通用清单均写 `0.15.43`。[树对象][new-tree] · [pstack 变更提交][pstack-change] · [Cursor 插件清单][manifest] | 上轮关于 `/architect` 缩减为两种结构草图、复杂方案按需转 `/arena` 的结论继续适用。 |
| 分发 | `harness/` 和 `scripts/` 的树对象在两个快照分别相同。Cursor 市场清单中 pstack 的登记项内容相同，Claude Code 市场清单仍指向派生目录。[两版树对象][new-tree] · [上次树对象][old-tree] · [Cursor 市场清单][cursor-marketplace] · [Claude Code 市场清单][claude-marketplace] | 研究基线是固定源码及仓库内的分发内容。团队机器上的已装版本须从各宿主核实。 |
| YSS 对照 | 本地主仓与远端 `main` 都在 `75d7e543`。采用重新命名后的 `yss-build-spec`、`yss-design-ui`、`yss-help`、`yss-deliver-pr-mr`，以及 Backend 的 `yss-technical-design`。[YSS 当前提交][yss-head] · [技能改名及分工][yss-profiles] | YSS 部分按最新主干职责解释。具体项目能调用的新旧名称还取决于已安装版本和宿主。 |

源码按 `skills/*/SKILL.md` 计 **58 个**，其中 **34 个非原则技能、24 个原则技能**。主模式另有 **22 个 playbook**，插件内另有 **2 个代理定义**。Cursor 的技能文件里有 57 个带 `disable-model-invocation: true`，`setup-pstack` 是唯一未写该字段的入口。22 个 playbook 是主模式读取的方法文件，独立作为插件技能安装的入口仍以 58 个为口径。[技能树][skills-tree] · [Playbook 树][playbook-tree] · [代理定义][agents-tree] · [模型配置入口][setup]

## 2. 调用如何到达执行者

在 Cursor 中，官方用法从聊天的 `/` 菜单选一个已装技能。`disable-model-invocation: true` 让 Cursor 只在显式调用时将该技能纳入上下文。普通调用附到一条消息，设为 Custom Mode 后可跨轮使用。`/poteto-mode` 本身带这个字段，用户选中后由收到消息的会话判断 playbook，再读需要的方法、原则和资源。[Cursor Skills 文档][cursor-skills] · [官方安装与用法][readme-install] · [主模式入口][mode]

```mermaid
flowchart LR
    P["插件或项目技能文件"] --> D["宿主发现入口"]
    D --> C["用户选中技能或宿主按规则加载"]
    C --> R["会话读取对应 playbook 与参考"]
    R --> W["会话或获委派的执行者行动"]
    W --> V["核对真实产物、记录和结果"]
```

pstack 在不同环节提供了不同的东西。两个代理定义是 `poteto-agent` 和只读评论评审者 `comment-sicko`。从 playbook 直接委派时，父会话负责启动并回收结果。它把 `worker.md` 的绝对路径放在委派说明开头，使用 `poteto-agent` 时再传入 `poteto-mode` 的绝对路径。这个设计把应读的规则明确交给新上下文。接收者是否读到文件，可查实际工具轨迹。单用 `/architect`、`/why` 等技能时，按各自入口的规则决定是否需要委派。[主模式触发及委派][mode] · [worker 约定][worker] · [poteto-agent 定义][agent]

| 宿主 | 实际交付形式 | 调用和适配 |
|---|---|---|
| Cursor | 市场清单指向 `pstack/`，原生清单声明 `skills/` 和 `agents/`。 | 作者提供 `/add-plugin pstack`，主入口 `/poteto-mode`。模型与推理预算可由 `/setup-pstack` 写入用户规则，配置缺少角色时沿该角色默认值。[原生清单][manifest] · [安装用法][readme-install] · [setup][setup] |
| Claude Code | 独立派生目录 `harness/pstack/claude-code/`。生成器将通用清单写到两个位置，给识别出的 22 个技能正文加上适配说明，复制所需代理、指南和脚本。 | 用户入口带 `/pstack:` 前缀。适配要求把 Cursor `Task` 映射为 `Agent`，把部分云工作者映射为 worktree，按实际支持的模型参数调度。Gemini 等角色可降为会话模型。上游对无法映射的 Cursor Automations 等动作要求跳过并说明。[市场入口][claude-marketplace] · [生成器][generator-render] · [Claude Code 适配][adapter] |
| 本机 Codex 0.167.2 | 本轮在临时 Git 项目把官方技能文件放入 `.agents/skills/`，用原生 App Server 查询项目级目录。 | 能发现项目技能。`skills/list` 的 `enabled` 表示该条目可用。返回的字段没有显示本次对话会自动选中什么，也未验证 Cursor 的 `Task` 参数、长会话模式和云调度。当前 YSS 给 `to-spec` 提供了独立的 Codex `agents/openai.yaml` 调用配置。[YSS 宿主元数据说明][yss-metadata] · [to-spec 的配置][yss-to-spec-policy] |

两个容易误判的条件值得单独核对。首先，`/deslop`、`control-ui`、`control-cli` 来自 `cursor-team-kit`，所以完整的代码清理和实际界面操作能力还依赖配套工具。其次，仓库的 Benny 自动化包单独放在 `automations/`，README 还要求配置到目标工程。技能目录里的 58 项计数没有把这个自动化算进去。[外部依赖][readme-extras] · [Benny 配置边界][benny]

主会话和候选模型也有明确的分工。0.15.43 的代码、文字与判断默认采用 Opus 5.5 的 xhigh fast 配置。`arena` 默认三席是 Fable 5.2、Opus 5.5 和 Gemini 4 Carbon，三个席位只涉及两家模型供应商。交叉评审按**与主会话供应商不同**选人，且把 Fable 与 Opus 归在同一供应商。实际可用席位小于配置时，流程有降级或披露要求。报告里的默认值是源码定义，席位可用性、速度与调用费用仍要以实际宿主为准。[主模式角色默认值][mode-models] · [arena 配置与交叉评审][arena]

## 3. 三种可复验的实测

### 分发内容的字节检查

在 `35a90942` 的源码快照用 Node `24.14.1` 执行 `node scripts/generate-pstack-harness-trees.mjs --check`，对当前随包派生目录返回 0。源码显示检查比较派生文件集合、内容字节和可执行属性，仓库 CI 声明了同一生成检查，另列脚本测试。[生成检查实现][generator-check] · [CI 定义][ci]

| 在独立临时副本中的输入 | 观察结果 |
|---|---|
| 当前固定源码与随包的 Claude Code 派生目录 | 检查成功，报告派生目录已是最新。 |
| 只给派生的 `skills/architect/SKILL.md` 新增一行 | 退出 1，列出该文件。 |
| 给上游 `architect` 正文添加指向不存在文件的相对链接，再重新生成 | 生成器保留该链接，随后 `--check` 退出 0。检查针对源和投影的一致性。解析函数只返回已经存在的源路径。 |

最后一项是人为加入的对照。另用 Pandoc 按 GFM 检查实际版本的 README、技能入口、playbook 与指南共 92 篇文档。源码树有 **313** 个相对链接或图片路径，派生树有 **331** 个，扫描范围内都能解析到文件或目录。检查只核对本地路径，标题锚点、外部 URL 和正文中用文字点名的依赖需要各自核对。[路径重写与检查实现][generator-links]

### Codex 项目级技能发现

本机 `codex-cli 0.167.2` 使用临时信任配置启动 App Server，依次发送 `initialize`、`initialized` 和带 `forceReload: true` 的 `skills/list`。三组均使用临时 Git 项目，只统计返回路径位于对应项目内的条目。没有发起模型回合。

| 临时项目内的文件布局 | 原生目录返回 | 可据此判断 |
|---|---:|---|
| 官方包完整放在 `vendor/pstack/`，保留原清单 | 0 | 普通 vendor 文件可供读取。这种放置没有进入本次项目技能发现。 |
| 官方原样复制 `architect`、`arena` 到 `.agents/skills/` | 2，`architect.enabled=true` | 入口可列出。`poteto-mode` 和 `arena` 要用的原则文件在这个样本中确实不存在。 |
| 官方 58 个技能目录全放进 `.agents/skills/` | 58，项目来源均为 `repo` | 本版宿主能发现这些目录。独立调用时的工具、模型路由、显式策略和辅助能力需要单独观察。 |

因此，分发验收至少要问清“实际项目能否列出它”“本次情景要读到的参考是否已随该安装形式带齐”“写入前实际读了哪些内容”。用两项入口测试单选安装时，应该使用真实依赖最少的项目视图。用整套环境容易看不见缺失项。当前 YSS 源码也用 Profile 声明和 `skillReferences` 按安装模式投影依赖。两套源目录有一个同名项 `tdd`，需要按目标工程核对调用策略和正文。[arena 的依赖][arena] · [YSS 分发约定][yss-maintenance] · [YSS tdd][yss-tdd]

### 决策记录与证据的含义

在临时目录直接运行官方 `show-me-your-work/scripts/log.sh`。用带换行的决定、带 Tab 的理由和一个不存在的证据路径作为输入，结果仍被写为 `tests green`。输出只有两行，其中一行是表头，每行均有六列，单元格的换行和 Tab 被规范化。脚本负责可靠地追加格式化数据。技能的后半部分还要求用本轮轨迹和真实证据逐行复核，所以看 TSV 时应点开证据并核实结果。[写入辅助脚本][decision-script] · [决策记录复核原文][decision-log]

## 4. 按实际任务选择 pstack 技能

| 用户要解决的事 | 入口 | 应取得的结果和适用条件 |
|---|---|---|
| 选择工具或把提示词写清楚 | `/poteto-help`、`/sharpen`、`/in-your-own-words` | 帮助选入口、补充可核查输入或复述目标。用户只问写法时，交付说明或新提示词即可。`poteto-help` 默认推荐 `poteto-mode`，用户另有明确产物时按对应技能选择。[帮助入口][help] · [Sharpen][sharpen] |
| 查现有代码和历史决策 | `/how`、`/why`、`/teach`，或主模式的 Investigation | `how` 找调用路径和边界。`why` 查引入与后续变更的提交、PR 和讨论。`teach` 整合两类证据。只读调查交付有出处的解释或取舍建议。[how][how] · [why][why] · [Investigation][investigation] |
| 做类型、接口或所有权取舍 | `/architect`，有争议再考虑 `/arena` | 先追踪真实消费者。比较两种结构下各状态归谁、调用方需要掌握多少信息及失败结果。`arena` 给候选同一个题目和事实，协调者按事先定义的标准选基础方案、合并兼容优点，再验证综合结果。仅需看方案时，将形式、写入范围和结束条件写入请求。[architect][architect] · [arena][arena] · [详细设计指南][design-guide] |
| 多个版本、依赖或消费者要分别核查 | `/swarm` | 每位工作者有自己的范围、可写位置、目标 SHA 和核对方法。也支持同题竞速，选择规则在启动前声明。没有回结果的工作切片仍是缺口。源码默认云端执行，涉及本地资源时可选本地。[swarm][swarm] |
| 有改动或可运行原型，要证实争议 | `/interrogate` 或 `/blast-radius` | 前者重新运行候选提出的反例，留下能复现且违反意图的发现。后者跨出 diff 检查真实消费者、序列化口径或兼容依赖，优先验证一两个关键前提。纯文档的未决项适合保留为待验证假设。[interrogate][interrogate] · [blast-radius][blast] |
| 沉淀项目真实验证方法 | `/create-verification-skill`、维护技能、`/statechart` | 从项目真实启动、可操作的入口和可观察结果编写核查材料。形式化版本适合状态、重试和并发不变量。模型范围与工程运行范围要一起说明，维护时再核对已改变的代码和模型。[项目验证技能][verify-skill] · [形式化维护][maintain-formal] · [statechart][statechart] |
| 沿现有任务接续、比较技能或复盘反复错误 | Session pickup、Eval、`/correct`、`/reflect` | 接续先恢复实际分支、产物与未完任务，再核验继承结论。评估使用同一自然任务和匿名评审。回顾反复错误时，可先修正可观察行为与引用路径，只有具体失误支持时再提议结构调整。[Session pickup][pickup] · [Eval][eval] · [Correct][correct] · [Reflect][reflect] |

**不同工作流程会越过不同的写入边界。** Feature 按形状设计、委派实现、核对真实应用、整理提交及创建 PR 接续。Multi-phase plan 的产物是计划并在交付后停止。Investigation 明确只读。`figure-it-out` 会在设计长工作流程后执行。在现有组织使用主模式时，先确定当前请求授权的动作、可用工作区及停止条件，再匹配入口。[Feature][feature] · [Multi-phase plan][plan] · [Figure it out][figure] · [Investigation][investigation]

## 5. 如何判断工程验证够不够

- **应用验证用真实操作和状态。** `create-verification-skill` 先找工程原有启动方式和控制工具，要求仅使用自己能识别和清理的实例。它把能启动、能驱动、可观察结果、实际副作用和证据保留放在一次闭环里。上一轮 TLA+ 示例中的三组对照说明了更细一点的问题。缺陷提交规则在一个参与方时能通过，两个参与方时才出现反例。该实测属于固定模型，选择样本时要让两个候选能产生不同的可观察结果。[项目验证技能][verify-skill] · [上一轮模型实测][previous]
- **PR 结果要绑定当前版本。** `Shipping` 要求独立验证、确认当前 patch、核对实际合并状态，再处理堆叠中的下一项。复核了 `watch-pr` 的 `cli.ts`、`github.ts`、`policy.ts`，与 0.15.42 源码逐字节相同。11 月 16 日的隔离实验曾观察到查询期间 head 或目标分支变化仍返回 `READY`。在现在的版本使用时，仍需按实际 PR 的 head、base、审批和平台最终状态回读。该结论来自之前的受控实验和本轮对实现字节的比对，真实远程发生频率未知。[Shipping][shipping] · [当前 watcher 源码][watcher-tree] · [既有 PR 实验报告][prior-pr]
- **评估要能识别改动的贡献。** `Eval` 让候选独立使用同一自然任务、隐藏评分和候选身份，同时安排不同模型。如果研究的问题是某一条技能规则的效果，模型、推理预算、输入版本、授权和工具需要保持可比。跨供应商交叉评审适合补充视角。若主要比较条件已变，报告该组合的结果。当前 YSS 的技能对照方法已经要求记录工具轨迹、产物与人工介入。[上游 Eval][eval] · [YSS 对照方法][yss-eval]

## 6. 最新 YSS 中的采用边界

关联 Spec 的原型补漏已经能具体说明问题。YSS 当前要求用户在首写前看到采用哪份 Spec 及业务依据。归属仍待决定时，只询问影响范围的一问。Spec 与 UI 串用时，复用本轮已发送的说明。查看了提交 `75d7e543` 对应的两份参考，再与两次演练中的资源摘要逐项核对，确认为同一内容。两次均由 Codex `0.167.2` 中的 `gpt-6.2-sol` 执行。下表列出关键事件，完整执行日志仅在本地留存。[Spec 写入规则][yss-workflow] · [UI 写入规则][yss-design]

| 同一类输入 | 实际轨迹 | 可以用于哪项判断 |
|---|---|---|
| 从规格进入 UI，只给正常的原型补漏请求 | `ui-final/E` 中可见工具读取了两个技能入口。目录搜索列出方法文件，工具轨迹里没有两份方法正文的读取。事件 125 首写原型，之前缺少归属与业务理由。 | 对这个自然请求，找到入口和写出正确页面都不足以满足“首写前告知”的要求。 |
| 同一任务加上明确读取两份方法的要求 | `ui-explicit/E` 可见读取了两份方法。事件 196 发出一次归属及依据，事件 201 首写指定原型。 | 这条明确读取路径在该次演练达到验收。输入增加了读取指示，无法用两次观察推断自动命中的普遍成功率。 |
| 已存在同一 Spec 的隔离工作台登记，仍只委托修原型 | 事件 208 告知归属，223 修改原型。实际隔离数据目录的工作台记录摘要一致。 | 用户限定写入范围时，既有登记能支撑查阅。更新工作台仍按覆盖该动作的有效授权处理。 |

这些现象支持从 pstack 的 `worker.md` 借用一条做法。**在需要这条规则的位置明确给出可达的参考和适用条件，并以用户能看到的消息与写入日志核对执行。** YSS 普通 Spec 改稿可以保持当轮继续。需要 PR/MR 时，由 `yss-deliver-pr-mr` 消费选定文件和真实差异。后台长任务也可以沿已有 workbench 与产物记录接续。任务本身没有涉及时，无需为了采用 pstack 方法再建立通用清单或执行器。[上游 worker 约定][worker] · [YSS 工作入口][yss-rules] · [PR/MR 交付][yss-deliver]

| 考虑采用的能力 | YSS 现有入口 | 研究判断 |
|---|---|---|
| 技能菜单和提示词入口 | `yss-help` | 当前工程的 Profile、版本和显式策略决定推荐项。保留本地名称核对，按需提供 pstack 的上游提示参考。 |
| 技术详细设计候选 | `yss-technical-design`、`codebase-design` | 保留已确认业务规则和实际工程约束。用 `architect` 的所有权和消费者问题补强接口评估，争议足以影响迁移或多个调用方时再用同题候选。只有能区分两种方案的证据才值得做专项试验。 |
| 验证和续办证据 | 项目 README、现有测试工具、原 Spec 与工作台 | 借鉴“动作、结果、受影响状态、实际版本”的证据组织，沿原任务记录。原型和真实系统的差异要可定位。 |
| 直接安装并持有整套主模式 | 适合有真实需求并明确选用的 Cursor 项目 | 当前调研支持原生 Cursor 中按需尝试。YSS 的一个 Profile 若要分发其子集，需核对依赖闭包、同名入口和每个宿主的执行约定。现有证据不足以支持默认整包接入。 |

### 两段可直接使用的请求

在已经安装 pstack 的 Cursor 中，设计接口边界可以直接选 `/architect`。

```text
/architect 请为 <当前目标> 比较两种模块接口。依据 <规格及代码位置>，写清真实调用者、
状态所有者、重复请求与失败后的行为。用一个能区分两种设计的验收例子说明取舍。
本轮产物为设计说明，工程目录只读，交付说明即结束。
```

在 YSS 中，遇到规格与原型同时出现的局部请求，可以直接写明实际资料和写入范围。

```text
按当前工程的 yss-build-spec 和 yss-design-ui 核对 <主规格与验收> 及 <指定原型>。
先读取 spec-workflow.md 的保存位置与命名规则及 spec-design.md 的设计方法。
首次写入前说明用哪份 Spec 和业务依据。归属明确时同一轮继续，只修改指定原型。
```

本轮交付包括最新版本复核、Claude Code 派生目录一致性和两个目录的相对路径检查、本机 Codex 目录发现、决策日志脚本试验，以及已完成的 YSS 演练证据复核。Cursor 与 Claude Code 的原生 UI 安装、实际运行多模型、自动化远端执行、用户返工与成本均未测量。现阶段可以根据实际反复发生的漏读、错误调用或验证缺口决定要不要吸收某项方法。一个有代表性的对照是固定同一需求和源版本，以写前说明、首次产物写入、来源链接和额外副作用为判据，分别观察自然触发与明确读取后的结果。[YSS 使用范围][yss-research] · [YSS 对照设计][yss-eval]

## 附录　当前技能目录

| 技能用途 | 34 个非原则入口 |
|---|---|
| 指导与配置 | `poteto-mode`、`poteto-help`、`setup-pstack`、`in-your-own-words`、`sharpen` |
| 解释与续办上下文 | `how`、`why`、`teach`、`recall`、`ketchup`、`ketchup-video` |
| 设计、调度与模型 | `architect`、`arena`、`swarm`、`figure-it-out`、`statechart` |
| 实现与核对 | `interrogate`、`blast-radius`、`benchmark-checklist`、`tdd`、`no-comments`、`typescript-best-practices` |
| 工程验证能力 | `create-verification-skill`、`maintain-verification-skill`、`create-formal-verification-skill`、`maintain-formal-verification-skill` |
| 表达与记录 | `show-me-your-work`、`technical-writing`、`unslop`、`bro` |
| 工作方式的改进 | `automate-me`、`correct`、`reflect` |
| Bot 操作界面 | `make-bot-ui` |

24 个原则由主模式按问题读对应原文。索引分为核心取舍 10 条、架构 6 条、验证 5 条、委派 2 条、经验沉淀 1 条。它们覆盖最小改动、先建模、状态所有权与幂等、实际行为检查、上下文管理，以及把重复经验落实到工程结构。具体选择可回到固定版本索引核对。[原则索引][principles] · [完整技能目录][skills-tree]

[main]: https://github.com/cursor/plugins/commit/35a90942a7f02e1ebbc2443643179815f2147954
[old-head]: https://github.com/cursor/plugins/commit/93b916d4a1e806507e22f4716b352fa91f2b227e
[new-tree]: https://api.github.com/repos/cursor/plugins/git/trees/35a90942a7f02e1ebbc2443643179815f2147954
[old-tree]: https://api.github.com/repos/cursor/plugins/git/trees/93b916d4a1e806507e22f4716b352fa91f2b227e
[pstack-change]: https://github.com/cursor/plugins/commit/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7
[previous]: 2026-11-18-pstack-detailed-design-research.md
[prior-pr]: 2026-11-16-pstack-pr-spec-conclusion.md
[skills-tree]: https://github.com/cursor/plugins/tree/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills
[playbook-tree]: https://github.com/cursor/plugins/tree/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/playbooks
[agents-tree]: https://github.com/cursor/plugins/tree/35a90942a7f02e1ebbc2443643179815f2147954/pstack/agents
[watcher-tree]: https://github.com/cursor/plugins/tree/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/scripts/watch-pr
[manifest]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/.cursor-plugin/plugin.json
[cursor-marketplace]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/.cursor-plugin/marketplace.json#L76-L80
[claude-marketplace]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/.claude-plugin/marketplace.json#L13-L17
[cursor-skills]: https://cursor.com/docs/skills#disabling-automatic-invocation
[readme-install]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/README.md#L15-L49
[readme-extras]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/README.md#L258-L266
[benny]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/README.md#L282-L286
[adapter]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/docs/harness/claude-code.md#L5-L68
[generator-render]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/scripts/generate-pstack-harness-trees.mjs#L118-L148
[generator-links]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/scripts/generate-pstack-harness-trees.mjs#L106-L165
[generator-check]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/scripts/generate-pstack-harness-trees.mjs#L167-L188
[ci]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/.github/workflows/validate-plugins.yml#L28-L35
[setup]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/setup-pstack/SKILL.md#L6-L26
[mode]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/SKILL.md#L9-L33
[mode-models]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/SKILL.md#L84-L100
[principles]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/SKILL.md#L31-L72
[worker]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/worker.md
[agent]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/agents/poteto-agent.md
[help]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-help/SKILL.md#L62-L101
[sharpen]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/sharpen/SKILL.md
[how]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/how/SKILL.md#L7-L21
[why]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/why/SKILL.md
[architect]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/architect/SKILL.md
[arena]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/arena/SKILL.md#L11-L48
[swarm]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/swarm/SKILL.md#L18-L41
[interrogate]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/interrogate/SKILL.md
[blast]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/blast-radius/SKILL.md#L11-L46
[design-guide]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/docs/guide/04-design.md#L9-L25
[verify-skill]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/create-verification-skill/SKILL.md#L9-L44
[maintain-formal]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/maintain-formal-verification-skill/SKILL.md#L9-L42
[statechart]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/statechart/SKILL.md#L62-L82
[decision-script]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/show-me-your-work/scripts/log.sh#L19-L42
[decision-log]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/show-me-your-work/SKILL.md#L34-L74
[correct]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/correct/SKILL.md#L9-L32
[reflect]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/reflect/SKILL.md
[eval]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/playbooks/eval.md#L5-L23
[pickup]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/playbooks/session-pickup.md
[feature]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/playbooks/feature.md
[plan]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md
[figure]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/figure-it-out/SKILL.md#L15-L38
[investigation]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/playbooks/investigation.md
[shipping]: https://github.com/cursor/plugins/blob/35a90942a7f02e1ebbc2443643179815f2147954/pstack/skills/poteto-mode/playbooks/shipping.md#L3-L10
[yss-head]: https://github.com/iloveZzz/yss-spec-project-template/commit/75d7e543d4c20a2a6be575d97e57a775303b7bd1
[yss-profiles]: ../../.template-spec/agents/profile-skills.md#技能改名
[yss-rules]: ../../AGENTS.md
[yss-research]: ../../.agents/skills/yss-research/SKILL.md
[yss-maintenance]: ../../.template-source/agents/skills-maintenance.md
[yss-metadata]: ../../.agents/skills/writing-for-agents/SKILL-MECHANICS.md
[yss-to-spec-policy]: ../../.agents/skills/to-spec/agents/openai.yaml
[yss-tdd]: ../../.agents/skills/tdd/SKILL.md
[yss-eval]: ../../.agents/skills/yss-write-docs/references/pr-and-retro.md#技能行为改版的对照
[yss-workflow]: ../../.agents/skills/yss-build-spec/references/spec-workflow.md#保存位置与命名
[yss-design]: ../../.agents/skills/yss-design-ui/references/spec-design.md
[yss-deliver]: ../../.agents/skills/yss-deliver-pr-mr/SKILL.md
[yss-rehearsal]: #6-最新-yss-中的采用边界
