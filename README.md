# YSS 综合研发主控模板（Spec Profile）

> Matt Pocock Engineering Skills × YSS × OpenAPI 驱动的轻量 AI 研发文档模板。

## 定位

本模板默认作为 Harness / 研发管理仓库，保留流程文档、契约模板、Agent skills 和协作约定。前端 / 后端源码默认位于独立实现仓库；只有用户明确选择本仓库承载实现代码时，才按需创建 `apps/backend/`、`apps/frontend/`。

默认一个 Spec 主控推进同一功能到业务验收，Design、Backend、Frontend 按需协作。Spec 文档批准、产品设计完成、后端可交付、前端验收和业务验收是可选的本次终点；终点改变保留当前批准和后续路线。专职 Profile 继续按自身职责结束，主控通过显式同功能 checkpoint 与当前接收证据汇总。见[本次推进目标与专职协作](.template-spec/process/lifecycle-progression.md)。

## 项目结构

```text
├── .agents/skills/          ← 共享技能权威内容
├── .codex/、.cursor/、.pi/  ← 技能投影与平台专属能力
├── AGENTS.md                ← Agent 入口规则
├── CONTEXT.md               ← 唯一业务词汇表
├── yss-project.yaml         ← 仓库身份
├── .template-spec/          ← 可复用流程、门禁、契约与文档模板
├── .template-source/        ← 现行模板维护资产与分发工具（不进入实例；运行历史存仓外）
├── docs/                    ← 项目实例按需创建的 Plan、Spec、设计、Ticket 与交付证据
└── scripts/                 ← 合同与流程验证工具
```

项目需要生成度量、外部实现仓库记录或其他临时产物时再按需创建对应目录。前后端实现仓库接入规则见 `.template-spec/process/implementation-repo-integration.md`。

## Quickstart

1. 先读取 `yss-project.yaml`，按 `repository_mode` 选择模板维护或产品研发生命周期。
2. 必读入口为 `AGENTS.md` 与 `CONTEXT.md`；流程事实以生命周期注册表和裁剪指南为准。
3. `template-source` 按 `maintenance-intensity.yaml` 判定 L1 / L2，先看 `scripts/verify-template-fast --plan`，日常执行受影响依赖的定向检查达到 `implementation-ready`；投影、锁和分发在 canonical 稳定后同步。
4. `project-instance` 先用支持能力的 `yss lifecycle route` 按 `request_triage.delivery_path` 分流。`daily` 使用一张 Ticket/PR，按需求验收、技术技能、实现、测试、独立审查推进；`governed` 从最近可信阶段恢复正式治理。日常操作见[同一记录交付说明](.agents/skills/yss-product-lifecycle/references/daily-delivery.md)。
5. 实现仓库接入、YSS 路由、独立审查、fresh verification 和 Git checkpoint 以 `AGENTS.md` 的硬门禁为准。

