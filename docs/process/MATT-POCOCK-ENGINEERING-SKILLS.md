# Matt Pocock Engineering Skills 集成与使用说明

> 来源：<https://github.com/mattpocock/skills/tree/main/skills/engineering>

本文说明本模板如何引用和使用 Matt Pocock `skills/engineering`。它不是从零建立工程方法论的完整方案，而是 Codex、Hermes 与人工协作者在需求澄清、PRD、Issue 拆分、TDD、Bug 诊断、架构治理和分诊等场景中的集成说明。

## 1. 总体定位

Matt Pocock Engineering Skills 是一组面向 AI 编码协作的工作流说明。它们不是代码库依赖，而是 Agent 可读取和执行的操作规程，用来把模糊需求逐步转化为：

- 清晰的领域语言
- 可执行的 PRD 和垂直切片 Issue
- 可测试的实现计划
- 严谨的 Bug 诊断闭环
- 面向长期维护的架构改进建议
- 可交接给 Agent 或人工的 Issue 状态

与本模板已有体系的关系：

| 本模板层级 | 已有能力 | Engineering Skills 补充 |
|---|---|---|
| 契约层 | OpenAPI 3.1 / OpenSpec | 将 PRD、Issue 和测试 seam 与契约变更对齐 |
| 方法论层 | Superpowers / TDD / Debug / Review | 提供更细粒度的工程流程和术语 |
| 协作层 | AGENTS.md / Sprint / Review 模板 | 提供 Issue triage、agent brief、handoff、领域文档维护方式 |
| 知识层 | docs/adr、docs/requirements、docs/testing | 引入 `CONTEXT.md` 领域词汇表和 `.out-of-scope/` 决策记忆 |

## 2. 标准执行流程

### 2.1 需求交付流程

| 项 | 内容 |
|---|---|
| 触发语 | “做一个功能”、“把这个想法落成需求”、“生成 PRD/Issue”、“可以开始实现” |
| 使用 skills | `grill-with-docs`、`domain-modeling`、`to-prd`、`to-issues`、`implement`、`tdd` |
| 输入 | 业务想法、发现报告、用户故事草案、干系人讨论记录 |
| 输出 | PRD、OpenAPI 3.1 Spec、垂直切片 Issue、实现与测试 |
| 落点 | `docs/requirements/`、`docs/api/specs/`、GitHub Issues、`CONTEXT.md`、`docs/adr/` |
| 人工确认点 | PRD 范围、OpenAPI 契约、Issue 粒度、安全红线、最终 Review |

执行顺序：

```text
grill-with-docs
  -> domain-modeling
  -> to-prd
  -> OpenAPI 3.1 Draft
  -> Engineering Baseline / YSS DDD review
  -> Architecture / OpenSpec / Comet design validation
  -> Design Review
  -> OpenAPI 3.1 Freeze
  -> OpenSpec / Comet change formalization
  -> to-issues
  -> implement with tdd
  -> independent review / verify
```

门禁：

- PRD 进入开发前必须明确用户故事、验收条件、OpenAPI 影响、测试 seam。
- 任何 API 变更必须先在 `docs/api/specs/*.yaml` 形成 Draft，经工程基线（如适用）、架构 / OpenSpec / Comet design 和设计审查后 Freeze，再进入实现。
- OpenAPI Freeze 后、正式进入 `to-issues` 前，必须存在匹配 active OpenSpec / Comet change，且包含 `proposal.md`、`design.md`、`tasks.md`、至少一个 `specs/**/spec.md` 和 `.comet.yaml`；缺失时先路由到 `comet` 或 `openspec-new-change`。
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
- 只有硬以回滚、非显而易见、存在真实取舍的决策才写 ADR。
- 与既有 ADR 冲突时必须显式指出，并说明为什么值得重新讨论。

### 2.4 Issue 分诊流程

| 项 | 内容 |
|---|---|
| 触发语 | “看下 issue”、“分诊这些需求”、“哪些可以给 Agent 做”、“把 #42 准备好” |
| 使用 skills | `triage`、必要时 `grill-with-docs`、`domain-modeling`、`diagnosing-bugs` |
| 输入 | GitHub Issue、评论、标签、复现步骤、需求背景 |
| 输出 | 分类标签、状态标签、triage notes、agent brief、关闭说明 |
| 落点 | GitHub Issues、`.out-of-scope/`、`CONTEXT.md`、`docs/adr/` |
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

建议本仓库采用：

