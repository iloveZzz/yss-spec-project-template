# <Feature Name> Prototype Review Checklist

> Use with `prototype-review`. Result is fail-closed: blocking findings return to product design before PRD calibration or OpenAPI Draft.

## Review Inputs

| Input | Path / Link | Present |
|---|---|---|
| PRD | `docs/requirements/<feature>-prd.md` |  |
| Interaction spec | `docs/design/<feature>-interaction-spec.md` |  |
| Prototype / wireframe | `<link or exported image path>` |  |
| State matrix | `docs/design/<feature>-state-matrix.md` |  |
| Existing API draft | `docs/api/specs/<feature>.yaml` | Optional |

## Gate Checklist

| Gate | Pass? | Findings |
|---|---|---|
| Page map covers all entry points, exits, and primary pages |  |  |
| Main flow is clear from start to completion |  |  |
| Exception flows cover cancel, retry, validation failure, permission failure, and conflict |  |  |
| State matrix covers loading, empty, error, no-permission, readonly, disabled, conflict, and dirty form |  |  |
| Visible fields, filters, sort, pagination, forms, drawers, modals, and actions are listed |  |  |
| Permission behavior distinguishes hidden, disabled, and rejected actions |  |  |
| Validation errors identify model-level and field-level placement |  |  |
| OpenAPI Draft can be derived from UI needs |  |  |
| Frontend acceptance and optional story/mock needs are clear |  |  |
| Security red lines are marked for human review |  |  |

## PRD Calibration Readiness

| Area | Ready? | Notes |
|---|---|---|
| New acceptance criteria from prototype |  |  |
| Requirement gaps discovered by flow/state design |  |  |
| Non-goals proven by prototype scope |  |  |
| Pending decisions excluded from freeze |  |  |
| Design links added to PRD |  |  |

## OpenAPI Draft Readiness

| Area | Ready? | Notes |
|---|---|---|
| Paths / operations |  |  |
| Request fields |  |  |
| Response fields |  |  |
| Pagination / filters / sorting |  |  |
| Error envelope |  |  |
| Field-level validation errors |  |  |
| Permission/capability flags |  |  |
| Conflict/version token |  |  |

## Review Result

```text
Result: Approved / Blocked
Blocking findings:
- 
Non-blocking suggestions:
- 
Next action:
- PRD calibration / OpenAPI Draft / return to product-design-prototype / component-story-prototype / mock-api-prototype
```
