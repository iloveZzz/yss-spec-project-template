# Hermes CLI 渐进式架构

Hermes CLI 采用渐进式双层架构：Python 保留为稳定能力层，TypeScript 作为可选交互式 shell。现阶段先跑通一个最小垂直切片，后续再逐步把交互体验迁移到 TS shell。

## 分层

```text
TypeScript shell
  packages/hermes-cli-ts
  - 命令解析
  - React + Ink 终端 UI
  - hermes / codex / trae 多入口品牌化
  - 后续可承载 agent 会话、MCP 管理、插件入口

JSON RPC bridge
  python -m hermes_lifecycle.rpc
  - stdin 接收 JSON line
  - stdout 返回 JSON line
  - 保持跨语言调用简单、可测试、易调试

Python core
  hermes_lifecycle.commands
  - 生命周期能力
  - 环境检查
  - 项目状态、guard、harness、metrics 等既有逻辑
```

## 当前垂直切片

第一个落地命令是 `doctor`。同一套 shell 可以通过 `hermes`、`codex`、`trae` 三个 bin 启动，并根据启动名切换命令名与 Ink 标题：

```text
hermes|codex|trae doctor
  -> packages/hermes-cli-ts/src/shellBrand.ts
  -> packages/hermes-cli-ts/src/commands/doctor.tsx
  -> packages/hermes-cli-ts/src/ui/DoctorView.tsx
  -> packages/hermes-cli-ts/src/bridge/pythonBridge.ts
  -> python -m hermes_lifecycle.rpc
  -> hermes_lifecycle.commands.doctor.doctor()
  -> ysscomet_lifecycle.inspector.collect_doctor()
```

RPC 请求示例：

```json
{"id":"doctor-1","method":"doctor","params":{"root":"/path/to/project"}}
```

RPC 返回示例：

```json
{"id":"doctor-1","ok":true,"result":{"checks":[]}}
```

## 迁移规则

- 新能力优先落在 `hermes_lifecycle.commands`，让 Python CLI、TS shell、测试都能复用。
- `scripts/ysscomet` 和 `scripts/hermes` 保持兼容，不在一次迁移中重写。
- TS shell 不复制业务逻辑，只负责命令体验、交互式展示和调用 bridge。
- TS shell 的非 JSON 输出优先用 React + Ink 组件实现；`--json` 保持纯 stdout，便于脚本和 CI 使用。
- 多品牌入口共享同一套实现，差异只放在 `shellBrand.ts`，避免为 Codex、Trae 复制命令逻辑。
- 每迁移一个命令，先补 Python RPC 测试，再补 TS shell 骨架测试。

## 下一批候选命令

建议按低风险到高价值顺序迁移：

1. `doctor`：已落地，验证环境检查链路。
2. `status --json`：输出结构化快照，适合 shell 展示。
3. `next --json`：支撑交互式“下一步建议”。
4. `run`：需要处理长任务、日志和错误透传。
5. `agent`：未来交互式 Agent 模式入口。
