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
- Which internal file storage gateway will hold uploaded Excel files and generated export artifacts?
- Will GitHub Issues be the only implementation tracker, or should OpenSpec task state remain the operational source during implementation?
