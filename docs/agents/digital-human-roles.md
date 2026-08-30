# 数字人角色

结构化事实源是 `docs/agents/digital-human-roles.yaml`。角色、技能、协作组和会签级别与运行时无关。Claude Code、Cursor、Codex、Hermes、Grok Bot 等只通过 YAML `runtimes` 绑定。冲突时以 YAML 为准。

## 何时读本文

按职称派活、写会签、把数字人角色和 Ticket 状态 / 职能 Agent / 执行态弄混，或要在某个 Agent 平台上实例化这些角色时。

## 四条正交轴

| 轴 | 是什么 | 不是什么 |
|---|---|---|
| 数字人角色 | 职称配置（需求经理、前端工程师…） | Ticket 五态、某个平台的 Bot |
| 主控数字人 | 生命周期编排器的运行时实例 | 第八个业务职称 |
| 职能工作单元 | Discovery / Spec / Code / Review | 职称 |
| 执行态 | Explorer / Drafter / Worker / Reviewer / Verifier | 数字人角色 |
| 运行时绑定 | 如何在 Cursor / Claude / Grok 等落地 | 角色职责本身 |

一次数字人任务包同时写明 `task_id`、`work_unit_id`、`actor_id`、数字人角色、执行态、当前 `runtime_id`，以及从角色表复制的 `core_skills` / `forbidden_skills`。可用 `taskPackageDefaults(roleId)`（`scripts/lib/digital-human-roles.mjs`）读取，禁止手写第二套技能包。`role.test-engineer` 的 core_skills 含 YSS / Alibaba 专项 skill，仅作为 `code-review` Standards 只读输入，不得写实现；finding 交实现者修复或回 Router，审查者不得当场改代码。任务包 canonical Schema 为 `docs/process/schemas/digital-human-task-package.schema.json`，按 `contract.kind` 选择生命周期、切片实现或模板维护合同。

## 会签人

`gate_policy.digital_human_review` 与 `dual_digital_human` 是「门禁 × 起草者 × 会签人」规则，不是门禁名单。主控按 `countersigners` 派会签任务。

| 门禁 / 工作单元 | 起草 | 会签 |
|---|---|---|
| `gate.prototype-reviewed` | `role.product-manager` | `role.frontend-engineer` |
| `gate.openapi-draft-reviewed` | `role.backend-engineer` | `role.frontend-engineer` |
| `gate.engineering-baseline-accepted` | （实现者） | `role.test-engineer` |
| `gate.frontend-implementation-verified` | `role.frontend-engineer` | `role.test-engineer` |
| `work-unit.code-review` | 实现者 | `role.test-engineer`（必须不同实例） |
| `gate.spec-baseline-approved` | `role.requirements-manager` | `role.product-manager` |
| `gate.openapi-frozen` | `role.backend-engineer` | `role.product-manager`、`role.test-engineer` |
| `gate.user-confirmation` | — | `role.product-manager`；生物人可否决 |
| `gate.release-ready` | — | 生物人（`role.biological-human`） |

未列入表的门禁（含 `gate.design-reviewed`、`gate.architecture-reviewed`）走 `default_if_unlisted: biological-human`。

会签写入 `docs/.scratch/<feature>/gates/<gate-id>-approval.yaml`，形状见 `docs/templates/approval-record-template.yaml`。恢复前运行 `scripts/verify-approval-record`。错误会签只能得到 `blocked`，不能把门禁标成 `approved`。Checkpoint 里会签桶门禁为 `approved` 时必须有可读 `approval_ref`。

`paused-human-gate` 表示等待上述指定会签人，不是「必须是生物人」。

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
| `runtime.skill-projection` | `yss-skill-registry.yaml` 的 `agent_runtime_roots`（claude、codex、cursor、hermes、pi、qoder、trae） | 投影技能 + subagent 任务包 |
| `runtime.grok` | Grok Bot | 持久 Bot、群聊或 1:1 交接；群超过 6 人改 1:1，不改逻辑协作组 |

新增平台：先加 `runtimes` 条目，再写适配说明。不要把平台限制写进 `roles`。

Grok 专用操作见 `docs/templates/grok-bot-profile-template.md`。通用实例化见 `docs/templates/digital-human-runtime-profile-template.md`。

## 两套批准

| 名称 | 关闭什么 | 谁点 |
|---|---|---|
| 运行时副作用审批 | 发消息、改生产、付款、删数据等工具动作 | 生物人（各平台自己的 Allow / 确认框） |
| 生命周期会签 | `gate.*` 与独立 code review | 见 YAML `gate_policy` |

会签写入 `docs/templates/approval-record-template.yaml`，带 `runtime_id`、`principal_ref` 与实例引用。起草者不得出现在会签人里。`gate.release-ready`、对外商务合同、运行时外部副作用，以及未列入会签表的 `gate.design-reviewed` / `gate.architecture-reviewed` 仍须生物人。

## 实例化

- 模板仓：`publish-singleton-profiles`。账户级只发布一套职称 profile，不按功能再拆。
- `project-instance`：`duplicate-and-bind-repo-path`。复制 YAML 的 `title` / `description` / `core_skills`，写入本仓库路径，选择 `runtime_id`。步骤见 `docs/templates/digital-human-runtime-profile-template.md`。外部 `create-yss-spec` 尚未接管此步骤。

## 任务包最低字段

`task_id`、`work_unit_id`、`actor_id`、数字人角色 ID、`runtime_id`、执行态、从角色表复制的 `core_skills` / `forbidden_skills`、`contract.kind/id/version`、输入资产、允许写路径、禁止事项、验收、验证命令、证据、下游消费者和汇合方式。
