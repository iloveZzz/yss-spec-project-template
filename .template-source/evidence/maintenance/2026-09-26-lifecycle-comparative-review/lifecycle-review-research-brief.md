# YSS 研发规格主控、阶段模板与同类工具审查

## Research Scope

- 日期：2026-09-26。Profile：`technical-evidence`；Mode：`evidence-audited`。竞品事实由 `competitive-intelligence` 调研，`yss-research` 汇总并核对结论。中文文档应用 `i-have-adhd`。
- 要回答的问题：当前主控与阶段划分是否合理；配套 Skill/模板是否一致、可执行；下一轮应修什么；同类工具有哪些机制值得采用，哪些授权和状态语义不能照搬。
- 读者：模板维护者。建议适用期：未来一至两个维护迭代；外部事实以访问日为界。
- 本地纳入：当前工作树的主控、注册表、核心阶段 Skill、Plan/Spec/Design/工程/Ticket/验证发布复盘模板、定向验证器及已有研究和评测。HEAD 为 `ab0c247d5d30520dfe3a5876a96f5d0864d83cd0`，工作树存在本轮开始前的未提交优化；不能把 HEAD 当作完整受审内容。来源摘要见 [source-snapshot.json](source-snapshot.json)。
- 外部纳入：Spec Kit、OpenSpec、Kiro、BMAD、AWS AI-DLC、Superpowers、GSD、Matt Pocock Skills，以及 Agent Skills 标准和 OpenAI 技能评测方法的官方文档、源码、发行说明。优先固定源码 revision；在线文档/main/beta 分开标识。
- 排除：搜索摘要作为结论依据、营销排名、Stars 代表质量、未实测的速度/成本排序。未安装运行竞品、访谈客户或测试真实生产环境；本轮不是全部 80 个注册 Skill 的逐项代码审查。
- 先读既有 09-25 审计、09-26 优化和 09-20 Agent 评测，再刷新本地和外部证据。它们是历史材料，除明确重跑项外不算本轮 Fresh Verification。

## Executive Read

**流程骨架合理，建议保留；下一轮重点是规则一致性、操作可理解性和真实交付评测。** 当前注册表为 8 个阶段、7 个聚合门禁、14 个内部检查、23 个工作单元。主控、专项执行、独立审查和用户决定的职责分开，适合本项目的多仓、前后端与企业工程约束。这是对设计及定向验证的判断，不是效率优于竞品或可发布的证明。`claim-local-foundation`

昨天审计中列出的原型旧 ID、Evidence v3、L3 旧审查要求、Ticket 强加 DDD 和阶段决策死链接，已在当前工作树修正；`prepare/diff` 和状态入口也已出现，不应重复立项。仍发现三组说明漂移：脚手架/API 决定版本、Reviewer 人数、Plan 批准延续说明。此外，状态视图的检查范围、末段交付模板和完整流程评测值得改善。`claim-existing-fixes`、`claim-schema-drift`、`claim-reviewer-drift`、`claim-continuation-gap`

本轮 8 项定向检查全部退出 0；另做了只读状态视图探针。结果说明结构检查、局部行为检查与自然语言规则一致性必须分别评估。没有运行完整发布套件，也不修改流程、模板或 Skill。本轮产物仅为本目录研究证据。`claim-current-checks`

## Findings

### 1. 主控与配套 Skill：职责分离值得保留

| 能力组合 | 当前设计价值 | 需要改进的地方 |
|---|---|---|
| `yss-product-lifecycle` + registry + orchestration contract | 一处维护阶段/门禁身份，主控按真实资产选下一工作单元；专项 Skill 不自行宣布通过 | 让说明、版本号和示例始终服从同一策略；继续用按需查询，不因总合同较长就全量加载 |
| `grilling` + `domain-modeling` + `yss-stage-decision` | 分别承担当前决定的澄清、稳定语言维护、决策包综合；战略设计不提前选择 Java 类型和后端架构 | 在真实轨迹中检查是否重复询问同一决定；不要让 Plan、战略包、方案包各写一遍业务事实 |
| `yss-research` + `competitive-intelligence` | 事实/推断/决定分离；技术事实回到一手源，竞品有时效和证据边界 | 持续记录版本和来源限制；研究结果不能直接变成已批准需求 |
| `yss-prototype-stage` + design system + `prototype-review` | UI 与产品设计影响分开，H1/H2 按风险选择；原型与生产实现有明确边界 | 延续现有状态/异常/恢复矩阵和真实浏览器证据，不再增加平行设计状态机 |
| `yss-technical-design` + tactical/MVC 分支 | 同一入口承接已选架构，MVC 不强制 DDD；规则、事务和测试 seam 仍需完整 | 同步入口与消费者的 schema 版本，避免编译器生成一种格式、说明要求另一种 |
| contract compiler + 专项实现 + TDD + review | 起草合同、批准、执行、独立审查分开；窄垂直切片有实际验收依据 | 用已编译的最小 Skill 闭包派发；兼容入口不能成为另一个主控或绕过 Ticket 正式化 |

