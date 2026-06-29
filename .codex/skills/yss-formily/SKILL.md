---
name: yss-formily
description: Use this skill when working with YssFormily or YFormily in this repository, including building or modifying schema-driven forms, search forms, detail/read-only views, field linkage, async validation, dynamic arrays, step forms, or custom slot-based form fields. Covers the project's required import rules, schema structure, event and effects selection, mode switching, detail rendering, and where to find the canonical YSS Formily docs and demos.
---

# YssFormily

This skill is the working guide for `YssFormily` in this repository.
Use it when the task involves:

- creating or editing a `YssFormily` / `YFormily` form
- writing or refactoring a Formily schema
- implementing add/edit/detail forms with one shared schema
- building field linkage, reactions, form `effects`, async validation
- adding custom slot fields such as Monaco, SQL, rich text, custom hints
- debugging why a form does not submit, does not react, or renders incorrectly

`YssFormily` in this project is a YSS wrapper built on top of the Ant Design Vue ecosystem.
When reasoning about component props, event names, interaction behavior, and rendered form controls, treat Ant Design Vue as the underlying UI behavior model.

## Source of truth

Read the scenario map first:

1. [references/examples.md](references/examples.md)

If the user asks for a concrete pattern, inspect the closest existing YSS form page or example in the repository and match its local convention.

## Hard rules

### Imports

Business code should import the wrapper component from `@yss-ui/components`.
Do not build business forms by directly importing Formily UI components from React packages.

Preferred imports:

```ts
import { YssFormily, YFormily, type ISchema } from "@yss-ui/components";
import {
  createForm,
  onFieldValueChange,
  onFormSubmit,
  onFormSubmitFailed,
} from "@formily/core";
```

Avoid these imports unless a file already depends on them for a narrow advanced case:

- `@formily/antd`
- `@formily/antd-v3`
- direct UI field imports from `@formily/antdv` for ordinary business forms

`YssFormily` already wraps the common Ant Design Vue Formily components and project-specific adapters.
Its field event behavior should be understood through Ant Design Vue conventions first, then the YSS wrapper conventions.

### Prefer one schema for add, edit, detail

Default approach:

- `mode=0`: create
- `mode=1`: edit
- `mode=2`: detail

Do not fork separate edit/detail implementations unless the UI is materially different.

### Use `v-model` as the main value source

`initial-values` is initialization only.
For fetched data, editing state, and mode switching, prefer `v-model` or instance `setValues`.

## Default build pattern

Start with this shape unless the existing page already uses a different local convention:

```ts
const schema: ISchema = {
  type: "object",
  properties: {
    layout: {
      type: "void",
      "x-component": "FormLayout",
      "x-component-props": {
        layout: "horizontal",
        labelWidth: 120,
      },
      properties: {
        grid: {
          type: "void",
          "x-component": "FormGrid",
          properties: {
            fieldName: {
              type: "string",
              title: "字段名",
              "x-decorator": "FormItem",
              "x-component": "Input",
            },
          },
        },
      },
    },
  },
};
```

Interpretation:

- `FormLayout` controls label layout and size
- `FormGrid` controls responsive columns
- fields normally use `FormItem`

Do not hand-build layout with ad hoc wrapper divs if `FormLayout`, `FormGrid`, `GroupHeader`, or `AutoButtonGroup` already solve it.

## Choose the right mechanism

Use this decision order:

1. Static field structure and basic validation:
   put it in `schema`
2. Visibility, disabled state, or simple dependency:
   use `x-visible`, `x-disabled`, `x-reactions`
3. Reusable event handlers or cross-field helper functions:
   inject through `scope`
4. Form-wide side effects, submit lifecycle, async orchestration:
   use `createForm({ effects })`
5. Rich custom rendering:
   use `Slot` in edit mode and `detail-*` slots in detail mode

### Event selection

Event names follow the underlying Ant Design Vue component behavior.

- text input: prefer `x-component-props.onUpdate:value`
- select, radio, switch, date picker: usually `x-component-props.onChange`
- submit: `Submit.x-component-props.onSubmit`

