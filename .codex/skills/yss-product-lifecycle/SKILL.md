---
name: yss-product-lifecycle
description: 编排 YSS 产品或模块从机会调研到 Spec、原型、技术契约、垂直切片实现、审查、发布和复盘；当阶段、产物、门禁或 YSS skill 不清晰时使用。
---

# YSS Product Lifecycle

这是生命周期主控 skill：负责识别阶段、判定影响面、检查产物与门禁、选择下一工作单元并验收结果。业务实现必须交给对应的 Matt/YSS 专项 skill；本 skill 不替代它们。

## 入口与边界

1. 先读取 `yss-project.yaml`、`CONTEXT.md`、相关 ADR、父 Ticket/checkpoint 和当前资产。
2. `repository_mode=template-source` 只走模板维护流程；命中产品流程时返回 `blocked: template-source-product-artifact-forbidden`，不得生成产品 Spec、原型、OpenAPI 或切片 Ticket。
3. `repository_mode=project-instance` 以 `docs/process/lifecycle-registry.yaml`、`harness-process-tailoring.md` 和本目录 references 为唯一阶段、门禁和裁剪事实源；技能分层、别名、默认可发现性和运行时入口以 `docs/agents/yss-skill-registry.yaml`（`status: active`）为准，来源、版本、hash 和投影以 `skills-lock.json` 为准。数字人角色、阶段协作组、运行时绑定与会签级别以 `docs/agents/digital-human-roles.yaml` 为准；职称实例不另起编排器。
4. 模式：`route` 只读规划；`orchestrate` 有界推进；`resume` 重建后推进；`audit` 严格只读。未明确时使用 `route`。

Matt 的 `grill-with-docs`、`to-spec`、`to-tickets`、`implement` 等保留为显式兼容入口；默认路径是本 skill 持有的原生工作单元，由本编排器创建正式资产、维护状态并在会签门禁暂停（级别见数字人角色注册表）。兼容入口不得自动调用它们或代替其创建正式资产；Matt 只导航，不得写生命周期资产或改变门禁/Ticket 状态；任何写入前回交本编排器。

技能调用先消费 `docs/agents/yss-skill-registry.yaml` 的 `invocation_contract`：它只约束调用模式、触发/排除条件、主要输出和依赖，不替代生命周期证据或门禁。进入实现后，Slice Contract 的 `common.context_plan` 只加载当前切片的最小充分上下文；缺失权威上下文必须 `blocked` 或回 实现合同编译器，不得猜测补齐。质量标准由 `engineering-baseline` 一次定义并由切片、Execution Result、审查和发布复用；命中高风险影响时在途记录 Doubt-Driven 主张、反证、证据和残余风险。Wayfinder 仅作为超长或决策前沿不清晰工作的可选 Discovery → Spec 规划模式，完成后回到 `handoff → to-spec`，不改变生命周期状态。

## 不可裁剪的主链

入口分诊 → Discovery → Spec / 功能架构 → 产品设计 → 系统 / 数据架构与工程契约 → Ticket 正式化 → 垂直切片实现（前后端 TDD）→ 验证 / 发布 / 复盘。

裁剪只允许将未命中的条件门禁标记为 `not-applicable` 并写原因；不得删除主阶段、已命中的门禁或必需产物。阶段是否完成取决于“内容 + 审查结论 + 上游新鲜度 + 可读证据”，文件存在不算通过。

## 阶段路由与技能

下表按 `lifecycle-registry.yaml` 的主阶段颗粒度编排；同一阶段内的多个工作单元、条件技能和门禁依赖以 references 为准。

