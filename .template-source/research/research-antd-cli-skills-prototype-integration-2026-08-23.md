# Ant Design CLI / Skills 与本仓原型技能集成研究

日期：2026-08-23  
仓库身份：`template-source`（`yss-project.yaml`）  
问题：对照官方 Ant Design Agent 文档与 `@ant-design/cli`，分析 CLI、官方 skill、MCP、`design.md`、LLMs.txt 如何与本仓原型相关技能集成。  
范围：只读研究。不改生命周期注册表、不把官方 skill 写入 `skills-lock.json`、不运行 `antd setup`。

## 1. 结论先行

官方面分成四层，职责不重叠：

| 官方层 | 解决什么 | 本仓对应 |
|---|---|---|
| `@ant-design/cli` 子命令 | 离线、可版本钉死的组件/token/demo/lint 事实 | 已是 `evidence.antd-cli-validation` 与 `yss-prototype-stage` 的强制仪器 |
| 官方 `antd` skill | 教 Agent「何时跑哪条 CLI」 | 可引用，不可收编为 YSS 共享 skill |
| `antd mcp` | 把同一套查询变成 IDE 工具 | 可选便利，不能替代门禁里的 CLI JSON 证据 |
| `design.md` / LLMs.txt | 设计语言与文档注入 | 上游默认；项目覆盖是 `docs/design/design.md` |

本仓已经走在正确方向：`AGENTS.md` 强制入口、`yss-prototype-stage`、`yss-design-system`、`prototype-evidence-template.yaml` 都把 `antd` CLI 当事实源，而不是当原型编排器。

真正的集成风险不是「缺官方 skill」，而是 `antd setup` 会写入 `.agents/skills/antd/` 和根 `AGENTS.md` 托管区块，和本仓「`.agents/skills` 权威 + `AGENTS.md` 不重复定义规则」冲突。

## 2. 官方一手事实

### 2.1 For Agents：开箱提示词

- 事实：官方给 Agent 的启动提示要求先读 `for-agents-cn.md` 和官方 `skills/antd/SKILL.md`，再写代码；若能装 skill，运行 `npx skills add ant-design/ant-design-cli`。  
  源：https://ant.design/docs/react/for-agents-cn.md  
  原文：「在编写任何代码之前，请先阅读 https://ant.design/docs/react/for-agents-cn.md 和 https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md」

- 事实：同一页把 Agent 能力拆成 CLI、`design.md`、MCP、LLMs.txt 四块，CLI 覆盖 antd v3–v6 的 Prop / Token / Demo / Changelog，离线查询。  
  源：https://ant.design/docs/react/for-agents-cn

- 事实：站点侧栏当前 changelog 标为 v6.6.1。  
  源：https://ant.design/docs/react/for-agents-cn（导航「更新日志v6.6.1」）

### 2.2 CLI：包、命令、合同

- 事实：包名 `@ant-design/cli`，仓库 `ant-design/ant-design-cli`，npm 当前版本 `6.6.1`（2026-08-17 更新），`engines.node` 为 `>=20.0.0`，bin 为 `antd`，发布物含 `dist`、`data`、`skills`。  
  源：https://www.npmjs.com/package/@ant-design/cli ；https://raw.githubusercontent.com/ant-design/ant-design-cli/main/package.json

- 事实：官方文档称「18 条命令」；知识查询含 `list` / `info` / `doc` / `demo` / `token` / `design.md` / `semantic` / `changelog`；项目分析含 `doctor` / `env` / `usage` / `lint` / `migrate`；另有 `bug` / `bug-cli` / `mcp` / `setup` / `upgrade`。  
  源：https://ant.design/docs/react/cli-cn

- 事实：所有命令支持 `--format json|text|markdown`，Agent 应优先 `json`；可用 `--version` 钉目标 antd 版本，`--lang en|zh`，默认语言是 `en`。版本探测顺序：`--version` → `node_modules/antd` → `package.json` → 默认回退。  
  源：https://ant.design/docs/react/cli-cn ；https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md

