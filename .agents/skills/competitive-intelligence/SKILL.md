---
name: competitive-intelligence
description: Use when researching competitors, market positioning, pricing, feature gaps, customer sentiment, or category trends before Discovery, Spec, product strategy, or roadmap decisions.
---

# Competitive Intelligence

Source requested for this project: `anthropics/knowledge-work-plugins`, `sales/skills/competitive-intelligence`.

Use this skill when competitive or market facts are needed to shape product Discovery, Spec scope, positioning, differentiation, pricing assumptions, or roadmap tradeoffs.

## Core Rules

- Browse or verify current public sources before making factual claims about competitors, pricing, features, market position, funding, partnerships, product releases, or customer sentiment.
- Separate facts, evidence, and inference. Do not present strategy guesses as verified competitor intent.
- Prefer primary or near-primary sources: official product pages, docs, pricing pages, changelogs, release notes, filings, case studies, status pages, marketplace listings, reputable analyst reports, and dated customer reviews.
- Record dates for time-sensitive claims. Pricing, packaging, roadmap, customer logos, and feature availability can change quickly.
- Persistent project outputs should use Chinese body text by default. Keep competitor names, product names, URLs, API names, and quoted identifiers unchanged.
- Do not bypass paywalls, scrape private systems, or use confidential information. Public evidence only unless the user explicitly provides internal material.

## Workflow

1. Define the intelligence question:
   - Which product decision will this inform?
   - Which competitors or substitute workflows are in scope?
   - Which markets, user segments, regions, editions, or use cases matter?
   - What must be decided after the research?
2. Build an evidence plan:
   - Official sources for product capabilities and pricing.
   - Documentation and changelogs for depth and recency.
   - Reviews, community posts, app marketplaces, and job posts for adoption and pain signals.
   - Analyst, media, or public filings for market context when relevant.
3. Capture evidence with source links and dates:
   - Feature / capability evidence.
   - Pricing / packaging evidence.
   - UX / onboarding evidence.
   - Integration / ecosystem evidence.
   - Customer segment and positioning evidence.
   - Complaints, workarounds, or unmet needs.
4. Synthesize:
   - Competitor positioning.
   - Table-stakes capabilities.
   - Differentiators and defensibility.
   - Gaps and underserved jobs-to-be-done.
   - Risks if we copy the competitor too closely.
   - Product opportunities for Spec or roadmap.
5. Hand off to lifecycle assets:
   - Update Discovery findings in `docs/discovery/`.
   - Create or update a competitor matrix in `docs/discovery/reports/`.
   - Feed stable user, pain, MVP, non-goal, and success criteria into `grill-with-docs` and `to-spec`.
   - Record uncertain claims as assumptions, not requirements.

## Output Shape

For a quick brief:

```markdown
## 竞品情报简报

### 研究问题
- <本次情报要支持的产品决策>

### 范围
- 竞品 / 替代方案：<list>
- 用户 / 市场：<scope>
- 时间范围：<date>

### 关键结论
- <fact or inference, clearly labeled>

### 证据表
| 结论 | 证据 | 来源 | 日期 | 置信度 |
|---|---|---|---|---|

### 竞品矩阵
| 维度 | 竞品 A | 竞品 B | 我们的机会 |
|---|---|---|---|

### Spec 输入
- 用户 / 痛点：
- MVP 建议：
- 非目标范围：
- 验收或验证建议：

### 风险与待验证假设
- <assumption>
```

## Guardrails

- Do not treat competitive parity as a product requirement. Convert evidence into user value, MVP boundaries, and testable acceptance criteria.
- Do not copy competitor UX, text, proprietary workflows, screenshots, or private materials into project artifacts.
- If sources conflict, show both and mark confidence rather than forcing a false conclusion.
- If current web access is unavailable, state the limitation and produce only a research plan or hypothesis list.
