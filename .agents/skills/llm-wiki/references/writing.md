# Writing

## Page shape

- `# H1` immediately followed by a summary paragraph.
- `[[ArticleId]]` only; no relative `[[../other-wiki]]` inside a Karpathy wiki (cross-wiki use markdown links).
- Close with `## 来源` listing raw files and live code paths actually read.
- Do not invent enum values, table names, or endpoints. If unread, write「见源码」.

## Fact order

1. Called implementation (application service, domain method, mapper SQL).
2. Table comments / OpenAPI / config defaults.
3. Stale raw copies.

A column default is not proof the runtime uses it. A freeze OpenAPI is not the full controller surface.

## Coverage

Core pages: deep (state machines, HTTP semantics, transactions). Extension pages: overview (models, enums, tables, links). Match the user's coverage choice from init.

## Subagents

When 2+ article groups have no shared files:

- Each prompt lists exact write paths. Those agents must not touch `index.md`, `log.md`, `.wiki-manifest.json`, or `CLAUDE.md`.
- Return: paths written + wikilink count per file.
- Orchestrator merges, lints, samples facts, appends log.

Use `dispatching-parallel-agents` for the dispatch shape. Write scopes must not overlap.

## Human-owned

Frontmatter `human-owned: true` or manifest `humanOwned: true`. Refresh/rebuild leave the body; they may repair `[[wikilink]]` targets only.
