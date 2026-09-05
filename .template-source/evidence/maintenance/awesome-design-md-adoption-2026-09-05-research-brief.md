# awesome-design-md 对 YSS 设计技能的参考价值研究

## Research Scope

- Profile: `technical-evidence`
- Mode: `evidence-audited`
- Decision informed: 是否参考 `VoltAgent/awesome-design-md` 补充 YSS 设计相关技能，以及应吸收什么、拒绝什么、先修什么。
- Audience: YSS 模板维护者、产品设计负责人、原型与设计技能维护者。
- Time horizon: 截至 2026-09-05；上游仓库、Google `design.md` 规范或本仓设计合同变化时重新核验。
- External baseline: `VoltAgent/awesome-design-md@8147538b4226ae41e2487a9179e3bcc1f68e8554`；`google-labs-code/design.md@9bf8eae67128b6cc55ad9bf86665767deb4c11cd`；npm `@google/design.md@0.4.0`。
- Inclusion criteria: 用户指定仓库、其固定 revision 的 README/CONTRIBUTING/LICENSE 与全部 74 个 `design-md/*/DESIGN.md`；Google 官方规范与 CLI；本仓 `DESIGN.md`、设计治理文档、设计技能、原型证据与校验脚本。
- Exclusion criteria: 把外部仓库的 Agent prompt 当执行指令；未经核验的原网站视觉事实；生产 UI 实现改造；直接复制第三方品牌内容。
- Access limitations: 通用 Web 页面通道未返回可用正文，外部事实改用 Git 官方数据、固定 commit clone、npm registry 和实际 CLI 执行核验；没有对“修改前/修改后”的 YSS 原型质量做 A/B 实验。

## Executive Read

**明确结论：可以参考，但只能“选择性吸收方法”，不能把 `awesome-design-md` 当作新规范、模板源或可直接导入的技能包。**

推荐做法是：不新增平行设计技能、不复制 74 份品牌文件、不采用其中的 `Agent Prompt Guide` 作为运行时指令；在现有 `DESIGN.md` → `yss-design-system` → `yss-prototype-stage` 合同中，补入三个经过 YSS 化的可选扩展：`Responsive & Accessibility`、`Iteration Guide`、`Known Gaps & Evidence`。外部仓库只作为非权威示例库，示例进入模板前必须经过来源、许可、Token、对比度、状态与无障碍校验（claim-006）。

不过，**补充外部规范不是第一优先级**。当前本仓已经存在更基础的合同闭环缺口：根 `DESIGN.md` 与 Google 官方 alpha 规范的章节标题层级不一致；中文治理文档声明“不重定义 Token”但实际重复并出现值差异；原型证据与 Antdv Next fact pack 没有直接记录根 `DESIGN.md` digest；H1 adapter 使用不存在的 CSS variable 别名并硬编码间距/高度。先修这些 P0，再加扩展章节，才能避免把新规则叠到一个存在双写和未消费 SSOT 的链路上（claim-004、claim-005）。

`awesome-design-md` 更接近“设计语言逆向分析样本集合”，不是稳定标准：其 74 份文件有 5 种章节顺序、10 份无 frontmatter，README 声称每个案例附带 preview 文件但仓库实际没有；官方 `@google/design.md@0.4.0` 批量 lint 时 74/74 都至少出现一条 warning，共发现 178 条对比度告警、684 条 orphaned-token 告警，并有 13 份解析告警。反过来，现代案例的 YAML Token + 人类可读设计理由、响应式、迭代和已知缺口章节确有启发，因此结论不是拒绝，而是“参考其信息架构，不继承其内容质量”（claim-001、claim-002、claim-003）。

若维护者确认进入实现，这会同时影响 canonical `DESIGN.md` 合同、核心 validator、原型证据和设计技能消费语义，按模板维护规则应作为 **L3** 处理；本研究不批准实现、不修改技能（claim-007）。

## Findings

### 1. 它是案例语料库，不是可直接采用的规范

`awesome-design-md` README 将项目定位为从开发者网站提炼的 DESIGN.md 集合，并给出“复制到项目根目录后让 Agent 使用”的快捷用法。仓库确实提供了大量有代表性的品牌/产品设计描述，现代文件通常包含 YAML frontmatter、Token、组件映射、响应式行为、迭代指导和已知缺口。

