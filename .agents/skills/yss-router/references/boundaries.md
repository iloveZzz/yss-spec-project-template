# YSS Skill Boundaries

Use this reference when multiple YSS skills seem applicable.

中文说明：当多个 YSS 技能看起来都能用时，先看这个边界说明，选择最小技能组合。

## Frontend Boundaries

- `yss-page-module-development`: Page/module workflow. Use for creating or reorganizing a page folder, deciding structure, and assembling page, hooks, schemas, and blocks.
- `yss-components`: Component layout and visual/page composition rules. Use for YTable/YTree/YssFormily/YSplitPane usage details.
- `yss-hook`: Request, pagination, parameter, tree-selection, and response-mapping logic in `views/**/hooks/useXxx.ts`.
- `api-integration`: Orval-generated API client imports, request/response mapping, `useRequest` calling patterns, submit/list/detail flows.
- `yss-formily`: Hand-written YssFormily schema implementation and form behavior.
- `yss-formily-schema-generator`: Generate YssFormily schema from requirements, screenshots, mockups, Figma, or natural-language field descriptions.
- `yss-use-table-height`: Only table available-height calculation and required container/pagination/toolbar wiring.
- `yss-use-tree-height`: Only tree available-height calculation, search offset, and virtual scrolling wiring.

Default for a new page: first verify the approved product design, state matrix, Ant Design v6 high-fidelity HTML prototype, AntD CLI evidence, and user confirmation; then start with `yss-page-module-development` and add the narrow skills that match the page controls.

中文说明：新建页面默认从页面模块技能开始，只有遇到具体组件、Hook、API、Formily 细节时再加载专项技能。

## Backend Boundaries

- `yss-ddd-scaffold-generator`: Create a whole multi-module backend skeleton.
- `yss-domain`: Domain modeling, domain gateway contracts, and domain-layer conventions.
- `yss-application`: Application use cases, transaction boundaries, and cross-aggregate orchestration.
- `yss-repository`: Persistence implementation, PO, Repository, Convertor, GatewayImpl.
- `yss-web-controller`: REST adapter layer, request/response DTOs, VO, web convertor.
- `yss-mybatis`: Framework behavior for MyBatis/MyBatis-Plus, BaseRepository, pagination, mapper scanning, batch, datasource issues.
- `yss-dto`: Result/PageQuery/CommandDTO/QueryDTO and unified API contract objects.

Default for end-to-end backend CRUD: include Domain, Application, Infrastructure, and Web skills plus `mapstruct`, `lombok`, and `alibaba-java-code-style`; add `yss-mybatis` when persistence framework details matter. The executable closure in `router-contract.yaml` is authoritative.

中文说明：后端 CRUD 按领域、DTO、持久层、Controller 分层处理；只有涉及 MyBatis 机制、分页、扫描、多数据源时才加 `yss-mybatis`。

## Component Boundaries

- `yss-cache`: Query/update/clear cache annotations, Redis/Caffeine/JetCache wiring, cache invalidation.
- `yss-audit-log`: Audit annotations, SpEL summaries, async publication, subscribers.
- `yss-excel-mvc`: Spring MVC Excel import/export annotations and handlers.
- `yss-distributed-id`: ID strategies, AutoIdInterceptor, Leaf/CosId/Snowflake, batch ID injection.
- `yss-resilience4j`: Circuit breaker, fallback, and gateway resilience integration.
- `yss-validation`: Validation engine and JSR-303 integration.
- `yss-security-algorithm`: RSA/AES/SM/JWT/JWK/password-encoding compatibility and production key-management safety gates.
- `yss-userinfo`: Current-user info propagation and starter integration.
- `yss-exception`: Exception component and unified exception handling.

Component skills should inspect generated `references/source-index.md` before changing code when the task depends on exact class or config names.

中文说明：组件类技能不要凭记忆猜类名，先用源码索引找真实位置。