- 事实：`antd design.md` 输出遵循 google-labs-code/design.md 的设计语言文件，含 YAML token、四大价值观、颜色/字体/4px 网格/三层表面/阴影/6px 圆角与 Don'ts；也发布在 https://ant.design/design.md。  
  源：https://ant.design/docs/react/cli-cn ；https://ant.design/docs/react/design-md-cn

- 事实：`antd migrate ... --apply`「生成 Agent 迁移提示」，官方 skill 写明「does not modify files」。  
  源：https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md

- 事实：`ANTD_NO_AUTO_REPORT=1` 关闭 Bug 上报建议；`NO_UPDATE_CHECK=1` / `CI=1` 跳过静默升级检查。  
  源：https://ant.design/docs/react/cli-cn

### 2.3 官方 skill：只有一个 `antd`

- 事实：仓库 `skills/` 下只有 `antd/` 目录（另加 `.npmignore`），没有第二套设计/原型 skill。  
  源：https://api.github.com/repos/ant-design/ant-design-cli/contents/skills

- 事实：skill 名 `antd`；触发是写 antd 组件、查 API/token/demo、迁移、分析项目用量；`allowed-tools` 仅限 `antd *`、`npm install -g @ant-design/cli`、`which antd`。  
  源：https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md

- 事实：硬规则包括：写代码前先 `antd info`，按用户项目版本传 `--version`，用 `--format json`，改完跑 `antd lint`，用户确认后才 `antd bug --submit`。知识查询支持 antd v4+；v3 先 `antd migrate 3 4`。  
  源：同上

- 事实：安装入口是 `npx skills add ant-design/ant-design-cli`，兼容 nicepkg/agent-skills 协议。  
  源：https://ant.design/docs/react/cli-cn ；https://www.npmjs.com/package/@ant-design/cli

### 2.4 MCP：同一查询面的 IDE 包装

- 事实：官方 MCP 从 `@ant-design/cli` **v6.3.5** 起由 `antd mcp` 启动；8 个工具对应 CLI 知识查询：`antd_list` / `antd_info` / `antd_doc` / `antd_demo` / `antd_token` / `antd_design_md` / `antd_semantic` / `antd_changelog`；2 个提示词：`antd-expert`、`antd-page-generator`。  
  源：https://ant.design/docs/react/mcp-cn

- 事实：推荐配置是 `npx -y @ant-design/cli mcp`，可加 `--version`。`antd setup --client <claude|cursor|vscode|codex>` 可写配置；模式为 `mcp` / `skill` / `both`。  
  源：https://ant.design/docs/react/mcp-cn

- 事实：官方另列社区包 `@jzone-mcp/antd-components-mcp`；无 MCP 时回退 LLMs.txt。  
  源：https://ant.design/docs/react/mcp-cn

### 2.5 `antd setup` 写入面（与本仓冲突点）

- 事实：Cursor 默认写 `.cursor/mcp.json`；`--mode skill|both` 会在 **`.agents/skills/antd/`** 放共享技能，并向根 **`AGENTS.md`** 写入托管指令区块。Claude 写 `.claude/skills/antd/` 与 `CLAUDE.md`。Codex 目前只支持 skill，不写 MCP。  
  源：https://www.npmjs.com/package/@ant-design/cli （README「antd setup」表）  
  原文：「Cursor、VS Code 和 Codex 会获得同一份 `.agents/skills/antd/` 共享技能，并通过指令区块告诉 Agent 何时使用。」

- 事实：`--check` 在配置/技能/指令不一致时 exit 1；`--dry-run` 不写文件。  
  源：同上

### 2.6 design.md 与 LLMs.txt

- 事实：`https://ant.design/design.md` 面向 Figma Make、Stitch 等 **AI 设计工具**，描述默认 **Light** 主题；CLI 可用 `--format json`、`--lang zh` 取同一内容。  
  源：https://ant.design/docs/react/design-md-cn

- 事实：LLMs.txt 提供导航 `llms.txt`、完整文档 `llms-full.txt` / `llms-full-cn.txt`、语义 `llms-semantic.md` / `llms-semantic-cn.md`，以及 `https://ant.design/components/<Name>.md`。Cursor 建议用 @Docs 或 `.cursor/rules`，不要默认整包灌进系统提示。  
  源：https://ant.design/docs/react/llms-cn

