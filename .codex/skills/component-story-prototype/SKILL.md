---
name: component-story-prototype
description: Use when Storybook, Histoire, component stories, page-state demos, or engineering prototypes are needed to validate UI states before full frontend implementation.
---

# Component Story Prototype

Use this skill when design decisions need executable UI states. It plans engineering prototypes; it does not require adding Storybook or Histoire to a repo unless the frontend project chooses that dependency.

## When To Use

- Page behavior depends on many states: loading, empty, error, permission, conflict, readonly, dirty form.
- Product/design review needs a clickable or inspectable UI before API Freeze.
- Existing frontend already uses Storybook/Histoire, or the team wants a temporary engineering prototype.

If the repo has no story tooling and the task only needs low-fidelity flow decisions, use `wireframe-prototype` instead.

## Story Plan

For each page or interaction, define:

- Component/page name and route context.
- Mock inputs and visible data.
- Actions demonstrated.
- State variants.
- OpenAPI or mock fixture dependency.
- Acceptance notes that later become frontend tests or E2E paths.

Recommended variants:

```text
Default
Loading
Empty
ValidationError
NoPermission
ReadonlyPublishedVersion
ConflictOnPublish
DirtyFormLeavePrompt
```

## Data Modeling Example

For model field editing, plan stories for:

- `ModelList.Default`, `ModelList.Empty`, `ModelList.NoPermission`.
- `ModelDetail.DraftFields`, `ModelDetail.PublishedReadonly`.
- `FieldEditor.Valid`, `FieldEditor.FieldLevelErrors`.
- `PublishModel.ValidationFailed`, `PublishModel.Success`, `PublishModel.Conflict`.

Use `mock-api-prototype` when these stories need stable mock responses before OpenAPI Freeze.

## Handoff

Record the story plan in the interaction spec. Do not treat stories as a replacement for PRD, OpenAPI, or design review.
