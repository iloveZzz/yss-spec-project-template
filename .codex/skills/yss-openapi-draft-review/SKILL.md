---
name: yss-openapi-draft-review
description: "Use when reviewing a docs/api/specs OpenAPI Draft before Engineering Baseline, YSS DDD Review, architecture/Spec Delta design, OpenAPI Freeze, vertical slicing, frontend/backend implementation, or when checking P0 requirement coverage, page action to endpoint mapping, YSS response wrappers, errors, permissions, pagination, optimistic locking, security red lines, and contract test seams."
---

# YSS OpenAPI Draft Review

Use this skill after OpenAPI Draft creation and before Engineering Baseline / YSS DDD Review. It is a fail-closed contract review skill for design-time OpenAPI files under `docs/api/specs/`; it is not the smart-doc / Orval generation workflow.

## Required Inputs

- OpenAPI Draft under `docs/api/specs/*.yaml`.
- Calibrated Spec.
- Interaction spec / prototype review when UI exists.
- YSS engineering baseline rules, especially `SingleResult<T>`, `MultiResult<T>`, and `PageResult<T>`.

## Review Flow

1. Parse the OpenAPI file and verify YAML, `$ref`, path parameters, and lint when tooling is available.
2. Build a P0 traceability matrix from Spec functional requirements and interaction actions to OpenAPI paths, schemas, errors, and contract tests.
3. Check page action coverage: every action has `actionKey`, endpoint or explicit non-goal, permission behavior, state transition, idempotency/concurrency rule, and error codes.
4. Check object lifecycle coverage: manage/maintain/configure/create/update/archive/retry/cancel/publish/export/create-draft semantics have endpoints or explicit scope downgrades.
5. Check YSS API baseline: REST shape, `SingleResult<T>` for single objects, `MultiResult<T>` for non-page lists, `PageResult<T>` for pagination, and stable DTO/schema names.
6. Check error and permission contracts: field-level errors, model-level errors, 403 no-data leakage, disabled reasons, gate failures, and conflict responses.
7. Check security red lines: authentication/authorization, SQL/DDL draft boundaries, downloads, audit/logging, sensitive field handling, and human-review items.
8. Output a persistent review artifact under `docs/architecture/` or update the existing one.

## Blocking Rules

Block if any of these are true:

- A P0 requirement has no endpoint, schema, error contract, or explicit non-goal.
- A UI action has no endpoint/non-goal mapping.
- A configurable rule or gate lacks a source, owner, fixed/default decision, or API representation.
- Pagination does not align with YSS `PageResult<T>` or documented exception.
- Draft has no contract test seam for import, mapping coverage, validation, review, publish, export, permission, and optimistic locking.
- Security red lines are unmarked or the Draft exposes execution endpoints for SQL/DDL migration.

## Output Contract

```markdown
### Review Result
<Approved / Blocked>

### Blocking Findings
- <file:line grounded finding>

### Non-Blocking Suggestions
- <can wait until architecture/design>

### Contract Coverage
- <P0 requirement -> endpoint/schema/error/test mapping summary>

### YSS Baseline
- <response wrappers, DDD boundary implications, implementation feasibility>

### Security Review
- <red lines and human-review items>

### Contract Test Checklist
- <minimum contract tests before OpenAPI Freeze>

### Next Action
- <return to OpenAPI Draft / enter Engineering Baseline / architecture design>
```

Prefer `docs/api/templates/openapi-draft-review-checklist.md` when a tabular checklist is useful.