但全量扫描显示其格式并不稳定（claim-001，high）：

| 项目 | 结果 |
| --- | --- |
| `design-md/*/DESIGN.md` | 74 份 |
| 带 YAML frontmatter | 64/74 |
| 章节顺序 | 5 种 |
| 平均规模 | 547 行、约 3,674 词、约 29 KB |
| README 声明的 preview 文件 | 实际为 0 |
| 包含完整 `http(s)` 来源 URL | 2/74 |
| 含来源采集日期、revision、采集方法与独立验证闭环 | 未形成统一合同 |

README 徽章仍显示 73 个案例，而固定 revision 实际已有 74 个目录；README/CONTRIBUTING 还把 `preview.html` 与 `preview-dark.html` 描述为标准交付物，但仓库没有这些文件。这说明它适合探索模式、风格表达和结构范例，不适合直接成为 YSS 的 normative source。

### 2. 其现代信息架构值得借鉴，但并非都属于上游正式格式

Google 官方 `design.md` alpha 规范把文件分成两层：可选 YAML frontmatter 承载规范 Token，Markdown 正文解释使用理由。Canonical 正文章节为 `## Overview`、`## Colors`、`## Typography`、`## Layout`、`## Elevation & Depth`、`## Shapes`、`## Components`、`## Do's and Don'ts`；未知章节应保留而不是报错。

`awesome-design-md` 的现代案例在此基础上常追加：

- `Responsive Behavior`：布局在窄屏、导航折叠和内容优先级上的变化；
- `Iteration Guide`：哪些调整可局部演进，哪些变化会破坏设计身份；
- `Known Gaps`：未覆盖、未验证或依赖后续研究的内容；
- `Agent Prompt Guide`：给 Agent 的实现提示。

前三者对 YSS 有价值（claim-002，medium），因为它们可分别连接现有响应式/无障碍验证、Token 演进和 evidence limitation；但应使用 YSS 语义重写，而不是照抄。`Agent Prompt Guide` 不建议纳入规范：本仓已经由 skill、AGENTS 与生命周期合同控制 Agent 行为，把 prompt 再写进设计资产会形成第二套运行指令和漂移面。

### 3. 质量不足以支持“整库导入”

使用官方 `@google/design.md@0.4.0` 对固定 revision 的 74 份文件逐一 lint，74/74 均有 warning；汇总包括 178 条 contrast-ratio、684 条 orphaned-token、466 条 broken/unknown component property 类告警、16 条未知 typography property 告警和 13 份解析告警（claim-003，high）。

正文对状态/无障碍的覆盖也不均衡：61/74 提及 focus，8/74 提及 keyboard，0/74 提及 ARIA，0/74 提及 reduced motion，8/74 提及 loading，1/74 提及 empty state。它们能提供设计描述灵感，但不能替代 YSS 的状态矩阵、Design QA、键盘/focus/contrast/zoom/reduced-motion 和浏览器证据。

有利反信号是：官方 CLI 对这些文件没有返回 error，且 Google 规范本身允许 optional frontmatter 和未知章节。这说明外部案例并非“无效”，而是必须区分“可解析”与“达到 YSS 完成标准”。

### 4. 当前 YSS 的首要问题是 SSOT 消费闭环，而不是章节数量

内部独立盘点与主线程复核确认以下问题（claim-004，high）：