- Issue tracker：GitHub Issues，配置见 `docs/agents/issue-tracker.md`
- Triage labels：标准五态，配置见 `docs/agents/triage-labels.md`
- Domain docs：单上下文模式，即根目录 `CONTEXT.md` + `docs/adr/`

### 3.2 需求到交付主流程

| Skill | 触发场景 | 核心动作 | 推荐落点 |
|---|---|---|---|
| `ask-matt` | 不确定该走哪个流程 | 路由到合适 skill | 作为入口说明 |
| `grill-with-docs` | 想法还不清晰，需要追问 | 结合领域建模持续追问，沉淀 glossary / ADR | `CONTEXT.md`、`docs/adr/` |
| `to-prd` | 已有对话，需要整理成 PRD | 不再访谈，直接合成 PRD 并发布到 issue tracker | `docs/requirements/` 或 Issue |
| `to-issues` | PRD / 计划需要拆任务 | 拆成可独立领取的垂直切片 Issue | Issue tracker |
| `implement` | 按 PRD 或 Issue 实现 | 业务行为默认按 TDD 推进；生成代码、配置或一次性原型说明例外和验证方式；最后 independent review + fresh verification + commit | 当前代码分支 |

推荐与本模板的交付路径合并为：

```text
grill-with-docs
  -> to-prd
  -> OpenAPI 3.1 Draft
  -> Engineering Baseline / YSS DDD review
  -> Architecture / OpenSpec / Comet design validation
  -> Design Review
  -> OpenAPI 3.1 Freeze
  -> OpenSpec / Comet change formalization
  -> to-issues
  -> implement with tdd
  -> independent review / fresh verification / commit
```

### 3.3 编码与验证

| Skill | 用途 | 关键要求 |
|---|---|---|
| `tdd` | 红绿重构式开发 | 一次只写一个行为测试；测试公共接口，不测实现细节；使用垂直切片 |
| `diagnosing-bugs` | Bug / 性能问题诊断 | 先建立红/绿反馈闭环，再复现、最小化、假设、插桩、修复和回归测试 |
| `prototype` | 用一次性原型回答设计问题 | 逻辑原型用终端小程序，UI 原型用可切换多方案页面；结论沉淀后删除或吸收 |
| `resolving-merge-conflicts` | 处理 merge / rebase 冲突 | 理解双方意图，保留两边真实目的，跑检查，完成 merge/rebase |

与本仓库测试要求的对应：

- Domain / Application 层高覆盖要求可以用 `tdd` 的公共接口测试原则落实
- Bug 修复必须先产生能捕获原始症状的反馈命令
- OpenAPI 变更应优先补充契约测试，再实现前后端
- 原型代码必须明确标记为 throwaway，避免进入生产路径

### 3.4 架构和领域建模

| Skill | 用途 | 核心概念 |
|---|---|---|
| `domain-modeling` | 建立和修正领域模型 | `CONTEXT.md` 只记录业务词汇，不记录实现细节；重大且不可逆决策才写 ADR |
| `codebase-design` | 设计深模块和测试 seam | module、interface、implementation、depth、seam、adapter、leverage、locality |
| `improve-codebase-architecture` | 扫描架构摩擦，输出 HTML 报告 | 找浅模块、坏 seam、难测区域，并提出 deepening opportunities |

建议在本模板中增加一个轻量领域入口：

```text
CONTEXT.md                    # 项目统一领域词汇表
docs/adr/                     # 重大架构决策
docs/architecture/            # 技术方案、审查清单、架构报告
```

`codebase-design` 的价值在于把“架构好不好”转成可操作问题：

- 这个模块的 interface 是否过大？
- 删除它之后复杂度是消失了，还是散落到调用方？
- 测试是否能通过同一个 interface 覆盖真实行为？
- seam 是否真实存在，还是只有一个 adapter 的虚假抽象？

### 3.5 Issue 管理与分诊

| Skill | 用途 | 状态模型 |
|---|---|---|
| `triage` | 对外部 Issue / PR 进行分诊 | `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix` |

`triage` 适合处理“别人提交的原始请求”，不适合重复处理 `to-issues` 已经拆好的 agent-ready Issue。

建议映射：

| Canonical role | 含义 | 本模板建议 |
|---|---|---|
| `needs-triage` | 等待维护者评估 | Sprint Backlog 进入前 |
| `needs-info` | 等待报告者补充信息 | 需求不完整 |
| `ready-for-agent` | Agent 可独立执行 | 可进入 AI 开发队列 |
| `ready-for-human` | 需要人工判断或权限 | 人工任务 |
| `wontfix` | 不处理 | 记录原因；增强型请求可沉淀到 `.out-of-scope/` |

