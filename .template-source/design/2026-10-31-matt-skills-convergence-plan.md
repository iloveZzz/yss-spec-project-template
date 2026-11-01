# Matt 技能适配完整收敛实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 按用户选定的执行方式使用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development`，逐任务执行；步骤用复选框跟踪。根 AGENTS.md 和已批准设计优先，不从通用技能推导强制 TDD、逐任务审查、自动提交或发布。

**Goal:** 修复已知工具和来源问题，使 21 个相关技能的入口、参考、Backend 覆盖层及分发内容一致，并完成设计指定的方法补强。

**Architecture:** 修改现有共享内容源和必要覆盖层，每项任务同时收拢其引用、元数据和副本。复用现有锁与 `skillReferences`，不引入生成器、动态依赖系统或新的技能入口。

**Tech Stack:** Markdown、JSON、YAML、Git、现有连接器及 `gh`/`glab`；临时核对可用已安装的 Python/Node 标准库，不新增依赖。

**Spec:** [已批准设计](2026-10-31-matt-skills-convergence-design.md)。执行者须同时读取设计与本计划。

**Status:** 用户已批准并选择 executing-plans；11 项任务已执行，独立只读审查无 Critical/Important，1 项 P3 留待后续。未提交或发布。

## 全局约束

- 工作仓库为 `/Users/zhudaoming/Projects/yss-spec-project-template`；模板基线为 `e8e4fdb5e59bccae0935e390e44077b7d6e888d8`。开始执行时核对当前差异，保留本设计、计划和用户其他修改。
- 上游比较基线为 `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`，原始来源为 `0ab1b63a410a03d3627979a109c8695de27af954`；不把比较版本写成原始引入版本。
- 主要核对设计中的 21 个技能，不要求每个文件改写；共享技能入口集合保持 62 个，默认安装集合、公开技能名单和现有显式调用政策不扩大。
- 保留根 `CONTEXT.md`、稳定业务身份、业务票与实现 Slice 的区分、handoff 的 PR/MR 文件交付、逻辑原型与产品设计分工以及 Git 用户文件保护。
- 不恢复阶段门禁、批准包、常驻采集、脚本、测试套件或 CI；本计划的场景与核对仅用于本次适配。
- 不修改 `yss-cli` 源码、用户已安装项目和全局插件，不自动提交、推送、发布、发消息、关闭条目或修改远程标签。
- 本机已读到 `yss 3.0.2`、`gh 2.102.0`、`glab 1.126.0`。执行时复核实际帮助，不虚构模板源重建命令，不用 `yss sync` 改写本模板仓。
- 每项任务完成时只报告实际结果。文件存在、命令可解析、远程调用成功和 Agent 行为符合预期是不同结论。

## 核对重点

| 易遗漏的输入或条件 | 应有行为 | 所属任务 |
|---|---|---|
| fork、多 remote、自托管 GitLab，或请求仅授权读取 | 使用明确目标和实例；不隐式写入或改投平台 | 任务 2、7 |
| 无运行环境、无独立 Spec，且工作树含未跟踪文件 | 能基于现有依据继续分析，说明限制；不漏范围或制造前置门槛 | 任务 3、4 |
| Backend 具有专有覆盖，但共享来源或哈希字段不同 | 保留有效覆盖，按实际继承记录来源，不能把根目录整树照搬 | 任务 1、11 |
| 子代理不能访问指针，或宿主没有独立上下文机制 | 补足最小必要信息或顺序执行，不用无上下文结果宣称完成 | 任务 8 |
| 人工 wiki、未提交代码、创建结果未知或并发更新 | 保留人工正文与真实时点，先核实结果，不盲目重试或覆盖 | 任务 2、10 |

这些场景在所属任务中直接核对，不另建测试文件。最终真实 Agent 观察与文本检查分别记录。

## 文件职责与共同同步规则

下文文件路径相对仓库根；`S/<id>` 表示 `.agents/skills/<id>`，`B/<id>` 表示 `profiles/backend/.agents/skills/<id>`。这是路径缩写，不是新目录。

