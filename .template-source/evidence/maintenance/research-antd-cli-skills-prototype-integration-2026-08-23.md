# Ant Design CLI / Skills 与 YSS 原型技能集成研究

> 日期：2026-08-23
>
> 研究性质：只读事实研究与集成分析，不作架构决策，不修改共享 skill、不运行 `antd setup` 写回本仓库，不宣布模板可发布。
>
> 仓库身份：`repository_mode: template-source`（`yss-project.yaml`）。
>
> 存放位置：模板源治理区 `.template-source/evidence/maintenance/`。`evidence/reviews/` 当前为 complete 归档，新研究笔记不写入该目录。按 ADR-0008，研究记录不进入 `docs/` 分发面。

## 研究问题

官方 Ant Design Agent 资料（For Agents、design.md、LLMs.txt、MCP、CLI）当前提供什么能力；官方 `antd` skill / CLI 如何工作；它们与本仓库已有原型相关技能应如何分层，而不是互相覆盖。

## 来源范围

一手来源（2026-08-23 读取）：

| 来源 | 地址 / 对象 | 用途 |
|---|---|---|
| For Agents 中文页 | https://ant.design/docs/react/for-agents-cn 与同页 `.md` | Agent 引导与能力总览 |
| design.md 指南 | https://ant.design/docs/react/design-md-cn | 上游设计语言文件定位 |
| LLMs.txt 指南 | https://ant.design/docs/react/llms-cn | 在线文档注入面 |
| MCP 指南 | https://ant.design/docs/react/mcp-cn | MCP 工具、提示词、配置 |
| CLI 指南 | https://ant.design/docs/react/cli-cn | 命令、参数、Skill 安装 |
| 官方 skill | https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md | 何时调用哪条命令 |
| CLI 仓库 README | https://raw.githubusercontent.com/ant-design/ant-design-cli/main/README.md | setup 写入目标、版本回退、lint 类别 |
| npm 包 | `@ant-design/cli@6.6.1`（https://www.npmjs.com/package/@ant-design/cli） | 当前发布版本 |
| 本机 CLI | `/tmp/antd-cli-prefix` 安装的 `antd` 6.6.1 | 命令输出、setup dry-run、lint 行为 |
| 导航索引 | https://ant.design/llms.txt | 在线文档目录，不是完整组件手册 |
| 本仓库原型合同 | `yss-prototype-stage`、`yss-design-system`、`high-fidelity-html-prototype`、`prototype-review`、`product-design:index`、生命周期注册表 | 对照现有集成点 |

未作为事实来源：第三方博客、社区 MCP `@jzone-mcp/antd-components-mcp` 的实现细节（官方 MCP 页仅列出其存在）。

## 已确认事实

### 1. 官方 Agent 面是四层工具，不是一套生命周期

官方 For Agents 页把能力拆成四层，并给出一段可复制 prompt：先读 `for-agents-cn.md` 与官方 `skills/antd/SKILL.md`，再按说明使用 Ant Design；若 Agent 能装 skill，则运行 `npx skills add ant-design/ant-design-cli`（https://ant.design/docs/react/for-agents-cn.md）。

四层分别是：

1. **CLI**：`@ant-design/cli` 把 antd v3/v4/v5/v6 的 Prop、Token、Demo、Changelog 元数据打进包内，离线查询（同页 CLI 节；CLI 指南“什么是 Ant Design CLI”）。
2. **design.md**：面向 AI 设计工具的默认 Light 主题视觉语言，遵循 google-labs-code/design.md（https://ant.design/docs/react/design-md-cn）。
3. **MCP Server**：从 CLI `v6.3.5` 起由 `antd mcp` 提供 8 个工具和 2 个提示词（https://ant.design/docs/react/mcp-cn）。
4. **LLMs.txt 族**：在线导航与全文文档，不依赖本机 CLI（https://ant.design/docs/react/llms-cn）。

