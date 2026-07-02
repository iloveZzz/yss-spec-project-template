# Artifact Checklist

Use this checklist to identify missing lifecycle artifacts. Daily execution uses 9 main stages; the authoritative stage / artifact / template map is `docs/process/lifecycle-artifact-map.md`.

## Product Artifacts

| Artifact | Path | Done when |
|---|---|---|
| Domain terms | `CONTEXT.md` | Stable terms exist for core nouns, states, and rules |
| Opportunity input | `docs/discovery/` or chat summary | Users, pains, why now, MVP boundary, non-goals, and success criteria are known or intentionally deferred |
| Competitive matrix | `docs/discovery/reports/<feature>-competitive-matrix.md` | Competitors, function matrix, gaps, MVP boundary input are captured |
| Discovery | `docs/discovery/<feature>-discovery.md` using `docs/discovery/templates/discovery-template.md` | Users, pains, core flows, non-goals, success criteria are captured |
| Business architecture | `docs/architecture/<feature>-business-architecture.md` using `docs/architecture/templates/business-architecture-template.md`, or `docs/discovery/` section | User journey, value stream, role/ecosystem model, business capability map, external system boundary, and MVP boundary are clear |
| PRD baseline / calibrated PRD | `docs/requirements/<feature>-prd.md` | Uses `docs/templates/prd-template.md`, includes acceptance criteria, API impact, test decisions, and is calibrated with product overview design and product design when UI exists |
| Product overview design / Functional architecture | `docs/design/<feature>-product-overview-design.md`, `docs/architecture/<feature>-functional-architecture.md` using `docs/architecture/templates/functional-architecture-template.md`, or PRD section | User main flow, business object relationships, functional domains, module boundaries, priorities, dependencies, MVP/non-goal boundary, page/API/data impacts, open questions, decisions, and PRD gaps are clear |
| Product design / prototype / interaction spec | `docs/design/<feature>-interaction-spec.md` or prototype link | Page map, user flow, wireframe/prototype, interaction state matrix, permissions, empty/loading/error states, PRD calibration notes, and OpenAPI implications are captured when UI exists |
| Prototype Review | `docs/design/<feature>-prototype-review.md` or review note | Page/flow/state/PRD calibration/API implication gates have no blocking findings before PRD calibration and UI-driven OpenAPI Draft |
| Requirement freeze | `docs/requirements/<feature>-requirement-freeze.md` using `docs/templates/requirement-freeze-template.md` or calibrated PRD section | Final scope, PRD backfills, non-goals, OpenAPI / architecture impact, and blocking items are clear |
| OpenAPI Draft | `docs/api/specs/<feature>.yaml` | API paths, schemas, errors, pagination, permissions, state/conflict handling, and contract-test ideas are specified from calibrated PRD plus product overview design and approved interaction/prototype/state-matrix review when UI exists, or PRD explicitly says no API impact |
| Engineering baseline | `docs/architecture/<feature>-engineering-baseline-review.md` using `docs/architecture/templates/engineering-baseline-review-template.md`, ADR, or issue notes | New backend services/modules have YSS DDD scaffold/baseline decisions and relevant YSS skills selected |
| System overview design / System architecture | `docs/architecture/<feature>-system-overview-design.md`, `<feature>-system-architecture.md`, or `<feature>-architecture.md` | Service/module boundaries, deployment, integration, security, performance, reliability, observability, rollout, rollback, OpenSpec/Comet design impact, and architecture review questions are clear |
| Data architecture / meta-model | `docs/architecture/<feature>-data-architecture.md` using `docs/architecture/templates/data-architecture-template.md` | Conceptual/logical/physical model, meta-model, versioning, lineage, query/search, index, storage, and migration constraints are clear when data/persistence is affected |
| Architecture diagrams | `docs/discovery/diagrams/`, `docs/design/diagrams/`, or `docs/architecture/diagrams/` | Diagrams clarify business flow, functional modules, system boundaries, data architecture, state flow, API sequence, or slice dependencies and are referenced from the source document |
| Design Review | architecture checklist, issue comment, or review report | PRD, product design when UI exists, API Draft, DDD boundary, ADR, test seam, and security red lines have no blocking findings |
| OpenAPI Freeze | `docs/api/specs/<feature>.yaml` plus `docs/api/<feature>-openapi-freeze.md` using `docs/api/templates/openapi-freeze-record-template.md` | API contract is approved for frontend/backend implementation, or no API impact is explicitly recorded |
| ADR | `docs/adr/000N-<decision>.md` | Required only for hard-to-reverse decisions with real tradeoffs |