1. `DESIGN.md` 已被声明为机器可读视觉 Token SSOT，但 `yss-design-system` 仍把 `docs/design/design.md` 称作“团队可读的唯一规范来源”，其更新流程没有把根 `DESIGN.md` 明确列为先行输入。
2. `docs/design/design.md` 声明“不重新定义规范 token 的具体值”，正文却重复具体数值；例如根文件的 `primary-control=#245bdb`、`primary-control-hover=#2f68eb` 与治理文档的 `colorPrimary=#3371ff`、hover `#4096ff` 并列，标题字号和间距集合也不完全一致。不同字段可能表达不同角色，但当前文本与校验没有把这种角色差异写成可机读合同。
3. `prototype-evidence.yaml` 记录 `docs/design/design.md` 和 token digest，没有根 `DESIGN.md` digest；Antdv Next fact pack 的 `project_baseline` 也只要求治理文档和 Token 文件。根 SSOT 变化时，下游 freshness 不能直接判定。
4. H1 adapter 引用 `--brand-primary`、`--container-background`、`--layout-background`，而投影 CSS 使用 `--brand-color-primary`、`--brand-color-bg-container`、`--brand-color-bg-layout` 等名字；adapter 又硬编码 `32px` 控件高度、`20px/24px` 间距，容易绕过 compact 28px 和 Token 基线。
5. 本地 `design-md.mjs` 只识别 `^# ...$` 并强制八个 H1 章节；Google 官方规范要求 canonical 正文章节使用 H2，H1 只可作为可选标题。结果是本仓根文件能通过本地校验，但符合上游现代结构的 `linear.app/DESIGN.md` 会被本地层拒绝。

当前根文件的 `lint` 和 `drift` 都通过，这是重要正信号：SSOT、投影 manifest 和上游 CLI 已经有一个可用骨架。问题是校验覆盖不足，不是需要推倒重来。

### 5. 推荐先完成 P0 对齐，再做 P1 选择性补充

**P0：先修现有合同（claim-005，high）**

- 明确兼容策略：把根 `DESIGN.md` 正文迁移到 Google canonical H2，或在本地 validator 中显式声明并测试 YSS H1 方言；推荐前者，减少与官方工具的长期分叉。
- 固化读取优先级：`DESIGN.md` Token/组件变体 → `docs/design/design.md` 治理解释 → `docs/design/tokens/*` 派生快照 → provider facts。治理文档不得重复定义无法自动核对的 Token 值。
- 在 prototype evidence、provider fact pack 和 freshness validator 中直接记录 `DESIGN.md` path + digest。
- 修复 H1 adapter 的 CSS variable 映射，所有高度、间距、圆角、表面和品牌色从投影 Token 消费；新增能捕获错误别名与硬编码回退的 fixture。
- 扩大 `design-md` 校验：章节兼容、治理双写、证据 digest、adapter Token 引用与投影 drift 一起进入 fresh verification。

**P1：吸收外部仓库中真正有用的扩展（claim-006，medium）**

| 外部做法 | YSS 处理 | 理由 |
| --- | --- | --- |
| YAML Token + 正文 rationale | 保留现有做法，不重复新增 | 已由 Google 格式和根 `DESIGN.md` 覆盖 |
| `Responsive Behavior` | 吸收为可选 `Responsive & Accessibility` | 与 narrow viewport、keyboard、focus、contrast、zoom、reduced motion 证据对齐 |
| `Iteration Guide` | 吸收为短小的变更边界 | 说明哪些 Token/组件变体可演进、哪些需要重跑投影与 Design QA |
| `Known Gaps` | 吸收为 `Known Gaps & Evidence` | 每项附责任人、验证计划、目标阶段或明确 limitation |
| 组件级 Do/Don't | 只补缺口，不复制品牌案例 | 现有设计系统已有大量规则，应避免双写 |
| `Agent Prompt Guide` | 拒绝进入 normative 设计资产 | Agent 行为由 skills/AGENTS/生命周期合同控制 |
| 74 个品牌文件 | 只作非权威示例索引，不 vendoring | 内容大、质量不均、来源与更新不可复验 |
| preview 文件约定 | 不采用其 README 声明 | 上游实际未提交 preview；YSS 已有自己的 preview 与证据链 |

这些扩展应作为官方允许的 unknown sections，放在 canonical 八章节之后；不修改 Google Token schema，不创造第二个 `DESIGN-YSS.md`，也不新增一个只负责外部案例的 skill。

### 6. 结论对应的实施边界

若后续获准实施，建议只修改既有链路：`DESIGN.md`、`yss-design-system`、`yss-prototype-stage`、`prototype evidence/fact-pack`、`design-md validator/tests`，并同步 canonical skill 投影与 lock。该组合触发 `generation-semantics` / `core-validator`，应按 L3 维护并执行 fresh verification（claim-007，high）。