官方没有定义 YSS 意义上的产品设计门禁、Ticket 状态或 OpenAPI 回流。它只保证“写 antd 代码前先查事实”。

### 2. CLI 当前发布面与命令闭包

npm 当前版本为 **6.6.1**（2026-08-17 更新；本机 `antd -V` 输出 `6.6.1`）。需要 Node `>=20`（CLI 指南“安装”；打包 `package.json.engines`）。

CLI 指南与 README 列出 18 条命令，按职责分三组：

| 组 | 命令 | 对 YSS 原型的直接价值 |
|---|---|---|
| 知识查询 | `list` `info` `doc` `demo` `token` `design.md` `semantic` `changelog` | 高。对应现有 `prototype-evidence.yaml` 的查询字段 |
| 项目分析 | `doctor` `env` `usage` `lint` `migrate` | 中低。面向 React + `antd` 工程，不是 HTML 原型合同 |
| 管理 / 反馈 | `mcp` `setup` `upgrade` `bug` `bug-cli` | 低到负。`setup` 会改 Agent 入口文件 |

全局参数（CLI 指南“全局参数”；README “Global Flags”）：

- `--format json|text|markdown`，Agent 应使用 `json`
- `--version <antdVersion>`
- `--lang en|zh`，默认 `en`
- `--detail`
- `-V, --cli-version`

版本解析顺序（README）：`--version` → `node_modules/antd` → `package.json` 依赖 → 回退版本。README 写回退为 `5.24.0`。本机在**无 antd 依赖的空目录**实测：`antd list` 得到 72 个组件，`antd info Button` 得到 21 个 props，与 `--version 6.6.1` 相同，与 `--version 5.24.0` 的 69 个组件 / 19 个 props 不同。因此“空仓库默认 v5”这一 README 陈述与 CLI 6.6.1 实测不一致；模板源仓库本身也没有 `antd` 依赖，**不能假设未传 `--version` 时一定是 v6 或 v5**，证据清单必须写下实际查询版本。

`antd design.md` 只对 **antd v6** 发布。查询 v5 返回结构化错误 `UNSUPPORTED_VERSION_FEATURE`：“design.md is not available for antd v5”（本机 `--version 5.24.0 --format json`）。这与 README “design.md is currently published only for antd v6” 一致。

`antd lint` 的规则类别是 `deprecated` / `a11y` / `usage` / `performance`；另有 `--diff`、`--staged`、`--antd-alias`（README `antd lint` 节）。它对 **TS/TSX 的 React antd 源码**有效：本机对含 `Select dropdownClassName` 的 `App.tsx` 给出 `deprecated` 警告。对 **HTML 原型不可靠**：同一份 `index.html` 一次对目录扫描得到空 issues（假绿），另一次对单文件扫描得到 `skippedFiles[].reason = parse-error`（`Unexpected JSX expression`）且 `partial: true`。两种结果都不是“已检查通过”。把 `antd lint <html-prototype>` 当作 `gate.prototype-verified` 的 lint 证据，存在假绿或假完成风险。

环境变量：`ANTD_NO_AUTO_REPORT=1` 关闭官方 skill 的自动报 bug 建议；`NO_UPDATE_CHECK=1` / `CI=1` 跳过静默升级检查（CLI 指南；官方 SKILL.md “Opt-out”）。

### 3. 官方 `antd` skill 只教“何时调 CLI”，并默认安装 CLI

官方 skill 元数据（https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md）：

- `name: antd`
- 触发：写 antd 组件、查 API/token/demo、跨版本迁移、分析项目用量
- `allowed-tools` 仅允许 `antd *`、`npm install -g @ant-design/cli`、`which antd`（Claude Code 风格权限）

行为规则：

1. 未安装则自动 `npm install -g @ant-design/cli`
2. 看见 “Update available” 就先 `antd upgrade`
3. 写代码前必须 `antd info`，不要凭记忆
4. 一律 `--format json`
5. 知识查询按用户项目版本传 `--version`
6. 改完代码后 `antd lint`
7. 用户明确要求时才 `antd bug` / `antd bug-cli`，且先预览再提交

