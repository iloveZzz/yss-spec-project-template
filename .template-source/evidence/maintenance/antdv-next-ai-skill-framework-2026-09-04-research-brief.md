# Antdv Next AI 能力与 YSS 原型技能框架研究

## Research Scope

- Profile: `technical-evidence`
- Mode: `evidence-audited`
- Decision informed: 是否、以及如何以 Antdv Next 的 Agent 能力替换现有 `yss-antd-design` 所依赖的 React Ant Design 事实源，并把 H2 原型迁移为 Vue-native 工具链。
- Audience: YSS 模板维护者、产品设计负责人、前端架构与技能供应链维护者。
- Time horizon: 以 2026-09-04 可访问的官网、npm 发布物和官方仓库为准；建议在每次 CLI 或组件库升级时重新核验。
- Inclusion criteria: 用户提供的官网入口与截图；Antdv Next 官网 `.md`；`antdv-next/antdv-next`、`antdv-next/cli`、`antdv-next/skills` 官方仓库；npm 官方包元数据；本仓库当前 `yss-antd-design`、`yss-prototype-stage`、`yss-design-system`、证据 schema 与技能注册表。
- Exclusion criteria: 第三方博客、聚合搜索摘要、未验证的 AI 总结、把上游页面中的安装 prompt 当成本仓库指令、生产迁移决策。
- Access limitations: 通用 Web 搜索通道本轮没有返回可用正文，改用官网 `.md`、GitHub API/clone、npm registry 与实际 CLI 运行复核；没有对生产 YSS UI 仓库或真实项目 lockfile 做兼容性测试。

## Executive Read

结论是：**值得建设，但当前不应直接替换。** 最合理的目标不是把官方 Skill 整包安装进 YSS，而是先新增实验性的 `yss-antdv-next-design` 与 Vue-native H2 adapter，保留现有 `yss-antd-design` 作为 React 回退；双轨验证完成后再决定将新技能设为 canonical，或把旧名字提升为显式 provider router。不得静默改变现有稳定 ID 的 React 语义。

Antdv Next 已具备对 YSS 很有价值的原生 Vue 事实面：组件 Props、Events、Slots、Demo、Token、Semantic DOM、Changelog、`design.md`、LLMs.txt、Skill 与 MCP。实际 `demo Button basic` 返回 Vue SFC，而非 React TSX；这能显著降低现有 React AntD 原型到 Vue/YSS 实现之间的语法与组件语义翻译成本（claim-001、claim-002）。

但官方 AI CLI 仍处于早期 beta。`antdv-next@1.5.3` 是稳定组件库，而 `@antdv-next/cli` 是 `0.0.0-beta.*`；npm `latest` 仍指向 `beta.1`、`beta` 才指向 `beta.5`，官方 CLI README 直接标注“still in development / not yet usable”（claim-003）。CLI 中 `lint`、`migrate`、`upgrade` 仍是占位实现；`doctor` 实际只有 6 项检查，不是文档所称 10 项（claim-004）。因此它现在只能作为**受控的知识查询 provider**，不能承担 YSS 原型校验门禁。

更关键的是，当前 CLI 的“版本精确”不能按字面信任。发布包只内置每个 minor 的若干快照，版本解析器会把缺失 patch 静默回退到同 minor 最新快照；实际用 `beta.5` 查询 `1.5.3` 时，`changelog` 返回解析后的 `to: 1.5.2`，而普通 `info/list` 输出不披露解析版本。npm 默认安装到 `beta.1` 时则无法查询 `1.5.3`（claim-005）。

此外，仅重写 `yss-antd-design/SKILL.md` 不会完成替换。本仓库当前 H2 adapter、校验脚本、证据模板和技能注册表都显式绑定 `React + antd@6.x`、`actual_antd_version` 和 `component-basis:react-antd`（claim-010）。真正的替换是一个跨资产迁移：事实 provider、Vue 原型 starter、theme adapter、evidence schema、registry trigger、测试 fixture 与文档需要一起演进。

