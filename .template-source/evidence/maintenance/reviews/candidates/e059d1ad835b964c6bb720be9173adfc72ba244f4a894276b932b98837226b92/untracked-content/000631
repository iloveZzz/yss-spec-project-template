# YSS Strategic Design Harness

> **项目名称：** [填写]
> **业务领域：** [填写]
> **团队规模：** [填写]
>
> 面向产品、需求、商务的业务上游战略设计 Harness（`harness.business-ddd-strategy-handoff`）。本地生命周期在 Strategic Design Handoff 结束，不进入 OpenAPI、Tactical DDD、垂直切片实现或发布。

## 定位

本模板默认作为战略设计 / 研发管理仓库，保留 Discovery、Spec、原型、业务级 Ticket、战略设计交付包、Agent skills 和协作约定。OpenAPI、实现仓库和运行时代码由下游研发 profile 接管。机器可读边界见 [`docs/process/harness-profile.yaml`](./docs/process/harness-profile.yaml)。

## 项目结构

```text
├── .agents/                 ← 跨 Agent 共享 skills 的权威内容
├── .claude/                 ← Claude skills 投影与平台专属 skills
├── .codex/                  ← Codex skills 投影与平台专属 skills
├── .cursor/                 ← Cursor skills 投影
├── .hermes/                 ← Hermes skills 投影与平台专属 skills
├── .pi/                     ← Pi skills 投影与平台专属 skills
├── .qoder/                  ← Qoder skills 投影与平台专属 skills
├── .trae/                   ← Trae skills 投影与平台专属 skills
├── AGENTS.md                ← AI 指令
├── CONTEXT.md               ← 领域词汇表
├── yss-project.yaml         ← 仓库身份清单
├── docs/
│   ├── adr/                 ← 架构决策记录入口
│   ├── requirements/        ← Spec / 用户故事 / 业务级 Ticket
│   ├── discovery/           ← 机会探索、市场、竞品和用户材料
│   ├── design/              ← 产品设计、原型、交互说明和状态矩阵
│   ├── architecture/        ← 业务 / 功能架构模板
│   ├── agents/              ← Agent 协作规范、Ticket/Triage/领域文档约定
│   ├── templates/           ← 通用文档模板与战略设计交付包
│   └── process/             ← 生命周期、profile、裁剪和技能治理说明
└── scripts/                 ← 模板轻量校验脚本
```

项目需要生成度量或其他临时产物时再按需创建对应目录。`docs/api/`、`docs/implementation/`、`docs/testing/` 等目录保留为下游研发模板兼容资产，不是本 profile 的本地主链。

## Quickstart

1. 先读取 `yss-project.yaml`，按 `repository_mode` 选择模板维护或 `harness.business-ddd-strategy-handoff` 产品战略设计流程。
2. 必读入口为 `AGENTS.md` 与 `CONTEXT.md`；本地职责边界以 `docs/process/harness-profile.yaml` 为准，生命周期 ID 以 `docs/process/lifecycle-registry.yaml` 为准。
3. `template-source` 修改流程、技能或模板后，执行 `scripts/sync-skills`、`scripts/update-skill-lock` 和 `scripts/verify-template`。
4. `project-instance` 使用 `yss-strategic-design`：机会调研 → Spec → 页面原型 → 业务级 Ticket → `work-unit.strategic-design-handoff`。不要在本地拆垂直切片或进入实现。
5. OpenAPI、Tactical DDD、实现仓库和覆盖率门禁属于下游研发 profile，不是本仓硬门禁。

YSS skills 的公开发布投影维护在 [iloveZzz/yss-spec-dev-skills](https://github.com/iloveZzz/yss-spec-dev-skills)，发布清单和导出命令见 [skills 维护说明](./docs/agents/skills-maintenance.md)。

## 模板初始化 CLI

`create-yss-harness-design` 是本 harness 的实例初始化 CLI，维护位置是独立仓库 [iloveZzz/create-yss-harness-design](https://github.com/iloveZzz/create-yss-harness-design)。它不是 `create-yss-spec`：后者面向全生命周期模板 `yss-spec-project-template`。

- [create-yss-harness-design 实践指南](./docs/user-guide/外部命令行工具实践指南.md)

推荐入口：

```bash
npm create yss-harness-design@latest
```

首次使用前请先确认独立仓库和 npm 包已完成发布。未完成跨仓验证前，不要把本命令当作已发布入口。

## 模板配置取舍

`.agents/skills` 是共享技能的权威内容；其他 Agent root 只保存同步投影和平台专属技能。共享技能只能在权威目录修改，随后运行：

```bash
scripts/sync-skills
scripts/update-skill-lock
```

Matt skills 固定来源：

```text
mattpocock/skills
main@6acc160e4e0cd062dbbbd7a1b26ae92855edf07e
```

主研发流程使用 `skills/engineering`；`skills-lock.json` 同时记录本次安装的关联 `productivity`、`in-progress`、`deprecated`、`misc` 和 `personal` skill 路径。

## 轻量校验

```bash
scripts/verify-template
```

该脚本检查：

- `yss-project.yaml`、权威流程资产、Harness profile 和实例分发清单是否完整。
- 共享技能投影及 `skills-lock.json` 的完整树哈希是否一致。
- `project-instance` 不得包含 OpenAPI / 垂直切片实现 / 模板源治理区等禁止路径。
- 流程压力场景是否符合条件门禁和仓库身份路由。
- Git diff 是否存在空白错误。

## 关键文档

| 文档 | 内容 |
|------|------|
| [AGENTS.md](./AGENTS.md) | 仓库身份路由、战略设计硬门禁与禁止事项 |
| [docs/process/harness-profile.yaml](./docs/process/harness-profile.yaml) | 战略设计交付 profile |
| [docs/process/instance-distribution-manifest.yaml](./docs/process/instance-distribution-manifest.yaml) | 实例分发清单 |
| [docs/user-guide/用户手册索引.md](./docs/user-guide/用户手册索引.md) | 模板使用说明 |
| [docs/process/lifecycle-registry.yaml](./docs/process/lifecycle-registry.yaml) | 生命周期结构事实源 |
| [docs/process/harness-process-tailoring.md](./docs/process/harness-process-tailoring.md) | 流程裁剪指南 |
| [docs/process/harness-executive-blueprint.md](./docs/process/harness-executive-blueprint.md) | 面向业务方和管理者的 Harness 一页式蓝图 |
| [docs/agents/README.md](./docs/agents/README.md) | Agent 协作文档目录说明 |
| [docs/agents/skills-maintenance.md](./docs/agents/skills-maintenance.md) | Agent skills 安装与维护 |
| [docs/discovery/IDEATION.md](./docs/discovery/IDEATION.md) | 机会构想方法 |

## 核心模板

| 模板 | 用途 |
|------|------|
| [docs/templates/spec-template.md](./docs/templates/spec-template.md) | Spec，包含测试决策、AI / 人工审查点 |
| [docs/templates/strategic-design-handoff-template.yaml](./docs/templates/strategic-design-handoff-template.yaml) | 战略设计交付包 |
| [docs/templates/agent-brief-template.md](./docs/templates/agent-brief-template.md) | `triage` 产出的 Agent Brief |
| [docs/architecture/templates/business-architecture-template.md](./docs/architecture/templates/business-architecture-template.md) | 业务架构 |
| [docs/architecture/templates/functional-architecture-template.md](./docs/architecture/templates/functional-architecture-template.md) | 功能架构 |
