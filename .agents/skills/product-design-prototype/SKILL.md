---
name: product-design-prototype
description: Use when a Spec baseline or user story has UI impact and needs page maps, user flows, wireframes, interaction states, or API implications before Spec calibration, OpenAPI Draft, or implementation.
---

# Product Design Prototype

Use this skill after Spec baseline and before Spec calibration / OpenAPI Draft for features with user interfaces. Its job is to turn requirements into design assets that can drive a calibrated Spec, API, frontend acceptance, and vertical slices.

## Required Inputs

- Spec baseline or confirmed user stories.
- `CONTEXT.md` terms when domain language matters.
- Existing `docs/design/` assets or prototype links.
- Known component/page constraints, such as YSS UI, Formily, tables, trees, drawers, modals, permissions, or generated API clients.

If no Spec baseline exists, route back to `yss-product-lifecycle` / `grill-with-docs` / `to-spec`. If the change has no UI impact, record the no-UI decision and continue to Spec calibration, OpenAPI, or engineering baseline.

## Core Flow

1. Inspect current assets: Spec, `docs/design/`, `docs/api/specs/`, `docs/architecture/`, and active Spec Delta changes.
2. Create or update a design artifact under `docs/design/<feature>-interaction-spec.md` using `docs/design/templates/interaction-spec-template.md`.
3. Capture page map, primary user flow, exception flow, and low-fidelity prototype or wireframe link.
4. Fill the state matrix using `docs/design/templates/state-matrix-template.md`.
5. Write the OpenAPI implication list: fields, filters, actions, errors, permissions, pagination, optimistic/concurrency states, and audit/version data.
6. For every primary page action, add an action-to-contract row: page/component, action label, `actionKey`, endpoint or explicit non-goal, request fields, response shape, permission behavior, state transition, idempotency/concurrency rule, and error codes.
7. For every P0 requirement containing verbs such as manage, maintain, configure, create, update, archive, retry, cancel, publish, export, or create draft, confirm the interaction spec either names the API implication or records that the capability is intentionally out of scope.
8. Hand off to `prototype-review`. After low-fidelity review is approved, hand off to `high-fidelity-html-prototype`. Do not freeze/calibrate the Spec or enter OpenAPI Draft for UI work until the Ant Design v6 high-fidelity HTML prototype exists and has no blocking findings.
9. 交互原型应标注 semantic token 角色、single primary action、interaction feedback 和不可逆操作确认；若页面使用 Ant Design，主题密度或暗色策略必须使用 theme algorithm，并在关键文本上复核 accessibility contrast。

## Tool Routing

| Need | Add skill/tool |
|---|---|
| Low-fidelity page or flow sketch | `wireframe-prototype` |
| Figma work or existing Figma file | `figma` / `figma-use` |
| YSS implementation constraints | `yss-router`, then `yss-ui`, `yss-formily`, `yss-page-module-development` as needed |

## Output Contract

Return:

```markdown
### 当前阶段
Product design / prototype / interaction design

### 输入资产
- <Spec / discovery / CONTEXT / existing design paths>

### 设计产物
- <docs/design/... or prototype link>

### 页面与流程
- <page map and main/exception flows>

### 状态矩阵
- <loading/empty/error/no-permission/readonly/conflict/dirty states>

### OpenAPI 反推清单
- <request/response fields, filters, actions, errors, permissions>

### 页面动作到契约映射
- <page/component action -> actionKey -> endpoint/non-goal -> permission -> state transition -> error codes>

### Ant Design v6 体验检查
- <semantic token / theme algorithm / single primary action / interaction feedback / accessibility contrast>

### 是否可进入 Spec 校准 / OpenAPI Draft
- <yes/no; include whether Spec calibration is needed first>

### 下一步
- <prototype-review / high-fidelity-html-prototype / routing back to Spec/design>
```

## Data Modeling Example

For a data middle platform modeling MVP, cover at least:

- Model list: search, status filter, create action, empty and no-permission states.
- Model detail: draft vs published version, fields tab, validation panel, publish action.
- Field editor drawer: field name, type, nullable, primary key, default value, business meaning, validation errors.
- Publish confirmation modal: validation summary, irreversible version-freeze warning, audit actor/time.
- Version history: published version list, diff entry, rollback or deprecate decision if in scope.
- Readonly published version: create-draft action or explicit non-goal.
- Validation panel: rule source, blocker/warning configuration source, validation run result.

The API implication list should include list filters, YSS page result shape, field-level validation errors, publish result, version metadata, rule configuration source, draftVersion behavior, and permission-driven disabled actions.