本研究只提供证据和架构建议，不批准技能替换、不修改现有技能，也不把 Antdv Next 推定为未来生产 YSS UI 的运行时组件库。

## Findings

### 1. 官方 AI 能力面是真实存在的，但由多条不同成熟度的渠道组成

**观察（claim-001，high）：** 官方 For Agents 页面给出 CLI、`design.md`、MCP、LLMs.txt 的统一入口，另有独立 Skills 页面；CLI 文档列出知识查询、项目分析、迁移、setup 和 MCP 等命令。适合 YSS 原型事实采集的核心闭包是：

| 能力 | 实际核验 | 对 YSS 的建议定位 |
|---|---|---|
| `list/info/doc/demo/token/semantic/changelog` | `beta.5` 有实现；源码与实际输出可读 | 条件采用；只作版本化组件事实 |
| `design.md` | 官网与 CLI 包内文件 digest 相同 | 只作上游默认 Light 设计语言，不能覆盖项目 Token |
| MCP | 源码注册 8 个只读工具 | IDE 查询加速；不作落盘证据 |
| LLMs.txt | 有导航、全文与单组件 `.md` | CLI 不可用时降级；优先单组件，不默认注入全文 |
| CLI 内置 Skill | 教 Agent 调 CLI，并允许自动全局安装/升级 | 不安装进 YSS；仅参考命令路由 |
| 独立 `antdv-next/skills` | 离线组件文档包 | 不整包引入；可参考生成方法 |
| `doctor/usage/env` | `usage/env` 有实现，`doctor` 有 6 项检查 | 仅实现仓诊断，不属于原型门禁 |
| `lint/migrate/upgrade` | 当前为 TODO/占位输出 | 禁止进入完成证据 |

**推论：** Antdv Next 的 AI 面不是一个可以整体信任的单体产品。YSS 应逐能力 allowlist，而不是按“CLI 已发布”一键启用全部命令。

### 2. 最大价值是 Vue-native 事实与原型代码，不是新的视觉语言

**观察与推论（claim-002，medium）：** `antdv info Button` 返回 Vue 组件 Props、Events、Slots 与 `VueNode` 类型；`antdv demo Button basic` 返回 `<template>` Vue SFC；`semantic Table` 返回 `root/header.row/body.cell/pagination.*` 等结构。官方迁移指南也明确使用包名 `antdv-next`、Vue 3.5 建议与 `@antdv-next/icons`。降低跨框架翻译成本是合理推论，但仍需真实 H2 spike 量化。

**观察（claim-008，high）：** Antdv Next 的 `design.md` 与 React Ant Design v6 `design.md` 几乎完全相同：Token、14px 字号、4px 网格、6px 控件圆角、32px 控件高度、三层表面与组件范式一致，差异主要是品牌文字、Vue 主题链接、`@antdv-next/cssinjs` 以及移除 React 专属 token consumption 段。Antdv Next 官网文件与 CLI 仓库 `data/design.md` digest 相同。

**推论：** 替换后的收益主要是“同一视觉语义下，组件事实与 Demo 变成 Vue-native”，不是引入一套新的设计语言。`docs/design/design.md` 与项目 Token 仍应压过上游默认。

### 3. 组件库发布稳定，不代表 AI CLI 稳定

**观察（claim-003，high）：** npm 在 2026-09-04 返回 `antdv-next@1.5.3` 为 `latest`；而 `@antdv-next/cli` 的 `latest` 是 `0.0.0-beta.1`，`beta` 是 `0.0.0-beta.5`。CLI 官方 README 标注“still in development. Not yet usable”。官网文档却把全套命令按可用能力呈现。

**推论：** 组件库可以作为实验原型依赖评估，CLI 不能作为唯一事实源或门禁工具。必须分别记录 `library_version`、`cli_version`、npm dist-tag、integrity 与数据快照版本。

