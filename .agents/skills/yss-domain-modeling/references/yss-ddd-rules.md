# YSS DDD Rules

Use these rules as gates while modeling YSS backend domains.

## Core Gates

- Do not derive the whole domain model directly from database tables. DDL and metadata are supporting evidence only.
- Do not create a CRUD-only model. Identify business behavior, invariants, and state transitions.
- Do not leak Controller, Repository, Mapper, SQL, HTTP client, cache, or persistence details into Domain concepts.
- Do not let Domain depend on Web, Infrastructure, Repository implementation, Mapper, or Controller.
- Put business language before technical naming. Avoid table abbreviations when they hide meaning.
- Write uncertain rules as assumptions or questions. Do not present guesses as confirmed business facts.
- Suggest ADR for major boundary decisions, irreversible choices, or non-obvious trade-offs.
- Suggest `CONTEXT.md` updates for new or sharpened domain terms.

## Modeling Heuristics

- Treat user actions, page buttons, API commands, and state changes as clues for domain behavior.
- Treat validation rules that protect business truth as candidate invariants.
- Treat fields that only support display, search, sorting, or pagination as query/view concerns unless they affect behavior.
- Prefer small cohesive aggregates over a large aggregate that owns unrelated lifecycle rules.
- Use a Domain Service when behavior coordinates multiple aggregates or external policies and does not naturally belong to one aggregate.
- Use a Value Object for identity-free concepts with validation or equality semantics, such as ranges, labels, rule parameters, or composite codes.
- Use a Domain Event for meaningful facts another boundary should react to, not for every method call.

## Gateway Rules

- Name gateways after domain capability, not storage mechanism.
- Gateway methods should describe what the domain needs, not how data is fetched.
- Query-oriented gateways may return VO/DTO shapes only when that is the established YSS convention; keep domain behavior independent of view concerns.
- Do not expose SQL condition builders, Mapper names, table names, or pagination plugins in the gateway contract.

## Safety Gates

- Raw SQL, database migration scripts, auth/permission rules, encryption/security algorithms, payment-like resource operations, and public base-library API changes require human review.
- If security or data impact cannot be confirmed, mark the item as requiring human confirmation before implementation.
