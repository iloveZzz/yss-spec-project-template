# YSS Spec Project Template

> Matt Pocock Engineering Skills × YSS × OpenAPI 驱动的轻量 AI 研发文档模板。

## 定位

本模板默认作为 Harness / 研发管理仓库，保留流程文档、契约模板、Agent skills 和协作约定。前端 / 后端源码默认位于独立实现仓库；只有用户明确选择本仓库承载实现代码时，才按需创建 `apps/backend/`、`apps/frontend/`。

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
3. `template-source` 修改后先按 `maintenance-intensity.yaml` 判定 L1 / L2 / L3，默认用 `scripts/verify-template-fast` 达到 `implementation-ready`；L3 日常采用维护者自检，正式发布前执行完整门禁；只有共享 skill 变更才运行 `scripts/sync-skills` 和 `scripts/update-skill-lock`。
4. `project-instance` 默认从 `yss-product-lifecycle` 的 `route` 模式开始，再由原生 `work-unit.*` 推进 Discovery、Spec、产品设计、工程契约和 Ticket 正式化；`grill-with-docs`、`to-spec`、`to-tickets`、`implement` 仅作为用户显式调用的兼容入口。
5. 实现仓库接入、YSS 路由、独立审查、fresh verification 和 Git checkpoint 以 `AGENTS.md` 的硬门禁为准。

YSS skills 的公开发布投影维护在 [iloveZzz/yss-spec-dev-skills](https://github.com/iloveZzz/yss-spec-dev-skills)，发布清单和导出命令见 [skills 维护说明](./docs/agents/skills-maintenance.md)。

YSS UI 组件知识同时通过项目级 MCP 配置提供；支持的客户端、Codex 全局安装和自检方法见 [YSS UI MCP 接入](./docs/user-guide/yss-ui-mcp.md)。

## 模板初始化 CLI

`create-yss-spec` 的目标维护位置是独立 GitHub 仓库 [iloveZzz/create-yss-spec](https://github.com/iloveZzz/create-yss-spec)。本仓库不再包含 CLI 源码、测试、发布配置或开发过程记录。CLI 的使用方法已经合并到统一用户手册：

- [YSS 用户手册：创建、接管和更新项目](./docs/user-guide/用户手册.md#创建接管和更新项目)

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

Matt skills 固定来源：

```text
mattpocock/skills
main@6acc160e4e0cd062dbbbd7a1b26ae92855edf07e
```

主研发流程使用 `skills/engineering`；`skills-lock.json` 同时记录本次安装的关联 `productivity`、`in-progress`、`deprecated`、`misc` 和 `personal` skill 路径。

## 模板校验

```bash
scripts/verify-template-fast
```

快速入口按 Git 影响面执行相关检查，未映射路径或核心校验资产变化时 fail-safe 升级。它与 candidate / 发布 profile 共同检查：

- `yss-project.yaml`、权威流程资产和模板是否完整。
- 共享技能投影及 `skills-lock.json` 的完整树哈希是否一致。
- 过时技能、路径和规范用语是否已清理。
- 五类流程压力场景是否符合条件门禁和仓库身份路由。
- Markdown 相对链接是否指向现有文件。
- 示例 OpenAPI YAML 是否可解析。
- Git diff 是否存在空白错误。

显式准备审查候选时执行 `scripts/verify-template-candidate`；首次正式冻结前和最终发布前执行不可裁剪的 `scripts/verify-template`。

## 关键文档

| 文档 | 内容 |
|------|------|
| [AGENTS.md](./AGENTS.md) | 全局 AI 指令 + 工程基线入口 + Agent 协作 |
| [docs/user-guide/用户手册.md](./docs/user-guide/用户手册.md) | 从首次只读检查到需求、开发、审查、发布和 CLI 操作的统一用户手册 |
| [docs/process/PDCA-SCRUM.md](./docs/process/PDCA-SCRUM.md) | PDCA × Scrum × AI |
| [docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md](./docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md) | Matt Pocock Engineering Skills 集成与使用 |
| [docs/process/lifecycle-registry.yaml](./docs/process/lifecycle-registry.yaml) | 生命周期结构事实源：主阶段、门禁、产物、工作单元、证据与稳定 ID |
| [docs/process/harness-process-tailoring.md](./docs/process/harness-process-tailoring.md) | 小改动 / 中等变更 / 新模块的流程裁剪指南 |
| [docs/process/template-engineering-overview.md](./docs/process/template-engineering-overview.md) | 模板工程定位、产品线、控制平面、分发边界与维护工作流 |
| [docs/process/harness-executive-blueprint.md](./docs/process/harness-executive-blueprint.md) | 面向业务方和管理者的 Harness 一页式蓝图 |
| [docs/process/implementation-repo-integration.md](./docs/process/implementation-repo-integration.md) | 外部前端 / 后端实现仓库接入与跨仓库切片绑定 |
| [docs/agents/README.md](./docs/agents/README.md) | Agent 协作文档目录说明 |
| [docs/agents/skills-maintenance.md](./docs/agents/skills-maintenance.md) | Agent skills 安装与维护 |
| [docs/user-guide/yss-ui-mcp.md](./docs/user-guide/yss-ui-mcp.md) | YSS UI MCP 项目配置、全局安装边界与自检 |
| [docs/discovery/IDEATION.md](./docs/discovery/IDEATION.md) | 机会构想方法 |
| [docs/architecture/README.md](./docs/architecture/README.md) | 架构设计 + 审查清单 |
| [docs/testing/README.md](./docs/testing/README.md) | 测试策略 |

## 核心模板

| 模板 | 用途 |
|------|------|
| [docs/templates/spec-template.md](./docs/templates/spec-template.md) | Spec，包含 OpenAPI 影响、测试决策、AI / 人工审查点 |
| [docs/templates/local-parent-ticket-template.md](./docs/templates/local-parent-ticket-template.md) | Local Markdown 功能父 Ticket 与生命周期索引 |
| [docs/templates/vertical-slice-ticket-template.md](./docs/templates/vertical-slice-ticket-template.md) | 垂直切片 Ticket |
| [docs/templates/agent-brief-template.md](./docs/templates/agent-brief-template.md) | `triage` 产出的 Agent Brief |
| [docs/templates/implementation-repo-registry-template.md](./docs/templates/implementation-repo-registry-template.md) | 外部实现仓库登记 |
| [docs/templates/cross-repo-slice-template.md](./docs/templates/cross-repo-slice-template.md) | 跨仓库垂直切片记录 |
| [docs/architecture/templates/architecture-deepening-template.md](./docs/architecture/templates/architecture-deepening-template.md) | 架构 deepening 候选与 seam 设计 |
