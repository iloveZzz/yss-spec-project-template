---
name: yss-page-module-development
description: 指导创建标准 Vue 3 YSS 业务页面模块，覆盖 CRUD、列表、表单、详情、左树右表、组件选型、Orval 接口、主题 Token、原型还原和交付验证。
---

# YSS Page Module Development

> **核心路由说明**：新页面生成开发请优先以 `../yss-ui-business-page-generation/SKILL.md` 为统一主规则与硬约束。当前会话可用 yss-ui MCP 时，生成业务代码前必须先调用 `get_codegen_rules`。本技能作为兼容旧触发名与流程编排入口保留。

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
- `yss-api-integration` for Orval-generated APIs and submit/list/detail flows.
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

## YSS business page contract

- 页面实现前先按 `component-selection-imports` 判定真实导出；已封装能力优先从 `@yss-ui/components`、`@yss-ui/hooks`、`@yss-ui/utils` 导入。
- 标准列表使用 `YTable` 的真实 `data`、`columns`、`loading`、`pageable`、`v-model:pagination` 和 `@page-change`；主操作放在 `#toolbar-right`，只有确实需要列设置时才启用 `toolbar-config.custom`。
- 查询区使用 `YFormily` 渲染字段，查询/重置按钮位于表单外部并在窄屏下保持右下对齐；表单、表格、树和导出细节分别加载 `yss-formily`、`ytable-usage`、`ytree-usage` 和 `file-export-download`。
- 页面有原型或旧页面参考时先读取 `prototype-page-acceptance`，建立视觉、状态、交互和响应式验收清单；交付时必须逐项对照。
- 页面和组件的颜色、状态色及暗色模式遵循 `theme-token-usage`，不得硬编码品牌色。
- Orval API 必须使用当前生成导出和 DTO；错误由 mutator 统一处理，业务 Hook 不重复判断 `success` 或重复提示错误。
- 列表/树高度按实际分页、工具栏和搜索状态选择 `yss-use-table-height` / `yss-use-tree-height`，不得用固定魔法高度替代。

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

## Stage 7 Contract

- Require an approved `Slice Implementation Contract`, requirement freeze, low-fidelity review, state matrix, the selected H1/H2 prototype deliverable, schema v3 browser/Design-QA/profile evidence, user confirmation, and a current frontend implementation plan; production APIs come from YSS UI + the actual implementation lockfile only after entering implementation.
- Bind page, hooks, schema, blocks, generated API client, component tests, and E2E paths to contract fields and `allowed_write_paths`.
- User-visible loading, empty, error, permission, selection, pagination, and action behavior use `behavior-tdd`; purely mechanical page scaffolding may use documented `controlled-generation`.
- Return the shared `YSS Skill Execution Result`. A prototype mismatch, new API, new permission state, path overrun, or missing evidence must produce `drift`, `violation`, or `new_impacts`, not `implemented`.
