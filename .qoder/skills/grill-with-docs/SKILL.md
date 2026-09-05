---
name: grill-with-docs
description: Use when the user explicitly requests a relentless design interview that must preserve resolved glossary terms, ADR-worthy decisions, and factual research evidence.
disable-model-invocation: true
---

Call the Skill tool with `grilling`, then call it separately with `domain-modeling`. This compatibility entry does not define a second glossary format: it consumes `domain-modeling/CONTEXT-FORMAT.md`, the repository Context Contract validator, and the lifecycle reconciliation contract.

## Output Contract

1. Read `yss-project.yaml` and the root glossary before the first round, then run `scripts/verify-context-contract --root . --json`. Missing or lowercase root files, nested `CONTEXT.md`, `CONTEXT-MAP.md`, unsupported schema, absolute/cross-repository references, and Markdown pseudo-anchors are `blocked` or `migration-required`.
2. Separate discoverable facts from user decisions; investigate facts instead of asking the user.
3. Ask the entire current decision frontier, with a recommendation for every question, then wait.
4. Keep candidate or disputed terms in the Discovery decision frontier. Only after confirmation, use `domain-modeling` to record true stable glossary entries in the repository root's single, case-sensitive `CONTEXT.md`; business rows use the five-column format and `<ContextId>/<EnglishIdentifier>` identity. Non-`Global` Context IDs must come from the approved business responsibility areas in the business-boundary asset.
5. Create an ADR only when the decision is hard to reverse, surprising without context, and a real trade-off.
6. Persist factual research/validation records in the repository's existing review or research convention.
7. For `project-instance`, before requesting approval or returning a next work unit, generate and validate `context_reconciliation` with a readable ref, `document_digest`, `referenced_terms_digest`, and `term_refs`. Unresolved candidates, scope conflicts, aliases, or digest drift are `blocked`; reconciliation does not create another gate. For `template-source`, do not add fictional business terms and return a reasoned `not-applicable` after validating the template contract.
8. Do not modify implementation skills, contracts, or code until the user confirms shared understanding and the intended change scope.

The final grilling round must list confirmed decisions, unresolved assumptions, documents changed, `context_reconciliation` status/ref, and the next authorized action, then return control to `yss-product-lifecycle` (or the active YSS lifecycle orchestrator). It cannot approve an asset or advance a stage itself. A research note is evidence, not an architecture approval or release claim.
