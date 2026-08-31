---
name: yss-strategic-design
description: 编排 YSS 产品或模块从机会调研到 Spec、页面原型、业务级 Ticket 和战略设计交接；不进入下游 Tactical DDD、实现、审查或发布。
---

# YSS Strategic Design

这是生命周期主控 skill：负责识别阶段、判定影响面、检查产物与门禁、选择下一工作单元并验收结果。业务实现必须交给对应的 Matt/YSS 专项 skill；本 skill 不替代它们。

## 入口与边界

1. 先读取 `yss-project.yaml`、`CONTEXT.md`、相关 ADR、父 Ticket/checkpoint 和当前资产。
2. `repository_mode=template-source` 只走模板维护流程；命中产品流程时返回 `blocked: template-source-product-artifact-forbidden`，不得生成产品 Spec、原型、OpenAPI 或切片 Ticket。
3. `repository_mode=project-instance` 以 `docs/process/lifecycle-registry.yaml`、`harness-process-tailoring.md` 和本目录 references 为唯一阶段、门禁和裁剪事实源。数字人角色、阶段协作组、运行时绑定与会签级别以 `docs/agents/digital-human-roles.yaml` 为准；职称实例不另起编排器。
4. 模式：`route` 只读规划；`orchestrate` 有界推进；`resume` 重建后推进；`audit` 严格只读。未明确时使用 `route`。

## 业务上游 Harness profile

本分支默认面向 `harness.business-ddd-strategy-handoff`：目标用户只有 `role.product-manager`（产品）、`role.requirements-manager`（需求）和 `role.business`（商务）；`role.lifecycle-orchestrator` 仅作为流程控制平面。项目管理、工程、测试和发布角色不在本分支注册或派发，由 Strategic Design Handoff 后的下游研发 profile 接管。

该 profile 的本地生命周期在业务级 Ticket 和 DDD 战略设计交付处结束：

`入口分诊 → 机会调研 → 需求分析 → DDD 战略设计 → 阶段决策包 → Spec → 页面原型 → 业务级 Ticket → Strategic Design Handoff`

交付包必须同时引用已批准且版本当前的 `artifact.domain-strategy`、`artifact.stage-decision-package`、Spec、页面原型和业务级 Ticket 集，并以 `docs/templates/strategic-design-handoff-template.yaml` / `docs/process/schemas/strategic-design-handoff.schema.json` 的结构交给下游研发团队。下游团队的下一工作单元是外部 `yss-tactical-design`；本 profile 不生成 OpenAPI、Tactical DDD、Slice Implementation Contract、代码或发布资产。需要继续推进时，必须新建或切换到下游研发团队的 project profile，不能在本 profile 中越过 `work-unit.strategic-design-handoff`。

Matt 的 `ask-matt`、`grill-me`、`grill-with-docs`、`to-spec`、`to-tickets`、`triage` 和 `wayfinder` 保留为显式兼容入口；`implement` 已从本分支移除。默认路径是本 skill 持有的原生工作单元，由本编排器创建正式资产、维护状态并在会签门禁暂停。兼容入口不得自动调用或代替正式资产创建；任何写入前回交本编排器。

## 不可裁剪的主链

机会调研/需求分析 → DDD 战略设计 → 阶段决策包 → Spec/功能架构 → 产品设计与原型 → 业务级 Ticket 正式化 → Strategic Design Handoff。

裁剪只允许将未命中的条件门禁标记为 `not-applicable` 并写原因；不得删除主阶段、已命中的门禁或必需产物。阶段是否完成取决于“内容 + 审查结论 + 上游新鲜度 + 可读证据”，文件存在不算通过。

上面的完整主链是下游研发模板的兼容链。本分支启用业务上游 profile 时，使用 profile 的有界主链，并把业务级 Ticket 与 Strategic Design Handoff 作为终点；该裁剪不是跳过已命中的门禁，而是明确本地 Harness 的职责边界。

## 阶段路由与技能

