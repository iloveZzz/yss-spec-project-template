# Lint

Run from repo root:

```bash
node .agents/skills/llm-wiki/scripts/lint-wikilinks.mjs <wiki-root>
```

Exit 0 only when every check below passes.

## Script checks

- Every `[[target]]` in articles and `index.md` resolves to `wiki/target.md` (infrastructure filenames are not valid article targets). Cross-path targets such as `[[../other]]` fail; they are not ignored.
- Every article H1 equals the article id (filename without `.md`).
- Every `[[wikilink]]` in `index.md` exists on disk.
- Every article file appears in `index.md`. Orphans fail.
- Every article has a `## 来源` heading.
- If `.wiki-manifest.json` exists: each `articles[].file` exists; each `sources[].livePath` exists when set; `sha256` mismatch is stale (fail).

## Agent checks (after script)

From changed pages, sample `N = min(5, changed page count)` claims against **live** files, not against the wiki text just written.

Look for: enum members, HTTP statuses, "persisted vs in-memory", hardcoded vs configured values, freeze coverage vs extra controllers.

## Repair

- Broken wikilink: add the page, retarget, or remove the link. Do not leave dangling `[[...]]`.
- Stale hash: run refresh on that source, or `inventory.mjs hash` after a deliberate raw sync.
- Missing manifest on an otherwise valid wiki: reconstruct from「来源」or rebuild. Do not invent mappings.