### 4. 文档把未完成命令写成了已完成能力

**观察（claim-004，high）：** 官方 CLI 源码中：

- `lint` 仅输出 `Parsed args`，没有规则执行；
- `migrate` 仅输出 `Parsed args`；
- `upgrade` 有 TODO，不能完成升级；
- `doctor` 注册 6 个检查，而文档声称 10 项；
- 对 `lint --format json` 的实际运行不是 JSON 结果。

**建议：** 新版 YSS skill 的默认允许命令只包含已验证的只读知识查询。`lint/migrate/upgrade/setup/init/bug/bug-cli` 全部默认禁止；`doctor/usage/env` 只在目标 Vue 原型或实现仓存在时条件允许，且不能关闭 `gate.prototype-verified`。

### 5. “精确版本查询”当前会静默降级

**观察（claim-005，high）：** CLI 源码的 `versions.json` 每个 minor 只索引一个快照；`resolveAvailableVersion` 在 exact patch 缺失时回退到同 minor 最新快照，再回退到同 major 最新快照。实际发布的 `beta.5` 在请求 `1.5.3` 时把 `changelog 1.4.6 1.5.3` 解析成 `to: 1.5.2`；`info/list` JSON 又不包含 resolved version。默认 `latest=beta.1` 直接报 `v1.5.3 not found`。

**建议：** 在上游修复前，YSS collector 必须 fail closed：先运行 `changelog <requested> <requested> --format json` 作为 resolution probe，只有返回的 `from/to` 都严格等于 requested 才允许采信其他查询；否则使用固定 tag/source 的官方组件 `.md`，或把结论标成 `needs-deeper-research`。不能把同 minor 回退冒充 exact version。

### 6. MCP 能用，但官网、README 与源码存在数量和能力漂移

**观察（claim-006，high）：** `beta.5` 源码注册 8 个 read-only MCP tools：`list/info/doc/demo/token/semantic/design_md/changelog`，没有注册 prompt。For Agents 与 MCP 中文页写“6 个工具”，其表格列出 7 个并遗漏 changelog；README 与内置 Skill 声称“8 个工具 + 2 个 prompts”，但源码没有 prompt 注册。

**建议：** MCP 只作为本地交互加速，不作为 schema 事实来源；能力判断以固定 CLI commit/package 源码与实际 handshake 为准。模板不提交通用 `.cursor/mcp.json` / `.codex/mcp.json`。

### 7. 两套官方 Skill 都不适合直接成为 YSS canonical skill

**观察（claim-007，high）：** CLI 内置 Skill 会自动全局安装 CLI、遇到 update notice 自动 upgrade，并允许 bug 提交。`antdv setup` 会把 skill 强制复制进 `.agents/skills/antdv` 或 `.claude/skills/antdv`，并直接覆盖 MCP 配置而不是合并；`createWriteInstructions` 也会用单一生成块覆盖整个 `AGENTS.md` / `CLAUDE.md`。当前 Codex `skill` 路径中，空 `server` 对象仍会进入写分支，可能先把根 `AGENTS.md` 写成 `{}`，随后再覆盖为生成块。文档列出的 `--dry-run` / `--check` 也未出现在 setup 参数定义中。这既绕过 `skills-lock.json` 与投影链，也可能破坏仓库入口规则。

独立 `antdv-next/skills` 仓库是另一套实现：本轮 clone 约 4.5MB、1033 个文件、71 个组件目录，生成时间为 2026-07-03，来源 commit `ffc0...` 对应 `antdv-next@1.4.1`；而组件库后来已发布到 1.5.3。它没有按目标组件版本选择事实的运行时合同（claim-009）。此外，For Agents/CLI 页面指向 `antdv-next/cli` 的内置 Skill，Skills 页面却指向 `antdv-next/skills`，官方自己也存在两条安装源。

