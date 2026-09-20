### Methodology Checks

- Question framing: the analysis answers the stated business or product question.
- Data selection: sources are appropriate and current enough for the decision.
- Population: inclusions, exclusions, eligibility rules, and sampling are explicit.
- Metric definitions: formulas, units, denominators, and timezones are clear and aligned with stakeholder definitions.
- Baselines: comparison periods, cohorts, and contexts are comparable.
- Causality: causal wording is backed by experimental or otherwise credible causal evidence.

### Data Quality Checks

- Freshness: the analysis states or can recover the data "as of" date.
- Completeness: no unexpected missing partitions, segments, rows, or categories.
- Null handling: key columns have expected null rates or explicit treatment.
- Deduplication: primary entities are not double counted.
- Filter verification: filters and WHERE clauses do not silently exclude the population of interest.
- Join coverage: dimensions, experiments, and reference tables do not drop or multiply important rows.

### Calculation Checks

- Grain: the aggregation level matches the intended analysis grain.
- Denominators: rates and percentages use the correct population and non-zero denominators.
- Period alignment: comparisons use equal or explicitly caveated windows.
- Weighted metrics: averages are weighted correctly when group sizes differ.
- Subtotals: parts add to totals where categories are mutually exclusive.
- Units: currency, token, user, request, account, day/week/month, and timezone units are consistent.

### Reasonableness Checks

- Magnitudes are plausible relative to known dashboards, historical reports, or expected product scale.
- Percentages fall in expected ranges and segment shares sum to about 100% where expected.
- Trend jumps, drops, flatlines, exact round numbers, and 0% or 100% rates have an explanation.
- Results do not perfectly confirm the hypothesis without friction or exceptions.
- Edge cases such as empty segments, new entities, and boundary dates behave sensibly.

### Common Pitfalls

- Join explosion: many-to-many joins silently multiply rows and inflate counts or sums. Compare row counts and distinct primary entities before and after the join, and check whether the right-hand table has multiple rows per join key.
  Aggregate the right-hand table to the intended grain before joining when needed, use `COUNT(DISTINCT primary_id)` when counting entities through joins,
  and comment intentional one-to-many joins.
- Survivorship bias: the analysis only includes entities that exist today and misses deleted, churned, failed, or otherwise absent entities. Ask who is not in the dataset and whether the missing population changes the conclusion.
- Incomplete period comparison: a partial period is compared with a complete period. Use complete periods, compare the same number of elapsed days, or label the partial-period caveat prominently.
- Denominator shifting: the eligible population changes between periods or segments. Validate that conversion, churn, activation, attach, and retention rates use stable definitions across compared groups.
- Average of averages: pre-computed averages are averaged without weighting for group size. Aggregate from raw numerators and denominators or use a weighted average.
- Timezone mismatch: sources use different timestamp conventions or daily cutoffs. Confirm the analysis standardizes timestamps or explicitly states the timezone and cutoff.
- Selection bias in segmentation: segments are defined by the outcome being measured. Define comparison groups by pre-treatment characteristics when making lift, causality, or behavior-difference claims.
- Other statistical traps: Simpson's paradox where aggregate and segment-level trends conflict, correlation presented as causation, small samples,
  outlier-dominated averages that need medians or distribution views, multiple testing, cherry-picked time ranges, and look-ahead bias.

### Spot-Check Recipes

- Recompute a key metric from raw numerators and denominators.
- Trace a few individual records through joins, filters, and final output.
- Reconcile a key total against a trusted dashboard, prior report, or finance source.
- Reverse engineer a headline number from component metrics, such as users times per-user revenue.
- Run a one-day, one-segment, or one-entity boundary check to make sure filters and joins behave sensibly.
- Compare the same metric through an alternate query path when a claim is surprising or high stakes.

### Visualization Checks

- Bar charts should generally start at zero.
- Comparison charts should use consistent scales unless the scale difference is explicit and justified.
- Axes, units, legends, and date ranges should be labeled.
- Category ordering should match the comparison the reader should make.
- Truncated axes, dual axes, 3D effects, and inconsistent intervals require explicit justification or redesign.
- Chart titles and annotations should match exactly what the data supports.
- Titles should state the finding and include date range or scope when needed.
- Caveats should be visible near the claims they qualify.
- Number formatting should use appropriate precision and units.
- Rendered artifacts should be checked in their final form when available, not only in source form.
