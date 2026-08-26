# ADR-0014：数字人角色与运行时绑定分离

- 状态：accepted
- 日期：2026-08-26
- 范围：修订 ADR-0013 中把 Grok Bot 写成唯一运行时的部分；叠加、会签分级和「不新增 grok skill root」仍然有效

## 背景

模板已有 Claude / Codex / Cursor / Hermes / Pi / Qoder / Trae 七个技能投影根。数字人角色第一版把 Grok 的群聊人数、共享计算机、Allow once 和 `grok_*` 字段写进角色事实源。非 Grok 平台无法消费，也会让新平台复制出第二套职称表。

## 决策

1. `docs/agents/digital-human-roles.yaml` 的 `roles` / `orchestrator` / `stage_groups` / `gate_policy` 保持运行时无关。
2. 平台差异只进 `runtimes`。v1 必含 `runtime.generic`、`runtime.skill-projection`（覆盖技能注册表全部投影根）、`runtime.grok`（适配器，不新增 `agent_runtime_roots.grok`）。
3. 逻辑协作组可以大于某平台群聊上限；该平台用 `overflow`（Grok 为 `one-to-one-handoff`），不改角色清单。
4. 「运行时副作用审批」替代「Grok 平台审批」：任何平台上的对外消息、改生产、付款仍须生物人。
5. 写隔离的权威规则是任务包。共享工作区不是安全边界只作为 Grok 适配器声明，不是所有运行时的默认事实。
6. 角色字段使用 `title` / `description` / `default_dual_hat`。残留 `grok_*` 为校验失败。

## 取舍与影响

- 多一份运行时表，但避免为每个客户端重写七个职称。
- Grok 研究笔记仍有效，只降级为 `runtime.grok` 的证据，不再定义角色本身。
- 新平台（含未来官方 grok skill root）只加绑定，不改会签矩阵。