**建议：** 不执行 `antdv setup`，不执行两条 `npx skills add ...`，也不把 4.5MB 上游技能复制进 `.agents/skills`。YSS 只保留薄门面、查询矩阵、证据 schema、collector 与小型 fixture；上游包作为可替换 provider。

### 8. `design.md` 可以保留视觉连续性，但不能证明版本精确

**观察（claim-008，high）：** Antdv Next `design.md` 与 React v6 基线高度同源，适合保持现有 Ant Design 企业后台视觉连续性。

**反信号：** 其 front matter 是 `version: alpha`；CLI `design.md` 实现不消费目标版本参数，只读取包内单一 `data/design.md`。因此它不能证明 `antdv-next@x.y.z` 的 patch 级设计事实。

**建议：** 证据记录 `design_md_digest`、来源 URL/CLI package/commit 与观察日期；把它归类为 `design_baseline`，不要放进 exact component API freshness 判定。

### 9. Antdv Next Skills 离线包可作生成范例，不能作当前事实源

**观察（claim-009，high）：** 独立 Skills 仓库展示了有价值的渐进披露结构：主 `SKILL.md` 只列组件索引，详细 docs/demo/token/semantic 放在 `references/`。这证明“大量组件资料按需读取”的框架可行。

**反信号：** 仓库自身称早期实验；当前生成物落后于组件库发布，并且 4.5MB/1033 文件会显著扩大 YSS 技能供应链与投影面。

**建议：** 复用结构思想，不复制内容。YSS fact pack 按“实际选用组件集合”增量生成，而不是为每个项目投影全库。

### 10. 真正替换需要迁移 H2 合同，不只是替换技能正文

**观察（claim-010，high）：** 当前代码与注册表至少有以下硬绑定：

- `prepareFlowPrototype` 只接受 `antd 6.x`，写入 `@ant-design/icons` 与 `antd`，生成 React `yss-theme.js`；
- adapter manifest 固定 `design_standard: ant-design-v6`、`prototype_framework: react`；
- schema v3 要求 `actual_antd_version`；
- evidence template 固定 `component_basis: react-antd-6`；
- skill registry trigger 固定 `component-basis:react-antd`；
- `yss-design-system` 与 `yss-prototype-stage` 文本都以 React AntD 为 H2 受支持默认。

虽然 `yss-prototype-stage` 允许 H2 使用其他实现，但当前提供的机械 adapter 和验证 schema 并不支持 Vue-native Antdv Next。

**建议：** 把替换定义为 L3 `generation-semantics + aggregate-behavior-change` 维护，不得只做文案替换。

### 11. 建议目标架构：新 canonical 候选 + 迁移门面 + 通用证据

**推荐（claim-011，medium）：** 先创建 `maturity: draft` 的 `yss-antdv-next-design`，不要直接改写当前 `yss-antd-design`。现有 ID 的合同明确表示 React AntD v6；原地改义会让既有 fact pack、registry trigger、角色配置和历史证据在没有迁移记录的情况下失真。

验证通过后的兼容选择有两个：优先将 `yss-antdv-next-design` 提升为新 canonical，并把 `yss-antd-design` 保留为 deprecated React provider；如果外部调用必须保持旧名字，则把 `yss-antd-design` 显式升级为 provider router，而不是让同一名字悄悄代表另一套库。目标分层为：

```text
yss prototype component-facts router
  ├─ yss-antdv-next-design        # 新 canonical 候选，先 draft/experimental
  ├─ yss-antd-design              # 现有 React provider 与 rollback
  ├─ project design/token overlay # 始终优先
  ├─ fact-pack collector          # exact version + digest + component subset
  └─ evidence validator           # 不信任 provider 自报版本
```

建议目录形状：

```text
.agents/skills/yss-antdv-next-design/
  SKILL.md
  references/provider-matrix.md
  references/antdv-next-cli-matrix.md
  references/react-antd-cli-matrix.md
  references/boundaries.md
  references/evidence.md
  scripts/collect-antdv-next-facts.mjs
  scripts/validate-fact-pack.mjs
  tests/fixtures/
```