它覆盖 12 个场景：写组件、查文档、排障、迁移、用量分析、changelog、组件选型、环境采集、报 antd bug、报 CLI bug、升级 CLI、当 MCP 用。场景全部以 **React `antd` 工程**为默认对象，没有 YSS 产品设计阶段、没有 Vue / Ant Design Vue、没有 `prototype-evidence.yaml`。

仓库 `skills/` 目录当前只有这一个 skill：`skills/antd/SKILL.md`（GitHub API `contents/skills`）。

### 4. MCP 是知识查询子集，不是证据全集

官方 MCP 从 CLI 启动：`npx -y @ant-design/cli mcp`，或全局 `antd mcp`。可加 `--version` 钉死 antd 版本（MCP 指南；README）。

8 个工具：`antd_list` `antd_info` `antd_doc` `antd_demo` `antd_token` `antd_design_md` `antd_semantic` `antd_changelog`。

2 个提示词：`antd-expert`、`antd-page-generator`。

**没有** MCP 工具对应 `lint` / `doctor` / `usage` / `migrate` / `env`。即便 IDE 配了 MCP，`gate.prototype-verified` 仍需要 CLI 落盘 JSON，不能只靠对话里的 MCP 调用。

`antd-page-generator` 的官方描述是“辅助基于组件的页面创建”（MCP 指南）。它不是 `yss-prototype-stage`，也不产出生命周期证据。

### 5. `antd setup` 会写入 YSS 权威入口，不能在模板源直接跑

README `antd setup` 与本机 dry-run / 隔离目录实测一致：

| `--client` | 默认写入 |
|---|---|
| `cursor` `--mode both` | `.cursor/mcp.json`、`.agents/skills/antd`、`AGENTS.md` |
| `cursor` `--mode skill` | `.agents/skills/antd`、`AGENTS.md` |
| `codex` `--mode skill` | `.agents/skills/antd`、`AGENTS.md` |

隔离目录实测写入的 `AGENTS.md` 片段：

```text
<!-- antd-cli setup start -->
## Ant Design CLI Skill
Use the shared Ant Design skill at `.agents/skills/antd/SKILL.md` ...
<!-- antd-cli setup end -->
```

并对本仓库执行 `antd setup --client cursor --mode skill --check --project /workspace`：`Not configured`（没有 `.agents/skills/antd`，`AGENTS.md` 也没有官方托管块）。这与当前治理一致。

冲突点是硬的：

- `.agents/skills` 是跨 Agent 共享技能的唯一权威内容（`docs/agents/skills-maintenance.md`；`AGENTS.md` §4）。
- 共享技能必须进 `skills-lock.json`，再投影到 `.cursor/skills` 等；禁止在各 Agent root 手工分改。
- 根 `AGENTS.md` 只保存仓库身份路由和硬门禁，不是官方 CLI 的说明书。
- `antd setup --client cursor` 把 skill 写进 `.agents/skills/antd`，却**不会**更新 `skills-lock.json`、也不会走 `scripts/sync-skills`。

因此：在本模板源或实例里直接 `antd setup` / `npx skills add ant-design/ant-design-cli`，会制造未锁定的共享 skill 和入口规则污染。这不是“方便接入”，而是供应链越界。

### 6. design.md / LLMs.txt 是上游默认，不是项目规范

`https://ant.design/design.md` 与 `antd design.md` 是同一份 v6 设计语言（design.md 指南；README）。本机 `--format json` 得到 `{ "doc": "<markdown>" }`，正文约 21KB，front matter 含 `version: alpha`、`colors.primary: '#1677FF'`、`on-surface: '#1F1F1F'`、`outline: '#D9D9D9'`。

