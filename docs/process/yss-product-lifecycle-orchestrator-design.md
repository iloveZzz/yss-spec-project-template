---
status: accepted
owner: ai
review_state: approved
---

# `yss-product-lifecycle` 全生命周期编排器增强设计

> 日期：2026-07-21
> 仓库身份：`template-source`
> 方法：`grill-with-docs` + `domain-modeling` + `writing-skills` RED / GREEN / REFACTOR
> 范围：定义后续 skill 改造方案；本文不表示当前 skill 已具备所述能力。

> 实施状态：设计已由用户确认，后续实现与验证证据见 `docs/process/yss-product-lifecycle-orchestrator-validation.md`。

## 1. 结论

`yss-product-lifecycle` 保持 YSS 产品研发全生命周期编排器定位。它既具有类似 `ask-matt` 的入口路由能力，也负责 YSS 环境中的阶段判定、条件门禁、资产状态、专项 skill 编排、暂停与恢复、证据汇总和状态推进。

它不替代以下能力：

- Matt skills：提供通用工程工作流和问题解决方式。
- YSS skills：提供前端、后端、OpenAPI、DDD、Repository、Web 等专项工程规范。
- 权威生命周期资产：保存 Spec、设计、OpenAPI、架构、Ticket、验证和发布事实。
- 人工裁决：负责需求冻结、原型确认、OpenAPI Freeze、架构放行、安全红线、合并和发布等不可委派决策。

编排器拥有 YSS 环境下的最终门禁裁决权，但不绕过专项 skill 直接规定或生成业务实现。

## 2. 已确认的设计决策

1. 保留 8 个主阶段；不将 21 个条件门禁重新展开为线性阶段。
2. 支持 `route`、`orchestrate`、`resume`、`audit` 四种入口模式。
3. `orchestrate` 采用有界自动推进：连续完成安全、可逆且无需人工取舍的工作，遇到人工门禁、真实阻塞或完成裁决时暂停。
4. 功能父 Ticket 是主要编排状态载体；平台不可用时使用本地 stage checkpoint 降级。
5. 状态记录只保存索引、状态和因果关系；Spec、OpenAPI、架构等文档仍是业务事实来源。
6. 资产就绪度不能只按文件存在判断，必须校验内容、审查结论和上游新鲜度。
7. 建立资产依赖图；上游变化按影响类型精准传播 `stale`，不默认整体回退阶段。
8. Matt 五态标签保持原义，生命周期、门禁、资产和 workflow 状态分层管理。
9. `ask-matt` 是通用导航入口；`yss-product-lifecycle` 是 YSS 环境中的最终编排裁决者。
10. 使用生命周期适配层衔接 Matt skills；只对违反模板硬规则的 Matt skill 做最小必要修改。
11. 编排器持续主控阶段 7 的实现活动，但具体实现必须委托 `implement`、`tdd` 和选定的 YSS skills。
12. `template-source` 只维护和验证可复用编排契约，不生成具体产品生命周期资产。

## 3. 三层职责模型

| 层 | 责任 | 典型能力 | 不负责 |
|---|---|---|---|
| 生命周期编排层 | 判断阶段、影响面、门禁、状态、下一工作单元；控制暂停、恢复和完成结论 | `yss-product-lifecycle` | 代替专项 skill 写业务实现 |
| 通用工作流层 | 需求澄清、决策地图、Spec 综合、Ticket 拆分、TDD、诊断、审查、handoff | Matt skills | 决定 YSS 门禁是否放行 |
| YSS 专项层 | 执行 YSS UI、DDD、OpenAPI、DTO、Repository、Controller 等规范 | `yss-router` 与专项 skills | 重新定义产品生命周期状态 |

冲突裁决顺序：

1. 用户明确指令和不可委派的人工决定。
2. `AGENTS.md` 的仓库身份、硬门禁和禁止事项。
3. `docs/process/lifecycle-artifact-map.md` 的阶段和门禁事实。
4. `docs/process/harness-process-tailoring.md` 的影响面与裁剪规则。
5. 生命周期编排器对当前功能的证据核验结果。
6. Matt/YSS 专项 skill 的局部执行建议。

## 4. 入口模式

