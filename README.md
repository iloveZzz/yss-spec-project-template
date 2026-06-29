# YSSComet Project Template

> OpenSpec × Comet × Superpowers 驱动的 AI 研发流程模板。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | [FastAPI / Express / ...] |
| 前端 | [React / Vue / ...] |
| 测试 | [pytest / Vitest / ...] |
| 部署 | [Docker / K8s / ...] |

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
├── metrics/                 ← 度量事件流 + Sprint 快照 (规范待实现)
└── .ysscomet/               ← YSSComet 阶段产物
```

---

## 关键文档

| 文档 | 内容 |
|------|------|
| [AGENTS.md](./AGENTS.md) | 全局 AI 指令 + 编码规范 + Agent 协作 |
| [docs/process/PDCA-SCRUM.md](./docs/process/PDCA-SCRUM.md) | PDCA × Scrum × AI |
| [docs/process/COMET.md](./docs/process/COMET.md) | Comet 状态机桥接层（概念） |
| [docs/process/COMET-STATE-SPEC.md](./docs/process/COMET-STATE-SPEC.md) | Comet 状态机驱动器实现规范 |
| [docs/process/HARNESS-ADAPTER-SPEC.md](./docs/process/HARNESS-ADAPTER-SPEC.md) | Harness 多后端适配器规范（codex/claude/hermes/opencode） |
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
scripts/ysscomet history demo-feature
scripts/ysscomet dashboard
scripts/ysscomet doctor
scripts/ysscomet collect-metrics
```

标准工作流：

```text
init-feature -> run stage -> advance -> repeat -> archive
```

Comet 是唯一状态源。Agent 或 harness 只能生成 artifacts，不能直接推进阶段。

真实后端通过 CLI contract 接入：执行时会收到 `YSSCOMET_TASK_*` 环境变量，并必须把产物写入 `YSSCOMET_TASK_OUTPUT_PATH`，文件中必须包含 `pipeline: <id>`。兼容期内仍会同时提供旧的 `HERMES_TASK_*` 环境变量。

真实执行示例：

```bash
scripts/ysscomet run demo-feature --backend codex
```

底层入口保留给调试和自动化：`scripts/comet-driver`、`scripts/comet-guard.sh`、`scripts/stage-executor`、`scripts/metrics-collector`。日常使用优先从 `scripts/ysscomet` 开始；`scripts/hermes` 仅作为兼容旧入口保留。
