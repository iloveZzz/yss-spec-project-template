# Evidence-Audited UX Research

Use this protocol only when the caller explicitly selects `evidence-audited` mode. The goal is an auditable UX brief, not an academic literature review.

## 1. Search plan

Before searching, declare:

- product, audience, time horizon, geography or platform boundaries, and research questions;
- source classes likely to carry direct user or product evidence;
- inclusion and exclusion criteria;
- known access limits, including unavailable internal sources.

Search user-provided and saved material first. Apply the same inclusion and exclusion criteria to supplied and externally discovered material. Search externally to fill gaps, check recency, and seek disconfirming evidence. Record unsuccessful searches and access failures; they bound the conclusion.

## 2. Search Log

Record every material search with its channel, query or inspected corpus, execution date, scope, and result. A zero-result search is still a result. Do not claim that a channel was searched when only an aggregator snippet was inspected.

## 3. Evidence Ledger

Create one evidence item per independently locatable observation. Each item records:

- a stable ID;
- public or internal visibility, source class, and source level (`primary`, `direct-experience`, `near-primary`, `secondary`, or `lead-only`);
- source URL or internal reference plus a precise locator;
- observation date and publication/event date when available;
- whether the item supports or counters the mapped claim;
- the observed evidence, without interpretation;
- freshness and access limitations.

Keep inference in claims, not in evidence observations. Short quotations may support location and meaning, but respect source quotation limits.

## 4. Key-claim audit

Audit the decision-bearing claims for each ranked problem rather than every sentence:

1. the problem exists;
2. the asserted impact;
3. the frequency characterization;
4. the evidence basis for the recommended product move.

For every high-severity problem, audit all four claim kinds. For lower-severity problems, audit at least one `primary` supporting item and one counter-signal. `lead-only` items may guide discovery but cannot support a claim. When no counter-signal is found, reference a Search Log entry whose result is `none-found`; absence of a found counter-signal is not proof that none exists.

Use these audit outcomes:

- `supported`: cited evidence directly supports the claim as worded;
- `partially-supported`: evidence supports a narrower or qualified claim;
- `unsupported`: evidence does not support the claim;
- `not-audited`: allowed only before the audit is complete.

Every evidence reference must resolve to a ledger item. The audit checks support, not merely citation existence.

## 5. Frequency and confidence

Describe frequency as one of:

- `measured`: backed by a relevant dataset or metric;
- `repeated-independent`: repeated across independent sources, without a population-rate claim;
- `anecdotal`: one or a small number of reports;
- `unknown`: the available evidence cannot characterize frequency.

Rank confidence from source directness, independence, recency, access quality, and counter-signals. Do not raise confidence merely because several posts repeat the same upstream report.

## 6. Failure and downgrade policy

- Ordinary access gaps or conflicting evidence do not block the brief. Surface the gap and lower confidence.
- A partially supported claim must be narrowed and use disposition `qualify`.
- An unsupported key claim, fabricated or mismatched citation, or unverified source identity must not be presented as certain. Use disposition `needs-deeper-research`.
- A persisted package fails when its structure is invalid, references do not resolve, lower-severity problems lack primary support, a high-severity claim was not audited, or the report claims completion while an audit remains `not-audited`.

## 7. Persistence

Persist only on explicit request. Use adjacent `<slug>-research-brief.md` and `<slug>-evidence.yaml` files. The evidence file uses JSON syntax, which is valid YAML 1.2, so the bundled validator can parse it without an external YAML dependency.

The Markdown brief must mention every key-claim ID and contain the headings required by the template. The evidence file remains the source of truth for search execution, claim-to-evidence mapping, audit state, gaps, and counter-signals.

## Design provenance

This protocol adapts two engineering patterns from [Academic Research Skills](https://github.com/Imbad0202/academic-research-skills): its Material Passport-style provenance chain and claim-to-reference alignment audit. The UX workflow deliberately omits academic writing, publication, agent-team, and cross-model review machinery.
