# Lint

From the repo root, run this skill's scripts (resolve `<skill-root>` from the directory that contains `SKILL.md`):

```bash
node <skill-root>/scripts/lint-wikilinks.mjs <wiki-root>
node <skill-root>/scripts/advise.mjs <wiki-root>
```

`lint-wikilinks.mjs` exit 0 only when every structural check below passes. `advise.mjs` always prints JSON and exits `0` when the report is valid (exit `2` is a script error). Advise never fails lint and never auto-fixes.

## Script checks

- Every `[[target]]` in articles and `index.md` resolves to `wiki/target.md` (infrastructure filenames are not valid article targets). Cross-path targets such as `[[../other]]` fail; they are not ignored.
- Every article H1 equals the article id (filename without `.md`).
- Every `[[wikilink]]` in `index.md` exists on disk.
- Every article file appears in `index.md`. Orphans fail.
- Every article has a `## 来源` heading.
- Infrastructure files are not articles: `index.md`, `log.md`, `CLAUDE.md`, `AGENTS.md`, `soul.md`, `concept-table.md`.
- Missing `## Status` is not a failure.
- If `.wiki-manifest.json` exists:
  - each `articles[].file` exists; each `sources[].livePath` exists when set; `sha256` mismatch is stale (fail)
  - every non-infrastructure `wiki/*.md` appears in `articles[]`
  - each `articles[].id` equals the basename of `file` without `.md`
  - each `sourceIds[]` exists in `sources[].id`
  - `profile === "documents"` forbids `kind: code-surface`
  - `kind: document|derived` requires a `rawPath` whose file exists; `code-surface` requires `rawPath == null`
  - `kind: derived` requires `extract.kind` in `skill-names` | `heading-list` | `prose-note`

`STALE HASH` during lint means the wiki is being claimed healthy while live files drifted. That is separate from `inventory.mjs status`, which reports the same drift with exit `0`.

## Advise (do not repair)

After the structural script, run `advise.mjs` and report the counts. JSON keys:

- `oneWayLinks`: article A → B and B has no link back to A. `index.md` links do not count as backlinks.
- `missingTermPages`: backtick identifiers, `**bold**` phrases, or `##` headings that appear at least twice and are not an article id.
- `unreferencedRaws`: manifest `rawPath` values not cited in any article `## 来源`.
- `suspects`: high-signal literals (number+suffix such as `42K`, ISO dates, quoted strings of length ≥ 12) in the article body that do not appear in the cited live/raw files.

Do not create pages. Do not rewrite numbers. Do not promote `suspects` to lint exit 1.

## Agent checks (after scripts)

From changed pages, sample `N = min(5, changed page count)` claims against **live** files, not against the wiki text just written.

Look for: enum members, HTTP statuses, "persisted vs in-memory", hardcoded vs configured values, freeze coverage vs extra controllers. Advise cannot replace this pass.

## Repair

- Broken wikilink: add the page, retarget, or remove the link. Do not leave dangling `[[...]]`.
- Stale hash: run refresh on that source, or `inventory.mjs hash` after a deliberate raw sync.
- Missing manifest on an otherwise valid wiki: reconstruct from「来源」or rebuild. Do not invent mappings.
- Advise findings: report only, unless the user asked to act on a specific item.
