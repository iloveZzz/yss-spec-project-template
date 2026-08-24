# Discover corpus

Discovery is an Agent checklist, not a scanner. Use it for `init` and `rebuild`. Confirm the answers, then write sources. Do not silently ingest every markdown file.

## Ask first

1. Wiki path (`<wiki-root>`).
2. Corpus roots the user wants covered.
3. Coverage: `core` (authoritative process / contract files) or `full` (core plus extra docs the user names).
4. Body language: follow the host project's document-language rule.

If any answer is missing, ask. Do not guess from directory names or Git remotes.

## Default include (core)

Unless the user replaces this list with the host's single source-of-truth table:

- Root authoritative files (for example `README`, `AGENTS`, `CONTEXT`, repository-identity manifest)
- `docs/adr/`
- `docs/process/`
- `docs/agents/`
- `docs/templates/`
- Frozen contracts the user names

`full` adds only roots the user listed. It is not "everything under `docs/`".

## Default exclude

- `docs/reviews/`
- `.template-source/evidence/`
- `docs/.scratch/`
- Agent projection directories (copies or symlinks of shared skills)
- `node_modules`
- Whole lock files (`package-lock.json`, `pnpm-lock.yaml`, `skills-lock.json` as a document). A lock may appear only as `kind: derived` with an `extract` recipe.

## Threshold

If the candidate `document` count would exceed 40, list the candidates and stop. Do not write `raw/`, articles, or the manifest until the user confirms the list.

## After the list is confirmed

Write raw copies or extracts, then fill manifest `sources` per [compile.md](compile.md). Derived sources need `extract`. Code surfaces are not copies.
