# 正式独立审查请求：数字人角色叠加、会签人映射与核验缝

> 日期：2026-08-26
>
> 强度：L3（`permission-boundary` + `aggregate-behavior-change`）
>
> 实施者不得自审。本文件只提出审查请求，不填写 `formal-independent-review: pass`。

## 变更摘要

把七个数字人角色和主控写成 `docs/agents/digital-human-roles.yaml`，把单审门禁从字符串名单改成「门禁 × 会签角色」，并增加会签记录 / checkpoint `approval_ref` 核验：

- 编排器仍拥有 Ticket 状态、Slice 合同和 `ready-for-agent`
- 角色表运行时无关；Grok 只作为 `runtime.grok` 适配器
- `digital_human_review` / `dual_digital_human` 带 `drafter` 与 `countersigners`
- `gate.release-ready`、`gate.design-reviewed`、`gate.architecture-reviewed`、对外商务承诺、运行时外部副作用仍须生物人
- 起草者不得会签自己的草稿
- 会签桶内门禁标 `approved` 必须有可读 `approval_ref` 且通过 `scripts/verify-approval-record`
- 不新增 `grok` skill runtime root，不改门禁稳定 ID，不重命名 `paused-human-gate`

## 请审查者核验

1. 会签人映射是否与 ADR-0013 及 YAML `gate_policy` 一致，且没有把发布权交给数字人。
2. AGENTS.md 指针是否过载或与 YAML 重复定义。
3. 校验器是否真能挡住：>6 人群、未知技能、启用/禁止重叠、起草者自签、数字人关发布门禁、单审门禁缺 `countersigners`、错误角色会签、approved 会签门禁缺 `approval_ref`。
4. 主控 / Router skill 投影是否与 `.agents/skills` 一致；任务包是否强制复制 `core_skills`。
5. `paused-human-gate` 语义是否只被解释为等待指定会签人，而不是必须生物人。

## 本轮已有证据（实施者）

- `scripts/verify-digital-human-roles`
- `scripts/verify-digital-human-roles-scenarios`
- `scripts/verify-approval-record docs/templates/approval-record-template.yaml`
- `scripts/verify-lifecycle-checkpoint docs/process/templates/lifecycle-checkpoint-template.yaml`
- `.template-source/tooling/node/test/digital-human-roles.test.mjs`
- 一手研究：`.template-source/evidence/maintenance/research-grok-bot-role-collaboration-2026-08-26.md`
