# 边界与官方资料

官方文档只提供 React `antd` 事实，不提供 YSS 阶段合同。入口对照：

| 官方资料 | 本技能用法 |
|---|---|
| https://ant.design/docs/react/for-agents-cn | 了解 CLI / skill / MCP / LLMs 分层。不要把其中的 “安装 skill” prompt 写进 `AGENTS.md` |
| https://ant.design/docs/react/cli-cn | 命令与参数的权威说明 |
| https://ant.design/docs/react/design-md-cn | 上游 `design.md` 定位。项目覆盖是 `docs/design/design.md` |
| https://ant.design/docs/react/mcp-cn | MCP 是 IDE 加速，8 个知识工具不含 `lint` |
| https://ant.design/docs/react/llms-cn | CLI 不可用时的降级目录。不要默认注入 `llms-full.txt` |
| https://ant.design/design.md | 与 `antd design.md` 同一份 v6 上游默认 |

## 与其他技能

- `yss-prototype-stage`：阶段顺序、评审、浏览器验证、用户确认。本技能只回写 AntD 事实段。
- `yss-design-system`：项目风格与 token 规范。本技能查询上游事实，不得改项目 token。
- `product-design:index`：Codex 视觉产出。本技能不替代它，也不使用 `antd-page-generator`。
- `yss-ui`：前端代码落地的唯一 UI 入口。进入实现后不得再查本技能或 `@ant-design/cli` 的 React API。
- 官方 `antd` skill：不安装、不锁定、不投影。

## MCP 与 LLMs.txt

开发者本机可以运行 `npx -y @ant-design/cli mcp --version <target_antd_version> --lang zh`，但：

- 不把 `.cursor/mcp.json` 提交为模板默认。
- 不把 MCP 调用记录当成 `evidence.antd-cli-validation`。
- `antd-page-generator` 不是原型阶段入口。

CLI 不可用时，可用 `https://ant.design/llms.txt` 定位单组件 `.md`，并在证据里写明降级原因。恢复 CLI 后补 JSON 落盘。
