# 故障排查

优先从 `doctor` 开始定位问题：

```bash
scripts/ysscomet doctor --json
npm --prefix packages/hermes-cli-ts run dev -- doctor --json
```

`status: pass` 表示通过；`warn` 表示可能影响部分能力；`fail` 表示需要处理，否则相关流程通常不可用。

## `doctor` 检查项

| code | 含义 | 处理建议 |
|------|------|----------|
| `STATE_FILE` | 找到并成功读取 state 文件。 | 无需处理。 |
| `STATE_MISSING` | 当前目录没有 `.comet.yaml`。 | 在项目根目录运行命令，或用 `scripts/ysscomet init-feature ...` 初始化 pipeline。 |
| `STATE_INVALID` | state 文件存在但格式或内容异常。 | 检查 YAML 格式；不要手工修改阶段状态。 |
| `DIR_DOCS_API` | `docs/api` 目录检查。 | warn 时创建目录或确认模板结构是否完整。 |
| `DIR_DOCS_PROCESS` | `docs/process` 目录检查。 | warn 时确认是否在项目根目录运行。 |
| `DIR_YSSCOMET` | `.ysscomet` 目录检查。 | 初始项目中 warn 可接受；运行阶段任务后通常会产生该目录。 |
| `SCRIPT_EXECUTABLE` | 关键脚本存在且可执行。 | fail 时执行 `chmod +x scripts/ysscomet scripts/comet-driver scripts/comet-guard.sh scripts/stage-executor`。 |
| `TOOL_OPENSPEC` | OpenSpec CLI 是否可用。 | fail 时安装 OpenSpec，或确认 PATH。 |
| `TOOL_SUPERPOWERS` | Superpowers skill 是否可用。 | fail 时安装 Superpowers，或设置 `YSSCOMET_SUPERPOWERS_PATH`。 |
| `BACKEND_STUB` | 内置 stub 后端。 | 应始终 pass。 |
| `BACKEND_CODEX` | `codex` CLI 是否可用。 | warn 时只能使用 `stub` 或其他可用后端。 |
| `BACKEND_HERMES` | `hermes` 或 `hermess` CLI 是否可用。 | warn 时确认 Hermes CLI 是否安装。 |
| `BACKEND_TRAE` | `trae` CLI 是否可用。 | warn 时确认 Trae CLI 是否安装。 |
| `BACKEND_QODER` | `qoder` CLI 是否可用。 | warn 时可忽略，除非要使用 qoder 后端。 |
| `BACKEND_CLAUDE_CODE` | `claude` 或 `claude-code` CLI 是否可用。 | warn 时可忽略，除非要使用 Claude Code 后端。 |
| `CODEGRAPH` | 项目存在 `.codegraph` 索引。 | 无需处理。 |
| `CODEGRAPH_MISSING` | 未配置 CodeGraph 索引。 | warn 可接受；需要符号级检索时再建立索引。 |
| `GIT_DIRTY` | git 工作区存在未提交改动。 | warn 可接受；交付前确认改动来源。 |

## 常见问题

### 状态文件缺失

现象：

```json
{"code": "STATE_MISSING", "status": "warn"}
```

处理：

```bash
pwd
scripts/ysscomet init-feature demo-feature --title "Demo Feature" --sprint "Sprint 1"
scripts/ysscomet status demo-feature
```

如果你在子目录运行命令，请回到项目根目录，或显式传入：

```bash
scripts/ysscomet --state /path/to/project/.comet.yaml status demo-feature
```

### 阶段推进失败

现象：

```bash
scripts/ysscomet advance demo-feature
```

返回 guard fail，或者 `.comet.yaml` 中当前阶段变为 blocked。

处理：

```bash
scripts/ysscomet status demo-feature --json
scripts/ysscomet next demo-feature
```

根据 `risks` 和 `nextAction` 补齐当前阶段 artifact，然后重新推进：

```bash
scripts/ysscomet run demo-feature
scripts/ysscomet advance demo-feature
```

### artifact 绑定到其他 pipeline

现象：

- guard 输出包含 `spec-bound`、`tests-bound` 或类似绑定检查失败。
- `status --json` 中 artifact `bound` 为 `false`。

原因：产物文件头部的 `pipeline: <id>` 与当前 pipeline 不一致。

处理：打开对应 artifact，确认 front matter 或文件头包含正确 pipeline：

```yaml
---
pipeline: demo-feature
stage: open
status: draft
owner: ai
---
```

不要复制其他 pipeline 的产物直接复用。

### 后端 CLI 缺失

现象：

```json
{"code": "BACKEND_TRAE", "status": "warn", "message": "missing"}
```

处理：

- 如果只是跑通流程，使用默认 `stub`：

  ```bash
  scripts/ysscomet run demo-feature --backend stub
  ```

- 如果要使用真实后端，先安装对应 CLI 并确认 PATH：

  ```bash
  which codex
  which hermes
  which trae
  ```

### TS shell 找不到 Python core

现象：

- `npm --prefix packages/hermes-cli-ts run dev -- doctor --json` 报 `No module named hermes_lifecycle.rpc`。

处理：

1. 确认从仓库根目录执行命令。
2. 确认 `packages/hermes-cli-ts/src/bridge/pythonBridge.ts` 会把仓库根目录加入 `PYTHONPATH`。
3. 手动验证 RPC：

   ```bash
   echo '{"id":"doctor-1","method":"doctor","params":{"root":"."}}' | python -m hermes_lifecycle.rpc
   ```

4. 如果使用非默认 Python，确认该 Python 能读取当前仓库源码。

### `.ysscomet` 目录 warn

现象：

```json
{"code": "DIR_YSSCOMET", "status": "warn"}
```

处理：初始模板中可以忽略。运行阶段任务后会生成相关目录：

```bash
scripts/ysscomet run demo-feature
```

### `GIT_DIRTY` warn

现象：

```json
{"code": "GIT_DIRTY", "status": "warn", "message": "19"}
```

处理：这不阻塞本地使用，但在交付前需要确认：

```bash
git status --short
```

不要用 `git reset --hard` 直接清理，除非确认所有改动都可丢弃。

## warn 和 fail 如何判断

通常可以忽略的 warn：

- `DIR_YSSCOMET`：初始项目尚未运行阶段任务。
- `CODEGRAPH_MISSING`：不需要符号索引时。
- 未使用后端的 `BACKEND_*`：例如不用 `trae` 时可忽略 `BACKEND_TRAE`。
- `GIT_DIRTY`：开发中常见，但交付前要确认。

通常必须处理的 fail：

- `STATE_INVALID`
- `SCRIPT_EXECUTABLE`
- `TOOL_OPENSPEC`
- `TOOL_SUPERPOWERS`
- 当前要使用后端对应的 `BACKEND_*`
