# 正式独立审查请求：数字人角色叠加与分级会签

> 日期：2026-08-26
>
> 强度：L3（`permission-boundary` + `aggregate-behavior-change`）
>
> 实施者不得自审。本文件只提出审查请求，不填写 `formal-independent-review: pass`。

## 变更摘要

把七个数字人角色和主控写成 `docs/agents/digital-human-roles.yaml`，允许指定数字人关闭部分生命周期门禁，同时保持：

- 编排器仍拥有 Ticket 状态、Slice 合同和 `ready-for-agent`
- 角色表运行时无关；Grok 只作为 `runtime.grok` 适配器
- `gate.release-ready`、对外商务承诺、运行时外部副作用仍须生物人
- 实现者不得会签自己的草稿
- 不新增 `grok` skill runtime root，不改门禁稳定 ID

## 请审查者核验

1. 会签策略是否与 ADR-0013 及 YAML `gate_policy` 一致，且没有把发布权交给数字人。
2. AGENTS.md 指针是否过载或与 YAML 重复定义。
3. 校验器是否真能挡住：>6 人群、未知技能、启用/禁止重叠、起草者自签、数字人关发布门禁。
4. 主控 skill 投影是否与 `.agents/skills/yss-product-lifecycle` 一致。

## 本轮已有证据（实施者）

- `scripts/verify-digital-human-roles`
- `scripts/verify-digital-human-roles-scenarios`
- `.template-source/tooling/node/test/digital-human-roles.test.mjs`
- 一手研究：`.template-source/evidence/maintenance/research-grok-bot-role-collaboration-2026-08-26.md`
