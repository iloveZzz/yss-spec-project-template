# YSS UI MCP 接入

模板已为支持项目级 MCP 配置的客户端预置 `yss-ui` server：

- Claude Code：`.mcp.json`
- Antigravity：`.agents/mcp_config.json`
- Cursor：`.cursor/mcp.json`
- VS Code：`.vscode/mcp.json`

这些配置统一通过 `npx -y @yss-ui/mcp` 启动，不写用户主目录，也不覆盖个人全局配置。首次加载模板后，重启或刷新对应客户端即可发现 MCP。

## Codex 等全局配置客户端

需要写入用户级配置的客户端不由模板自动修改。以 Codex 为例，由使用者明确执行：

```bash
npx -y @yss-ui/mcp install codex
```

其他客户端的安装参数以 `@yss-ui/mcp` 当前 CLI 帮助为准。模板只提供说明，不替用户修改 `~/.codex/config.toml` 等全局文件。

## 使用门禁

生成或审查 YSS UI 页面时：

1. 先调用 `get_codegen_rules` 获取当前代码生成约束。
2. 不确定组件导出时调用 `list_components`。
3. 配置组件、Hook 或 Utils 前调用 `get_component_docs`。
4. 复杂场景调用 `get_demo`；无法确定归属时调用 `search_docs`。

本次模板验证基线为 `@yss-ui/mcp@0.1.8`、YSS UI components `1.5.18`，MCP 对外提供 7 个工具。运行时返回值与项目 lockfile 仍优先于本文快照；MCP 不可用时，按 `AGENTS.md` 读取 `llms-full.txt`，并明确记录降级原因。

## 快速自检

客户端中至少确认以下结果：

- `list_components` 能返回 YSS UI 组件清单。
- `get_codegen_rules` 能返回当前生成规则。
- 查询 `YTable` 时，`get_component_docs` 能返回对应文档。

MCP 无法启动时，先确认 Node.js、`npx` 和网络/私有源访问，再直接运行 `npx -y @yss-ui/mcp` 查看启动错误；不要把 Registry 认证内容写入日志或提交到仓库。
