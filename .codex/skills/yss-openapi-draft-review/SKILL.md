---
name: yss-openapi-draft-review
description: "审查 YSS OpenAPI Draft 的需求覆盖、页面动作、响应、错误与测试 seam；不执行 Freeze。"
---

# YSS OpenAPI Draft Review

已有生命周期资产优先用 `scripts/contract view <资产> --kind <类型>` 阅读；执行任务用 `--profile task --unit <ID>`，绑定与校验明细用 `--profile full`。视图不授予执行权限，仍按本 Skill 的原始来源和批准门禁处理。类型、准备和迁移见 `.template-spec/process/contract-reading.md`。

Use this skill after OpenAPI Draft creation and before Engineering Baseline / YSS DDD Review. It is a fail-closed contract review skill for design-time OpenAPI files under `docs/.scratch/<feature>/api/`; it does not bundle JSON or generate Orval clients.

## Required Inputs

- OpenAPI Draft under `docs/.scratch/<feature>/api/<feature>.yaml`，作为唯一权威的单一 OAS 3.1 YAML document；生命周期元数据和 Freeze 决策位于相邻 Markdown 记录。
- `docs/.scratch/<feature>/api/<feature>-validation.yaml`，且已由 `scripts/verify-openapi-draft-validation-record` 针对当前 Draft SHA-256 验证通过。
- Calibrated Spec.
- Interaction spec / prototype review when UI exists.
- YSS engineering baseline rules and `.agents/skills/yss-dto/references/openapi-wire-profile.yaml`；先运行 `scripts/verify-yss-dto-openapi-profile`。
- 若 Draft 包含 computed getter（例如 `totalPages`），必须提供目标 HTTP mapper identity、代表性序列化 fixture 和 contract-test / 等价 HTTP evidence。

## Review Flow

开始语义审查时读取 [P0 追踪与审查步骤](references/semantic-review.md)，逐项覆盖当前 Spec / UI 命中的字段、操作、错误和测试 seam。当前 SHA 与锁定 lint 证据通过后才可能得出 Approved。

## Automation Boundary

- Automated checks own YAML single-document syntax, `$ref` resolution, path-parameter consistency, OpenAPI lint, and stable machine-checkable style rules.
- `scripts/verify-openapi-draft-validation-record` owns validation-record shape, current-byte SHA binding, locked toolchain evidence and deterministic structural rechecks. It does not decide whether a business property correctly implements the Spec.
- `scripts/verify-yss-dto-openapi-profile` owns the reusable DTO mapping invariants; the review still checks each endpoint's concrete schema, wrapper extension and evidence.
- Human or independent semantic review owns P0 traceability, page-action coverage, error behavior, concurrency/idempotency, scope downgrades, contract-test seams, and any explicitly specified authentication or authorization behavior.
- Fresh passing automation evidence may be referenced by the semantic review; copying the same findings into a second checklist is unnecessary.
- Re-run structural automation only when the Draft, ruleset, or referenced schema changes.

## Blocking Rules

Block if any of these are true:

- A P0 requirement has no endpoint, schema, error contract, or explicit non-goal.
- The validation record is missing, stale, blocked or unverifiable; locked Redocly lint is absent or non-zero. Semantic pre-review may continue, but the overall Review Result remains `Blocked`.
- A P0 write/configuration model or key-interaction read model lacks property-level source, nested shape, operation-specific requiredness, constraints, error or test traceability.
- Multiple lifecycle operations reuse one schema even though requiredness or omission semantics differ and no explicit conditional contract resolves the difference.
- A UI action has no endpoint/non-goal mapping.
- A configurable rule or gate lacks a source, owner, fixed/default decision, or API representation.
- Pagination does not align with the `PageResult` profile or documented exception, or exposes `offset` / `needTotalCount` / `tempTotalCount` as client input.
- A response omits `x-yss-response-wrapper`, uses the compatibility `com.yss.cloud.dto.response` package for a new contract, writes Java generic notation as an OAS schema, or fails `YssResultMeta` + `allOf` + concrete `data` mapping.
- `code` is modeled as arbitrary object, `dataType` loses explicit nullability, or computed fields such as `totalPages` lack target wire evidence.
- An in-scope behavior lacks a contract-test seam. Select import, mapping coverage, validation, review, publish, export or optimistic-locking seams only when the Spec/API actually includes that behavior; record a reasoned not-applicable for absent operations. A read-only query does not acquire write/import/publish requirements.
- YAML contains lifecycle frontmatter / root metadata, or the proposed JSON client input is not explicitly deferred until Freeze and governance export.

## Output Contract

形成持久化结论时读取 [审查输出契约](references/review-output.md)。`Review Result` 仅在 `Structural Validation` 和 `Semantic Review` 均为 `Passed` 时可为 `Approved`；否则 `Blocked`，不使用条件批准。
