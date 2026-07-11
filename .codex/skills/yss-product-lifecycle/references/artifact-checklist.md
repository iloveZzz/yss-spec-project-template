# YSS Lifecycle Artifact Checklist

Use this checklist to decide whether the current request can move forward or must route back to an earlier lifecycle stage.

## Artifact Readiness

| Artifact | Typical location | Ready when |
|---|---|---|
| Domain context | `CONTEXT.md` | Key domain terms, actors, workflows, and invariants are clear enough for spec / code naming |
| Discovery | `docs/discovery/<feature>-discovery.md` or issue note | User, pain, why now, MVP, non-goals, and success criteria are explicit |
| Competitive intelligence | `docs/discovery/reports/<feature>-competitive-intelligence.md`, `<feature>-competitive-matrix.md`, or ticket note | Competitors / substitutes, evidence sources, feature / pricing / positioning comparison, confidence, and spec implications are explicit |
| Spec | `docs/requirements/<feature>-spec.md`, legacy `<feature>-prd.md`, or tracker ticket | User stories, acceptance criteria, out of scope, OpenAPI impact, test decisions, and human-review points are clear |
| Business architecture | `docs/architecture/<feature>-business-architecture.md` or spec section | User journey, value stream, roles, external systems, and capability map are clear |
| Functional architecture | `docs/architecture/<feature>-functional-architecture.md` or spec/design section | Product capabilities, module boundaries, priority, dependencies, and MVP scope are clear |
| Product overview design | `docs/design/<feature>-product-overview-design.md` | Pages, flows, states, permissions, API candidates, and spec gaps are clear |
| Prototype / interaction review | `docs/design/<feature>-prototype-review.md` or issue comment | UI paths, empty/error/loading states, permission states, and API backflow list are reviewed |
| High-fidelity HTML prototype | `docs/design/prototypes/<feature>/index.html` | Ant Design v6 interactive HTML prototype exists after low-fidelity review and before spec calibration / API Draft |
| API impact / OpenAPI Draft | `docs/api/specs/<feature>.yaml`, ticket note, or API impact record | Request/response, wrappers, errors, pagination, permissions, concurrency, and contract test seams are reviewable |
| OpenAPI Freeze | `docs/api/<feature>-openapi-freeze.md` or ticket comment | Draft has been reviewed and marked stable for frontend/backend implementation |
| Engineering baseline | `docs/architecture/<feature>-engineering-baseline-review.md` | YSS DDD module boundary, dependency direction, DTO/VO/CMD/Query conventions, and scaffold constraints are reviewed |
| System architecture | `docs/architecture/<feature>-system-overview-design.md`, `<feature>-system-architecture.md`, or `<feature>-architecture.md` | Service/module boundaries, deployment, integration, security, performance, reliability, observability, rollout, rollback, and architecture review questions are clear |
| Data architecture | `docs/architecture/<feature>-data-architecture.md` | Conceptual/logical/physical model, metadata, versioning, lineage, query, index, storage, and migration constraints are clear |
| Design review | `docs/architecture/<feature>-architecture-review.md` or ticket comment | Open questions, risks, safety red lines, and implementation constraints have an explicit review outcome |
| Vertical slice ticket | GitLab / GitHub Issue, local `tickets.md`, `docs/requirements/tickets/<feature>-slice.md`, or legacy `docs/requirements/issues/<feature>-slice.md` | Slice is end-to-end, independently demoable/verifiable, and not split by technical layer only |
| Implementation routing | `docs/requirements/tickets/<feature>-implementation-routing.md`, legacy `docs/requirements/issues/<feature>-implementation-routing.md`, `docs/templates/implementation-routing-template.md`, or ticket note | Required YSS skills, impacted frontend/backend project existence decision, scaffold initialization plan when needed, verification command, review strategy, and rollback points are clear |
| Build Architecture Checklist | `docs/implementation/<feature>-build-architecture-checklist.md`, implementation plan, or ticket note | Architecture constraints are bound to slice IDs and have status/evidence/follow-up |
| Review report | MR / PR comment, `docs/requirements/tickets/<feature>-review.md`, or legacy `docs/requirements/issues/<feature>-review.md` | Independent review covers spec fidelity, coding standards, tests, contract alignment, and safety red lines |
| Fresh verification | `docs/testing/<feature>-verification.md`, ticket / MR comment, or release note | Verification command, timestamp, result, failures, and residual risks are recorded |
| Release / rollout | `docs/releases/`, `docs/implementation/`, ticket / MR comment | Release steps, rollback, monitoring, and user-facing notes are clear when applicable |
| Retrospective | `docs/process/sprint-retros/` or ticket note | Process learnings, architecture drift, review findings, and follow-up changes are captured |

## Lifecycle Gate Checks

- Discovery is enough to explain user, pain, MVP, non-goals, success criteria, and downstream UI/API/data/architecture impact.
- Competitive intelligence uses current public evidence, separates facts from inference, and feeds spec / MVP decisions instead of becoming requirements by itself.
- Spec is enough to derive vertical slice acceptance tests and identify OpenAPI impact.
- UI work with user-facing flows has product design, interaction states, and prototype review evidence.
- API changes have OpenAPI Draft Review and Freeze evidence before implementation.
- Persistence, metadata, versioning, lineage, query, or index changes have data architecture before Repository / MyBatis implementation.
- Service boundary, integration, deployment, reliability, performance, or operations changes have system architecture before implementation.
- Vertical slice tickets are end-to-end and independently verifiable.
- Impacted frontend/backend runtime projects are confirmed to exist and be reusable before implementation; otherwise scaffold initialization is recorded and completed first.
- Backend build, test, OpenAPI generation, CI, review, and release commands use the backend repository root `./mvnw ...`; bare `mvn ...` has a documented controlled exception or is corrected before implementation / completion.
- Durable project documents use Chinese body text and Chinese section titles; English skill/template wording is treated as source guidance and not copied verbatim into deliverables.
- `yss-router` has selected the minimal YSS implementation skills before frontend/backend implementation when multiple YSS areas are touched.
- Build Architecture Checklist is established before implementing high-risk or architecture-sensitive slices.
- Fresh verification evidence exists before any complete / merge / release claim.
- Excalidraw diagrams, when used, are referenced by the corresponding Discovery, spec, design, architecture, or ticket artifact and do not stand alone as decisions.

## Missing Artifact Response

When an artifact is missing:

1. Identify the earliest impacted lifecycle stage.
2. State whether the missing artifact blocks implementation or can be lightweight.
3. Route to the smallest useful skill or artifact.
4. Give the user a ready-to-use prompt in Chinese.
5. Record Git checkpoint status if any persistent artifact is created.
