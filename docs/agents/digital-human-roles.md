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

一次任务包同时写明数字人角色、执行态和当前 `runtime_id`。

## 跨平台协同（默认）

1. 人默认只跟主控说话。
2. 主控按阶段 1:1 指定一个 owner，并给任务包（输入、写范围、禁止 skill、验收、验证命令）。
3. 需要可见会签时使用 YAML `stage_groups` 的**逻辑协作组**。这不是某个产品的群聊人数限制。
4. 权威结论写回 git。运行时记忆只记该数字人的稳定偏好。
5. 写隔离一律靠任务包。某运行时若共享磁盘或会话，适配器必须声明 `shared_workspace_is_not_security_boundary: true`，不得把实例当成沙箱。
6. `project-instance` 复制角色实例并绑定仓库路径。禁止按功能再拆实例。
7. 技能权威仍是 `.agents/skills`。已有投影根走 `runtime.skill-projection`，不要为职称再维护一份 skill。

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

会签写入 `docs/templates/approval-record-template.yaml`，带 `runtime_id` 与实例引用。实现者角色不得出现在会签人里。`gate.release-ready`、对外商务合同和运行时外部副作用仍须生物人。

## 任务包最低字段

数字人角色 ID、`runtime_id`、执行态、输入资产、允许写路径、禁止事项、验收、验证命令、汇合方式。
