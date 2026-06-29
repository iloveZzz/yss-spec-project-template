---
name: yss-page-module-development
description: Guide AI to create standardized Vue 3 business page modules for YSS micro-applications, including directory layout, hook extraction, table/tree height hooks, YssFormily query areas, YTable pages, and left-tree-right-content shells.
---

# YSS Page Module Development

Use this skill when the user asks for a business page, CRUD module, tree-table page, detail page, or any standard YSS Vue 3 page module.

## Authoritative Docs And Skill Boundaries

- YSS UI components: `http://192.168.164.27:3200/components`
- YSS UI hooks: `http://192.168.164.27:3200/hooks`
- YSS UI skills: `http://192.168.164.27:3200/skills`
- Local reference index: `references/frontend-docs.md`

This skill orchestrates page/module creation. Load narrower skills only when their details are needed:

中文说明：这个技能负责“建页面模块的流程编排”。遇到具体组件、接口、Hook、高度、Formily 细节时，再补充加载更窄的专项技能。

- `yss-components` for layout, YTable/YTree/YssFormily/YSplitPane component specifics.
- `yss-hook` for request, pagination, parameter, and mapping logic.
- `api-integration` for Orval-generated APIs and submit/list/detail flows.
- `yss-use-table-height` and `yss-use-tree-height` for height calculation.
- `yss-formily` for detailed schema behavior.

## What this skill produces

- a page folder with predictable structure
- a clear split between page composition and hook logic
- YSS-aligned query, table, tree, and layout wiring
- code that follows the existing app conventions instead of ad hoc UI assembly

## Recommended workflow

1. Identify the page type: list, tree-table, detail, or mixed.
2. Decide whether the page needs `YssFormily`, `YTable`, `YTree`, `YSplitPane`, or custom blocks.
3. Create the page folder structure.
4. Move request and parameter logic into hooks.
5. Assemble the page with minimal logic in `index.vue`.
6. Verify loading, empty, and error states.

## Standard structure

```text
views/PageName/
  components/
    XxxBlock/
      index.vue
      style.less
      type.ts
  hooks/
    usePageTable.ts
    usePageTree.ts
  schemas/
    searchSchema.ts
  index.vue
  style.less
```

Rules:

- `index.vue` is for composition only.
- `hooks/` holds request, parameter, selection, and mapping logic.
- `components/` holds reusable blocks and view fragments.
- `schemas/` holds YssFormily schema definitions.

## Component priority

1. Prefer `@yss-ui/components`.
2. Use `ant-design-vue` only when YSS does not provide the needed control.
3. Reuse existing page patterns before inventing a new layout.

## Layout rules

For left-tree-right-content pages:

- use `YSplitPane` or an equivalent flexible split layout
- keep the right side ordered as Header -> Query -> Data
- make the content area flexible, not fixed height
- provide a clear empty state when nothing is selected

For non-split pages:

- keep the main region responsive
- avoid nested fixed-height containers that fight scrolling

## Height hooks

Use `useTableHeight` and `useTreeHeight` when the page needs available-height calculation.

- bind the ref to the container, not to the table/tree itself
- include pagination or toolbar offsets when they exist
- keep the container `flex: 1; overflow: hidden`

## Query and data regions

### YssFormily

- use schema-driven queries
- keep action buttons in the schema
- keep local helper logic in `scope`

### YTable

- use `field/type` column definitions
- prefer named slots for custom cells
- keep pagination and loading state driven by hook state

### YTree

- keep tree data and selection logic in hooks
- use search offsets and height helpers when search is present

## Page coding rules

- use `<script setup lang="ts">`
- keep `index.vue` thin
- move data transformation out of templates
- keep action handlers small and explicit
- preserve existing route, menu, and permission conventions in the repo

## Deliverables

When implementing a page module, the result should usually include:

- page shell
- hook file(s)
- schema file(s)
- block components if needed
- styles

## Checklist

- the page structure matches the chosen pattern
- request logic is isolated in hooks
- query, pagination, and selection state have one source of truth
- empty, loading, and error states are covered
- custom blocks are extracted only when they improve clarity or reuse

## Do not

- do not put large request flows in `index.vue`
- do not duplicate parameter handling across page and hook
- do not bypass YSS components when a project-standard control exists
- do not over-split a simple page into unnecessary files
