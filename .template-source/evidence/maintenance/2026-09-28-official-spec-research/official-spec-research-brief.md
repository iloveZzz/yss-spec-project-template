# YSS 研发生命周期与三家官方研发规格机制深度研究

## Research Scope

- 日期：2026-09-28。Profile：`technical-evidence`；Mode：`evidence-audited`。
- 研究问题：当前 YSS 生命周期已解决什么；Anthropic、OpenAI、Google 提供了哪些真正的第一方研发规格与执行机制；哪些适合引入，如何避免事实来源、状态和授权冲突。
- 读者与下游：模板维护者、生命周期与实现合同所有者。时间范围是截至访问日可读的公开材料与当前工作树；不是未来产品路线预测。
- 本仓基线：`template-source`，HEAD `79c405998388ee1b13e166377cdfc3bfaa9f0c14`。逐文件摘要和结构数量见 [本轮源快照](local-source-snapshot.json)。工作区已有其他维护任务，研究未改动它们。
- 纳入：本仓权威合同与实际校验、三家官方文档/博客/官方组织源码；关键仓库内容尽可能固定 commit。排除：无来源转载、社区提示词作为官方标准、单一演示作为生产效果、模型自述作为事实。
- 本次“调用分析”采用三个并行研究 Agent 分查官方来源，再由主控核验。没有分别向 Claude、OpenAI API、Gemini 付费发送同一任务，不构成跨模型能力评测。
- 研究预声明见 [范围](research-scope.md)；检索、证据、反信号与逐项审计见 [证据台账](official-spec-evidence.yaml)。本次不修改生命周期、Spec 模板、Skill、状态或批准。

## Executive Read

**可以引入，但推荐引入可验证的执行机制，并由现有 YSS 合同承载。当前证据不支持整套替换生命周期，也不支持直接安装外部编排器后让它与 YSS 同时管理状态。** `claim-adoption-boundary`

YSS 已覆盖业务目标、工程契约、切片、验证与交付的主要治理环节。外部方案最有参考价值的地方，是把当前任务、可观察验收、执行证据和恢复入口集中呈现；这些大部分已有 YSS 对应基础。优先做基于现有视图的窄试点，并测量是否减少找材料、无效读取和恢复成本。新增门禁、再造一套 `plan.md` 状态源，以及无条件增加 Agent 数量，都不是本轮推荐。`claim-local-contract`、`claim-local-recovery`、`claim-pilot`

三项容易影响判断的版本事实：OpenAI 的 ExecPlan 配方已标记归档；Google Conductor 在 2026 年 7 月已演进为跨工具插件；Anthropic 的 2026 年长任务实验主动移除了旧方案的 sprint 分段。这说明应锁定来源、借鉴机制，并按实际模型和任务复验，而不能把一篇旧教程固化为永久流程。`claim-openai`、`claim-google`、`claim-anthropic`

## Findings

### 1. 当前生命周期：合同已覆盖主链，改善应从执行体验和效果证据入手

本轮直接解析 [生命周期注册表](/Users/zhudaoming/Projects/yss-spec-project-template/.template-spec/process/lifecycle-registry.yaml:40)，得到 **8 个主阶段、7 个聚合门禁、14 个内部检查、23 个工作单元、29 类产物和 23 类证据**。这是注册对象数量，不是每个功能必须产出的文件数量；23 个工作单元还包含模板维护分支。影响面裁剪与 `not-applicable` 决定实际适用范围。`claim-local-structure`

```mermaid
flowchart LR
  A[入口分诊] --> B[Plan]
  B --> C[Spec / 功能架构]
  C --> D[产品设计：按影响触发]
  D --> E[系统 / 数据架构与工程契约]
  E --> F[Ticket 正式化]
  F --> G[垂直切片实现]
  G --> H[验证 / 发布 / 复盘]
  G -. 新影响或来源漂移 .-> E
```

图仅展示产品主链。模板源本次走研究/维护路径，不在本仓生成具体产品阶段资产。

