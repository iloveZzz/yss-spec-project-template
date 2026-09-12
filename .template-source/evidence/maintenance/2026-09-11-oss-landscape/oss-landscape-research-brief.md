# 相似开源研发框架调研与 YSS 机会判断

研究日期：2026-09-11。对象：YSS 模板工程及 CLI、技能和治理体系。状态：研究已完成，供维护者审阅；建议不构成路线、实现或发布批准。

## Research Scope

采用 `strategy-evidence / evidence-audited`，由 `yss-product-lifecycle` 在 `template-source` 维护边界内路由，竞品事实由 `competitive-intelligence` 调研、`yss-research` 综合。面向维护者，支持未来 1–2 个迭代的机会取舍。

问题是：谁在解决类似问题；哪些能力已经成为竞争基线；哪些未满足的交接工作与 YSS 现有基础吻合；怎样低成本验证这些机会。覆盖定位、目标使用者、规格与存量变更、规划/实现/审查、状态恢复、跨仓、授权、技能供应链、安装升级、生态、许可、使用成本和商业包装。

先读本地身份、词汇、手册、工程说明与相关脚本，再通过 GitHub、Google、公开网页搜索和官方文档交叉验证。纳入有公开源码、与研发工作流或治理有直接重叠的项目。通用 Agent SDK/聊天工具不作直接竞品，闭源产品与 source-available 企业套餐只作相邻定位证据。Google AI 概览、广告、榜单和二手比较仅提供线索。

本轮是文档/源码证据研究，没有安装竞品执行同一任务、访谈客户或测量真实模型费用。文档支持不等于运行通过，公开 Issue 不等于已复现缺陷。范围预声明见 [scope.md](scope.md)，机器证据见 [oss-landscape-evidence.yaml](oss-landscape-evidence.yaml)。

## Executive Read

**建议把 YSS 的重点收敛到：跨团队、跨仓库交付中，谁可以做什么、依据哪个已批准版本、交付物怎样被下一方可靠接收。先用一个真实业务切片证明收益，再扩展通用生态。** 这是基于已有能力与竞品边界的推荐，尚不是市场需求验证。

不能继续把“有 Spec、多 Agent、TDD、人工门禁、状态文件、技能锁、跨仓规划”单独当作差异点：Spec Kit、OpenSpec、BMAD、AI-DLC、Superpowers 和 GSD 已覆盖其中多个方面。尤其 AI-DLC 的确定性引擎、原生诊断和统一核心投影，对 YSS 构成直接能力重叠。`claim-competition-baseline`

值得优先投入的两个方向：**把已有跨仓交付合同做成可展示、可失败验证的接收闭环；把现有复杂规则变成用户一眼能理解的状态、原因与下一动作。** 兼容外部规格和技能升级审阅可随后验证。通用编码执行平台、通用角色数量扩张、重新造一套规格语法暂不作为优先方向。`claim-opportunity-handoff`、`claim-opportunity-frontdoor`、`claim-non-goals`

## Findings

### 1. 我们当前有什么：能力基线与证据边界

本地基线 HEAD 为 `32fa044c0123f73b8d8091590d1f060440ac9ccb`；所读文件另保存 SHA-256 清单，避免把未来改动混入本次结论。开始时 `.gitmodules` 和两个 dev 子模块删除已暂存，属于其他工作，本轮不处理。

| 维度 | 本轮看到的 YSS 事实 | 对机会判断的含义 |
|---|---|---|
| 生命周期 | 根身份区分模板源/项目实例；注册表、影响面裁剪、会签及词汇对账明确 | 有治理基础；规则多不能直接推出使用效果好 |
| 跨仓交接 | 战略交接、后端交付代码检查包摘要、批准资产绑定、合同/切片身份；导入形成接收草案 | 可以从已有资产做交付验证演示，不必从零设计 |
| 新鲜度 | 词汇全文/引用集摘要；源资产变更需要版本提升；接收时校验输入绑定 | 优势候选是“为什么这次可接收/不可接收”的证据链 |
| 技能 | canonical、平台投影、来源/内容哈希、技能注册表、按影响选择技能 | 可以发展升级差异解释；哈希和多平台本身已有竞争供给 |
| 专项工程 | 具备 Java、Vue、OpenAPI、组件与脚手架相关规则及实现合同边界 | 最适合先在熟悉的 YSS 工程场景验证，再判断抽取通用核心 |
| 使用入口 | 已有统一手册、贯穿案例、只读检查提示词和 CLI 升级说明 | 机会是降低操作成本，不是声称缺文档或缺案例 |