依据：当前主控、`grilling`、`domain-modeling`、`yss-stage-decision`、`yss-prototype-stage`、`yss-technical-design`、实现合同编译器入口及注册表。`claim-local-foundation`

不建议按技能总数直接合并。真正可合并的应是相同触发条件、输入、写入责任和验收结果；原型评审与实现审查、研究与决定、合同编译与批准具有不同责任，不能因名称相近而合并。该判断是从现有责任边界得到的设计建议。

### 2. 阶段模板：前半段较完整，交付末段引导不足

| 阶段 | 本阶段应该新增什么 | 当前判断与建议 |
|---|---|---|
| Plan | 用户问题、MVP/非目标、关键规则、取舍和未决项 | 当前模板已要求引用战略事实，合理。补足批准延续说明即可，无须再建 Plan 状态文件 |
| Spec / 功能架构 | 可观察行为、验收、影响和公开测试 seam | 保留规则—场景—验证对应；不要提前把 Spec 本身置为 `ready-for-agent` |
| 产品设计 | 入口、操作、反馈、状态转换、异常恢复、对 Spec/API 的反馈 | 新模板已移走具体业务示例，状态矩阵已有 guard/动作/退出路径。总体设计与交互说明的重复栏目可试用“上游引用＋本阶段增量” |
| 工程契约 | 规则在所选架构中的落点、API/数据/一致性和验证约束 | DDD/MVC 分支合理；优先修 schema 说明漂移，而非再增加设计阶段 |
| Ticket / 实现 | 窄而完整的交付行为、依赖、当前合同与执行证据 | 继续由 Slice YAML 保存细约束，Ticket 作可读入口；避免重复维护机器字段 |
| 验证 / 发布 / 复盘 | 同一候选的证据、交付与外部动作边界、回滚及改进行动闭环 | 验证表只提示时间/命令/pass-fail，发布和复盘模板很简。宜引用已有候选/批准/运行日志，并明确复盘行动 owner、验证方式和关闭条件 |

以上是模板适配评价，不是“标题少即流程缺失”。权威合同已有审查、回滚和治理回流要求，简模板也允许按需补充。改进目标是减少遗漏和二次补证，尚未测得收益。`claim-template-guidance`

### 3. 当前仍有证据支持的问题

