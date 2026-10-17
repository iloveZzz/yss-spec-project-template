# YSS Spec Project Template (English overview)

This repository is the **template source** for YSS spec-driven development projects. It holds the lifecycle contracts, gates, document templates and Agent skills that the `yss` CLI packs into new project instances. Day-to-day documentation is written in Simplified Chinese; this page is a short English entry point.

## What you get

- **Two delivery paths, chosen per task.** `yss lifecycle route` sends a low-risk change down the *daily* path (one ticket/PR: requirements and acceptance, implementation, tests, independent review). Anything touching data migration, multiple repositories, permissions, release or incompatible APIs goes down the *governed* path (staged lifecycle with gates and approvals). A governed task can never be downgraded.
- **Contract-first APIs.** OpenAPI 3.1 drafts are validated, independently reviewed and digest-frozen before implementation.
- **Evidence bound to bytes.** Approvals and verification results record digests; changing the inputs invalidates them.
- **Agent skills** in `.agents/skills` (canonical). Claude Code reads them through the generated links in `.claude/skills`; Codex, Cursor and Pi read `.agents/skills` directly.

## Start here

1. Install the CLI: see the [yss quickstart (English)](https://github.com/iloveZzz/yss-cli/blob/main/docs/quickstart.en.md).
2. Create an instance: `yss init --profile spec --root ./demo --project-name Demo`.
3. Follow the first-task walkthrough in [从这里开始](.template-spec/user-guide/用户手册索引.md) (Chinese).
4. Look up unfamiliar terms or stable IDs with `yss explain <term or ID>` (newer CLI versions), or read the beginner section of the [process glossary](.template-spec/process/process-glossary.md).

## Repository layout

```text
.agents/skills/      canonical Agent skills
.claude/skills/      generated links for Claude Code (do not edit)
AGENTS.md            Agent entry rules (CLAUDE.md imports it)
CONTEXT.md           business vocabulary of a project instance
.template-spec/      lifecycle contracts, templates, user guide
.template-source/    template maintenance assets (not shipped to instances)
scripts/             validators and maintenance tools
profiles/            design and backend profile overlays
```

## Maintainers

Edit skills only under `.agents/skills`, then run `scripts/sync-skills` and `scripts/update-skill-lock`. Before committing, run `scripts/verify-template-fast --plan` and the checks it selects. See [README.md](README.md) for the full (Chinese) maintenance guide.
