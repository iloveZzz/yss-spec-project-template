# <Feature Name> State Matrix

> Use with `product-design-prototype` before PRD calibration and OpenAPI Draft.

| Page / Component | State | Trigger | UI Behavior | API / Data Need | Acceptance |
|---|---|---|---|---|---|
| Model List | Loading | First load or filter change | Show table loading; keep filter controls usable when possible | Pending list request | User sees progress without layout jump |
| Model List | Empty | Query returns no records | Show empty result and create action if permitted | Empty page result | User can create or adjust filters |
| Model List | Error | List request fails | Show retry affordance and non-destructive error | Error code/message | Retry does not lose filters |
| Model List | No Permission | User lacks view permission | Show access message; hide data table | Permission response or preloaded auth state | No restricted data leaks |
| Model Detail | Loading | Detail request pending | Show skeleton or loading regions | Pending detail request | Actions disabled until loaded |
| Model Detail | Readonly | Published version opened | Disable edit/save/publish; allow version inspection | Model status/version | User cannot mutate published version |
| Field Editor Drawer | Dirty Form | User changes field values | Enable save; warn on close/navigation | Local form state | User can cancel or keep editing |
| Field Editor Drawer | Field Error | Save/validate returns field errors | Show error near field and in validation panel | Field-level error list | User can locate and fix each error |
| Publish Modal | Validation Failed | Publish precheck fails | Block publish and show grouped errors | Model/field validation errors | User sees exact blocking reasons |
| Publish Modal | Conflict | Draft changed since page load | Show refresh/retry decision | Conflict code, latest version/token | No accidental overwrite |
| Publish Modal | Success | Publish succeeds | Close modal, show published status/version | Published version metadata | Detail reflects frozen version |

## Required State Decisions

| Decision | Selected Behavior | Owner |
|---|---|---|
| Hidden vs disabled action for no permission |  | Product / Security |
| Field-level vs page-level validation errors | Field-level required for editable forms | Product |
| Conflict recovery | Refresh latest version before retry | Product / Architecture |
| Published version mutability | Published version is readonly | Product |
| Empty state primary action |  | Product |

## OpenAPI State Implications

| State | Contract implication |
|---|---|
| Loading | Async request exists; frontend needs stable pending state |
| Empty | Page result must represent zero records without error |
| Error | Standard error envelope and user-safe message |
| No Permission | Permission response or capability flags |
| Readonly | Status/version fields drive disabled UI |
| Field Error | Error body supports field path/code/message/severity |
| Conflict | Error code and latest version/token are available |
| Success | Response includes updated status, version, actor, and timestamp |
