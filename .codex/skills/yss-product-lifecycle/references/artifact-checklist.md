# Artifact Checklist

Use this checklist to identify missing lifecycle artifacts.

## Product Artifacts

| Artifact | Path | Done when |
|---|---|---|
| Domain terms | `CONTEXT.md` | Stable terms exist for core nouns, states, and rules |
| Competitive matrix | `docs/discovery/reports/<feature>-competitive-matrix.md` | Competitors, function matrix, gaps, MVP boundary input are captured |
| Discovery | `docs/discovery/<feature>-discovery.md` | Users, pains, core flows, non-goals, success criteria are captured |
| PRD | `docs/requirements/<feature>-prd.md` | Uses `docs/templates/prd-template.md` and includes acceptance criteria, API impact, test decisions |
| OpenAPI | `docs/api/specs/<feature>.yaml` | API changes are specified, or PRD explicitly says no API impact |
| Architecture | `docs/architecture/<feature>-architecture.md` | Module boundaries, state flow, integration, risks are clear |
| ADR | `docs/adr/000N-<decision>.md` | Required only for hard-to-reverse decisions with real tradeoffs |

## Change Artifacts

| Artifact | Path | Done when |
|---|---|---|
| OpenSpec / Comet change | `openspec/changes/<change>/` | proposal, design, specs, tasks exist and align with PRD |
| Vertical slice issue | GitHub Issues or `docs/requirements/issues/` | Each slice uses `docs/templates/vertical-slice-issue-template.md` and is independently demoable and testable |
| Release note | `docs/releases/` | Uses `docs/templates/release-note-template.md`; user-facing changes, upgrade notes, risks, rollback are documented |
| Implementation record | `docs/implementation/` | Uses `docs/templates/implementation-plan-template.md`; environment/customer rollout steps and validation are documented |
| User guide | `docs/user-guide/` | Operators/users can complete the workflow |
| Retrospective | `docs/process/sprint-retros/` | Uses `docs/templates/retro-report-template.md`; lessons and follow-up rules are captured |

## Minimum Gate Before Implementation

- Competitive analysis exists or is explicitly skipped.
- `CONTEXT.md` has stable terms for the feature.
- PRD exists and has clear acceptance criteria.
- OpenAPI impact is explicit.
- Architecture impact is explicit.
- Active Comet/OpenSpec change is selected or created.
- Vertical slice is narrow and end-to-end.
- `yss-router` has selected the minimal YSS implementation skills.

## Security Red Lines

If any item touches these areas, mark it for human review according to `AGENTS.md`:

- payment logic,
- database migrations,
- authentication / authorization middleware,
- cryptographic algorithm implementation,
- raw SQL,
- public base library API changes.
