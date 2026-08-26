# 数字人角色

结构化事实源是 `docs/agents/digital-human-roles.yaml`。本文件只写如何协同；角色、技能、群成员和会签级别以 YAML 为准。冲突时以 YAML 为准。

## 何时读本文

构建 Grok Bot、按职称派活、写会签记录，或把数字人角色和 Ticket 状态 / 职能 Agent / Subagent 执行态弄混时。

## 四条正交轴

| 轴 | 是什么 | 不是什么 |
|---|---|---|
| 数字人角色 | 职称配置（需求经理、前端工程师…） | Ticket 五态 |
| 主控数字人 | 生命周期编排器的 Grok 实例 | 第八个业务职称 |
| 职能工作单元 | Discovery / Spec / Code / Review | 职称 |
| Subagent 执行态 | Explorer / Drafter / Worker / Reviewer / Verifier | 数字人角色 |

一次任务包同时写明数字人角色和执行态。前端工程师可以是 Worker 或 Reviewer，但不能审自己起草的资产。

## 在 Grok Bot 上落地

1. 账户级先建 **主控** Bot，description 使用 YAML 中 `orchestrator.grok_description`；默认兼任项目经理。
2. 再为 YAML `roles` 各建一个 Bot（项目经理可先不单开）。Profile 的 title / description 用对应 `grok_title` / `grok_description`。
3. 在 Grok **Settings → Plugins → Yours** 仅为该 Bot 启用 `core_skills`；`forbidden_skills` 保持关闭。Skill 账户内可见不等于该 Bot 可用。
4. 落到某个 `project-instance` 时 **duplicate** 整套 Bot，在 description 写入仓库路径。禁止按功能再拆 Bot。
5. 人默认只跟主控说话。主控按阶段 1:1 `@` 一个 owner，并给任务包。
6. 需要可见会签时才开 YAML `stage_groups` 中的群（2–6 人）。不要开全员群。
7. 权威结论写回 git。Grok memory 只记该数字人的稳定偏好。表情回复不能当会签。

Grok 全部 Bot 共用一台云计算机。写范围写进任务包；不要把不同 Bot 当成权限沙箱。

## 两套批准

| 名称 | 关闭什么 | 谁点 |
|---|---|---|
| Grok 平台审批 | 发消息、改生产、付款、删数据等工具动作 | 生物人 Allow / Require Approval |
| 生命周期会签 | `gate.*` 与独立 code review | 见 YAML `gate_policy` |

数字人会签必须写入 `docs/templates/approval-record-template.yaml` 形状的 `evidence.approval-record`：`actor_kind`、`role_id`、起草者角色、证据引用。实现者角色不得出现在会签人里。生物人可否决产品经理对 `gate.user-confirmation` 的会签。`gate.release-ready`、对外商务合同和 Grok 外部副作用仍须生物人。

主控不批准合同为 `ready-for-agent`、不宣布可发布。Slice 合同仍按生命周期公式由编排器批。

## 任务包最低字段

在 `docs/templates/subagent-task-package-template.md` 上额外填写：数字人角色 ID、执行态、允许写路径、禁止 skill、会签是否需要其他数字人、验证命令。
