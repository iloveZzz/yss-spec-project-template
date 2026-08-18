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
- YSS engineering baseline rules and `.agents/skills/yss-dto/references/openapi-wire-profile.yaml`；先运行 `scripts/verify-yss-dto-openapi-profile`。
- 若 Draft 包含 computed getter（例如 `totalPages`），必须提供目标 HTTP mapper identity、代表性序列化 fixture 和 contract-test / 等价 HTTP evidence。

## Review Flow

1. Consume fresh automated evidence for YAML parsing, single-document OAS 3.1 shape, `$ref`, path parameters, and lint. Generate it once with the Draft or when the Draft changes; do not manually repeat unchanged structural checks.
2. Build a P0 traceability matrix from Spec functional requirements and interaction actions to OpenAPI paths, schemas, errors, and contract tests. Each UI action must map to a stable `operationId` and `x-yss-action-key` or an equivalent traceability entry.
3. Check page action coverage: every action has `actionKey`, endpoint or explicit non-goal, state transition, idempotency/concurrency rule, and error codes. When the Spec explicitly changes authentication or authorization behavior, trace that behavior through the same matrix.
4. Check object lifecycle coverage: manage/maintain/configure/create/update/archive/retry/cancel/publish/export/create-draft semantics have endpoints or explicit scope downgrades.
5. Check YSS API baseline: REST shape, `x-yss-response-wrapper` values `SingleResult|MultiResult|PageResult`, `YssResultMeta` plus `allOf` concrete schemas, and stable DTO/schema names. The Java generic notation is a review shorthand only; it must not appear as an OpenAPI type or `$ref`.
6. Check DTO wire shape against the profile: `success` is boolean, `dataType` is `string|null`, `code` is only `string|integer|null`, list/page `data` is an array, and single `data` points to the endpoint schema with explicit nullability. Check response/request direction separately.
7. Check pagination input: only `pageIndex/pageSize/orderBy/orderDirection/groupBy` are client fields; `orderDirection` is `ASC|DESC`; `orderBy` / `groupBy` use endpoint whitelists; `offset`, `needTotalCount`, and `tempTotalCount` are negative assertions. `totalPages` is mapper-dependent and cannot enter a shared schema without fresh wire evidence.
8. Check error contracts: field-level errors, model-level errors, disabled reasons, gate failures, and conflict responses. When the Spec explicitly changes authentication or authorization behavior, include its `401` / `403` and resource-filtering semantics here.
9. Output a persistent review artifact under `docs/.scratch/<feature>/architecture/` or update the existing one.

## Automation Boundary

- Automated checks own YAML single-document syntax, `$ref` resolution, path-parameter consistency, OpenAPI lint, and stable machine-checkable style rules.
- `scripts/verify-yss-dto-openapi-profile` owns the reusable DTO mapping invariants; the review still checks each endpoint's concrete schema, wrapper extension and evidence.
- Human or independent semantic review owns P0 traceability, page-action coverage, error behavior, concurrency/idempotency, scope downgrades, contract-test seams, and any explicitly specified authentication or authorization behavior.
- Fresh passing automation evidence may be referenced by the semantic review; copying the same findings into a second checklist is unnecessary.
- Re-run structural automation only when the Draft, ruleset, or referenced schema changes.

## Blocking Rules

Block if any of these are true:

- A P0 requirement has no endpoint, schema, error contract, or explicit non-goal.
- A UI action has no endpoint/non-goal mapping.
- A configurable rule or gate lacks a source, owner, fixed/default decision, or API representation.
- Pagination does not align with the `PageResult` profile or documented exception, or exposes `offset` / `needTotalCount` / `tempTotalCount` as client input.
- A response omits `x-yss-response-wrapper`, uses the compatibility `com.yss.cloud.dto.response` package for a new contract, writes Java generic notation as an OAS schema, or fails `YssResultMeta` + `allOf` + concrete `data` mapping.
- `code` is modeled as arbitrary object, `dataType` loses explicit nullability, or computed fields such as `totalPages` lack target wire evidence.
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
- <`x-yss-response-wrapper` map and `YssResultMeta` / `allOf` conformance>
- <profile version, concrete `data` schemas, nullability, request/response direction and computed-field evidence>
- <DDD boundary implications, implementation feasibility>

### Contract Test Checklist
- <wrapper meta fields: success/code/message/tips/dataType, including code string/integer/null cases>
- <single object, non-page list empty array, page empty array and page boundary cases>
- <PageQuery allowed fields, ASC/DESC and endpoint whitelist; negative assertions for offset/needTotalCount/tempTotalCount>
- <target HTTP mapper identity and computed-field fixture, if totalPages or another getter is included>
- <minimum contract tests before OpenAPI Freeze>

### Next Action
- <return to OpenAPI Draft / enter Engineering Baseline / architecture design / request YAML-to-JSON export after Freeze>
```

Prefer `docs/api/templates/openapi-draft-review-checklist.md` when a tabular checklist is useful.
