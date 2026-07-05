# Matt Pocock Engineering Skills 集成与使用说明

> 来源：<https://github.com/mattpocock/skills/tree/main/skills/engineering>
> 项目内置快照：`272f99b22574f50e4266791c86b9302682970e23`

本文说明本模板如何使用 Matt Pocock `skills/engineering` 作为默认轻量研发流程。它不是代码库依赖，而是 Agent 可读取和执行的操作规程，用来把模糊需求逐步转化为 PRD、OpenAPI 契约、垂直切片 Issue、TDD 实现、审查和验证证据。

## 1. 总体定位

Matt Pocock Engineering Skills 是一组小而可组合的工程工作流。本仓库用它替代重型流程编排，并保留 YSS 专项技能、OpenAPI 3.1 契约和轻量 OpenSpec-style Spec Delta。

| 本模板层级 | 默认能力 | 说明 |
|---|---|---|
| 需求与任务 | `competitive-intelligence`、`grill-with-docs`、`to-prd`、`to-issues` | 收集竞品 / 市场事实、澄清需求、沉淀 PRD、拆端到端垂直切片 |
| 契约层 | OpenAPI 3.1 Draft / Freeze、OpenSpec-style Spec Delta | 前后端契约、行为差异、验收场景和契约测试输入 |
| 方法论层 | `implement`、`tdd`、`diagnosing-bugs`、`code-review` | 实现、红绿重构、Bug 诊断和独立审查 |
| 架构与领域 | `domain-modeling`、`codebase-design`、`improve-codebase-architecture` | 领域语言、深模块设计、架构治理 |
| 协作层 | `triage`、Issue tracker、Git checkpoint | 分诊、同步状态、记录验证证据 |

## 2. 标准执行流程

### 2.1 需求交付流程

| 项 | 内容 |
|---|---|
| 触发语 | “做一个功能”、“把这个想法落成需求”、“生成 PRD/Issue”、“可以开始实现” |
| 使用 skills | `competitive-intelligence`（需要竞品 / 市场事实时）、`grill-with-docs`、`domain-modeling`、`to-prd`、`to-issues`、`implement`、`tdd`、`code-review` |
| 输入 | 业务想法、发现报告、用户故事草案、干系人讨论记录 |
| 输出 | PRD、OpenAPI 3.1 Spec、垂直切片 Issue、实现与测试 |
| 落点 | `docs/requirements/`、`docs/api/specs/`、GitLab / GitHub Issues、`CONTEXT.md`、`docs/adr/` |
| 人工确认点 | PRD 范围、OpenAPI 契约、Issue 粒度、安全红线、最终 Review |

执行顺序：

```text
competitive-intelligence (when market / competitor facts are needed)
  -> grill-with-docs
  -> domain-modeling
  -> to-prd
  -> OpenAPI 3.1 Draft
  -> OpenSpec-style Spec Delta (medium/high-risk behavior changes)
  -> Engineering Baseline / YSS DDD review
  -> Architecture / Data Design Review
  -> OpenAPI 3.1 Freeze
  -> to-issues
  -> implement with tdd
  -> code-review / fresh verification
```

门禁：

- PRD 进入开发前必须明确用户故事、验收条件、OpenAPI 影响和测试决策。
- 任何 API 变更必须先在 `docs/api/specs/*.yaml` 形成 Draft，经工程基线、系统 / 数据架构和设计审查后 Freeze，再进入实现。
- API、权限、状态机、数据模型、跨端、新模块或高风险行为变化，应在 Design Review / OpenAPI Freeze 前补 OpenSpec-style Spec Delta；它只描述行为差异、验收场景和测试映射，不恢复 OpenSpec 工具链。
- OpenAPI Freeze 后进入 `to-issues` 或等价垂直切片拆分；Issue 必须可以独立 demo 或验证。
- 后端新服务或新模块必须先确认 YSS DDD 工程基线；从零创建服务时优先使用 `yss-ddd-scaffold-generator`。
- `to-issues` 只能产出可独立验证的垂直切片，不允许只按 Adapter / Application / Domain / Infrastructure 横向拆分。
- 涉及安全红线时，Issue 必须标注 `ready-for-human` 或 `TODO-HUMAN-REVIEW`。