Do not attach multiple equivalent listeners to the same field unless the existing component requires it.

### `x-reactions` vs `scope` vs `effects`

Use `x-reactions` for declarative field-to-field linkage:

- show/hide
- disable/enable
- reset a sibling field
- update a dependent enum or datasource

Use `scope` for local handlers when the schema needs to call project code:

- remote search
- custom validation helper
- helper function reused by multiple fields

Use `effects` for form-level orchestration:

- global submit success or failure behavior
- multi-field coordination
- async side effects not tied cleanly to one field
- analytics or global notification hooks

## Mode and detail view

When `mode=2`, `YssFormily` can render as a `Descriptions`-style detail view.

Default detail rendering already handles:

- `enum` to label
- `DatePicker` to `YYYY-MM-DD`
- boolean or `Switch` to “是/否”
- arrays joined by `、`
- empty values as `-`

Use `detail-options` to control layout.
Important constraint from the component doc:

- `responsive` is `true` by default
- when `responsive=true`, `columns` is ignored
- if you need a fixed max of two columns, set `maxColumns: 2` or `responsive: false`

### Detail slot naming

For detail mode custom rendering, use:

```text
#detail-<path>
```

Replace dots with hyphens.

Examples:

- `email` -> `#detail-email`
- `user.email` -> `#detail-user-email`

## Slot strategy

For custom edit-mode content inside the schema, use:

```ts
'x-component': 'Slot',
'x-component-props': { name: 'sql' }
```

Then provide:

```vue
<template #sql="{ value, onChange }">...</template>
```

For the same field in detail mode, provide:

```vue
<template #detail-sql="{ value }">...</template>
```

This is the preferred pattern for:

- Monaco editors
- SQL or JSON editors
- rich text or code previews
- custom helper blocks

## Layout guidance

Use these built-ins before writing custom wrappers:

- `FormLayout`
- `FormGrid`
- `GroupHeader`
- `AutoButtonGroup`
- `FormCollapse`
- `FormStep`
- `ArrayItems`

Recommended habits:

- use `x-decorator-props.gridSpan` for wide fields
- use `GroupHeader` for section titles instead of ad hoc headings
- use `AutoButtonGroup` for aligned action areas
- set shared grid behavior through `grid-defaults` at component usage level

## Instance methods

When page logic needs imperative control, get a component ref and use:

- `getValues`
- `setValues`
- `submit`
- `setFieldState`
- `form`

Prefer these methods over reaching into internal implementation details.

## Working sequence for implementation

When asked to build or refactor a form, follow this sequence:

1. Read the existing page and find current mode, data source, and submit flow.
2. Read the canonical Formily doc and the most relevant demo.
3. Design the schema first:
   fields, layout, sections, buttons.
4. Add validation and enum handling.
5. Add simple linkage with `x-visible` / `x-disabled` / `x-reactions`.
6. Add `scope` handlers or `effects` only where schema alone is insufficient.
7. If detail mode exists, verify `mode=2` rendering and slot coverage.
8. Verify submit behavior, especially the `Submit` handler path.

## Common mistakes to avoid

- Using `initial-values` as if it were reactive state
- Splitting add/edit/detail into separate unrelated schemas without necessity
- Writing large business logic inline in schema expressions
- Forgetting that detail-mode slot naming is fixed as `detail-<path>`
- Expecting `detail-options.columns` to work while `responsive=true`
- Using custom layout divs where `FormGrid` and `gridSpan` should be used
- Solving complex form coordination with scattered component events instead of `effects`

## When to open demos

Open the matching demo before writing code for these scenarios:

- dynamic show or hide
- dynamic disable
- custom slot
- group or collapse section
- effects
- async validation
- multi-dependency linkage
- submit failure handling
- steps
- dynamic array

The example index is in:
[references/examples.md](references/examples.md)

## Output expectation

When using this skill, produce code that is:

- schema-first
- mode-aware
- concise in business pages
- aligned with `@yss-ui/components`
- anchored to existing YSS docs and demos instead of inventing a parallel pattern
