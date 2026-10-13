---
name: yss-strategic-design
description: 编排 YSS 产品或模块从机会调研到业务边界与协作、Spec、页面原型、业务级 Ticket 和业务方案交接；不进入下游技术设计、实现、审查或发布。
---

已显式托管的首批阅读包：权威源编辑结束后运行 `scripts/contract render --checkpoint <ref>`；审阅准备或交接前运行 `check-views`。阅读生成失败只恢复派生页，不重做成功源事务。详见 `.template-spec/process/contract-reading.md`。


# YSS 业务方案设计

这是生命周期主控 skill：负责识别阶段、判定影响面、检查产物与门禁、选择下一工作单元并验收结果。业务实现必须交给对应的 Matt/YSS 专项 skill；本 skill 不替代它们。

文档输出时按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `.template-spec/process/document-writing.md`；作用域仅限当前产物，派发时传递条件及引用。

## 条件读取

先确认当前问题是业务边界、产品设计、方案决定还是交接恢复，只读取该工作单元的合同和必要前置。已有已确认输入先核验复用；不要为普通问答、只读 Context 或已授权的小修复重跑战略访谈。正式资产、用户决定、版本失效和交接证据仍完整遵守下文合同。

## 入口与边界

Plan 入口读取 `.template-spec/plan/README.md` 和 `.template-spec/process/plan-migration.md`，按注册表退出条件核查战略输入。遇到必须解决的需求、业务规则、范围或取舍决策未决项，按 `planning.clarification_policy` 主动调用 `grilling`，无需用户再次点名；事实、实验与专业审查问题先分流，无依赖工作继续。关键未决项和未回流 runnable blocker 阻断进入 Spec；非关键项按既有延期合同交接。只使用 Plan 标识，Plan 后仍保留 Spec、原型、业务 Ticket 与交接阶段。

1. 先读取 `yss-project.yaml`、`CONTEXT.md`、相关 ADR、map.md、checkpoint 和当前资产。
2. `repository_mode=template-source` 只走模板维护流程；命中产品流程时返回 `blocked: template-source-product-artifact-forbidden`，不得生成产品 Spec、原型、OpenAPI 或切片 Ticket。
3. `repository_mode=project-instance` 以 `.template-spec/process/lifecycle-registry.yaml`、`harness-process-tailoring.md` 和本目录 references 为唯一阶段、门禁和裁剪事实源。数字人角色、阶段协作组、运行时绑定与会签级别以 `.template-spec/agents/digital-human-roles.yaml` 为准；职称实例不另起编排器。
4. 模式：`route` 只读规划；`orchestrate` 有界推进；`resume` 重建后推进；`audit` 严格只读。未明确时使用 `route`。

## 业务方案设计 Harness profile

本入口是产品与业务设计专职协作方。Spec 主控可显式绑定本功能 checkpoint 与当前接收 Receipt 汇总；不创建第二套推进状态，也不改写主控的 `progression-target.json`。`product-design-completed` 只表示产品设计里程碑；本 Profile 仍须完成批准的战略交接、finalize 和整包实际验证才到职责终点。无 UI 设计影响按当前证据显示不适用。职责完成不代表主控业务验收或 Git 发布授权。

本分支默认面向内部兼容 ID `harness.business-ddd-strategy-handoff`：目标用户只有 `role.product-manager`（产品）、`role.requirements-manager`（需求）和 `role.business`（商务）；`role.lifecycle-orchestrator` 仅作为流程控制平面。项目管理、工程、测试和发布角色不在本分支注册或派发，由业务方案交接后的下游研发 profile 接管。

该 profile 的本地生命周期在业务级 Ticket 和业务方案交接处结束：

`入口分诊 → 机会与目标 → 业务故事 → 业务边界与协作 → 规则、例子与疑问 → 方案决策包 → Spec → 页面验证 → 业务级 Ticket → 业务方案交接`