| 模式 | 典型请求 | 允许的动作 | 停止条件 |
|---|---|---|---|
| `route` | “这个需求应该怎么做？” | 只读检查并给出阶段、缺口、最小 skill 集和下一动作 | 路由结论形成 |
| `orchestrate` | “推进/完成这个功能” | 有界自动推进、创建或更新授权范围内的资产、调用专项 skill、同步状态 | 人工门禁、真实阻塞、实现授权边界、完成裁决 |
| `resume` | “继续之前的功能” | 从父 Ticket、handoff、checkpoint 和真实资产恢复，再继续有界推进 | 与 `orchestrate` 相同；状态不一致时先修复状态 |
| `audit` | “检查是否可开发/可合并/可发布” | 只读核验资产、门禁、新鲜度、验证证据和风险 | 输出审计结论；不得顺带修复 |

模式自动推断，用户可显式覆盖。无法可靠判断时默认 `route`。

## 5. 阶段、门禁与 Matt skills 对应

8 个主阶段描述产品研发状态，Matt skills 描述工作方式，两者不是一一对应关系。

| 生命周期阶段或入口 | Matt flow / skill | YSS 编排补充 |
|---|---|---|
| 首次启用前置检查 | `setup-matt-pocock-skills` | 幂等检查 tracker、标签、领域文档布局；冲突时进入迁移而非覆盖 |
| 任意入口分诊 | `ask-matt` 的 main flow、on-ramp、detour、standalone 语义 | 叠加仓库身份、影响面、YSS 门禁和资产状态 |
| 机会与 Discovery | `research`、`grill-with-docs`；市场事实使用 `competitive-intelligence` | 形成 Discovery 输入和下游影响信号，不冻结下游设计 |
| 大型模糊工作 | `wayfinder` | 使用决策地图清除 fog；地图完成后回到 `to-spec` |
| 业务 / Spec / 功能架构 | `grill-with-docs`、`domain-modeling`、`prototype`、`to-spec` | 校验 Spec baseline、功能架构和术语回填 |
| 产品设计与需求冻结 | `prototype`、`handoff` | throwaway prototype 只回答问题；正式高保真原型走 Product Design/YSS 路由 |
| 系统 / 数据架构与工程契约审查 | `research`、`codebase-design`、`handoff` | 编排 OpenAPI、系统/数据架构、工程基线和 Design Review 专项 skills |
| 契约冻结与 Ticket 正式化 | `to-tickets` | 仅从冻结资产生成垂直切片；保留阻塞边和 tracker 路由 |
| 垂直切片实现 | `implement`、`tdd`、`diagnosing-bugs`、`resolving-merge-conflicts` | 先完成实现仓库、YSS routing、Implementation Contract 和 Build Architecture Checklist |
| 独立审查 | `code-review` | 同时校验 Spec fidelity、YSS 标准、安全红线和 fresh verification |
| 架构健康 | `improve-codebase-architecture`、`codebase-design` | 新机会重新进入 `grill-with-docs`，不直接扩张当前切片 |
| 跨会话或仓库 | `handoff` | 保存来源资产、阶段、未决问题、验证命令和下一责任人 |

### 5.1 `ask-matt` 兼容关系

- 直接调用 `ask-matt` 时，先给出通用 Matt flow；检测到 YSS 规格模板后，将最终治理交给 `yss-product-lifecycle`。
- 直接调用 `yss-product-lifecycle` 时，编排器使用同一 Matt flow 映射，不机械嵌套调用 `ask-matt`。
- Matt flow 决定“如何工作”；YSS 生命周期决定“是否允许进入下一状态”。

### 5.2 `wayfinder` 回流协议

```text
lifecycle.stage = opportunity-and-discovery
workflow.matt_flow = wayfinder
workflow.status = active
→ 逐个解决 decision ticket
→ destination 清晰且无未解决 frontier/fog
→ workflow.status = resolved
→ handoff / context pointer
→ to-spec
```

Wayfinder decision ticket 不是实现切片，不得因其可领取而标记 `ready-for-agent`。研究型 decision ticket 可由 Agent 独立执行；grilling/prototype 等 HITL ticket 必须保留人工参与。

### 5.3 `grill-with-docs` 退出协议

进入 `to-spec` 前至少确认：

- 用户、问题、MVP、非目标和成功标准已经明确。
- 已确认问题与未决问题分开记录。
- 稳定术语已回填 `CONTEXT.md`；符合 ADR 三条件的决策已提出记录建议。
- 需要事实证据的问题已路由 `research`。
- 需要可运行反馈的问题已路由 `prototype`。
- 用户确认当前理解足以形成 Spec 初稿。

## 6. 分层状态模型

### 6.1 状态域

