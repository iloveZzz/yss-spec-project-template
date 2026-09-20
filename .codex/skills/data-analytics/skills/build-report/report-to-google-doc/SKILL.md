---
name: report-to-google-doc
description: "Narrow conversion skill. Invoke only when the user explicitly asks to convert an existing local or blob-hosted HTML analytics report into a Google Doc, DOCX, or shareable document."
---

# Report To Google Doc

Use this skill when the user requests a local DOCX, a hosted DOCX, or a native Google Doc from an existing HTML analytics report. The source must be an HTML report: a local file, a downloaded blob-hosted report, or a report produced by `$build-report`
HTML mode. This skill does not convert a live MCP app report directly.

Choose the requested target: `local-docx` (default for local conversion), `hosted-docx`, or `native-google-docs`. HTML → DOCX is local work; uploading is a separate external action, performed only when requested. A hosted DOCX viewer is not a native Google Doc. Discover an available conversion/import capability and verify the result MIME/type before claiming native delivery.

## Skill Configuration

### User Context

Mandatory pre-answer gate: Invoke `data-analytics:user-context` in preflight mode by loading [data-analytics:user-context](../../user-context/SKILL.md) and using its read-only preflight before source selection. Reuse the already loaded envelope within the same workflow while the resolved state paths, file digests, request mode and source scope are unchanged; re-read on change, missing context or explicit inspection. Do not look for a callable MCP tool named `data-analytics:user-context`. Use the returned `data_analytics_preflight` envelope as the source of truth for saved context, source-category mapping, semantic-layer registry, onboarding/final-response obligations, and conditional guidance; use saved context and semantic layers as source-selection inputs, not as substitutes for workflow-time reads from connected or provided sources. Do not read or reinterpret raw plugin state files unless preflight fails, declares required content omitted, local shell access is unavailable, or the user explicitly asks for raw state inspection.

## Workflow

1. Resolve the HTML report.

   Use an absolute local path. If the user provides a remote report, retrieve it first and pass the local HTML file to the helper. If the file is a sign-in page, redirect page, or tiny stub, stop and obtain the real report.

2. Run the bundled helper.

   ```bash
   python3 <REPORT_TO_GOOGLE_DOC_SKILL_DIR>/scripts/report_to_google_doc_plan.py \
     /absolute/path/to/report.html \
     --out-dir /tmp/report_to_google_doc_plan
   ```

   The helper defaults to `--target local-docx`. Only for an explicit cloud request, select `--target hosted-docx` or `--target native-google-docs`; the helper still performs no remote action. If dependencies are unavailable and cannot be installed in the authorized scope, use an available local converter and validate against the source, or report the conversion gap.

   Omit `--render-workers` on the normal path. Only pass a worker count after benchmarking the same report family locally. If dependencies are missing,
   use a local virtual environment with `beautifulsoup4`, `pillow`, and `python-docx`; `cairosvg` or headless Playwright are optional renderers.

3. Inspect helper outputs.

   Required outputs:

   - `skeleton.txt`: source text with stable placeholders
   - `manifest.json`: parsed headings, tables, callouts, lists, styles, links,
     and rendered visual inventory
   - `preflight_checks.json`: source, width, DOCX, and rendered-image checks
   - `report.docx`: generated local Word document
   - `docx_upload_plan.json`: selected-target handoff plan (no upload steps for local conversion)
   - `placeholder_queries.json`: source mapping debug labels

   Do not upload until `preflight_checks.json` has `status: "passed"` with zero errors. Warnings must either be fixed or called out in the handoff.

4. Complete the selected target.

   For `local-docx`, validate the local DOCX against the source inventory and stop with its local link. Do not upload, change sharing, or require a Drive connector.

   For explicitly requested `hosted-docx` or `native-google-docs`, discover the currently available upload/import capability and read its schema. Never guess a tool name, plugin ID or parameter. If missing, deliver the validated local DOCX and identify the cloud capability gap; do not claim cloud completion or switch the target silently.

5. Verify and hand off.

   Check headings, lists, tables, text, links and image relationships against `manifest.json`. For a cloud target, also reopen the returned document and verify content and actual native/hosted type. Return only the selected deliverable links plus source and validation evidence as useful. Connector success alone is insufficient.

## Standards

- Preserve every section, headline claim, metric card, metric definition,
  source note, chart takeaway, recommendation, caveat, and link from the HTML report.
- Preserve semantic formatting: headings, paragraphs, inline bold/emphasis,
  inline code, positive/negative colors, links, lists, callouts, metric-card grids, tables, notes, captions, and charts.
- Use DOCX-native structures wherever practical: headings, paragraphs, tables,
  bullets/numbered lists, links, inline images, paragraph shading, table cell shading, and text styles.
- Keep the report text column readable. Tables, charts, rendered table grids,
  screenshots, and visual blocks must not exceed the DOCX page text width.
- Preserve charts as inline PNG images from the source visual, aligned to the same left edge as text and tables. A chart with missing bars, missing legend swatches, or all-black/all-white marks fails validation even if the DOCX contains an image object.
- Preserve multi-column report blocks. A two-column grid made only of titled mini-tables can remain a two-column rendered image capped to the text width;
  mixed two-column blocks with narrative text, pills, callouts, or non-table panels should preserve that content natively instead of dropping it.
- Do not expose customer-level details or sensitive links that were intentionally omitted from a sanitized report.
- Do not write Google Docs batch-update artifacts such as `seed_requests.json`,
  `remote_write_plan.json`, or `all_requests*.json`.

## Repairs

Use these fixes when validation exposes a conversion issue:

| Problem | Fix |
| --- | --- |
| Heading is regular weight | Fix the DOCX writer heading style or explicit run bolding. |
| Blank line after title or heading | Delete spacer paragraphs; skeletons should emit `\n`, not `\n\n`, after headings. |
| Body paragraphs have too much space | Delete literal blank paragraphs and set modest style spacing. |
| Table/image too wide | Set table columns or image width to the DOCX text column width. |
| Chart has labels but missing bars | Inline SVG class styles or use a headless screenshot before inserting. |
| Two-column table group is flattened | Treat the grid as one layout block with mini-table titles preserved. |
| Executive summary, metric cards, or section is missing | Fix parser inventory before upload. |
| Chart overlaps table | Insert the image on its own paragraph after the table. |
| Chart duplicated | Remove the extra image; keep exactly one source-order copy. |
| Inline bold/code/color missing | Fix manifest range splitting in the DOCX writer. |
| Source links show raw URLs | Replace with native linked labels or native bullets using HTML link text. |

## Local Checks

```bash
python3 -m py_compile <REPORT_TO_GOOGLE_DOC_SKILL_DIR>/scripts/report_to_google_doc_plan.py
python3 <REPORT_TO_GOOGLE_DOC_SKILL_DIR>/scripts/report_to_google_doc_plan.py \
  /absolute/path/to/report.html \
  --out-dir /tmp/report_to_google_doc_plan_smoke
jq '.status, .summary' /tmp/report_to_google_doc_plan_smoke/preflight_checks.json
test -f /tmp/report_to_google_doc_plan_smoke/report.docx
test -f /tmp/report_to_google_doc_plan_smoke/docx_upload_plan.json
git diff --check -- .codex/skills/data-analytics/skills/build-report/report-to-google-doc
```
