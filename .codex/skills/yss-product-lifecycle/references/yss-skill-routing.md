# YSS Skill Routing

Route to the smallest useful skill set. Load a primary skill first, then add secondary skills only when the task requires their details.

## Frontend

| Need | Primary skill | Add when needed |
|---|---|---|
| New full YSS Vue page/module | `yss-page-module-development` | `yss-ui`, plus `api-integration` / `yss-openapi` when API is involved |
| Existing page refactor or component work | `yss-ui` | `api-integration` / `yss-openapi` when API contract changes |
| YTable layout or behavior | `yss-ui` | `yss-use-table-height` |
| YTree layout or search | `yss-ui` | `yss-use-tree-height` |
| YssFormily schema | `yss-formily` | `yss-formily-schema-generator` |
| API client / Orval | `api-integration` | `yss-openapi` |

Frontend acceptance:

- Use `@yss-ui/components` before raw `ant-design-vue` when YSS provides the component.
- Keep `index.vue` for composition and event forwarding.
- Put request, pagination, mapping, and fallback logic in `hooks/useXxx.ts`.
- Use `YTable` columns with `field/type` and field-named slots.
- Use `YssFormily` schema for query forms.
- Use `useTableHeight` / `useTreeHeight` on container refs.
- Cover loading, empty, error, and selected states.

## Backend

| Need | Primary skill | Add when needed |
|---|---|---|
| New DDD service skeleton | `yss-ddd-scaffold-generator` | specialist backend skills after generation |
| Existing service feature | `yss-domain` | `yss-repository`, `yss-web-controller`, plus `yss-mybatis` when persistence framework details are involved |
| Domain model, aggregate, state | `yss-domain` | `yss-backend-scaffold-domain` |
| Domain DTO/Gateway conventions | `yss-backend-scaffold-domain` | `yss-dto` |
| PO / Repository / Convertor / GatewayImpl | `yss-repository` | `yss-mybatis` |
| MyBatis, PageQuery, datasource, batch | `yss-mybatis` | `yss-source-index` for real source locations |
| Controller / Web Convertor / DTO / VO | `yss-web-controller` | `yss-dto` |

Backend acceptance:

- Generate skeleton first for new services; do not hand-build a full multi-module scaffold.
- Keep Domain independent from Infrastructure and Web.
- Define Gateway in Domain; implement it in Infrastructure.
- Keep persistence details out of Gateway interfaces.
- Use MapStruct for Convertor where the project convention supports it.
- Reuse `PageQuery` and existing MyBatis/BaseRepository mechanisms.
- Keep Controller dependent on Domain Gateway/Service, not Repository.

## Common Combinations

- Full CRUD slice:
  `yss-router` -> `yss-domain` -> `yss-repository` -> `yss-web-controller`
- CRUD with pagination / datasource concern:
  `yss-router` -> `yss-domain` -> `yss-repository` -> `yss-mybatis` -> `yss-web-controller`
- New frontend page/module with API:
  `yss-router` -> `yss-page-module-development` -> `yss-ui` -> `api-integration`
- Existing frontend page refactor with API:
  `yss-router` -> `yss-ui` -> `api-integration`
- New backend service:
  `yss-router` -> `yss-ddd-scaffold-generator` -> `yss-domain` -> `yss-repository` -> `yss-web-controller`
- Existing backend service feature:
  `yss-router` -> `yss-domain` -> `yss-repository` -> `yss-web-controller`

## Do Not

- Do not load every YSS skill because the repo is a YSS repo.
- Do not use `yss-repository` before the domain model or metadata is stable.
- Do not use `yss-web-controller` before Gateway/metadata is stable.
- Do not let frontend page code duplicate hook request callbacks or pagination state.
