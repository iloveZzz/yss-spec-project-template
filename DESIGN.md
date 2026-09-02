---
version: alpha
name: YSS Enterprise Design System
description: A machine-readable visual design contract for YSS enterprise applications. It complements the product lifecycle and does not define product behavior, API contracts, permissions, or business states.

colors:
  primary: "#3371ff"
  primary-hover: "#5c8dff"
  primary-active: "#245bdb"
  on-primary: "#000000"
  text: "rgba(0, 0, 0, 0.88)"
  text-secondary: "rgba(0, 0, 0, 0.65)"
  text-tertiary: "rgba(0, 0, 0, 0.45)"
  canvas-layout: "#f0f2f5"
  surface: "#ffffff"
  surface-subtle: "#fafafa"
  border-secondary: "#f0f0f0"
  success: "#52c41a"
  warning: "#faad14"
  error: "#f5222d"
  selected: "#e6f4ff"

typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.571
  body-strong:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.571
  heading-lg:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.333
  heading-md:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.333
  caption:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.571
  button:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.571

rounded:
  none: 0px
  sm: 4px
  md: 6px
  lg: 8px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.md}"
    height: 32px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.md}"
    height: 32px
  button-primary-disabled:
    backgroundColor: "{colors.border-secondary}"
    textColor: "{colors.text-tertiary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.md}"
    height: 32px
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.md}"
    height: 32px
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.sm}"
    height: 32px
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.sm}"
    height: 32px
  table-header:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text}"
    typography: "{typography.body-strong}"
    padding: "{spacing.xs} {spacing.sm}"
  table-row-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "{spacing.xs} {spacing.sm}"
  modal-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "#ffffff"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.md}"
    height: 32px
  page-shell:
    backgroundColor: "{colors.canvas-layout}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "{spacing.md}"
  alert-success:
    backgroundColor: "{colors.success}"
    textColor: "#000000"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  alert-warning:
    backgroundColor: "{colors.warning}"
    textColor: "#000000"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  alert-error:
    backgroundColor: "{colors.error}"
    textColor: "#000000"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  secondary-copy:
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"

---

# Overview

YSS is an enterprise UI system for dense, scannable work surfaces: tables, forms, filters, workflows and operational feedback. This file is the normative source for visual tokens and component visual variants. Product behavior remains in Spec, interaction specifications and state matrices.

The visual baseline is Ant Design semantic tokens mapped to YSS UI. Production applications use Vue 3 + YSS UI / Ant Design Vue 4.x; high-fidelity prototypes use React + Ant Design 6.x. Both tracks consume the same semantic intent.

# Colors

Use semantic roles (`primary`, `text`, `surface`, `border`, `success`, `warning`, `error`) instead of literal values in product pages. Keep a single primary action per decision area. State colors must be paired with readable text or an icon and must meet WCAG 2.2 AA.

# Typography

Use the system font stack, 14px body text and 400/600 weights. Use `caption` only for supporting information; do not encode business status through weight alone.

# Layout

Use a 4px spacing grid and the spacing tokens above. Default controls are 32px high. Page, container and overlay surfaces form the base three-layer model. On narrow screens, toolbars and filters reflow or collapse; table overflow is restricted to the table container.

# Elevation & Depth

Prefer surface and border changes over decorative shadows. Use the component library elevation tokens when available. Shadow values remain an implementation detail until the upstream DESIGN.md schema provides a stable structured elevation contract.

# Shapes

Controls use `rounded.md` (6px); cards and overlays use `rounded.lg` (8px); compact tags may use `rounded.sm` or `rounded.pill`. A container radius must not be smaller than the radius of its child controls.

# Components

The component keys above describe visual variants, not business states. Required implementation states include hover, focus, active, disabled, loading, error, empty, readonly, no-permission, conflict and success. Define those behavior and acceptance details in the lifecycle state-matrix and prototype evidence assets.

# Do’s and Don’ts

- Do consume tokens through ConfigProvider, CSS variables or the target component library theme.
- Do verify desktop (`1440x900`), mobile (`390x844`) and impacted intermediate viewports.
- Do provide visible feedback for save, submit, publish, export and retry actions.
- Don’t use marketing hero layouts, large gradients or decorative cards in operational pages.
- Don’t hard-code colors, arbitrary spacing or duplicate controls that already exist in YSS UI.
- Don’t use a Tag as the only representation of an error, permission or approval state.