### 2.7 后台一手补强（影响集成判断）

[调研 Ant Design Agent 一手源](41445636-ac71-4331-8908-9acfde75a0bf) 跟到仓库 raw、CLI `--help` 与 `DESIGN.md` 后，下列事实会改本仓接法：

- 事实：`antd design.md` **只服务 antd v6**；查 v3/v4/v5 返回 `UNSUPPORTED_VERSION_FEATURE`。权威文件是 `ant-design/ant-design` 根目录 `DESIGN.md`，`version: alpha`，描述默认 Light。  
  源：https://raw.githubusercontent.com/ant-design/ant-design-cli/main/README.zh-CN.md ；https://ant.design/design.md
- 事实：未传 `--version` 且探测失败时，CLI 回退 **`5.24.0`**，不是 v6。本仓高保真合同写死「Ant Design v6」时，漏记目标版本会查到 v5 API。  
  源：https://github.com/ant-design/ant-design-cli/blob/main/README.md  
  原文：「fallback `5.24.0`」
- 事实：官网文档只列 `claude|cursor|vscode|codex`；`antd setup --help` 另有 `--client github-actions` 与 `--mode ci`，会写 `.github/workflows/antd-cli.yml`（`npm ci` / `build` / `doctor` / `lint ./src`）。本模板仓无前端 `src`，禁止跑该模式。  
  源：`npx -y @ant-design/cli setup --help` ；https://github.com/ant-design/ant-design-cli/blob/main/README.md
- 事实：官方 MCP **没有远程 HTTP 端点**，只是本地 stdio（`antd mcp`）。  
  源：https://ant.design/docs/react/mcp-cn
- 事实：官网写元数据覆盖 v3–v6；官方 skill 写捆绑知识是 v4–v6，v3 只有迁移指南。lint 第四类英文 README 叫 `usage`，中文 README 有一处写成 `best-practice`。集成时以 CLI `--help` / JSON 字段名为准。  
  源：https://ant.design/docs/react/cli-cn 对比 https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md
- 事实：`DESIGN.md` Don'ts 与 `yss-design-system` 已对齐：同一表面不叠两个 primary、不硬编码 `#FFFFFF`/`#FAFAFA`、不用 Tag 当关键状态、暗色走算法不手翻。  
  源：https://ant.design/design.md

## 3. 本仓原型相关技能现状

权威入口（`AGENTS.md` §8）：UI 设计、原型、组件或主题先 `yss-design-system`，再 `yss-prototype-stage`；Codex 走 `product-design:index`；「产出前后用 `antd` CLI 记录 Ant Design v6 与浏览器验证事实」。

| 技能 | 角色 | 已消费的官方面 |
|---|---|---|
| `yss-design-system` | 项目设计系统与 AntD 企业后台基线 | 明确「官方 `@ant-design/cli` / for-agents」查组件/token/demo；规范权威是 `docs/design/design.md` |
| `yss-prototype-stage` | 产品设计影响的跨 Agent 合同 | 上游 `design.md` → 项目 token → 功能映射；强制 `antd design.md/info/demo/token/semantic/lint` + `--format json` + 记版本 |
| `high-fidelity-html-prototype` | 兼容入口 | 同一套 CLI 命令写进 `prototype-evidence.yaml` |
| `prototype-review` | 低保真独立评审 | 不跑 CLI；CLI 属于后续 `gate.prototype-verified` |
| `prototype`（Matt） | 抛开问题的一次性原型 | 不承担 YSS 门禁或 AntD 证据 |
| `product-design:index` | Codex 视觉/原型路由 | 产出 `docs/.scratch/<feature>/design/prototypes/index.html`，须回流本合同 |

生命周期已有稳定 ID：

- 证据：`evidence.antd-cli-validation`、`evidence.browser-prototype-verification`
- 门禁：`gate.prototype-reviewed` / `gate.prototype-verified` / `gate.user-confirmation`
- 工作单元：`work-unit.prototype-design`

证据模板 `docs/design/templates/prototype-evidence-template.yaml` 已要求：`upstream_design_md_source: https://ant.design/design.md`、CLI/目标版本、`info/demo/token/semantic` 路径、`lint_passed`。

