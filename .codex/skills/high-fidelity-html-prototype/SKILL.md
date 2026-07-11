---
name: high-fidelity-html-prototype
description: Use after low-fidelity prototype review is approved and before PRD calibration, requirement freeze, OpenAPI Draft, or UI implementation when a user-facing YSS feature needs a high-fidelity interactive HTML prototype using Ant Design v6.
---

# High Fidelity HTML Prototype

Use this skill only after `prototype-review` approves the low-fidelity prototype / interaction design. It turns reviewed product design into a high-fidelity, browser-runnable HTML artifact for business, UX, frontend, and API review.

## Required Inputs

- PRD baseline: `docs/requirements/<feature>-prd.md`.
- Product overview design / functional architecture: `docs/design/<feature>-product-overview-design.md`.
- Interaction spec: `docs/design/<feature>-interaction-spec.md`.
- State matrix: `docs/design/<feature>-state-matrix.md`.
- Approved low-fidelity prototype review: `docs/design/<feature>-prototype-review.md` or equivalent issue comment.
- Project design system: `docs/design/design.md` and `docs/design/tokens/*`.

If low-fidelity `prototype-review` is blocked or missing, stop and return to `product-design-prototype` / `prototype-review`.

## Ant Design Official Agent Baseline

Use the official Ant Design agent guidance as the implementation baseline:

- Read or reference `https://ant.design/docs/react/for-agents` when the task starts.
- Use `@ant-design/cli` before choosing unfamiliar components, props, tokens, or migration-sensitive APIs.
- Prefer direct CLI subcommands because `--help` may fail in some Node environments while subcommands still work.

Recommended commands:

```bash
npm view antd version
npm view @ant-design/cli version
npx -y @ant-design/cli@6.5.0 info Button
npx -y @ant-design/cli@6.5.0 token Button
npx -y @ant-design/cli@6.5.0 demo Select basic
npx -y @ant-design/cli@6.5.0 changelog 5.0.0 6.5.0 Table
```

Use the latest verified v6.x version instead of `6.5.0` when npm reports a newer v6 release. Record the exact version and any queried components in the output.

## Core Rules

- Output is HTML: `docs/design/prototypes/<feature>/index.html`.
- The prototype must use Ant Design v6. Before generating or updating code, verify the current v6 package with `npm view antd version` and `npm view @ant-design/cli version`. If the latest version is not v6.x, pin the newest available v6.x version and record the choice.
- Use React >= 18, `antd@6.x`, and `@ant-design/icons@6.x` for interactive prototypes.
- Prefer Ant Design components and tokens over hand-built controls: `Layout`, `Menu`, `Breadcrumb`, `Button`, `Input`, `Select`, `Table`, `Form`, `Tabs`, `Steps`, `Drawer`, `Modal`, `Alert`, `Tooltip`, `Tag`, `Badge`, `DatePicker`, `Upload`, `Pagination`, `Empty`, `Spin`, `Result`.
- Start from semantic token roles for layout, container, elevated surface, text, border, status, radius and shadow. Map them through `ConfigProvider`, component tokens or CSS variables; do not use page-local color patches as a substitute.
- Use `theme.defaultAlgorithm` for the default theme, and use a theme algorithm for dark or compact variants. Do not manually invert colors or compress controls one by one.
- Keep one single primary action in each decision area. Every clickable save, submit, approve, publish, export or retry control must provide interaction feedback through state change, message, inline result, disabled reason or confirmation.
- Check accessibility contrast for text and icons at their actual surface and size. If the default pairing is insufficient, adjust a seed or component token rather than adding an arbitrary local color.
- Do not create extra data-service or fixture artifacts. Use embedded sample data inside the HTML/JS for visual and interaction demonstration only.
- Mark the file clearly as `PROTOTYPE ONLY - NOT PRODUCTION CODE`.
- Do not treat the HTML prototype as a stable frontend implementation, generated-client contract, or OpenAPI source of truth. It informs PRD calibration and OpenAPI Draft.

## Interaction Coverage

The HTML prototype must cover, or explicitly mark not applicable:

- Primary page navigation and page-to-page return path.
- Main task completion flow.
- Search / filter / sort / pagination behavior.
- Form input, validation, submit, cancel, dirty-form leave prompt.
- Drawer / modal / confirmation interactions.
- loading, empty, error, readonly, disabled, no-permission, conflict, success states.
- Permission behavior: hidden vs disabled vs rejected action.
- Field-level and page-level error placement.
- Single primary action, interaction feedback and confirmation for high-risk or irreversible actions.
- Responsive behavior for at least desktop, tablet, and narrow mobile viewport.

## Verification

Run a local browser verification before calling the artifact ready:

- Open `docs/design/prototypes/<feature>/index.html` or run the dev server if the prototype needs one.
- Check that the page renders nonblank.
- Exercise the main flow and at least one failure / permission / conflict state.
- Check at least one desktop and one mobile viewport.
- Record verification evidence in the response or in the related review / issue.

## Output Contract

```markdown
### 当前阶段
High-fidelity HTML prototype

### 输入资产
- <PRD / product overview / interaction spec / state matrix / prototype review>

### 高保真产物
- `docs/design/prototypes/<feature>/index.html`

### Ant Design v6 依据
- <antd version, @ant-design/cli version, official docs checked, CLI component/token/demo queries>

### 覆盖范围
- <pages, flows, states, permissions, data dependencies>

### 验证证据
- <render command or file open path, viewport checks, interaction checks>

### 是否可进入 PRD 校准 / API 影响分析
- <yes/no; list blocking gaps>

### 下一步
- <PRD calibration / return to high-fidelity prototype / return to product-design-prototype>
```