| 当前机制 | 已读取的事实 | 对引入方案的影响 |
|---|---|---|
| 需求与验收 | Spec 已包含问题、用户故事、FR、NFR、验收、非目标、风险和测试 seam | 不需要再复制另一份 PRD/Spec 模板 |
| 工程依据 | Slice v3 的 `basis` 绑定来源原字节、版本、批准；验收映射工作单元与验证 | 外部清单不能覆盖原验收或凭一个勾选授予执行权 |
| 人与 Agent 阅读 | 已有 `contract view` 的 review/task/full 及 Slice 任务视图 | 可增量改善现有视图，不应再建手工维护的执行合同 |
| 状态与恢复 | Plan/Spec/Design 使用 `checkpoint.stage_tracking`；冻结切片 Ticket 不再回写进度；恢复先读真实结果、复验来源 | 外部 `plan.md` 只能是映射/派生视图；不能成为第二状态源 |
| 审查与用户决定 | 实现者与独立审查者分离，既有用户授权可按当前依据延续 | 不能默认每个小步骤重新问用户，也不能由 Agent 自行批准 |
| 上下文与验证成本 | 合同已有按需加载、同边界不变输入复用、边界重新验证和耗时字段 | 改善重点是测量实际执行是否遵守，不是再写一遍原则 |

以上对应 `claim-local-contract`、`claim-local-recovery`。核心定位见 [Slice v3](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-implementation-contract-compiler/references/slice-implementation-contract.md:7)、[合同阅读](/Users/zhudaoming/Projects/yss-spec-project-template/.template-spec/process/contract-reading.md:3)、[追踪协议](/Users/zhudaoming/Projects/yss-spec-project-template/.template-spec/process/stage-tracking.md:9)、[执行效率合同](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml:126)。

**现状评价是推断，不是性能评分：** 当前最明确的改进方向，是让现有合同更易执行、验收更贴近运行结果，并补齐效果证据。源码与文档足以证明机制存在，不能单独证明它在真实业务中更快、更省或更少出错。`claim-evaluation-boundary`

本轮还复现了一个具体的**研究调度收尾缺口**：注册表将 `work-unit.entry-triage` 登记为模板源工作单元，本次初始任务包也能通过；但 [流转表](/Users/zhudaoming/Projects/yss-spec-project-template/scripts/lib/lifecycle-transition.mjs:30) 只给它配置产品 Plan 后继。以 `template-source` 返回研究结果时，`next_route: null` 和模板 `work-unit.ssot-update` 均得到 `illegal-next-route`。因此研究产物已交付，正式任务闭包仍未成立。此问题限定于本次工作单元映射，不推断整个生命周期失效。`claim-research-terminal-gap`

建议先定义研究-only 的注册归属与合法终止语义，再按身份校验路由；验收覆盖模板研究结束、模板维护继续、产品 Plan 正常流转和非法身份拒绝。未修复前保留技术阻断，不填写未发生的产品流转。[复现记录](verification/research-route-reproduction.json)与[任务包收尾说明](verification/dispatch-closure.md)已保存，未改流程代码。

### 2. 三家提供的是什么：先区分模板、惯例和产品功能

| 来源 | 可核验的官方材料 | 所承担的层次 | 适合 YSS 借鉴的部分 | 不能直接等同 |
|---|---|---|---|---|
| Anthropic / Claude | Claude Code 指导、长任务 harness 工程文章、官方演示仓库 | Agent 执行、上下文交接、质量验证模式 | 可观察标准、默认未通过、实现与独立验证分离、交接时记录已做/未做/下一步 | 全公司统一研发规格标准，或生产就绪的通用治理框架 |
| OpenAI / Codex | AGENTS.md 文档、ExecPlan 配方、长任务与 harness 工程材料、2026-09 技能指导 | 仓库指令、执行计划、运行反馈和提示词裁剪 | 自包含的执行说明、实际命令和验收、进度/发现/决定、按需上下文 | OpenAI Model Spec；后者不是软件项目 Spec 模板 |
| Google | Conductor 官方插件、GEMINI.md、工程实践材料 | 项目上下文、规格/计划/实施/审查工作流 | 轻量 track 导航、存量工程上下文、恢复与差异审查的交互 | 适用于所有企业的统一生命周期；插件默认政策仍需项目适配 |

技术归属与边界对应 `claim-anthropic`、`claim-openai`、`claim-google`。本次没有发现足以证明“三家存在同一层次、可直接替换 YSS 的统一官方研发规格标准”的材料；这只是声明搜索范围内的结论，不是证明此类资产绝不存在。GitHub Spec Kit、OpenSpec 等即使支持三家运行时，也不能因此改称三家官方模板。

### 3. Anthropic：借鉴可观察验收，保留对固定编排成本的反证

