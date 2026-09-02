# Agent Skill 治理升级决策分析

## 结论摘要

1. 逐技能结构 / 路由 / 行为 eval 不作为 YSS 模板首个升级方向。结构和路由已有确定性校验；行为 eval 成本高、易重复生命周期门禁，应降为后续按变更和风险触发的试验性能力。
2. invocation metadata 进入 `yss-skill-registry.yaml`；Router 合同只定义字段 schema、解析和阻断规则，不复制每个 skill 的示例。trigger examples 进入注册表，但保持少量、结构化、只为消歧服务。
3. freshness audit 作为生命周期完成条件的 core 能力，不新建一个常驻通用 skill；Doubt-Driven 作为高风险条件触发的 core 路由策略；Wayfinder 保持 maintainer-only / 兼容入口的可选模式，不进入默认 core 路由。

## Q1：eval 是否为首个升级方向

### 现状事实

- 技能身份、层级、成熟度、别名、默认可发现性和来源投影已经由 [`yss-skill-registry.yaml`](../../agents/yss-skill-registry.yaml)、[`skill-registry.mjs`](../../../scripts/lib/skill-registry.mjs)、`sync-skills` 和 `skills-lock.json` 共同校验。
- 生命周期路由和 Router 已经对未登记技能、依赖闭包、原型独立评审、代码审查唯一入口等关键路由做确定性检查。
- 生命周期完成已经要求 fresh verification、证据可读、阻断信号清空和 stale / drift 重路由。

### 决策

不把“每个 skill 三层 eval”作为 P0。采用以下顺序：

| 层次 | 初始策略 | 原因 |
|---|---|---|
| 结构 | 继续使用现有静态 / schema 校验 | 成本最低，收益已覆盖大部分缺陷 |
| 路由 | 只对注册表、Router、生命周期变更做确定性增量校验 | 与现有门禁直接对齐，避免重复运行 |
| 行为 | P2 试验；只覆盖变更中的 core / 高风险 skill | 避免全量运行导致 token 和维护成本失控 |

行为 eval 的进入条件应是：skill 内容或路由发生变化、命中高风险影响、或出现真实 finding；退出条件是连续真实任务证明它能发现现有静态校验抓不到的问题，且没有形成第二套生命周期门禁。

## Q2：invocation metadata 与 trigger examples 的归属

### 决策

- **注册表**是技能级调用元数据的唯一事实源：调用模式、触发条件、排除条件、主要输出、依赖和少量 trigger examples 均放在这里。
- **Router 合同**定义 schema、解析顺序、依赖闭包和阻断规则；不复制每个技能的完整示例，避免注册表与 Router 漂移。
- **生命周期编排合同**继续保留工作单元级 `workflow_reference.invocation_mode`（例如 `model-invoked` / `reference`）。它描述一次工作单元如何被执行，不与注册表的 `user` / `model` / `both` 技能级模式混用。

### trigger examples 约束

- 仅为消歧提供 1–3 个正向示例，必要时提供反向排除示例。
- 示例优先使用 `impact:<name>`、显式用户入口或工作单元 ID 等稳定标识；长篇自然语言放入 skill reference，不放在注册表核心字段。
- specialist 技能可继承 `impacts` 触发条件；只有存在歧义时才增加显式 examples。
- examples 只影响发现和路由提示，不直接批准门禁、Ticket 状态或 `ready-for-agent`。

当前已落地的低成本基础见 [`yss-skill-registry.yaml`](../../agents/yss-skill-registry.yaml) 的 `invocation_contract`，以及 [`router-contract.yaml`](../../.agents/skills/yss-router/references/router-contract.yaml) 的合同字段。

## Q3：三项能力的路由层级

| 能力 | 推荐层级 | 具体落点 | 不应做什么 |
|---|---|---|---|
| freshness audit | core 能力 | 生命周期完成条件、候选快照、fresh verification、stale / drift 检查 | 不再新增一个对所有任务常驻的通用审计 skill |
| Doubt-Driven | core 条件路由 | Router / 工程基线 / 架构与契约审查中的高风险分支 | 不升级为所有低风险任务的默认步骤，不新建生命周期阶段 |
| Wayfinder | maintainer-only / 兼容入口的可选模式 | 超长、多 Agent、多会话或 frontier 不清晰时，完成后回 `handoff → to-spec` | 不改变阶段、门禁、Ticket 角色或 `ready-for-agent` |

### Doubt-Driven 的高风险触发器

API schema、数据库 schema / 迁移、跨仓库契约、发布 / 回滚、实际改变的认证授权 / 租户 / 敏感数据行为，以及生命周期或生成语义。反证记录进入既有决策、架构、契约或发布审查记录；缺反证、证据不足或残余风险未处理时阻断。

### freshness audit 的边界

freshness 是“完成结论可信度”的 core 约束，而不是新的工作单元。模板维护继续使用 L1/L2/L3 checkpoint；产品切片继续使用 Slice Contract 和候选快照。这样可以复用同一条 finding 闭环，不增加每次调用的上下文负担。

## 证据来源

- [YSS skill registry](../../agents/yss-skill-registry.yaml)
- [Skill registry validator](../../../scripts/lib/skill-registry.mjs)
- [YSS Router contract](../../.agents/skills/yss-router/references/router-contract.yaml)
- [Slice Implementation Contract](../../.agents/skills/yss-router/references/slice-implementation-contract.md)
- [Lifecycle orchestration contract](../../.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml)
- [Harness process tailoring](../../process/harness-process-tailoring.md)
- [Addy Osmani agent-skills](https://github.com/addyosmani/agent-skills)
- [Matt Pocock skills](https://github.com/mattpocock/skills)