## 4. 模板资产与落点

### 4.1 关键模板

| 模板 | 用途 |
|---|---|
| `docs/templates/prd-template.md` | PRD 标准结构，包含 OpenAPI 影响、测试决策、AI / 人工审查点 |
| `docs/templates/vertical-slice-issue-template.md` | `to-issues` 输出模板，确保每个 Issue 可独立验证 |
| `docs/templates/agent-brief-template.md` | `triage` 输出 `ready-for-agent` brief |
| `docs/architecture/templates/architecture-deepening-template.md` | 架构 deepening 候选与 seam 设计模板 |

### 4.2 与本模板目录结合

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

`to-prd` 和 `to-issues` 默认关注需求和任务拆分，本模板应补充一条硬约束：

> 任何前后端契约变更，必须先在 `docs/api/specs/*.yaml` 中形成 OpenAPI 3.1 Draft，经工程基线、架构 / OpenSpec / Comet design 和设计审查后 Freeze；Freeze 后必须创建或选择匹配 active OpenSpec / Comet change，并确认 `proposal.md`、`design.md`、`tasks.md`、至少一个 `specs/**/spec.md` 和 `.comet.yaml` 存在，才能进入 `to-issues` 和后续前后端实现、契约测试。

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
- [ ] 契约变更、测试 seam、验收标准完整。
- [ ] 安全红线已标注。

### 5.3 Implementation Ready

- [ ] 已读取 `CONTEXT.md` 与相关 ADR。
- [ ] 有一个优先测试 seam。
- [ ] 使用 TDD，一次一个行为测试。
- [ ] 若为 Bug，已有可复现反馈命令。
- [ ] 若触碰安全红线，只能产出草案或等待人工确认。

### 5.4 Review Ready

- [ ] 契约、实现、测试保持一致。
- [ ] 所有新增或变更测试通过。
- [ ] 临时 debug 代码已清理。
- [ ] ADR / `CONTEXT.md` / Issue 状态已同步更新。

## 6. 本地 Skills 维护

当前安装位置：

| Runtime | 安装位置 |
|---|---|
| Codex | `/Users/zhudaoming/.codex/skills/<skill-name>/` |
| Hermes | `/Users/zhudaoming/.hermes/skills/software-development/<skill-name>/` |

安装清单：

```text
ask-matt
codebase-design
diagnosing-bugs
domain-modeling
grill-with-docs
implement
improve-codebase-architecture
prototype
resolving-merge-conflicts
setup-matt-pocock-skills
tdd
to-issues
to-prd
triage
```

维护规则：

- 升级 upstream skills 前先备份 Codex 与 Hermes 安装目录。
- 升级后逐项确认 14 个 `SKILL.md` 文件存在。
- 若 upstream skill 与本仓库 AGENTS.md 冲突，以本仓库安全红线与 OpenAPI 契约规则优先。
- Codex 安装或升级后重启 Codex 以加载新 skills。
- Hermes 安装或升级后运行 `hermes skills list` 确认 enabled 状态。

## 7. 价值总结

Engineering Skills 的主要价值不是“多几个提示词”，而是把 AI 协作从一次性问答变成可治理流程：

- **降低需求损耗**：通过 grill、PRD、Issue、agent brief 把上下文显性化
- **提升可并行性**：用垂直切片 Issue 让多个 Agent 或开发者独立领取
- **提升测试质量**：强调公共接口、真实行为和红绿反馈闭环
- **改善架构可维护性**：用深模块、seam、locality、leverage 统一架构讨论语言
- **沉淀组织知识**：领域词汇进 `CONTEXT.md`，重大取舍进 ADR，拒绝原因进 `.out-of-scope/`
- **控制 AI 风险**：triage 状态和安全红线结合后，可以明确区分 Agent 可做、人类必须介入、拒绝处理三类工作

## 8. 推荐使用顺序

1. 使用本文作为需求、Bug、架构和分诊相关 Engineering Skills 的引用入口。
2. 所有新功能先走 PRD Ready，再走 Issue Ready。
3. 所有 Bug 修复先走 `diagnosing-bugs` 反馈闭环。
4. 每个迭代末运行一次架构治理流程，把高价值 deepening candidate 转成后续需求。
5. 每月检查一次 Codex / Hermes skills 安装完整性和 upstream 更新。
