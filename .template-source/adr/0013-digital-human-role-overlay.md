# ADR-0013：数字人角色叠加在生命周期编排器上，并允许分级会签

- 状态：accepted
- 日期：2026-08-26
- 范围：`template-source` 的流程词汇、Agent 入口指针、数字人角色注册表与校验；不修改门禁稳定 ID，也不新增 `grok` skill 运行时 root。运行时可移植性见 ADR-0014。

## 背景

YSS 生命周期已有三套易被叫做「角色」的轴：Ticket 五态、职能 Agent（Discovery / Spec / Code / Review）、Subagent 执行态（Explorer / Worker / Reviewer）。产品要在 Grok Bot 上构建前端工程师、后端工程师、测试工程师、产品经理、项目经理、需求经理、商务等持久数字队友并协同。若把职称做成第二套编排器，或让同一 Bot 既实现又关闭门禁，会打穿「单一编排器」和「实现者不能自审」。Grok 平台另有 Allow once 审批，且群聊限 2–6 人、全部 Bot 共享一台云计算机。

## 决策

1. 数字人角色是叠加在 `yss-product-lifecycle` 上的配置透镜，不是独立生命周期。职称 Bot 不批准 Slice 合同、不设置 `ready-for-agent`、不宣布可发布。
2. 权威配置是 `docs/agents/digital-human-roles.yaml`。运行时实例（含 Grok Bot）绑定该配置；git 资产仍是 SSOT。平台差异见 ADR-0014。
3. 人默认只唤起主控数字人。主控 1:1 派一个 owner；可见会签使用逻辑阶段协作组。Grok 群聊 2–6 人的限制只约束 `runtime.grok`，见 ADR-0014。
4. 项目经理与主控在配置上分体，默认兼任，直到 `dual_hat_split_when`（`cross-repo-load` 或 `responsibility-conflict`）需要独立项目经理实例。
5. 会签分三级：运行时副作用审批与 `gate.release-ready`、对外商务承诺仍须生物人；审查类门禁可由指定数字人关闭；Spec 基线与 OpenAPI Freeze 须双数字人会签；`gate.user-confirmation` 可由产品经理数字人会签，生物人可一票否决。实现者数字人不得会签自己起草的资产。
6. 模板发布单例 profile；`project-instance` 通过 duplicate 绑定仓库路径。禁止按功能再拆 Bot。
7. 当前不增加 `agent_runtime_roots.grok`。Skill 仍以 `.agents/skills` 为权威，在 Grok 侧按 Bot 启用 `core_skills`。

## 取舍与影响

- 数字人会签让协同少等人点门禁，但把「人工门禁」从「必须是生物人」改成「按注册表指定的会签人」。发布与外部副作用仍留在生物人，避免账号级 Always Allow 被理解成可发布。
- 共享计算机迫使写范围靠任务包而不是平台隔离；这比「一角色一沙箱」弱，但与 Grok 官方边界一致。
- 不把职称写进生命周期注册表 ID 空间，避免和 `stage|gate|artifact|work-unit|evidence` 混用。
- 会签桶内门禁标为 `approved` 时，checkpoint 的 `approval_ref` 必须可读且通过 `scripts/verify-approval-record`。编排器不改 Ticket 五态公式，但错误会签不得把该门禁标为 `approved`。

## 验证

- `scripts/verify-digital-human-roles`
- `scripts/verify-digital-human-roles-scenarios`
- `scripts/verify-approval-record`
- `scripts/sync-skills --check`（若改了主控 skill）
- `scripts/verify-template`（纳入上述脚本后）
