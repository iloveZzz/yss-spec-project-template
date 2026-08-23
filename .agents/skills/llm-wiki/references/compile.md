# Compile modes

Manifest schema is the incremental-compile graph. The agent fills `id`, `kind`, `livePath`, `rawPath`, `role`, `articles`. Scripts fill `sha256`, `compiledAt`, `gitCommit`.

## Manifest

Path: `<wiki-root>/.wiki-manifest.json`

```json
{
  "schemaVersion": 1,
  "wikiRoot": "wiki/example",
  "compiledAt": "ISO-8601",
  "gitCommit": "hex or empty",
  "profile": "mixed",
  "sources": [
    {
      "id": "schema.sql",
      "kind": "document",
      "livePath": "apps/.../schema.sql",
      "rawPath": "raw/schema.sql",
      "sha256": "...",
      "role": "copy"
    }
  ],
  "articles": [
    {
      "id": "连接器管理",
      "file": "wiki/连接器管理.md",
      "sourceIds": ["schema.sql"],
      "humanOwned": false
    }
  ]
}
```

`profile`: `mixed` (docs + code), `documents`, `code`.

Source kinds:

| kind | raw | when it drifts |
|---|---|---|
| `document` | copy of `livePath` | sync raw, rewrite articles that list this `id` |
| `derived` | extract from `livePath` | re-run extract, rewrite dependents |
| `code-surface` | none (`rawPath` null) | rewrite dependents; do not copy source into raw |

`livePath` is repo-relative. `rawPath` is wiki-root-relative. `file` is wiki-root-relative.

Article id = basename of `file` without `.md`. Renames are explicit `LINK` / `RETIRE`, never a silent refresh side effect.

## init

Done when the target is a detectable Karpathy wiki and lint exits 0.

1. If `wiki/index.md` already exists: ask refresh vs rebuild. Do not init over it.
2. Ask: wiki path, corpus roots, coverage, language (default 简体中文).
3. Discover corpus: README, API, schema, OpenAPI, ADR, bootstrap; plus code surfaces (packages, enums, application services, controllers).
4. Write raw copies/extracts. Write manifest source list. Run `inventory.mjs hash`.
5. Write `wiki/CLAUDE.md` from the template, adapted to this corpus — do not hard-code a previous product name.
6. Write `index.md` categories first, then articles. Categories are index `##` headings.
7. Orchestrator writes hub pages. Other pages go to subagents with disjoint file lists ([writing.md](writing.md)).
8. Lint. Sample live-source facts. Append `log.md` `CREATE`.

## refresh

Done when only drift-hit articles change, human-owned pages are untouched, lint exits 0, and log has `REFRESH`.

1. No manifest → stop. Rebuild, or rebuild the manifest from existing「来源」sections. Do not invent `sourceIds`.
2. `inventory.mjs drift` against every `livePath`.
3. Impact set = articles whose `sourceIds` intersect changed/missing sources.
4. For `document` / `derived`: update raw first, then rewrite hit articles.
5. New live files with no article mapping → list candidate pages; do not create them silently.
6. Deleted sources → mark missing in citing articles; do not delete pages silently.
7. Unhit articles: zero bytes changed.
8. Rewrite is not "rewrite the whole wiki and call it refresh".
9. Lint. Sample facts on hit pages. Append `REFRESH`.

## rebuild

Done when raw matches live, LLM-owned pages are rewritten, stable ids and human-owned pages remain, lint exits 0, and log has `REBUILD`.

1. Rediscover corpus. Do not trust the old source list as complete.
2. Recopy / re-extract raw.
3. Keep article ids that still earn a page. Retired ids: `RETIRE` in log, drop from index.
4. `humanOwned: true` (frontmatter or manifest): fix wikilinks only.
5. Rewrite remaining articles. Rebuild index (categories may evolve).
6. Replace manifest via `inventory.mjs hash`.
7. Full lint + sample + `REBUILD`.

rebuild is not `rm -rf wiki`. Stable ids keep old `[[wikilink]]` and external links valid.