| 状态域 | 用途 | 允许值示例 |
|---|---|---|
| `lifecycle.stage` | 当前最近可信主阶段 | 8 个主阶段的稳定标识 |
| `lifecycle.status` | 当前编排器状态 | `routing`、`running`、`paused-human-gate`、`blocked`、`completed` |
| `workflow.status` | 当前 Matt/YSS 工作流执行状态 | `not-started`、`active`、`paused`、`resolved`、`failed` |
| `artifacts.<name>.status` | 资产完整性、审查和新鲜度 | `missing`、`draft`、`ready-for-human`、`approved`、`stale`、`not-applicable` |
| `gates.<name>.status` | 条件门禁结论 | `not-evaluated`、`blocked`、`ready-for-human`、`approved`、`stale`、`not-applicable` |
| `ticket.role` | Matt 原生 tracker 五态 | `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix` |

### 6.2 状态语义

- `missing`：命中条件但资产不存在。
- `draft`：资产存在但内容或证据尚未达到审查入口。
- `ready-for-human`：资产内容已达到审查入口，等待人工判断、确认或特权操作。
- `approved`：必要审查已经明确放行，且引用的上游资产仍然新鲜。
- `stale`：资产曾经存在或获批，但上游变化可能使结论失效。
- `not-applicable`：影响面未命中该资产或门禁，并记录可审计原因。

`ready-for-agent` 只适用于解除阻塞且可以直接实现的垂直切片 Ticket。必须同时满足：

```text
所有必要 gate ∈ {approved, not-applicable}
AND 不存在相关 artifact.status = stale
AND 所有 blocking edge 已关闭
AND 实现仓库、分支、验证命令和回滚点明确
AND YSS routing、Implementation Contract、Build Architecture Checklist 已完成
```

Spec、设计、原型、OpenAPI Draft、wayfinder map、decision ticket 和功能父 Ticket 不因内容完整而自动获得 `ready-for-agent`。

## 7. 机器可读生命周期状态块

状态块放在功能父 Ticket；平台不可用时写入本地 stage checkpoint。它必须带 schema 版本，并允许从真实资产重建。

```yaml
lifecycle:
  schema_version: 1
  mode: orchestrate
  stage: product-design-and-requirement-freeze
  status: paused-human-gate
  updated_at: 2026-07-21T10:00:00+08:00

workflow:
  matt_flow: main
  active_skill: prototype-review
  status: paused
  last_completed_skill: product-design-prototype
  next_skill: prototype-review
  wayfinder_map: null

artifacts:
  spec:
    status: approved
    ref: docs/requirements/order-spec.md
  product_overview:
    status: approved
    ref: docs/design/order-product-overview-design.md
  prototype:
    status: ready-for-human
    ref: docs/design/prototypes/order/index.html
  openapi:
    status: stale
    ref: docs/api/specs/order.yaml
    stale_by:
      - prototype-confirmation

gates:
  requirement_freeze:
    status: ready-for-human
  openapi_freeze:
    status: stale
  ticket_formalization:
    status: blocked

tracker:
  platform: gitlab
  parent_ticket: <url>
  role: ready-for-human
```

恢复算法：

1. 读取 `yss-project.yaml`，确认仓库身份和 schema。
2. 定位功能父 Ticket 或本地降级 checkpoint。
3. 读取状态块引用的真实资产及其审查记录。
4. 比较资产内容、上游引用、Git 时间线和 Ticket 最新事件。
5. 状态块与真实资产冲突时，以权威资产为准，记录修复原因。
6. 重新计算影响面、`stale` 传播、门禁和 frontier。
7. 从第一个可执行且未阻塞的工作单元恢复。

## 8. 资产依赖图与 `stale` 传播

依赖图是模板级规则，不在每个功能中重复业务内容。功能状态块只记录实际存在的节点、引用和失效原因。

基础依赖关系：

```text
Discovery ─┬→ Spec ─→ Product Overview / Functional Architecture
           │              ├→ Product Design / Prototype / Requirement Freeze
           │              ├→ API Impact / OpenAPI Draft
           │              └→ System / Data Architecture
           └→ Business Architecture

Requirement Freeze + Architecture Review + OpenAPI Draft Review
→ OpenAPI Freeze / No-API-Impact
→ Vertical Slice Tickets
→ Implementation Contract + Build Architecture Checklist
→ Implementation + Review
→ Fresh Verification + Release
```

传播规则：