YSS skills 的公开发布投影维护在 [iloveZzz/yss-spec-dev-skills](https://github.com/iloveZzz/yss-spec-dev-skills)，发布清单和导出命令见 [skills 维护说明](./.template-source/agents/skills-maintenance.md)。

YSS UI 组件知识同时通过项目级 MCP 配置提供；支持的客户端、Codex 全局安装和自检方法见 [YSS UI MCP 接入](./.template-spec/user-guide/yss-ui-mcp.md)。

## 模板初始化 CLI

四种 Profile 使用 [yss-cli](https://github.com/iloveZzz/yss-cli) 的原生 `yss` 入口，模板和三个 Agent 模板源独立维护。初始化、预演、事务、迁移及 Bundle 导出消费版本化协议：

- [YSS 用户手册：CLI 能力与写入方式](./.template-spec/user-guide/用户手册.md#cli-能力与写入方式)
- [YSS 用户手册：接管、同步与恢复](./.template-spec/user-guide/用户手册.md#接管同步与恢复)

推荐入口：

```bash
yss init --profile spec --root /absolute/path/project --plan --out /absolute/path/init-plan.json --json
yss init --profile spec --root /absolute/path/project --apply --plan-file /absolute/path/init-plan.json --json
```

`init` 默认直接初始化；上述 `--plan` 路线先生成可审阅计划。使用已固定版本和 SHA-256 的二进制；稳定版发行状态以发行清单为准。旧四个 npm 包仅作为历史识别、迁移和未完成事务恢复渠道保留，不执行 unpublish。完整安装、补装、恢复及退役边界见 [统一 CLI 操作说明](.template-spec/user-guide/unified-cli.md)。

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

快速入口按 Git 影响面执行相关检查，未映射路径或核心校验资产变化时 fail-safe 升级为完整验证，来源仍为当前工作树，用于 `implementation-ready`。显式 candidate / 发布入口要求已提交来源。三个入口共同检查：

- `yss-project.yaml`、权威流程资产和模板是否完整。
- 共享技能投影及 `skills-lock.json` 的完整树哈希是否一致。
- 过时技能、路径和规范用语是否已清理。
- 五类流程压力场景是否符合条件门禁和仓库身份路由。
- Markdown 相对链接是否指向现有文件。
- 示例 OpenAPI YAML 是否可解析。
- Git diff 是否存在空白错误。

PR 执行 `scripts/verify-template-candidate`；main 与正式发布前执行不可裁剪的 `scripts/verify-template`。独立审查和候选冻结仅在显式采用旧兼容协议时执行。

## 关键文档

业务方可从[用户手册](./.template-spec/user-guide/用户手册.md)了解工作入口；阶段、条件门禁和完成证据以生命周期注册表及流程裁剪规则为准。

| 文档 | 内容 |
|------|------|
| [AGENTS.md](./AGENTS.md) | 全局 AI 指令 + 工程基线入口 + Agent 协作 |
| [.template-spec/user-guide/用户手册.md](./.template-spec/user-guide/用户手册.md) | 从首次只读检查到需求、开发、审查、发布和 CLI 操作的统一用户手册 |
| [阶段接入与产物复用使用手册](./.template-spec/user-guide/阶段接入与产物复用使用手册.md) | 复用上游资产，从指定入口继续；含后端交付后前端开发操作 |
| [.template-source/process/MATT-POCOCK-ENGINEERING-SKILLS.md](./.template-source/process/MATT-POCOCK-ENGINEERING-SKILLS.md) | Matt Pocock Engineering Skills 集成与使用 |
| [.template-spec/process/lifecycle-registry.yaml](./.template-spec/process/lifecycle-registry.yaml) | 生命周期结构事实源：主阶段、门禁、产物、工作单元、证据与稳定 ID |
| [.template-spec/process/harness-process-tailoring.md](./.template-spec/process/harness-process-tailoring.md) | 小改动 / 中等变更 / 新模块的流程裁剪指南 |
| [.template-source/process/template-engineering-overview.md](./.template-source/process/template-engineering-overview.md) | 模板工程定位、产品线、控制平面、分发边界与维护工作流 |
| [.template-spec/process/implementation-repo-integration.md](./.template-spec/process/implementation-repo-integration.md) | 外部前端 / 后端实现仓库接入与跨仓库切片绑定 |
| [.template-spec/agents/README.md](./.template-spec/agents/README.md) | Agent 协作文档目录说明 |
| [.template-source/agents/skills-maintenance.md](./.template-source/agents/skills-maintenance.md) | Agent skills 安装与维护 |
| [.template-spec/user-guide/yss-ui-mcp.md](./.template-spec/user-guide/yss-ui-mcp.md) | YSS UI MCP 项目配置、全局安装边界与自检 |
| [.template-spec/architecture/README.md](./.template-spec/architecture/README.md) | 架构设计 + 审查清单 |

## 核心模板

| 模板 | 用途 |
|------|------|
| [.template-spec/templates/spec-template.md](./.template-spec/templates/spec-template.md) | Spec，包含 OpenAPI 影响、测试决策、AI / 人工审查点 |
| [.template-spec/templates/local-parent-ticket-template.md](./.template-spec/templates/local-parent-ticket-template.md) | Local Markdown 功能父 Ticket 与生命周期索引 |
| [.template-spec/templates/vertical-slice-ticket-template.md](./.template-spec/templates/vertical-slice-ticket-template.md) | 垂直切片 Ticket |
| [.template-spec/templates/implementation-repo-registry-template.md](./.template-spec/templates/implementation-repo-registry-template.md) | 外部实现仓库登记 |
| [.template-spec/templates/cross-repo-slice-template.md](./.template-spec/templates/cross-repo-slice-template.md) | 跨仓库垂直切片记录 |
| [.template-spec/architecture/templates/architecture-deepening-template.md](./.template-spec/architecture/templates/architecture-deepening-template.md) | 架构 deepening 候选与 seam 设计 |

## 按职责使用与升级

[四个现行家族用户手册](.template-spec/user-guide/用户手册.md)提供选型、初始化及升级；[设备借用贯穿案例](.template-spec/user-guide/设备借用贯穿案例.md)演示战略、后端、前端与统一验收。[全部手册](.template-spec/user-guide/用户手册索引.md)给出本体和子项目入口。GitHub 当前能力、npm 发布版本与实例模板快照分别核对。
