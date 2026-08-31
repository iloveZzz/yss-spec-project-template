# CLI 命令矩阵

运行时入口：已安装的 `antd`，或 `npx -y @ant-design/cli`。记录实际 CLI 版本。知识查询必须带 `--format json`、`--lang zh` 和同一 `<target_antd_version>`。

官方命令说明：https://ant.design/docs/react/cli-cn

## 允许（原型 / 设计事实）

| 命令 | 用途 |
|---|---|
| `antd design.md --version <target_antd_version> --lang zh --format json` | 上游默认 Light 主题。只对 antd v6 发布 |
| `antd list --version <target_antd_version> --format json` | 组件选型 |
| `antd info <Component> --version <target_antd_version> --format json` | props / 类型 / 默认值 |
| `antd demo <Component> [name] --version <target_antd_version> --format json` | 可运行 demo 源码（React/TSX） |
| `antd token <Component> --version <target_antd_version> --format json` | 组件或全局 token |
| `antd semantic <Component> --version <target_antd_version> --format json` | `classNames` / `styles` 结构 |
| `antd doc <Component> --version <target_antd_version> --lang zh --format json` | 需要完整文档时 |
| `antd changelog <v1> <v2> [Component] --format json` | 仅当版本差异影响当前决策 |

`design.md` 对 v5 返回 `UNSUPPORTED_VERSION_FEATURE`。空仓库不传 `--version` 时的回退版本不要假设；必须写进证据。

## 条件允许

| 命令 | 条件 |
|---|---|
| `antd lint <tsx-or-src> --format json` | 产物是 React/TSX 源码。HTML 原型不得当作通过 |
| `antd doctor` / `antd usage` / `antd migrate` | 仅已登记的 React + `antd` 实现仓 |
| `antd env --format json` | 排障需要环境快照时 |

## 默认禁止

| 命令 | 原因 |
|---|---|
| `antd setup` | 会写入 `.agents/skills/antd` 和 `AGENTS.md`，绕过 `skills-lock.json` |
| `npx skills add ant-design/ant-design-cli` | 同上，安装官方 skill |
| `antd bug` / `antd bug-cli` | 与 YSS Ticket 无关。保持 `ANTD_NO_AUTO_REPORT=1` |
| `antd upgrade` | 不得在模板源或未授权时改动全局 CLI |
| `antd mcp` 作为证据采集 | MCP 调用默认不落盘，见 `boundaries.md` |
