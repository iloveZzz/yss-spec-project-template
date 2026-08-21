# YSS 生命周期编排器精简与门禁强化审查记录

## 决策范围

- 生命周期作为唯一默认入口，Matt user-invoked skills 作为兼容输入。
- 保留现有主阶段；机会调研、需求分析、原型、技术分析、实现、TDD、Review、发布均登记为工作单元或条件门禁。
- 完成公式为产物内容完整、上游未 stale、命中门禁通过且证据可读。
- UI 影响切片增加前端实现还原计划、独立 UI fidelity Review 和发布阻断。

## 模板维护强度

```yaml
schema_version: 1
intensity: L3
classification_reason: 改变生命周期门禁、Ticket 就绪公式、正式资产所有权和发布语义。
triggers: [lifecycle-gate, ticket-state, release-semantics, aggregate-behavior-change]
changed_assets:
  - .agents/skills/yss-product-lifecycle/
  - docs/process/lifecycle-registry.yaml
  - docs/process/schemas/
  - docs/process/templates/
  - scripts/lib/lifecycle-registry.mjs
  - scripts/lib/scenario-checks.mjs
verification_evidence:
  - kind: red
    command: 独立审查发现 native/reference 同 ID 冲突、发布绕过 UI 门禁、占位计划可放行和 Discovery 重复路由。
    result: pass
  - kind: pressure-scenario
    command: 正式模式校验拒绝 template=true 的前端实现计划。
    result: pass
  - kind: green
    command: scripts/verify-template
    result: pass
  - kind: formal-independent-review
    command: lifecycle_independent_review 首轮审查；P1/P2 已修订，等待修订候选复核。
    result: pending
review_mode: formal-independent
escalation: none
```

## 审查结论

首轮独立审查结论为 changes requested。修订已分离原生执行与 Matt 兼容输入、将前端还原门禁接入发布公式、增加前端证据 schema/validator，并合并重复 Discovery 工作单元。修订候选必须再次通过独立审查后才能声明可合并或可发布。
