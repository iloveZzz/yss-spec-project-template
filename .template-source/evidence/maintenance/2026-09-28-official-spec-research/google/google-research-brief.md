# Google 研发规格与执行工作流研究

## Research Scope

本研究回答：Google 公开的规格、计划、上下文和审查机制中，哪些可供 YSS 模板维护吸收，哪些必须保留边界。采用 `technical-evidence / evidence-audited`，研究日期 2026-09-28；面向模板维护者与生命周期 owner。只纳入第一方文档、官方博客及其明确链接的源码，社区教程和第三方兼容列表只作线索。本研究未调用 Gemini 模型、未安装 Conductor，也未修改生命周期权威资产。

代码依据固定为 Conductor `6e8f9a860bcdd6a2c423473c12e745200688c633`（committer date：2026-09-01T22:58:24Z；`VERSION=0.3.0`）。当前网站文档与 2020 年工程实践书籍分别记录时点，不把旧建议包装成现行产品保证。证据台账是相邻的 [google-evidence.yaml](google-evidence.yaml)。

## Executive Read

可以引入其机制，建议采用有边界的适配：借鉴 Conductor 的轻量规格/执行计划分离、任务导航与恢复信息，借鉴 Antigravity 的可评论产物和执行后证据摘要；继续由本仓生命周期、Slice 合同和 Fresh Verification 持有批准与完成语义。

没有证据支持“Google 存在一份可以完整替换 YSS 的统一研发规格模板”。Conductor 是 Google 正式发布的方案，但已从 Gemini CLI extension 演进为跨运行时 plugin；Google 的公开 design doc 实践也明确存在团队模板。直接照装会引入另一套 `plan.md` 事实源、状态、自动提交与可选审查规则，适配成本不能忽略。

## Findings

### 1. 归属可确认，产品边界必须更新

