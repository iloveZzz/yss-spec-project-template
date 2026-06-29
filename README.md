# YSS Spec Project Template

> OpenSpec × Comet × Superpowers 驱动的 AI 研发流程模板。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | [FastAPI / Express / ...] |
| 前端 | [React / Vue / ...] |
| 测试 | [pytest / Vitest / ...] |
| 部署 | [Docker / K8s / ...] |

## 默认工具依赖

YSSComet 默认要求本机已安装并可用：

- [OpenSpec](https://github.com/Fission-AI/OpenSpec)：契约与 spec 生命周期工具，`doctor --json` 检查 `openspec` CLI。
- [Superpowers](https://github.com/obra/superpowers)：TDD / review / debugging 等方法论技能，`doctor --json` 检查本机或项目级 Superpowers skill。

---

## 四层研发自动化体系

| Layer | 组件 | 职责 |
|-------|------|------|
| 4 | **OpenSpec** — `docs/api/` | 前后端 Agent 共同契约 |
| 3 | **Comet** — `.comet.yaml` + `comet-guard.sh` | Open→Design→Build→Verify→Archive |
| 2 | **Superpowers** — spike/plan/tdd/review/debug/simplify | Agent 协作模式 |
| 1 | **PDCA × Scrum** — Ideation→Sprint→Daily→Review→Retro | 流程管理 |

---

## 全流程阶段

```
Ideation → Discovery → Requirements → Architecture → Build → Verify → Deploy → Ops
(头脑风暴)  (发现验证)    (需求收敛)    (架构设计)    (编码)   (测试)    (部署)   (运维)
```

---

## Comet 流水线

| Pipeline | Sprint | 状态 |
|----------|--------|------|
| _(待创建)_ | | |

---

## 项目结构

```
├── .comet.yaml              ← Comet 状态机
├── AGENTS.md                ← AI 指令 (所有 Agent 必读)
├── docs/
│   ├── api/                 ← OpenSpec 契约
│   ├── adr/                 ← 架构决策记录
│   ├── requirements/        ← 需求阶段
│   ├── discovery/           ← 头脑风暴 + 发现阶段
│   ├── architecture/        ← 技术方案 + 39项审查清单
│   ├── testing/             ← 测试策略
│   └── process/             ← PDCA-SCRUM + COMET + 三份实现规范
├── scripts/
│   ├── ysscomet             ← 生命周期 CLI
│   ├── hermes               ← 兼容旧入口，转发到 ysscomet
│   ├── comet-driver         ← Comet 状态机驱动器
│   ├── comet-guard.sh       ← JSON 门禁脚本
│   ├── stage-executor       ← 阶段执行器
│   └── metrics-collector    ← 度量采集器
├── packages/
│   └── hermes-cli-ts/       ← 可选 TypeScript interactive shell
├── metrics/                 ← 度量事件流 + Sprint 快照 (规范待实现)
└── .ysscomet/               ← YSSComet 阶段产物
```

---

## 关键文档

| 文档 | 内容 |
|------|------|
| [docs/user-guide/README.md](./docs/user-guide/README.md) | 使用手册：概念、从零开始、后端选择 |
| [docs/user-guide/cli-reference.md](./docs/user-guide/cli-reference.md) | CLI 参考：`ysscomet` 与 TS interactive shell 命令 |
| [docs/user-guide/troubleshooting.md](./docs/user-guide/troubleshooting.md) | 故障排查：`doctor --json` 检查项和常见问题 |
| [docs/development/cli-extension-guide.md](./docs/development/cli-extension-guide.md) | 开发者指南：新增 Python core + React/Ink TS shell 命令 |
| [AGENTS.md](./AGENTS.md) | 全局 AI 指令 + 编码规范 + Agent 协作 |
| [docs/process/PDCA-SCRUM.md](./docs/process/PDCA-SCRUM.md) | PDCA × Scrum × AI |
| [docs/process/COMET.md](./docs/process/COMET.md) | Comet 状态机桥接层（概念） |
| [docs/process/COMET-STATE-SPEC.md](./docs/process/COMET-STATE-SPEC.md) | Comet 状态机驱动器实现规范 |
| [docs/process/HARNESS-ADAPTER-SPEC.md](./docs/process/HARNESS-ADAPTER-SPEC.md) | Harness 多后端适配器规范（codex/claude/hermes/opencode） |
| [docs/process/HERMES-CLI-ARCHITECTURE.md](./docs/process/HERMES-CLI-ARCHITECTURE.md) | Python core + TypeScript shell 渐进式 CLI 架构 |
| [docs/process/METRICS-LAYER-SPEC.md](./docs/process/METRICS-LAYER-SPEC.md) | 度量层规范（loop engineering 数据层） |
| [docs/discovery/IDEATION.md](./docs/discovery/IDEATION.md) | 头脑风暴方法论 |
| [docs/architecture/README.md](./docs/architecture/README.md) | 架构设计 + 39项审查清单 |
| [docs/testing/README.md](./docs/testing/README.md) | 测试策略 + 质量门禁 |

---

## Quickstart

```bash
# 1. 创建 feature pipeline
scripts/ysscomet init-feature demo-feature --title "Demo Feature" --sprint "Sprint 1"

# 2. 生成当前阶段产物。默认使用内置 stub，适合先跑通流程
scripts/ysscomet run demo-feature

# 3. 通过 Comet 门禁推进阶段
scripts/ysscomet advance demo-feature
```

需要更多信息时再展开：

```bash
scripts/ysscomet status demo-feature
scripts/ysscomet status demo-feature --json
scripts/ysscomet next demo-feature
scripts/ysscomet next demo-feature --json
scripts/ysscomet history demo-feature
scripts/ysscomet dashboard
scripts/ysscomet doctor
scripts/ysscomet doctor --json
scripts/ysscomet collect-metrics
```

可选 TypeScript shell 使用 React + Ink 构建终端 UI，先落地 `doctor` 垂直切片，用于验证 TS 入口调用 Python core。同一套实现会发布 `hermes`、`codex`、`trae` 三个 bin，按启动名切换展示品牌：

```bash
npm --prefix packages/hermes-cli-ts install
npm --prefix packages/hermes-cli-ts run dev -- doctor --json
```

底层 RPC 可单独调试：

```bash
echo '{"id":"doctor-1","method":"doctor","params":{"root":"."}}' | python -m hermes_lifecycle.rpc
```

标准工作流：

```text
init-feature -> run stage -> advance -> repeat -> archive
```

Comet 是唯一状态源。Agent 或 harness 只能生成 artifacts，不能直接推进阶段。

## 可恢复工作流

YSSComet 会从 `.comet.yaml`、阶段产物和 guard 结果生成只读快照。`status --json` 返回当前阶段、产物状态、风险列表和 `nextAction`；`next` 只推荐下一条命令，不修改状态；`doctor --json` 检查状态文件、工作目录、脚本权限、后端 CLI、CodeGraph 和 git dirty 状态。

项目级运行配置可放在 `.ysscomet/config.yaml`：

```yaml
auto_transition: false
context_compression: off
default_backend: stub
required_tools: openspec,superpowers
```

`design -> build` 门禁通过后会生成 `.ysscomet/handoff/<pipeline>/design_build.json`，记录 spec/plan 路径与 SHA256，用于后续 Build 阶段恢复上下文。

真实后端通过 CLI contract 接入：执行时会收到 `YSSCOMET_TASK_*` 环境变量，并必须把产物写入 `YSSCOMET_TASK_OUTPUT_PATH`，文件中必须包含 `pipeline: <id>`。兼容期内仍会同时提供旧的 `HERMES_TASK_*` 环境变量。

真实执行示例：

```bash
scripts/ysscomet run demo-feature --backend codex
```

底层入口保留给调试和自动化：`scripts/comet-driver`、`scripts/comet-guard.sh`、`scripts/stage-executor`、`scripts/metrics-collector`。日常使用优先从 `scripts/ysscomet` 开始；`scripts/hermes` 仅作为兼容旧入口保留。