| 阶段 | 必需产物/门禁 | 工作单元与技能 | 通过条件 |
|---|---|---|---|
| 入口分诊 | 身份、影响面、最近可信阶段 | `yss-strategic-design` + `triage` / `wayfinder`（兼容入口） | `yss-project.yaml` 合法且影响面可解释 |
| 机会调研/需求分析 | Discovery、用户/MVP/非目标/成功标准、测试 seam；命中 DDD 影响时补充领域战略设计与阶段决策包 | `work-unit.discovery-opportunity` + `work-unit.discovery-requirements` + `work-unit.domain-strategy-design` + `work-unit.stage-decision`；市场/竞品事实用 `competitive-intelligence`，技术/标准事实用 `research`；领域建模用 `domain-modeling`；`grill-with-docs` 为兼容入口 | 未决事实已 research 或 handoff，领域边界和统一语言可审查，阶段决策包完成必要批准 |
| Spec/功能架构 | Spec、产品总体设计、功能架构；必要时 Spec Delta | 原生 `work-unit.spec-synthesis`；`to-spec` 为兼容入口 | 初稿先为 `ready-for-human`；只有 Spec baseline 会签批准后资产才为 `approved` 并进入下游 |
| 原型设计 | 交互说明、低保真、状态矩阵、高保真 HTML、评审记录 | `yss-design-system` → `yss-prototype-stage` → `yss-antd-design`（仅原型事实）→ Codex `product-design:index`（非 Codex 交付等价合同） | `gate.prototype-reviewed`、`gate.prototype-verified`、`gate.user-confirmation` 均有证据 |
| 战略设计交付 | Strategic Design Handoff、下游战术设计问题和证据索引 | `yss-stage-decision` + `yss-strategic-design`；下游研发团队接管 Tactical Design | `artifact.domain-strategy`、`artifact.stage-decision-package`、Spec、页面原型和业务级 Ticket 已批准且版本当前，交付包字段完整；本地不生成战术模型 |
| 技术分析（下游兼容阶段） | OpenAPI Draft/Freeze、数据架构、工程基线、架构审查；按领域影响执行 Tactical DDD Check | 下游研发团队的 `yss-openapi-governance` / `yss-tactical-design` / `yss-router` | 不属于本 profile 的本地工作单元 |
| Ticket 正式化 | 业务级功能 Ticket 集（范围、优先级、验收、依赖、风险） | 本 profile 使用 `work-unit.business-ticket-formalization`；`to-tickets` 为兼容入口 | 业务行为可验证且不含 Adapter/Application/Domain/Infrastructure 技术拆分；下游再细化垂直切片 |
| 下游接管 | Tactical Design、技术契约和实现 | 交接给下游研发团队；本 skill 不调用实现技能 | Strategic Design Handoff 已批准且下游上下文、责任人和版本边界完整 |

## 结果与暂停

凡主控向数字人角色或独立运行时正式派发生命周期工作单元，都必须通过结构化任务包派发，并返回 `Workflow Execution Result`（workflow reference、skill、changed files、evidence refs、actual verification、deferred seams、drift/new impacts）。任务包使用 `docs/process/schemas/digital-human-task-package.schema.json`，由 `scripts/verify-digital-human-task-package` 校验；其中 `role_id`、`runtime_id`、`execution_state`、`contract.kind/id/version`、允许写路径、预期证据和汇合引用必须完整。Discovery、Spec、原型、业务 Ticket、Strategic Design Handoff 和模板维护分别绑定各自的生命周期资产或维护 checkpoint。Slice Implementation Contract、代码和发布均属于下游 profile，不得在本地任务包中创建。缺少可读证据、`stale`、`violation`、`drift`、`new_impacts` 或阻塞信号时不得标记 completed。

输出固定包含：模式、当前阶段、影响面、资产/门禁状态、证据、业务 Ticket 状态、阻塞项、本轮动作、下一工作单元、暂停/继续理由、Ticket 同步和 Git checkpoint 判断。启用本 profile 时，`work-unit.strategic-design-handoff` 完成后 `next_route` 必须为 `null`；不得生成垂直切片、`ready-for-agent`、OpenAPI、Tactical Design 或实现资产。兼容入口的输入必须回交本编排器验收；`implement` 请求直接 `blocked` 并转交下游研发团队。暂停会签时必须输出门禁 ID、指定 `role_id`、`runtime_id` 和会签文件路径。任务包的 `core_skills` / `forbidden_skills` 必须从角色注册表复制。

详细执行循环、readiness、审查快照、状态传播和 Matt 边界见 [orchestration.md](references/orchestration.md)、[orchestration-contract.yaml](references/orchestration-contract.yaml)、[artifact-dependencies.md](references/artifact-dependencies.md) 和 [state-model.md](references/state-model.md)。
