# OpenAPI Draft 语义审查

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。仓库脚本与 pnpm 命令从当前登记的项目根目录执行。

## Review Flow

1. Recompute the Draft SHA-256 and verify `<feature>-validation.yaml`. The record must bind a pnpm-lockfile-pinned Redocly version, the exact lint command, exit code, execution time and readable evidence; its structural checks and lint must all pass. Custom parser evidence may supplement this record but cannot replace locked Redocly lint.
2. Build a P0 traceability matrix from Spec functional requirements and interaction actions to OpenAPI paths, schemas, errors, and contract tests. Each UI action must map to a stable `operationId` and `x-yss-action-key` or an equivalent traceability entry. For P0 write/configuration models and read models that affect a key interaction, trace the exact property path, type/nesting, operation-specific requiredness, nullable/default/enum/format rules, source locator and error/test seam.
3. Check page action coverage: every action has `actionKey`, endpoint or explicit non-goal, state transition, idempotency/concurrency rule, and error codes. When the Spec explicitly changes authentication or authorization behavior, trace that behavior through the same matrix.
4. Check object lifecycle coverage: manage/maintain/configure/create/update/archive/retry/cancel/publish/export/create-draft semantics have endpoints or explicit scope downgrades.
   When create/update or other lifecycle operations share one schema, verify that omission and requiredness semantics match for every operation; otherwise require split schemas or an explicit conditional contract. For credentials, distinguish create, update, masked readback, omit-to-preserve and explicit-clear behavior instead of imposing a universal required rule.
5. Check YSS API baseline: REST shape, `x-yss-response-wrapper` values `SingleResult|MultiResult|PageResult`, `YssResultMeta` plus `allOf` concrete schemas, and stable DTO/schema names. The Java generic notation is a review shorthand only; it must not appear as an OpenAPI type or `$ref`.
6. Check DTO wire shape against the profile: `success` is boolean, `dataType` is `string|null`, `code` is only `string|integer|null`, list/page `data` is an array, and single `data` points to the endpoint schema with explicit nullability. Check response/request direction separately.
7. Check pagination input: only `pageIndex/pageSize/orderBy/orderDirection/groupBy` are client fields; `orderDirection` is `ASC|DESC`; `orderBy` / `groupBy` use endpoint whitelists; `offset`, `needTotalCount`, and `tempTotalCount` are negative assertions. `totalPages` is mapper-dependent and cannot enter a shared schema without fresh wire evidence.
8. Check error contracts: field-level errors, model-level errors, disabled reasons, gate failures, and conflict responses. When the Spec explicitly changes authentication or authorization behavior, include its `401` / `403` and resource-filtering semantics here.
9. Output a persistent review artifact under `docs/.scratch/<feature>/architecture/` or update the existing one.
