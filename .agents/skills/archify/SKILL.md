---
name: archify
description: "Create interactive HTML architecture, workflow, sequence, data-flow or state diagrams. Use for requested diagrams or Mermaid conversion."
license: MIT
metadata:
  version: "2.16"
  author: tt-a1i
  based_on: Cocoon-AI/architecture-diagram-generator (MIT, v1.0)
---

# Archify

Create a self-contained, interactive HTML diagram from a small typed JSON specification. Static output is the default; enable motion only when the user asks for a demo or presentation.

## YSS integration override

When the current repository contains `yss-project.yaml`, these rules override the upstream update and delivery commands below:

- Treat Archify as a conditional specialist. Use it only when the user or the current YSS contract explicitly requires an architecture, workflow, sequence, data-flow, lifecycle, or Mermaid-beautification artifact. A diagram is derived evidence; it never replaces the active profile's architecture contract (such as backend Tactical Design or Frontend Engineering Design), Spec, ADR, OpenAPI, Slice Implementation Contract, review, or approval evidence.
- Do not run `scripts/check-update.mjs`. YSS pins the upstream revision in `skills-lock.json`; upgrades happen only through the repository's skill-maintenance workflow.
- Validate with the upstream `validate` command, but deliver through the repository-safe wrapper from the repository root:

  ```bash
  # project-instance
  node .agents/skills/archify/scripts/yss-safe-deliver.mjs <type> docs/architecture/diagrams/<diagram-id>/<diagram-id>.archify.json docs/architecture/diagrams/<diagram-id>/<diagram-id>.html --quality showcase

  # template-source
  node .agents/skills/archify/scripts/yss-safe-deliver.mjs <type> .template-source/evidence/maintenance/diagrams/<diagram-id>/<diagram-id>.archify.json .template-source/evidence/maintenance/diagrams/<diagram-id>/<diagram-id>.html --quality showcase
  ```

- For a `project-instance`, stable source and output must be the matching pair `docs/architecture/diagrams/<diagram-id>/<diagram-id>.archify.json` and `<diagram-id>.html`. For a `template-source`, use `.template-source/evidence/maintenance/diagrams/<diagram-id>/`. The wrapper writes `<diagram-id>.receipt.json` only after successful delivery. Temporary exploration may target the operating-system temporary directory.
- The safe wrapper rejects `--open`, non-HTML targets, symlink escapes, unrelated existing files, and stable source/output pairs outside those roots. Do not bypass it with the raw `deliver` or `preview` commands in a YSS repository.

## Fast authoring path

新建或修复图表时，读取 [候选生成与验证](references/authoring-workflow.md)，只加载匹配的 schema 与 example。普通生成默认静态、`showcase`；验证通过后冻结候选。先写候选，再按诊断决定是否检查 renderer。

## Update awareness

仅在非 YSS 仓库、首个候选已存在时，读取 [上游更新提示](references/upstream-updates.md)。YSS 仓库保持锁定来源，不执行更新检查；提示不授予更新权限。

新 workflow 使用 schema v2；保留已有 v1 固定几何时才继续用 v1。布局诊断、迁移与 lifecycle 几何细则在实际命中时读取 [特定布局说明](references/authoring-notes.md)。

## Type router

| Type | Use for |
|---|---|
| `architecture` | Components, services, cloud/security boundaries, infrastructure |
| `workflow` | Processes, approval gates, tool calls, runbooks, CI/CD |
| `sequence` | API call chains, request lifecycles, async traces, returns |
| `dataflow` | Pipelines, ETL/ELT, lineage, governance, consumers |
| `lifecycle` | State/status transitions, retries, waiting and terminal states |

When ambiguous, run `node bin/archify.mjs guide "<scenario>" --json`. Scenario proof examples are structural references, not facts to copy.

## Mermaid input

Read Mermaid for topology and meaning, then author fresh Archify JSON; do not mechanically render Mermaid styling.

- `flowchart` / `graph` → `workflow`, or `architecture` for a component map.
- `sequenceDiagram` → `sequence`; participants become semantic participants and arrows become messages.
- `stateDiagram` → `lifecycle`; states and transitions retain meaning, not Mermaid style.

## Authoring invariants

Keep typed source and rendered output consistent; stable IDs and source facts must be traceable. Edges may not cross unrelated opaque nodes, share ambiguous corridors or hide labels. When placing nodes, choosing routes or repairing geometry, read [geometry and routing](references/geometry-and-routing.md). Validate the actual output before delivery.

## Delivery

交付 HTML 前读取 [交付执行](references/delivery-workflow.md) 与 [证据合同](references/delivery-contract.md)。YSS 仓库始终使用上文安全 wrapper；失败不检查旧输出。分别报告确定性检查、真实浏览器证据、感知审查，非零退出不得称成功；预览仅按用户请求开启。

## Optional viewer capabilities

Generated HTML already contains theme switching, pan/zoom, search, focus, relationship tracing, semantic views, presentation, and truthful exports. These are reader capabilities, not extra authoring work. `meta.animation: "trace"` is opt-in; `meta.views` is optional and should contain at most five curated chapters.

Read `references/viewer-runtime.md` only when the user explicitly asks for Share Cards, Route/Reach cards, motion, guided stories, deep links, presentation, search/focus, or another Viewer Runtime feature.

## Setup and fallback

No install is required inside the skill package. Verify with:

```bash
node bin/archify.mjs doctor
node bin/archify.mjs demo <output-directory>
```

When shell access is unavailable, hand-place architecture SVG into `assets/template.html`, use CSS semantic classes rather than inline colors, and follow the visual review contract in `references/delivery-contract.md`.

## Output

Return the checked HTML path, diagram type, validation summary, specification/artifact receipt, browser-evidence status, and truthful visual-review status. Do not claim success for a non-zero command or claim visual inspection you did not perform.