| 路径 | 本次职责 |
|---|---|
| `S/<id>/SKILL.md`、包内参考 | 入口和方法的共享内容源 |
| `B/prototype`、`B/to-spec`、`B/triage` | 已有 Backend 专有内容；其他覆盖仅在直接消费者确实受影响时修改 |
| `.template-spec/agents/matt-skills-adaptation.md` | 新建共同来源说明；Backend 同路径保存副本 |
| `S/i-have-adhd/references/pr-and-retro.md` | 新建 PR/复盘方法；旧文档位置保留导航 |
| 根及 Backend `skills-lock.json` | 来源、适配引用和已有内容哈希 |
| 根及 Backend `.template-source/distribution/bundle-profile.json` | 两种安装模式的 `skillReferences` |
| 根及 Backend `.template-spec/agents/yss-skill-registry.yaml` | 仅修受影响依赖和描述，不改默认安装及调用模式 |
| `.template-source/agents/skills-maintenance.md` | 维护来源记录、当前副本和哈希的方法说明 |

每项任务的“完成共同同步”指下面四步，不另开一批等待最终补齐：

1. 修改共享源及必要覆盖；同步本任务的 `.workbuddy/skills/<id>/` 普通文件，检查 `.claude/skills/<id>` 仍指向共享源。只处理受管文件，不复制 `.DS_Store`、缓存或用户内容。
2. Backend 仅处理其当前名单中的技能，根据专有覆盖和实际引用更新 `profiles/backend/.workbuddy/skills/<id>/`。保留现有平台元数据，不自动补入未使用的根参考，例如 Backend prototype 不因根存在 `LOGIC.md` 就必须安装该文件。
3. 同步变化的元数据和必要外部资源。`agents/openai.yaml` 只在显示说明实际变化时调整；显式调用标记不变。新增或移除引用时同时处理对应清单及当前消费者。
4. 对已有 `effectiveHash` 的受影响 Backend 条目按最终有效技能树重算；根锁没有该字段，不添加。来源 `upstreamHash` 不拿本地哈希替换。只修改本任务相关条目和清单项，保留顺序及其他字段。

已有 `effectiveHash` 的算法依据为 Git 历史 `1141a7ed86b629a3c1292436527ff75c1f3f7d5b:scripts/lib/skill-supply-chain.mjs` 的 `treeFiles`/`treeHash`，只读取定义，不恢复或执行整个旧生成器：忽略 `.DS_Store`、`__pycache__` 和 `.iml/.pyc/.pyo`；相对路径使用 `/`，用 Node 的 `localeCompare` 排序；每项输入为路径、NUL、内容、NUL；无 NUL 的内容按 UTF-8 读取并将 CRLF 归一为 LF，最终取 SHA-256 十六进制。可以用临时标准库命令复算；原文件字节与权限仍单独比较，不能用归一化哈希代替。遇到越出受管树的符号链接先核对目标和读取范围。

## 批次与依赖

| 批次 | 任务 | 前置 |
|---|---|---|
| 第一批：命令与来源 | 1、2 | 已批准设计；彼此内容可独立准备，共用清单由主执行者整合 |
| 第二批：执行路径 | 3、4、5、6、7 | 任务 1 的来源说明可用于记录状态；任务 6 消费 5，任务 7 消费 2、5、6 |
| 第三批：方法补强 | 8、9、10 | 任务 8 消费 4 的审查边界；任务 9、10 可独立准备 |
| 第四批：整体核对 | 11 | 1—10 的改动与各自同步已完成 |

推荐主执行者顺序实施，因为多项任务共享锁、清单及条件引用；不为并行而拆分同一文件所有权。

## 任务 1：修复来源说明和继承记录

**Files:** 新建根及 Backend `.template-spec/agents/matt-skills-adaptation.md`；修改两份 `skills-lock.json`、两份 `bundle-profile.json`、`.template-source/agents/skills-maintenance.md`、`S/maintaining-skills/SKILL.md` 和 `references/authoring.md` 中必要指针。

**Interfaces:** 消费根锁现有 17 个 Matt 来源条目和 Backend 现有 16 个条目；产出共同 `adaptationRef` 路径和两个模式可分发的资源。其他任务在同一说明中更新自己的采用状态，不创建平行记录。

