# YSS Spec Project Template

> OpenSpec × Superpowers 驱动的 AI 研发文档模板。

## 定位

本模板只保留流程文档、契约模板和 Agent 协作约定。已移除 Comet、YSSComet、Hermes、本地 lifecycle runtime、CLI、Python core、TS shell、`.comet.yaml`、`.ysscomet` 和测试套件。

## 项目结构

```text
├── AGENTS.md                ← AI 指令
├── docs/
│   ├── api/                 ← OpenAPI / OpenSpec 契约
│   ├── adr/                 ← 架构决策记录
│   ├── requirements/        ← PRD / 用户故事 / 需求草案
│   ├── discovery/           ← 头脑风暴与发现阶段材料
│   ├── architecture/        ← 技术方案与架构审查模板
│   ├── testing/             ← 测试策略
│   ├── agents/              ← Engineering Skills 配置与维护
│   ├── templates/           ← 通用文档模板
│   └── process/             ← PDCA / OpenSpec / Superpowers 流程说明
└── metrics/                 ← 项目按需生成的度量产物
```

## Quickstart

1. 使用 `grill-with-docs` 澄清需求，并按 `docs/templates/prd-template.md` 形成 PRD。
2. 如有 API 影响，先在 `docs/api/specs/` 更新 OpenAPI 3.1 契约。
3. 使用 `docs/templates/vertical-slice-issue-template.md` 拆分可独立验证的垂直切片 Issue。
4. 实现时默认使用 TDD；Bug 修复先建立 `diagnosing-bugs` 反馈闭环。
5. 在 `docs/architecture/`、`docs/adr/` 和 `CONTEXT.md` 沉淀架构与领域决策。

## 关键文档

| 文档 | 内容 |
|------|------|
| [AGENTS.md](./AGENTS.md) | 全局 AI 指令 + 编码规范 + Agent 协作 |
| [docs/user-guide/README.md](./docs/user-guide/README.md) | 模板使用说明 |
| [docs/process/PDCA-SCRUM.md](./docs/process/PDCA-SCRUM.md) | PDCA × Scrum × AI |
| [docs/process/OPENSPEC-SUPERPOWERS-COMPOSITION.md](./docs/process/OPENSPEC-SUPERPOWERS-COMPOSITION.md) | OpenSpec 与 Superpowers 协作方式 |
| [docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md](./docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md) | Matt Pocock Engineering Skills 集成与使用 |
| [docs/agents/skills-maintenance.md](./docs/agents/skills-maintenance.md) | Codex / Hermes skills 安装与维护 |
| [docs/discovery/IDEATION.md](./docs/discovery/IDEATION.md) | 头脑风暴方法论 |
| [docs/architecture/README.md](./docs/architecture/README.md) | 架构设计 + 审查清单 |
| [docs/testing/README.md](./docs/testing/README.md) | 测试策略 |

## 核心模板

| 模板 | 用途 |
|------|------|
| [docs/templates/prd-template.md](./docs/templates/prd-template.md) | PRD，包含 OpenAPI 影响、测试决策、AI / 人工审查点 |
| [docs/templates/vertical-slice-issue-template.md](./docs/templates/vertical-slice-issue-template.md) | 垂直切片 Issue |
| [docs/templates/agent-brief-template.md](./docs/templates/agent-brief-template.md) | `triage` 产出的 Agent Brief |
| [docs/architecture/templates/architecture-deepening-template.md](./docs/architecture/templates/architecture-deepening-template.md) | 架构 deepening 候选与 seam 设计 |