`skills-lock.json` **没有** `antd` 条目。`.agents/skills` 当前也没有官方 `antd/` 目录。

## 4. 对照：该集成什么、不该集成什么

### 4.1 已经对齐、应保持

1. **CLI 是仪器，不是编排器。** 官方 skill 自己也只调度 `antd` 命令。本仓门禁消费的是 JSON 输出路径，不是 MCP 会话记忆。
2. **设计语言分层。** 官方 `design.md` = 上游 Light 默认；`yss-prototype-stage` 禁止用上游覆盖项目 token。这与 design-md 文档「默认 Light 主题」一致。
3. **版本钉死。** 官方要求 `--version` 对齐用户项目；本仓禁止在模板里写死 CLI/组件版本，只在证据里记录实际值。
4. **低保真评审不依赖 CLI。** 与官方「写 antd 代码前才查 API」一致：线框阶段查 token 可选，不应阻断 `prototype-review`。

### 4.2 必须避免的集成

1. **不要在本仓对 `antd setup --client cursor --mode both` 一键执行。**  
   它会创建 `.agents/skills/antd/`（本仓共享 skill 权威根）并改写根 `AGENTS.md`。这会：
   - 让未入锁的目录出现在权威根，`scripts/sync-skills` / `update-skill-lock` 会把它当成意外共享 skill 或忽略它造成双入口；
   - 在 `AGENTS.md` 增加第二套「写 antd 前先用 MCP」规则，违反「说明文档不重复定义入口」。
   若开发者本机需要 MCP，只允许 `antd setup --client cursor --mode mcp --dry-run` 预览后，把 MCP 配到 **用户级** Cursor 设置，或项目 `.cursor/mcp.json`（非权威 skill 根）。

2. **不要把官方 `antd` skill 收编进 `yss-*` 或 `skills-lock.json` shared。**  
   它是上游工具手册，版本随 `@ant-design/cli` 走。收编会变成我们维护官方 API 备忘。需要时用 `npx skills add` 装到 **Agent 本地/用户技能区**，或在文档里指向 raw `SKILL.md` URL。

3. **不要把 `antd-page-generator` 当高保真权威。**  
   本仓高保真必须经 `prototype-review` → `product-design:index` / 等价合同 → 浏览器验证。官方 page-generator 只生成「基于组件的页面」，没有状态矩阵、权限语义、YSS 组件映射或 `PROTOTYPE ONLY` 合同。

4. **不要把 `llms-full-cn.txt` 写进 `AGENTS.md` 或 skill 正文。**  
   官方给的是按需阅读提示。整包文档会冲掉本仓裁剪规则，且与离线 CLI 重复。

5. **不要把社区 `@jzone-mcp/antd-components-mcp` 写进模板。**  
   官方只列为备选；门禁 ID 是 `evidence.antd-cli-validation`，只认官方 CLI。

6. **不要让官方 skill 的「改完必 `antd lint`」无条件套在 HTML 原型上。**  
   官方 lint 面向项目里的 antd **导入**（废弃 API / a11y / performance）。`docs/.scratch/<feature>/design/prototypes/index.html` 常常没有 `import { Button } from 'antd'`。`lint_passed` 应对「无可 lint 的 TSX/JSX 导入」显式记 `not-applicable`，不得假绿或假红。

### 4.3 建议补的集成缝（研究建议，本轮不改代码）

按侵入性从低到高：

1. **把官方五页 + skill URL 收成 `yss-prototype-stage` / `yss-design-system` 的 references 指针。**  
   现有 `for-agents` 链接是英文路径；官方中文合同在 `for-agents-cn`。指针即可，不要复制 CLI 子命令表（避免和上游漂移）。

2. **证据模板补三个可选字段。**  
   - `cli_lang: zh`（本仓文档语言是简体中文，官方默认 `--lang en`）  
   - `mcp_used: false`（MCP 可选，门禁仍要文件化 CLI 输出）  
   - `lint_applicability: applicable | not-applicable`（解释 HTML 原型）

3. **实现仓（不是本模板仓）才启用 `usage` / `doctor` / `lint` / `migrate`。**  
   挂到 `yss-ui` / `yss-page-module-development` 的实现检查：对照冻结原型选过的组件，跑 `antd usage` 与 `antd lint`。`template-source` 无运行时前端，这些命令在本仓没有项目树可扫。

