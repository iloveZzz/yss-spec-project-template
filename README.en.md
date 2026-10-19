# YSS Spec Project Template (English overview)

This repository is the **template source** for YSS spec-driven development projects. It holds the lifecycle contracts, gates, document templates and Agent skills that the `yss` CLI packs into new project instances. Day-to-day documentation is written in Simplified Chinese; this page is a short English entry point.

The current positioning hypothesis is governance for Chinese-speaking enterprise backend teams using AI agents: choose a workflow by risk and connect specifications, API contracts, implementation and delivery evidence. The [isolated engineering case](.template-spec/user-guide/cases/contract-governance-validation.md) records normal behavior, refusal, recovery and operating cost. Team fit and business productivity gains remain unproven.

## What you get

- **Three delivery paths, chosen per task.** With matching CLI and instance policies, `yss lifecycle route` selects *daily*, *standard* or *governed*. Daily keeps requirements, acceptance, implementation, tests and applicable review in one ticket/PR. Standard adds a Spec-lite and one real human decision bound to it. Governed handles staged work and excluded risks, including data migration, multiple repositories, permissions, release and incompatible APIs. `needs-info` means facts are missing; it is not another delivery path. An existing governed task cannot be downgraded.
- **Contract-first APIs.** OpenAPI 3.1 drafts are validated, reviewed for content and digest-frozen before implementation. Applicable review defaults to honest self-review; an explicit user request or external rule can require an independent context.
- **Evidence bound to bytes.** Approvals and verification results record digests; changing the inputs invalidates them.
- **Agent skills** in `.agents/skills` (canonical). Claude Code reads them through the generated links in `.claude/skills`; Codex, Cursor and Pi read `.agents/skills` directly.

## Start here

1. Install the CLI: see the [yss quickstart (English)](https://github.com/iloveZzz/yss-cli/blob/main/docs/quickstart.en.md).
2. Create an instance: `yss init --profile spec --root ./demo --project-name Demo`.
3. Follow the first-task walkthrough in [从这里开始](.template-spec/user-guide/用户手册索引.md) (Chinese).
4. Look up unfamiliar terms or stable IDs with `yss explain <term or ID>` (newer CLI versions), or read the beginner section of the [process glossary](.template-spec/process/process-glossary.md).

New instances use Spec or Backend. Spec owns product design; legacy Design instances retain their history and require explicit migration to Spec.

## Repository layout

```text
.agents/skills/      canonical Agent skills
.claude/skills/      generated links for Claude Code (do not edit)
AGENTS.md            Agent entry rules (CLAUDE.md imports it)
CONTEXT.md           business vocabulary of a project instance
.template-spec/      lifecycle contracts, templates, user guide
.template-source/    template maintenance assets (not shipped to instances)
scripts/             validators and maintenance tools
profiles/            backend overlay and retained legacy compatibility assets
```

## Maintainers

Edit skills only under `.agents/skills`, then run `scripts/sync-skills` and `scripts/update-skill-lock`. Before committing, run `scripts/verify-template-fast --plan` and the checks it selects. See [README.md](README.md) for the full (Chinese) maintenance guide.
