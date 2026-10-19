# YSS 综合研发主控模板（Spec Profile）

English overview: [README.en.md](README.en.md).

> 可版本化的研发治理系统：Matt Pocock Engineering Skills × YSS × OpenAPI，把产品研发从需求澄清连接到实现、审查、发布与复盘。

## 定位

本模板默认作为 Harness / 研发管理仓库，保留流程文档、契约模板、Agent skills 和协作约定。后端源码默认位于明确登记的实现仓库；前端实现由独立规格与 CLI 维护，不在本模板。

默认一名 Agent 在 Spec 内连续完成需求、必要产品设计及适用后端工作，按显式目标推进；新建使用 Spec、Backend Profile，定义见 [Profile 注册](scripts/lib/profile-tree.mjs)。旧 Design 通过显式迁移并入 Spec，原记录与原批准保持原字节。Spec 文档批准、产品设计完成、后端可交付、前端验收和业务验收是可选的本次终点；终点改变保留当前批准和后续路线。专职 Profile 继续按自身职责结束，主控通过显式同功能 checkpoint 与当前接收证据汇总。见[本次推进目标与专职协作](.template-spec/process/lifecycle-progression.md)。

## 项目结构

```text
├── .agents/skills/          ← 共享技能权威内容
├── .claude/skills/          ← Claude Code 技能入口（指向 .agents/skills 的生成链接）
├── AGENTS.md                ← Agent 入口规则
├── CONTEXT.md               ← 唯一业务词汇表
├── yss-project.yaml         ← 仓库身份
├── .template-spec/          ← 可复用流程、门禁、契约与文档模板
├── .template-source/        ← 现行模板维护资产与分发工具（不进入实例；运行历史存仓外）
├── docs/                    ← 项目实例按需创建的 Plan、Spec、设计、Ticket 与交付证据；模板源不跟踪 docs/superpowers 技能输出
└── scripts/                 ← 合同与流程验证工具
```

项目需要生成度量、外部实现仓库记录或其他临时产物时再按需创建对应目录。前后端实现仓库接入规则见 `.template-spec/process/implementation-repo-integration.md`。

## Quickstart

只需后端开发脚手架时，可直接使用 `yss-layered-mvc-scaffold-generator`（MVC）或 `yss-ddd-scaffold-generator`（DDD），无需先准备需求合同、原型、设计审批或初始化治理实例。提供工程信息即可生成，命令与参数见[直接生成开发脚手架](.agents/skills/yss-ddd-scaffold-generator/references/standalone-generation.md)。

- **项目使用者**：从[从这里开始](.template-spec/user-guide/用户手册索引.md)完成第一个日常任务。Agent 的入口与硬门禁只在 `AGENTS.md`。
- **模板维护者**：按 `.template-source/process/maintenance-intensity.yaml` 判定 L1 / L2，先看 `scripts/verify-template-fast --plan`，日常执行受影响依赖的定向检查达到 `implementation-ready`；投影、锁和分发在 canonical 稳定后同步。

YSS skills 的公开发布投影维护在 [iloveZzz/yss-spec-dev-skills](https://github.com/iloveZzz/yss-spec-dev-skills)，发布清单和导出命令见 [skills 维护说明](./.template-source/agents/skills-maintenance.md)。

前端实现技能（YSS UI、Formily、表格/树组件、前端脚手架等）已从本模板退役，改由独立的前端规格与 CLI 维护；退役 ID 与迁移说明见 [技能迁移说明](./.template-spec/agents/skill-migrations.md)。

## 模板初始化 CLI

新实例 Profile（spec、backend）使用 [yss-cli](https://github.com/iloveZzz/yss-cli) 的原生 `yss` 入口，本仓的内核与 Backend 覆盖层共同维护。初始化、预演、事务、迁移及 Bundle 导出消费版本化协议：

- [YSS 用户手册：CLI 能力与写入方式](./.template-spec/user-guide/用户手册.md#cli-能力与写入方式)
- [YSS 用户手册：接管、同步与恢复](./.template-spec/user-guide/用户手册.md#接管同步与恢复)

推荐入口：

```bash
yss init --profile spec --root /absolute/path/project --plan --out /absolute/path/init-plan.json --json
yss init --profile spec --root /absolute/path/project --apply --plan-file /absolute/path/init-plan.json --json
```

`init` 默认直接初始化；上述 `--plan` 路线先生成可审阅计划。使用已固定版本和 SHA-256 的二进制；稳定版发行状态以发行清单为准。旧格式保持明确的读取范围；统一 metadata3 实例通过 `yss migrate --plan --out <新文件>` 显式迁移，Design 必须指定 `--profile spec`。更早或未知格式保留原件并报告不支持。完整安装、补装、恢复及退役边界见 [统一 CLI 操作说明](.template-spec/user-guide/unified-cli.md)。

## 模板配置取舍

`.agents/skills` 是共享技能的权威内容；模板源只生成 `.claude/skills` 链接供 Claude Code 发现，Codex、Cursor、Pi 直接读取 `.agents/skills`；实例平台投影由实例锁声明。共享技能只能在权威目录修改，随后运行：

```bash
scripts/sync-skills
scripts/update-skill-lock
```

Matt skills 的上游来源与固定 revision 见 [`skills-lock.json`](skills-lock.json)，说明文档不复述。

主研发流程使用 `skills/engineering`；`skills-lock.json` 同时记录本次安装的关联 `productivity`、`in-progress`、`deprecated`、`misc` 和 `personal` skill 路径。

## 模板校验

```bash
scripts/verify-template-fast
```

快速入口先用 `--plan` 按 Git 影响面选择当前变化及直接/传递消费者的必要检查；未映射路径、缺输入映射或非法依赖先修正计划，不自动运行全量。来源为当前工作树，日常交付记录 `limited` 范围，必要检查通过后用于 `implementation-ready`。发布入口要求已提交来源，必须以 `--base <上一正式发行完整 SHA>` 覆盖完整发行差异，选择受影响检查与依赖并保留来源、安装与恢复验证。两个入口按适用范围检查：

- `yss-project.yaml`、权威流程资产和模板是否完整。
- 共享技能唯一 canonical 来源及 `skills-lock.json` 是否一致。
- 过时技能、路径和规范用语是否已清理。
- 五类流程压力场景是否符合条件门禁和仓库身份路由。
- Markdown 相对链接是否指向现有文件。
- 示例 OpenAPI YAML 是否可解析。
- Git diff 是否存在空白错误。

PR 执行 `scripts/verify-template-fast --base <完整 SHA>`；显式 main 集成与正式发布任务执行 `scripts/verify-template --base <上一正式发行完整 SHA>` 的必要检查集合，未映射路径不能静默省略。默认自检；用户明确要求或已知外部规则要求独立复核时，核验真实独立上下文、相同冻结候选及只读轨迹。

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

[现行家族用户手册](.template-spec/user-guide/用户手册.md)提供选型、初始化及升级；[设备借用贯穿案例](.template-spec/user-guide/设备借用贯穿案例.md)演示战略、后端、前端与统一验收。[全部手册](.template-spec/user-guide/用户手册索引.md)给出本体和子项目入口。GitHub 当前能力、npm 发布版本与实例模板快照分别核对。
