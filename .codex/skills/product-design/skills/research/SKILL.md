---
name: research
description: "Run fast, source-grounded UX research on the highest-signal problems users are experiencing with a user-specified digital product. Use when the user asks to research user pain, UX friction, onboarding issues, docs/help problems, developer experience friction, support pain, product workflow issues, or current user complaints for a named product."
---

# Research

Run a fresh UX research scan for the product the user specifies.

Focus on current, evidence-backed user problems. Prioritize logged-in product experience, self-serve flows, onboarding, docs/help, developer experience, support friction, and product workflows.

## Modes

- `quick` is the default. It produces a sharp in-chat brief from the best available current evidence.
- `evidence-audited` is opt-in. Use it only when the user explicitly asks for deep, strict, auditable, or `evidence-audited` research. For consequential product or investment decisions, recommend this mode but do not switch silently.

Both modes remain UX research workflows. Do not import academic-paper writing, peer-review, publication, or multi-agent ceremony.

## Critical Overrides

- Refer to the Plugin router [$index](../index/SKILL.md) before proceeding.
- Follow [$critical-overrides](../../references/critical-overrides.md).

## User Context

Before starting, load [$user-context](../user-context/SKILL.md) and run its preflight script when local shell access is available.

Use saved product URLs, Figma files, screenshots, reference images, codebase paths, Storybook, tokens, design systems, brand assets, component refs, browser preferences, and share targets as grounding material when relevant.

Do not inspect every saved reference. Inspect only what the current task needs.

## Contract

- Restate the product, audience, time horizon, and research scope before scanning.
- State the active mode. In `evidence-audited`, also state the planned source classes and inclusion/exclusion criteria before searching.
- Use public sources by default. Use internal sources when the connectors are available and the user request allows it.
- Search user-provided or saved material first, apply the same inclusion criteria to it, then search externally to fill material gaps. Never silently omit supplied material; report exclusions or access failures.
- Cite sources wherever available.
- Separate observed evidence from inference.
- Do not overclaim from anecdotes.
- Do not return a dump of complaints. Tell a clear product story.
- Say clearly when source access is missing or weak.

## Workflow

1. Restate the research scope.

2. Search public sources:

- Reddit
- X/Twitter
- Hacker News
- Stack Overflow
- GitHub issues/discussions
- forums, blogs, reviews, YouTube comments, and developer communities where relevant

3. Search internal sources when available:

- Slack
- Gong
- Notion
- Google Drive/docs
- Linear/Jira/GitHub
- support or CRM notes if available

4. Cluster evidence into the highest-signal UX problems.

5. Separate:

- product UI/workflow friction
- docs/help friction
- onboarding friction
- account, billing, permissions, or setup friction
- developer/API/SDK friction
- reliability/performance issues
- feature requests

6. Rank problems by severity, frequency, confidence, and product leverage.

7. Tell a clear product story.

For `evidence-audited` mode, follow [evidence-audited.md](references/evidence-audited.md) after scope restatement. This adds a reproducible Search Log, an Evidence Ledger, key-claim audit, counter-signal handling, and an explicit failure policy. It does not require sentence-by-sentence auditing.

## Output

Default to an in-chat research brief unless the user asks for another format.

Include:

- Executive read: the core story in 5-7 sentences.
- Ranked UX problems: for each problem, include the problem, user goal, surface, what breaks, evidence, severity, frequency signal, confidence, and recommended product move.
- Source map: what was searched, what each source contributed, and where signal was weak.
- Opportunity map: group recommendations into fix this week, fix this quarter, and needs deeper research.

When the user explicitly asks to persist an `evidence-audited` result, create two adjacent files named `<slug>-research-brief.md` and `<slug>-evidence.yaml`. Start from [research-brief-template.md](assets/research-brief-template.md) and [evidence-template.yaml](assets/evidence-template.yaml), then run:

```bash
node scripts/validate-research-package.mjs <slug>-research-brief.md <slug>-evidence.yaml
```

Run the command from this skill directory. Do not persist research files merely because `evidence-audited` mode is active.

## Rules

- Use citations wherever available.
- Do not overclaim from anecdotes.
- Separate loud complaints from frequent problems.
- Separate UX friction from missing features.
- Separate reliability/performance issues from UX workflow issues.
- Mark internal-only evidence separately from public evidence.
- Do not equate source count with frequency. State whether frequency is measured, repeated across independent sources, or anecdotal.
- In `evidence-audited` mode, audit the key claims for every ranked problem: problem existence, impact, frequency characterization, and the evidence basis for the recommended move. Audit every high-severity key claim; for lower-severity problems include at least one primary supporting item and one counter-signal or an explicit `none-found` search result.
- Unsupported key claims must use `needs-deeper-research`; partially supported claims must be qualified. Never label a persisted package audited when its validator has not passed.
- Keep the brief sharp, specific, and easy to consume.