### 2.2 Bug 修复流程

| 项 | 内容 |
|---|---|
| 触发语 | “报错了”、“测试失败”、“性能变慢”、“偶现问题”、“帮我 debug” |
| 使用 skills | `diagnosing-bugs`、`tdd`、必要时 `domain-modeling` |
| 输入 | 报错信息、复现步骤、日志、失败测试、性能指标 |
| 输出 | 可复现反馈命令、最小复现、假设列表、回归测试、修复说明 |
| 落点 | 测试文件、Issue/PR 评论、审查报告、必要时 ADR |
| 人工确认点 | 无法复现、缺少环境、触碰安全红线、需要生产插桩 |

门禁：

- 不得先猜原因再改代码；必须先建立能捕获原始症状的反馈命令。
- 修复前必须把最小复现转成回归测试；如果没有合适 seam，必须记录为架构问题。
- 临时 debug 日志必须带唯一前缀，完成后删除。

### 2.3 架构治理流程

| 项 | 内容 |
|---|---|
| 触发语 | “这个模块难改”、“帮我看架构”、“哪里可以重构”、“测试很难写” |
| 使用 skills | `improve-codebase-architecture`、`codebase-design`、`domain-modeling`、必要时 `grill-with-docs` |
| 输入 | 代码结构、测试痛点、维护痛点、ADR、领域词汇表 |
| 输出 | 架构深度报告、deepening candidate、接口/seam 设计、ADR |
| 落点 | `docs/architecture/`、`docs/adr/`、`CONTEXT.md`、后续 Issue |
| 人工确认点 | 是否采纳候选重构、是否重开已有 ADR、是否投入 Sprint |

门禁：

- 架构建议必须使用 `module`、`interface`、`seam`、`adapter`、`depth`、`leverage`、`locality` 术语。
- 只有难以回滚、非显而易见、存在真实取舍的决策才写 ADR。
- 与既有 ADR 冲突时必须显式指出，并说明为什么值得重新讨论。

### 2.4 Issue 分诊流程

| 项 | 内容 |
|---|---|
| 触发语 | “看下 issue”、“分诊这些需求”、“哪些可以给 Agent 做”、“把 #42 准备好” |
| 使用 skills | `triage`、必要时 `grill-with-docs`、`domain-modeling`、`diagnosing-bugs` |
| 输入 | GitLab / GitHub Issue、评论、标签、复现步骤、需求背景 |
| 输出 | 分类标签、状态标签、triage notes、agent brief、关闭说明 |
| 落点 | GitLab / GitHub Issues、`.out-of-scope/`、`CONTEXT.md`、`docs/adr/` |
| 人工确认点 | 状态跳转异常、信息不足、拒绝请求、必须人工实现 |

状态模型：

- `needs-triage`：等待维护者评估。
- `needs-info`：等待报告者补充信息。
- `ready-for-agent`：已具备 Agent 独立执行条件。
- `ready-for-human`：需要人工判断、权限或安全审查。
- `wontfix`：明确不处理。

## 3. Skills 分类

### 3.1 一次性初始化

| Skill | 用途 | 产物 |
|---|---|---|
| `setup-matt-pocock-skills` | 为仓库配置 issue tracker、triage label、领域文档布局 | `docs/agents/issue-tracker.md`、`docs/agents/triage-labels.md`、`docs/agents/domain.md`，并在 `AGENTS.md` 增加 Agent skills 区块 |

本仓库已完成项目内置安装。后续升级应按固定快照同步，并在 Git diff 中检查技能目录变化。

### 3.2 需求到交付主流程

