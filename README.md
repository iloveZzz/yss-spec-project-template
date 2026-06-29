# [项目名称]

> [一句话描述]

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
│   ├── comet-guard.sh       ← 门禁脚本
│   ├── comet-driver         ← 状态机驱动器 (规范待实现)
│   └── metrics-collector    ← 度量采集器 (规范待实现)
├── metrics/                 ← 度量事件流 + Sprint 快照 (规范待实现)
└── .hermes/                 ← Hermes Agent 配置
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
