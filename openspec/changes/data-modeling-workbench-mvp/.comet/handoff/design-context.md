# Comet Design Handoff

- Change: data-modeling-workbench-mvp
- Phase: design
- Mode: compact
- Context hash: 5a8b0eb38243d69687c23739fe0bb4a8c804ca89c246cd15cc28eecee27cc41e

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/data-modeling-workbench-mvp/proposal.md

- Source: openspec/changes/data-modeling-workbench-mvp/proposal.md
- Lines: 1-39
- SHA256: c2b9463d7574c9ce639f9bda99a768704e103d30209a4003baeccb083ccb302e

```md
## Why

Internal data architects and data warehouse developers currently rely on Excel and offline review to describe, map, validate, review, publish, and reuse enterprise data models. This makes model boundaries hard to control, mapping coverage hard to quantify, governance issues hard to close, and published model assets hard to reuse.

The enterprise data model collaboration workbench MVP provides a PostgreSQL-first, project-scoped workspace for the pilot performance risk-control indicator model, with reusable patterns for later model projects.

## What Changes

- Add a model project workspace that supports multiple model projects while keeping each project bounded by a confirmed subject domain.
- Add object tree, business object, logical entity, logical field, physical table, and physical field management for model architects and warehouse developers.
- Add Excel-based import of existing physical table assets, including preview, apply, cancel, idempotency, and import task status.
- Add logical-to-physical field mapping, mapping coverage display, unmapped field prompts, and coverage thresholds: draft pass 80%, publish 85%, P0 required fields 95%.
- Add validation rule configuration and validation runs for naming, field standards, mapping coverage, and publish readiness.
- Add single-architect review with comments, approve, reject, and resubmit-as-new-review behavior.
- Add publish, immutable version snapshot, version history, draft-from-version, and asynchronous export for SQL DDL draft, Markdown, and Excel assets.
- Add permission action discovery, optimistic locking, unified error structure, audit requirements, and human safety confirmation points for authorization, file upload, and SQL/DDL draft output.

No breaking changes are expected because this is a new MVP capability.

## Capabilities

### New Capabilities

- `model-collaboration-workbench`: Project boundary management, object tree, business objects, logical entities, logical fields, physical tables, physical fields, optimistic locking, and permission actions.
- `model-ingestion-governance`: Excel import, import preview/apply/cancel, field mapping, mapping coverage, unmapped field prompts, validation rule configuration, and validation run results.
- `model-review-release-assets`: Single-architect review, publish checks, immutable version snapshots, draft-from-version, asynchronous exports, audit requirements, and safety confirmation points.

### Modified Capabilities

- None.

## Impact

- Product assets: PRD, interaction specification, architecture design, data architecture, OpenAPI freeze record, and contract test checklist become upstream source material for implementation slicing.
- API contract: frozen OpenAPI 3.1 file at `docs/api/specs/data-modeling-workbench.yaml`.
- Frontend: project list/detail, import wizard, design workbench, mapping drawer, validation panel, review page, publish modal, version center, and export center.
- Backend: YSS DDD modules for Application use cases, Domain aggregates/state machines, Repository/Gateway interfaces, Infrastructure persistence, audit, file/export gateways, and Web adapters.
- Storage: PostgreSQL-first model metadata, version snapshots, mapping records, validation results, import/export tasks, review records, permission/audit records, and migration templates.
- Testing: contract tests from `docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`, plus focused domain/application/API/UI/E2E verification per vertical slice.
```

## openspec/changes/data-modeling-workbench-mvp/design.md

- Source: openspec/changes/data-modeling-workbench-mvp/design.md
- Lines: 1-82
- SHA256: 9f59d7710f0ad1bcf665b4b029620a194ddfdf3993ff4570e8d647a123fc0652

[TRUNCATED]

