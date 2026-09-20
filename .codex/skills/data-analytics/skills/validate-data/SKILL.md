---
name: validate-data
description: "Review analytical methodology, calculations, sources, charts and conclusions before a report or analysis is shared."
---

# Validate Data Analysis

Validate an analysis before it is shared with stakeholders. Focus on whether the question, data, methodology, calculations, visuals, claims, caveats, and recommendations are trustworthy enough for the stated audience and decision.
This skill is for analysis QA, not raw dataset profiling alone. When validation depends on dataset reliability checks such as freshness, grain, missingness,
duplicates, join coverage, or source mismatches, use $analyze-data-quality as a companion.

## Skill Configuration

### User Context

Mandatory pre-answer gate: Invoke `data-analytics:user-context` in preflight mode by loading [data-analytics:user-context](../user-context/SKILL.md) and using its read-only preflight before source selection. Reuse the already loaded envelope within the same workflow while the resolved state paths, file digests, request mode and source scope are unchanged; re-read on change, missing context or explicit inspection. Do not look for a callable MCP tool named `data-analytics:user-context`. Use the returned `data_analytics_preflight` envelope as the source of truth for saved context, source-category mapping, semantic-layer registry, onboarding/final-response obligations, and conditional guidance; use saved context and semantic layers as source-selection inputs, not as substitutes for workflow-time reads from connected or provided sources. Do not read or reinterpret raw plugin state files unless preflight fails, declares required content omitted, local shell access is unavailable, or the user explicitly asks for raw state inspection.

## Workflow

Choose checks from the data grain, intended decision and known risk. Reuse fresh checks already covering the same source/query/transform; do not repeat the catalog. A notebook is needed only when reproducibility or multi-step analysis warrants it. Preserve blocking correctness findings and report material limitations.


1. Inventory the artifact and claims.

   Identify the report, notebook, spreadsheet, SQL, dashboard, chart, pasted analysis, or recommendation being validated. Inspect source artifacts when a path, link, query, notebook, spreadsheet, or dashboard is referenced. Extract the main question, audience, decision, key claims, headline numbers, data sources, time windows, populations, filters, comparison baselines, and stated caveats. Verify that every metric or KPI requested by the user appears in the analysis or is explicitly marked unavailable, not applicable, or out of scope.

2. Validate the question, methodology, and assumptions.

   Confirm that the analysis answers the stated business or product question,
   not a nearby easier question. Check whether the population, eligibility rules, exclusions, sampling, metric definitions, formulas, units,
   denominators, timezones, cohorts, comparison periods, and baselines match the stakeholder decision. Flag hidden exclusions, inconsistent definitions,
   partial-period comparisons, and causal wording that lacks experimental or otherwise credible causal evidence.

3. Validate data selection and quality risks.

   Confirm that the chosen tables, files, dashboards, or extracts are appropriate and current enough for the decision. Check freshness or "as of"
   date, expected partitions, segment coverage, row/category completeness, null handling, deduplication, filter logic, join coverage, and source mismatches when those risks could change the conclusion. Use `~~structured_data` for source metadata, schema checks, sample rows, query history, or SQL spot checks through the relevant source connector when available. Use `~~operations_logs` for table freshness, lineage, or pipeline context.

4. Verify calculations and aggregations.

   Recompute the highest-impact numbers independently when possible. Check grain, subtotals, denominators, non-zero denominators, rate bases,
   period-over-period bases, weighted averages, units, currency, timezone handling, and whether mutually exclusive categories add to totals. For SQL,
   inspect join types, group-by grain, filters, distinct counts, and row counts before and after joins. Use $jupyter-notebooks or `~~spreadsheet_workspace`
   when the artifact itself is a notebook or spreadsheet, or when reproducible spot checks need code or formulas.

5. Test reasonableness and common analytical traps.

   Compare magnitudes against known dashboards, historical reports, prior analyses, finance sources, or expected product scale when possible. Investigate trend jumps, drops, flatlines, exact round numbers, 0% or 100% rates, segment shares that should sum to about 100%, and results that perfectly confirm the hypothesis without friction. Check edge cases such as empty segments, new entities, and boundary dates.

