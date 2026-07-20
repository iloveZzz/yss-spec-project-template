# YSS Spec Project Template

> Matt Pocock Engineering Skills × YSS × OpenAPI 驱动的轻量 AI 研发文档模板。

## 定位

本模板默认作为 Harness / 研发管理仓库，保留流程文档、契约模板、Agent skills 和协作约定。前端 / 后端源码默认位于独立实现仓库；只有用户明确选择本仓库承载实现代码时，才按需创建 `apps/backend/`、`apps/frontend/`。

## 项目结构

```text
├── .agents/                 ← 跨 Agent 共享 skills 的权威内容
├── .claude/                 ← Claude skills 投影与平台专属 skills
├── .codex/                  ← Codex skills 投影与平台专属 YSS skills
├── .hermes/                 ← Hermes skills 投影与平台专属 skills
├── .pi/                     ← Pi skills 投影与平台专属 skills
├── .trae/                   ← Trae skills 投影与平台专属 skills
├── AGENTS.md                ← AI 指令
├── CONTEXT.md               ← 领域词汇表
├── yss-project.yaml         ← 仓库身份清单
├── docs/
│   ├── api/                 ← OpenAPI 3.1 契约
│   ├── adr/                 ← 架构决策记录
│   ├── requirements/        ← Spec / 用户故事 / 需求草案 / 垂直切片
│   ├── discovery/           ← 机会探索、市场、竞品和用户材料
│   ├── design/              ← 产品设计、原型、交互说明和状态矩阵
│   ├── architecture/        ← 架构设计与审查模板
│   ├── releases/            ← 发布说明
│   ├── implementation/      ← 实施方案、上线记录和回滚方案
│   ├── testing/             ← 测试策略和验证记录
│   ├── agents/              ← Agent 协作规范、Ticket/Triage/领域文档约定
│   ├── templates/           ← 通用文档模板
│   └── process/             ← 生命周期、裁剪、Scrum 和技能治理说明
└── scripts/                 ← 模板轻量校验脚本
```

项目需要生成度量、外部实现仓库记录或其他临时产物时再按需创建对应目录。前后端实现仓库接入规则见 `docs/process/implementation-repo-integration.md`。

## Quickstart

1. 先读取 `yss-project.yaml`，按 `repository_mode` 选择模板维护或产品研发生命周期。
2. 必读入口为 `AGENTS.md` 与 `CONTEXT.md`；流程事实分别以生命周期映射和裁剪指南为准。
3. `template-source` 修改流程、技能或模板后，执行 `scripts/sync-skills`、`scripts/update-skill-lock` 和 `scripts/verify-template`。
4. `project-instance` 先做影响面分诊；进入 Spec 基线时使用 `grill-with-docs`、`to-spec`，契约冻结后再用 `to-tickets` 拆分垂直切片 Ticket。
5. 实现仓库接入、YSS 路由、独立审查、fresh verification 和 Git checkpoint 以 `AGENTS.md` 的硬门禁为准。

## 模板初始化 CLI