| 主阶段 | 必需产物/门禁 | 原生工作单元与技能 | 通过条件 |
|---|---|---|---|
| 入口分诊 `stage.entry-triage` | 身份、影响面、最近可信阶段 | `work-unit.entry-triage`；`yss-product-lifecycle` | `yss-project.yaml` 合法且影响面可解释 |
| Discovery `stage.discovery` | Discovery、用户/MVP/非目标/成功标准、测试 seam；命中 DDD 影响时补充领域战略设计与阶段决策包 | `work-unit.discovery-opportunity` + `work-unit.discovery-requirements` + `work-unit.domain-strategy-design` + `work-unit.stage-decision`；市场/竞品事实用 `competitive-intelligence`，技术/标准事实用 `yss-research:technical-evidence`，领域战略与阶段决策证据用 `yss-research:strategy-evidence`；需求澄清用 `grilling`，领域建模用 `domain-modeling` / `yss-stage-decision`；`grill-with-docs` 为兼容入口 | 未决事实已由 `yss-research` 核验或 handoff，进入战略 / 阶段门禁的决策证据已 `evidence-audited`，领域边界和统一语言可审查，阶段决策包完成必要批准；`gate.domain-strategy-approved`、`gate.stage-decision-package-approved` |
| Spec / 功能架构 `stage.spec-architecture` | Spec、产品总体设计、功能架构；必要时 Spec Delta | 原生 `work-unit.spec-synthesis`；`to-spec` 为兼容入口 | 初稿先为 `ready-for-human`；只有 Spec baseline 会签批准后资产才为 `approved` 并进入下游 |
| 产品设计 `stage.product-design` | 交互说明、低保真、状态矩阵、H1/H2 原型交付物、评审记录 | `work-unit.prototype-design`；`yss-prototype-stage` 先消费 `yss-design-system`、低保真与独立 `prototype-review`，再按风险选择 H1 静态视觉或 H2 可运行流程；`yss-antd-design` 只在相关 H2 条件调用，原型阶段禁止调用 `yss-ui` | `gate.prototype-reviewed`、`gate.prototype-verified`、`gate.user-confirmation` 均有 schema v3 证据；真实组件待验事项已交接到前端实现计划 |
| 系统 / 数据架构与工程契约 `stage.system-data-engineering` | OpenAPI Draft/Freeze、数据架构、工程基线、架构审查；按领域影响执行 Tactical DDD Check | `work-unit.technical-analysis`；`yss-implementation-contract-compiler` + `yss-openapi-governance` / `yss-openapi-draft-review`、`codebase-design`、`implementation-repo-onboarding`、`yss-tactical-design`；用户或合同明确要求架构可视化时条件追加 `archify` | API/架构契约冻结；无 API 影响有明确记录；战术模型无未解释冲突；脚手架策略满足；Archify 图只作派生审查证据；`gate.openapi-draft-reviewed`、`gate.design-reviewed`、`gate.openapi-frozen`、`gate.engineering-baseline-accepted`、`gate.architecture-reviewed` |
| Ticket 正式化 `stage.ticket-formalization` | 功能父 Ticket、垂直切片、Slice Implementation Contract | 原生 `work-unit.ticket-decomposition`；`yss-implementation-contract-compiler`；`to-tickets` 为兼容入口；生命周期复算 | 依赖、验收、测试 seam 可执行；合同已批准、持久化且为当前版本；`gate.slice-contract-approved`、`gate.slice-ready-for-agent` |
| 垂直切片实现 `stage.vertical-slice-implementation` | 前端/后端代码、TDD 证据、YSS Skill Execution Result | 原生 `work-unit.slice-implementation`；`yss-implementation-contract-compiler` + `tdd`；前端按 `yss-ui` + `yss-page-module-development`，后端按 实现合同编译器 最小闭包；`implement` 为兼容入口 | 仅接收已完成 Ticket 正式化、已绑定垂直切片且 `ready-for-agent` 公式通过的输入；只写允许路径；业务行为用 `tdd` 的 `behavior-tdd` 模式；UI 影响必须有还原计划 |
| 验证 / 发布 / 复盘 `stage.verification-release-retrospective` | 不可变候选快照、review 结论、fresh verification、发布 / 回滚证据、复盘记录 | `work-unit.frontend-implementation-verification` + `work-unit.code-review` + `work-unit.release-and-retrospective`；`code-review` 独立于实现者，Standards 消费合同 `required_skills` 与 YSS / Alibaba 专项检查输入；UI 影响追加 `yss-ui` + `yss-design-system` 的 UI fidelity 轴；发布 / 复盘由生命周期持有 | findings 已按合同分流处理（修复后全轴复审或 stale 回 实现合同编译器）；同一候选快照通过全部审查轴、专项覆盖与验证；UI 影响追加 `gate.frontend-implementation-verified`；`gate.release-ready` 仍须生物人 |