YSS 不依赖上游 Skill 的自动触发。`SKILL.md` 负责阶段边界和 provider 选择，collector 负责可复验事实，validator 负责 fail closed。

### 12. 建议迁移为四个阶段，而不是立即切换

**推荐（claim-012，medium）：**

1. **P0—实验 provider**：以 `maturity: draft` 新增 `yss-antdv-next-design`，为 `@antdv-next/cli@<exact-beta>` 建立 allowlist 和 resolution probe；采集 `Button/Form/Table/Modal/Select/DatePicker` 小型事实包，与官网/tag 源做交叉核对。现有 React provider 保持默认。
2. **P1—Vue-native H2 adapter**：新增 Vue 3 + Vite + `antdv-next@<exact>` + `@antdv-next/icons` + pnpm starter；将项目 `docs/design/tokens/theme.json` 转为可执行 `ConfigProvider` 配置；保留 `prototype_code_reusable: false`。
3. **P2—evidence schema 升级**：不要继续复用 `actual_antd_version`。升级为通用字段，例如 `provider_id`、`library_package`、`requested_library_version`、`resolved_snapshot_version`、`actual_lockfile_version`、`cli_package/version/integrity`、`design_md_digest`、`components_covered`、`project_token_baseline_digest`、`capability_results`。
4. **P3—默认切换与退役**：用至少 3 个代表性 H2 fixture（复杂表单、数据表格、权限/异常流程）完成 build、desktop/narrow、console、键盘、focus、contrast、200% zoom、reduced motion 与视觉回归；确认所有生产假设仍进入 `implementation_handoff`。满足退出条件后再把 registry 默认改为 `vue-antdv-next`，React provider 进入 deprecated/rollback 窗口。

默认切换的最低退出条件：

- npm `latest` 与预期 CLI 版本一致，不再落到旧 beta；
- CLI README 不再声明 not usable，或 YSS 明确锁定经验证的 commit/package；
- exact version probe 不再静默回退，且所有 JSON 输出披露 resolved version；
- YSS 使用的知识查询命令都有真实实现与 fixture；
- 官网、MCP handshake、README 的工具清单一致；
- Vue H2 adapter 和 evidence validator 通过 `scripts/verify-template-fast` 及对应专项测试；
- 新旧 provider 对同一项目 Token 的关键视觉回归差异已解释；
- rollback 能恢复 React provider，不删除已生成的新版证据。

## Counter-Signals

- 用户截图中的 `New` 只能证明入口近期出现，不能证明功能成熟；能力结论均回到官网 `.md`、npm 发布物和源码。
- Antdv Next 组件库本身发布节奏活跃、`1.5.3` 为稳定 `latest`，这是采用的正信号；但不能抵消 CLI beta、dist-tag 和 TODO 实现问题。
- `list/info/doc/demo/token/semantic/changelog` 的核心查询已经能工作，说明不是“纯占位项目”；因此本研究没有建议完全拒绝，而是限定为实验 provider。
- React 与 Antdv Next 的 `design.md` 高度同源，说明视觉切换风险低；但也说明 Antdv Next AI 面的独特价值主要在 Vue API/示例，不应夸大成新的设计系统。
- `yss-prototype-stage` 已声明 H2 不强制 React，这降低了概念层迁移成本；但当前 adapter、validator、template 与 registry 仍是 React-specific，工程迁移成本仍然存在。
- Antdv Next 的迁移指南明确列出 DOM、icons 与大量 API 变化；即便 Vue-native 原型成功，也不能据此推定现有 `ant-design-vue@4.x + YSS UI` 生产代码可直接复用原型代码。

## Source Map

一手公开来源贡献如下：

