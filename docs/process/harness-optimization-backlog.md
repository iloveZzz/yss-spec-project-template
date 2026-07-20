# Harness 工程优化调整待办

本文档记录基于《产品全生命周期 AI 研发工程化体系》PPT 与当前项目流程对比后，需要优化调整的待办事项。目标不是削弱现有治理能力，而是在保留 Ticket、YSS、门禁、追踪和验证优势的前提下，补齐轻量表达、流程裁剪、试点推进和自动化落地能力。

## 优化目标

- 让 Harness 工程有一版容易对外说明的轻量蓝图。
- 让不同规模任务可以按风险裁剪流程，而不是默认套完整链路。
- 让高频门禁、同步和检查动作逐步自动化，降低流程执行成本。
- 让 Skill、模板和脚本沉淀有明确触发标准。
- 让试点模块可以端到端验证完整闭环。

## P0：必须先做

| 编号 | 状态 | 待办 | 问题空间 | 交付物 | 验收标准 |
|---|---|---|---|---|---|
| HOB-001 | 已落地 | 建立“13 个工作单元 → 9 阶段 / 21 门禁”映射表 | 当前项目执行规则完整但对外表达重；PPT 蓝图易懂但缺少执行约束。 | `docs/process/harness-work-unit-map.md` | 每个 PPT 工作单元都能映射到项目阶段、门禁、产物、Skill、是否可裁剪和是否可自动化。 |
| HOB-002 | 已落地 | 定义三档流程裁剪策略 | 小改动、中等变更和新模块现在都容易被理解成同一套重流程。 | `docs/process/harness-process-tailoring.md`；`docs/process/lifecycle-artifact-map.md` 引用 | 明确“小改动 / 中等变更 / 新模块或高风险变更”的入口判断、最小产物、验证要求和升级条件。 |
| HOB-003 | 已落地 | 制定 Harness 试点模块选择标准 | 没有试点边界时，流程优化容易停留在抽象讨论。 | `docs/process/harness-pilot-selection.md` | 标准包含低风险、边界清晰、真实业务价值、可验证 API / UI / 数据影响、适合垂直切片等条件。 |
| HOB-004 | 已落地 | 明确阶段结束 Git checkpoint 与 Ticket 同步最小模板 | 当前要求存在，但执行时容易靠 Agent 临场组织语言。 | `docs/process/templates/stage-checkpoint-template.md` | 每个阶段都能按固定字段记录产物、验证、阻塞、人工审查、排除的脏文件和下一步。 |

## P1：试点前补齐

| 编号 | 状态 | 待办 | 问题空间 | 交付物 | 验收标准 |
|---|---|---|---|---|---|
| HOB-005 | 已落地 | 梳理可自动化门禁清单 | 现在门禁多，但哪些能机器检查、哪些必须人工判断还不够清楚。 | `docs/process/harness-automation-candidates.md` | 门禁按“可自动检查 / 可半自动生成 checklist / 必须人工审查”分类，并标注触发阶段。 |
| HOB-006 | 已落地 | 设计 Build Architecture Checklist 生成与回勾模板 | 架构约束进入实现阶段的成本偏高，容易变成手写负担。 | `docs/templates/build-architecture-checklist-template.md` | 模板包含 source、constraint、slice、status、evidence、follow-up，并给出示例。 |
| HOB-007 | 已落地 | 建立 Skill 沉淀规则 | 当前 skill 很多，但缺少“何时新增 / 合并 / 脚本化”的判断标准。 | `docs/process/skill-governance.md` | 明确重复 3 次以上动作的处理路径：模板、脚本、Skill、Ticket 节点或无需沉淀。 |
| HOB-008 | 已落地 | 形成对外汇报版 Harness 蓝图 | 当前 `AGENTS.md` 适合 Agent 执行，不适合业务方和管理者快速理解。 | `docs/process/harness-executive-blueprint.md` | 能用 5 分钟讲清楚：为什么做、怎么分阶段、哪些门禁不能跳、试点怎么跑。 |
| HOB-009 | 已落地 | 定义“最近可信阶段”判定表 | 项目已有原则，但缺少可查表，执行时容易争议。 | `docs/process/harness-process-tailoring.md` | 输入不同变更类型后，能定位从 Spec、设计、OpenAPI、架构、Ticket 或实现哪个阶段开始补齐。 |

## P2：试点后演进

| 编号 | 状态 | 待办 | 问题空间 | 交付物 | 验收标准 |
|---|---|---|---|---|---|
| HOB-010 | 已落地 | 建立试点复盘指标 | 没有指标时，很难判断 Harness 是否真正降风险、提效率。 | `docs/process/harness-pilot-retro-metrics.md` | 至少跟踪 Spec Ready 一次通过率、阶段产物一次通过率、规范偏离次数、ready-for-agent 到可验证 PR 周期、回归缺陷数、模板 / Skill 更新次数。 |
| HOB-011 | 已并入 | 沉淀门禁自动化脚本 backlog | 自动化不能一次做完，需要按收益排序。 | `docs/process/harness-automation-candidates.md` | 每项脚本记录触发阶段、输入、输出、失败处理和人工接管点。 |
| HOB-012 | 试点后执行 | 试点后更新 AGENTS / CONTEXT / ADR | 试点结论如果不回流，流程会停留在一次性经验。 | `docs/process/harness-pilot-retro-metrics.md` 中的治理回流检查 | 只把稳定语言写入 CONTEXT；只有难回滚、非显而易见且有真实取舍的决策写 ADR。 |
| HOB-013 | 已落地 | 评估是否需要 Harness 状态模型 | 当前阶段状态主要散落在文档、Ticket 和 tracker 评论中，后续自动化可能需要统一状态模型。 | `docs/process/harness-state-model-evaluation.md` | 明确状态来源、状态流转、谁有权推进、失败回退和人工审查状态。 |

## 推荐执行顺序

1. 先完成 HOB-001、HOB-002、HOB-003，形成“讲得清、裁得动、试得起来”的基础。
2. 再完成 HOB-004、HOB-005、HOB-006，把试点前的门禁成本压下来。
3. 选择一个真实低风险模块跑试点，试点中只补必要文档，不追求全自动。
4. 试点结束后执行 HOB-010、HOB-011、HOB-012，把经验回流到模板、Skill 和流程规则。

## 暂不做

- 不把当前 9 阶段 / 21 门禁替换成 PPT 的 13 个工作单元；13 个工作单元只作为轻量表达层。
- 不一开始建设全自动流水线；先跑通半自动闭环。
- 不为每个普通流程选择都写 ADR；只有满足难回滚、非显而易见、有真实取舍时才写。
- 不把所有检查都做成 Skill；低频、一次性或高度依赖人工判断的动作保留为模板或 checklist。
