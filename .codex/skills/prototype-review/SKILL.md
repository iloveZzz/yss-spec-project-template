---
name: prototype-review
description: Use when reviewing UI design, wireframes, prototype links, interaction specs, or state matrices before PRD calibration, OpenAPI Draft, vertical slicing, or implementation.
---

# Prototype Review

Use this skill as the gate between product design/prototype work and PRD calibration / OpenAPI Draft. The review is fail-closed: if the design cannot drive calibrated requirements, API, frontend acceptance, and slices, send it back to product design.

## Required Inputs

- PRD baseline or confirmed user stories.
- `docs/design/<feature>-interaction-spec.md` or prototype link.
- State matrix, preferably based on `docs/design/templates/state-matrix-template.md`.
- Existing OpenAPI Draft only if the review is checking alignment; do not require OpenAPI before product design.

## Review Gates

| Gate | Pass condition |
|---|---|
| Page coverage | All primary pages, entry points, and navigation exits are named |
| Flow coverage | Main path, cancel/back, failure, retry, and completion paths are explicit |
| State coverage | loading, empty, error, readonly, disabled, no-permission, conflict, and dirty-form states are addressed or explicitly not applicable |
| Permission coverage | Hidden vs disabled vs rejected actions are clear |
| Data coverage | Visible fields, filters, sort, pagination, forms, tables, drawers, modals, and audit/version data are listed |
| API implication | Request/response fields, error structure, pagination/filtering, permissions, and concurrency implications can be drafted |
| Frontend acceptance | A frontend engineer can tell which components, stories, mock data, and E2E paths are needed |

## Decision Rules

- If a feature has UI impact and lacks page map, user flow, prototype/wireframe, or state matrix, block PRD calibration and OpenAPI Draft.
- If the prototype hides business rules behind generic text such as "校验失败", require field-level errors and recovery behavior.
- If a state is intentionally out of scope, record why and who owns the decision.
- If implementation dependencies are unclear, route to `yss-router` only after the prototype passes this review.

## Output Contract

```markdown
### Review Result
<Approved / Blocked>

### Blocking Findings
- <missing asset or decision>

### Non-Blocking Suggestions
- <improvement that can wait>

### OpenAPI Draft Readiness
- <paths, fields, errors, permissions, pagination/concurrency notes>

### PRD Calibration Readiness
- <requirements gaps, acceptance criteria updates, non-goals, pending decisions>

### Frontend Prototype Readiness
- <storybook/histoire stories, mock data, component states>

### Next Action
- <PRD calibration / OpenAPI Draft / return to product-design-prototype / component-story-prototype / mock-api-prototype>
```

Use `docs/design/templates/prototype-review-checklist.md` when writing a persistent review artifact.
