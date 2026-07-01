# Artifact Checklist

Use this checklist to identify missing lifecycle artifacts.

## Product Artifacts

| Artifact | Path | Done when |
|---|---|---|
| Domain terms | `CONTEXT.md` | Stable terms exist for core nouns, states, and rules |
| Opportunity input | `docs/discovery/` or chat summary | Users, pains, why now, MVP boundary, non-goals, and success criteria are known or intentionally deferred |
| Competitive matrix | `docs/discovery/reports/<feature>-competitive-matrix.md` | Competitors, function matrix, gaps, MVP boundary input are captured |
| Discovery | `docs/discovery/<feature>-discovery.md` | Users, pains, core flows, non-goals, success criteria are captured |
| PRD baseline / calibrated PRD | `docs/requirements/<feature>-prd.md` | Uses `docs/templates/prd-template.md`, includes acceptance criteria, API impact, test decisions, and is calibrated with product design when UI exists |
| Product design / prototype / interaction spec | `docs/design/<feature>-interaction-spec.md` or prototype link | Page map, user flow, wireframe/prototype, interaction state matrix, permissions, empty/loading/error states are captured when UI exists |
| OpenAPI Draft | `docs/api/specs/<feature>.yaml` | API paths, schemas, errors, pagination, permissions, and contract-test ideas are specified from calibrated PRD plus product design when UI exists, or PRD explicitly says no API impact |
| Engineering baseline | `docs/architecture/`, ADR, or issue notes | New backend services/modules have YSS DDD scaffold/baseline decisions and relevant YSS skills selected |
| Architecture / Design | `docs/architecture/<feature>-architecture.md` | Module boundaries, state flow, integration, risks, UI interaction impact when relevant, and OpenSpec/Comet design impact are clear |
| Design Review | architecture checklist, issue comment, or review report | PRD, product design when UI exists, API Draft, DDD boundary, ADR, test seam, and security red lines have no blocking findings |
| OpenAPI Freeze | `docs/api/specs/<feature>.yaml` plus freeze note | API contract is approved for frontend/backend implementation, or no API impact is explicitly recorded |
| ADR | `docs/adr/000N-<decision>.md` | Required only for hard-to-reverse decisions with real tradeoffs |

## Change Artifacts

| Artifact | Path | Done when |
|---|---|---|
| OpenSpec / Comet change | `openspec/changes/<change>/` | proposal, design, specs, tasks exist and align with PRD |
| Vertical slice issue | GitHub Issues or `docs/requirements/issues/` | Each slice uses `docs/templates/vertical-slice-issue-template.md` and is independently demoable and testable |
| Independent review | MR/PR comments or `docs/templates/review-report-template.md` | Implementer did not review their own work; blocking findings are closed or explicitly accepted by a responsible human |
| Fresh verification | command output in issue/MR/release notes | Relevant tests, contract checks, build/typecheck, or template verification have fresh evidence |
| Release note | `docs/releases/` | Uses `docs/templates/release-note-template.md`; user-facing changes, upgrade notes, risks, rollback are documented |
| Implementation record | `docs/implementation/` | Uses `docs/templates/implementation-plan-template.md`; environment/customer rollout steps and validation are documented |
| User guide | `docs/user-guide/` | Operators/users can complete the workflow |
| Retrospective | `docs/process/sprint-retros/` | Uses `docs/templates/retro-report-template.md`; lessons and follow-up rules are captured |

## Minimum Gate Before Implementation

- Opportunity exploration exists, or market/competitor/user research is explicitly skipped with a reason.
- `CONTEXT.md` has stable terms for the feature.
- PRD exists, has clear acceptance criteria, and has been calibrated with product design when UI exists.
- Product design / prototype / interaction spec exists when the feature has a user interface.
- OpenAPI impact is explicit; API changes have Draft and are Frozen before frontend/backend implementation.
- Engineering baseline / YSS DDD review is complete when backend service/module structure is affected.
- Architecture impact is explicit and Design Review has no blocking findings.
- Active Comet/OpenSpec change is selected or created.
- Vertical slice is narrow and end-to-end.
- `yss-router` has selected the minimal YSS implementation skills.
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