项目覆盖已经写在 `docs/design/design.md`：“上游默认 → 项目 token → 功能语义映射；冲突以项目为准”。当前项目快照至少有这些可见差异（`docs/design/tokens/tokens.default.json`）：

| 角色 | 官方 design.md | 项目 token |
|---|---|---|
| 主色 | `#1677FF` | `colorPrimary` `#1677ff`（同色不同写法） |
| 主文本 | `#1F1F1F` | `colorText` `#2e2e2e` |
| 边框 | `#D9D9D9` | `colorBorder` `#dbdbdb` |
| 默认圆角 | CLI 指南写 6px | `borderRadius` `8` |

官方 design.md 指南明确它描述**默认 Light 主题**，给 Figma Make / Stitch 等设计工具用。它不能覆盖 `docs/design/tokens/*`，也不能指导 Vue 生产封装。

LLMs.txt 族（https://ant.design/docs/react/llms-cn；https://ant.design/llms.txt）：

- `llms.txt`：导航，本机抓取约 33KB / 534 行，指向 `design.md`、`llms-full.txt`、`llms-full-cn.txt`、`llms-semantic.md` 与各文档 / 组件 `.md`
- `llms-full.txt` / `llms-full-cn.txt`：完整组件文档，官方建议整本注入上下文
- 单组件：`https://ant.design/components/<Name>.md`
- 语义：`llms-semantic.md` 与每组件语义文件

对 Agent 来说，全文注入与 CLI 定向查询是替代关系，不是叠加关系。官方 MCP 页也把 LLMs.txt 标成“不支持 MCP 时的备选”。

### 7. 本仓库已经部分接入 CLI，但缺口明确

现有合同已经把官方 CLI 当成事实引擎，而不是主入口：

| 资产 | 已写明的事实 |
|---|---|
| ADR-0001 | `product-design:index` 是 Codex 原型主入口；`antd` skill / CLI 只提供组件 / demo / token / semantic / design.md 事实 |
| `yss-prototype-stage` | 优先级：官方 design.md → 项目 `docs/design/design.md` → 功能映射；强制 `--format json`；至少保存 design.md、组件 `info`/`demo`/`token`/`semantic`、`antd lint`；禁止写死 CLI/组件版本 |
| `high-fidelity-html-prototype` | 兼容入口；列出同一组命令；产物是 `docs/.scratch/<feature>/design/prototypes/index.html`；栈是 React 18 + `antd@6.x` |
| `docs/design/templates/prototype-evidence-template.yaml` | 机器可读证据：CLI 版本、目标 antd 版本、查询落盘路径、lint、浏览器验证 |
| `gate.prototype-verified` | 证据是 `evidence.antd-cli-validation` + `evidence.browser-prototype-verification`（`docs/process/lifecycle-registry.yaml`） |
| `yss-ui` | 生产页是 Vue + Ant Design Vue 4.x；“产品设计的 AntD v6 视觉/token 语义 ≠ Vue 生产 API” |
| `docs/design/README.md` | 把 `antd` 列成“查询工具”，与 `yss-prototype-stage` 并列 |
| `skills-lock.json` | **没有** `antd` / `ant-design-cli` 条目 |
| Product Design plugin | `product-design:index` / `$prototype` / `critical-overrides.md` **没有** antd CLI、design.md 或证据清单字样 |

另外两条容易混用的“prototype”：

- Matt `prototype`：回答一个设计问题的一次性代码，产物在 `prototype/<name>` 分支（`docs/agents/skills-maintenance.md`）。
- YSS 高保真原型：生命周期资产，必须过评审、AntD 事实、浏览器验证和用户确认。

官方 `antd` skill 更接近“帮你写 React antd 代码”，不是这两条里的任何一条主入口。

### 8. 官方栈与 YSS 栈的职责对照

