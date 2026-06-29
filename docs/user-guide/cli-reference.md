# CLI 参考手册

本文档记录当前已实现的命令。稳定主入口是 `scripts/ysscomet`；`packages/hermes-cli-ts` 是可选的 React + Ink shell，目前只承诺 `doctor`。

## `scripts/ysscomet`

全局参数：

| 参数 | 说明 |
|------|------|
| `--state STATE` | 指定 Comet 状态文件，默认 `.comet.yaml`。 |
| `-h, --help` | 查看帮助。 |

### `init-feature`

用途：创建一条 feature pipeline。

参数：

| 参数 | 说明 |
|------|------|
| `pipeline` | pipeline id，例如 `demo-feature`。 |
| `--title` | 可选标题。 |
| `--sprint` | Sprint 名称，默认 `Sprint 1`。 |

示例：

```bash
scripts/ysscomet init-feature demo-feature --title "Demo Feature" --sprint "Sprint 1"
```

典型输出：

```text
Initialized feature demo-feature
```

常见失败原因：

- `.comet.yaml` 不可写。
- pipeline id 与已有 pipeline 冲突。

### `run`

用途：执行当前阶段，调用 backend 生成 artifact。

参数：

| 参数 | 说明 |
|------|------|
| `pipeline` | pipeline id。 |
| `stage` | 可选；如果提供，必须与当前阶段一致。 |
| `--backend` | 指定后端，例如 `stub`、`codex`、`hermes`、`trae`。 |

示例：

```bash
scripts/ysscomet run demo-feature
scripts/ysscomet run demo-feature open --backend stub
scripts/ysscomet run demo-feature --backend codex
```

典型输出：

```text
success
```

常见失败原因：

- 请求的 `stage` 与 `.comet.yaml` 当前阶段不一致。
- 指定后端 CLI 不存在。
- 后端没有写入 `YSSCOMET_TASK_OUTPUT_PATH`。
- artifact 缺少 `pipeline: <id>` 标识。

### `advance`

用途：运行 guard，并在检查通过后推进到下一阶段。

参数：

| 参数 | 说明 |
|------|------|
| `pipeline` | pipeline id。 |

示例：

```bash
scripts/ysscomet advance demo-feature
```

典型输出：JSON guard 结果和阶段推进信息。

常见失败原因：

- 当前阶段 artifact 不存在。
- artifact 绑定的是其他 pipeline。
- build 阶段缺少测试产物。
- verify 阶段缺少 review 产物。

### `status`

用途：查看 pipeline 当前状态；不提供 pipeline 时显示 dashboard。

参数：

| 参数 | 说明 |
|------|------|
| `pipeline` | 可选 pipeline id。 |
| `--json` | 输出结构化快照。 |

示例：

```bash
scripts/ysscomet status
scripts/ysscomet status demo-feature
scripts/ysscomet status demo-feature --json
```

典型 JSON 字段：

| 字段 | 说明 |
|------|------|
| `pipeline` | pipeline id。 |
| `current_stage` | 当前阶段。 |
| `artifacts` | 各阶段产物存在性和绑定状态。 |
| `risks` | 当前风险。 |
| `nextAction` | 推荐下一步命令。 |

常见失败原因：

- pipeline 不存在。
- 指定的 state 文件不存在或格式异常。

### `next`

用途：推荐下一条命令，不修改状态。

参数：

| 参数 | 说明 |
|------|------|
| `pipeline` | pipeline id。 |
| `--json` | 输出结构化推荐结果。 |

示例：

```bash
scripts/ysscomet next demo-feature
scripts/ysscomet next demo-feature --json
```

典型输出：

```text
scripts/ysscomet run demo-feature
spec artifact is missing or unbound
```

常见失败原因：

- pipeline 不存在。
- state 文件不可读。

### `history`

用途：查看 pipeline 阶段推进历史。

参数：

| 参数 | 说明 |
|------|------|
| `pipeline` | pipeline id。 |

示例：

```bash
scripts/ysscomet history demo-feature
```

常见失败原因：

- pipeline 不存在。
- 历史记录为空时输出较少，这是正常情况。

### `dashboard`

用途：列出所有 pipeline 的当前阶段、Sprint 和 guard 状态。

示例：

```bash
scripts/ysscomet dashboard
```

典型输出：

```text
YSSComet Lifecycle Dashboard
============================
demo-feature             stage=open     sprint=Sprint 1     guard=-
```

常见失败原因：

- state 文件不存在或格式异常。

### `doctor`

用途：检查本地环境。

参数：

| 参数 | 说明 |
|------|------|
| `--json` | 输出结构化检查结果。 |

示例：

```bash
scripts/ysscomet doctor
scripts/ysscomet doctor --json
```

典型检查项：

- `STATE_FILE` / `STATE_MISSING`
- `DIR_DOCS_API`
- `SCRIPT_EXECUTABLE`
- `TOOL_OPENSPEC`
- `TOOL_SUPERPOWERS`
- `BACKEND_STUB`
- `BACKEND_CODEX`
- `BACKEND_HERMES`
- `BACKEND_TRAE`
- `CODEGRAPH_MISSING`
- `GIT_DIRTY`

解释和处理方式见 [troubleshooting.md](./troubleshooting.md)。

### `collect-metrics`

用途：收集 Comet 事件并生成 Sprint 快照。

示例：

```bash
scripts/ysscomet collect-metrics
```

典型输出：

```text
Collected 1 events
```

常见失败原因：

- `.comet.yaml` 不存在。
- `metrics/` 目录不可写。

## TypeScript interactive shell

TS shell 位于 `packages/hermes-cli-ts`，使用 React + Ink 构建终端 UI。当前已实现 `doctor`。

开发态运行：

```bash
npm --prefix packages/hermes-cli-ts install
npm --prefix packages/hermes-cli-ts run dev -- --help
npm --prefix packages/hermes-cli-ts run dev -- doctor
npm --prefix packages/hermes-cli-ts run dev -- doctor --json
```

当前 help：

```text
Usage: hermes [options] [command]

Hermes interactive CLI shell

Commands:
  doctor [options]  Check local YSSComet environment through the Python core
```

### `hermes` / `codex` / `trae`

发布后 `package.json` 会暴露三个 bin：

```text
hermes -> dist/index.js
codex  -> dist/index.js
trae   -> dist/index.js
```

三者共享同一套命令和 Python RPC，只根据启动名切换 CLI name 和 Ink 标题。

当前支持：

```bash
hermes doctor
codex doctor
trae doctor
```

当前不承诺：

- `hermes status`
- `codex next`
- `trae run`

这些命令属于后续 roadmap，尚未实现为 TS shell 命令。