## 前端实现还原硬检查

原型通过不等于前端实现通过。`ready-for-agent` 前先产生 `frontend_implementation_plan`（原型/Spec、路由与页面清单、桌面/窄屏验收用例、加载/空态/错误/权限/关键交互状态、拟执行的 `pnpm` 命令）；实现完成、发布前再产生 `frontend_implementation_verification`，补齐截图或视觉回归、console warning、命令退出码、未覆盖差异与责任人。差异未解释、截图缺失、只做 type-check 或只声称“已对齐”均为 `blocked`；发现新 API、状态或视觉行为时返回 `new_impacts`/`drift` 并重新路由。优先使用 `yss-ui/references/verification.md` 的分层验证和既有 `pnpm` scripts。

## 结果与暂停

凡主控向数字人角色或独立运行时正式派发生命周期工作单元，都必须通过结构化任务包派发，并返回 `Workflow Execution Result`（workflow reference、skill、changed files、evidence refs、actual verification、deferred seams、drift/new impacts）。任务包使用 `docs/process/schemas/digital-human-task-package.schema.json`，由 `scripts/verify-digital-human-task-package` 校验；其中 `role_id`、`runtime_id`、`execution_state`、`contract.kind/id/version`、允许写路径、预期证据和汇合引用必须完整。`slice-implementation` 任务包额外绑定批准且当前版本的 Slice Implementation Contract；Discovery、Spec、原型、技术分析、Ticket、Review、发布和模板维护分别绑定各自的生命周期资产或维护 checkpoint，不得伪造 Slice Contract。缺少可读证据、`stale`、`violation`、`drift`、`new_impacts` 或阻塞信号时不得标记 completed。实现授权不包含 Git commit/push 授权；“做完提交”等自然语言意向不构成上述结构化 Git 授权。

输出固定包含：模式、当前阶段、影响面、资产/门禁状态、证据、Ticket 正式化状态、垂直切片引用、`ready-for-agent` 计算结果、阻塞项、本轮动作、下一工作单元、暂停/继续理由、Ticket 同步和 Git checkpoint 判断。原生路径未出现 `to-tickets` / `implement` 名称本身不构成异常；但没有完成 `work-unit.ticket-decomposition`、垂直切片仍为 `ready-for-human`、引用父 Ticket 或 `next_route` 越过 Ticket 正式化时必须返回 `blocked`。暂停会签时必须输出门禁 ID、指定 `role_id`、`runtime_id` 和会签文件路径（`docs/.scratch/<feature>/gates/<gate-id>-approval.yaml`）。恢复前运行 `scripts/verify-approval-record`；错误会签记为 `blocked`，不得把该门禁标为 `approved`。任务包的 `core_skills` / `forbidden_skills` 必须从 `docs/agents/digital-human-roles.yaml` 复制（`taskPackageDefaults`），禁止手写第二套。

详细执行循环、readiness、脚手架（包括 `controlled-generation`）、审查快照、状态传播和 Matt 边界见 [orchestration.md](references/orchestration.md)、[orchestration-contract.yaml](references/orchestration-contract.yaml)、[artifact-dependencies.md](references/artifact-dependencies.md) 和 [state-model.md](references/state-model.md)。