[2026-03 官方实验](https://www.anthropic.com/engineering/harness-design-long-running-apps)使用规划、实现与独立评估，并让评估者实际操作应用。后续实验移除 sprint 分段，并指出评估价值随任务难度与模型能力改变。其贡献是验证思路及实验观察，不是要求所有项目增加同样的 Agent 和阶段。`claim-anthropic`

[官方演示仓库](https://github.com/anthropics/cwc-long-running-agents)展示默认未通过、读证据后才能写通过、独立评估和交接机制，但明确说明是活动示例且不维护。读过截图/日志，只能证明读取发生，不能证明证据对应当前版本、覆盖全部验收或结论正确；现有 YSS 摘要、来源和独立审查不能被这种轻量 hook 替代。`claim-proof-semantics`

**建议映射：** 把每条可观察标准落在现有 Spec/AC，验证结果关联到合同验收 ID、执行命令、实际退出码和证据；UI 按既有还原验证覆盖相同状态。优先补负例和恢复场景，不新增一张由实现者自由勾选的“完成清单”。细节见 [Anthropic 专项研究](anthropic/anthropic-research-brief.md)。

### 4. OpenAI：借鉴执行计划的可读结构，避免复制成第二份合同

[ExecPlan 配方](https://developers.openai.com/cookbook/articles/codex_exec_plans)把进度、发现、决定、执行步骤、验收和恢复放在可持续更新的文档中。页面当前标记 archived，不能称为当前强制标准；其中频繁提交和自主更新计划也须服从本仓授权。YSS 可借鉴阅读组织，但冻结需求、工程合同、执行状态仍保留各自权威来源。`claim-openai`

[2026-09-11 官方技能指导](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)建议缩短触发描述、按需展开资料，并重新检查为旧模型设计的繁复指令。该建议支持开展裁剪试验，不支持删除项目必须的验收、批准或外部制度。不同模型可能需要不同辅助说明。`claim-context-calibration`

**建议映射：** 扩展现有 `contract view --profile task` 的呈现：把“本单元目标 → 第一项行动 → 成功/失败怎样观察 → 当前缺口 → 恢复入口”排在前面。显示内容由合同与真实结果派生，不把整套已批准材料全文复制到一个 `PLANS.md`。详细来源及长任务实验限制见 [OpenAI 专项研究](openai/openai-research-brief.md)。

### 5. Google：Conductor 最接近可运行的规格工作流，但直接启用会有政策冲突

[2026-07-16 官方公告](https://developers.googleblog.com/evolving-spec-driven-development-conductor-now-supports-antigravity/)说明 Conductor 从 Gemini CLI 扩展演进为跨工具插件，保留 `spec.md` / `plan.md`，支持自然语言交互与工具间接续。应同时区分 2025 文章中的旧命令和当前固定源码，不能把它描述为仅供 Gemini 使用的旧扩展。`claim-google`

本轮固定源码检查发现：创建 track 有暂存和提交步骤；实现会写计划/track 状态；审查可进入修复；默认 workflow 有自己的覆盖率与确认习惯。它们是上游默认流程政策，不是天然漏洞，却与 YSS 的逐仓 Git 授权、冻结 Ticket、唯一 tracker、独立审查及工程基线发生适配问题。**因此不推荐在 YSS 项目根直接启用整个插件作为第二主控。** `claim-google-conflicts`

**建议映射：** track 的简洁导航值得参考；外部规格若确需导入，先做只读来源识别与字段映射，生成未批准候选。当前收益更明确的起点是本仓已有资产的派生阅读，不是维护双份 Markdown。固定版本、命令与行号见 [Google 专项研究](google/google-research-brief.md)。

更接近传统研发设计模板的公开材料是《Software Engineering at Google》的 [Design Docs](https://abseil.io/resources/swe-book/html/ch10.html)：重大项目通常使用团队认可的模板，说明目标、策略、备选方案与取舍，并由相关专家审阅。它提供内容质量依据，但没有公开一份可直接替代 YSS 的统一模板；[文档指南](https://google.github.io/styleguide/docguide/best_practices.html)也强调减少重复。可用它检查现有 Technical Design/ADR 的取舍是否充分，而非新增同义产物。`claim-google-design-doc`

### 6. 引入时如何对应现有模板

下表是候选设计映射，不是本轮已修改的规范。每行优先复用已有字段或视图；“建议增量”仍需后续维护授权与验证。`claim-field-mapping`

| 外部常见内容 | YSS 权威承接点 | 建议增量与边界 |
|---|---|---|
| 项目目标、用户、非目标 | Plan、Spec | 只引用当前已确认输入；不得让导入器补造需求 |
| 功能列表、成功标准 | Spec 的 FR/AC；Slice `acceptance` | 展示验收 ID 到场景和证据的可追踪关系；缺覆盖保留未通过 |
| 技术栈、设计选择 | Technical Design、engineering-baseline、ADR | 不生成第二份可编辑 `tech-stack.md` 权威 |
| 阶段、任务、依赖 | `stage_tracking`、垂直切片、Slice `work_units` | 展示当前可执行单元；外部 checkbox 不能变成 `ready-for-agent` |
| 运行与检查方式 | Slice `verification`、工作单元 verification refs | 显示真实 cwd、命令、预期观察；输出期望必须来自验收，不能推测 |
| 当前进度与失败 | 主 tracker / task package / Execution Result | 读取实际结果；禁止回写冻结 Ticket 的状态或摘要 |
| 发现、取舍与变更 | 现有 ADR、风险、重路由记录 | 非实质发现可留执行结果；实质变化回所有者重编译/批准 |
| 恢复与交接 | checkpoint、原始执行结果、合同当前性 | 明示上次真实结果、下一安全动作及必须重验的边界 |
| CLAUDE.md / AGENTS.md / GEMINI.md | 平台入口适配与 canonical Skill | 仅路由和引用，保存归属/版本；不复制完整生命周期正文 |

### 7. 适合推进的四个试点

以下优先级是研究建议，不表示已批准实施，也没有承诺工期或节省比例。`claim-pilot`

| 顺序 | 试点 | 复用的入口 | 最低验收与停止条件 |
|---|---|---|---|
| P0 | **先跑现有视图的任务恢复基线，再判断是否需要改版** | `contract view`、`slice-contract view`、只读状态/追踪 | 新会话能找到当前版本、下一项已授权动作及必需验证；若现有入口已满足，停止新增视图 |
| P0 | **用真实行为验证现有验收链** | 已有 AC 映射、Execution Result、前端还原与独立审查 | 注入“读到无关证据”“测试成功但行为失败”“旧源码配新结论”，必须拒绝错误完成；先补 fixture，再进行真实切片试点 |
| P1 | **按任务与模型校准上下文加载** | `execution_efficiency`、Context Plan、Skill 路由 | 对比完整读取量、错误路由、验收质量；读取减少但漏掉约束即回退；不通过删除 mandatory 条件降成本 |
| P2 | **有实际跨工具需求时做只读适配** | 来源选择、合同准备器、平台投影 | 导入保留来源和版本、冲突列缺口、默认未批准；零越界写入、零隐式 Git、不能双写状态；没有实际消费者时不做连接器 |

实施影响面预判：纯说明/证据为 L1；局部呈现若改变 Agent 行为至少按策略重新判断 L2；批准、生成、状态或跨仓合同语义可能触发 L3。若改 Skill，应由 `maintaining-skills` 按权威目录更新，再同步投影、锁与适用分发；本次研究未触发这些修改。

### 8. 怎样证明引入有效

本仓已有真实 Agent 评测工具及历史对照，不能写成“完全缺少评测”。2026-09-26 历史主批次记录两侧各 24 个场景记录、各 22 个语义通过，UI 场景有超时。该批次明确是合成批准、受控提示、两次重复；E07/E08/E11 不涵盖完整 API/UI/跨仓实际交付。**这些历史结果既不能证明当前全部机制有效，也不能证明引入外部模板会变快。** 本轮重新读取了记录，没有重跑那批模型实验。`claim-evaluation-boundary`

建议复用现有 runner，而非另造评测框架。先比较“当前 YSS”与“只改一个机制的 YSS”，保持模型、运行时、场景、数据与验收一致；如还需比较供应商工具，另设实验，不能把工具差异和模型差异混成一个结果。按以下顺序推进：

1. 冻结低风险文本修订、普通 API 切片、UI 状态恢复、跨仓来源漂移四类代表任务。先补当前缺失的实际行为验收与隐藏反例；保留失败和未执行项。
2. 执行多次重复，先基线后候选，记录预算、版本与原始轨迹。现场业务批准不得用合成回复冒充。
3. 核对验收通过率、错误放行、越界写、重复外部动作、人工分钟、总耗时、输入/输出 token、恢复后重复工作量。金额没有账单/可核验费率时保持未知。
4. 将工具耗时、Agent 执行与人工等待分别记录。试点没有证明改善时，保留原机制；不要用新增文档数量或 Agent 数量作为成功指标。

安全条件建议为错误放行与越界行为不得增加；效率指标先建立分布，再由维护者确定具有业务意义的阈值。本研究不编造“降低 30% token”之类目标。`claim-pilot`、`claim-context-calibration`

## Counter-Signals

1. **已有重叠能力：** YSS 已有执行视图、验收映射、恢复、按需加载与成本字段。外部做法可能只是更容易阅读，不一定需要新实现。
2. **固定编排会过时：** Anthropic 实验主动简化 sprint 结构；OpenAI 最新技能文章反对过量指令。治理所需的边界仍必须保留，模型能力改善本身不构成取消批准依据。
3. **轻量证明并不充分：** 读取证据、任务勾选、计划全部完成，均不能自动推出行为正确或批准有效。
4. **上游默认政策有冲突：** 自动提交、审查者直接修复、修改冻结需求中的状态，与本仓所有权和授权模型不一致。
5. **官方案例不能直接推算收益：** 供应商演示、特定基准或我仓小样本结果不构成当前 Java/Vue、跨仓交付的因果效果证明。

每项反信号均在证据台账中关联到对应 claim；没有把“没搜到”当作绝对不存在。

## Source Map

| 证据层 | 用途与定位 |
|---|---|
| 当前本仓权威输入 | [源快照](local-source-snapshot.json)，以及上述各本地文件定位 |
| Anthropic 第一方材料与固定源码 | [专项简报](anthropic/anthropic-research-brief.md)、[证据](anthropic/anthropic-evidence.yaml) |
| OpenAI 第一方材料 | [专项简报](openai/openai-research-brief.md)、[证据](openai/openai-evidence.yaml) |
| Google 第一方材料与固定源码 | [专项简报](google/google-research-brief.md)、[证据](google/google-evidence.yaml) |
| 本仓历史评测 | 原结果与覆盖边界；只作为历史观测，本轮未重复模型调用 |
| 主控事实复核 | [复核记录](verification/owner-source-audit.json)、本轮本地只读检查与最终验证记录 |

研究代理负责相互独立的资料范围，主控重新核验采纳结论依赖的关键材料。并行研究不是独立代码审查，也不是三家模型互评。检索结果摘要仅作线索；正文结论回到可定位的官方页面、固定源码与本仓原文件。

## Decision Handoff

推荐后续从 **现有 task 视图与恢复基线试点** 开始，随后根据失败证据改善验收链和上下文加载。外部插件整套引入排在后面，须有实际消费者及适配需求。`claim-adoption-boundary`、`claim-pilot`

下游所有者为模板维护者、`yss-product-lifecycle` 与 `yss-implementation-contract-compiler` 的相应维护工作单元。研究只交付证据、候选映射和验收方案；`decision_ref: null`，不批准架构、生命周期修改、产品范围、Git 或发布。

兼容原则：先改模板试点；既有合同、批准与历史记录保持原字节读取；需要迁移时显式生成新候选与差异，不继承旧批准。派生视图若回退可直接停止生成，既有权威资产不受影响。不得让外部插件通过改名或复制目录绕过此边界。

本轮交付检查：四份研究包均通过 bundled validator；总报告含 15 条承重声明，三家专项分别含 7、8、8 条。当前注册表、Context 合同和按需路由查询退出码为 0；本地链接可读、所用源文件摘要无漂移。限定本次研究路径执行的 `scripts/verify-template-fast` 也通过，耗时约 253 秒。完整命令、时间、退出码见 [验证记录](verification/fresh-results.json) 与 [快速检查](verification/template-fast-result.json)。这些通过结论不覆盖整个已有脏工作区，也不把研究调度的技术阻断改成完成。

## Evidence Limitations

- 可访问的公开资料不是三家公司内部全部研发制度；本文比较的是公开机制，不能推断全公司内部实践。
- 官方博客有实验性与宣传性，当前 docs 可能继续变化；固定 SHA 的源码可复查，网页需要按日期复验。
- 没有安装或实际运行三套外部工作流，也没有测量它们在同一 Java/Vue 项目上的行为、速度、费用或迁移成功率。
- 本轮本地验证限于研究包、结构/上下文查询和适用模板快速检查；不是全部生命周期的端到端验收或发布证明。
- 三个研究子任务的产物已通过研究包验证；机器调度包因上述研究终止语义缺口保留 `paused / blocked`。规范化后的阻断包可通过结构校验，不代表 `resolved` 通过。
- 候选映射技术上具有承接依据，但节省工时、token 与返工的收益仍需试点。台账中相应建议标记 `partially-supported / qualify`，不能被消费成已证明收益。
- 未批准或执行任何生命周期改造、Git 提交、推送、插件安装、生产副作用或发布；研究文件是本次唯一交付范围。
