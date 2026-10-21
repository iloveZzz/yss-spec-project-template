---
name: to-spec
description: 显式将已确认讨论综合为 Spec 草稿；经主控预检后按配置持久化并回交验收。
disable-model-invocation: true
---

This explicit compatibility entry synthesizes confirmed context into a Spec draft. Before formal writes, the active lifecycle orchestrator checks repository identity, Plan → Spec entry evidence, allowed paths and current decisions. Template-source maintenance creates no product Spec. Reuse confirmed inputs and seams; ask only for a material missing decision. Return the draft to the orchestrator for validation and acceptance without approving it.

If the issue tracker or triage label vocabulary is missing, tell the user to run `/setup-matt-pocock-skills`; do not invoke another user-invoked skill yourself.

## 起草过程

1. 消费根 `CONTEXT.md`、已确认 Plan、当前决定和相关 ADR；复用已确认测试 seam，只对新增或实质变化的决定补充澄清。
2. 使用仓库权威 `.template-spec/templates/spec-template.md`，与常规生命周期入口共享结构；按 `.template-spec/process/document-writing.md` 写作。故事数量由范围决定。FR/NFR/AC、来源、验收和未决项采用 `.template-spec/process/plan-spec-quality.md` 的表达约定。
3. Spec 描述可观察行为、边界、例外和非目标。实现决策仅引用已确认上游约束；技术架构、OpenAPI Freeze 和实现任务交由既有下游阶段，不在本入口提前决定。
4. 同时按 `.template-spec/process/business-tickets.md` 起草业务 Ticket 和 FR/AC 覆盖集合；每票放入 `business-tickets/`，Spec 只引用集合路径。复用已有稳定 ID，不等待工程、OpenAPI 或技术设计。草案未决项保留责任人和解决时点，运行 `scripts/verify-business-tickets <集合> --mode draft` 后一并回交验收。
5. 将草稿按主控允许路径持久化；主 tracker 按项目配置使用，不从 Git remote 猜测。平台不可用时保留待发布草稿。Spec 使用 `ready-for-human`，起草者不批准、不设置 `ready-for-agent`。Design 校准同一组业务票，下游实现 Slice 仍放入 `issues/` 并保留工程和批准门禁。
6. 可按需运行只读 `scripts/inspect-plan-spec check --root . --spec <Spec路径>` 辅助审阅；发现和未评估项不能转换为流转许可，原有 Context、决定和批准验证照常执行。

## 来源与适配

保留 mattpocock 上游来源与锁定记录。YSS 适配仅统一权威模板、生命周期边界和本地持久化方式；不维护另一份内嵌模板。
