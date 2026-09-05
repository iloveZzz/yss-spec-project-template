# AGENTS.md — AI 开发入口规则

> 只保留入口、硬门禁和禁令。

## 1. 首先识别仓库身份

先读根 `yss-project.yaml`：`template-source` 走模板维护；`project-instance` 走产品生命周期。

- `template-source` 不生成产品 Spec、原型、OpenAPI 或垂直切片 Ticket。
- 文件缺失、schema 不支持或模式非法时停止并迁移检查；不得按目录、Git remote 或占位符猜身份。

## 2. 单一事实来源

| 事实 | 权威资产 |
|---|---|
| 词汇 | `CONTEXT.md` |
| Agent 入口红线 | `AGENTS.md` |
| 阶段、门禁、产物、工作单元、证据、稳定 ID | `docs/process/lifecycle-registry.yaml`；`docs/process/lifecycle-artifact-map.md` 仅为派生阅读视图 |
| 影响面、`not-applicable`、模板维护强度 | `docs/process/harness-process-tailoring.md`、`docs/process/maintenance-intensity.yaml` |
| Skill 来源、版本、投影、路由 | `skills-lock.json`、`docs/agents/yss-skill-registry.yaml` |
| 数字人角色、运行时与会签 | `docs/agents/digital-human-roles.yaml` |
| 视觉规范 | `DESIGN.md`；治理见 `docs/design/design.md` |

其他文档和派生视图只引用，不重复定义。

## 3. 标准文档语言与规范语汇

- 生命周期文档用简体中文；英文专名、代码 / API 标识、schema、命令、文件名和 metadata 原样保留。新流程统一用 Spec、Ticket、`to-spec`、`to-tickets`。
- 规划至实现全程消费根 `CONTEXT.md` 及文首合同；不可读即 `blocked`。稳定术语先登记，再以 `<ContextId>/<EnglishIdentifier>` 引用；跨上下文用 `Global/<EnglishIdentifier>`。
- 每仓只允许根目录一个大小写精确的 `CONTEXT.md`；禁止嵌套、`CONTEXT-MAP.md`、跨仓路径和伪锚点。
- `project-instance` 每个工作单元批准或流转前完成 `context_reconciliation`；缺失、冲突或摘要漂移即 `blocked`。`template-source` 校验模板合同并记录带原因的 `not-applicable`。

## 4. `template-source` 模板维护路由

- 按“影响面 → 事实源 → 投影 / 派生 → 分级证据”维护；改 Skill 必须用 `maintaining-skills`，并按 `docs/process/harness-process-tailoring.md` 判定 L1 / L2 / L3。
- `.agents/skills` 是共享 Skill 权威目录；其他 Agent root 下的同名 Skill 是生成投影，不得手改或与 canonical 并列维护。
- 内循环运行 `scripts/verify-template-fast`；晋级审查运行 `scripts/verify-template-candidate`；首次冻结和最终发布前运行不可裁剪的 `scripts/verify-template`。外部 `create-yss-spec` 集成未闭合不得称可发布。

## 5. `project-instance` 产品研发路由

主流程：分诊 → Discovery → Spec / 功能架构 → 产品设计 → 工程契约 → Ticket → 切片 → 验证 / 发布 / 复盘。

- 先按 `docs/process/harness-process-tailoring.md` 判定影响面和最近可信阶段，再由 `yss-product-lifecycle` 执行 `docs/process/lifecycle-registry.yaml`；阅读导航见 `docs/process/lifecycle-artifact-map.md`。
- 命中门禁必须完成；仅未命中时记录带原因的 `not-applicable`，不得生成空文档或混淆门禁、产物、工作单元、证据。安全 / 权限写入普通 Spec、契约、架构、验收和 seam，按实际影响触发门禁。
- 新功能和较大变更先进入 Discovery；`grill-with-docs`、`to-spec`、`to-tickets`、`implement` 仅为用户显式兼容入口。API 变更先形成 OpenAPI 3.1 Draft，审查后 Freeze，再实现。
- Spec Delta 只记冻结基线的高风险行为差异。OpenAPI Freeze 或无 API 影响记录后拆窄垂直切片，禁止仅按技术层横拆。
- `seam-deferred` 必须记录风险、责任人、后续 Ticket、验证计划和目标版本或发布日期。

## 6. Ticket 与状态

- 每个功能先建父 Ticket，汇总阶段资产、审查、阻塞和证据。
- Spec、设计、原型、OpenAPI Draft 和待冻结资产使用 `ready-for-human`；只有门禁通过、阻塞清除且可直接实现的垂直切片才能使用 `ready-for-agent`。
- 按 `docs/agents/issue-tracker.md` 持久化主 tracker，不从 Git remote 推断；平台不可用时生成待发布草案。五态见 `docs/agents/triage-labels.md`。

