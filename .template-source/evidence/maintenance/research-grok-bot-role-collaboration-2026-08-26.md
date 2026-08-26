# Grok Bot 多角色协同与审批边界事实研究

> 日期：2026-08-26
>
> 研究性质：只读事实研究，不作架构决策，不修改 `docs/` 分发面、共享 skill 或生命周期注册表，不宣布模板可发布。
>
> 仓库身份：`repository_mode: template-source`（`yss-project.yaml`）。
>
> 存放位置：模板源治理区 `.template-source/evidence/maintenance/`。按 ADR-0008，研究记录不进入 `docs/` 分发面。

## 研究问题

若要在 **Grok Bot** 上为 YSS 研发生命周期构建多个数字人角色（前端工程师、后端工程师、测试工程师、产品经理、项目经理、需求经理、商务），并让它们协同：

1. 平台把 Bot、Skill、审批分别定义成什么？
2. 多 Bot 协同的真实能力与硬限制是什么？
3. 这些事实与本仓库现有「Agent / 生命周期编排器 / 人工门禁 / 技能投影」模型如何对照？

本题不是某个具体产品的 Discovery / Spec；`yss-product-lifecycle` 按模板维护路由，禁止生成产品 Spec、原型、OpenAPI 或垂直切片 Ticket。

## 来源范围

一手来源（2026-08-26 读取）：

| 来源 | 地址 / 对象 | 用途 |
|---|---|---|
| Create and manage Bots | https://docs.x.ai/grok-bot/bots | Bot 身份、何时拆分、记忆、共享计算机、组队建议 |
| Message and collaborate | https://docs.x.ai/grok-bot/chat-and-collaboration | 群聊人数、@ 提及、异步交接、证据要求 |
| Skills and routines | https://docs.x.ai/grok-bot/skills-routines-and-automations | Skill 与 Routine 区别、Skill 跨 Bot 可见、按 Bot 启用 |
| Approvals, security and privacy | https://docs.x.ai/grok-bot/approvals-security-and-privacy | 平台审批、Auto Review、共享计算机不是安全边界 |
| Introducing Grok Bot | https://x.ai/news/introducing-grok-bot | 产品定位：数字队友、Chief of Staff 模式、只在需要判断时找人 |
| 本仓库 Agent 词汇 | `CONTEXT.md` | Agent ≠ 人工审查者 |
| 技能运行时入口 | `docs/agents/yss-skill-registry.yaml` | 现有投影根不含 `grok` |
| 生命周期编排 | `docs/process/lifecycle-registry.yaml`、`orchestration-contract.yaml` | 人工门禁、实现者 ≠ 审查者、写范围 |
| Subagent 任务包 | `docs/process/subagent-collaboration.md`、`docs/templates/subagent-task-package-template.md` | Explorer / Drafter / Worker / Reviewer / Verifier |
| 职能 Agent 表 | `docs/user-guide/产品研发全生命周期最佳实践.md` | Discovery / Spec / API / Code / Review / Verify |

未作为事实来源：第三方博客对共享计算机故障的评测、未标注版本的运营帖。MindStudio 等二手「Chief of Staff」教程只用来对照官方新闻里已出现的「one to manage the others」表述，不引用其操作步骤。

## 平台对象

### Bot

官方定义：Bot 是持久的 AI 队友，有名字、岗位、独立会话和随时间积累的工作上下文。应在下列因素**有稳定差异**时才拆成新 Bot：目标 / 所有权、工具与来源、工作方式、**审批边界**、周期性日程。岗位应写成可操作职责，而不是「通用助手」。

账户上限：最多 **50** 个 Bot 与群聊合计。复制 Bot 会带上 profile、settings、已启用 skill、routines、avatar，**不会**复制会话历史、learned memory、聊天附件。

### Skill 与 Routine

- **Skill**：如何完成一类任务（步骤、决策规则、输出、安全边界）。Skill 在账户内跨 Bot 可用；Bot 仍需要对应 connector / login。**私有 Skill 可按 Bot 启用**；未在当前 Bot 启用时，`/` 菜单不出现。
- **Routine**：把工作流绑到**某一个** Bot，按日程或（在支持时）事件触发。每个 Bot 最多 50 条 routine。

这与本仓库「canonical skill 在 `.agents/skills`，再投影到 Claude / Codex / Cursor 等 root」不同：Grok Bot 的 Skill 是账户级插件 + 每 Bot 启用开关，**当前 `agent_runtime_roots` 没有 `grok` 键**。

### 平台「审批」不是生命周期门禁

Grok Bot 的 approval 控制的是**拟执行的工具 / 计算机动作**（发消息、发布、付款、删除、改生产、接受法律条款等）。人在会话里 **Allow once / Deny / Always allow**。Auto Review 的 `Require Approval` 永远对人停下；`Always Allow` 仅在模型审查未发现其他阻止理由时放行；两者同时命中时 **Require Approval 胜出**。