| 编号 / 性质 | 可定位事实 | 影响与建议 | 验证边界 |
|---|---|---|---|
| F1 / 明确说明冲突 | [AGENTS.md](../../../../AGENTS.md) 第 63 行要求脚手架 schema v3；实现合同编译器第 52 行、MVC 第 14/72 行、DDD 第 77 行要求新生成 v4，v3 只作历史恢复 | 根入口和执行规则不一致。应统一“新建版本/历史读取/迁移”说明，最好引用权威版本表或生成说明片段 | 未以真实生成任务测量由此造成的阻塞；不能说生成器已经失效 |
| F1b / 同组版本漂移 | orchestration 第 46/48 行及 compiler、DDD/MVC 入口仍指定 API Decision v1；`contract-reading.md:29-38` 与 API 准备器使用 v2，校验器兼容 v1/v2 | 去掉无条件 v1 约束，清楚说明新产物与历史兼容 | 不代表 v1 不再受支持，也未证明 v2 被实际消费者拒收 |
| F2 / 明确说明冲突 | `state-model.md:74`、`orchestration.md:81` 固定写两个 Reviewer；权威合同 1219-1221 默认一个独立 Reviewer，按条件增员 | 改成所有参与审查者使用同一候选；人数只引用权威策略 | 目前是文字冲突，尚无重复派发的实际轨迹 |
| F3 / 说明不完整 | `entry-review.md:11,23-25` 只呈现当前用户决定及重新确认；`plan-spec-entry.mjs:75` 已支持 `plan_continuation_ref` | 补充原始回复/经验证延续二选一路径，给机械变化与实质变化对照 | 不能自动把所有字节变化视为等价；仍由现有校验器与独立证据裁决 |
| F4 / 状态视图覆盖范围 | `lifecycle-status.mjs:28-47` 检查显式阻塞、可读性及 stage-tracking 漂移；对 approved 资产只读文件，不核验其摘要 | 输出中区分已登记阻塞、已执行检查、未检查项；下一动作提示先做适用预检 | 合成探针中资产字节变化后仍可返回 `blockers: []`；只证明视图范围，未证明正式门禁可绕过 |
| F5 / 模板引导风险 | verification 模板 24-28 行缺明确候选/cwd/退出码/日志引用位置；49-52 行直接给可合并/可发布 | 由运行记录自动生成摘要，并引用候选与批准；区分证据支持的就绪和外部动作授权 | 不新增一张人工表，不把模板简略定性为放行漏洞 |

证据：`claim-schema-drift`、`claim-reviewer-drift`、`claim-continuation-gap`、`claim-status-scope`、`claim-template-guidance`。精确行号、来源摘要和反证见 [本地检查](local_templates-notes.md) 与总证据台账。

状态探针保存于 [status-view-probe.json](status-view-probe.json)。首次探针错误地将 Buffer 序列化为 JSON，导致注册表无效；已保留为 `status-view-probe-invalid-fixture.json` 并排除。修正为 UTF-8 原文复制后才得到所述结果。没有通过编辑真实项目或批准记录制造该结果。

### 4. 同类产品：借鉴机制，同时核对语义

同名阶段不能直接比较：Spec Kit 的 Plan 偏技术实现计划，YSS Plan 是战略规划；Kiro Design 包含技术设计，也不等于 YSS 产品设计阶段。以下是官方资料能力比较，未做同题运行排名。