- [x] 列出两份锁的 Matt 条目，确认 Backend `yss-research` 的有效内容与共享源、没有专有覆盖；区分来源错误与合理的 profile 差异。
- [x] 创建说明：原始引入、本次比较、17 个技能的本地职责、选择性采用/保留差异/待处理、对应本地路径和核验日期；未执行的改进保持待处理。同步 Backend 副本。
- [x] 更新旧 `adaptationRef`；对确认继承共享源的 Backend `yss-research` 恢复根来源字段，保留实际 targets，必要时更新其有效树哈希。不要整条复制根记录。
- [x] 在两份 bundle 的 `installations.project.skillReferences` 和 `installations.skills.skillReferences` 中，为最终属于 Matt 来源且在该 profile 分发的条目加入共同说明，数组去重。保留原有其他依赖。
- [x] 完成共同同步。临时读取 JSON 并断言：目标文件存在；对应两种模式均包含资源；root/Backend 来源说明字节相同；原始 revision/upstreamHash 未被改写；Backend 本地目标未丢失。预期没有失效来源引用，不要求整个历史文档中消灭旧路径。

## 任务 2：修正 tracker 操作与配置方法

**Files:** `S/setup-matt-pocock-skills/{SKILL.md,issue-tracker-github.md,issue-tracker-gitlab.md,issue-tracker-local.md,triage-labels.md,references/configuration-decisions.md,references/write-configuration.md}`；根及 Backend `.template-spec/agents/{issue-tracker.md,triage-labels.md}` 中受影响的操作说明；必要时对应 bundle 资源。

**Interfaces:** 消费已明确的 `tracker.platform/root/repository/host/project` 和当前用户操作授权；产出正文/评论/标签完整读取、真实依赖关系及未知结果处理方法，供任务 6、7、8 使用。

- [x] 执行只读帮助核验：`gh --version`、`gh pr list --help`、`gh issue view --help`、`glab --version`、`glab issue list --help`、`glab mr list --help`。预期记录实际字段/参数；不得用帮助成功冒充远程请求成功。
- [x] GitHub 外部 PR 列表改用能力足够的连接器或显式目标的分页 REST `author_association`；分别取得正文和评论。GitLab 两种列表各自使用帮助支持的 `--output json`；不保留错误短参数或推断命令间的短参数相同。
- [x] 统一配置优先、显式仓库与 GitLab 实例、真实 ID 及分页处理；创建/更新正文使用工具结构化参数或安全的正文文件；超时先查结果，更新先核对并发修改，写入后回读。关闭与解释评论分别处理，不因已关闭时退出 0 就推断评论成功。
- [x] setup 复用已给目标、标签和文档位置，只询问真实缺口；只改受管区块。无词汇归档需求时不自动创建 `CONTEXT.md`。当前三条标签表保留，修正“五态”等数量和角色称谓，不恢复已删除的 ready 标签、不重设用户配置。
- [x] 完成共同同步。检查 fork/多 remote、自托管 GitLab、仅授权读取、创建结果未知四种输入，预期目标不漂移、不写入、不会直接重试未知结果。可用的只读远程调用另记录；没有权限时写未验证，不安装或登录新工具。

## 任务 3：统一诊断和 TDD 参考

**Files:** `S/diagnosing-bugs/{SKILL.md,references/feedback-loop.md,references/investigation.md}`；`S/tdd/{SKILL.md,tests.md,mocking.md}` 中实际冲突或新增覆盖说明的位置。

**Interfaces:** 消费当前请求、实际代码和已有验收；产出诊断的证据等级以及关键测试边界的覆盖/遗漏说明，不增加测试资格或前置文档。

- [x] 对照入口与两个诊断参考，删除“无失败命令不得分析”等普遍停止规则；保留可证伪假设、性能测量、症状一致性、脱敏与清理方法。
- [x] 保留明确缺陷的直接路径和复杂故障按需反馈；无运行环境时允许有依据的推断并标明未验证。人为变异继续要求确认字节变化和目标症状，保留用户文件保护。
- [x] TDD 只在用户要求时使用；在有选择意义的公开边界补“覆盖什么、遗漏什么”，保留独立预期值、外部边界 mock 和单条行为反馈，不强制用户重复确认已有接口。
- [x] 完成共同同步。分别检查“明确缺陷、无服务环境”和“已给接口及验收，要求 TDD”：前者能继续分析但不虚报验证，后者无需额外批准 seam；人工变异场景不能用无变化或无关失败作为证据。

