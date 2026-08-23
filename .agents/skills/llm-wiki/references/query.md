# Query

Query is not a compile mode. It reads the wiki; it does not write `raw/`, articles, `index.md`, `log.md`, or `.wiki-manifest.json`.

Use this algorithm when the user asks a repository question and a wiki exists, or asks to answer from the wiki. Do not open the whole corpus, and do not treat wiki prose as live fact.

## Steps

1. **Detect.** If `wiki/index.md` is absent, say the question is outside query: no wiki exists. Suggest `init`. Stop.

2. **Freshness.** If `.wiki-manifest.json` exists, run `inventory.mjs drift --wiki <wiki-root>`. Read the JSON: non-empty `changed` or `missing` means stale. Drift exits `0` when the report is valid; that is not a failure. Exit `2` is a script error. Name the drifted sources, ask whether to `refresh`, and do not present drifted pages as current fact. If the user still wants an answer, mark every claim that depends on a drifted source as stale.

3. **Select pages.** Match proper nouns and distinctive terms in the question against `index.md` category headings (`##`) and `[[wikilink]]` targets. Open at most `N = min(8, hit count)` articles. Do not open the whole wiki. Do not answer from one summary paragraph when more hit pages exist.

4. **Verify claims.** For each assertion, re-read the live paths in that page's `## 来源` (repo-relative live files, not the wiki sentence). If wiki text conflicts with live, cite live and record wiki drift. Do not rewrite the wiki during query.

5. **Zero hits.** Say the current wiki does not cover the question. List the index categories considered. Do not invent article ids, pages, or facts.

## Done when

The answer cites the pages actually opened and the live sources actually re-read, or it states non-coverage. Query never completes via lint, `CREATE`, `REFRESH`, or `REBUILD`.
