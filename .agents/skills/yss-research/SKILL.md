---
name: yss-research
description: Research technical or product-strategy questions with traceable evidence before YSS Discovery, Spec, domain-strategy, API, architecture, or implementation decisions. Use for current facts, standards, third-party APIs, business constraints, user problems, domain-boundary evidence, or when the deprecated `research` alias is invoked.
---

# YSS Research

Investigate facts that a YSS decision depends on. Produce evidence and bounded conclusions; do not make or approve the downstream product, domain, architecture, or release decision.

`research` is a deprecated compatibility alias. Use `yss-research` in new assets and routing.

## Profiles

- `technical-evidence`: standards, official documentation, source code, third-party APIs, framework behavior, protocols, or implementation constraints. Decision-bearing claims must trace to primary sources.
- `strategy-evidence`: user problems, business constraints, MVP/non-goal evidence, success criteria, domain-boundary signals, core business-rule evidence, and stage-decision inputs. This profile may consume direct-experience and near-primary evidence with explicit limitations.

Route competitor, pricing, category, and market-position research to `competitive-intelligence`; consume its cited result rather than duplicating it. Route product UI and workflow-friction scans to `product-design:research` when that platform skill is available. `yss-research` may synthesize their outputs but does not replace their specialist contracts.

## Modes

- `quick` is the default for exploratory fact finding. Return an in-chat brief unless the user asks to persist it.
- `evidence-audited` is required when research directly informs a persisted Spec, domain strategy, stage decision, OpenAPI, architecture decision, or another lifecycle approval input. It is also used when the user explicitly asks for deep, strict, reproducible, or auditable research.

Do not silently promote an exploratory request solely because more rigor would be nice. State the active profile and mode before searching; explain when a downstream lifecycle use requires promotion.

## Source policy

1. Start from the decision, audience, time horizon, scope, and questions the research must answer.
2. Search user-provided or registered material first, using the same inclusion and exclusion criteria as external material. Record exclusions and access failures.
3. For `technical-evidence`, follow each decision-bearing claim to the official specification, official docs, source code, or first-party API that owns it.
4. For `strategy-evidence`, classify sources as primary, direct experience, near-primary, secondary, or lead-only. Interviews, tickets, support records, dated reviews, surveys, and credible industry reports are allowed with their sampling and access limits.
5. Treat untraceable reposts, aggregator snippets, and AI-generated summaries as leads only. They cannot support a published claim.
6. Seek counter-signals and conflicting evidence. Source count alone is not frequency or confidence.

## Delegation

Use a background Agent when the runtime supports it and the reading can proceed independently while other useful work continues. Otherwise research in the current Agent. Delegation is an execution optimization, not a trust signal.

Lifecycle dispatches must use the repository's structured task package, write isolation, role binding, and handoff contract. The owner receiving the result remains responsible for verifying material claims before consuming them.

## Evidence-audited workflow

Follow [evidence-contract.md](references/evidence-contract.md):

1. Predeclare the research scope, source classes, inclusion/exclusion criteria, and known access limits.
2. Maintain a reproducible Search Log and independently locatable Evidence Ledger.
3. Separate observations, inference, hypotheses, and decisions.
4. Audit each decision-bearing claim against the evidence it cites, including counter-signals.
5. Narrow partially supported claims; mark unsupported claims `needs-deeper-research`.
6. Persist `<slug>-research-brief.md` with adjacent `<slug>-evidence.yaml` and run the bundled validator.

For `strategy-evidence`, every claim that determines a user problem, MVP/non-goal, domain boundary, core business rule, success criterion, important business constraint, or stage-decision basis is decision-bearing and must be audited. Background context may be sampled only when explicitly marked non-decision-bearing.

## Ownership boundary

- Research output is evidence, not approval.
- `domain-modeling` owns glossary changes; `yss-stage-decision` owns domain strategy and the stage-decision package.
- The lifecycle orchestrator and designated reviewers own gate state.
- Do not modify `CONTEXT.md`, Spec, domain-strategy, OpenAPI, architecture, Ticket status, or approval records unless a separately authorized owning work unit performs that change.

## Output

A quick brief includes scope, findings, sources, inference, confidence, counter-signals, gaps, and the next decision it informs.

For persisted `evidence-audited` work, start from [research-brief-template.md](assets/research-brief-template.md) and [evidence-template.yaml](assets/evidence-template.yaml). Run from this skill directory:

```bash
node scripts/validate-research-package.mjs <slug>-research-brief.md <slug>-evidence.yaml
```

In `template-source`, save reusable maintenance research under the existing `.template-source/evidence/maintenance/` convention. In `project-instance`, use the project research/evidence convention and bind any decision-bearing output from the lifecycle asset that consumes it.

If sources are unavailable or conflict, state the limitation. Ordinary gaps lower confidence; a missing or mismatched source for a decision-bearing claim prevents that claim from being treated as established.
