# YSS Spec Project Template

> Matt Pocock Engineering Skills × YSS × OpenAPI 驱动的轻量 AI 研发文档模板。

## 定位

本模板默认作为 Harness / 研发管理仓库，保留流程文档、契约模板、Agent skills 和协作约定。前端 / 后端源码默认位于独立实现仓库；只有用户明确选择本仓库承载实现代码时，才按需创建 `apps/backend/`、`apps/frontend/`。

## 项目结构

```text
├── .agent/                  ← 通用 Agent 项目级 Matt skills
├── .agents/                 ← Agent 可加载的 Engineering Skills、脚本和参考材料
├── .claude/                 ← Claude 项目级 skills
├── .codex/                  ← Codex 项目级 Matt + YSS skills
├── .hermes/                 ← Hermes 项目级 skills
├── .pi/                     ← Pi 项目级 skills
├── .trae/                   ← Trae 项目级 skills
├── AGENTS.md                ← AI 指令
├── CONTEXT.md               ← 领域词汇表
├── docs/
│   ├── api/                 ← OpenAPI 3.1 契约
│   ├── adr/                 ← 架构决策记录
│   ├── requirements/        ← PRD / 用户故事 / 需求草案 / 垂直切片
│   ├── discovery/           ← 机会探索、市场、竞品和用户材料
│   ├── design/              ← 产品设计、原型、交互说明和状态矩阵
│   ├── architecture/        ← 架构设计与审查模板
│   ├── releases/            ← 发布说明
│   ├── implementation/      ← 实施方案、上线记录和回滚方案
│   ├── testing/             ← 测试策略和验证记录
│   ├── agents/              ← Agent 协作规范、Issue/Triage/领域文档约定
│   ├── templates/           ← 通用文档模板
│   └── process/             ← 生命周期、裁剪、Scrum 和技能治理说明
└── scripts/                 ← 模板轻量校验脚本
```

项目需要生成度量、外部实现仓库记录或其他临时产物时再按需创建对应目录。前后端实现仓库接入规则见 `docs/process/implementation-repo-integration.md`。

## Quickstart

1. 先判断当前生命周期阶段、已有资产和缺失资产；建议用 `yss-product-lifecycle` 做阶段路由。
2. 新产品或新模块先完成机会探索；已有材料时先整理 discovery，再进入 `grill-with-docs`。
3. 新产品或新业务域先明确业务架构，再使用 `grill-with-docs` 澄清边界。
4. 按 `docs/templates/prd-template.md` 形成 PRD，并同步明确功能架构、模块边界和 MVP / 非目标范围。
5. 如有 API 影响，先在 `docs/api/specs/` 生成 OpenAPI 3.1 Draft；Draft 经工程基线、系统 / 数据架构和设计审查后 Freeze。
6. 使用 `to-issues` 或 `docs/templates/vertical-slice-issue-template.md` 拆分可独立验证的垂直切片 Issue。
7. 进入实现前按 `docs/process/implementation-repo-integration.md` 登记外部实现仓库；已有工程用 `implementation-repo-onboarding`，跨仓库切片用 `cross-repo-implementation-routing`。
8. 后端新服务或新模块先确认 YSS DDD 工程基线；从零创建服务时使用 `yss-ddd-scaffold-generator`。
9. 前端 0-1 微应用使用 `yss-frontend-scaffold-generator` 对齐标准模板；业务页面实现再接 `yss-page-module-development` 和 `api-integration`。
10. 业务行为实现默认使用 `tdd`：先写失败测试，再写最小实现；Bug 修复先建立 `diagnosing-bugs` 反馈闭环。
11. 每个切片完成后做 `code-review` 或独立审查和 fresh verification，再发布、实施和复盘。
12. 在 `docs/architecture/`、`docs/adr/`、`CONTEXT.md` 和 `AGENTS.md` 沉淀稳定规则。

## 模板初始化 CLI

当前仓库已内置一个用于实例化模板的 npm CLI：`create-yss-spec`。

完整中文使用手册见：

- [docs/user-guide/create-yss-spec-cli-guide.md](./docs/user-guide/create-yss-spec-cli-guide.md)

本地开发验证：

```bash
npm test
```

发包 / 使用形态：

```bash
npm create yss-spec@latest
```

支持的主参数能力：

- 交互式初始化空目录
- `--dry-run`
- `--force`
- `--git-init`
- `--issue-tracker`
- `--no-example-docs`

## 模板配置取舍

本模板纳入 `.agent/`、`.agents/`、`.claude/`、`.codex/`、`.hermes/`、`.pi/`、`.trae/`，因为它们是跨 Agent 复用 Matt Pocock Engineering Skills 和 YSS skills 的项目级配置。

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

- 项目级 Agent 目录是否包含必需 Matt engineering skills。
- 旧流程目录、规则和运行时状态文件是否已清理。
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
| [docs/discovery/IDEATION.md](./docs/discovery/IDEATION.md) | 机会构想方法 |
| [docs/architecture/README.md](./docs/architecture/README.md) | 架构设计 + 审查清单 |
| [docs/testing/README.md](./docs/testing/README.md) | 测试策略 |

## 核心模板

| 模板 | 用途 |
|------|------|
| [docs/templates/prd-template.md](./docs/templates/prd-template.md) | PRD，包含 OpenAPI 影响、测试决策、AI / 人工审查点 |
| [docs/templates/vertical-slice-issue-template.md](./docs/templates/vertical-slice-issue-template.md) | 垂直切片 Issue |
| [docs/templates/agent-brief-template.md](./docs/templates/agent-brief-template.md) | `triage` 产出的 Agent Brief |
| [docs/templates/implementation-repo-registry-template.md](./docs/templates/implementation-repo-registry-template.md) | 外部实现仓库登记 |
| [docs/templates/cross-repo-slice-template.md](./docs/templates/cross-repo-slice-template.md) | 跨仓库垂直切片记录 |
| [docs/architecture/templates/architecture-deepening-template.md](./docs/architecture/templates/architecture-deepening-template.md) | 架构 deepening 候选与 seam 设计 |