业务方案交接包必须同时引用已批准且版本当前的 `artifact.domain-strategy`、`artifact.stage-decision-package`、Spec、已批准 UI 依据和业务级 Ticket 集，并以 Handoff v5 交给下游研发团队。新设计保留原型与视觉包要求；确无 UI 改动的既有页面使用 `existing-ui-baseline` v1，按 `.template-spec/process/existing-ui-baseline.md` 核验固定源码、真实动作/API/截图和当前产品确认，不能把截图自行升格为已批准原型。它必须携带当前根 `CONTEXT.md` 的 `source_context_snapshot`、结构化 `context_delta`，并声明目标仓在进入技术设计前完成本地 `context_reconciliation`。v3/v4 与既有裸 v5 包只读兼容 `verify/import`；修改或重新交付必须迁移到 v5 并重新批准，不得从自由文本猜测术语映射。下游团队的下一工作单元由内部技能 `yss-technical-design` 接管；本 profile 不生成 OpenAPI、技术设计合同、Slice Implementation Contract、代码或发布资产。需要继续推进时，必须新建或切换到下游研发团队的 project profile，不能在本 profile 中越过 `work-unit.strategic-design-handoff`。

Matt 的 `ask-matt`、`to-spec`、`to-tickets`、`triage` 和 `wayfinder` 保留为显式兼容入口；`implement` 已从本分支移除。默认路径是本 skill 持有的原生工作单元，由本编排器创建正式资产、维护状态并在会签门禁暂停。兼容入口不得自动调用它们或代替其创建正式资产；Matt 只导航，不得写生命周期资产或改变门禁/Ticket 状态；任何写入前回交本编排器。

## 阶段导航与门禁

机会与目标 → 业务故事 → 业务边界与协作 → 规则、例子与疑问 → 方案决策包 → Spec/功能架构 → 产品设计与页面验证 → 业务级 Ticket 正式化 → 业务方案交接。

按 `.template-spec/process/harness-process-tailoring.md` 从当前可信阶段处理本轮缺失工作，核验复用当前批准资产和工作项；只读咨询不创建票、checkpoint 或审批，未来产物不作为当前缺项。命中的门禁和本 profile 交接终点仍须满足。模板日常维护由 `maintaining-skills` 自检，独立审查按需；Fresh Verification、检查范围、证据复用和边界重验按裁剪合同执行，注册表优先消费 `public_*` 展示说明。

## 面向业务角色的默认问法

默认通过 Agent 引导完成，不要求产品、需求或商务直接填写内部合同字段。Agent 必须先用业务人员熟悉的语言问清：

1. 谁遇到了什么问题，想得到什么结果；
2. 事情通常怎样一步步发生；
3. 每一步由谁负责，结果交给谁；
4. 有哪些规则、例外和仍待确认的问题；
5. 哪一小段可以独立交付并让用户得到结果；
6. 用哪些例子和证据证明结果正确。

需要区分业务板块的重要性时，不要求用户选择内部分类。Agent 改问“是否直接决定关键结果、是否存在独特规则、是否可复用或外购”，再提出“重点业务、必要支撑、通用能力”建议，由业务负责人确认。

## 业务方案总览

每轮路由先输出一页派生的“业务方案总览”，依次引用机会与目标、业务故事、业务责任区、规则与例子、Spec、页面验证、业务 Ticket 和交接状态。总览只显示当前状态、权威资产引用、未决问题、责任人和下一步，不复制各资产正文、不成为新的事实源，也不新增生命周期门禁。内部稳定 ID 和字段映射只在 Agent 运行结果或维护者诊断中显示；普通业务说明不附带术语对照表。

裁剪只允许将未命中的条件门禁标记为 `not-applicable` 并写原因；不得删除主阶段、已命中的门禁或必需产物。阶段是否完成取决于“内容 + 审查结论 + 上游新鲜度 + 可读证据”，文件存在不算通过。每个 `project-instance` 工作单元在请求批准或进入下一工作单元前，必须把已确认稳定术语回写到项目根目录唯一 `CONTEXT.md`，并生成通过 `scripts/verify-context-reconciliation` 的横切证据；候选术语、错误路径、伪锚点、作用域冲突或双摘要漂移均返回 `blocked`，不新增门禁。

上面的完整主链是下游研发模板的兼容链。本分支启用业务上游 profile 时，使用 profile 的有界主链，并把业务级 Ticket 与业务方案交接作为终点；该裁剪不是跳过已命中的门禁，而是明确本地 Harness 的职责边界。