## Change Artifacts

| Artifact | Path | Done when |
|---|---|---|
| OpenSpec / Comet change | `openspec/changes/<change>/` | Matching active change exists in `openspec list --json`; `proposal.md`, `design.md`, `tasks.md`, at least one `specs/**/spec.md`, and `.comet.yaml` exist and align with PRD / OpenAPI Freeze |
| Vertical slice issue | GitHub Issues or `docs/requirements/issues/` | Each slice uses `docs/templates/vertical-slice-issue-template.md` and is independently demoable and testable |
| Implementation routing | `docs/requirements/issues/<feature>-implementation-routing.md` using `docs/templates/implementation-routing-template.md` or issue note | Active Comet phase, required change files, minimal YSS skills, TDD strategy, and rollback points are clear |
| Superpowers design doc | `docs/superpowers/specs/<date>-<topic>-design.md` | For Comet full workflow implementation, `.comet.yaml` has `design_doc`, the file exists, and it uses `canonical_spec: openspec` |
| Superpowers implementation plan | `docs/superpowers/plans/<date>-<topic>.md` | For Comet build execution, `.comet.yaml` has `plan`, the file exists, and it references the OpenSpec change, design doc, and base ref |
| Independent review | MR/PR comments or `docs/templates/review-report-template.md` | Implementer did not review their own work; blocking findings are closed or explicitly accepted by a responsible human |
| Fresh verification | command output in issue/MR/release notes or `docs/testing/<feature>-verification.md` using `docs/templates/verification-record-template.md` | Relevant tests, contract checks, build/typecheck, or template verification have fresh evidence |
| Release note | `docs/releases/` | Uses `docs/templates/release-note-template.md`; user-facing changes, upgrade notes, risks, rollback are documented |
| Implementation record | `docs/implementation/` | Uses `docs/templates/implementation-plan-template.md`; environment/customer rollout steps and validation are documented |
| User guide | `docs/user-guide/` using `docs/user-guide/templates/user-guide-template.md` | Operators/users can complete the workflow |
| Retrospective | `docs/process/sprint-retros/` | Uses `docs/templates/retro-report-template.md`; lessons and follow-up rules are captured |

## Minimum Gate Before Implementation

- Opportunity exploration exists, or market/competitor/user research is explicitly skipped with a reason.
- Business architecture exists for new products/modules, or users, value stream, role/ecosystem model, capability map, and product boundary are already captured elsewhere.
- `CONTEXT.md` has stable terms for the feature.
- PRD exists, has clear acceptance criteria, and has been calibrated with product overview design and product design when UI exists.
- Product overview design / functional architecture is clear when the feature has multiple modules, roles, major user flows, business object relationships, page/API/data impacts, or MVP prioritization tradeoffs.
- Product design / prototype / interaction spec exists and passed `prototype-review` when the feature has a user interface.
- OpenAPI impact is explicit; API changes have Draft and are Frozen before frontend/backend implementation. UI-driven APIs must trace to product overview design, interaction spec/prototype, state matrix, and prototype-review findings.
- Engineering baseline / YSS DDD review is complete when backend service/module structure is affected.
- System overview design / system architecture impact is explicit when services, deployment, integrations, NFRs, operations, or rollback are affected.
- Data architecture is complete before persistence / repository work; for metadata, modeling, versioning, or lineage products it is required before Design Review and OpenAPI Freeze.
- Excalidraw diagrams, when used, are referenced by the corresponding Discovery, PRD, design, architecture, OpenSpec/Comet, or issue artifact and do not stand alone as decisions.
- Design Review has no blocking findings.
- Active Comet/OpenSpec change is selected or created and contains `proposal.md`, `design.md`, `tasks.md`, at least one `specs/**/spec.md`, and `.comet.yaml`. If missing, formal vertical slicing is blocked and must route to `comet` or `openspec-new-change` first.
- Vertical slice is narrow and end-to-end.
- Before implementation, matching Comet phase is inspected. If `phase` is `open` or `design`, continue `comet` before YSS implementation. If `phase` is `build`, required Comet build fields and Superpowers plan status must be known.
- `yss-router` has selected the minimal YSS implementation skills and the output is attached to the Comet build handoff or equivalent implementation handoff.
- Business behavior implementation has a TDD plan, or a documented exception and verification command.
- Independent review and fresh verification are planned before release/archive.

## Security Red Lines

If any item touches these areas, mark it for human review according to `AGENTS.md`:

- payment logic,
- database migrations,
- authentication / authorization middleware,
- cryptographic algorithm implementation,
- raw SQL,
- public base library API changes.