## 任务 4：恢复审查方法的正确入口

**Files:** `S/code-review/{SKILL.md,references/candidate-capture.md,references/yss-review-standards.md,references/review-axis-checklists.md,references/smell-baseline.md,references/legacy-convergence.md}`；存在真实引用时配套根及 Backend registry 的相关项。

**Interfaces:** 消费实际 Git 候选、当前请求/验收和适用规范；产出有定位、触发条件与后果的 findings、不可评价范围及实际验证限制。

- [x] `candidate-capture.md` 保留 committed/worktree 范围差异、相关未跟踪文件和不可读内容说明；去掉强制 manifest、冻结和无歧义时仍询问基线的要求。空范围报告无可审内容。
- [x] `yss-review-standards.md` 收集实际标准和相关 YSS 专项输入；移除强制机器检查、actor/instance 资格及结构化证据包要求。失败命令区分代码缺陷与环境失败；未执行测试本身不是 finding。
- [x] `review-axis-checklists.md` 保留规范、需求两类判断，不强制两名审查者；UI 仅在相关设计与变更存在时适用。清理重复坏味道规则并维护唯一参考，仓库约定优先。
- [x] `legacy-convergence.md` 改为历史只读说明，明确不提供当前执行步骤；从当前入口/依赖中解除旧执行前置。主入口只接回已经改写完成的必要参考，不先链接旧门禁。
- [x] 完成共同同步。用临时工作树或隔离的小型 Git 目录检查“无独立 Spec、存在已暂存/未暂存/相关新文件、仅授权审查”：所有范围被说明，不写业务代码、不自动测试或建候选包；输出不能把没有发现问题称为业务批准。

## 任务 5：收敛业务提问与词汇维护

**Files:** `S/grilling/SKILL.md`；`S/domain-modeling/{SKILL.md,CONTEXT-FORMAT.md,ADR-FORMAT.md}` 中现行流程引用；`S/codebase-design/references/architecture-audit.md` 中强制创建/恢复 Context 的关联步骤。

**Interfaces:** 消费已有稳定术语、真实业务分歧和当前写入范围；产出已确认决定或明确候选，不推导业务身份或流程资格。

- [x] grilling 增加肯定回答接受推荐项的规则，保留当前问题依赖顺序、事实自行调查和已确认决定复用。第三方知识缺口仅产生授权范围的问题清单，不自动发送或新增技能。
- [x] domain-modeling 保留根文件、`context_schema_version: 1` 和 `<ContextId>/<EnglishIdentifier>` 语义；没有稳定身份时保留候选，普通讨论不因缺文件阻断。
- [x] 清除 CONTEXT-FORMAT 中无可用命令支撑的验证参数及旧流程门槛；实际写入遇到格式/身份冲突时只停受影响写入。架构审计参考采用相同边界，不自动造 Context、ADR 或新词义。
- [x] 完成共同同步。核对“推荐答案为是”“已有决定不再询问”“缺 Context 只讨论”“缺 ContextId 请求正式写入”四例：前三例继续，最后一例保留候选并说明缺口；不把少问问题当作跳过业务决定。

## 任务 6：统一规格综合和业务拆票

**Files:** `S/yss-product-lifecycle/{SKILL.md,references/spec-workflow.md,references/spec-tracker.md,references/user-decisions.md,references/daily-delivery.md}`；`S/to-spec/SKILL.md`、`B/to-spec/SKILL.md`、`S/to-tickets/SKILL.md`；实际引用的 `.template-spec/templates/{spec-template.md,business-ticket-template.md,vertical-slice-ticket-template.md}`，Backend 仅核对已有的 `profiles/backend/.template-spec/templates/vertical-slice-ticket-template.md`，仅修改与当前入口矛盾的通用流程文字，不补建其他 Backend 模板。

**Interfaces:** 消费任务 2 的 tracker 目标规则、任务 5 的决定和词汇；产出使用已有引用的 Spec、业务票或适用实现 Slice，不额外制造集合或身份资格。

