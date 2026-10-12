# 数字人角色

结构化事实源是 `.template-spec/agents/digital-human-roles.yaml`。角色、技能、协作组和会签级别与运行时无关。Claude Code、Cursor、Codex、Hermes、Grok Bot 等只通过 YAML `runtimes` 绑定。冲突时以 YAML 为准。

## 业务上游 profile 的用户边界

本分支的内部兼容 profile ID `harness.business-ddd-strategy-handoff` 只注册三个业务角色：`role.product-manager`、`role.requirements-manager` 和 `role.business`。`role.lifecycle-orchestrator` 负责控制生命周期，不属于业务用户；项目管理、工程、测试和发布角色不在本分支注册或推荐，业务方案交接后由主分支/下游研发模板接管。

该 profile 的终点是业务方案交接。当前 Harness 负责 Spec、页面原型和业务级 Ticket 正式化；下游研发团队接管研发待决技术问题。OpenAPI、技术 Ticket、代码、工程审查和发布不在本 profile。

## 何时读本文

按职称派活、写会签、把数字人角色和 Ticket 状态 / 职能 Agent / 执行态弄混，或要在某个 Agent 平台上实例化这些角色时。

## 正交轴

| 轴 | 是什么 | 不是什么 |
|---|---|---|
| 数字人角色 | 职称配置（需求经理、前端工程师…） | Ticket 五态、某个平台的 Bot |
| 主控数字人 | 生命周期编排器的运行时实例 | 第八个业务职称 |
| 职能工作单元 | Plan / Spec / Code / Review | 职称 |
| 执行态 | Explorer / Drafter / Worker / Reviewer / Verifier | 数字人角色 |
| 运行时绑定 | 如何在 Cursor / Claude / Grok 等落地 | 角色职责本身 |

一次数字人任务包同时写明 `task_id`、`work_unit_id`、`actor_id`、数字人角色、执行态、当前 `runtime_id`，以及从角色表复制的 `core_skills` / `forbidden_skills`。可用 `taskPackageDefaults(roleId)`（`scripts/lib/digital-human-roles.mjs`）读取，禁止手写第二套技能包。任务包 canonical Schema 为 `.template-spec/process/schemas/digital-human-task-package.schema.json`，按 `contract.kind` 选择生命周期、切片实现或模板维护合同。

## 会签人

`gate_policy.digital_human_review` 与 `dual_digital_human` 是「门禁 × 起草者 × 会签人」规则，不是门禁名单。`stage_groups` 只表示可协作成员，商务和主控不会因此成为会签人。战略 profile 使用 `default_if_unlisted: reject-unlisted`；新增活动 gate 未显式分类时以 `GATE_POLICY_REQUIRED` 阻断，不回退为人工会签。

| 门禁 / 工作单元 | 起草 | 会签 |
|---|---|---|
| `check.domain-strategy-approved` | `role.requirements-manager` | `role.product-manager` |
| `check.stage-decision-package-approved` | `role.requirements-manager` | `role.product-manager` |
| `check.prototype-reviewed` | `role.product-manager` | `role.requirements-manager` |
| `check.repository-identity-valid` / `check.prototype-verified` | 自动校验 | — |
| `gate.plan-approved` | `role.requirements-manager` | `role.product-manager` + 当前真实用户决定 |
| `gate.spec-baseline-approved` | `role.requirements-manager` | `role.product-manager` |
| `gate.strategic-design-handoff-approved` | `role.product-manager` | `role.requirements-manager` |
| `gate.product-design-approved` | `role.product-manager` | 当前真实用户；无 UI/体验影响时带依据 `not-applicable` |

按战略主路径计算，Plan bundle、Spec 复核和 Handoff 复核构成无 UI 场景的 3 次数字人审查任务，用户只在 Plan、Spec 暂停 2 次。命中 UI/体验影响时增加一次原型独立复核和一次产品设计确认，因此为 4 次数字人审查任务、3 次用户确认。`stage_groups`、商务输入、主控和自动检查不计为会签任务。

当前活动战略 gate 只有 Plan、Spec、条件性产品设计和战略交接。`check.*` 保留专业结论与证据，不单独请求用户批准；旧 gate 只读，不得继续流转。

Plan 的领域战略与阶段决策检查由产品经理在一个 `review-bundle.plan` 任务中逐项给出结论。bundle 只包含实际命中的 check；`gate.plan-approved` 使用独立批准记录，并通过同一个 `review_session_id` 复用本次审查。没有领域或阶段决策影响时不生成空 bundle。旧独立批准记录继续可读，不因协议升级失效。

会签写入 `.work/<feature>/gates/<gate-id>-approval.yaml`，形状见 `.template-spec/templates/approval-record-template.yaml`。恢复前运行 `scripts/verify-approval-record`。错误会签只能得到 `blocked`，不能把门禁标成 `approved`。Checkpoint 里会签桶门禁为 `approved` 时必须有可读 `approval_ref`。

`paused-human-gate` 表示等待上述指定会签人，不是「必须是生物人」。

主控不在本分支兼任业务角色；跨仓或责任冲突时仍按 `dual_hat_split_when`（`cross-repo-load` 或 `responsibility-conflict`）分体。

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
| `runtime.skill-projection` | `yss-skill-registry.yaml` 的 `agent_runtime_roots`（claude、codex、cursor、hermes、pi、qoder、trae） | 投影技能 + subagent 任务包 |
| `runtime.grok` | Grok Bot | 持久 Bot、群聊或 1:1 交接；群超过 6 人改 1:1，不改逻辑协作组 |

新增平台：先加 `runtimes` 条目，再写适配说明。不要把平台限制写进 `roles`。

Grok 专用操作见 `.template-spec/templates/grok-bot-profile-template.md`。通用实例化见 `.template-spec/templates/digital-human-runtime-profile-template.md`。

## 两套批准

| 名称 | 关闭什么 | 谁点 |
|---|---|---|
| 运行时副作用审批 | 发消息、改生产、付款、删数据等工具动作 | 生物人（各平台自己的 Allow / 确认框） |
| 生命周期会签 | `gate.*` 与独立 code review | 见 YAML `gate_policy` |

会签写入 `.template-spec/templates/approval-record-template.yaml`，带 `runtime_id`、`principal_ref` 与实例引用。起草者不得出现在会签人里。Plan、Spec 与适用产品设计按 `user_decision_policy` 核验当前真实回复；交接由需求经理独立复核，不新增用户回复。对外商务合同与运行时外部副作用仍须生物人。

## 实例化

- 模板仓：`publish-singleton-profiles`。账户级只发布一套职称 profile，不按功能再拆。
- `project-instance`：`duplicate-and-bind-repo-path`。复制 YAML 的 `title` / `description` / `core_skills`，写入本仓库路径，选择 `runtime_id`。步骤见 `.template-spec/templates/digital-human-runtime-profile-template.md`。外部 `create-yss-harness-design` 尚未接管此步骤。

## 任务包最低字段

`task_id`、`work_unit_id`、`actor_id`、数字人角色 ID、`runtime_id`、执行态、从角色表复制的 `core_skills` / `forbidden_skills`、`contract.kind/id/version`、输入资产、允许写路径、禁止事项、验收、验证命令、证据、下游消费者和汇合方式。

专业审查能力与当前绑定以本 profile 的 `digital-human-roles.yaml` 为准；角色核心 / 禁止技能保持原权限，`review_skills` 仅供正式 Reviewer / Verifier 任务补充只读审查。组合记录逐项保留结论，草案不得自动 approved。