本轮仅完成研究与决策准备，不更改上述资产。由于工作树已有大量用户未提交的设计/技能改动，实施时还必须先冻结明确的文件范围，避免覆盖正在进行的工作。

## Counter-Signals

- `awesome-design-md` 的现代文件结构相当一致，42/74 采用含 `Responsive Behavior`、`Iteration Guide`、`Known Gaps` 的完整现代顺序；它足以支撑“选择性参考”，所以不应简单否定。
- Google 规范允许 optional frontmatter 和未知章节，意味着 YSS 可以增加扩展而无需另造格式；但扩展必须保持 canonical Token 与章节语义。
- 官方 lint 对 74 份文件均未报 error，说明它们多数仍可被工具消费；warning 数量则说明“可消费”不能等同于“可作为 YSS 标准”。
- 本仓 `DESIGN.md` 当前 lint/drift 通过，证明现有投影链并非不可用；因此推荐是增量修复而非重建。
- 外部仓库采用 MIT License，许可层面允许使用与修改；但若复制实质内容仍需保留许可声明，而且许可不能解决原网站视觉资产的来源、时效与真实性问题。

## Source Map

- [awesome-design-md 固定 revision README](https://github.com/VoltAgent/awesome-design-md/blob/8147538b4226ae41e2487a9179e3bcc1f68e8554/README.md)：项目定位、章节建议、复制使用方式和 preview 声明。
- [awesome-design-md 固定 revision tree](https://github.com/VoltAgent/awesome-design-md/tree/8147538b4226ae41e2487a9179e3bcc1f68e8554/design-md)：74 份案例的结构、内容和覆盖统计。
- [awesome-design-md MIT License](https://github.com/VoltAgent/awesome-design-md/blob/8147538b4226ae41e2487a9179e3bcc1f68e8554/LICENSE)：许可边界。
- [Google design.md 规范](https://github.com/google-labs-code/design.md/blob/9bf8eae67128b6cc55ad9bf86665767deb4c11cd/docs/spec.md)：frontmatter/正文职责、canonical H2 章节、未知章节与校验语义。
- [Google design.md CLI 规则](https://github.com/google-labs-code/design.md/blob/9bf8eae67128b6cc55ad9bf86665767deb4c11cd/packages/cli/src/linter/spec-config.yaml)：章节顺序、Token/组件/对比度等 lint 规则。
- 内部一手来源：根 `DESIGN.md`、`docs/design/design.md`、`.agents/skills/yss-design-system/SKILL.md`、`.agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs`、`.agents/skills/yss-antdv-next-design/references/fact-pack.md`、`docs/design/templates/prototype-evidence-template.yaml`、`.template-source/tooling/node/scripts/design-md.mjs`。
- 内部独立盘点：`.template-source/evidence/maintenance/awesome-design-md-internal-gap-analysis-2026-09-05.md`；只作为交叉复核，不替代上述一手源码。

## Decision Handoff

研究建议默认选择：**批准“P0 内部合同修复 + P1 三项选择性扩展”，拒绝整库导入、新增平行 skill 和 Agent Prompt Guide。**

进入实现前仍需维护者确认一个 frontier：本轮只做 P0，还是把 P0 与 P1 一次性纳入同一 L3 维护批次。推荐先做 P0，fresh verification 通过后再做 P1；这能把“修复现有漂移”与“引入新语义”的回归原因分开。

下游 owner: `maintaining-skills` + `yss-design-system` + `yss-prototype-stage`。本研究不批准 Slice 合同、不设置状态、不声明模板可发布。

## Evidence Limitations

- 外部结论绑定两个固定 commit 与 `@google/design.md@0.4.0`；上游 active development，后续升级必须重跑 corpus lint。
- 没有访问 74 个原始品牌网站逐项核对视觉准确性，因此不评价各文件是否忠实还原其目标网站。
- 没有运行修改后的 YSS 原型 A/B；三个扩展能否提高生成质量属于 medium-confidence 架构建议，需要 fixture 验证。
- 对正文关键词的计数只能说明文本出现，不证明实现质量或验收通过。
- 工作树已有用户未提交改动，本研究按当前 working tree 复核内部事实；后续实施前必须重新检查 diff 与冲突。