1. 先识别变化类型：文案、UI 状态、权限、API schema、状态机、数据模型、服务边界、NFR、部署或安全。
2. 只遍历与该变化类型相关的依赖边。
3. 下游资产先标记 `stale`，不得直接删除或重建。
4. 相关垂直切片撤销 `ready-for-agent`，直到必要门禁重新成为 `approved/not-applicable`。
5. 重新审查后可恢复原 Ticket；只有范围或验收目标根本改变时才重建 Ticket。
6. `not-applicable` 的原因若被新影响面推翻，状态必须变为 `missing` 或 `draft`。

示例：权限规则变化通常影响 Spec/Spec Delta、页面权限状态、OpenAPI security/error、Design Review、Ticket 验收和测试映射；它不自动使竞品情报或完整业务架构失效。

## 9. 有界自动推进算法

```text
识别模式与仓库身份
→ 加载父 Ticket、资产、tracker 和 git 状态
→ 计算影响面与最近可信阶段
→ 评估资产、门禁和 stale
→ 选择第一个未阻塞工作单元
→ 调用 Matt/YSS 专项 skill
→ 验收输出并更新状态/证据
→ 若仍在自动推进边界内则继续
→ 否则暂停并提出一个具体人工决策
```

必须暂停的情形：

- Spec baseline 或需求冻结需要业务负责人确认。
- 低保真评审、高保真原型确认或关键交互取舍需要用户判断。
- OpenAPI Freeze、Architecture Review、安全红线或不可逆数据变更需要放行。
- 需要新授权、外部凭据、目标实现仓库或发布窗口。
- 专项 skill 返回失败、证据冲突或无法形成可靠判定。
- 到达实现授权边界、合并、发布或“完成”结论。

暂停输出必须包含：暂停原因、受影响门禁、证据、推荐答案、用户只需回答的一个问题，以及确认后的恢复动作。

## 10. Setup readiness

编排器每次不应完整运行 `setup-matt-pocock-skills`，而应先执行幂等检查：

| 检查结果 | 行为 |
|---|---|
| tracker、标签、领域布局均已配置且兼容 | 记录 `setup=ready`，继续 |
| 必要配置缺失 | 路由 `setup-matt-pocock-skills` |
| 配置存在但与模板契约冲突 | 标记 `setup=conflict`，暂停并提出迁移方案 |
| tracker 暂时不可用 | 使用本地草案/checkpoint，不自动改投其他平台 |
| `template-source` | 验证模板配置和生成契约，不为具体产品初始化 tracker |

## 11. 当前技能的主要缺口

| 缺口 | 当前表现 | 需要增强 |
|---|---|---|
| 编排与路由混合 | 输出契约通常只给一个下一步 | 增加四模式和有界推进循环 |
| 状态不可恢复 | 没有版本化机器状态 | 增加父 Ticket/checkpoint 状态块 |
| 就绪度偏文件存在 | checklist 缺少统一内容级状态算法 | 增加资产 evaluator 和证据规则 |
| 无失效传播 | 只描述“回到对应阶段” | 增加依赖图、变化类型和 `stale` 传播 |
| Matt 对应关系松散 | skill 名散落在表格中 | 增加 workflow adapter 与输入/输出契约 |
| `wayfinder` 回流不完整 | 只说明在大型模糊工作前使用 | 定义 map 状态、frontier、完成条件和 `to-spec` 回流 |
| setup 前置缺失 | 默认 tracker/标签/领域布局存在 | 增加 setup readiness |
| 状态命名冲突 | `ready-for-human` 同时像资产和 Ticket 状态 | 按 namespace 分层，保持 Matt 五态原义 |
| 实现边界过早停止 | “Stop before writing business code” 容易结束编排 | 改为持续主控、禁止绕过专项 skill 实现 |
| 条件门禁表达不一致 | 部分 Guardrail 容易被读成所有任务完整走链路 | 所有规则绑定可观察影响条件和 `not-applicable` |
| 平台覆盖不足 | skill 当前登记为 Codex 平台专属 | 评估提升为 `.agents/skills` 共享权威技能并生成投影 |

## 12. RED 基线压力场景

以下场景用于后续改造前记录当前行为缺口。当前阶段只定义和核验失败面，不把设计方案当作已实现能力。

本轮 RED 是由独立只读分析者基于当前 skill 原文完成的静态基线推演，证明现有规则不能唯一导出所需编排行为；它不是实际运行产品生命周期所得的动态 Agent 失败证据。后续修改 skill 前仍需把这些场景转成可重复执行的无增强指导对照测试。

