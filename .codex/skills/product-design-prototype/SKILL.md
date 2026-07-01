---
name: product-design-prototype
description: Use when a PRD baseline or user story has UI impact and needs page maps, user flows, wireframes, interaction states, or API implications before PRD calibration, OpenAPI Draft, or implementation.
---

# Product Design Prototype

Use this skill after PRD baseline and before PRD calibration / OpenAPI Draft for features with user interfaces. Its job is to turn requirements into design assets that can drive calibrated PRD, API, frontend acceptance, and vertical slices.

## Required Inputs

- PRD baseline or confirmed user stories.
- `CONTEXT.md` terms when domain language matters.
- Existing `docs/design/` assets or prototype links.
- Known component/page constraints, such as YSS UI, Formily, tables, trees, drawers, modals, permissions, or generated API clients.

If no PRD baseline exists, route back to `yss-product-lifecycle` / `grill-with-docs` / `to-prd`. If the change has no UI impact, record the no-UI decision and continue to PRD calibration, OpenAPI, or engineering baseline.

## Core Flow

1. Inspect current assets: PRD, `docs/design/`, `docs/api/specs/`, `docs/architecture/`, and active OpenSpec/Comet changes.
2. Create or update a design artifact under `docs/design/<feature>-interaction-spec.md` using `docs/design/templates/interaction-spec-template.md`.
3. Capture page map, primary user flow, exception flow, and low-fidelity prototype or wireframe link.
4. Fill the state matrix using `docs/design/templates/state-matrix-template.md`.
5. Write the OpenAPI implication list: fields, filters, actions, errors, permissions, pagination, optimistic/concurrency states, and audit/version data.
6. Hand off to `prototype-review`. Do not freeze/calibrate the PRD or enter OpenAPI Draft for UI work until prototype review has no blocking findings.

## Tool Routing

| Need | Add skill/tool |
|---|---|
| Low-fidelity page or flow sketch | `wireframe-prototype` |
| Figma work or existing Figma file | `figma` / `figma-use` |
| Engineering state prototype | `component-story-prototype` |
| API not frozen but interactions need data | `mock-api-prototype` |
| YSS implementation constraints | `yss-router`, then `yss-ui`, `yss-formily`, `yss-page-module-development` as needed |

## Output Contract

Return:

```markdown
### 当前阶段
Product design / prototype / interaction design

### 输入资产
- <PRD / discovery / CONTEXT / existing design paths>

### 设计产物
- <docs/design/... or prototype link>

### 页面与流程
- <page map and main/exception flows>

### 状态矩阵
- <loading/empty/error/no-permission/readonly/conflict/dirty states>

### OpenAPI 反推清单
- <request/response fields, filters, actions, errors, permissions>

### 是否可进入 PRD 校准 / OpenAPI Draft
- <yes/no; include whether PRD calibration is needed first>

### 下一步
- <prototype-review or routing back to PRD/design>
```

## Data Modeling Example

For a data middle platform modeling MVP, cover at least:

- Model list: search, status filter, create action, empty and no-permission states.
- Model detail: draft vs published version, fields tab, validation panel, publish action.
- Field editor drawer: field name, type, nullable, primary key, default value, business meaning, validation errors.
- Publish confirmation modal: validation summary, irreversible version-freeze warning, audit actor/time.
- Version history: published version list, diff entry, rollback or deprecate decision if in scope.

The API implication list should include list filters, page result shape, field-level validation errors, publish result, version metadata, and permission-driven disabled actions.