`create-yss-spec` 的目标维护位置是独立 GitHub 仓库 [iloveZzz/create-yss-spec](https://github.com/iloveZzz/create-yss-spec)。本仓库不再包含 CLI 源码、测试、发布配置或开发过程记录，只保留面向模板使用者的实践指南：

- [create-yss-spec 外部 CLI 实践指南](./docs/user-guide/create-yss-spec-cli-guide.md)

推荐入口：

```bash
npm create yss-spec@latest
```

首次使用前请先确认独立仓库和 npm 包已完成发布。

## 模板配置取舍

`.agents/skills` 是共享技能的权威内容；其他 Agent root 只保存同步投影和平台专属技能。共享技能只能在权威目录修改，随后运行：

```bash
scripts/sync-skills
scripts/update-skill-lock
```

Matt engineering skills 固定来源：

```text
mattpocock/skills
skills/engineering
main@272f99b22574f50e4266791c86b9302682970e23
```

## 轻量校验

```bash
scripts/verify-template
```

该脚本检查：

- `yss-project.yaml`、权威流程资产和模板是否完整。
- 共享技能投影及 `skills-lock.json` 的完整树哈希是否一致。
- 过时技能、路径和规范用语是否已清理。
- 五类流程压力场景是否符合条件门禁和仓库身份路由。
- Markdown 相对链接是否指向现有文件。
- 示例 OpenAPI YAML 是否可解析。
- Git diff 是否存在空白错误。

## 关键文档

| 文档 | 内容 |
|------|------|
| [AGENTS.md](./AGENTS.md) | 全局 AI 指令 + 工程基线入口 + Agent 协作 |
| [docs/user-guide/README.md](./docs/user-guide/README.md) | 模板使用说明 |
| [docs/user-guide/product-lifecycle-workflow.md](./docs/user-guide/product-lifecycle-workflow.md) | 产品全生命周期使用手册 |
| [docs/user-guide/excalidraw-diagram-generator-guide.md](./docs/user-guide/excalidraw-diagram-generator-guide.md) | Excalidraw 可视化辅助 skill 使用手册 |
| [docs/process/PDCA-SCRUM.md](./docs/process/PDCA-SCRUM.md) | PDCA × Scrum × AI |
| [docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md](./docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md) | Matt Pocock Engineering Skills 集成与使用 |
| [docs/process/harness-work-unit-map.md](./docs/process/harness-work-unit-map.md) | Harness 13 个工作单元与 8 主阶段 / 21 门禁映射 |
| [docs/process/harness-process-tailoring.md](./docs/process/harness-process-tailoring.md) | 小改动 / 中等变更 / 新模块的流程裁剪指南 |
| [docs/process/harness-executive-blueprint.md](./docs/process/harness-executive-blueprint.md) | 面向业务方和管理者的 Harness 一页式蓝图 |
| [docs/process/harness-optimization-backlog.md](./docs/process/harness-optimization-backlog.md) | Harness 工程优化调整待办 |
| [docs/process/implementation-repo-integration.md](./docs/process/implementation-repo-integration.md) | 外部前端 / 后端实现仓库接入与跨仓库切片绑定 |
| [docs/agents/README.md](./docs/agents/README.md) | Agent 协作文档目录说明 |
| [docs/agents/skills-maintenance.md](./docs/agents/skills-maintenance.md) | Agent skills 安装与维护 |
| [docs/user-guide/spec-ticket-migration-guide.md](./docs/user-guide/spec-ticket-migration-guide.md) | 旧规格与任务入口迁移指南 |
| [docs/discovery/IDEATION.md](./docs/discovery/IDEATION.md) | 机会构想方法 |
| [docs/architecture/README.md](./docs/architecture/README.md) | 架构设计 + 审查清单 |
| [docs/testing/README.md](./docs/testing/README.md) | 测试策略 |

## 核心模板

| 模板 | 用途 |
|------|------|
| [docs/templates/spec-template.md](./docs/templates/spec-template.md) | Spec，包含 OpenAPI 影响、测试决策、AI / 人工审查点 |
| [docs/templates/vertical-slice-ticket-template.md](./docs/templates/vertical-slice-ticket-template.md) | 垂直切片 Ticket |
| [docs/templates/agent-brief-template.md](./docs/templates/agent-brief-template.md) | `triage` 产出的 Agent Brief |
| [docs/templates/implementation-repo-registry-template.md](./docs/templates/implementation-repo-registry-template.md) | 外部实现仓库登记 |
| [docs/templates/cross-repo-slice-template.md](./docs/templates/cross-repo-slice-template.md) | 跨仓库垂直切片记录 |
| [docs/architecture/templates/architecture-deepening-template.md](./docs/architecture/templates/architecture-deepening-template.md) | 架构 deepening 候选与 seam 设计 |
