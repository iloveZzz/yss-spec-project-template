# Modeling Workflow

Use this reference to turn PRD/RDD/OpenAPI/page flow/DDL/current code into a YSS domain model brief.

## 1. Read Inputs

Collect only the inputs needed for the current task:

- PRD, user stories, acceptance criteria, and non-scope.
- RDD Spec, OpenAPI, state machine, error codes, and business rules.
- Page flow, form fields, table columns, actions, permissions, and visible states.
- Existing `CONTEXT.md`, `CONTEXT-MAP.md`, ADRs, and related code.
- DDL or metadata as supporting evidence, not as the source of truth.

If inputs conflict, surface the conflict instead of silently choosing one.

## 2. Extract Ubiquitous Language

Identify:

- Canonical business terms.
- Synonyms and words to avoid.
- Overloaded terms that need disambiguation.
- Terms already defined in `CONTEXT.md`.
- Terms that should be added or changed in `CONTEXT.md`.

Keep definitions business-focused. Do not add generic technical terms.

## 3. Identify Context Boundaries

For each candidate bounded context, define:

- What it owns.
- What it explicitly does not own.
- Which other contexts or systems it depends on.
- Which data or concepts are referenced by ID only.
- Whether the boundary is uncertain and needs human confirmation.

Prefer a clear boundary over a large all-purpose domain.

## 4. Model Aggregates

For each aggregate, identify:

- Aggregate root.
- Entities contained by the aggregate.
- Value objects.
- Invariants that must always hold.
- Commands or domain behaviors that change state.
- Queries that should stay outside the aggregate when they do not express behavior.

Reject models that only expose CRUD and have no business behavior.

## 5. Model Behavior And State

For each important behavior:

- Name it in business language.
- Define preconditions.
- Define resulting state or output.
- Define failure paths and business errors.
- Define permissions if the behavior is user-initiated.

For stateful objects, record allowed transitions and forbidden transitions.

## 6. Identify Domain Gateways

Define gateways from the domain's point of view:

- What capability the domain needs.
- Input and output concepts.
- Whether the capability is a query, command, integration, or policy lookup.

Do not expose Repository, Mapper, SQL, HTTP client, cache, or implementation details in the gateway name or method intent.

## 7. Identify Events And Decisions

Suggest domain events only when another boundary needs to react to a meaningful business fact.

Suggest ADRs when a decision is hard to reverse, surprising without context, and caused by a real trade-off.

## 8. Produce Handoff

End with a handoff that tells the implementer:

- Which skill to call next.
- Which packages or modules are likely involved.
- Which model decisions are stable.
- Which questions must be confirmed before coding.
- Which safety or human-review gates apply.