## 阶段路由与技能

| 阶段 | 必需产物/门禁 | 工作单元与技能 | 通过条件 |
|---|---|---|---|
| 入口分诊 | 身份、影响面、最近可信阶段 | `yss-strategic-design` + `triage` / `wayfinder`（兼容入口） | `yss-project.yaml` 合法且影响面可解释 |
| 机会、目标与业务故事 | 用户/MVP/非目标/成功标准、业务故事、规则示例、测试 seam；需要时补充业务边界与规则设计和方案决策包 | `work-unit.plan-opportunity` + `work-unit.plan-requirements` + `work-unit.domain-strategy-design` + `work-unit.stage-decision`；市场/竞品事实用 `competitive-intelligence`，技术/标准事实用 `yss-research:technical-evidence`，业务边界与方案决策证据用 `yss-research:strategy-evidence`；业务词汇和责任区梳理用 `domain-modeling`；原生需求澄清按 `planning.clarification_policy` 主动调用 `grilling` | 产品经理用一个 `review-bundle.plan` 任务逐项关闭命中的 `check.domain-strategy-approved` 与 `check.stage-decision-package-approved`，再以同一 `review_session_id` 汇总到 `gate.plan-approved`；最终共同理解与完整 Plan 审阅包合并一次真实用户确认，中间各轮仍保留真实决策回复 |
| Spec/功能架构 | Spec、产品总体设计、功能架构；必要时 Spec Delta | 原生 `work-unit.spec-synthesis`；`to-spec` 为兼容入口 | 初稿先为 `ready-for-human`；只有 Spec baseline 会签批准后资产才为 `approved` 并进入下游 |
| 产品设计与页面验证 | 交互说明、低保真评审、状态矩阵、H1/H2 原型、视觉基线与用户确认 | `yss-prototype-stage` 持有合同，配合 `yss-design-system` 和独立 `prototype-review`；默认 `html-css-js` 适配器，条件使用独立视觉稿 | `check.prototype-reviewed`、`check.prototype-verified` 通过后关闭 `gate.product-design-approved`；无 UI/体验取舍时带依据标记 `not-applicable`，不暂停询问 |
| 业务方案交接 | 业务方案交接包、研发待决问题和证据索引 | `yss-stage-decision` + `yss-strategic-design`；下游研发团队接管技术设计 | Plan、Spec 和适用产品设计批准均当前；需求经理独立复核产品经理起草的完整包并关闭 `gate.strategic-design-handoff-approved`，整包 Fresh Verification 通过；不再请求新的用户回复 |
| 技术分析（下游兼容阶段） | OpenAPI Draft/Freeze、数据架构、工程基线和架构审查 | 下游研发团队的技术技能 | 不属于本 profile 的本地工作单元 |
| Ticket 正式化 | 业务级功能 Ticket 集（范围、优先级、验收、依赖、风险） | 本 profile 使用 `work-unit.business-ticket-formalization`；`to-tickets` 为兼容入口 | 业务行为可验证且不含 Adapter/Application/Domain/Infrastructure 技术拆分；下游再细化垂直切片 |
| 下游接管 | 技术设计、工程契约和实现 | 交接给下游研发团队；本 skill 不调用实现技能 | 业务方案交接包已批准且下游上下文、责任人和版本边界完整 |

页面验证默认采用根 `DESIGN.md` 中的 Data Quality 浅色主题；AntD v6 是设计参考，组件运行时由下游实现合同确定。暗色或紧凑模式仅在明确选择时启用，并使用对应派生快照。交接复用 `prototype-evidence.yaml` 的 `design_baseline`（规范与 Token 引用、摘要）和 `visual_baseline`，视觉基线的 `cases[].theme` 与截图保持一致；按既有 Handoff v5 合同核验当前证据，不另建主题合同。脚手架与生产前端实现由下游研发 profile 接管。