```text
官方 Ant Design Agent 栈              YSS 原型 / 设计栈
----------------------------          --------------------------------
for-agents prompt                     AGENTS.md 入口 + yss-product-lifecycle
antd skill（何时调 CLI）               yss-prototype-stage（阶段合同）
antd CLI / MCP（事实）                 evidence.antd-cli-validation
design.md（上游默认 Light）            docs/design/design.md + tokens/*
antd-page-generator                   product-design:index → focused skill
llms-full.txt（上下文灌入）            定向 CLI 查询 + 项目设计系统
antd lint（React 源码）                浏览器验证 + HTML 原型合同
（无生命周期）                         prototype-review / user-confirmation
（React antd）                        生产：Vue + ant-design-vue + YSS UI
```

重合区只有“Ant Design v6 组件 / token / demo / semantic / 设计语言事实”。生命周期、项目覆盖、跨 Agent 证据、Vue 实现还原都不在官方栈里。

## 集成与整合分析

本节是对已确认事实的推论，不是已批准决策。

### A. 推荐分层：官方负责事实，YSS 负责阶段

保持 ADR-0001 的方向，把边界写死：

1. **生命周期入口不变**：`yss-design-system` → `yss-prototype-stage`；Codex 再进 `product-design:index`。官方 `antd` skill、`antd-page-generator`、`npx skills add` 都不是入口。
2. **事实引擎用 CLI**：组件 API、demo、token、semantic、上游 design.md、changelog 只从 `@ant-design/cli --format json` 取，并按目标 v6 传 `--version`。
3. **项目覆盖压过上游默认**：先读官方 design.md，再强制 diff 到 `docs/design/tokens/*`，差异写入 `prototype-evidence.yaml` 的 `project_override_reviewed`。
4. **生产实现不走官方 React 事实**：`yss-ui` 继续以 lockfile 中的 Ant Design Vue 为准；React 原型只提供视觉 / 交互 / API 反推，不复制 props / hook。

这与现有 skill 文字一致，缺的是执行细则和反模式。

### B. 不要把官方 skill 变成 YSS 共享 skill

三条不可行或高成本的做法：

| 做法 | 事实后果 |
|---|---|
| 在模板源跑 `antd setup --client cursor/codex` | 写入 `.agents/skills/antd` 和 `AGENTS.md`，绕过 `skills-lock.json` / 投影 |
| `npx skills add ant-design/ant-design-cli` | 官方 For Agents 推荐，但安装位置由 skills 协议决定，同样可能落到共享 skill 根 |
| 手工复制官方 SKILL.md 进 `.agents/skills/antd` 当 YSS skill | 与 `yss-prototype-stage` 双入口；官方规则会诱导 Agent 写生产 React、自动全局安装、自动 upgrade、自动报 bug |

若将来要正式引入官方 skill，只能走 `maintaining-skills` + 锁文件，并先裁掉：自动改 `AGENTS.md`、自动 `npm i -g`、把 `antd-page-generator` 当原型入口、把 React API 用于 Vue。在此之前，**保持未配置状态是正确的**（本机 `--check` 已证实当前就是 Not configured）。

更稳的整合是：不安装官方 skill，只在 `yss-prototype-stage`（及兼容入口）写“允许的 CLI 命令、版本钉扎、落盘路径、禁止事项”。Agent 发现面继续由 YSS 合同打开 CLI，而不是再多一个平级 `antd` 入口。

### C. MCP 可作为 IDE 加速，不能替代门禁证据

适合：Cursor / Codex 本机开发时少敲命令。

不适合：

- 当作 `evidence.antd-cli-validation` 本身（MCP 调用默认不落盘）
- 在模板源仓库提交 `.cursor/mcp.json` 作为流程要求（Cloud / 无 MCP 的 Agent 会失败）
- 用 `antd-page-generator` 绕过低保真评审和高保真合同

若要配 MCP，应使用 `npx -y @ant-design/cli mcp --version <target_antd_v6> --lang zh`，并把版本写进功能证据，而不是写进模板源默认配置。

### D. LLMs.txt 不作为默认上下文

