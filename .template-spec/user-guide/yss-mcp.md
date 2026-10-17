# yss MCP 只读工具

支持 MCP 的客户端可以把 `yss mcp` 注册为项目级 server，直接调用治理查询与核验，不必拼命令行参数。

## 先核对能力

当前固定的 `yss` 不一定带这项能力。先运行：

```bash
yss capabilities --json
```

结果的 `native` 中有 `mcp-stdio-read-only-v1` 才可注册；没有时继续使用命令行，不要注册一个无法启动的 server。模板在固定 CLI 升级到带此能力的版本后，再统一预置项目级配置。

## 注册

以 Claude Code 的项目级 `.mcp.json` 为例（其他客户端写入各自的项目级 MCP 配置，结构相同）：

```json
{"mcpServers": {"yss": {"command": "yss", "args": ["mcp", "--root", "."]}}}
```

`--root` 在启动时固定；工具参数不能改写项目根。

## 可用工具

| 工具 | 对应命令 |
|---|---|
| `lifecycle_route` | `yss lifecycle route --view agent` |
| `verify_daily` | `yss lifecycle verify-daily` |
| `lifecycle_status` | `yss lifecycle status --view agent` |
| `lifecycle_query` | `yss lifecycle query --view agent` |
| `context_query` | `yss context query --view agent` |
| `contract_view` | `yss contract view --kind slice` |
| `explain` | `yss explain` |
| `check` | `yss check` |
| `verify_gate` | `yss verify --gate` |

结果与命令行同一 JSON envelope；失败时 `isError` 为真，逐项诊断在 envelope 的 `result` 中。全部工具只读：不写文件、不创建批准、不提交或推送，也不授予实现、合并或发布资格。需要写入的动作（init、sync、stage apply、git 等）仍在命令行按原授权执行。