```md
## Context

The enterprise data model collaboration workbench MVP is based on the frozen product and engineering assets:

- PRD: `docs/requirements/2026-07-01-data-modeling-workbench-prd.md`
- PRD calibration: `docs/requirements/2026-07-02-data-modeling-workbench-prd-calibration.md`
- Interaction specification: `docs/design/data-modeling-workbench-interaction-spec.md`
- Architecture design: `docs/architecture/2026-07-02-data-modeling-workbench-architecture-design.md`
- Data architecture: `docs/architecture/2026-07-02-data-modeling-workbench-data-architecture.md`
- OpenAPI freeze: `docs/api/specs/data-modeling-workbench.yaml`
- Contract test checklist: `docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`

The first pilot is the performance risk-control indicator model, but the workbench must support multiple model projects. The MVP is PostgreSQL-first, imports existing Excel table models, uses company field standards and reusable naming dictionary/code table assets, and postpones formal sensitive-data classification.

## Goals / Non-Goals

**Goals:**

- Deliver an end-to-end workbench path from model project creation through import, mapping, validation, review, publish, version history, and asynchronous export.
- Preserve the frozen OpenAPI 3.1 contract as the implementation contract for frontend, backend, and contract tests.
- Use YSS DDD boundaries: Web Adapter, Application use cases, Domain aggregates/state machines, Domain Gateway/Repository interfaces, Infrastructure implementations, and PostgreSQL storage.
- Keep model project subject-domain boundaries explicit so business scope cannot expand indefinitely.
- Carry security redlines as explicit human review checkpoints rather than hidden implementation assumptions.

**Non-Goals:**

- Do not implement formal sensitive-data classification in the MVP.
- Do not generate production DDL automatically; SQL DDL output is draft-only and requires human review before use.
- Do not support non-PostgreSQL physical modeling in the MVP.
- Do not build an enterprise-wide metadata marketplace or lineage platform in this change.
- Do not change the frozen OpenAPI contract unless a later review explicitly reopens the contract.

## Decisions

1. **Use one OpenSpec change for the MVP and split implementation into vertical slices.**
   - Rationale: the MVP behavior is already frozen as one product scope, while implementation needs end-to-end slices for traceable delivery.
   - Alternative considered: one OpenSpec change per slice. That would make contract and PRD traceability harder because the API freeze is a single MVP contract.

2. **Use three capability specs instead of one spec per page.**
   - Rationale: the workbench behavior clusters around collaboration/modeling, ingestion/governance, and review/release assets.
   - Alternative considered: eight specs aligned to slices. That would duplicate task planning inside OpenSpec requirements.

3. **Treat published versions as immutable snapshots.**
   - Rationale: review, audit, export, and historical comparison depend on stable published model versions.
   - Alternative considered: mutable version rows. That would simplify storage but weaken auditability and export reproducibility.

4. **Use asynchronous import/export task models.**
   - Rationale: Excel parsing and asset export can be slow, fail partially, or require retry/cancel semantics.
   - Alternative considered: synchronous upload/download only. That would make frontend state handling and operational recovery fragile.

5. **Keep permission actions UI-consumable and fail closed on commands.**
   - Rationale: the frontend needs consistent disabled/enabled states, while backend authorization remains authoritative.
   - Alternative considered: frontend-only permission inference. That would create inconsistent states and security gaps.

6. **Use PostgreSQL as the MVP storage boundary.**
   - Rationale: the PRD and data architecture selected PostgreSQL-first; multi-database abstraction is a later expansion.
   - Alternative considered: generic database abstraction from day one. That would broaden the MVP beyond the pilot need.

## Risks / Trade-offs

- [Risk] The OpenSpec change is created after PRD/API freeze rather than at the beginning of discovery. → Mitigation: reference frozen upstream documents directly and keep OpenSpec requirements high-signal instead of rewriting history.
- [Risk] Vertical slices may accidentally become horizontal backend/frontend tasks. → Mitigation: every issue must include API, UI, domain/application, persistence, tests, and review checkpoints where applicable.
- [Risk] Authorization and file upload implementation can cross safety redlines. → Mitigation: issues touching those areas must carry TODO-HUMAN-REVIEW and cannot be closed without approval evidence.
- [Risk] DDL export may be mistaken for executable migration output. → Mitigation: freeze record, ADR, and export slice must label DDL as draft-only.
- [Risk] Coverage thresholds may drift between UI, backend validation, and publish checks. → Mitigation: mapping coverage and publish checks must share contract tests and domain threshold fixtures.

## Migration Plan

1. Create OpenSpec change artifacts and link them to frozen product/API/architecture assets.
2. Generate vertical-slice Issue drafts under `docs/requirements/issues/`.
3. After user approval, publish or mirror the drafts to GitHub Issues with `ready-for-agent` labels.
4. Implement slices in dependency order with TDD and fresh verification.
5. Keep database migration scripts as templates/drafts until human review approves them.
6. Archive OpenSpec change only after implementation, independent review, fresh verification, and release documentation are complete.

Rollback strategy: because this is a new MVP capability, rollback is feature-level disablement plus reverting unreleased slice commits. Published model snapshots must remain immutable once created in any shared environment.

## Open Questions

- Which existing identity/authorization service will provide final permission action evaluation in implementation?
```