| 产品 / 本次证据边界 | 值得借鉴的机制 | 对 YSS 的适用方式与限制 |
|---|---|---|
| [Spec Kit Workflows](https://github.github.com/spec-kit/reference/workflows.html)，当前在线文档 | 可查询执行状态、精确恢复、JSON 输出；[CDD 指南](https://github.github.com/spec-kit/guides/contract-driven-development.html) 强调契约 owner 和消费者验证 | 改善下一动作和诊断入口。其 gate 默认 verdict 可自动作答，不能替代 YSS 原始用户回复；文档不等于安装包实测。`claim-speckit` |
| [OpenSpec Stores](https://github.com/Fission-AI/OpenSpec/blob/main/docs/stores-beta/user-guide.md)，明确 beta | 独立规划仓、只读 references、组件本地 change；状态和修复指令较直观 | 可借鉴来源/消费者关系展示。Stores 不自动分派仓库任务，也不自动同步 Git；不能等同完整跨仓接收。`claim-openspec` |
| [Kiro Quick Spec](https://kiro.dev/docs/specs/quick-spec/)，页面更新 2026-08-04 | 熟悉需求可一次形成相同规格工件；[Bugfix Spec](https://kiro.dev/docs/specs/bugfix-specs/) 显式关注须保留行为 | 借鉴按实际风险裁剪及回归范围表达。Quick 没有阶段间审批，不能原样用于 YSS 已命中门禁。`claim-kiro` |
| [BMAD v6.12.0](https://github.com/bmad-code-org/BMAD-METHOD/releases/tag/v6.12.0) | 先调查再决定流程深度；此前 research/review 等入口已收敛并考虑兼容 | 可核对 Skill 是否真正重复。在线预览能力不能算作普通稳定安装能力；减少 Skill 数不等于减少成本。`claim-bmad` |
| [AWS AI-DLC v2.10.0](https://github.com/awslabs/aidlc-workflows/releases/tag/v2.10.0)，稳定发行说明 | 已验证 Unit/batch 检查点、人工权限边界和可执行恢复指引；主分支有薄 conductor / engine 分工 | 支持 YSS 保持薄主控与确定性校验。main/preview 与稳定包分开；最新 preview 的测试失败不能外推为稳定版整体不可用。`claim-aidlc` |
| [Superpowers](https://github.com/obra/superpowers/blob/8ca22dba9a94f28898bbce59f2537ff4d87c747d/skills/subagent-driven-development/SKILL.md)，固定源码 | 小任务派发、任务记录和审查上下文隔离 | 借鉴执行上下文和反馈闭环。其主控对部分歧义直接作 ruling 的自主策略不能覆盖 YSS 关键用户决定。`claim-superpowers` |
| [GSD 当前 resume 工作流](https://github.com/open-gsd/gsd-core/blob/b3a055c07d6577f5bcbce8d360653ddd6979d1c5/gsd-core/workflows/resume-project.md)，固定源码 | 区分未完成初始化、未提交文件、异步外部任务，恢复时防止误重做 | 补充 YSS 恢复评测案例；继续使用现有 checkpoint。旧仓已经迁移，不能只凭旧 README 判断当前能力。`claim-gsd` |
| [Matt Pocock to-spec](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/to-spec/SKILL.md)，固定源码 | 对话综合、用户故事、公开测试 seam，入口简洁 | 可复用方法；该上游会给整个 Spec 标 `ready-for-agent`，与 YSS 定义冲突，必须保留适配及显式兼容入口。`claim-matt` |

更完整的阶段、恢复、棕地、验证、跨仓矩阵与限制见 [同类工具记录](competitors-notes.md)、[技能机制记录](skill_patterns-notes.md)。来源、版本和访问记录见两个 `*-sources.json`。市场采用、可靠性排名及客户需求频率未调查，不能由文档能力推断。

### 5. 渐进加载方向正确，但效果应由真实评测证明

[Agent Skills 规范](https://agentskills.io/specification#progressive-disclosure) 支持 metadata → 入口 → 按需资源的组织方式。[OpenAI 技能评测指南](https://developers.openai.com/blog/eval-skills) 建议检查产物与调用轨迹，包含显式/隐式触发、负对照，并分别观察结果、过程和效率。当前 YSS 已有薄入口、查询合同、投影/锁及真实 Agent runner，建议继续完善，而非重建。`claim-skill-evaluation`

已有 09-20 评测记录：16 场景、两版本、各重复两次，共 64 次；统一评分后两侧均为 32/32，候选没有展示更低的耗时、工具调用或输入 token。09-26 分诊回放则是 14 个合成首步判断、零工具调用；其 2/14 → 0/14 模式错误变化不能代表后续执行正确率。跨仓样板试点证明了有限构建与错误注入路径，但批准为 test-data-only，真实 Spring 平台、部署、浏览器还原和正式 Slice 批准仍未由该试点证明。`claim-evaluation-limits`

因此，“文档更短”“全部 schema 通过”“模型说理解了”都不足以证明研发更快。当前缺口主要是完整流程代表性、真实输入与成本归因；不能说本项目没有 Agent 评测。

### 6. 建议的改进顺序与验收方式

以下为建议，不是新门禁或已批准实施计划。

| 顺序 | 建议工作 | 可审阅的验收结果 | 主要反证/约束 |
|---|---|---|---|
| P1-A | 统一 schema、Reviewer、授权延续说明 | 根入口、主控、编译器、生成器和准备器不再给冲突指引；历史版本保留明确读取路径 | 不应全仓简单替换 v1/v3；不同合同版本必须分别识别 |
| P1-B | 完善现有状态/恢复入口 | 展示已核验/待核验范围，阻塞附来源、owner、下一条适用命令；摘要漂移不能被解释为“已具备执行权限” | 状态查询保持轻量，不默认跑完整模板或发布套件 |
| P1-C | 优化模板的引用和末段证据 | Plan/总体设计/交互沿用同一来源，设计只补增量；验证/发布/复盘引用已有候选、运行日志、授权和改进行动 | 先做有 UI/无 UI 两个试填案例；不增加需要人工抄摘要的新表 |
| P2-A | 扩展现有真实 Agent 评测 | 固定版本和任务，保存工具轨迹/产物；分别测遗漏、错误拒收/放行、无效追问、恢复重做、人工等待和执行耗时 | 先取基线；小样本不宣称百分比效率提升；错误评分需对两侧统一修正 |
| P2-B | 把已有跨仓样板推进为真实窄切片接收 | 同一已授权实例中验证 API + 页面、真实环境身份、联合验收与恢复；逐项列平台、部署和浏览器未覆盖项 | 需另有真实项目范围及正常批准；研究报告不授予实现或部署权限 |
| 按发布边界执行 | 核验固定版本消费者分发 | 用已提交固定来源做 CLI 初始化/同步/接收检查，处理前端通用测试缺夹具的历史待办 | 工作树集成通过不是发布认证；不为获取绿色结果提交或覆盖他人改动 |

建议纳入既有评测体系的代表性任务：低风险无行为改动、已有基线的小行为修复、纯后端 API、UI 状态/恢复变化、跨仓 API+UI、中断后上游变化。每类分别检查“应该继续的动作是否继续”和“应该阻断的动作是否阻断”，避免只测试拒绝能力。场景是建议，不是本轮新增通过证据。

## Counter-Signals

- 本轮 8 项定向检查通过，不能将剩余文字漂移扩大成整个流程不可用；同时，结构通过也没有覆盖自然语言说明的一致性。
- 当前已经有聚合门禁、授权延续、条件裁剪、H1/H2、候选准备、只读视图和真实 Agent 评测；建议应完善这些机制，不重复建设。
- 重复栏目可能服务不同读者与粒度。真实填写成本未计时，不能因字段数量多就判定冗余，更不能据此删除必要需求与验收。
- Spec Kit/AI-DLC/GSD 已有恢复，OpenSpec 已有跨仓规划；“支持多 Agent/跨仓/状态”本身不是独有优势。反过来，上游自动状态或提交约定也不适合直接替换 YSS 语义。
- 来源主要为供应方文档与源码，存在展示偏差；没有同题实测，不能判断哪家整体最可靠或最快。

## Source Map

总台账为 [lifecycle-review-evidence.yaml](lifecycle-review-evidence.yaml)，包含 Search Log、Evidence Ledger、逐条 claim 审计、反证和 source gaps。子任务笔记作为导航，决策性结论仍指向权威本地文件或外部一手源。主控复核了主要竞品页面、固定源码、关键本地行号及已有评测汇总；未把子 Agent 总结当作一手事实。

本轮实际验证记录在 [verification.json](verification.json)：生命周期注册表、上下文查询场景、流转场景、操作入口场景、Plan→Spec 场景、Skill 投影、Skill 锁、Skill 注册表，共 8 项，均退出 0。日志记录命令、执行时间和耗时。并行执行的墙钟时间不用于对比工具性能。研究包与交接校验另保存在本目录。

## Decision Handoff

下游 owner：模板维护者及 `yss-product-lifecycle`；`decision_ref=null`。本次身份为 `template-source`，产品术语对账为带原因的 `not-applicable`；根 `CONTEXT.md` 仅作为流程词汇合同读取。

本轮只增加研究证据，没有修改 AGENTS、Skill、注册表、模板、投影、锁、产品资产、Ticket 或批准记录，也没有 commit/push/发布。实施建议前按实际影响重新判定 L1/L2/L3，并由 `maintaining-skills` 同步 canonical、投影、锁和适用分发面。保持先模板、存量实例显式迁移；本报告不批准任何生产或发布动作。

## Evidence Limitations

- 当前证据是有既有未提交改动的工作树快照，不能代表外部分发版本。查看日的工作树来源见摘要清单；后续文件变化须重新核验相关结论。
- 未跑完整 `scripts/verify-template`，未宣布模板可发布；本轮通过范围只限列出的命令。
- 外部 main、在线文档和 beta 可能领先稳定版本；固定 SHA 仅证明相应文本，不证明它在本机运行成功。
- 旧 Agent 评测和跨仓试点本轮只复读证据，未重跑；仅本轮定向命令和视图探针是新增执行证据。
- 没有真实用户工作日志、访谈、商业数据或统计基准。重复确认、操作成本、流程吞吐的改进均为待验证假设。
- 审查覆盖主控和核心配套路径，不包含每个专项实现 Skill 的所有语义、每个外部 CLI 的完整集成或真实浏览器/生产部署认证。
