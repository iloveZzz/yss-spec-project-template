# Wiki schema

Karpathy three-layer wiki. Detectable by `index.md`, `[[wikilink]]`, optional `raw/`, and `CLAUDE.md` or `AGENTS.md`.

## Layers

- **raw/** — immutable sources. The agent reads them; it does not edit them to "fix" facts. Wrong facts are fixed by recompiling the wiki from live paths. Allowed contents: copies of documents, and derived extracts that name their live inputs and an `extract` recipe (see [compile.md](compile.md)).
- **wiki/** — LLM-owned markdown. Humans read; the agent writes. Article id = filename without `.md`, globally unique. Infrastructure files are not articles: `index.md`, `log.md`, `CLAUDE.md`, `AGENTS.md`, `soul.md`.
- **schema** — `wiki/CLAUDE.md` (this repo also accepts `AGENTS.md`). Conventions for ingest, refresh, rebuild, and lint. Co-evolve it with the domain; start from `assets/CLAUDE.md.template`.
- **.wiki-manifest.json** — compile graph, sibling of `raw/` and `wiki/`. Not an article. Not a raw source.

## index.md

`##` headings are categories (taxonomy). Listed `[[wikilink]]` assign articles to categories. Categories come from index headings, not filename prefixes.

## log.md

Append-only. Format: `## [YYYY-MM-DD] OPERATION | 描述`

Operations: `CREATE` `UPDATE` `LINK` `FIX` `REFRESH` `REBUILD` `RETIRE` `LINT`.

## Articles

1. `# H1` then a one-paragraph summary (parsers use this as summary).
2. Body uses `[[ArticleId]]`. Target must be a wiki article filename without `.md`.
3. Every claim traces to `raw/` or a live code path. End with a `## 来源` section.
4. Optional YAML frontmatter: `human-owned: true` — refresh/rebuild must not rewrite the body; they may fix wikilinks only.

## Language

Body language follows the host project's document-language rule. Keep identifiers, enums, table names, API paths, and filenames verbatim.
