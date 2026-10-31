# Harness Agent 角色


## 角色边界

| 角色 | 主要职责 | 明确不负责 |
|---|---|---|
| `role.requirements-manager` | Plan 语言、用户、MVP、非目标、成功标准、测试 seam 与 Spec 正文；提出 `CONTEXT.md` 术语 | 冻结原型、OpenAPI 或代码；猜测未确认业务规则 |
| `role.product-manager` | 优先级、产品设计影响、交互与状态矩阵、商业约束与发布窗口；可驳回 Spec 范围 | 生产代码、单独当前 OpenAPI、独立批准对外商务合同 |
| `role.architecture-agent` | 把已批准的上游 Spec / 战略设计细化为 DDD / MVC Technical Design Contract，定义聚合、行为、不变量、状态、一致性、Gateway、API 与数据边界 | 生产实现、独立验证、替其他角色批准自己的设计 |
| `role.backend-agent` | 消费 Technical Design Contract 与 API / 数据边界，交付 Domain、Application、Infrastructure、Web、DTO 和后端测试 | 重新定义架构合同、验收自己实现的切片 |

Harness Orchestrator 负责入口、影响面、合同版本、任务包、状态转移、证据汇合和重路由；它不写业务代码，也不替专业角色做领域决策。

## 标准流程

`plan → spec-architecture → harness-entry → technical-design → implementation-repository-preparation → slice-contract → slice-implementation → verification`

执行态统一为 `Explorer / Drafter / Worker / Reviewer / Verifier`。测试 Agent 必须在实现前建立 seam；实现者不能承担同一切片的独立验证。

## 会签

|---|---|---|

## 审查准备

- 修复后复审传 `--previous-subject <原审阅包主体>`，生成机械差异，审查者只看受影响项；差异不构成批准。
- 用 `--independence separate-session|same-session`（可加 `--independence-evidence <子会话或任务引用>`）如实声明审查是否在独立 Agent 会话中进行。声明只记录、不改变放行；未声明在统计中计为“未声明”。

## 任务包与运行时

数字人任务包必须包含 `task_id`、`work_unit_id`、`actor_id`、角色 ID、`runtime_id`、执行态、从 YAML 复制的 `core_skills` / `forbidden_skills`、合同引用、允许写路径、验收标准、验证命令和证据。使用 `taskPackageDefaults(roleId)` 生成默认技能集合，禁止手写第二套职责。

`runtime.grok` 只是运行时适配器，群聊上限以 YAML `runtimes` 为准；超出时使用 1:1 交接，不改变角色集合。`.agents/skills` 是技能权威目录，其他 Agent 目录仅为生成投影。
