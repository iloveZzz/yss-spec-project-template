# 数字人角色

结构化事实源是 `.template-spec/agents/digital-human-roles.yaml`。角色、技能、协作组和会签级别与运行时无关。Cursor、Codex、Grok Bot 等只通过 YAML `runtimes` 绑定。冲突时以 YAML 为准。

## 何时读本文

按职称派活、写会签、把数字人角色和 Ticket 状态 / 职能 Agent / 执行态弄混，或要在某个 Agent 平台上实例化这些角色时。

## 四条正交轴

| 轴 | 是什么 | 不是什么 |
|---|---|---|
| 数字人角色 | 职称配置（需求经理、产品经理、前端工程师…） | Ticket 五态、某个平台的 Bot |
| 主控数字人 | 生命周期编排器的运行时实例 | 第八个业务职称 |
| 职能工作单元 | Plan / Spec / Code / Review | 职称 |
| 执行态 | Explorer / Drafter / Worker / Reviewer / Verifier | 数字人角色 |
| 运行时绑定 | 如何在 Cursor / Codex / Grok 等落地 | 角色职责本身 |

一次数字人任务包同时写明 `task_id`、`work_unit_id`、`actor_id`、数字人角色、执行态、当前 `runtime_id`，以及从角色表复制的 `core_skills` / `forbidden_skills`。可用 `taskPackageDefaults(roleId)`（`scripts/lib/digital-human-roles.mjs`）读取，禁止手写第二套技能包。`role.test-engineer` 的 core_skills 含 YSS / Alibaba 专项 skill，仅作为 `code-review` Standards 只读输入，不得写实现；finding 交实现者修复或回 实现合同编译器，审查者不得当场改代码。任务包 canonical Schema 为 `.template-spec/process/schemas/digital-human-task-package.schema.json`，按 `contract.kind` 选择生命周期、切片实现或模板维护合同。

## 会签人

正式门禁的会签由 `gate_policy.digital_human_review` / `dual_digital_human` / `biological_human` 定义；内部专业审查由 `check_reviews` 定义，自动检查由 `automatic_checks` 定义。每项的起草者与会签人只读取 YAML，不在本文复制名单。

专业审查按 YAML `review_capabilities` 和检查策略的 `capability_ids` 选择具备能力的独立执行者；角色是职责边界，不能用另一个职称替代能力或独立身份。正式 v1 审查任务的 `review_context` 绑定当前检查 / 能力、候选、策略、范围、依据摘要和审查 / 起草主体；`skill_source.review_skills` 从能力表编译，只供 Reviewer / Verifier 只读审查，角色核心技能和禁止技能不变。能力定义不在本文重复维护。

Plan、产品设计、工程契约统一呈现适用检查后批准。`gate.delivery-accepted` 由测试角色进行交付验收，实际合并或发布仍须另有生物人授权。内部检查不独立请求用户决定；检查失败仍阻断聚合门禁。专业审查可在同一工作单元完成多个检查项，但必须保留逐项结论、资产摘要与独立执行者身份。

会签写入配置的功能包根（示例 `.work/<feature>/gates/<gate-id>-approval.yaml`），新记录使用 schema v2，形状见 `.template-spec/templates/approval-record-template.yaml`。专业记录绑定 `review_task_ref/digest`、`capability_ids` 与 `basis`，相邻检查可组合为 schema v2 `review-bundle` 并逐项记录。恢复前运行 `scripts/verify-approval-record --require-approved --checkpoint <current checkpoint>`；当前期望上下文由消费 checkpoint / 任务建立，不能反向复制会签记录。错误会签只能得到 `blocked`，不能把门禁标成 `approved`。Checkpoint 里会签桶门禁为 `approved` 时必须有可读 `approval_ref`。历史记录可用 `--history` 只读查看，不放行当前执行；旧消费者须拒绝 v2 并升级。

`paused-human-gate` 表示等待指定会签人；`user_decision_policy` 命中的关键决定同时强制真实用户回复，数字人审查不能代答。请求展示、原始回复证据、复用和恢复规则见 [用户决定协议](../../.agents/skills/yss-product-lifecycle/references/user-decisions.md)。

专业等待由主控自主派发、等待并继续无依赖工作；验证失败修复或路由。未知影响先调查，缺真实决定或新授权才展示材料后询问。首轮覆盖全部适用检查；修复后按差异、受影响结论 / 行为及依赖定向复审并绑定当前候选，不因摘要变化、UI 影响或 `new_impacts` 默认重跑全轴。

主控默认兼任项目经理，直到 `dual_hat_split_when`（`cross-repo-load` 或 `responsibility-conflict`）要求分体。

## 跨平台协同（默认）

1. 人默认只跟主控说话。
2. 主控按阶段 1:1 指定一个 owner，并给任务包（输入、写范围、禁止 skill、验收、验证命令）。
3. 需要可见会签时使用 YAML `stage_groups` 的**逻辑协作组**。这不是某个产品的群聊人数限制。
4. 权威结论写回 git。运行时记忆只记该数字人的稳定偏好。
5. 写隔离一律靠任务包。某运行时若共享磁盘或会话，适配器必须声明 `shared_workspace_is_not_security_boundary: true`，不得把实例当成沙箱。
6. `project-instance` 复制角色实例并绑定仓库路径。禁止按功能再拆实例。
7. 技能权威仍是 `.agents/skills`。已有投影根走 `runtime.skill-projection`，不要为职称再维护一份 skill。任务包的技能列表必须从角色表复制。

## 运行时绑定

| ID | 覆盖 | 落地方式 |
|---|---|---|
| `runtime.generic` | 任何能加载 `core_skills` 并接受任务包的 Agent | 通用会话 / 人设 / system prompt |
| `runtime.skill-projection` | `yss-skill-registry.yaml` 的 `agent_runtime_roots`（codex、cursor、pi） | 投影技能 + subagent 任务包 |
| `runtime.grok` | Grok Bot | 持久 Bot、群聊或 1:1 交接；群超过 6 人改 1:1，不改逻辑协作组 |

新增平台：先加 `runtimes` 条目，再写适配说明。不要把平台限制写进 `roles`。

Grok 专用操作见 `.template-spec/templates/grok-bot-profile-template.md`。通用实例化见 `.template-spec/templates/digital-human-runtime-profile-template.md`。

## 两套批准

| 名称 | 关闭什么 | 谁点 |
|---|---|---|
| 运行时副作用审批 | 发消息、改生产、付款、删数据等工具动作 | 生物人（各平台自己的 Allow / 确认框） |
| 生命周期会签 | `gate.*` 与独立 code review | 见 YAML `gate_policy` |

会签写入 `.template-spec/templates/approval-record-template.yaml`，带 `runtime_id`、`principal_ref` 与实例引用。起草者不得出现在会签人里。对外商务合同和运行时外部副作用仍须生物人；交付验收不授予这些权限。

## 实例化

- 模板仓：`publish-singleton-profiles`。账户级只发布一套职称 profile，不按功能再拆。
- `project-instance`：`duplicate-and-bind-repo-path`。复制 YAML 的 `title` / `description` / `core_skills`，写入本仓库路径，选择 `runtime_id`。步骤见 `.template-spec/templates/digital-human-runtime-profile-template.md`。当前运行时角色绑定仍按该清单人工完成。

## 任务包最低字段

`task_id`、`work_unit_id`、`actor_id`、数字人角色 ID、`runtime_id`、执行态、从角色表复制的 `core_skills` / `forbidden_skills`、`contract.kind/id/version`、输入资产、允许写路径、禁止事项、验收、验证命令、证据、下游消费者和汇合方式。