6. Review visuals and presentation integrity.

   Confirm that charts use appropriate chart types, scales, axes, intervals,
   titles, labels, units, ordering, annotations, color, and precision. Use
   $visualize-data for non-trivial chart review. For rendered reports,
   dashboards, slides, docs, PDFs, HTML, or other final artifacts, inspect the rendered output for broken charts, missing tables, clipped text, bad formatting, stale placeholders, and obvious layout issues. Check whether a quick reader could walk away with a misleading interpretation, especially from truncated axes, dual axes, 3D effects, inconsistent intervals, missing date ranges, or chart titles that overstate the data.

7. Evaluate narrative, conclusions, and recommendations.

   Confirm each conclusion is supported by visible evidence or saved artifacts.
   Separate verified findings from interpretation, caveats, and open questions.
   Identify alternative explanations, uncertainty, missing context,
   recommendations that go beyond the evidence, and any causal language that is not supported by the design.

8. Produce a confidence assessment and required fixes.

   Prioritize issues that materially affect the stakeholder decision. Separate blockers from caveats: do not block sharing for minor polish issues, but do block when a number, denominator, join, time window, population, comparison,
   or conclusion is materially unreliable. Record incomplete handoff blockers separately from caveats, including missing access, unavailable source artifacts, unrun checks, broken render steps, unresolved data-quality risks,
   or absent owner confirmation. If SQL, Python, a notebook, or a spreadsheet was used for validation, include the artifact path, query permalink, notebook path, spreadsheet tab, or dashboard link so the check is reproducible.

## Standards

### Validation Stance

- Validate the claims the analysis actually makes, not just whether the artifact looks polished.
- Prefer concrete evidence: recompute important numbers, inspect source data,
  check code paths, trace records, or reconcile against trusted sources when tools and access allow it.
- Label anything that cannot be verified, and state what would be needed to verify it.
- Treat surprising results, stakeholder-facing recommendations, causal claims,
  high-impact decisions, and externally shared analyses as higher-risk validation targets.
- Select checks that match the artifact and decision. Do not run every possible check mechanically.

### 按风险选择方法

核验方法、数据质量、计算、合理性或可视化时，按对应风险读取 [方法与抽查示例](references/validation-methods.md)。验证同一证据不重复逐项抄写；影响结论的错误必须修复或阻断，非阻断限制显式随结果交付。

### Confidence Ratings

- `Ready to share`: The analysis is methodologically sound, key calculations are verified or low risk, caveats are clear, and any remaining issues are minor.
- `Share with caveats`: The analysis is directionally usable, but specific assumptions, limitations, or unverified checks must be communicated to stakeholders.
- `Needs revision`: There are material errors, unsupported claims, missing checks, or methodological issues that should be fixed before sharing.

### Output Standards

Use this structure unless the user asks for a lighter review:

```markdown
## Validation Report

### Overall Assessment: [Ready to share | Share with caveats | Needs revision]

### Methodology Review
[Findings about question framing, data selection, population, definitions, comparisons, and assumptions.]

### Issues Found
1. [Severity: High/Medium/Low] [Issue description, evidence, and impact]
2. ...

### Calculation Spot-Checks
- [Metric or claim]: [Verified / Discrepancy found / Not verified] - [brief evidence]

### Visualization Review
[Chart or presentation issues, if applicable.]

### Suggested Improvements
1. [Improvement and why it matters]

### Required Caveats for Stakeholders
- [Caveat that must be communicated]
```

- Include the question being answered, data sources and "as of" date, metric and segment definitions, time period and timezone, methodology steps, assumptions and limitations, SQL queries, notebook paths, spreadsheet tabs, dashboard links, or caveats required before acting when those details are relevant.
- Preserve source references from the original artifact, including links, query IDs, notebook paths, spreadsheet tabs, dashboard URLs, cited documents, and other evidence needed to trace the analysis.
- Verify that every section requested by the user or implied by the deliverable format is present; explain omitted sections.
- Keep issues prioritized by decision impact, not by artifact section order.
- Make unverified claims and remaining caveats explicit.
- List incomplete handoff blockers separately from caveats and suggested improvements.