`claim-yss-baseline` 的依据是当前文档与源码静态核查；没有在本轮重新跑完整交付验收，所以不宣称这些组合已经在客户项目证明可靠、已发布或形成竞争壁垒。

发现一个可直接核验的采用障碍：工程说明第 31 行仍称三条产品线，用户手册已列五类；同一手册第 12–13、40 行说明专职前后端支持 attach/sync，78、91 行又表达排除或不支持。**本轮只能确认说明冲突，不能从中裁定对应 CLI 当前行为。** 这支持先统一“版本—家族—命令支持”展示。`claim-doc-drift`。来源：本仓 [工程说明](../../../../docs/process/template-engineering-overview.md)、[用户手册](../../../../docs/user-guide/用户手册.md)。

### 2. 竞品地图：按所承担的工作比较

以下为文档已显示的能力，不是实测评分。主分支、正式 Release、beta、社区扩展分别标注。每个项目的限制是本次研究的判断边界，不代表穷尽所有扩展。

| 项目与关系 | 已核实的重点 | YSS 面对的竞争/可借鉴之处 | 限制及来源 |
|---|---|---|---|
| **Spec Kit：直接竞品** | 规格流程；extensions/presets/workflows/bundles；JSON 工作流状态、人工检查点与暂停恢复 | 组织定制和工作流已经产品化；不能再按早期四步模板比较 | 工作流 shell 仍用本机权限；扩展目录不等于代码审计。[工作流](https://github.github.io/spec-kit/reference/workflows.html)、[参考总览](https://github.com/github/spec-kit/blob/main/docs/reference/overview.md)；`claim-speckit` |
| **OpenSpec：直接竞品** | 当前规格与变更 delta；默认 explore/propose/apply/archive；Stores beta 支持独立规划仓和只读引用 | 存量迭代和共享规划很直接；值得学习低负担的操作入口 | Stores 不自动按代码仓派发任务，也不自动同步 Git 副本。[概念](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md)、[Stores 指南](https://github.com/Fission-AI/OpenSpec/blob/main/docs/stores-beta/user-guide.md)；`claim-openspec` |
| **BMAD：直接竞品** | 按工作大小选路线；组织会签、共享规划骨架、单一文档 owner；团队/个人配置分离 | 产品规划、团队语言、定制与审查均有重叠；“角色多”不是优势 | 文档门禁与 YSS 批准字节绑定是否等价，未做端到端测试。[组织规划](https://docs.bmad-method.org/plan/plan-inside-an-organization/)、[定制](https://docs.bmad-method.org/customize/customize-bmad/)；`claim-bmad` |
| **AWS AI-DLC：直接竞品，重点关注** | 确定性引擎决定下一步；profiles 裁剪；统一核心生成各 harness 投影；`doctor` 诊断 | 与 YSS 的治理控制、分级、投影和恢复高度重叠；是产品化体验的强参照 | 文档说明的路由/检查机制尚未在相同任务实测。[引擎](https://github.com/awslabs/aidlc-workflows/blob/main/docs/harness-engineering/00-overview.md)、[开始使用](https://github.com/awslabs/aidlc-workflows/blob/main/docs/guide/01-getting-started.md)；`claim-aidlc` |
| **Superpowers：工程工作流替代** | 技能化规划、TDD、审查；v6.3.0 按任务性质裁剪流程与审查回路 | 工程师可用更少显式生命周期操作完成任务；轻量入口已有竞争 | 编码流程不是 YSS 全部战略交付职责。[项目](https://github.com/obra/superpowers)、[v6.3.0](https://github.com/obra/superpowers/releases/tag/v6.3.0)；`claim-superpowers` |
| **GSD Core：工程工作流替代** | 持久规划、执行/验证、状态投影和漂移处理；重视长任务恢复 | 用户关注“继续做完”，不愿每次重建上下文；状态功能本身并非空白 | 旧 `gsd-build/get-shit-done` 已归档迁移，应看 [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core)；相关细节见分报告。`claim-gsd` |
| **Matt Pocock Skills：上游兼替代组件** | 可独立选择的工程技能；本地已锁定部分来源并适配 | YSS 可以提供企业规则与验收组合；不宜把上游通用能力都计为原创差异 | 技能集合不自动等于完整运行时或交付平台。[项目](https://github.com/mattpocock/skills)；`claim-matt` |
| **cc-sdd：直接相邻** | v3 的 Agent Skills、边界/依赖标注、按任务独立审查、长任务再执行；保留 Kiro 规格可移植性 | “明确边界＋可恢复实现”已有供给；外部规格互操作值得关注 | 官方区分稳定与 beta Agent 适配，不能按安装器选项数称同等成熟。[项目](https://github.com/gotalab/cc-sdd)、[方法](https://github.com/gotalab/cc-sdd/blob/main/docs/guides/spec-driven.md)；`claim-ccsdd` |
| **Spec Kitty：直接相邻，有限深挖** | 工作包、执行通道/看板、治理 profile；原仓地址现跳转到 `spec-kitty/spec-kitty` | 状态看板与治理入口也在竞争范围内 | 本轮核查入口和治理文档，未做完整迁移/运行核验。[项目](https://github.com/spec-kitty/spec-kitty)、[治理调用](https://github.com/Priivacy-ai/spec-kitty/blob/main/docs/architecture/governed-profile-invocation.md)；`claim-speckitty` |
| **GitHub Agentic Workflows：自动化执行与治理相邻** | Markdown 编译成 Actions；默认只读 Agent job、safe outputs；SpecOps/MultiRepoOps | 可作为 YSS 执行证据的接入对象，也会覆盖部分跨仓自动化需求 | 依赖 GitHub/运行时配置；工具受控写不等于业务审批。[项目](https://github.com/github/gh-aw)、[SpecOps](https://github.github.com/gh-aw/patterns/spec-ops/)；`claim-ghaw` |
| **OpenHands：执行平台及控制中心相邻** | 当前主仓 Agent Canvas；多 Agent/后端；SDK 有会话持久化、指标和可观测接口 | 可作为执行层；“治理控制平面”已有商业竞争者 | 企业版 RBAC/预算等不能全算进免费 OSS；旧应用文档有版本漂移。[主仓](https://github.com/OpenHands/OpenHands)、[持久化](https://docs.openhands.dev/sdk/guides/convo-persistence)、[企业产品](https://www.openhands.dev/enterprise)；`claim-openhands` |
| **Aider：终端执行替代/适配目标** | 终端结对编程、Git 集成、ask/code 等控制 | 适合窄任务；适配时要明确提交和工作区所有权 | 默认自动提交/dirty commit 可配置；不能直接带入 YSS 的提交授权语义。[文档](https://aider.chat/docs/)、[Git 集成](https://aider.chat/docs/git.html)；`claim-aider` |
| **skills-lock / SkilLock：专项参照** | 前者锁 commit/内容并支持 frozen 安装；后者展示技能命令/网络/路径能力变化 | 哈希保护已非独占；可研究“改了什么行为、影响哪些实例” | GitHub 样本关注量很低，仅作设计线索，未验证检测精度。[skills-lock](https://github.com/luisalima/skills-lock)、[SkilLock](https://github.com/skills-lock/skil-lock)；`claim-supply-chain` |

正式 Release 抽样：Spec Kit v1.0.6（9 月 10 日）、OpenSpec v1.13.0（9 月 9 日）、BMAD v6.12.0（9 月 4 日）。这些是发布记录，不证明主分支所有新能力均已进入该发行包。逐项来源与局限见 [直接竞品分报告](agents/spec-frameworks.md)。不把某个“最新版本号”当作跨项目可比较的成熟度。`claim-release-boundary`

### 3. 能力差异：从“有没有”转向“能保证到哪里”

| 对比问题 | 市场已有供给 | 对 YSS 的判断 |
|---|---|---|
| 从想法到可实现任务 | Spec Kit、BMAD、AI-DLC 等均有 | 必须具备；继续增加阶段未必增加价值 |
| 小改动减少仪式 | BMAD 低风险直改、Superpowers 裁剪、AI-DLC Express、cc-sdd 直改路线 | 是采用体验必须补齐的部分；保留命中门禁是约束，不是让每次任务变长的理由 |
| 暂停后继续 | Spec Kit 状态恢复、GSD 状态投影、OpenHands 持久化 | 新机会应指向输入已变化时的安全恢复和原因解释 |
| 跨仓规划 | OpenSpec Stores、gh-aw SpecOps/MultiRepoOps | 共享规划已经存在；任务归属、版本绑定及联合验收仍可细分比较 |
| 人工批准与代码审查 | BMAD 会签、Spec Kit gate、cc-sdd/Superpowers 审查、AI-DLC checks | 必须检验批准是否绑定当前资产，以及旁路操作的边界，不能仅看文档写了 approve |
| 项目定制与升级 | Spec Kit overlays/bundles、BMAD 配置分层、AI-DLC owned baseline | YSS 要证明来源、项目适配与升级冲突能被准确解释和恢复 |
| 成本/运行观测 | OpenHands SDK metrics/OTel、gh-aw logs/OTel | 优先接收运行时已有数据，再把它关联到业务切片和返工原因 |
| Java/Vue/OpenAPI 与设计交接 | 本地有专用规则及合同；竞品也允许扩展 | 优势候选在经实际交付验证的组合，而不是锁定某个技术栈名称 |

以上综合支持 `claim-competition-baseline`；并不支持“YSS 最完整/最安全/比别人效率高”的结论。

### 4. 用户信号与反例

采用目的性抽样：优先选择与跨仓、审阅成本、恢复和诊断直接相关的原始讨论，并读取反方回复。样本之间可能不独立，不能统计为市场频率。

| 信号 | 公开原始材料 | 能支持什么 | 不能支持什么 |
|---|---|---|---|
| 跨仓消费者职责要反复解释 | [OpenSpec #1436](https://github.com/Fission-AI/OpenSpec/issues/1436)，2026-07-23，访问时 Open | 值得测试结构化仓库归属与接收记录 | 所有团队都有痛点、OpenSpec 完全没有跨仓支持 |
| 有人认为规格审阅增加时间 | [Spec Kit #2046](https://github.com/github/spec-kit/discussions/2046)，2026-04-01；有维护者和其他用户的相反意见 | 必须同时度量人工审阅时间与减少的返工 | Spec Kit 无用、所有用户偏好轻量、当前版本必然更慢 |
| 模型能力和连接诊断不透明 | [Aider #5567](https://github.com/Aider-AI/aider/issues/5567)，2026-08-13，访问时 Open | 诊断应具体到当前配置、缺口和可执行修复 | YSS 必须自建模型网关或普遍存在当前故障 |
| 状态/规格会持续演进 | OpenSpec 归档修复 Release、GSD 迁移和状态处理；详见分报告 | 需要固定版本、记录迁移和区分已修复问题 | 修复记录等于当前仍有同一缺陷 |

这些有限信号与现有竞争功能一起支持小范围试验，证据不足以形成规模、收入或付费意愿结论。`claim-user-signals`

### 5. 机会清单与取舍

优先级是本研究的推荐顺序，不是批准的路线。P0 为已有明确本地问题或强匹配机会，P1 需要试点验证，P2 取决于前序使用数据。以下指标与停止条件都是建议的试验设计。

| 机会 | 使用场景与最小建议 | 为什么现在值得做 | 验证与停止条件 | 主要风险 |
|---|---|---|---|---|
| **O1 / P0：跨仓交付接收闭环** | 选一个真实 Java API＋Vue 页面切片，贯通已批准规格→仓归属→版本化后端包→前端接收→联合验收 | YSS 有交付/摘要代码；OpenSpec 明确任务分派限制 | 注入旧接口、错包、漏场景、旧批准；记录是否准确拒绝及恢复所需人工动作。若现有手工方案已足够且无返工，缩小投入 | 配置工作可能超过收益；格式复杂导致绕过 |
| **O2 / P0：清晰的状态与诊断入口** | 先统一家族/版本/命令支持；基于现有查询和验证器派生“当前状态、阻塞原因、谁处理、下一动作、证据路径” | 本地说明冲突已确认；AI-DLC doctor 和 Spec Kit status 是直接参照 | 新操作者完成选型、首次切片、失败恢复；观察求助次数、阅读时间、错误操作。若只是包一层重复状态文件，不做 | 新看板形成第二事实源；自动修复误改项目资产 |
| **O3 / P1：外部规格接入** | 先只读解析一个固定版本的 OpenSpec change，形成来源映射和待确认缺口；已有批准不自动继承 | OpenSpec Stores 与 cc-sdd 可移植性显示合作入口，比要求团队全部迁移更值得验证 | 要求可追溯到原需求/场景；歧义显式呈现；试用团队确实愿意保留原工具。若没有这类团队，暂缓适配器 | 两套事实源、格式升级、错误继承批准 |
| **O4 / P1：技能升级影响审阅** | 在现有 lock/适配记录上展示上游变化、YSS 适配冲突、受影响 profile 和验证入口；先离线报告 | Spec Kit overlays、BMAD 配置分层和小型技能锁工具表明该问题已有供给 | 用已知真实升级案例比较漏报、误报、人工审阅和回滚耗时；若静态语义判断不稳，保留结构差异与人工裁决 | 把模型总结当确定性安全证明；重复造包管理器 |
| **O5 / P1：可复跑的价值证据** | 在同模型/同预算条件下，对比现有 YSS、最佳相邻工作流和最少流程基线，使用独立任务与隐藏验收 | 目前只能证明功能存在，无法证明 YSS 减少返工 | 记录验收通过率、人工分钟、错误接收、恢复成功、token/费用、总耗时；缺乏改善时调整范围而非扩阶段 | 任务偏置、示例过拟合、把单次运行当因果效果 |
| **O6 / P2：运行证据接入现有平台** | 接收 gh-aw/OpenHands 等导出的执行状态/指标，绑定 YSS 切片版本；初期只读 | 执行、成本、OTel 已有成熟接口方向，避免重做平台 | 先用一个真实工作流检查终态、失败、取消、重试能否正确回收；缺使用者则不做连接器 | 平台依赖、API 漂移、授权语义不一致 |

O1–O6 分别绑定 `claim-opportunity-handoff`、`claim-opportunity-frontdoor`、`claim-opportunity-import`、`claim-opportunity-upgrade`、`claim-opportunity-eval`、`claim-opportunity-runtime`。事实依据存在，收益仍是假设；不能直接转为已批准 MVP。

**推荐先后关系：先修清使用说明并完成 O1 的演示/故障场景；同步收集 O5 的基线；再根据使用者卡点选择 O2 的最小交互面。O3/O4 由真实外部接入或升级需求触发。** 这样能区分“治理确有价值但难用”和“治理复杂却没有减少返工”。当前证据还不能支持精确工期。

### 6. 目标人群、采用与商业机会

建议先验证的使用者是：已经有多仓业务交付、前后端职责分离、存在明确验收责任的团队，优先使用 YSS 自身 Java/Vue 工程知识。这个选择依据本地资产匹配与有限跨仓需求信号，是优先访谈/试点人群，不是已证实的市场细分。个人小脚本、一次性探索或已经靠 IDE 内建规划满意完成的任务，优先级较低。`claim-target-segment`

推广材料可以先展示一条可复跑链路：错误版本如何被拒收，正确版本如何被接收，操作员看到了什么、节约了哪些真实人工步骤。仓库首页不宜首先展示几十个门禁/技能名。首次价值应来自完成一个小交接，复杂规则按实际影响展开。已有“设备借用”案例可作为起点，但案例存在不等于独立用户可完成。

许可层面，多数直接框架主仓采用 MIT；AI-DLC 是 MIT-0，Aider 是 Apache-2.0。这只标识主仓许可证，不是依赖/商标的完整法律判断。用户还需承担模型、执行环境、审阅和维护成本，不能把开源免费等同于总成本为零。OpenHands 的本地 OSS、按量模型与企业包装展示了一种商业分层，但不能由其企业功能宣传推出 YSS 用户愿意购买。`claim-cost-license`

候选商业价值：团队接入/升级服务、交付证据与治理实施、内部工程规则包和维护支持。先验证谁承担返工成本、谁有预算、现有工具为何不能满足；没有访谈和实际采用数据前，不给 TAM、定价或收入预测。若公共工具加少量配置已足够，应提供兼容规则包，而非要求完整替换。

### 7. 不建议优先做的事

本轮建议不优先扩展通用 IDE、沙箱/编码运行时、通用多 Agent 市场，不以新增角色/阶段数量为成功指标，不另造无实际接入需求的通用规格语法。理由是相邻项目已有广泛投入，而 YSS 当前可验证的匹配点在交付合同与专项工程。这个取舍仅针对当前研究建议，不是永久产品禁区。`claim-non-goals`

## Counter-Signals

1. **“别人只有提示词，我们有状态引擎”不成立。** Spec Kit、GSD 与 AI-DLC 均有结构化状态或确定性控制；AI-DLC 也有源码/投影分离。
2. **“别人没有跨仓”不成立。** OpenSpec Stores 已有共享规划，gh-aw 有 SpecOps/MultiRepoOps。机会必须具体到已批准版本的任务归属和联合接收。
3. **“治理越强越有价值”未经证明。** Spec Kit 讨论有审阅成本反对意见；BMAD、Superpowers、AI-DLC 主动裁剪流程。YSS 自己也可能产生同类成本。
4. **“哈希锁、上下文恢复、独立审查是独有能力”不成立。** 各有竞品供给；需要对比故障场景和日常操作成本。
5. **“开源执行平台没有企业治理”不成立。** OpenHands 的企业包装正进入这一位置；不过商业 source-available 能力不能混算免费开源能力。
6. **“功能缺口等于市场机会”不成立。** 有人愿意采用、实际减少返工、收益大于治理成本，仍需试验。`claim-recommendation-limits`

## Source Map

- 详细证据、Search Log、主张/反证映射和审计状态：[证据台账](oss-landscape-evidence.yaml)。
- 直接规格框架：[分报告](agents/spec-frameworks.md)、[原始结构化记录](agents/spec-frameworks.json)。
- 工程工作流：[分报告](agents/agent-workflows.md)、[原始结构化记录](agents/agent-workflows.json)。
- 执行平台：[分报告](agents/platforms.md)、[原始结构化记录](agents/platforms.json)。
- GitHub API 主仓身份/许可/归档/关注量快照：[github-metadata.json](github-metadata.json)。数值只提供规模背景，不参与机会评分。
- 本地已读取资产摘要：[local-source-manifest.json](local-source-manifest.json)；路由投影：[route-context.json](route-context.json)。

Google 浏览器实际检索 `open source spec driven development framework GitHub`，看到 OpenSpec、GitHub 官方文章、GitHub topic 等结果。直接 web 工具打开 Google 失败，浏览器成功；未消费 AI 概览和广告作为证据。公开网页搜索补充中英文问题词、GitHub 定域反证及源文档链。GitHub API 对 Spec Kitty 命中匿名 rate limit，使用直接网页确认仓库迁移，不补造 API 数值。

排除/降级：GSD 旧仓和旧 gsd-2 仅作迁移链；HumanLayer 当前 README 称公开实现大部分 deprecated，不用历史 CodeLayer 功能代表当前维护产品；Kiro/Tessl 等非本轮已核实的完整开源实现不进入主矩阵；通用 Agent 库和未经核验的营销榜单不支撑能力结论。`claim-current-identity`

## Decision Handoff

下游 owner 是 `yss-product-lifecycle` 与模板维护者。当前仅提交研究证据和 O1–O6 的建议，`decision_ref=null`。本轮不写产品 Plan/Spec、原型、OpenAPI、垂直切片，不修改 `CONTEXT.md`、Skill、门禁或 Ticket 状态。

工作单元结果：`route`，`template-source`，模板维护入口分诊 `work-unit.entry-triage`；影响面为 L1 `textual-only`。`context_reconciliation=not-applicable`，原因是模板研究不登记产品业务术语。Ticket/切片/实现合同及 `ready-for-agent` 均不适用；没有建立虚假批准。研究结构校验与适用检查见 [验证记录](verification.md)。Git checkpoint 不提交，因为本轮没有 Git 提交/推送授权。

下一项建议工作是维护者根据本报告选择一个试验问题，形成可审阅的模板维护范围与验收方案；到实际实现时重新判断影响面，不能沿用本轮 L1 研究分级。没有把研究建议自动批准成路线。

研究资产已交付，但正式子任务包的终态闭合保留暂停：当前路由校验器不接受模板研究在 `entry-triage` 就地结束，只列出产品 Plan 后继。本轮记录该限制，不生成不适用的产品 Plan，不修改治理代码。详细失败和后续结构校验结果见验证记录。

## Evidence Limitations

- 这是截至访问日的开源供给与公开问题研究，覆盖代表性候选，不是穷尽全部开源市场。
- 主分支/滚动文档可能比发行包更新；有些项目快速改名、迁移或重构。采用前重新固定 commit、包版本及文档版本。
- 本地源码证明检查逻辑存在，不等于组合行为已实测、不能证明无法旁路。竞品也按同一标准处理。
- 未对竞品安装成本、token、速度、视觉体验、恢复可靠性做公平实测；本文不提供数字评分或性能排名。
- Issue/Discussion 是小样本、非随机、可能受版本和维护者转述影响；不能推断发生率、购买意愿或市场规模。
- Google 搜索结果只用于发现；部分 GitHub API 限流及旧索引与当前页面不一致已记录。`none-found` 从不被当作功能不存在的证明。
- O1–O6 的收益、人群和商业假设均需进一步研究；已审计的是“这些来源支持开展该试验”，不是“试验必定成功”。
