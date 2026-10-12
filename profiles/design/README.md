# YSS 产品与业务设计 Harness（Design Profile）

> **项目名称：** [填写]
> **业务领域：** [填写]
> **团队规模：** [填写]
>
> 面向产品、需求、商务的业务方案工作台（内部兼容 ID：`harness.business-ddd-strategy-handoff`）。本地生命周期在业务方案交接结束，不进入 OpenAPI、下游技术设计、垂直切片实现或发布。

## 定位

默认作为一个 Spec 综合研发主控的按需专职协作方，也可独立承接设计。产品设计完成是可汇总的阶段里程碑，本地职责终点仍为战略交接包成包并整包验证通过；主控按显式同功能 checkpoint 与当前接收证据判断业务验收，不把本地设计完成当作整个业务交付。

本模板默认作为业务方案设计 / 研发管理仓库，保留 Plan、Spec、原型、业务级 Ticket、业务方案交接包、Agent skills 和协作约定。OpenAPI、实现仓库和运行时代码由下游研发 profile 接管。机器可读边界见 [`.template-spec/process/harness-profile.yaml`](./.template-spec/process/harness-profile.yaml)。

## 项目结构

```text
├── .agents/                 ← 跨 Agent 共享 skills 的权威内容
├── .codex/                  ← Codex skills 投影与平台专属 skills
├── .cursor/                 ← Cursor skills 投影
├── .pi/                     ← Pi skills 投影与平台专属 skills
├── AGENTS.md                ← AI 指令
├── CONTEXT.md               ← 业务词汇表
├── yss-project.yaml         ← 仓库身份清单
├── docs/
│   ├── adr/                 ← 架构决策记录入口
│   ├── requirements/        ← Spec / 用户故事 / 业务级 Ticket
│   ├── discovery/           ← 机会探索、市场、竞品和用户材料
│   ├── design/              ← 产品设计、原型、交互说明和状态矩阵
│   ├── architecture/        ← 业务 / 功能架构模板
│   ├── agents/              ← Agent 协作规范、Ticket/Triage/领域文档约定
│   ├── templates/           ← 通用文档模板与业务方案交接包
│   └── process/             ← 生命周期、profile、裁剪和技能治理说明
└── scripts/                 ← 模板轻量校验脚本
```

项目需要生成度量或其他临时产物时再按需创建对应目录。`docs/api/`、`docs/implementation/`、`docs/testing/` 等下游研发目录不是本 profile 的本地主链，由接收项目按需创建。

## Quickstart

1. 先读取 `yss-project.yaml`，按 `repository_mode` 选择模板维护或内部兼容 ID `harness.business-ddd-strategy-handoff` 对应的业务方案设计流程。
2. 必读入口为 `AGENTS.md` 与 `CONTEXT.md`；本地职责边界以 `.template-spec/process/harness-profile.yaml` 为准，生命周期 ID 以 `.template-spec/process/lifecycle-registry.yaml` 为准。
3. `template-source` 修改后默认执行 `scripts/verify-template-fast`；共享 skill 变化时再执行必要的投影与 lock 更新。PR 使用 candidate 核验，发布使用完整门禁。
4. `project-instance` 使用 `yss-strategic-design`：机会调研 → Spec → 页面原型 → 业务级 Ticket → `work-unit.strategic-design-handoff`。不要在本地拆垂直切片或进入实现。
5. OpenAPI、技术设计、实现仓库和覆盖率门禁属于下游研发 profile，不是本仓硬门禁。