Full source: openspec/changes/data-modeling-workbench-mvp/design.md

## openspec/changes/data-modeling-workbench-mvp/tasks.md

- Source: openspec/changes/data-modeling-workbench-mvp/tasks.md
- Lines: 1-44
- SHA256: d36ced4af42b2d5f7989d899fd7cfbb82517ec55534888ab46617bff262ed3af

```md
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
```

## openspec/changes/data-modeling-workbench-mvp/specs/model-collaboration-workbench/spec.md

- Source: openspec/changes/data-modeling-workbench-mvp/specs/model-collaboration-workbench/spec.md
- Lines: 1-42
- SHA256: 41e5b31c2ac462c8f022e58c1b731875c5a9e65207d74dada8047d813c9fc216

```md
## ADDED Requirements

### Requirement: Project Boundary Management
The system SHALL allow authorized internal users to create, view, update, filter, sort, archive, and open model projects with an explicit subject domain boundary and pilot scope.

#### Scenario: Create bounded model project
- **WHEN** an authorized architect creates a model project with name, project code, subject domain, subdomain, pilot scope, owner, and description
- **THEN** the system persists the project as a draft project and returns available permission actions, version, and audit metadata

#### Scenario: Prevent unbounded project scope
- **WHEN** a user submits a model project without a confirmed subject domain or with an invalid subject domain boundary
- **THEN** the system rejects the request with the frozen unified error structure and does not create the project

#### Scenario: Archive model project
- **WHEN** an authorized user archives an inactive model project with the current optimistic lock version
- **THEN** the system marks the project as archived and removes it from default active project queries

### Requirement: Model Object And Field Maintenance
The system SHALL allow authorized architects and warehouse developers to maintain business objects, logical entities, logical fields, physical tables, and physical fields inside a model project.

#### Scenario: Maintain model tree assets
- **WHEN** an authorized user creates or updates business objects, logical entities, physical tables, and fields in a draft project
- **THEN** the system updates the project object tree and returns node-level metadata, status, and available actions

#### Scenario: Reject stale model update
- **WHEN** a user updates a model object or field with a stale optimistic lock version
- **THEN** the system rejects the request with a conflict error and preserves the latest persisted model state

#### Scenario: Archive model object with dependency checks
- **WHEN** an authorized user archives a model object that is referenced by mappings, validations, review, or version snapshots
- **THEN** the system either blocks the archive with dependency details or records a safe archive that does not mutate immutable versions

### Requirement: Permission Actions For Workbench Operations
The system SHALL return UI-consumable permission actions for project, model asset, import, mapping, validation, review, publish, version, and export operations.

#### Scenario: Render disabled action from permission result
- **WHEN** the frontend requests project detail, object tree, review detail, version detail, or export task detail
- **THEN** the response includes available actions that allow the UI to enable or disable commands without guessing authorization rules

#### Scenario: Fail closed on unauthorized command
- **WHEN** a user invokes a command without the required permission action
- **THEN** the system denies the command, returns the frozen authorization error structure, and writes an audit record when required
```

## openspec/changes/data-modeling-workbench-mvp/specs/model-ingestion-governance/spec.md

- Source: openspec/changes/data-modeling-workbench-mvp/specs/model-ingestion-governance/spec.md
- Lines: 1-46
- SHA256: 05743add4874f77369fe9b9fda895dd334565b64dac412e3a6e28598ec7be183

