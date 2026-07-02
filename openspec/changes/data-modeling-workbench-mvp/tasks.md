## 1. DMW-001 Model Project Boundary

- [ ] 1.1 Implement project list, create, detail, update, archive, permission actions, optimistic lock, PostgreSQL persistence, and contract tests.
- [ ] 1.2 Verify subject-domain boundary, pilot scope, unified errors, audit events, and UI disabled-state behavior.

## 2. DMW-002 Model Object And Field Maintenance

- [ ] 2.1 Implement object tree, business object, logical entity, logical field, physical table, and physical field create/update/archive flows.
- [ ] 2.2 Verify dependency checks, stale version conflict handling, permission actions, tree refresh, and UI drawer states.

## 3. DMW-003 Excel Import Physical Draft

- [ ] 3.1 Implement Excel template download, alias discovery, import create, preview, apply, cancel, idempotency, and task persistence.
- [ ] 3.2 Verify preview-before-apply behavior, partial validation issues, file upload safety review evidence, and import UI states.

## 4. DMW-004 Field Mapping Coverage

- [ ] 4.1 Implement mapping list, single mapping update, batch mapping update, coverage calculation, and unmapped field prompts.
- [ ] 4.2 Verify 80% draft pass, 85% publish, 95% P0 required field thresholds across API, domain, and UI.

## 5. DMW-005 Validation Rules And Runs

- [ ] 5.1 Implement validation rule configuration, validation run start/detail, issue persistence, and validation panel display.
- [ ] 5.2 Verify naming, company field standard, code table reuse, mapping coverage, and publish-readiness findings.

## 6. DMW-006 Single Architect Review

- [ ] 6.1 Implement review submit, detail, comments, approve, reject, and resubmit-as-new-reviewId flows.
- [ ] 6.2 Verify single active review, approval preconditions, rejection history, permission actions, audit events, and review UI states.

## 7. DMW-007 Publish Version And Draft From Version

- [ ] 7.1 Implement publish check, publish version, version list/detail, immutable snapshot storage, and draft-from-version.
- [ ] 7.2 Verify approved-review precondition, coverage and validation gates, snapshot immutability, optimistic lock, and rollback notes.

## 8. DMW-008 Asynchronous Export Assets

- [ ] 8.1 Implement export start, export detail polling, retry, controlled download reference, and task lifecycle for SQL DDL draft, Markdown, and Excel.
- [ ] 8.2 Verify asynchronous states, retry rules, DDL draft-only labeling, SQL/DDL human review evidence, and export center UI.

## 9. DMW-009 Security Audit Closure

- [ ] 9.1 Verify cross-slice permission fail-closed behavior, audit coverage, unified error structure, pagination/sort/filter consistency, and optimistic lock consistency.
- [ ] 9.2 Collect human review evidence for authorization, file upload, SQL/DDL draft, migration templates, and raw SQL redlines before implementation closure.