Plan → Spec（含正式草稿、恢复与显式 `to-spec`）写入前，按 `.template-spec/plan/entry-review.md` 持久化 `bundled-plan-review-v1` 审阅包、适用检查的组合审查、独立 Plan 批准记录与当前用户回复，并运行 `node scripts/verify-plan-spec-entry <state.yaml>`。包内 `checks.grill_exit=passed` 只表示澄清材料与前置条件就绪；固定完整审阅包后合并确认共同理解和 Plan，外部 `plan_user_decision_ref` 绑定当前包，不回写包内依据。最终回复前不能宣布共同理解已确认或 Plan 已批准。缺项、分散审查、会话不一致、过期或无真实回复即阻断；旧审阅包保持兼容，独立调研可继续。

## 结果与暂停

凡主控向数字人角色或独立运行时正式派发生命周期工作单元，都必须通过结构化任务包派发，并返回 `Workflow Execution Result`（workflow reference、skill、changed files、`context_reconciliation`、evidence refs、actual verification、deferred seams、drift/new impacts）。任务包使用 `.template-spec/process/schemas/digital-human-task-package.schema.json`，由 `scripts/verify-digital-human-task-package` 校验；其中 `role_id`、`runtime_id`、`execution_state`、`contract.kind/id/version`、允许写路径、预期证据和汇合引用必须完整。Plan、Spec、原型、业务 Ticket、业务方案交接和模板维护分别绑定各自的生命周期资产或维护 checkpoint。Slice Implementation Contract、代码和发布均属于下游 profile，不得在本地任务包中创建。缺少可读证据、`context_reconciliation` 未通过、`stale`、`violation`、`drift`、`new_impacts` 或阻塞信号时不得标记 completed。实现授权不包含 Git commit/push；具体动作及仓库/改动范围明确的可读原始用户回复，可由 Agent 整理成各自授权三字段，不要求用户重填。原始回复和会签证据仍按本 profile 现有协议核验，详见 [Git 授权适配](references/matt-yss-adapter.md#战略资产审查与-git-授权)。

输出固定包含：模式、当前阶段、影响面、资产/门禁状态、`context_reconciliation`、证据、业务 Ticket 状态、阻塞项、本轮动作、下一工作单元、暂停/继续理由、Ticket 同步和 Git checkpoint 判断。启用本 profile 时，`work-unit.strategic-design-handoff` 完成后 `next_route` 必须为 `null`；不得生成垂直切片、`ready-for-agent`、OpenAPI、下游技术设计或实现资产。兼容入口的输入必须回交本编排器验收；`implement` 请求直接 `blocked` 并转交下游研发团队。暂停会签时必须输出门禁 ID、指定 `role_id`、`runtime_id` 和会签文件路径。任务包的 `core_skills` / `forbidden_skills` 必须从角色注册表复制。

详细执行循环、readiness、审查快照、状态传播和 Matt 边界见 [orchestration.md](references/orchestration.md)、[orchestration-contract.yaml](references/orchestration-contract.yaml)、[artifact-dependencies.md](references/artifact-dependencies.md) 和 [state-model.md](references/state-model.md)。

## 便携交接工具

批准交接后由生命周期自动执行 `scripts/strategic-handoff finalize --source-root <source> --handoff <v5-ref> [--previous <delivery-or-package>] [--zip]`，固定生成 `docs/deliveries/strategic/<handoff-id>/<version>/`。只有不可变 `package/` 成包成功、整包 verify 通过，且 `artifact.strategic-design-handoff.evidence_refs` 与 `verification.strategic_delivery` 已写入 checkpoint，才可完成 `work-unit.strategic-design-handoff`；接收方 Import Receipt 不是战略完成条件。规则身份、批准绑定、交付记录、包内索引和完整快照差异以 `.template-spec/process/strategic-handoff-package.md` 为准。接收方先 `verify` 再 `import`，目标根术语对账和 `verify-strategic-handoff-consumption` 通过后进入战术设计/相关切片；工具不能代替生命周期批准。

## 当前关键决定

真实用户决定只覆盖 `gate.plan-approved`、`gate.spec-baseline-approved` 与命中 UI/体验影响的 `gate.product-design-approved`。领域战略、阶段决策、原型评审和浏览器验证写入 `check.*`；`gate.strategic-design-handoff-approved` 由需求经理独立复核产品经理起草的交接包，并结合 Fresh Verification 关闭，不产生新的用户询问。旧 gate 与旧批准只允许历史读取；活动资产命中时返回 `STRATEGIC_GATE_MIGRATION_REQUIRED`，按 `.template-spec/process/strategic-gate-migration.md` 生成计划、应用迁移并重新确认聚合资产。

## 阶段工作追踪

首次进入允许的 Plan / Spec / Design 或恢复时，读取 `.template-spec/process/stage-tracking.md`，核验 tracker 启用版本与持久 checkpoint。写阶段资产前登记当前工作项；小工作内联，跨负责人 / 独立验收 / 阻塞 / 延期时拆至 work-items。旧项目只读 check 后形成可审阅 plan，显式 apply 才启用；不补造历史完成或批准。完成时逐条关联验收证据，阶段退出回写；结果携带 checkpoint_ref。追踪不得扩大本 profile 的允许阶段，Design 不创建工程父票或实现切片。

原生需求澄清消费 [Context 对账](references/plan-requirements.md)；外部输入缺口消费 [问卷与恢复合同](references/external-input-questionnaire.md)。仅在本 profile 已授权的阶段范围内使用，不扩展默认阶段。

## Spec 后业务拆分

按 `.template-spec/process/business-tickets.md` 执行 Spec 业务草案、Design 校准与业务正式化。业务票放在 `business-tickets/`，集合引用进入 Spec / map / checkpoint；业务票不授予实现资格。实现票仍在 `issues/`，受工程准备、当前 Slice 合同批准和完整就绪检查约束。 Spec 综合即生成业务草案；Design 只校准同一组稳定 ID。无 UI/产品设计影响时直接业务正式化，不创建空原型。使用共享 business-ticket-template.md 和 business-ticket-set-template.yaml；历史实现模板只读兼容。最终集合绑定当前战略交接 gate.strategic-design-handoff-approved，不借用更早 Plan 回复；声明 business-ticket-approval-v1 能力。

<!-- SKILL_PREFLIGHT_ROUTE -->
专项技能调用前，运行 `scripts/query-lifecycle-context --work-unit <当前工作单元> --check-skills`；多运行时指定 `--agent-runtime`，条件用 `--when`。按合同 `skill_preflight` 处理缺失、漂移与冲突，在既有授权内核对补装计划、应用后重验。预检不授予执行或批准。Matt 上游为 https://github.com/mattpocock/skills，生效版本以根 `skills-lock.json` 为准。

<!-- USER_PROGRESS_REPORT -->
每轮返回或暂停按合同 `user_progress_report` 给出中文状态：当前阶段与本轮结果、下一阶段/单元与进入条件、问题/阻塞、已登记责任方、解除动作及复验、主控下一动作与用户待决定项。未知写“待核验”，负责人缺失写“未登记”；目标不代表批准，已授权工作继续执行。发送前核对证据、状态及结构化结果一致；写法见 `.template-spec/process/document-writing.md`。

<!-- PLAN_REVIEW_CONTROL -->
Plan 专业审查按当前主控合同 `planning.review_control` 和 checkpoint `plan_review_control` 执行；准备、派发、消费和恢复均核验原周期及本轮检查范围。聚合复用内部结论，诊断不默认请求用户；关键决定与最终 Plan 批准展示当前资产后取得同一次真实回复。工具与受控历史接入见 `.template-spec/plan/entry-review.md`。

<!-- PROFILE_GUIDANCE -->
当前职责完成、状态查询或恢复时，消费合同 `profile_guidance` 与 `yss lifecycle status --root <当前工程> --checkpoint <当前checkpoint>` 给出下游 Profile 建议；不按邻近目录猜初始化状态。Spec 默认继续当前职责；没有当前战略交接时，可经用户明确选择交给独立 Design。Spec 或 Design 已形成经核验的当前战略交接后，按消费者路由建议 Backend、Frontend 或同时准备，两者仍在独立目录执行；设计完成声明不能替代交接及来源批准，显式交接失效时先解除阻断。目标 Design 接入已批准 Spec 走 `spec-baseline` 冻结包与 Receipt、目标 Context 对账后从设计继续，不重走 Plan，不复制源 checkpoint 批准到目标；目标 Backend / Frontend 使用战略接收记录及各自消费合同。建议不改变当前工作单元、不授予批准或执行，下游推荐不扩展本 Profile 的实现写范围。
