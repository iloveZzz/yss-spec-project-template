---
name: yss-openapi-governance
description: Govern and lint YSS OpenAPI design-time contracts with Spectral or Redocly CLI before OpenAPI Freeze. Use when creating or maintaining organization-level OpenAPI style rules, validating docs/api/specs/*.yaml, defining API naming/error/pagination/permission conventions, adding contract-test checklist rules, or checking generated smart-doc output against YSS API governance. Do not use for smart-doc or Orval generation; use yss-openapi for that implementation workflow.
---

# YSS OpenAPI Governance

Use this skill to make OpenAPI contracts consistent, lintable, and reviewable before implementation. This is the ruleset and governance layer for `docs/api/specs/*.yaml`; it is not the smart-doc / Orval generation workflow.

## Boundary

Use `yss-openapi-governance` for:

- Defining or applying reusable OpenAPI style rules.
- Running Spectral or Redocly CLI against `docs/api/specs/*.yaml`.
- Checking YSS response wrappers, error contracts, pagination, permissions, security red lines, and contract-test seams.
- Comparing generated `openapi.json` against frozen design rules when backend code is already implemented.
- Writing or updating governance notes under `docs/api/`, `docs/architecture/`, or the active Spec Delta design.

Use other skills for:

- `yss-openapi`: generate `target/openapi/openapi.json` from implemented controllers/DTOs and refresh Orval clients.
- `yss-openapi-draft-review`: perform fail-closed semantic review against PRD, prototype, page actions, P0 coverage, and architecture readiness.
- `docs/specs/*-spec-delta.md` and `to-issues`: formalize behavior changes and implementation tasks after the contract is frozen.

## Preferred Tooling

Prefer Spectral when the repo needs a portable, custom OpenAPI ruleset:

```bash
npx --yes @stoplight/spectral-cli lint -r .spectral.yaml docs/api/specs/*.yaml
```

Prefer Redocly CLI when the repo already uses Redocly for lint, bundle, docs, or CI:

```bash
npx --yes @redocly/cli lint docs/api/specs/*.yaml
```

If neither tool is configured, do not invent project policy silently. Create or propose a minimal config and mark it as draft until reviewed. Use Spectral as the default baseline for custom YSS rules because its YAML rulesets are easy to version and extend.

## Governance Flow

1. Locate contract inputs.
   - Check `docs/api/specs/*.yaml` first.
   - If only generated contracts exist, inspect `*/target/openapi/openapi.json` or frontend `openapi/openapi.json` as implemented evidence, not as design authority.
   - Confirm whether the task is pre-freeze design governance or post-implementation conformance checking.

2. Detect existing lint configuration.
   - Look for `.spectral.yaml`, `.spectral.yml`, `redocly.yaml`, `redocly.yml`, `package.json` scripts, or CI jobs.
   - Reuse the existing toolchain and scripts when present.
   - If both Spectral and Redocly exist, run the repo's documented CI path first, then targeted local lint.

3. Validate baseline OpenAPI correctness.
   - Parse YAML/JSON successfully.
   - Check OpenAPI version, `$ref` resolution, duplicate `operationId`, path parameter coverage, unused schemas, and invalid examples.
   - Bundle or dereference only when needed for tooling; keep source files maintainable.

4. Apply YSS API governance rules.
   - Paths are versioned under `/api/v1/` unless a documented exception exists.
   - Operations use stable `operationId` values suitable for Orval/client generation.
   - Single-object responses use `SingleResult<T>`.
   - Non-page list responses use `MultiResult<T>`.
   - Page responses use `PageResult<T>` and expose the project's standard page request/response fields.
   - Error responses include a consistent envelope, machine-readable code, human-readable message, and field/model-level validation shape where applicable.
   - Permission failures avoid data leakage; 403/disabled-action behavior is explicit.
   - Mutating operations define idempotency, optimistic locking, or conflict semantics when repeated submission or concurrent edits are possible.
   - Download, upload, export, import, audit, sensitive data, SQL, DDL, authentication, authorization, and encryption surfaces are marked for human/security review when they touch AGENTS.md safety red lines.
   - Contract-test seams are named for each P0 workflow and critical error path.

5. Produce governance output.
   - For quick checks, report lint command, pass/fail result, and blocking findings with file paths.
   - For durable decisions, write or update a Chinese governance artifact under `docs/api/` or `docs/architecture/`.
   - For active Spec Delta work, reference the active change and keep rules aligned with the related design, task, and spec artifacts.

## Minimal Spectral Baseline

When the repo lacks a ruleset and the user asks to add one, start with a small `.spectral.yaml` that extends the OpenAPI baseline and encodes only stable YSS rules. Keep controversial product semantics in review checklists until the team agrees.

```yaml
extends:
  - spectral:oas

rules:
  yss-paths-versioned:
    description: YSS API paths should be versioned under /api/v1.
    message: "Path '{{property}}' should start with /api/v1/ or document an exception."
    severity: warn
    given: "$.paths[*]~"
    then:
      function: pattern
      functionOptions:
        match: "^/api/v1/"

  yss-operation-id-required:
    description: Operation IDs must be stable for generated clients and contract tests.
    severity: error
    given: "$.paths[*][*]"
    then:
      field: operationId
      function: truthy

  yss-tags-required:
    description: Operations should be grouped by bounded context or module.
    severity: warn
    given: "$.paths[*][*]"
    then:
      field: tags
      function: truthy
```

Do not overfit Spectral rules when human review is better. For example, "uses `SingleResult<T>` correctly" may require schema convention inspection and YSS context; encode it only if the repo has stable wrapper schema names.

## Blocking Rules

Block OpenAPI Freeze if any of these are true:

- The contract cannot be parsed or linted with the repo's configured tool.
- A public operation lacks `operationId`, response schema, or error contract.
- Pagination, list, or single-object response wrappers contradict YSS baseline without a documented exception.
- Permission, validation, conflict, import/export, upload/download, or sensitive-data behavior is ambiguous.
- A safety-red-line area is implemented as final contract without `TODO-HUMAN-REVIEW` or equivalent review record.
- Contract tests cannot be identified for P0 flows and critical error paths.

## Output Contract

```markdown
### Governance Result
<Pass / Blocked / Draft Rules Proposed>

### Tooling
- <Spectral/Redocly command used or proposed>

### Blocking Findings
- <file:line grounded finding>

### Rule Changes
- <ruleset/config changes made or proposed>

### YSS Contract Checks
- <response wrappers, errors, pagination, permissions, security red lines, contract tests>

### Next Action
- <fix draft / run yss-openapi-draft-review / enter OpenAPI Freeze / compare generated contract>
```