- [x] life 路由在解释前提、例外或决定跳过步骤前读取实际技能；只展示候选时不加载全部。调用遵循宿主真实能力，不把读取显式技能的正文当成执行授权。
- [x] 根与 Backend to-spec 复用既有讨论，保持各自非技术规格/研发规格职责；移除普通任务必须先通过旧工程身份或生命周期入口的要求，仍不在模板源创建虚构业务资产。
- [x] to-tickets 保留业务票与 Slice、已有 ID/引用和实际命中的技术层；已有集合继续使用，普通拆分不强制创建集合 YAML。模板是内容参考，不自动构成阶段门槛。
- [x] 远程父子与阻塞关系用真实标识；无原生能力时用文本，已有原生关系不再维护独立重复列表。保留 expand → migrate → contract 和最终集成验证边界，不自动关闭父票。
- [x] 完成共同同步。核对“已有讨论只综合”“本地草稿无 tracker”“远程条目未授权发布”“纯后端改动拆票”“无法分批独立保持绿色的机械重构”：结果不得额外增加 UI、集合、远程写入或虚假独立完成。

## 任务 7：收敛 triage 与 wayfinder

**Files:** `S/triage/{SKILL.md,AGENT-BRIEF.md,OUT-OF-SCOPE.md}`、`B/triage/SKILL.md`；`S/wayfinder/{SKILL.md,references/map-format.md,references/ticket-types.md,references/chart-map.md,references/work-map.md,references/scope-and-frontier.md}`。

**Interfaces:** 消费任务 2 的目标、标签及关系操作和任务 5、6 的业务方法；产出可读分类、未决问题、简报或决策地图，以及对应操作的实际状态。

- [x] triage 保持显式入口、上下文读取、重复功能核验、拒绝理由和历史回复复用；只读分析返回建议，tracker 更新按对应授权执行，不强制生命周期回交。
- [x] wayfinder 明确没有 tracker 时可在当前对话分析；保存采用已约定位置，未知远程目标不写入，不同时要求 setup 又静默选择本地。已有真实 map/票继续使用，不重新建同名记录。
- [x] 同步各参考的认领、评论、关闭、删除及地图更新权限。无写权限仍可分析，不伪称已认领；分配不是原子锁，发生并发变更时复读协调，不建立新协调数据库。
- [x] 决策票继续解决决定，完成不表示实现已交付。用真实父子/阻塞关系计算当前可处理范围，相关小决定可同会话完成，不添加固定轮数。
- [x] 完成共同同步。核对只读 triage、已有决定地图无新信息、无法认领但能阅读、创建超时、并发更新五例，预期复用已有信息、明确实际状态且不重复创建或覆盖他人内容。

## 任务 8：补强 Ticket 承接与已有子代理分支

**Files:** `S/implement/SKILL.md`；`S/codebase-design/{SKILL.md,DESIGN-IT-TWICE.md,references/architecture-audit.md}` 中派发及接口选择部分。与任务 5 修改同一参考时顺序整合。

**Interfaces:** 消费任务 2 的明确 tracker 与任务 4 的只读审查边界；产出已定位的工作范围或可比较的接口备选。既有派发说明至少提供目标、权限、负责路径、事实指针/版本和输出限制。

- [x] implement 收到 URL/编号后读取真实正文及相关评论，用标题说明承接范围；歧义只问定位问题，访问失败不等于不存在，已有依据的独立部分继续。
- [x] 只在已授权且现有方法需要时派发；写清独立上下文、必要来源和任务结果。Codex 可用时用 `fork_turns: none`，不固定跨宿主参数或模型名。
- [x] 写入任务声明路径所有权、不覆盖其他执行者；共享索引明确单一整合者。指针不可访问时补最小必要原文或调整方式，宿主无子代理能力时顺序执行。
- [x] DESIGN-IT-TWICE 的备选数由真实取舍和资源决定，移除固定 3+ 子代理要求；不新建整规格并行实施技能或自动分支/提交流程。
- [x] 完成共同同步。检查真实 URL、含混编号、指针不可读、无子代理能力及共享索引五例；任务说明不能缺范围，也不能以完整会话复制代替必要输入选择。

## 任务 9：接通 PR、复盘与写作方法