| Skill | 触发场景 | 核心动作 | 推荐落点 |
|---|---|---|---|
| `ask-matt` | 不确定该走哪个流程 | 路由到合适 skill | 作为入口说明 |
| `competitive-intelligence` | 需要竞品、替代方案、定价、定位、用户口碑或市场事实 | 基于公开来源形成竞品情报、证据表、竞品矩阵和 PRD 输入 | `docs/discovery/reports/` |
| `grill-with-docs` | 想法还不清晰，需要追问 | 结合领域建模持续追问，沉淀 glossary / ADR | `CONTEXT.md`、`docs/adr/` |
| `to-prd` | 已有对话，需要整理成 PRD | 不再访谈，直接合成 PRD 并发布到 issue tracker | `docs/requirements/` 或 Issue |
| `to-issues` | PRD / 计划需要拆任务 | 拆成可独立领取的垂直切片 Issue | Issue tracker |
| `implement` | 按 PRD 或 Issue 实现 | 业务行为默认按 TDD 推进；生成代码、配置或一次性原型说明例外和验证方式；最后 independent review + fresh verification + commit | 当前代码分支 |

### 3.3 编码与验证

| Skill | 用途 | 关键要求 |
|---|---|---|
| `tdd` | 红绿重构式开发 | 一次只写一个行为测试；测试公共接口，不测实现细节；使用垂直切片 |
| `diagnosing-bugs` | Bug / 性能问题诊断 | 先建立红/绿反馈闭环，再复现、最小化、假设、插桩、修复和回归测试 |
| `prototype` | 用一次性原型回答设计问题 | 逻辑原型用终端小程序，UI 原型用可切换多方案页面；结论沉淀后删除或吸收 |
| `resolving-merge-conflicts` | 处理 merge / rebase 冲突 | 理解双方意图，保留两边真实目的，跑检查，完成 merge/rebase |
| `code-review` | 审查实现是否符合标准和规格 | 从固定 diff 基准出发，分别审查 coding standards 和 spec fidelity |

与本仓库测试要求的对应：

- Domain / Application 层高覆盖要求可以用 `tdd` 的公共接口测试原则落实。
- Bug 修复必须先产生能捕获原始症状的反馈命令。
- OpenAPI 变更应优先补充契约测试，再实现前后端。
- 原型代码必须明确标记为 throwaway，避免进入生产路径。

### 3.4 架构和领域建模

| Skill | 用途 | 核心概念 |
|---|---|---|
| `domain-modeling` | 建立和修正领域模型 | `CONTEXT.md` 只记录业务词汇，不记录实现细节；重大且不可逆决策才写 ADR |
| `codebase-design` | 设计深模块和测试 seam | module、interface、implementation、depth、seam、adapter、leverage、locality |
| `improve-codebase-architecture` | 扫描架构摩擦，输出 HTML 报告 | 找浅模块、坏 seam、难测区域，并提出 deepening opportunities |

## 4. 模板资产与落点

| Engineering Skills 产物 | 本模板建议位置 |
|---|---|
| PRD | `docs/requirements/`，必要时同步到 Issue |
| OpenAPI 契约 | `docs/api/specs/` |
| ADR | `docs/adr/` |
| 架构方案 | `docs/architecture/` |
| 测试策略 | `docs/testing/` |
| Sprint / Standup / Retro | `docs/process/` |
| Issue tracker 配置 | `docs/agents/` |
| 领域词汇表 | 根目录 `CONTEXT.md` |

## 5. 门禁与验收规则

### 5.1 PRD Ready

- [ ] 问题陈述与解决方案明确。
- [ ] 用户故事覆盖主要用户路径。
- [ ] 验收标准可验证。
- [ ] OpenAPI 影响明确为“无”或列出 Draft spec 文件；进入开发前必须 Freeze。
- [ ] 测试决策明确测试 seam。
- [ ] AI / 人工审查点标注安全红线和人工确认点。

### 5.2 Issue Ready

- [ ] Issue 是一个端到端垂直切片。
- [ ] 完成后可独立 demo 或验证。
- [ ] Blocked by 清楚。
- [ ] 测试命令和 fresh verification 方式清楚。
- [ ] 涉及 OpenAPI 时引用 Freeze 记录。

### 5.3 Implementation Ready

- [ ] `yss-router` 已选择最小 YSS skill 集合。
- [ ] Build Architecture Checklist 已绑定当前切片。
- [ ] TDD 适用性已明确；若例外，说明验证方式。
- [ ] 安全红线和人审点已标注。
- [ ] 实现仓库、分支、测试命令和回滚点清楚。
