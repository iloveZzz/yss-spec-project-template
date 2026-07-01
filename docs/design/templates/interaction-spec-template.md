# <Feature Name> Interaction Spec

> Use after PRD baseline and before PRD calibration / OpenAPI Draft when the feature has UI impact.

## 1. Inputs

| Asset | Path / Link | Notes |
|---|---|---|
| PRD baseline | `docs/requirements/<feature>-prd.md` | Calibrate after prototype review |
| Domain terms | `CONTEXT.md` |  |
| Discovery | `docs/discovery/<feature>-discovery.md` | Optional |
| Prototype / wireframe | `<link or exported image path>` | Excalidraw / Figma / Penpot / tldraw / Axure / Markdown |
| Existing API draft | `docs/api/specs/<feature>.yaml` | Optional; product design and PRD calibration should usually come first |

## 2. Page Map

| Page / Panel | Entry | Primary user | Purpose | Exit / Next |
|---|---|---|---|---|
| Model List | Main navigation | Data modeler | Search, filter, create, and open models | Model Detail |
| Model Detail | Model List row | Data modeler | View base info, fields, validation, publish status | Field Editor / Version History |
| Field Editor Drawer | Edit field action | Data modeler | Create or update model fields | Model Detail |
| Publish Confirmation Modal | Publish action | Data modeler / admin | Confirm validation result and version freeze | Model Detail |
| Version History | Model Detail tab | Admin / developer | Inspect published versions and changes | Model Detail |

## 3. User Flow

### Main Flow

1. User opens Model List.
2. User filters by status or keyword.
3. User opens a draft model.
4. User edits fields in Field Editor Drawer.
5. User runs validation.
6. User confirms publish.
7. System freezes a published version and shows version metadata.

### Exception Flows

| Trigger | System behavior | User recovery |
|---|---|---|
| Validation fails | Show model-level and field-level errors | Fix fields and validate again |
| No publish permission | Hide or disable publish action and return permission error if invoked | Contact administrator |
| Version conflict | Show latest version and discard/refresh choice | Refresh detail and reapply changes |
| Unsaved changes | Show leave confirmation | Stay or discard changes |

## 4. Page Details

### Model List

| Region | Content / Component | Notes |
|---|---|---|
| Search form | keyword, status, owner | Use Formily when implemented in YSS frontend |
| Table | modelCode, modelName, status, owner, updatedAt, latestPublishedVersion, actions | Use YTable when implemented |
| Actions | Create, Edit, Validate, Publish, View Versions | Permission-driven visibility/disabled state |

### Model Detail

| Region | Content / Component | Notes |
|---|---|---|
| Header | modelName, modelCode, status, latestVersion | Published version is readonly |
| Tabs | Base Info, Fields, Version History |  |
| Validation panel | model errors, field errors, warning count | Field-level anchor required |
| Footer actions | Save Draft, Validate, Publish | Publish requires validation pass |

### Field Editor Drawer

| Field | Type | Required | Validation / UI Notes |
|---|---|---|---|
| fieldCode | string | Yes | Unique within model |
| fieldName | string | Yes | Display name |
| dataType | enum | Yes | Select from supported data types |
| nullable | boolean | Yes |  |
| primaryKey | boolean | No | At least one primary key may be required by policy |
| defaultValue | string | No | Validate by dataType |
| businessMeaning | string | No | Long text |

## 5. State Matrix

Link or paste from `docs/design/templates/state-matrix-template.md`.

## 6. OpenAPI Implications

| UI Need | API implication | Notes |
|---|---|---|
| Model list pagination | `GET /api/v1/models` with page, size, filters | Return status, latestPublishedVersion |
| Field editor save | create/update field endpoint or model draft save endpoint | Include field validation response |
| Validate before publish | validation endpoint returning model and field errors | Error shape must support anchors |
| Publish confirmation | publish endpoint with expected draft/version token | Conflict response required |
| Version history | version list endpoint | Include actor/time/change summary |

## 7. PRD Calibration Notes

| Finding from prototype | PRD update needed | Owner / Status |
|---|---|---|
| Field-level validation needs anchors | Add acceptance criteria for field-level error placement | Product / Pending |
| Published version is readonly | Add explicit non-mutation rule | Product / Confirmed |
| Publish conflict requires recovery | Add conflict path to exception flow | Product / Pending |

## 8. Frontend Acceptance

- Loading, empty, error, no-permission, readonly, conflict, and dirty-form states are visible or explicitly not applicable.
- Every table column, filter, form field, drawer, modal, and button has a data source or mock fixture.
- The design can be split into vertical slices that are independently demoable.
- Storybook/Histoire or static fixtures are planned if engineering prototype is required.

## 9. Decisions And Open Questions

| Type | Item | Owner | Due / Status |
|---|---|---|---|
| Confirmed | Published version is readonly | Product | Confirmed |
| Open | Whether admins can deprecate a published version | Product / Architecture | Pending |
| Non-goal | Approval workflow | Product | MVP excluded |
| Human review | Database migration generation | Human | TODO-HUMAN-REVIEW |