**Files:** 新建 `S/i-have-adhd/references/pr-and-retro.md`；修改该技能 `SKILL.md`、`references/yss-adaptation.md` 的相关描述，根及 Backend `.template-spec/process/document-writing.md`；核对 `S/writing-for-agents/{SKILL.md,SKILL-MECHANICS.md,references/writing-principles.md}`；依真实调用调整 bundle/registry 中相关引用。

**Interfaces:** 消费当前任务已有事实和实际验证记录；产出问题、变化、验证限制、影响/回滚说明及有证据的最小改进建议，不创造执行记录。

- [x] 将旧 document-writing 中当前有效的 PR/复盘方法转入技能内参考，原章节保留同名导航和锚点；旧正文不再重复维护。
- [x] 从普通 PR 写作、复盘任务直接加载新参考；移除只有治理、阶段批准场景才可用的限制，保留纯代码/无关对话不触发的范围。
- [x] 清除强制恢复 CI、测试套件、统一证据和关闭流程的要求；保留真实 before/after、未运行区别、已有导航/检查失效的分析和不可逆影响说明。
- [x] writing-for-agents 保持条件引用、唯一规则来源和宿主实际调用语义；只读参考不能越过显式调用与动作授权，不要求所有任务加载全部文件。同步必要的来源适配说明。
- [x] 完成共同同步。检查简单 PR、只有 after 证据、真实返工、没有具体失败的普通任务：前两例不虚构 before，复盘只提出证据支持的改进，普通任务不产生空复盘或工具建设。

## 任务 10：统一 wiki 的当前操作方法

**Files:** `S/llm-wiki/{SKILL.md,references/discover.md,references/ingest.md,references/query.md,references/writing.md}`。

**Interfaces:** 消费用户授权的来源/范围、现有 wiki 约定及本次可读事实；产出增量 Markdown 或只读答案，保留来源时点和人工内容。

- [x] 四份参考均改为入口已经承诺的直接 Markdown 方法；清除 `query.mjs`、已删除 schema、统一事务发布、manifest 前置和固定文档数量门槛。入口按查询、摄取、写作分支链接当前参考。
- [x] 先复用用户指定或任务内已有 wiki，无 wiki 的查询只回答缺口；新建确被请求时采用入口约定位置，跨目录探索限定在授权范围。
- [x] 代码结论注明仓库与 commit；未提交内容注明工作树状态、路径与读取时间。新事实标记旧结论被替代，保留来源；决策日期与普通常识不混为逐句打时间戳要求。
- [x] 查询只读，授权更新只改受影响文章；保留人工正文、敏感信息与并发变更保护。已有 manifest/历史记录不自动删除或迁移，来源不可读时说明局限。
- [x] 完成共同同步。在仓外临时目录准备包含人工页、旧代码结论、未提交来源的小样例，分别观察查询与更新：查询前后字节相同；更新只触及授权页面，时点真实且不调用旧脚本。用后仅清理本次临时目录。

## 任务 11：保留差异核对与整体收口

**Files:** 核对 `S/handoff/SKILL.md`、`S/prototype/{SKILL.md,LOGIC.md}`、`B/prototype/SKILL.md`、`S/resolving-merge-conflicts/SKILL.md`、`S/yss-research/{SKILL.md,references/competitive-analysis.md}`；21 个技能及实际直接消费者；两份锁、bundle、registry、运行时元数据和所有受影响副本。只改真实冲突，不为了产生 diff 改写已正确内容。

**Interfaces:** 消费任务 1—10 的结果和设计保留项；产出实际修改、结构核对、命令核验、行为观察和未验证范围的交付说明。

