---
name: mock-api-prototype
description: Use when MSW, mock service worker, mock fixtures, fake API responses, or prototype data contracts are needed before OpenAPI Freeze or generated API clients are available.
---

# Mock API Prototype

Use this skill to make prototypes exercise realistic data and error states before the formal API contract is frozen.

## Guardrail

Mock contracts are provisional. They may inform OpenAPI Draft, but they are not the source of truth after OpenAPI Freeze. Once the API is frozen, regenerate or align mocks from the frozen contract.

## Fixture Contract

For each mocked interaction, capture:

- Operation name and screen/action that uses it.
- Request params/body fields.
- Success response shape.
- Error response shape, including field-level validation errors when relevant.
- Permission and conflict responses.
- Pagination/filtering/sorting behavior when present.

## Tool Choices

| Situation | Suggested approach |
|---|---|
| Frontend prototype with network-like behavior | MSW handlers |
| Storybook/Histoire state-only demo | JSON fixtures or static module mocks |
| API design discussion | Markdown examples in interaction spec |
| Contract has been frozen | Generate or align from OpenAPI via `api-integration` / `yss-openapi` |

## Data Modeling Example

Prototype these responses:

- Model list success with draft/published statuses.
- Empty model list.
- Field editor save success.
- Field editor validation error with `fieldCode`, `message`, and `severity`.
- Publish validation failed with model-level and field-level errors.
- Publish conflict when version changed since page load.
- No-permission response for publish action.

## Handoff

Write mock examples into `docs/design/<feature>-interaction-spec.md` or the story plan. Then use `prototype-review` to confirm the mock data can drive PRD calibration and OpenAPI Draft.