YSS skills 的公开发布投影维护在 [iloveZzz/yss-spec-dev-skills](https://github.com/iloveZzz/yss-spec-dev-skills)，发布清单和导出命令见 [skills 维护说明](./.template-source/agents/skills-maintenance.md)。

## 模板初始化 CLI

统一 CLI `yss` 的 `design` Profile 生成本仓业务方案实例，职责仍为 `harness.business-ddd-strategy-handoff`。使用已验收的固定二进制，先用 `yss bundle inspect --profile design --json` 核对模板提交及 Bundle 来源。

```bash
yss init --profile design --root /absolute/path/to/project --plan --out /absolute/path/to/init-plan.json --json
yss init --profile design --root /absolute/path/to/project --apply --plan-file /absolute/path/to/init-plan.json --json
```

新实例使用 `.yss.json`；历史 `create-yss-harness-design` 和 `.yss-harness-design.json` 只用于旧实例身份识别与固定执行器恢复。旧实例先显式 `yss migrate plan`，检查后应用保存的计划，不以普通 sync 自动接管。固定模板、统一 CLI 和历史执行器分别记录来源。

创建、同步、迁移和恢复见 [yss design 使用说明](./.template-spec/user-guide/CLI使用说明.md)。候选二进制仍需当前源码验证及发布门禁，命令示例不表示已经发布。

## 模板配置取舍

`.agents/skills` 是共享技能的权威内容；其他 Agent root 只保存同步投影和平台专属技能。共享技能只能在权威目录修改，随后运行：

```bash
scripts/sync-skills
scripts/update-skill-lock
```

Matt skills 的上游来源与固定 revision 见 [`skills-lock.json`](skills-lock.json)，说明文档不复述。

主研发流程使用 `skills/engineering`；`skills-lock.json` 同时记录本次安装的关联 `productivity`、`in-progress`、`deprecated`、`misc` 和 `personal` skill 路径。

## 分级校验

```bash
scripts/verify-template-fast
scripts/verify-template-candidate
scripts/verify-template
```

`fast` 按 Git 影响面选择检查组并并行执行；`candidate` 追加候选完整性检查；`verify-template` 保留不可裁剪的完整发布门禁。未映射路径和核心核验资产变化会自动升级到完整门禁。检查内容包括：

- `yss-project.yaml`、权威流程资产、Harness profile 和实例分发清单是否完整。
- 共享技能投影及 `skills-lock.json` 的完整树哈希是否一致。
- `project-instance` 不得包含 OpenAPI / 垂直切片实现 / 模板源治理区等禁止路径。
- 流程压力场景是否符合条件门禁和仓库身份路由。
- Git diff 是否存在空白错误。

## 关键文档

业务方可从[战略设计子项目用户手册](./.template-spec/user-guide/战略设计子项目用户手册.md)了解工作入口；阶段、条件门禁和完成证据以生命周期注册表及流程裁剪规则为准。

| 文档 | 内容 |
|------|------|
| [AGENTS.md](./AGENTS.md) | 仓库身份路由、业务方案确认点与禁止事项 |
| [.template-spec/process/harness-profile.yaml](./.template-spec/process/harness-profile.yaml) | 业务方案交付 profile |
| [.template-spec/process/instance-distribution-manifest.yaml](./.template-spec/process/instance-distribution-manifest.yaml) | 实例分发清单 |
| [.template-spec/user-guide/用户手册索引.md](./.template-spec/user-guide/用户手册索引.md) | 模板使用说明 |
| [.template-spec/process/lifecycle-registry.yaml](./.template-spec/process/lifecycle-registry.yaml) | 生命周期结构事实源 |
| [.template-spec/process/harness-process-tailoring.md](./.template-spec/process/harness-process-tailoring.md) | 流程裁剪指南 |
| [.template-spec/agents/README.md](./.template-spec/agents/README.md) | Agent 协作文档目录说明 |
| [.template-source/agents/skills-maintenance.md](./.template-source/agents/skills-maintenance.md) | Agent skills 安装与维护 |

## 核心模板

| 模板 | 用途 |
|------|------|
| [.template-spec/templates/spec-template.md](./.template-spec/templates/spec-template.md) | Spec，包含测试决策、AI / 人工审查点 |
| [.template-spec/templates/strategic-design-handoff-template.yaml](./.template-spec/templates/strategic-design-handoff-template.yaml) | 业务方案交接包 |
| [.template-spec/architecture/templates/business-architecture-template.md](./.template-spec/architecture/templates/business-architecture-template.md) | 业务架构 |
| [.template-spec/architecture/templates/functional-architecture-template.md](./.template-spec/architecture/templates/functional-architecture-template.md) | 功能架构 |

## 用户手册

首次使用请从[本仓手册](.template-spec/user-guide/战略设计子项目用户手册.md)开始；练习见[设备借用职责案例](.template-spec/user-guide/设备借用贯穿案例.md)，全部入口见[索引](.template-spec/user-guide/用户手册索引.md)。

CLI 创建、接入、诊断、同步及恢复见 [CLI 使用说明](.template-spec/user-guide/CLI使用说明.md)。
