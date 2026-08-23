# Ingest

Ingest is a compile mode. It adds a user-named external source or an already-written research note to the wiki. It does not replace `refresh`.

Query must not ingest. Mapped live sources that changed go to `refresh`.

## Allowed inputs

- A URL, paste, or file outside the repo that the user named in this turn.
- An already-written research note on disk (for example under the host's research archive). One-off fact gathering still belongs to the host's research skill; ingest only compiles a note that already exists.

Forbidden inputs: `docs/reviews/`, `docs/.scratch/`, agent projection directories, lock files as documents, and any live authoritative file that is already a manifest `livePath`.

Do not treat a web search as this skill's `refresh`. Confirm new web material as a named input first.

## Done when

`raw/` has the copy or labelled extract, the manifest lists the source, triage is recorded, confirmed pages are written (or none if the user declined), structural lint exits 0, advise has been run, and `log.md` has `INGEST`.

## Steps

1. Detect the wiki. No `wiki/index.md` → suggest `init`. Stop.
2. If the path is already a manifest `livePath` → stop and use `refresh`.
3. Write `raw/` as a copy or a labelled extract. Do not invent `extract.kind` values. Do not edit live authoritative files.
4. Add a manifest source (`kind: document` or `derived`) with `livePath` (repo-relative when the file is in-repo; otherwise leave a labelled extract and record the origin in the extract header). Do not create a second config file (`inbox.md`, YAML sidecars). The pending queue is the new source plus the log.
5. Run `inventory.mjs status --wiki <wiki-root> --candidate <livePath>` if the input is in-repo. Assign each unmapped path or new source one triage: `New` / `Update` / `Disputed` / `No material`.
6. Show the candidate article list. **Stop until the user confirms.** Unconfirmed ingest changes zero article bytes. `No material` writes log only.
7. After confirmation: write or update only the confirmed pages. Use `## Status` when triage is `Disputed`. Follow [writing.md](writing.md).
8. `inventory.mjs hash`. Structural lint. Advise (report counts). Sample live/raw facts on changed pages. Append:

```
## [YYYY-MM-DD] INGEST | <summary>
- source: <sourceId>
- disposition: New|Update|Disputed|No material
- articles: <articleId>, ...
```
