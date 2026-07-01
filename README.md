# YSS Spec Project Template

> OpenSpec × Superpowers × YSS 驱动的 AI 研发文档模板。

## 定位

本模板只保留流程文档、契约模板和 Agent 协作约定。

## 项目结构

```text
├── .claude/                 ← Claude commands + OpenSpec / Comet skills
├── .codex/                  ← Codex 项目级 OpenSpec skills
├── .hermes/                 ← Hermes 项目级 OpenSpec / Comet skills
├── .pi/                     ← PI prompts + OpenSpec skills
├── .trae/                   ← Trae 项目级 OpenSpec skills
├── AGENTS.md                ← AI 指令
├── docs/
│   ├── api/                 ← OpenAPI / OpenSpec 契约
│   ├── adr/                 ← 架构决策记录
│   ├── requirements/        ← PRD / 用户故事 / 需求草案
│   ├── discovery/           ← 头脑风暴与发现阶段材料
│   ├── architecture/        ← 技术方案与架构审查模板
│   ├── testing/             ← 测试策略
│   ├── agents/              ← Agent 协作规范、Issue/Triage/领域文档约定
│   ├── templates/           ← 通用文档模板
│   └── process/             ← PDCA / OpenSpec / Superpowers 流程说明
├── openspec/                ← OpenSpec 配置
└── scripts/                 ← 模板轻量校验脚本
```

项目需要生成度量、OpenSpec changes 或其他临时产物时再按需创建对应目录。

## Quickstart

1. 先判断当前生命周期阶段、已有资产和缺失资产；建议用 `yss-product-lifecycle` 做阶段路由。
2. 新产品或新模块先完成机会探索；已有材料时先整理 discovery，再进入 `grill-with-docs`。
3. 新产品或新业务域先明确业务架构，再使用 `grill-with-docs` 澄清边界。
4. 按 `docs/templates/prd-template.md` 形成 PRD，并同步明确功能架构、模块边界和 MVP / 非目标范围。
5. 如有 API 影响，先在 `docs/api/specs/` 生成 OpenAPI 3.1 Draft。
6. 后端新服务或新模块先确认 YSS DDD 工程基线；从零创建服务时使用 `yss-ddd-scaffold-generator`。
7. 用系统总体架构、数据架构（如适用）、OpenSpec / Comet design 校验行为规格、领域边界和契约，设计审查通过后 Freeze OpenAPI。
8. 使用 `docs/templates/vertical-slice-issue-template.md` 拆分可独立验证的垂直切片 Issue。
9. 业务行为实现默认使用 TDD：先写失败测试，再写最小实现；生成代码、配置或一次性原型需说明例外和验证方式；Bug 修复先建立 `diagnosing-bugs` 反馈闭环。
10. 每个切片完成后做独立审查和 fresh verification，再发布、实施和复盘。
11. 在 `docs/architecture/`、`docs/adr/`、`CONTEXT.md` 和 `AGENTS.md` 沉淀稳定规则。

## 模板配置取舍

本模板纳入 `.claude/`、`.codex/`、`.hermes/`、`.pi/`、`.trae/`，因为它们是跨 Agent 复用 OpenSpec / Comet 流程的项目级配置。Hermes 的 Engineering Skills 仍按本机安装目录维护，见 `docs/agents/skills-maintenance.md`。

## 轻量校验

```bash
scripts/verify-template
```

该脚本检查：

- `.claude/.codex/.hermes/.pi/.trae` 项目级 OpenSpec 配置是否齐全。
- 模板边界内不应存在的运行时产物是否残留。
- Markdown 相对链接是否指向现有文件。
- OpenSpec 配置和示例 OpenAPI YAML 是否可解析。
- Git diff 是否存在空白错误。

## 关键文档

| 文档 | 内容 |
|------|------|
| [AGENTS.md](./AGENTS.md) | 全局 AI 指令 + 工程基线入口 + Agent 协作 |
| [docs/user-guide/README.md](./docs/user-guide/README.md) | 模板使用说明 |
| [docs/user-guide/product-lifecycle-workflow.md](./docs/user-guide/product-lifecycle-workflow.md) | 产品全生命周期使用手册 |
| [docs/user-guide/lifecycle-best-practices.md](./docs/user-guide/lifecycle-best-practices.md) | 全生命周期最佳实践 |
| [docs/user-guide/excalidraw-diagram-generator-guide.md](./docs/user-guide/excalidraw-diagram-generator-guide.md) | Excalidraw 可视化辅助 skill 使用手册 |
| [docs/process/PDCA-SCRUM.md](./docs/process/PDCA-SCRUM.md) | PDCA × Scrum × AI |
| [docs/process/OPENSPEC-SUPERPOWERS-COMPOSITION.md](./docs/process/OPENSPEC-SUPERPOWERS-COMPOSITION.md) | OpenSpec 与 Superpowers 协作方式 |
| [docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md](./docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md) | Matt Pocock Engineering Skills 集成与使用 |
| [docs/agents/README.md](./docs/agents/README.md) | Agent 协作文档目录说明 |
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
