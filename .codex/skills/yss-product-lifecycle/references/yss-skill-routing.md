# YSS Skill Routing

Route to the smallest useful skill set. Load a primary skill first, then add secondary skills only when the task requires their details.

## Product Design / Prototype

| Need | Primary skill | Add when needed |
|---|---|---|
| PRD baseline has UI impact and needs page/flow/state design | `product-design-prototype` | `wireframe-prototype`, `component-story-prototype`, `mock-api-prototype` |
| Low-fidelity page flow or wireframe | `wireframe-prototype` | `figma` / `figma-use` when using Figma; Penpot/tldraw/Axure links may be recorded without becoming required dependencies |
| Engineering prototype with component/page states | `component-story-prototype` | `mock-api-prototype` when data/error states are needed |
| Prototype needs provisional API data | `mock-api-prototype` | `api-integration` / `yss-openapi` only after OpenAPI Freeze |
| Gate before PRD calibration / OpenAPI Draft | `prototype-review` | Return to `product-design-prototype` if blocked |

Prototype acceptance:

- Use `docs/design/templates/interaction-spec-template.md` for the main interaction artifact.
- Use `docs/design/templates/state-matrix-template.md` for loading, empty, error, no-permission, readonly, conflict, and dirty-form states.
- Use `docs/design/templates/prototype-review-checklist.md` for the gate before PRD calibration and OpenAPI Draft.
- Capture PRD calibration notes and OpenAPI implications before API Draft: fields, filters, actions, errors, permissions, pagination, and concurrency/version data.
- Do not treat Storybook, MSW, Excalidraw, Figma, Penpot, tldraw, or xyflow as mandatory project dependencies in this template repo.

## Architecture / Visualization

| Need | Primary skill | Add when needed |
|---|---|---|
| Business architecture or capability map | `yss-product-lifecycle` | `excalidraw-diagram-generator` for user journey, value stream, swimlane, or capability map |
| Product overview design / functional architecture / module map | `yss-product-lifecycle` | `product-design-prototype` when UI flows expose module boundaries; `excalidraw-diagram-generator` for module/dependency diagrams |
| System overview design / system architecture / service boundary / deployment | `comet` or OpenSpec design workflow | `yss-backend-scaffold-parent` for YSS DDD baseline; `excalidraw-diagram-generator` for C4, sequence, DFD, or deployment diagrams |
| Data architecture / meta-model / lineage | `yss-domain-modeling` or `yss-domain` | `yss-repository` / `yss-mybatis` only after the model is stable; `excalidraw-diagram-generator` for ER, class, lineage, or DFD diagrams |

Architecture acceptance:

- Business architecture answers users, value stream, role/ecosystem boundary, and product capability map before PRD baseline when the product is new.
- Product overview design / functional architecture turns PRD scope into user flows, business objects, modules, priorities, dependencies, page/API/data impacts, MVP boundaries, and PRD gaps before PRD calibration.
- System overview design / system architecture covers service/module boundary, deployment, integration, security, performance, reliability, observability, rollout, and rollback before Design Review when those risks exist.
- Data architecture covers conceptual/logical/physical model, meta-model, versioning, lineage, query/search, index, storage, and migration constraints before persistence/repository work.
- For data modeling, metadata management, versioning, ER design, or lineage-analysis products, data architecture is mandatory before Design Review and OpenAPI Freeze.
- Excalidraw diagrams must reference upstream artifacts and push discovered issues back to PRD, OpenAPI, ADR, OpenSpec/Comet design, or issues.

## Frontend