`claim-google-01`：Google 于 2025-12-17 以 Gemini CLI preview extension 发布 Conductor；2026-07-16 又明确宣布演进为支持 Antigravity CLI、Claude 等运行时的插件。当前 README 的安装路径、命令名与旧文章已经不同。可称其为 Google 第一方公开研发工作流，不能称其为 Google 全公司统一研发标准。[首次发布](https://developers.googleblog.com/conductor-introducing-context-driven-development-for-gemini-cli/)、[2026 演进公告](https://developers.googleblog.com/evolving-spec-driven-development-conductor-now-supports-antigravity/)。

### 2. 规格与执行计划的轻量拆分值得借鉴

`claim-google-02`：`conductor-new-track` 先核验项目上下文，再澄清变更、确认 `spec.md`，之后根据 `workflow.md` 生成并确认 `plan.md`。前者覆盖概述、功能要求、适用的非功能要求、验收和非目标；后者组织 phase/task/subtask。track 的 `index.md`、`metadata.json` 与全局 registry 提供导航。这是 Agent 生成协议；这些文件名本身不代表 YSS 的批准合同。[固定源码 L59-110、L153-168](https://github.com/gemini-cli-extensions/conductor/blob/6e8f9a860bcdd6a2c423473c12e745200688c633/skills/conductor-new-track/SKILL.md#L59-L110)。

**适配推断：**可把这种阅读体验做成既有阶段资产或 Slice 合同的派生导航/执行视图，并绑定源 ID、版本和摘要。不要并列创建有独立批准权的 `conductor/spec.md` 和 `plan.md`。

### 3. 恢复依靠任务与实际 Git 历史的关联

`claim-google-03`：默认 workflow 要求先实际运行失败测试，再实现与重测；任务完成关联代码 SHA，阶段完成记录测试命令、人工验证及 checkpoint。revert 先核对真实提交；计划 SHA 消失时需要确认替代，再展示明确的回退计划。它同时提供 destructive hard reset，不能原样视作本仓安全回退规范。[workflow L15-91、L113-217](https://github.com/gemini-cli-extensions/conductor/blob/6e8f9a860bcdd6a2c423473c12e745200688c633/skills/conductor-setup/assets/workflow.md#L15-L91)、[revert L70-123](https://github.com/gemini-cli-extensions/conductor/blob/6e8f9a860bcdd6a2c423473c12e745200688c633/skills/conductor-revert/SKILL.md#L70-L123)。

**适配推断：**可在本仓已有 checkpoint 中呈现最近完成工作、当前范围、验证引用、关联提交和恢复动作。恢复前仍需检验当前资产摘要与工作区；禁止把一个勾选框或短 SHA 当成当前可交付证明。

### 4. 默认 review 不能直接作为独立只读审查

`claim-google-04`：`implement` 先把 track 标为 completed，再询问是否执行正式 review；`review` 会检查意图、规范、安全和测试，但还提供自动修复、忽略警告继续、提交和清理路径。因此它的角色权限与我仓 Reviewer 只读、mandatory 门禁不同。[implement L87-139](https://github.com/gemini-cli-extensions/conductor/blob/6e8f9a860bcdd6a2c423473c12e745200688c633/skills/conductor-implement/SKILL.md#L87-L139)、[review L140-209](https://github.com/gemini-cli-extensions/conductor/blob/6e8f9a860bcdd6a2c423473c12e745200688c633/skills/conductor-review/SKILL.md#L140-L209)。

这不等于 Conductor 没有审查能力，而是其 completed 与 YSS 阶段验收并非相同状态。若采用，审查只能返回发现与证据，修复交回实现者，最终状态仍由主控裁决。

### 5. GEMINI.md 是运行时上下文入口

`claim-google-05`：Gemini CLI 的当前文档描述全局、workspace、按访问发现的 JIT 上下文，支持 `@` imports、自定义 `context.fileName`，并可通过 `/memory show` 查看实际拼接内容。页面更新于 2026-06-18。[官方文档：层级、imports、文件名](https://geminicli.com/docs/cli/gemini-md/)。

**适配推断：**继续通过投影或引用加载既有权威输入；不要维护一份脱离 canonical 的 GEMINI.md 规则副本。验收要核查实际载入上下文，避免全局规则、父目录规则或多文件重复载入影响执行。支持名为 `CONTEXT.md` 的上下文文件，并不意味着它自动获得本仓词汇和批准语义。

### 6. Antigravity 提供协作界面，不自动提供批准证据

`claim-google-06`：Implementation Plan 可以逐处评论后再 Proceed；完成后 walkthrough 总结变更，浏览器任务可附截图和录屏。审查策略可选 Request Review 或 Always Proceed，所以 artifact 存在不能推出发生过人审。[Implementation Plan](https://www.antigravity.google/docs/implementation-plan/)、[Walkthrough](https://www.antigravity.google/docs/walkthrough)、[Artifact Review](https://www.antigravity.google/docs/artifact-review/)。

**适配推断：**适合改善现有可审阅资产和前端验证证据的展示。运行时按钮只能作为交互来源；仍须按本仓规则持久化真实批准、作用范围、引用和当前版本。walkthrough 自述不能替代测试退出码、截图状态与实际 Fresh Verification。

### 7. Design doc 的价值在方案取舍与可追溯目标

`claim-google-07`：2020 年《Software Engineering at Google》介绍多数团队对重大项目使用团队认可的 design doc 模板，覆盖目标、策略、备选方案和取舍，并让安全/隐私等专业角色审阅。公开指南又强调实现后将设计文档作为决策档案，维护当前使用文档，减少重复。[Documentation > Design Docs](https://abseil.io/resources/swe-book/html/ch10.html)、[Documentation Best Practices](https://google.github.io/styleguide/docguide/best_practices.html)。

**适配推断：**检查现有技术设计是否清楚记载“选项—理由—代价—验收”；历史决策与当前生效合同需明确区分。这里支持改进内容质量，不支持新增一套公司级通用大模板。

### 8. 审查关心测试有效性，不只关心是否有测试

`claim-google-08`：Google 工程审查指南要求评估设计、用户行为、边界、并发与测试是否真能发现错误，并明确自己实际审查的范围；个人风格建议须区别于强制规则。其小 CL 文档同时容许不同技术拆分方式，不能解读成 YSS 的垂直切片规则。[审查内容](https://google.github.io/eng-practices/review/reviewer/looking-for.html)、[小 CL](https://github.com/google/eng-practices/blob/master/review/developer/small-cls.md)。

## Counter-Signals

| 观察到的限制 | 对引入方案的影响 |
|---|---|
| new-track 默认暂存整个 conductor/ 并提交 | 必须使用本仓授权与允许写范围；不能把安装插件等同提交授权 |
| 默认 workflow 将 plan.md 作为事实源，并推荐统一 >80% | 不替代本仓 registry、批准合同或项目已采纳的分层测试基线 |
| 每阶段人工确认，且 checkpoint 文本有“使用最后功能提交”与“刚创建 checkpoint commit”的措辞歧义 | 不照抄暂停频次；恢复应依赖结构化状态及明确提交，不靠模型解释矛盾 |
| 完成标记先于可选 review，review 还能写实现 | 必须适配独立审查角色与 mandatory 门禁 |
| Artifact 的 Always Proceed 会跳过暂停 | 审阅 UI 和批准记录要分别核验 |
| 官方博客声称复杂 TerminalBench 子集成功率提升，但未提供完整可复现资料 | 只能记厂商声明，不能承诺 YSS 更快、更便宜或质量更高 |

## Source Map

归属与演进由 Google Developers Blog 核验；实际生成和执行约束以固定 Conductor 源码为准；Gemini CLI 与 Antigravity 文档用于运行时能力边界；Google 工程实践和 SWE Book 用于长期文档/审查原则。Conductor 的仓库树和 VERSION 已检查，未镜像源库或复制模板正文。

排除其他同名 Conductor、社区 Maestro、第三方翻译、Reddit 经验及 Spec Kit 的 Gemini 兼容说明。初次通过书籍章节编号打开的 ch15 实为 Deprecation，未用于 design doc 结论，已修正至 ch10。没有遇到阻断性的官方源访问失败。

## Decision Handoff

交回主控 `yss-research` 与模板生命周期维护者。建议按以下顺序设计小范围试点，以下均为建议，尚未批准或实现：

1. 给既有阶段/切片生成简洁导航和可恢复的执行视图；源 ID、版本、摘要缺失时不能继续。
2. 将“本次做了什么、怎样验证、剩余什么”汇成可评论交付阅读视图，原始证据仍在原位置。
3. 在独立审查中显式检查备选方案取舍、测试能否发现行为破坏与审查实际范围。
4. 选择一个新功能、一个存量缺陷和一个中断恢复场景，观察人审往返次数、恢复所需阅读量、测试失败检出与实际 token 消耗；未完成试点不声称效率收益。

研究不批准引入，不修改 `CONTEXT.md`、registry、Skill、Spec、Slice 合同、Ticket 或任何 approval record。

## Evidence Limitations

结论是对公开文档/源码的事实审计，未做模型或产品实跑；源码指令不保证模型每次正确执行。滚动文档未标日期的项在台账保留 `evidence_date: null`，访问日为 2026-09-28；书籍属于 2020 年经验而非 2026 内部审计。内部模板、运行时成本、收益和适配后可发布状态未验证。全部 8 项决策相关 claim 有直接证据与具体反向限制；结构 validator 通过不构成独立语义审查。
