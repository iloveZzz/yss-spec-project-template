# Harness Agent 角色

结构化事实源是 `.template-spec/agents/digital-human-roles.yaml`。研发角色只有架构、前端、后端和测试四类；`role.harness-orchestrator` 是系统编排组件，不计入研发角色。角色职责、协作组、运行时绑定和会签规则均以 YAML 为准。

## 四角色边界

| 角色 | 主要职责 | 明确不负责 |
|---|---|---|
| `role.architecture-agent` | 把已批准的上游 Spec / 战略设计细化为 DDD / MVC Technical Design Contract，定义聚合、行为、不变量、状态、一致性、Gateway、API 与数据边界 | 生产实现、独立验证、替其他角色批准自己的设计 |
| `role.frontend-agent` | 消费 Slice Contract，交付页面、组件、状态、API 消费和前端测试 | 创造产品规则、修改后端领域 / API 契约、验收自己实现的切片 |
| `role.backend-agent` | 消费 Technical Design Contract 与 API / 数据边界，交付 Domain、Application、Infrastructure、Web、DTO 和后端测试 | 重新定义架构合同、验收自己实现的切片 |
| `role.test-agent` | 预先建立测试 seam、fixture 和验收矩阵，独立执行契约、集成、E2E 与 Fresh Verification | 修改生产行为掩盖失败、改变范围或替实现者关闭验证 |

Harness Orchestrator 负责入口、影响面、合同版本、任务包、状态转移、证据汇合和重路由；它不写业务代码，也不替专业角色做领域决策。

## 标准流程

`harness-entry → tactical-design → slice-contract → slice-implementation → verification`

执行态统一为 `Explorer / Drafter / Worker / Reviewer / Verifier`。测试 Agent 必须在实现前建立 seam；Slice Contract 批准后，前端和后端可以并行实现；实现者不能承担同一切片的独立验证。

Slice Implementation Contract 的固定分区是 `architecture`、`frontend`、`backend`、`testing`，四个 Agent 消费同一个 `contract_id` 和 `contract_version`。只有 Harness Orchestrator 在就绪公式全部满足、合同版本当前且阻塞边清空后，才能设置 `ready-for-agent`。

## 会签与运行时

数字人任务包必须包含 `task_id`、`work_unit_id`、`actor_id`、角色 ID、`runtime_id`、执行态、从 YAML 复制的 `core_skills` / `forbidden_skills`、合同引用、允许写路径、验收标准、验证命令和证据。使用 `taskPackageDefaults(roleId)` 生成默认技能集合，禁止手写第二套职责。

`gate.technical-design-approved` 由架构 Agent 起草、测试 Agent 会签；`gate.slice-contract-approved` 由架构 Agent 起草并由前端、后端、测试 Agent 会签；`gate.fresh-verification-passed` 由测试 Agent 起草、架构 Agent 会签。高风险架构、OpenAPI Freeze 和 `gate.merge-approved` 保留生物人会签。运行时副作用审批始终由生物人负责。

`runtime.grok` 只是运行时适配器，群聊上限为 4 人；超出时使用 1:1 交接，不改变逻辑协作组或四角色集合。`.agents/skills` 是技能权威目录，其他 Agent 目录仅为生成投影。

任务包 Schema：`.template-spec/process/schemas/digital-human-task-package.schema.json`。

专业审查能力与当前绑定以本 profile 的 `digital-human-roles.yaml` 为准；核心 / 禁止技能、端范围与主控批准权保持，正式 Reviewer / Verifier 才能加载 `review_skills`。组合记录逐项留结论，pending 草案不放行。