`llms-full.txt` 是完整组件手册，官方给 Cursor `@Docs` / `AGENTS.md` 的示例是整本阅读。对 YSS 原型阶段这会：

- 挤掉项目 token 与状态矩阵
- 再次把上游默认当成项目规范
- 与“禁止凭记忆、必须 CLI 定向查询”重复且更不可追溯

保留 `llms.txt` 作目录、单组件 `.md` 作 CLI 不可用时的降级即可。默认路径仍是 CLI JSON。

### E. 按阶段使用 CLI，而不是每条命令都跑

| 阶段 | 应用官方命令 | 不要做 |
|---|---|---|
| 低保真 / `prototype-review` | 最多 `antd list` / `antd design.md` 辅助组件选型 | 不要求完整 lint；评审证据仍是独立评审记录 |
| 高保真产出前 | `design.md`、每个选用组件的 `info` `demo` `token` `semantic`，全部带目标 v6 与 `--format json` | 不凭记忆写 v6 API；不用官方默认色覆盖项目 token |
| 高保真产出后 | 浏览器验证必做；`lint` 仅当产物是 React/TSX | 不要把 HTML 上的空 lint 写成 `lint_passed: true` |
| Spec 校准 / OpenAPI | 用原型行为反推字段与状态，不把 demo TSX 当契约 | 不把官方 changelog 写成 API Freeze |
| 前端实现（Vue） | 只用 token / 视觉语义对照；需要时另查 Ant Design Vue | 禁止 `antd info` 的 React props 直接进 Vue 代码 |
| React 实现仓（若有） | `lint` `doctor` `usage` `migrate` 才有意义 | 不要在模板源仓库对 `.md` / `.html` 做项目分析 |

### F. 现有合同应补的缺口（供后续维护，本笔记不改 skill）

1. **版本钉扎**：证据里同时写 CLI 版本与 `target_antd_version`；每次知识查询都传同一版本。不要依赖空仓库自动检测。
2. **lint 适用范围**：`antd lint` 只接受 TS/TSX/React 源。HTML 原型应把 lint 标成 `not-applicable` 或先有可解析的 React 源，再跑 lint。
3. **语言**：对外落地文档是简体中文，CLI 查询应加 `--lang zh`，但 JSON 字段名保持原样。
4. **禁止 `antd setup`**：在 `yss-prototype-stage` / `yss-design-system` 写明模板源与实例都不得用 setup 改 `AGENTS.md` 或 `.agents/skills`。
5. **Product Design 插件缺口**：`critical-overrides.md` 与 `$prototype` 不知道 AntD 事实和证据清单。YSS 侧应由 `yss-prototype-stage` 在路由前后强制执行，而不是改上游插件正文。
6. **官方 skill 与 Matt `prototype` 隔离**：一次性逻辑/视觉探索不走 `gate.prototype-verified`；一旦进入产品设计影响，必须回到 YSS 合同。
7. **组件映射表**：高保真选用的 React 组件（Table/Form/Modal…）在实现阶段映射到 `YTable` / `YssFormily` / Ant Design Vue，避免把 React demo 当生产代码。

### G. 明确不整合的部分

- 官方 For Agents 那段“先读 for-agents 再装 skill”的 prompt：不写进根 `AGENTS.md`。YSS 入口已经指向 `yss-design-system` / `yss-prototype-stage`。
- `antd bug` / `antd bug-cli`：与 YSS Ticket / tracker 无关，默认关闭（`ANTD_NO_AUTO_REPORT=1`）。
- `antd doctor` / GitHub Actions setup：面向 React 应用 CI，不是模板源发布门禁。
- 社区 MCP：官方未声明与 `@ant-design/cli` 元数据同步，不能当 `evidence.antd-cli-validation`。

## 建议的目标架构（分析结论，待人工取舍）

