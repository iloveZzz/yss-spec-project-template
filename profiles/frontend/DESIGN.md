---
version: alpha
name: YSS Data Quality Design System
description: A machine-readable Data Quality default visual contract for YSS enterprise applications, aligned with YSS enterprise visual semantics and framework-independent HTML prototypes. It complements the product lifecycle and does not define product behavior, API contracts, permissions, or business states.

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
  border: "#d9d9d9"
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
  card: 20px
  lg: 24px
  xl: 32px
  xxl: 48px

components:
  workspace-header:
    height: 48px
    backgroundColor: "{colors.surface}"
    typography: "{typography.body}"
  workspace-sidebar:
    width: 240px
    backgroundColor: "{colors.surface}"
  workspace-sidebar-collapsed:
    width: 64px
  workspace-tabs:
    height: 32px
    backgroundColor: "{colors.surface}"
  workspace-detail:
    width: 384px
    backgroundColor: "{colors.surface}"
  workspace-title:
    typography: "{typography.heading-md}"
  separator:
    backgroundColor: "{colors.border}"
    height: 1px
  button-primary:
    backgroundColor: "{colors.primary-control}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.sm}"
    height: 32px
  button-primary-hover:
    backgroundColor: "{colors.primary-control-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.sm}"
    height: 32px
  button-primary-disabled:
    backgroundColor: "{colors.border-secondary}"
    textColor: "{colors.text-tertiary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.sm}"
    height: 32px
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.sm}"
    height: 32px
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.xs}"
    height: 32px
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.xxs} {spacing.xs}"
    height: 32px
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
    height: 32px
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
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  button-compact:
    height: 28px
  button-small:
    height: 24px
  button-large:
    height: 40px
  card-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"

---

## Overview

YSS is an enterprise UI system for dense, scannable work surfaces: tables, forms, filters, workflows and operational feedback. This file is the normative source for visual tokens and component visual variants. Product behavior remains in Spec, interaction specifications and state matrices.

The production default theme adopts Data Quality global tokens on the Ant Design v6 design foundation: light mode, primary #3371ff, body 14px, controls 32/24/40px, radii 6/4/8px and card padding 20px. Production compact remains opt-in. New high-fidelity prototypes default to light compact using the named variants below; comfortable remains available. Existing page changes preserve their approved density and layout. Dark assets are historical references, unverified against the current specification, and are outside the default prototype route. Data Quality runs Vue 3 + Ant Design Vue 4.2.6 + YSS UI; that runtime version is distinct from the design foundation. Client-specific JSP themes and page-local glass effects are not defaults. New high-fidelity prototypes primarily use prebuilt shadcn-vue + Vue 3 with local token CSS. React authoring libraries and generation routes are retired; sealed React evidence is read-only legacy. Native HTML/CSS/JavaScript remains the lightweight route. Use registered components for product controls and task-specific compositions; upstream Blocks do not override these tokens or approved behavior. Production applications use the target implementation contract and lockfile; prototype visuals do not establish production component API compatibility.

## Colors

Use semantic roles (`primary`, `text`, `surface`, `border`, `success`, `warning`, `error`) instead of literal values in product pages. Keep a single primary action per decision area. The brand seed remains Data Quality #3371ff; primary-control #245bdb and its hover variant are deliberate YSS accessibility adaptations for white small text, not values copied from Data Quality. State colors must be paired with readable text or an icon and must meet WCAG 2.2 AA.

## Typography

Use the system font stack, 14px body text and 400/600 weights. Use `caption` only for supporting information; do not encode business status through weight alone.

## Layout

New enterprise prototypes use an application shell with module navigation, grouped sidebar, closable page Tags and a full-width work area. Page Tags are navigation controls with a subtle primary tint and border for the current page, separate activation and close buttons, and no Tab underline. Reserve Tabs for views within a page; their active state uses primary text and an indicator without a filled pill. The existing workspace-tabs roles continue to size and color the Tag strip. Collapsed sidebar items remain centered with a visible current-page marker and inverse Tooltips; tooltip bodies and arrows share the same surface. Shell dimensions come from the workspace component roles above. At 1200px and above the sidebar starts expanded; from 768px to 1199px it starts collapsed; below 768px navigation uses a modal Sheet. A selected list detail occupies the workspace-detail role on wide desktop and a Sheet below 1200px; no empty detail column is reserved. Forms retain a bounded reading width within the fluid workspace. Use one main vertical work-area scroll, an independent detail scroll where needed and localized table overflow. Workspace page titles use workspace-title; avoid repeating a large decorative title above task controls. These are prototype defaults, not an automatic migration of approved or production pages.

Use a 4px spacing grid and the spacing tokens above. New prototypes use the named compact control variant (28px) on desktop, the ordinary variant (32px) on narrow screens, and body typography (14px) throughout. Comfortable uses the ordinary control and card variants. Compact uses card-compact padding on desktop and spacing.sm on narrow screens. Small and large control variants remain 24px and 40px. These named prototype variants are not the full production tokens.compact.json algorithm result; do not apply a compact algorithm to them. When production uses an Ant Design theme algorithm, keep its seed `controlHeight` at 32px and apply compact once; never seed 28px and compact again. Page, container and overlay surfaces form the base three-layer model. On narrow screens, toolbars and filters reflow or collapse; table overflow is restricted to the table container.

## Elevation & Depth

Prefer surface and border changes over decorative shadows. Use the component library elevation tokens when available. Shadow values remain an implementation detail until the upstream DESIGN.md schema provides a stable structured elevation contract.

## Shapes

Controls use `rounded.md` (6px); cards and overlays use `rounded.lg` (8px); compact tags may use `rounded.sm` or `rounded.pill`. A container radius must not be smaller than the radius of its child controls.

## Components

The component keys above describe default visual variants and explicitly named optional sizes, not business states. The ordinary control variant uses a 32px computed height; prototype density selects the named variant as described in Layout. All variants retain body typography, pale semantic feedback surfaces and visible focus rings. Validate actual target size and spacing, keyboard operation and focus; control height alone does not establish accessibility. Required implementation states include hover, focus, active, disabled, loading, error, empty, readonly, no-permission, conflict and success. Define those behavior and acceptance details in the lifecycle state-matrix and prototype evidence assets.

## Do's and Don'ts

- Do consume tokens through ConfigProvider, CSS variables or the target component library theme.
- Do use local CSS projected from this specification for prototypes; production theme algorithms remain implementation-specific. Dark snapshots are historical and require new derivation and validation before adoption.
- Do verify desktop (`1440x900`), mobile (`390x844`) and impacted intermediate viewports.
- Do provide visible feedback for save, submit, publish, export and retry actions.
- Don’t use marketing hero layouts, large gradients or decorative cards in operational pages.
- Don’t hard-code colors, arbitrary spacing or duplicate controls that already exist in YSS UI.
- Don’t target component-library internal DOM or generated class names; v6 internal markup is not a stable contract.
- Don’t use a Tag as the only representation of an error, permission or approval state.
