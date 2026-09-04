---
name: prototype-review
description: Use when independently reviewing low-fidelity UI, interaction specs, or state matrices before choosing an H1/H2 prototype profile, calibrating Spec/OpenAPI, slicing, or implementation.
---

# Prototype Review

Use this skill as the independent low-fidelity review in `yss-prototype-stage`. The review is fail-closed: if the design cannot drive calibrated requirements, API, frontend acceptance, and slices, send it back to product design. `yss-product-lifecycle` alone records the resulting `gate.prototype-reviewed` decision.

## Trigger Boundary

Run this independent gate only when UI changes affect a primary user flow, navigation, permissions, exception/recovery states, state transitions, or OpenAPI implications. For copy edits, token/color/spacing adjustments, and isolated visual fixes with no behavior, state, permission, navigation, or API impact, record `not-applicable` with the impact assessment; do not create prototype-review artifacts.

## Required Inputs

- Spec baseline or confirmed user stories.
- `docs/.scratch/<feature>/design/<feature>-interaction-spec.md` or prototype link.
- State matrix, preferably based on `docs/design/templates/state-matrix-template.md`.
- Existing OpenAPI Draft only if the review is checking alignment; do not require OpenAPI before product design.
- `docs/.scratch/<feature>/verification/prototype-evidence.yaml` may be created as a pending schema v3 record, but档位构建与浏览器验证属于后续 `gate.prototype-verified`。

## Review Gates

| Gate | Pass condition |
|---|---|
| Page coverage | All primary pages, entry points, and navigation exits are named |
| Flow coverage | Main path, cancel/back, failure, retry, and completion paths are explicit |
| State coverage | loading, empty, error, readonly, disabled, no-permission, conflict, and dirty-form states are addressed or explicitly not applicable |
| State transition coverage | 每个状态列出进入事件、允许转换、guard、动作和退出路径；不存在只能进入不能退出的状态 |
| Permission coverage | Hidden vs disabled vs rejected actions are clear |
| Data coverage | Visible fields, filters, sort, pagination, forms, tables, drawers, modals, and audit/version data are listed |
| API implication | Request/response fields, error structure, pagination/filtering, permissions, and concurrency implications can be drafted |
| Action contract coverage | Every primary page action has an `actionKey`, endpoint or explicit non-goal, permission behavior, state transition, idempotency/concurrency rule, and error codes |
| P0 contract coverage | Every P0 requirement with manage/maintain/configure/create/update/archive/retry/cancel/publish/export/create-draft semantics is mapped to an API implication or an explicit non-goal |
| Rule/source coverage | Validation, approval, coverage, and publish gates state where rules come from, who can configure them, whether they are fixed, and how blocker/warning decisions are represented |
| Frontend acceptance | A frontend engineer can tell which components, visible states, data dependencies, and E2E paths are needed |

## Decision Rules

- If a feature has UI impact and lacks page map, user flow, prototype/wireframe, or state matrix, block prototype profile selection, Spec calibration, and OpenAPI Draft.
- If the prototype hides business rules behind generic text such as "校验失败", require field-level errors and recovery behavior.
- If a page shows a user action but the OpenAPI implication list lacks endpoint/non-goal mapping, block prototype profile selection, Spec calibration, or OpenAPI Draft.
- If Spec P0 scope says a user can manage or configure an object but the design only shows read-only data, block until the write path or scope downgrade is explicit.
- If a state is intentionally out of scope, record why and who owns the decision.
- If implementation dependencies are unclear, route to `yss-implementation-contract-compiler` only after the prototype passes this review.

## Output Contract

```markdown
### Review Result
<Approved / Blocked>

### Blocking Findings
- <missing asset or decision>

### Non-Blocking Suggestions
- <improvement that can wait>

### OpenAPI Draft Readiness
- <paths, fields, errors, permissions, pagination/YSS wrappers, action mappings, rule sources, concurrency notes>

### Spec Calibration Readiness
- <requirements gaps, acceptance criteria updates, non-goals, pending decisions>

### Frontend Prototype Readiness
- <component states, data dependencies, profile triggers, frontend acceptance notes>

### Lifecycle Evidence
- <persistent review path; blockers; `gate.prototype-reviewed` candidate result>

### Next Action
- <yss-prototype-stage / return to product design>
```

Use `docs/design/templates/prototype-review-checklist.md` when writing a persistent review artifact.
