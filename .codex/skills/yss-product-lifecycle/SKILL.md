---
name: yss-product-lifecycle
description: 编排 YSS 产品或模块从机会调研到 Spec、原型、技术契约、垂直切片实现、审查、发布和复盘；当阶段、产物、门禁或 YSS skill 不清晰时使用。
---

# YSS Product Lifecycle

这是生命周期主控 skill：负责识别阶段、判定影响面、检查产物与门禁、选择下一工作单元并验收结果。业务实现必须交给对应的 Matt/YSS 专项 skill；本 skill 不替代它们。

## 入口与边界

1. 先读取 `yss-project.yaml`、`CONTEXT.md`、相关 ADR、父 Ticket/checkpoint 和当前资产。
2. `repository_mode=template-source` 只走模板维护流程；命中产品流程时返回 `blocked: template-source-product-artifact-forbidden`，不得生成产品 Spec、原型、OpenAPI 或切片 Ticket。
3. `repository_mode=project-instance` 以 `docs/process/lifecycle-registry.yaml`、`harness-process-tailoring.md` 和本目录 references 为唯一阶段、门禁和裁剪事实源。数字人角色、阶段群聊与会签级别以 `docs/agents/digital-human-roles.yaml` 为准；职称 Bot 不另起编排器。
4. 模式：`route` 只读规划；`orchestrate` 有界推进；`resume` 重建后推进；`audit` 严格只读。未明确时使用 `route`。

Matt 的 `grill-with-docs`、`to-spec`、`to-tickets`、`implement` 等保留为显式兼容入口；默认路径是本 skill 持有的原生工作单元，由本编排器创建正式资产、维护状态并在会签门禁暂停（级别见数字人角色注册表）。兼容入口不得自动调用它们或代替其创建正式资产；Matt 只导航，不得写生命周期资产或改变门禁/Ticket 状态；任何写入前回交本编排器。

## 不可裁剪的主链

机会调研/需求分析 → Spec/功能架构 → 产品设计与原型 → 技术分析（系统、数据、API、工程基线）→ Ticket 正式化 → 垂直切片实现（前后端 TDD）→ 独立 code review 与 fresh verification → 发布/复盘。

裁剪只允许将未命中的条件门禁标记为 `not-applicable` 并写原因；不得删除主阶段、已命中的门禁或必需产物。阶段是否完成取决于“内容 + 审查结论 + 上游新鲜度 + 可读证据”，文件存在不算通过。

## 阶段路由与技能

| 阶段 | 必需产物/门禁 | 工作单元与技能 | 通过条件 |
|---|---|---|---|
| 入口分诊 | 身份、影响面、最近可信阶段 | `yss-product-lifecycle` | `yss-project.yaml` 合法且影响面可解释 |
| 机会调研/需求分析 | Discovery、用户/MVP/非目标/成功标准、测试 seam | `work-unit.discovery-opportunity` + `work-unit.discovery-requirements`；市场/竞品事实用 `competitive-intelligence`，技术/标准事实用 `research`；`grill-with-docs` 为兼容入口 | 未决事实已 research 或 handoff，用户确认，无 runnable blocker |
| Spec/功能架构 | Spec、产品总体设计、功能架构；必要时 Spec Delta | 原生 `work-unit.spec-synthesis`；`to-spec` 为兼容入口 | 初稿先为 `ready-for-human`；只有 Spec baseline 会签批准后资产才为 `approved` 并进入下游 |
| 原型设计 | 交互说明、低保真、状态矩阵、高保真 HTML、评审记录 | `yss-design-system` → `yss-prototype-stage` → `yss-antd-design`（仅原型事实）→ Codex `product-design:index`（非 Codex 交付等价合同）。前端落地改用 `yss-ui` | `gate.prototype-reviewed`、`gate.prototype-verified`、`gate.user-confirmation` 均有证据 |
| 技术分析 | OpenAPI Draft/Freeze、数据架构、工程基线、架构审查 | `yss-openapi-governance` / `yss-openapi-draft-review`、`codebase-design`、`implementation-repo-onboarding`、`yss-router` | API/架构契约冻结；无 API 影响有明确记录；脚手架策略满足 |
| Ticket 正式化 | 功能父 Ticket、垂直切片、Slice Implementation Contract | 原生 `work-unit.ticket-decomposition`；`to-tickets` 为兼容入口；生命周期复算 | 依赖、验收、测试 seam 可执行；合同已批准、持久化且为当前版本 |
| 技术实现 | 前端/后端代码、TDD 证据、YSS Skill Execution Result | 原生 `work-unit.slice-implementation`；`implement` 为兼容入口；前端按 `yss-ui` + `yss-page-module-development`，后端按 `yss-router` 最小闭包，业务行为统一 `tdd` | 只写允许路径；业务行为用 `behavior-tdd`；UI 影响必须有还原计划 |
| Review/验证 | 不可变候选快照、review 结论、fresh verification | `code-review`（独立于实现者）；UI 影响追加 `yss-ui` + `yss-design-system` 的 UI fidelity 轴 | findings 已处理；同一候选快照通过全部审查轴与验证 |
| 发布/复盘 | 发布/回滚证据、复盘记录 | 生命周期自有工作单元 | fresh verification、独立审查和发布裁决齐全；`gate.release-ready` 仍须生物人 |

## 前端实现还原硬检查

原型通过不等于前端实现通过。`ready-for-agent` 前先产生 `frontend_implementation_plan`（原型/Spec、路由与页面清单、桌面/窄屏验收用例、加载/空态/错误/权限/关键交互状态、拟执行的 `pnpm` 命令）；实现完成、发布前再产生 `frontend_implementation_verification`，补齐截图或视觉回归、console warning、命令退出码、未覆盖差异与责任人。差异未解释、截图缺失、只做 type-check 或只声称“已对齐”均为 `blocked`；发现新 API、状态或视觉行为时返回 `new_impacts`/`drift` 并重新路由。优先使用 `yss-ui/references/verification.md` 的分层验证和既有 `pnpm` scripts。

## 结果与暂停

每个工作单元必须返回 `Workflow Execution Result`（workflow reference、skill、changed files、evidence refs、actual verification、deferred seams、drift/new impacts）。缺少可读证据、`stale`、`violation`、`drift`、`new_impacts` 或阻塞信号时不得标记 completed。实现授权不包含 Git commit/push 授权；“做完提交”等自然语言意向不构成上述结构化 Git 授权。

输出固定包含：模式、当前阶段、影响面、资产/门禁状态、证据、阻塞项、本轮动作、下一工作单元、暂停/继续理由、Ticket 同步和 Git checkpoint 判断。暂停时只提出一个具体人工决策，并给出推荐答案与恢复动作。

详细执行循环、readiness、脚手架（包括 `controlled-generation`）、审查快照、状态传播和 Matt 边界见 [orchestration.md](references/orchestration.md)、[orchestration-contract.yaml](references/orchestration-contract.yaml)、[artifact-dependencies.md](references/artifact-dependencies.md) 和 [state-model.md](references/state-model.md)。