| 场景 | 压力组合 | 当前技能的预期缺陷 | GREEN 目标 |
|---|---|---|---|
| 用户只问“下一步是什么”，仓库已有大量资产 | 信息量 + 交付压力 | 可能执行过重检查，且无 `route` 明确只读边界 | 自动选择 `route`，只输出证据化路由 |
| 用户说“继续推进”，上次会话已结束 | 上下文丢失 + 时间压力 | 没有机器状态和恢复算法，依赖 Agent 临时推断 | 从父 Ticket/资产恢复并修正漂移 |
| OpenAPI Freeze 后权限规则变化 | 沉没成本 + 进度压力 | 只会笼统回到阶段 5，不能精准标记失效资产 | 按依赖传播 `stale` 并撤销相关切片 readiness |
| Wayfinder map 已清空 frontier | 多会话 + tracker 状态 | 没有明确 map 完成判定和 `to-spec` 状态转换 | map resolved → handoff → `to-spec` |
| Spec 文件存在但缺验收 seam 和人工确认 | 文件存在 + 赶工 | checklist 可能把存在误判为 ready | 判定 `draft/ready-for-human`，阻断正式切片 |
| 功能父 Ticket 与切片都使用 `ready-for-human` | 标签复用 + 状态复杂 | 资产状态和 tracker role 可能混淆 | namespace 分层，保持五态原义 |
| 项目尚未配置 tracker，用户要求直接 `to-tickets` | 进度 + 外部平台不可用 | 未先执行 setup readiness，可能选择错误平台 | 幂等 setup 检查；不可用时本地待发布草案 |
| 已进入实现，生命周期 skill 遇到业务代码 | 责任边界 + 交付压力 | 按现文可能停止主控，或反向直接实施 | 继续主控，调用 `implement`/`tdd`/YSS skills |
| 小型无 UI Bug | 合规 + 时间压力 | 绝对化 Guardrail 可能要求完整 Spec/原型链 | 只命中必要门禁，其余明确 `not-applicable` |
| 用户要求直接发布但验证是昨日结果 | 权威 + 时间压力 | 虽要求 fresh verification，但无统一 audit 模式 | `audit` 阻断发布并要求新鲜证据 |
| `grill-with-docs` 已确认 MVP，但仍有状态机问题需 runnable prototype | 访谈疲劳 + 赶工 | 缺少统一退出证据和 detour blocker，可能过早 `to-spec` 或无限访谈 | 记录未决项，经 `handoff → prototype → handoff` 回流后再判断 Spec readiness |

## 13. GREEN 输出契约

### 13.1 `route`

输出当前阶段、判定证据、影响面、最近可信资产、缺失/失效资产、阻塞门禁、推荐 Matt/YSS skills 和一个下一动作；不得创建产品资产。

### 13.2 `orchestrate` / `resume`

除路由信息外，持续记录：

- 本轮实际执行的工作单元和调用的专项 skills。
- 创建或更新的资产及其状态变化。
- 自动跳过项及 `not-applicable` 原因。
- 暂停门禁、证据、责任人和恢复条件。
- Ticket 同步和 Git checkpoint 判断。

### 13.3 `audit`

输出核验目标、逐门禁结论、证据路径、新鲜度、残余风险和最终 verdict。`audit` 不因发现缺口而自动修改资产。

## 14. 后续改造建议

建议按以下顺序进入 GREEN 实施：

1. 将本设计转成可执行的压力场景断言，确保当前 skill 先失败。
2. 明确 `yss-product-lifecycle` 是否提升为共享权威 skill；若提升，只修改 `.agents/skills` 后生成投影。
3. 精简主 `SKILL.md` 为编排原则、四模式、执行循环和输出契约。
4. 将状态 schema、Matt/YSS adapter、资产依赖图、门禁判定表拆入 references。
5. 更新 stage checkpoint 和功能父 Ticket 模板以容纳机器状态块。
6. 增强 `scripts/verify-lifecycle-scenarios`，覆盖状态分层、stale 传播、wayfinder 回流和有界自动推进。
7. 对违反模板硬规则的 Matt skills 做最小兼容修改，不复制 YSS 生命周期规则。
8. 运行相同压力场景进行 GREEN/REFACTOR，并执行 `scripts/verify-template`。
9. 由非实现者进行独立审查；外部 `create-yss-spec` 未集成验证前不得声称模板可发布。

## 15. 本轮状态

- 设计状态：用户已确认，`approved`。
- 技能修改：已实施到共享权威目录并生成投影。
- 自动化脚本修改：已增加编排契约与场景断言。
- GREEN/REFACTOR 验证：已执行，证据见验证文档。
- 独立审查：已完成，阻断项和后续 P2 均已修订并复核；外部 `create-yss-spec` 集成门禁仍需完成。