| Need | Primary skill | Add when needed |
|---|---|---|
| New full YSS Vue page/module | `yss-page-module-development` | `yss-ui`, plus `api-integration` / `yss-openapi` when API is involved |
| Existing page refactor or component work | `yss-ui` | `api-integration` / `yss-openapi` when API contract changes |
| YTable layout or behavior | `yss-ui` | `yss-use-table-height` |
| YTree layout or search | `yss-ui` | `yss-use-tree-height` |
| YssFormily schema | `yss-formily` | `yss-formily-schema-generator` |
| API client / Orval | `api-integration` | `yss-openapi` only after OpenAPI Freeze or when explicitly refreshing generated clients from implemented backend contracts |

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
| Existing service feature | `yss-domain` | read `yss-backend-scaffold-parent` for baseline; add `yss-repository`, `yss-web-controller`, plus `yss-mybatis` when persistence framework details are involved |
| Domain model, aggregate, state | `yss-domain` | `yss-backend-scaffold-domain` |
| Domain DTO/Gateway conventions | `yss-backend-scaffold-domain` | `yss-dto` |
| PO / Repository / Convertor / GatewayImpl | `yss-repository` | `yss-mybatis` |
| MyBatis, PageQuery, datasource, batch | `yss-mybatis` | `yss-source-index` for real source locations |
| Controller / Web Convertor / DTO / VO | `yss-web-controller` | `yss-dto` |

Backend acceptance:

- Generate skeleton first for new services; do not hand-build a full multi-module scaffold.
- For existing backend features, check `yss-backend-scaffold-parent` before selecting layer-specific skills.
- Keep Domain independent from Infrastructure and Web.
- Define Gateway in Domain; implement it in Infrastructure.
- Keep persistence details out of Gateway interfaces.
- Use MapStruct for Convertor where the project convention supports it.
- Reuse `PageQuery` and existing MyBatis/BaseRepository mechanisms.
- Keep Controller dependent on Domain Gateway/Service, not Repository.

## Common Combinations

- Product/interaction prototype:
  product design and requirement freeze: `product-design-prototype` -> `wireframe-prototype` -> `prototype-review` -> requirement freeze
- Architecture artifact ladder:
  `yss-product-lifecycle` -> business / PRD / functional architecture -> system / data architecture when affected -> Design Review
- Architecture diagrams:
  source artifact -> `excalidraw-diagram-generator` -> review -> update source artifact
- Engineering state prototype:
  product design and requirement freeze: `product-design-prototype` -> `component-story-prototype` -> `mock-api-prototype` -> `prototype-review` -> requirement freeze
- Prototype to formal implementation:
  requirement freeze -> API Draft and engineering baseline -> contract freeze and OpenSpec / Comet -> `yss-router`
- Full CRUD slice:
  `yss-router` -> `yss-domain` -> `yss-repository` -> `yss-web-controller`
- CRUD with pagination / datasource concern:
  `yss-router` -> `yss-domain` -> `yss-repository` -> `yss-mybatis` -> `yss-web-controller`
- New frontend page/module with API:
  `yss-router` -> `yss-page-module-development` -> `yss-ui` -> `api-integration` -> `yss-openapi` after Freeze/generation boundary is clear
- Existing frontend page refactor with API:
  `yss-router` -> `yss-ui` -> `api-integration` -> `yss-openapi` when generated client refresh is required
- New backend service:
  `yss-router` -> `yss-ddd-scaffold-generator` -> `yss-backend-scaffold-parent` -> `yss-domain` -> `yss-repository` -> `yss-web-controller`
- Existing backend service feature:
  `yss-router` -> `yss-backend-scaffold-parent` -> `yss-domain` -> `yss-repository` -> `yss-web-controller`

## Do Not

- Do not load every YSS skill because the repo is a YSS repo.
- Do not use `yss-repository` before the domain model or metadata is stable.
- Do not use `yss-web-controller` before Gateway/metadata is stable.
- Do not use `yss-openapi` to invent API contracts during product/design work; use it to generate or refresh clients/contracts once the Draft/Freeze boundary is clear.
- Do not route a UI feature from PRD baseline directly to OpenAPI Draft; use `product-design-prototype`, `prototype-review`, and PRD calibration first.
- Do not use Excalidraw diagrams as the only source of truth for requirements, architecture decisions, API contracts, or tests.
- Do not make diagrams mandatory for small copy, style, config, or single-point bug fixes.
- Do not let frontend page code duplicate hook request callbacks or pagination state.
