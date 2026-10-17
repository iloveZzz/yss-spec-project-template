# Harness Agent 角色

结构化事实源是 `.template-spec/agents/digital-human-roles.yaml`。本 Profile 注册五个数字人角色：研发侧架构、后端、测试，以及负责 Plan / Spec 的需求经理和产品经理；`role.harness-orchestrator` 是系统编排组件，不计入角色。前端 Agent 已随前端整线退役（AR-12c），本 Profile 不派发前端实现。角色职责、协作组、运行时绑定和会签规则均以 YAML 为准，本文与 YAML 冲突时以 YAML 为准。

## 角色边界

| 角色 | 主要职责 | 明确不负责 |
|---|---|---|
| `role.requirements-manager` | Plan 语言、用户、MVP、非目标、成功标准、测试 seam 与 Spec 正文；提出 `CONTEXT.md` 术语 | 冻结原型、OpenAPI 或代码；猜测未确认业务规则 |
| `role.product-manager` | 优先级、产品设计影响、交互与状态矩阵、商业约束与发布窗口；可驳回 Spec 范围 | 生产代码、单独冻结 OpenAPI、独立批准对外商务合同 |
| `role.architecture-agent` | 把已批准的上游 Spec / 战略设计细化为 DDD / MVC Technical Design Contract，定义聚合、行为、不变量、状态、一致性、Gateway、API 与数据边界 | 生产实现、独立验证、替其他角色批准自己的设计 |
| `role.backend-agent` | 消费 Technical Design Contract 与 API / 数据边界，交付 Domain、Application、Infrastructure、Web、DTO 和后端测试 | 重新定义架构合同、验收自己实现的切片 |
| `role.test-agent` | 预先建立测试 seam、fixture 和验收矩阵，独立执行契约、集成、E2E 与 Fresh Verification | 修改生产行为掩盖失败、改变范围或替实现者关闭验证 |

Harness Orchestrator 负责入口、影响面、合同版本、任务包、状态转移、证据汇合和重路由；它不写业务代码，也不替专业角色做领域决策。

## 标准流程

`plan → spec-architecture → harness-entry → technical-design → implementation-repository-preparation → slice-contract → slice-implementation → verification`

执行态统一为 `Explorer / Drafter / Worker / Reviewer / Verifier`。测试 Agent 必须在实现前建立 seam；实现者不能承担同一切片的独立验证。

Slice Implementation Contract 沿用编译器合同的 `architecture`、`frontend`、`backend`、`testing` 分区，各角色消费同一个 `contract_id` 和 `contract_version`；本 Profile 不派发 `frontend` 分区的实现。只有 Harness Orchestrator 在就绪公式全部满足、合同版本当前且阻塞边清空后，才能设置 `ready-for-agent`。

## 会签

下表与 YAML `gate_policy` 一一对应，由 `tests/digital-human-roles-docs.test.mjs` 校验。`countersigners` 是候选角色，默认一名 owner 加一名独立 reviewer，不要求逐个签字。

| 门禁 / 检查 | 起草 | 会签 |
|---|---|---|
| `check.domain-strategy-approved` | `role.requirements-manager` | `role.product-manager` |
| `check.stage-decision-package-approved` | `role.requirements-manager` | `role.product-manager` |
| `gate.plan-approved` | `role.requirements-manager` | `role.product-manager` + 当前真实用户决定 |
| `gate.spec-baseline-approved` | `role.requirements-manager` | `role.product-manager` + 当前真实用户决定 |
| `gate.technical-design-approved` | `role.architecture-agent` | `role.test-agent` |
| `gate.engineering-contract-approved` | `role.architecture-agent` | `role.test-agent` + 当前真实用户决定 |
| `check.design-reviewed` | — | `role.architecture-agent` 或 `role.test-agent`，不得是起草者 |
| `gate.slice-contract-approved` / `gate.slice-ready-for-agent` | `role.harness-orchestrator` | — |
| `gate.fresh-verification-passed` | `role.test-agent` | `role.architecture-agent` |
| `gate.repository-identity-valid` | 证据校验 | — |
| `gate.backend-architecture-platform-approved` / `gate.high-risk-architecture-confirmed` / `gate.openapi-freeze-confirmed` / `gate.merge-approved` | — | 生物人 |

工作单元 `work-unit.technical-design` 与 `work-unit.slice-implementation` 由 `role.test-agent` 独立审查，实施者必须不同。运行时副作用审批始终由生物人负责。

## 审查准备

会签记录不手写。主控用 `scripts/prepare-review-package` 从当前 checkpoint 生成审查任务、主体和 pending 组合记录；审查者只填写逐项 `decision` 与发现，再用 `scripts/verify-approval-record --checkpoint <当前检查点> --require-approved <批准文件>` 校验。

- 同一阶段、同一审查者能力可覆盖的边界合并为一个任务，每个边界用一个 `--check`。`gate.technical-design-approved` 与 `gate.engineering-contract-approved` 都在 `stage.technical-design`，均可由 `role.test-agent` 审查，应一次准备、一次审查；工程合同行另附当前用户决定。
- 不能合并：`check.design-reviewed`（Slice Contract 主体，`stage.slice-contract`）与 `gate.fresh-verification-passed`（测试 Agent 起草，须由架构 Agent 会签）。
- 修复后复审传 `--previous-subject <原审阅包主体>`，生成机械差异，审查者只看受影响项；差异不构成批准。

## 任务包与运行时

数字人任务包必须包含 `task_id`、`work_unit_id`、`actor_id`、角色 ID、`runtime_id`、执行态、从 YAML 复制的 `core_skills` / `forbidden_skills`、合同引用、允许写路径、验收标准、验证命令和证据。使用 `taskPackageDefaults(roleId)` 生成默认技能集合，禁止手写第二套职责。

`runtime.grok` 只是运行时适配器，群聊上限以 YAML `runtimes` 为准；超出时使用 1:1 交接，不改变逻辑协作组或角色集合。`.agents/skills` 是技能权威目录，其他 Agent 目录仅为生成投影。

任务包 Schema：`.template-spec/process/schemas/digital-human-task-package.schema.json`。

专业审查能力与当前绑定以本 profile 的 `digital-human-roles.yaml` 为准；核心 / 禁止技能、端范围与主控批准权保持，正式 Reviewer / Verifier 才能加载 `review_skills`。组合记录逐项留结论，pending 草案不放行。
