# YSS Research Evidence Contract

This contract defines the persisted `evidence-audited` package. The Markdown brief is the readable narrative; the adjacent evidence file is the source of truth for search execution, provenance, claim mapping, audit state, and downstream ownership.

## Evidence levels

| Level | Meaning | Allowed use |
|---|---|---|
| `primary` | Official specification, official documentation, first-party API, source code, filing, or original dataset | Required for decision-bearing `technical-evidence` claims |
| `direct-experience` | Interview, support record, ticket, direct observation, telemetry, or original user report | May support `strategy-evidence`; state sampling and access limits |
| `near-primary` | Dated review, vendor case study, marketplace record, or a report with inspectable methodology | May support strategy claims with qualification |
| `secondary` | Reputable synthesis that identifies its underlying evidence | Context or corroboration; avoid as the sole basis for high-impact decisions |
| `lead-only` | Aggregator snippet, unattributed repost, or AI-generated summary | Search lead only; never a supporting evidence reference |

## Search and counter-signals

Each material query or corpus inspection has a stable `search-*` ID, execution date, channel, query/corpus, and result. Allowed results are `results-found`, `none-found`, `access-failed`, and `excluded`.

Each claim must name supporting evidence and at least one counter-signal. A counter-signal is either an `evidence-*` item marked `counter` or a `search-*` entry with `none-found`. A `none-found` search only proves that the declared search did not find a counterexample.

## Claim audit

Allowed outcomes:

- `supported`: the evidence directly supports the wording;
- `partially-supported`: only a narrower, qualified wording is supportable;
- `unsupported`: the source does not support the claim;
- `not-audited`: temporary state, forbidden when the package says audit is complete.

`partially-supported` requires disposition `qualify`. `unsupported` requires `needs-deeper-research`. `lead-only` items cannot be cited as support. In `technical-evidence`, every decision-bearing claim needs at least one `primary` supporting item.

In `strategy-evidence`, decision-bearing kinds are `user-problem`, `business-constraint`, `domain-boundary`, `business-rule`, `mvp`, `non-goal`, `success-criterion`, and `stage-decision-basis`. These claims must all be present in `audit_summary.audited_claim_ids` before downstream lifecycle consumption.

## Ownership and failure

The package names its downstream owner and optional decision reference. It does not change the owned artifact or gate. Structure errors, unresolved references, decision-bearing unaudited claims, or a false `complete` declaration fail validation. Access gaps and conflicting evidence are recorded in `source_gaps`; they do not fail the entire brief unless they leave a decision-bearing claim unsupported.

The evidence file uses JSON syntax, which is valid YAML 1.2, so validation is portable and dependency-free.

## Design provenance

The Search Log, evidence passport, and claim-source alignment concepts are adapted from [Academic Research Skills](https://github.com/Imbad0202/academic-research-skills). This YSS contract omits academic writing, publication, fixed agent teams, and cross-model review machinery, and retains YSS lifecycle ownership boundaries.
