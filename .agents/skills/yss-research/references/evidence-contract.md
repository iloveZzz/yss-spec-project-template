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

## 竞品附属产物

现有 evidence v1 可选增加 `competitive_analysis`，合同见 [competitive-analysis.md](competitive-analysis.md)。不含扩展的历史包保持原校验行为；`search_log`、`evidence_items`、`claims` 仍是唯一台账。完整 JSON Schema 校验后，检查比较覆盖、Claim 引用、状态条件、选定文件和工具管理区一致性。

`yss-research` 持有研究包，`competitive-intelligence` 执行专项分析。审计模式保留 brief / evidence 双文件，按 `matrix / report / both` 追加功能矩阵和深度报告；附属报告不能替代简报。确定的能力状态必须引用适用范围内的已审计 Claim；未知必须记录原因和补证计划。`none-found` 不能证明不支持。

矩阵和报告共用结构化结果，工具只更新唯一完整管理区，区外分析正文保留。历史文件没有管理区时拒绝覆盖。正式收尾条件追加选定产物及新增校验依赖的摘要；当前字节漂移后旧验证失效。机械一致性不替代来源语义审核，研究产物不授予下游批准。

## Design provenance

The Search Log, evidence passport, and claim-source alignment concepts are adapted from [Academic Research Skills](https://github.com/Imbad0202/academic-research-skills). This YSS contract omits academic writing, publication, fixed agent teams, and cross-model review machinery, and retains YSS lifecycle ownership boundaries.
