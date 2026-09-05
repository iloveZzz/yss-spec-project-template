---
version: alpha
name: YSS Enterprise Design System
description: A machine-readable compact visual contract for YSS enterprise applications, aligned with Ant Design v6 semantic tokens and the experimental Antdv Next provider. It complements the product lifecycle and does not define product behavior, API contracts, permissions, or business states.

colors:
  primary: "#3371ff"
  primary-control: "#245bdb"
  primary-control-hover: "#2f68eb"
  primary-active: "#0958d9"
  primary-bg: "#e6f4ff"
  on-primary: "#ffffff"
  text: "rgba(0, 0, 0, 0.88)"
  text-secondary: "rgba(0, 0, 0, 0.65)"
  text-tertiary: "rgba(0, 0, 0, 0.45)"
  canvas-layout: "#f0f2f5"
  surface: "#ffffff"
  surface-elevated: "#ffffff"
  surface-subtle: "#fafafa"
  border-secondary: "#f0f0f0"
  success: "#52c41a"
  success-bg: "#f6ffed"
  warning: "#faad14"
  warning-bg: "#fffbe6"
  error: "#f5222d"
  error-bg: "#fff2f0"
  info-bg: "#e6f4ff"

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
    backgroundColor: "{colors.primary-control}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.sm}"
    height: 28px
  button-primary-hover:
    backgroundColor: "{colors.primary-control-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.sm}"
    height: 28px
  button-primary-disabled:
    backgroundColor: "{colors.border-secondary}"
    textColor: "{colors.text-tertiary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.sm}"
    height: 28px
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.sm}"
    height: 28px
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.xs}"
    height: 28px
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.xs}"
    height: 28px
  table-header:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text}"
    typography: "{typography.body-strong}"
    padding: "{spacing.xs} {spacing.sm}"
  table-row-selected:
    backgroundColor: "{colors.primary-bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "{spacing.xs} {spacing.sm}"
  modal-default:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.sm}"
    height: 28px
  page-shell:
    backgroundColor: "{colors.canvas-layout}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "{spacing.md}"
  alert-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  alert-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  alert-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  alert-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  badge-processing-solid:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.xs}"
  badge-success-solid:
    backgroundColor: "{colors.success}"
    textColor: "#000000"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.xs}"
  badge-warning-solid:
    backgroundColor: "{colors.warning}"
    textColor: "#000000"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.xs}"
  badge-error-solid:
    backgroundColor: "{colors.error}"
    textColor: "#000000"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.xs}"
  secondary-copy:
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
  card-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"

---

## Overview

YSS is an enterprise UI system for dense, scannable work surfaces: tables, forms, filters, workflows and operational feedback. This file is the normative source for visual tokens and component visual variants. Product behavior remains in Spec, interaction specifications and state matrices.

The visual baseline is Ant Design v6 semantic tokens mapped to YSS UI. Production applications use Vue 3 + YSS UI / Ant Design Vue 4.x; high-fidelity React prototypes use Ant Design 6.x, while experimental Vue prototypes may use the draft Antdv Next provider against an exact-version fact pack. These tracks share visual intent, not framework APIs.

## Colors

Use semantic roles (`primary`, `text`, `surface`, `border`, `success`, `warning`, `error`) instead of literal values in product pages. Keep a single primary action per decision area. State colors must be paired with readable text or an icon and must meet WCAG 2.2 AA.

## Typography

Use the system font stack, 14px body text and 400/600 weights. Use `caption` only for supporting information; do not encode business status through weight alone.

## Layout

Use a 4px spacing grid and the spacing tokens above. Keep the Ant Design seed `controlHeight` at 32px, then apply the compact algorithm once; the default prototype and dense-work-surface result is 28px. Never seed 28px and apply compact again. Page, container and overlay surfaces form the base three-layer model. On narrow screens, toolbars and filters reflow or collapse; table overflow is restricted to the table container.

## Elevation & Depth

Prefer surface and border changes over decorative shadows. Use the component library elevation tokens when available. Shadow values remain an implementation detail until the upstream DESIGN.md schema provides a stable structured elevation contract.

## Shapes

Controls use `rounded.md` (6px); cards and overlays use `rounded.lg` (8px); compact tags may use `rounded.sm` or `rounded.pill`. A container radius must not be smaller than the radius of its child controls.

## Components

The component keys above describe compact visual variants, not business states. Controls use a 28px computed height, 14px body type, pale semantic feedback surfaces and visible focus rings. Required implementation states include hover, focus, active, disabled, loading, error, empty, readonly, no-permission, conflict and success. Define those behavior and acceptance details in the lifecycle state-matrix and prototype evidence assets.

## Do's and Don'ts

- Do consume tokens through ConfigProvider, CSS variables or the target component library theme.
- Do compose `compactAlgorithm` with `darkAlgorithm` for dark compact work surfaces.
- Do verify desktop (`1440x900`), mobile (`390x844`) and impacted intermediate viewports.
- Do provide visible feedback for save, submit, publish, export and retry actions.
- Don’t use marketing hero layouts, large gradients or decorative cards in operational pages.
- Don’t hard-code colors, arbitrary spacing or duplicate controls that already exist in YSS UI.
- Don’t target component-library internal DOM or generated class names; v6 internal markup is not a stable contract.
- Don’t use a Tag as the only representation of an error, permission or approval state.
