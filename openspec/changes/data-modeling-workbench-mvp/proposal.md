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
