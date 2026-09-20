---
name: analyze-data-quality
description: "Assess analytical data quality: grain, freshness, nulls, duplicates, joins, schema drift and source consistency."
---

# Analyze Data Quality

Assess whether a dataset is trustworthy enough for analysis, modeling,
dashboards, experiments, or downstream pipelines. Start with the intended use and grain, run the highest-value checks for the data shape, and report concrete evidence, analytical risk, likely causes, and the smallest useful remediation or automated test.

## Skill Configuration

### User Context

Mandatory pre-answer gate: Invoke `data-analytics:user-context` in preflight mode by loading [data-analytics:user-context](../user-context/SKILL.md) and using its read-only preflight before source selection. Reuse the already loaded envelope within the same workflow while the resolved state paths, file digests, request mode and source scope are unchanged; re-read on change, missing context or explicit inspection. Do not look for a callable MCP tool named `data-analytics:user-context`. Use the returned `data_analytics_preflight` envelope as the source of truth for saved context, source-category mapping, semantic-layer registry, onboarding/final-response obligations, and conditional guidance; use saved context and semantic layers as source-selection inputs, not as substitutes for workflow-time reads from connected or provided sources. Do not read or reinterpret raw plugin state files unless preflight fails, declares required content omitted, local shell access is unavailable, or the user explicitly asks for raw state inspection.

## Workflow

Choose checks from the data grain, intended decision and known risk. Reuse fresh checks already covering the same source/query/transform; do not repeat the catalog. A notebook is needed only when reproducibility or multi-step analysis warrants it. Preserve blocking correctness findings and report material limitations.


1. Clarify the quality question and operating context.

   Establish what the dataset represents, the intended unit of analysis, the downstream use, whether the user cares about raw ingestion quality,
   transformed-model quality, or both, and the comparison baseline such as prior weeks, prior schema, or a trusted reference table. Identify expected grain,
   primary keys or candidate keys, important date columns, timezone assumptions,
   domain rules, allowed values, and business thresholds. If context is missing,
   infer cautiously and label assumptions.

2. Choose an inspectable analysis path.

   When multi-step SQL/Python analysis needs a reproducible narrative, use a companion notebook; a bounded check may provide its query/script and result directly. Use $jupyter-notebooks when a dedicated notebook scaffold or refactor workflow would help. For queryable tables, use `~~structured_data` to confirm schema, grain, sample rows, and query rules through the relevant source connector before heavier checks. Use `~~operations_logs` for freshness and lineage when those checks matter.

3. Build a compact profile.

   Start with row count, column count, column names and types, candidate keys,
   duplicate rates on likely identifiers, min/max timestamps for relevant date columns, null rates, distinct counts for likely categorical columns, and basic numeric summaries for measure columns. Confirm grain before interpreting anomalies; many apparent quality problems are mixed-grain data,
   partial backfills, late-arriving data, or duplicated joins.

4. Run core quality checks.

   Select checks that match the dataset and task. Default to the most relevant checks across completeness, uniqueness, validity, consistency, integrity,
   timeliness, volume, and shape. Compare rates, not just counts, and segment by time, source, country, platform, model version, or other key dimensions when that helps distinguish real issues from expected variation.

5. Run shape-specific checks.

   Adapt the checks to the data shape:

   - Event data: duplicate event IDs, future event timestamps, session or user
     coverage gaps, and abrupt event-mix changes after releases.
   - Dimension tables: non-unique business keys, orphan surrogate keys, status
     changes without corresponding timestamps, and unexpected churn in reference
     values.
   - Fact tables: mixed grain, impossible measures such as negative revenue or
     quantity, join blowups to dimensions, and late-arriving or partially loaded
     partitions.
   - ML feature or scoring tables: leakage from post-outcome fields, feature
     sparsity spikes, range shifts after model or feature-store changes, and
     class-label drift.
   - Experiment data: duplicate assignments, variant imbalance beyond
     expectation, exposure without assignment, and events before assignment
     timestamp.

6. Run temporal and distribution checks when history exists.

   Prioritize temporal diagnostics when the user mentions "after X date",
   "suddenly", "recently", or "only started appearing". Check first-seen dates,
   last-seen dates, daily or weekly null-rate trends, duplicate-rate trends, row count trends, category-share shifts, distribution drift, and change points around launches, migrations, incidents, model changes, or backfills.

7. Investigate analytical risks and likely causes.

   Tie each issue to the downstream risk: broken trusted analysis, biased decisions, broken joins, stale dashboards, incorrect experiments, leakage,
   unreliable model features, or misleading segments. When possible, identify whether the issue is isolated to a source, segment, partition, time window,
   release, migration, backfill, or upstream pipeline change.

8. Recommend fixes or automated tests.

   Recommend the smallest set of follow-up fixes, monitoring, or automated tests that would materially reduce risk. Suggest automation only when the rule is stable and worth maintaining. Include or save the notebook/query path when code produced the findings.

## Standards

### 按影响选择检查

先确认 grain、关键字段和决策风险，再按需读取 [质量检查方法](references/quality-checks.md)。对实际使用的字段/关联执行验证；不把全部目录作为每个任务的固定步骤。

### Severity

- Critical: breaks trusted analysis, core joins, production dashboards, or key decisions, such as duplicated grain, missing primary keys, or stale production data.
- High: materially biases downstream decisions, such as large null spikes,
  category drift in a core dimension, invalid business-rule values, leakage, or severe join coverage loss.
- Medium: localized or explainable issues that still need documentation,
  monitoring, or owner follow-up.
- Low: cosmetic inconsistencies, expected sparsity, or known edge cases that do not materially affect current use.

Do not dump raw profiling output without interpretation. Tie each finding to an analytical risk and likely impact.

### Automated Test Guidance

- Good candidates for automation: primary key uniqueness, not-null checks on required columns, accepted values for stable enums, referential integrity,
  freshness thresholds, and seasonality-aware row-count or volume bounds.
- Use caution with hard-coded distribution thresholds on volatile product metrics, strict uniqueness in messy entity-resolution use cases, and recent partitions when late-arriving data is normal.
- Suggest automated tests only when the expected rule is stable, important, and maintainable.

### Output Standards

Structure the response with:

1. dataset and grain summary
2. checks performed
3. findings
4. temporal or trend anomalies
5. likely causes and impacted use cases
6. recommended fixes or automated tests
7. assumptions and open questions

For each finding, include:

- what failed
- evidence: counts, rates, segments, and dates
- why it matters
- severity and confidence level
- likely cause when known
- suggested remediation or automated test

When code was used, retain the exact queries/scripts and results. Use a notebook when complexity or the requested output calls for one.

### Defaults

- Prefer small, high-signal tables over exhaustive dumps.
- Compare rates, not just counts.
- Break checks out by time and key segments whenever possible.
- Normalize strings before judging duplicates or distinct-count spikes.
- Treat recent partitions carefully when data arrives late.
- Call out when an anomaly could be caused by a legitimate product launch,
  experiment, migration, incident, model change, or backfill.
- Preserve inspectable evidence: SQL, query links, notebook paths, source paths,
  sample rows, chart outputs, and calculation notes.