## 7. 实现与 YSS 路由硬门禁

- 实现前按 `docs/process/implementation-repo-integration.md` 登记仓库、项目根、分支、CI、验证命令、回滚点；再用 `yss-implementation-contract-compiler` 编译最小 Skill 集和当前合同。
- 无工程先确认外部仓库或输出目录。Backend `scaffold_status=required` 时，由生命周期推荐 `domain-driven` / `layered-mvc`，用户逐项目确认后路由；Frontend 用 `yss-frontend-scaffold-generator`。缺目录不改路由。
- 脚手架仅在 `scaffold-architecture-decisions.yaml` 已确认且当前、schema v3 合同已持久化并获批准后无交互运行，只生成机械骨架。既有工程不得重选或覆盖；架构转换单独立项。
- 正式切片只消费已批准、已持久化且当前的 Slice Implementation Contract；编译器只起草，不批准、不设置 `ready-for-agent`、不宣布完成。
- UI 切片在 `ready-for-agent` 前须有已校验的 `frontend_implementation_plan`，实现后补 `frontend_implementation_verification`，覆盖截图 / 视觉回归、状态交互、console warning、实际 `pnpm` 退出码。
- 前端验证优先 `pnpm`，后端优先根 `./mvnw`；缺少时记录受控例外和实际命令。
- 路径越界、证据缺失、验证未执行、`drift`、`violation` 或 `new_impacts` 时停止实现并重新路由。

## 8. 专项任务的强制入口

- 技术事实、标准、第三方 API 或框架行为用 `yss-research`（`technical-evidence` / `strategy-evidence`）；竞品、市场、口碑用 `competitive-intelligence`。
- 产品设计由 `yss-prototype-stage` 持有合同并调用设计系统、独立评审、H1 / H2 适配器；原型禁用 `yss-ui`。真实组件事实只用于实现计划、已批准实现和还原验证。
- 数字人协同或会签先读 `docs/agents/digital-human-roles.yaml`；角色不得另起生命周期、批准 Slice 合同、设置 `ready-for-agent` 或宣布可发布。
- 业务行为默认按 `tdd` 的 `behavior-tdd` 使用已确认公开 seam 逐切片实现；一次性生成、纯配置或流程文档不适用时，记录例外理由和可执行验证。

## 9. 工作区与实现仓库边界

- 运行时代码默认进入已登记的 `external-repository`；仅用户明确选择时使用 `apps/backend/<project>`、`apps/frontend/<project>` 的 `harness-apps`，或以真实 gitlink 使用 `git-submodule`。三种 scope 按实现接入文档登记。
- 禁止向 `app/backend/`、`app/frontend/` 输出；空 gitlink、detached HEAD、`--force` 挂载点不得视为普通目录；不得把 submodule 登记为 `harness-apps` 或复制源码冒充。

## 10. 独立审查、验证和追踪

- 实现者不做独立审查，Reviewer 不写实现；代码审查统一用 `code-review`。mandatory 不豁免；`violation` 修复后重审，`drift` / `new_impacts` 使合同 `stale` 并回编译器。
- “完成 / 可合并 / 可发布”仅基于 Fresh Verification；历史结果、自述无效。
- 会签按角色表 `gate_policy` 并经 `scripts/verify-approval-record --require-approved` 核验；`user_decision_policy` 命中的关键决定必须先展示可审阅资产，再取得提问者或其明确指定负责人的真实回复。无回复保持等待，数字人不能代答；原始来源、范围、复用和失效见生命周期 `references/user-decisions.md`。发布、商务承诺、运行时外部副作用仍须生物人。
- 会签暂停、handoff、实现、合并、发布边界同步范围、证据、风险、会签点、Ticket 状态和下一步。Git checkpoint 只含本轮范围；提交 / 推送须用户授权。
- 发布或阶段完成时判断复盘；架构 / 验证返工、IMPORTANT / CRITICAL finding、人工确认延期时，落中文复盘并修订事实源。

## 11. Subagent 协同

- 使用 subagent 或其他运行时前读 `docs/process/subagent-collaboration.md`，建立含角色、`runtime_id`、执行态、技能约束和不重叠写范围的任务包；共享工作区不是安全边界。
- 仓库身份、Ticket 最终状态、Git checkpoint、Slice 合同批准和完成结论由主控裁决；实现者不得兼任独立审查者或会签自己的资产。

## 12. 测试质量基线

模板推荐 Domain / Application `>= 90%`、API `>= 80%`、前端组件 `>= 75%`、关键流程 `100% E2E`；`project-instance` 明确采纳后才是 CI 门禁，未定义关键流程不得称 100% E2E。
