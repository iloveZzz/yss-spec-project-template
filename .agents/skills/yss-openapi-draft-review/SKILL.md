---
name: yss-openapi-draft-review
description: Use when reviewing a `docs/.scratch/<feature>/api/` OpenAPI Draft before Engineering Baseline, YSS DDD Review, architecture/Spec Delta design, OpenAPI Freeze, vertical slicing, frontend/backend implementation, or when checking P0 requirement coverage, page action to endpoint mapping, YSS response wrappers, errors, pagination, optimistic locking, and contract test seams.
---

# YSS OpenAPI Draft Review

Use this skill after OpenAPI Draft creation and before Engineering Baseline / YSS DDD Review. It is a fail-closed contract review skill for design-time OpenAPI files under `docs/.scratch/<feature>/api/`; it does not bundle JSON or generate Orval clients.

## Required Inputs

- OpenAPI Draft under `docs/.scratch/<feature>/api/<feature>.yaml`，作为唯一权威的单一 OAS 3.1 YAML document；生命周期元数据和 Freeze 决策位于相邻 Markdown 记录。
- Calibrated Spec.
- Interaction spec / prototype review when UI exists.
- YSS engineering baseline rules, especially `SingleResult<T>`, `MultiResult<T>`, and `PageResult<T>`.

## Review Flow

1. Consume fresh automated evidence for YAML parsing, single-document OAS 3.1 shape, `$ref`, path parameters, and lint. Generate it once with the Draft or when the Draft changes; do not manually repeat unchanged structural checks.
2. Build a P0 traceability matrix from Spec functional requirements and interaction actions to OpenAPI paths, schemas, errors, and contract tests. Each UI action must map to a stable `operationId` and `x-yss-action-key` or an equivalent traceability entry.
3. Check page action coverage: every action has `actionKey`, endpoint or explicit non-goal, state transition, idempotency/concurrency rule, and error codes. When the Spec explicitly changes authentication or authorization behavior, trace that behavior through the same matrix.
4. Check object lifecycle coverage: manage/maintain/configure/create/update/archive/retry/cancel/publish/export/create-draft semantics have endpoints or explicit scope downgrades.
5. Check YSS API baseline: REST shape, `SingleResult<T>` for single objects, `MultiResult<T>` for non-page lists, `PageResult<T>` for pagination, and stable DTO/schema names.
6. Check error contracts: field-level errors, model-level errors, disabled reasons, gate failures, and conflict responses. When the Spec explicitly changes authentication or authorization behavior, include its `401` / `403` and resource-filtering semantics here.
7. Output a persistent review artifact under `docs/.scratch/<feature>/architecture/` or update the existing one.

## Automation Boundary

- Automated checks own YAML single-document syntax, `$ref` resolution, path-parameter consistency, OpenAPI lint, and stable machine-checkable style rules.
- Human or independent semantic review owns P0 traceability, page-action coverage, error behavior, concurrency/idempotency, scope downgrades, contract-test seams, and any explicitly specified authentication or authorization behavior.
- Fresh passing automation evidence may be referenced by the semantic review; copying the same findings into a second checklist is unnecessary.
- Re-run structural automation only when the Draft, ruleset, or referenced schema changes.

## Blocking Rules

Block if any of these are true:

- A P0 requirement has no endpoint, schema, error contract, or explicit non-goal.
- A UI action has no endpoint/non-goal mapping.
- A configurable rule or gate lacks a source, owner, fixed/default decision, or API representation.
- Pagination does not align with YSS `PageResult<T>` or documented exception.
- Draft has no contract test seam for import, mapping coverage, validation, review, publish, export, and optimistic locking.
- YAML contains lifecycle frontmatter / root metadata, or the proposed JSON client input is not explicitly deferred until Freeze and governance export.

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

### Contract Test Checklist
- <minimum contract tests before OpenAPI Freeze>

### Next Action
- <return to OpenAPI Draft / enter Engineering Baseline / architecture design / request YAML-to-JSON export after Freeze>
```

Prefer `docs/api/templates/openapi-draft-review-checklist.md` when a tabular checklist is useful.
