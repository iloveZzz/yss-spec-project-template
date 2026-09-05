# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** — the single case-sensitive glossary at the Git repository root. Its `context_schema_version` must be supported. A missing root file, lowercase or nested replacement, duplicate, or map-based layout is `blocked` / `migration-required`, not an optional omission.
- **`docs/adr/`** — if it exists, read ADRs that touch the area you're about to work in. This directory is created lazily when the first qualifying decision is accepted.

When the repository exposes `scripts/verify-context-contract`, run it before creating or changing stable domain, product, architecture, implementation, review, release, or retrospective assets.

## File structure

Every YSS Git repository:

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multiple business responsibility areas do not create additional glossary files. Each stable business term records its approved PascalCase `适用业务责任区`, and consumers reference it as `<ContextId>/<EnglishIdentifier>`. Use `Global/<EnglishIdentifier>` only for language that is genuinely shared across responsibility areas.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term and stable reference defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