```text
yss-product-lifecycle
  └─ 命中产品设计影响
       └─ yss-design-system          # 项目规范与 token
            └─ yss-prototype-stage   # 唯一阶段合同
                 ├─ prototype-review
                 ├─ product-design:index（Codex）或等价产出
                 ├─ @ant-design/cli   # 只读事实，JSON 落盘
                 ├─ browser verification
                 └─ user confirmation
                      └─ Spec 校准 / OpenAPI / yss-ui（Vue）
```

官方 `antd` skill / MCP / LLMs.txt 都停在“CLI 事实”这一格，不向上接管入口，不向下接管 Vue 实现。

最小后续动作（若进入模板维护，需另开任务并按 L2/L3 裁剪）：

1. 修订 `yss-prototype-stage` 与证据模板：版本钉扎、`--lang zh`、HTML lint `not-applicable`、禁止 `antd setup`。
2. 在 `yss-design-system` 关系表把“官方 `@ant-design/cli`”从“skill”改成“外部事实工具”，避免 Agent 去装官方 skill。
3. 不把官方 skill 加入 `skills-lock.json`，除非完成适配审查。
4. 需要 IDE 便利时，只在开发者本机配 MCP，不提交为模板默认。

## 尚未确认项

- CLI 6.6.1 在空目录的真实回退版本源码位置（README 写 `5.24.0`，实测像 v6）。未读 CLI 源码 `dist/` 的检测函数。
- `antd lint` 对内联 React 的单文件 HTML（CDN + Babel）是否能解析；本机只测了无 JSX 的 HTML，结果为空。
- `npx skills add ant-design/ant-design-cli` 在 Cursor Cloud / Codex 上的实际落地目录是否总是 `.agents/skills/antd`。
- `antd-page-generator` 提示词全文（需连上 MCP 后读取，本笔记未启动 MCP 进程）。
- `llms-full-cn.txt` 的准确体积与是否含 v6.6.1 全部组件。
- 官方 design.md 的 `version: alpha` 与 antd 6.6.1 站点 changelog 的对应关系。

## 本轮一手验证

在隔离前缀安装 `@ant-design/cli@6.6.1` 后实际执行：

- `antd -V` → `6.6.1`
- `antd list --format json`（空目录）→ 72 项，与 `--version 6.6.1` 相同
- `antd list --version 5.24.0 --format json` → 69 项
- `antd info Button --version 6.6.1 --format json` → 21 个 props
- `antd design.md --version 6.6.1 --format json` → `{ doc }`，约 21083 字符
- `antd design.md --version 5.24.0 --format json` → `UNSUPPORTED_VERSION_FEATURE`
- `antd setup --client cursor --mode both --dry-run` → 将写 `.cursor/mcp.json`、`.agents/skills/antd`、`AGENTS.md`
- `antd lint` HTML → 空通过或 `parse-error` / `partial: true`；TSX 废弃 API → 1 条 `deprecated`
- `antd setup --client cursor --mode skill --check --project /workspace` → Not configured

命令摘录见 `/opt/cursor/artifacts/antd_cli_firsthand_2026-08-23.log`。

## 结论

官方 Ant Design Agent 资料已经把 CLI、skill、MCP、design.md、LLMs.txt 收成一套 **React antd 事实与编码助手**。本仓库需要的是 **YSS 产品设计阶段合同**：项目 token 覆盖、跨 Agent 证据、评审 / 确认门禁，以及 Vue 生产实现边界。

已经对齐的部分应保留：CLI 当事实引擎，`yss-prototype-stage` 当合同，`product-design:index` 当 Codex 产出路由。

不应整合的部分：把官方 skill 装进 `.agents/skills`、用 `antd setup` 改 `AGENTS.md`、把 MCP / `antd-page-generator` / `llms-full.txt` 当成生命周期入口、把 HTML 上空的 `antd lint` 当成验证通过、把 React CLI 结果当成 `yss-ui` API。

下一步若要改 skill，另开模板维护任务；本文件只提供可引用事实。