- [For Agents](https://antdv-next.com/docs/vue/for-agents-cn.md)：官方能力入口与安装建议。
- [CLI](https://antdv-next.com/docs/vue/cli-cn.md)：命令、版本参数与 setup 说明。
- [Skills](https://antdv-next.com/docs/vue/skills-cn.md)：独立 Skills 的生成方式、早期实验声明和渐进披露模型。
- [MCP Server](https://antdv-next.com/docs/vue/mcp-cn.md)：官方 MCP 配置与文档声称的工具面。
- [design.md 指南](https://antdv-next.com/docs/vue/design-md-cn.md) 与 [原始 design.md](https://antdv-next.com/design.md)：视觉语言与 Token。
- [LLMs.txt](https://antdv-next.com/llms.txt)：官方文档导航与单组件 `.md` 入口。
- [迁移指南](https://antdv-next.com/docs/vue/migration-antdv-next-cn.md)：从 Ant Design Vue 到 Antdv Next 的兼容边界。
- [CLI 官方仓库](https://github.com/antdv-next/cli) 固定检查 commit `8e76bc44b3d135a9b4d6a9a89464c40a0ca6da4a`：版本解析、MCP 注册、setup 写入与未实现命令。
- [独立 Skills 官方仓库](https://github.com/antdv-next/skills) 固定检查 commit `0dd42f92751b71bd0111cd513234f6160002210a`：生成时间、体积与结构。
- [Antdv Next 官方仓库](https://github.com/antdv-next/antdv-next) 固定检查 commit `e80e8cebfc0f527878d5aec39c29645e21857cd8`，npm `antdv-next@1.5.3` 与 `@antdv-next/cli@0.0.0-beta.1/beta.5`：发布状态与包身份。

内部一手来源是本仓当前代码：`yss-antd-design`、`yss-prototype-stage`、`yss-design-system`、`prototype-contract.mjs`、schema v3 evidence template、skill registry。既有 2026-08-23/09-01 React AntD 研究只作为背景交叉核对，没有替代本轮对新上游的重新验证。

未使用第三方博客或搜索摘要。通用 Web 搜索无正文返回已记录为 access limitation，不影响通过官方静态 `.md`、仓库和 npm 复核的决定性结论。

## Decision Handoff

下游 owner 建议为 `maintaining-skills` + `yss-prototype-stage` 模板维护工作单元。若进入实现，应先判定 L3，形成不重叠的变更批次：

1. `yss-antd-design` provider facade 与 fact-pack validator；
2. `yss-prototype-stage` Vue H2 adapter；
3. schema/fixture/registry/lifecycle evidence ID 迁移；
4. 技能投影、`skills-lock.json` 与模板验证。

何时把新 canonical 设为默认、旧 `yss-antd-design` 是保持 React provider 还是转成兼容 router、是否未来让生产 `yss-ui` 迁移到 `antdv-next`，都属于下游架构/模板维护决策。本研究不批准这些决定，也不修改 `CONTEXT.md`、技能、生命周期门禁或发布状态。

## Evidence Limitations

- `@antdv-next/cli` 变化很快；本结论绑定 2026-09-04、npm `beta.1/beta.5` 和 CLI commit `8e76bc...`。
- 没有运行 `antdv init/setup/bug/bug-cli`，因为它们会创建项目、改 Agent 配置或产生外部副作用；行为通过官方源码核验。
- 没有把 Antdv Next 接入 Product Design starter 做真实三页面 H2 原型；Vue adapter 的工期、bundle、视觉差异仍需 P1 spike。
- 没有验证现有 YSS UI 封装能否以 Antdv Next 为生产 runtime；本研究明确不作该推定。
- CLI `data/design.md` 与官网文件已核对 digest，但 `version: alpha` 且不绑定目标组件版本，不能支持 patch-level 设计事实。
- claim-011、claim-012 是基于事实的架构建议，置信度为 medium；需要维护者在 L3 变更前确认 canonical ID、兼容 router 与 rollout 方案。