```md
## ADDED Requirements

### Requirement: Excel Import Physical Model Draft
The system SHALL support Excel import of existing physical table models into a model project draft with template download, alias discovery, preview, apply, cancel, idempotency, validation, and task status.

#### Scenario: Preview Excel import
- **WHEN** an authorized user uploads a supported Excel file for a draft model project
- **THEN** the system creates an import task, parses sheets into previewable physical tables and fields, reports validation issues, and does not mutate the model draft before apply

#### Scenario: Apply Excel import
- **WHEN** an authorized user applies a valid import preview with the current project version and idempotency key
- **THEN** the system writes imported physical tables and fields into the draft, records import results, and returns the updated project version

#### Scenario: Cancel import task
- **WHEN** an authorized user cancels a pending or previewed import task
- **THEN** the system marks the import task as canceled and prevents later apply for that task

### Requirement: Field Mapping And Coverage
The system SHALL support logical-to-physical field mappings, batch mapping updates, mapping coverage display, unmapped field prompts, and threshold evaluation.

#### Scenario: Update field mapping
- **WHEN** an authorized user maps logical fields to physical fields manually or in batch
- **THEN** the system persists the mapping draft, recalculates coverage, highlights unmapped fields, and returns the updated mapping version

#### Scenario: Evaluate coverage threshold
- **WHEN** mapping coverage is recalculated for a project
- **THEN** the system reports draft pass threshold at 80%, publish threshold at 85%, and P0 required field threshold at 95%

#### Scenario: Block publish readiness for insufficient coverage
- **WHEN** coverage is below the publish threshold or P0 required field threshold
- **THEN** publish readiness reports a blocking issue with unmapped or insufficiently mapped fields

### Requirement: Validation Rule Runs
The system SHALL support project-level validation rules and validation runs for naming, company field standards, code table reuse, mapping coverage, and publish readiness checks.

#### Scenario: Configure validation rules
- **WHEN** an authorized architect updates project validation rules with the current rule set version
- **THEN** the system persists the rule set and returns a new version without changing immutable published snapshots

#### Scenario: Run validation
- **WHEN** an authorized user starts a validation run for a model project
- **THEN** the system evaluates configured rules, returns summary counts by severity, and stores field-level and asset-level findings

#### Scenario: Display blocking validation issues
- **WHEN** validation produces P0 or publish-blocking issues
- **THEN** the system exposes the issues to the validation panel and publish check with actionable references to affected assets
```

## openspec/changes/data-modeling-workbench-mvp/specs/model-review-release-assets/spec.md

- Source: openspec/changes/data-modeling-workbench-mvp/specs/model-review-release-assets/spec.md
- Lines: 1-57
- SHA256: 0b092cc043e505af7c478607a20498943baba6f0db05d0b6665f8ce966dad342

```md
## ADDED Requirements

### Requirement: Single Architect Review
The system SHALL support one active review at a time for a model project and SHALL allow a single authorized architect to comment, approve, or reject the review.

#### Scenario: Submit review
- **WHEN** an authorized user submits a project draft that satisfies review preconditions
- **THEN** the system creates a review record, snapshots the submitted draft context, and exposes review detail, comments, and available actions

#### Scenario: Reject and resubmit review
- **WHEN** an authorized architect rejects a review with comments and the submitter later resubmits after changes
- **THEN** the system creates a new reviewId for the resubmission and preserves the rejected review history

#### Scenario: Approve review
- **WHEN** an authorized architect approves a review that still satisfies current validation and coverage preconditions
- **THEN** the system marks the review as approved and allows publish check to proceed

### Requirement: Publish Version Snapshot
The system SHALL publish approved model projects as immutable version snapshots and SHALL support version history and draft-from-version.

#### Scenario: Publish approved draft
- **WHEN** an authorized user publishes a reviewed project draft with passing publish check and current optimistic lock version
- **THEN** the system creates an immutable version snapshot, records publish metadata, and returns the version detail

#### Scenario: Preserve immutable version
- **WHEN** users modify the project draft after publish
- **THEN** the system does not mutate any previously published version snapshot

#### Scenario: Create draft from version
- **WHEN** an authorized user creates a new draft from a published version
- **THEN** the system copies the version snapshot into a draft workspace with new draft identity and version metadata

### Requirement: Asynchronous Export Assets
The system SHALL support asynchronous export of published versions to SQL DDL draft, Markdown, and Excel assets.

#### Scenario: Start export task
- **WHEN** an authorized user starts an export task for a published version and selected export type
- **THEN** the system creates an asynchronous export task and returns task id, status, and available actions

#### Scenario: Download completed export
- **WHEN** an export task completes successfully
- **THEN** the system returns a controlled download reference and export metadata without exposing unrestricted file paths

#### Scenario: Retry failed export
- **WHEN** an authorized user retries a retryable failed export task
- **THEN** the system creates or updates a retry attempt and preserves the failed attempt audit trail

### Requirement: Audit And Safety Confirmation
The system SHALL record audit events for commands that change project, model asset, mapping, validation, review, publish, version, import, export, and permission-relevant state.

#### Scenario: Record command audit event
- **WHEN** a command changes governed model state
- **THEN** the system records actor, action, target, result, request correlation, and time in the audit model

#### Scenario: Require human confirmation for safety redlines
- **WHEN** implementation touches authorization, file upload security, SQL/DDL draft generation, database migration, or raw SQL behavior
- **THEN** the issue or change MUST include TODO-HUMAN-REVIEW or equivalent approval evidence before completion
```