- [x] 核对四项保留差异：handoff 仍交付真实 PR/MR 文件；prototype 仍区分逻辑与视觉且 Backend 不引入前端；冲突解决仍保护暂存区和双方意图；研究仍默认聊天、按需保存且区分事实/推断。原型中残留“必须回生命周期阶段”仅改成实际产品设计能力归属。
- [x] 核对所有入口、包内参考、正文路径、技能调用和直接消费者；未被链接的旧参考按设计处置。历史合同目录只读，不做全仓关键词替换。
- [x] 用临时标准库检查受影响 JSON/YAML 能解析、必要参考存在、两种安装模式资源闭包可达；比对修改前后的默认安装集合、公开名单和调用策略相同。任意边界缺口报告具体消费者与文件，不据少量计数推断全面通过。
- [x] 逐项比较源/副本字节、链接目标及必要文件属性；单独核对 Backend 覆盖、平台元数据及已有 effectiveHash。`.DS_Store` 等缓存不参与受管内容同步；不能用根/Backend 数量不同判断出错。
- [x] 在实际可用宿主对设计第 9 节的代表性输入作只读或临时目录观察，记录输入、加载文件、实际动作和结果；缺宿主/权限的情形写未验证。不存在运行轨迹时只称文本核对或场景推演，不统计虚假确认次数或效率收益。
- [x] 执行 `git diff --check` 并核对 `git status --short`、当前 diff 和新增文件。预期只有本轮授权文件；另检查未跟踪新增文档的链接与空白，不能依赖 diff 命令遗漏它们。
- [x] 更新共同适配说明中已实际完成的采用状态，确认所有任务同期同步完成；输出实际结果与未完成事项。提交、发布或更新用户实例不属于本步骤。

## 自检与执行交接

设计覆盖映射：第 5.1 节由任务 1、3—11共同落实；5.2→3，5.3→4，5.4→5—7，5.5→8，6→2、6、7，7.1→9，7.2→10，8→1及共同同步，9—10→11。保留差异由任务 11 与每项的范围约束共同核对。

本计划新增的具体判断是：保留审查历史参考为明确只读说明，保持既有标签表而修正数量误称，以及用历史算法临时维护仍存在的 Backend 哈希；均不恢复旧执行工具。该算法仅用于已有字段，不给根锁增添新字段。

计划已自检文件职责、依赖、设计覆盖和核对重点；没有新增产品决定或跨仓实现。任务完成情况与限制见下方执行结果。计划与设计保存在同一可跟踪目录，避免使用本仓已忽略的 `docs/superpowers`。

本次已采用主执行者逐项执行，共用文件由一人整合；最后进行一次独立只读审查。此次审查不形成日常任务或逐任务的通用门禁。

## 执行结果

实施位置：`/Users/zhudaoming/.codex/worktrees/matt-skills-convergence/yss-spec-project-template`，分支 `codex/matt-skills-convergence`；基线仍为本计划所列提交。原 main 工作区保留原设计/计划，两处计划状态以此实施工作区为准。

- 21 个技能范围已核对；共享入口仍为 62，Backend 仍为 61。未增加默认安装、公开入口或自动调用策略。
- 完成来源说明、tracker 参数及权限规则、诊断/审查参考、规格/拆票/词汇、triage/wayfinder、Ticket 承接与可选代理分支、PR/复盘和 wiki 参考；保留 Backend 覆盖及 handoff、冲突处理和研究差异。
- 临时结构核对通过：172 个包文件、20 个本范围 Backend 哈希、修改文档链接、JSON/YAML、来源字段、分发资源、原 tracker 配置、默认集合及 `git diff --check`。独立审查另核对全部 61 个 Backend 哈希。
- 实际执行了 CLI 帮助/版本核验、明确目标的公开 GitHub 只读请求、临时 Git 工作树范围观察，以及 wiki 查询/授权更新观察；wiki 查询未改变 4 个样例文件，更新只改变指定页面，人工页与来源保持不变。
- 其余场景为文本核对；没有宣称真实模型行为、GitLab 写入、跨宿主发现或已安装实例升级通过。临时核对工具不进入分发。

独立审查：Critical 0、Important 0、Minor 1。保留的 P3 为：明确的新 GitHub Issue URL 与既有 tracker 目标不同时，当前文案可能要求重复澄清；后续可改为直接使用当前明确目标并说明差异，仅实际歧义时询问。遵循本次 executing-plans 的 Minor 留存规则，未额外开修复/复审轮次。

执行判断记录：隔离工作区；以本计划临时核对替代通用 TDD/提交封装；保留未提交分支和账本；远程写操作、安装实例行为、未运行的模型场景与历史执行器兼容不作已验证结论。详细过程在本工作区忽略的 `.superpowers/sdd/2026-10-31-matt-skills-convergence-plan/progress.md`，尚无提交历史替代它，暂不删除。

未执行提交、推送、合并、部署或发行，未更新用户安装实例。后续整合使用对应授权。
