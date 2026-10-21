---
tracker:
  platform: local-markdown
  root: .work
  legacy_roots:
    - .scratch
    - docs/requirements/tickets
  remote_mirror: false
---

功能包根只从 `.template-spec/agents/issue-tracker.md` 的 `tracker.root` 读取；本文 `.work/` 路径是新项目示例，已有项目沿用已配置的根。

# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.work/`.

The persisted tracker configuration above is authoritative. A Git remote is a code host only; do not switch to GitHub or GitLab unless the project configuration is explicitly changed.

The legacy roots above are read-only migration sources. New Local Markdown output must use `.work/`; if legacy and canonical assets coexist, return `conflict` instead of overwriting either side.

## Conventions

- One feature per directory: `.work/<feature-slug>/`
- The spec is `.work/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.work/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## YSS lifecycle extension

When `yss-product-lifecycle` is active, the same `.work/<feature-slug>/` directory is the complete local feature package. Keep the Matt files above and use these lifecycle evidence directories:

```text
.work/<feature-slug>/
├── map.md
├── plan/
├── spec.md
├── spec-delta/
├── parent-ticket.md
├── design/
├── api/
├── architecture/
├── gates/
├── verification/
└── issues/01-<slug>.md
```

`parent-ticket.md` is the local functional parent Ticket. The lifecycle does not require a remote issue when `local-markdown` is the configured primary tracker. GitHub / GitLab URLs may be recorded as optional mirrors without changing local authority.

## When a skill says "publish to the issue tracker"

Create a new file under `.work/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.work/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.work/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- Wayfinder's `Status: claimed/resolved` is a temporary work state, not one of the five triage roles. Promote a child ticket to a canonical triage `Status:` before using it as a delivery Ticket.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.work/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