4. **Codex 路径保持 `product-design:index`，只在 get-context 后调用 `antd design.md --lang zh --format json`。**  
   用官方设计语言约束视觉生成，再用项目 token 覆盖。不要让 `antd-expert` 提示词接管路由。

5. **若未来要「官方 skill 可发现」。**  
   正确做法是：`skills-lock.json` 的 `platform` 或显式外部 `source` 登记，**禁止**手改投影；或只在文档写 `npx skills add`，不把文件拷进 `.agents/skills`。未做 lock 方案前保持现状。

6. **Cloud / 无全局 npm 环境。**  
   官方 skill 会 `npm install -g @ant-design/cli`。本仓前端约定是 `pnpm`。验证脚本或 AGENTS Cloud 段应写清受控例外：`pnpm dlx @ant-design/cli` 或环境预装，并记录实际 bin。不要默认 `npm -g`。

7. **高保真查询必须显式 `--version <target_antd_version>`，且 `antd design.md` 只在 v6 目标下调用。**  
   默认回退是 `5.24.0`。漏传版本时，`info`/`demo` 可能是 v5，`design.md` 在非 v6 上直接失败。证据里同时记 CLI 版本与目标 antd 版本。

## 5. 推荐集成图

```text
产品设计影响
    → yss-design-system（项目 docs/design/*）
    → yss-prototype-stage
         ├─ 低保真 + prototype-review          （不依赖 CLI）
         ├─ Codex: product-design:index
         │    其它 Agent: 等价合同资产
         ├─ 事实层（可并行，不互为审批者）
         │    ├─ antd CLI --format json     【门禁仪器】
         │    ├─ antd MCP                   【可选 IDE】
         │    └─ 官方 antd skill            【可选本地手册】
         ├─ prototype-evidence.yaml
         └─ 浏览器验证
    → 用户确认后才 Spec 校准 / OpenAPI
```

`prototype`（Matt 抛开原型）保持在门禁外。高保真兼容入口继续立刻回到 `yss-prototype-stage`。

## 6. 明确不做

- 不把 `@ant-design/cli` 或官方 skill 挂进 `scripts/verify-template`。
- 不把 `antd` 加入 `yss-public-skills.json`。
- 不在本仓 root 执行会改 `AGENTS.md` / `.agents/skills` 的 `antd setup --mode skill|both`，也不跑 `--client github-actions --mode ci`。
- 不把 LLMs.txt 或 `design.md` 全文检入模板实例分发面（`docs/`）；项目实例各自存证据 JSON。
- 不引入图谱、向量检索或第二套设计系统 skill。

## 7. 资料清单

| 源 | 用途 |
|---|---|
| https://ant.design/docs/react/for-agents-cn | Agent 总入口与启动 prompt |
| https://ant.design/docs/react/for-agents-cn.md | 同上的 Markdown 原文 |
| https://ant.design/docs/react/design-md-cn | 官方 design.md 用途 |
| https://ant.design/docs/react/llms-cn | LLMs.txt / 单组件 `.md` |
| https://ant.design/docs/react/mcp-cn | MCP 工具、setup、社区备选 |
| https://ant.design/docs/react/cli-cn | CLI 命令与全局参数 |
| https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md | 官方唯一 skill |
| https://raw.githubusercontent.com/ant-design/ant-design-cli/main/package.json | 6.6.1、bin、files |
| https://www.npmjs.com/package/@ant-design/cli | setup 写入路径表 |
| `.agents/skills/yss-design-system/SKILL.md` | 本仓设计系统入口 |
| `.agents/skills/yss-prototype-stage/SKILL.md` | 本仓原型合同 |
| `docs/design/templates/prototype-evidence-template.yaml` | 已有 CLI 证据字段 |
| `docs/process/lifecycle-registry.yaml` | `gate.prototype-verified` |

抓取日：2026-08-23。CLI npm 版本以当时 `6.6.1` 为准；后续集成须重读 `antd -V` 与官方 skill raw，不沿用本笔记里的次版本号当门禁。
