---
name: formkit
description: Build or debug FormKit forms, validation, schema, or custom inputs in Vue, Nuxt, or React, or evaluate an explicit FormKit adoption request.
---

# FormKit

Use this skill when you are building, debugging, or refactoring FormKit forms, inputs, schema, validation, plugins, or node-tree behavior.

## Project setup

- YSS distributes this skill with the Frontend profile. Its [source record](upstream.json) identifies the pinned upstream release.
- Check the target package's manifest, lockfile, FormKit config, and installed version before applying examples. Use Vue or Nuxt docs for YSS Vue projects.
- Follow the project's existing form stack, component conventions, and theme. Add FormKit or migrate an existing form only within the requested scope. For an authorized installation, use the project's package manager and the official installation page for its runtime and version.

## Runtime selection

- FormKit has both React and Vue/Nuxt runtimes.
- Match the docs flavor to the project:
  - React or Astro-with-React: `https://formkit.com/<page>.react.md`
  - Vue or Nuxt: `https://formkit.com/<page>.vue.md`
- The full route index for both runtimes is in `references/docs-index.md`.

## FormKit Pro

- Check the input's documentation for the project's version and identify Pro inputs before selecting one. Pro inputs require `@formkit/pro`, a FormKit Pro project key, and registration through the runtime's FormKit config.
- Follow the project's existing Pro configuration. If the task requires adopting Pro, explain the dependency and key requirements before integration and use placeholders in examples.

## Mental model

- FormKit is a node tree. Inputs, forms, groups, and lists are all nodes with value, props, state, validation, messages, and plugins.
- Prefer declarative configuration through props, validation rules, schema, classes, sections, plugins, and node state.
- In general, listening to events in FormKit is an antipattern. FormKit already collects and reconciles state for you, so prefer reacting to value, validation state, form state, and node structure instead of manually wiring event chains.
- Reach for imperative event handlers only when there is no clear node- or state-driven alternative.

## Styling and themes

- Apply the project's existing theme, tokens, and component styles to FormKit sections or custom inputs. In YSS Vue projects, use the existing shadcn-vue components and theme where appropriate.
- When a YSS Vue project uses shadcn-vue controls with FormKit, see the [Vue integration example](references/yss-vue-integration.md) for field binding, submission, and server errors.
- If the task includes a new FormKit theme, select a theme compatible with the installed FormKit and Tailwind versions. Consult the styling and Tailwind theme guides in the [official index](references/docs-index.md) for CLI options and generated files.

## Core nodes

- `form`: submission boundary and top-level collector. A form aggregates descendant values, manages submit lifecycle, validation visibility, settled state, loading/submitting, and errors.
- `group`: object collector. A group combines named child nodes into an object and is the correct abstraction for nested records.
- `list`: array collector. A list manages ordered children, insertion/removal/reordering, and array-shaped values and validation.
- `input`: the leaf or higher-order field node. Inputs still participate in the same node tree and inherit the same state and validation model.

## Best practices

- Keep validation co-located with the inputs that own it.
- Prefer `form`, `group`, and `list` composition over manual object or array assembly.
- Prefer node APIs, props, and derived FormKit state over DOM queries or duplicate framework state.
- For cross-field behavior, model the relationship in the FormKit tree before introducing custom event plumbing.
- For backend validation or submission failures, prefer a small adapter/helper that maps the backend error payload into FormKit form errors plus keyed input errors.
- Normalize backend field paths into FormKit addresses such as `email`, `group.name`, or `group.list.2.name`, then pass them to `node.setErrors()` or framework `setErrors()`.
- Clear the previous submission's messages from the same source before retrying, including fields absent from the new response. In FormKit 2.10.0, distinct non-ASCII messages can generate the same key. Combine multiple messages into one per node or render them with stable distinct keys.
- For nested groups and lists, prefer dot-notation addresses over one-off manual field wiring in submit handlers.
- When customizing markup or behavior, preserve the existing schema and section structure unless the task really requires replacing it.
- In React, avoid mirroring FormKit form state in separate React state unless there is a clear boundary reason.
- In Vue or Nuxt, avoid watchers that duplicate FormKit state when node context or collected values already express the behavior.

## Workflow

1. Inspect the existing runtime, form tree, config, and validation rules.
2. Pick the runtime-specific markdown page from `references/docs-index.md`.
3. Prefer the smallest declarative change that keeps behavior inside FormKit.
4. If multiple fields interact, model that through `form`, `group`, `list`, validation, schema, or node state before adding listeners.
5. If backend errors are involved, add or reuse one adapter that converts the server response into FormKit form errors and dot-notation input-error keys.

## Pulling specific docs

- Open the exact runtime page directly from `references/docs-index.md`.
- If you only know the route, use:
  - React: `https://formkit.com/<page>.react.md`
  - Vue: `https://formkit.com/<page>.vue.md`
- Start with:
  - `/getting-started/installation`
  - `/essentials/architecture`
  - `/essentials/forms`
  - `/essentials/validation`
  - `/essentials/styling`
  - `/guides/create-a-tailwind-theme`
  - `/inputs/form`
  - `/inputs/group` and `/inputs/list`
  - the specific `/inputs/<type>` page involved in the task
