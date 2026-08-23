---
name: high-fidelity-html-prototype
description: Use after low-fidelity prototype review is approved and before Spec calibration, requirement freeze, OpenAPI Draft, or UI implementation when a user-facing YSS feature needs a high-fidelity interactive HTML prototype using Ant Design v6.
---

# High Fidelity HTML Prototype

## 兼容入口

本 skill 仅服务旧名称或既有链接；新的高保真产出遵循 `yss-prototype-stage`，在 Codex 由 `product-design:index` 路由。它不批准生命周期门禁或实现就绪状态。

Use this skill only after `prototype-review` approves the low-fidelity prototype / interaction design. It turns reviewed product design into a high-fidelity, browser-runnable HTML artifact for business, UX, frontend, and API review.

## Required Inputs

- Spec baseline: `docs/.scratch/<feature>/spec.md`.
- Product overview design / functional architecture: `docs/.scratch/<feature>/design/<feature>-product-overview-design.md`.
- Interaction spec: `docs/.scratch/<feature>/design/<feature>-interaction-spec.md`.
- State matrix: `docs/.scratch/<feature>/design/<feature>-state-matrix.md`.
- Approved low-fidelity prototype review: `docs/.scratch/<feature>/design/<feature>-prototype-review.md` or equivalent issue comment.
- Project design system: `docs/design/design.md` and `docs/design/tokens/*`.

If low-fidelity `prototype-review` is blocked or missing, stop and return to `yss-prototype-stage` / `prototype-review`.

## Ant Design Official Agent Baseline

Ant Design v6 事实由 `yss-antd-design` 执行并回写 `prototype-evidence.yaml`。本兼容入口不并列调用官方 `antd` skill，也不在前端代码落地时使用；实现改走 `yss-ui`。

## Core Rules

- Output is HTML: `docs/.scratch/<feature>/design/prototypes/index.html`.
- The prototype must use the approved Ant Design v6 target. Obtain component facts from the official `antd` CLI and record the exact CLI/target versions; do not infer version-sensitive APIs from memory.
- Use React >= 18, `antd@6.x`, and `@ant-design/icons@6.x` for interactive prototypes.
- Prefer Ant Design components and tokens over hand-built controls: `Layout`, `Menu`, `Breadcrumb`, `Button`, `Input`, `Select`, `Table`, `Form`, `Tabs`, `Steps`, `Drawer`, `Modal`, `Alert`, `Tooltip`, `Tag`, `Badge`, `DatePicker`, `Upload`, `Pagination`, `Empty`, `Spin`, `Result`.
- Do not create extra data-service or fixture artifacts. Use embedded sample data inside the HTML/JS for visual and interaction demonstration only.
- Mark the file clearly as `PROTOTYPE ONLY - NOT PRODUCTION CODE`.
- Do not treat the HTML prototype as a stable frontend implementation, generated-client contract, or OpenAPI source of truth. It informs Spec calibration and OpenAPI Draft.

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
- Responsive behavior for at least desktop, tablet, and narrow mobile viewport.

## Verification

Run a local browser verification before calling the artifact ready:

- Open `docs/.scratch/<feature>/design/prototypes/index.html` or run the dev server if the prototype needs one.
- Check that the page renders nonblank.
- Exercise the main flow and at least one failure / permission / conflict state.
- Check at least one desktop and one mobile viewport.
- Record verification evidence in `docs/.scratch/<feature>/verification/prototype-evidence.yaml` and link it from the review and confirmation record.

## Output Contract

```markdown
### 当前阶段
High-fidelity HTML prototype

### 输入资产
- <docs/.scratch/<feature>/spec.md / docs/.scratch/<feature>/design/...>

### 高保真产物
- `docs/.scratch/<feature>/design/prototypes/index.html`

### Ant Design v6 依据
- <antd version, @ant-design/cli version, official docs checked, CLI component/token/demo queries>

### 覆盖范围
- <pages, flows, states, permissions, data dependencies>

### 验证证据
- <render command or file open path, viewport checks, interaction checks>

### 是否可进入 Spec 校准 / API 影响分析
- <yes/no; list blocking gaps>

### 下一步
- <Spec calibration / return to high-fidelity prototype / return to yss-prototype-stage>
```