官方明确：审批管的是拟议动作，**不能撤销已经做完的工作**。密码、2FA、CAPTCHA、支付确认必须由人接管计算机，不要把口令打进普通聊天。

因此存在两套不可混用的「批准」：

| 名称 | 所有者 | 关闭的是什么 |
|---|---|---|
| Grok 平台审批 | 当前账号的生物人（或 Auto Review 规则） | 外部副作用 / 高风险工具调用 |
| YSS 生命周期门禁 | 编排器状态机 + `evidence.approval-record` | Spec 基线、原型确认、OpenAPI Freeze、发布等 |

Bot 在生命周期里「代签」**不会**自动等于 Grok 的 Always Allow。反过来，人点了 Allow once 也不等于 `gate.spec-baseline-approved`。

## 协同能力与硬限制

1. **群聊 2–6 个 Bot。** 官方建群步骤是选择 two to six Bots。七个业务数字人 + 主控 = 8，**不能**放进同一个群聊。可见会签必须按阶段拆群，或改用 1:1 异步交接。
2. **异步交接是一等能力。** Bot 可给另一 Bot 发异步消息；接收方醒来处理并可稍后回复。适用于源系统所有者 ≠ 交付物所有者、专家审稿、阻塞改派。官方要求**每个阶段只有一个 owner**，并行交接过多会造成重复劳动。
3. **群内 Bot-to-group 交接目前仅文本。** 需要对方看图时，应直接发给那个 Bot，不要只丢进群。
4. **所有 Bot 共享同一台云计算机。** 文件、浏览器会话、命令行凭据在整个 roster 间可见。官方原文：*Do not use separate Bots as a security boundary.* 本仓库「任务包写范围不重叠」在 Grok 上只能靠 **description + 任务包 + 纪律** 约束，不能靠平台隔离。
5. **记忆不是权威源。** 官方要求变化中的事实留在源系统；重大决策要引用或重开当前数据；安全边界写进 Bot description。这与本仓库 `CONTEXT.md` / git 资产作为单一事实来源一致。
6. **Chief of Staff 是官方推荐形态。** 产品介绍：常有一个 Bot 管理其他 Bot；群聊里它们自己传递工作、分配所有权，只在判断点找人。这与 Q6「主控默认 + 生命周期编排器不放权给职称 Bot」同构：主控 ≈ Grok 侧的协调 Bot，七个数字人 ≈ specialist。

## 与本仓库模型的对照（事实，不是决策）

| 本仓库概念 | Grok Bot 近似物 | 不能等同的原因 |
|---|---|---|
| Agent | 一次 Bot 会话中的执行者 | Bot 是持久队友；Agent 词汇禁止与人工审查者混用 |
| 生命周期编排器 | 主控 / Chief of Staff Bot | 编排器拥有门禁与 Ticket 状态；Grok 群聊没有这些状态机 |
| 职能 Agent（Discovery / Spec / Code / Review） | 按阶段的工作方式 | 用户要的是职称数字人，二者正交（已确认叠加） |
| Subagent Explorer / Worker / Reviewer | 一次任务的执行态 | 官方按「岗位 + 审批边界」拆 Bot，不按 Explorer 拆 |
| `.cursor/skills` 投影 | Grok 私有 Skill 按 Bot 启用 | 无官方「从 git 仓库同步 skill 到 Grok」契约；需另做投影或手工安装 |
| `implementer_must_be_separate` | 不同 Bot 审不同 Bot 的草稿 | 共享计算机意味着审查者**读得到**实现者文件；独立性是角色纪律，不是权限沙箱 |
| `ready-for-human` | Grok 对人停下的 approval | 门禁是资产状态；Grok 审批是工具调用 |

## 对后续模板设计的约束（仍非批准）

若继续把数字人角色做成 Grok Bot 可安装配置，模板至少必须同时说清：

1. 每个数字人角色的 **Grok description**（岗位、可写产物、禁止事项、何时必须 `@` 主控）。
2. 每个角色 **应启用的 skill 子集**（即使账户里能看到更多 skill）。
3. **阶段群聊清单**（每群 ≤ 6），以及不进群时的 1:1 交接顺序。
4. **两套审批**：哪些动作走 Grok Require Approval（对人）；哪些生命周期门禁允许数字人会签（对编排器），证据如何落 `evidence.approval-record`。
5. 写范围写进 description 与任务包，并写明共享磁盘不是隔离。

## 未决（交还 grilling）

- 数字人会签可关闭哪些 `gate.*`，哪些仍必须生物人。
- 主控与「项目经理」在 Grok roster 上是一个 Bot 还是两个。
- 模板源如何把 `.agents/skills` 交到 Grok（新 runtime root、手工 Pack、还是只提供 description 包）。

以上未决项不是本研究的结论。
