---
name: yss-router
description: YSS 技能总路由。Use when a task involves YSS micro-applications, YSS Vue pages, YSS backend components, yss-cloud-microservice, YTable/YTree/YssFormily, Orval API clients, YSS DDD scaffolding, Repository/MyBatis/DTO/Controller generation, cache/audit/excel/distributed-id/JDBC/file/log/dictionary/taskflow/validation/security components, or when multiple YSS skills might apply and Codex must choose the minimal correct skill set before implementation.
---

# yss-router

Use this skill first for broad or ambiguous YSS work. Its job is to choose the smallest useful set of YSS skills, not to replace specialist skills.

中文说明：这个技能是 YSS 技能总入口，主要帮助 Codex 先判断“该用哪些技能”，避免一次性加载太多 YSS 规范。

## Core Rule

Route first, then load specialists. Do not load every YSS skill just because the repo is a YSS repo.

When the request is already narrowly scoped, use the matching specialist directly. When the task crosses frontend/backend/component boundaries, use this router to pick the minimal combination.

中文说明：如果用户已经明确提到缓存、审计、Excel、YTable 等具体内容，可以直接用专项技能；只有需求比较宽或跨前后端时才先用 router。

## Minimal Skill Matrix

| User intent | Load these skills |
| --- | --- |
| Build or refactor a Vue business page | `yss-page-module-development`; add `yss-components`, `yss-hook`, `api-integration` only when needed |
| Work on YTable responsive height | `yss-use-table-height`; add `yss-components` only for page layout |
| Work on YTree responsive height or search tree | `yss-use-tree-height`; add `yss-components` only for page layout |
| Build or modify YssFormily schema/forms | `yss-formily`; add `yss-formily-schema-generator` when converting requirements, screenshots, Figma, or natural language into schema |
| Integrate backend APIs in Vue | `api-integration`; add `yss-openapi` only when regenerating Orval clients |
| Generate/refresh OpenAPI and Orval clients | `yss-openapi` |
| Commit micro-app changes | `microapp-commit` |
| Create a DDD backend module from scratch | `yss-ddd-scaffold-generator` |
| Model domain aggregates/entities/gateways | `yss-domain`; add `yss-repository` when persistence is required |
| Generate persistence from DDL/metadata | `yss-db2mybatis`; add `yss-mybatis` for framework-specific behavior |
| Implement Repository/GatewayImpl/PO/Convertor | `yss-repository`; add `yss-mybatis` for BaseRepository, pagination, or datasource issues |
| Implement Controller/DTO/VO/Web Convertor | `yss-web-controller`; add `yss-dto` for Result/PageQuery/CommandDTO conventions |
| Work with Result/PageQuery/CommandDTO/QueryDTO | `yss-dto` |
| Work with MyBatis/MyBatis-Plus persistence | `yss-mybatis` |
| Work with QueryCache/UpdateCache/ClearCache | `yss-cache` |
| Work with AuditLog/EnableAuditLog/SpEL audit descriptions | `yss-audit-log` |
| Work with RequestExcel/ResponseExcel import/export | `yss-excel-mvc` |
| Work with Leaf/CosId/AutoIdInterceptor/ID strategy | `yss-distributed-id` |
| Work with Hutool Db/JdbcSqlUtil/dynamic datasource JDBC | `yss-jdbc` |
| Work with dictionaries, dictionary items, or Dic APIs | `yss-dictionary` |
| Work with directory/resource trees | `yss-dir` |
| Work with base file abstractions or file parser utilities | `yss-file` |
| Work with logging starter behavior | `yss-log` |
| Work with Liquibase starter or migration bootstrap | `yss-liquibase` |
| Work with Resilience4j gateway/circuit-breaker/fallback behavior | `yss-resilience4j` |
| Work with SQL condition parsing, validation, or SQL condition builders | `yss-sql-condition` |
| Work with SQL template management or rendering | `yss-sql-tpl` |
| Work with task flow definitions or execution | `yss-taskflow` |
| Work with validation engine or JSR-303 integration | `yss-validation` |
| Work with RSA/AES/crypto/security algorithm helpers | `yss-security-algorithm` |
| Work with current user info propagation or user info starter | `yss-userinfo` |
| Work with variable component APIs | `yss-variable` |
| Work with quality starter behavior | `yss-quality` |
| Work with DolphinScheduler anti-corrosion/anti-scheduler integration | `yss-anti-scheduler` |
| Work with exception component or unified exception handling | `yss-exception` |
| Work with mail starter or email sending | `yss-mail` |
| Work with file runner component | `yss-filerunner` |
| Work with valuation component | `yss-valuation` |
| Work with DuckDB component | `yss-duckdb` |
| Work with dynamic mapper component | `yss-mapper-dynamic` |
| Work with QLExpress4 expressions | `qlexpress4` |

## Selection Workflow

1. Identify whether the request is frontend page, frontend API, backend domain, backend component, code generation, or workflow/commit.
2. Pick one primary specialist skill from the matrix.
3. Add secondary skills only when the task explicitly requires their implementation details.
4. Before editing code, inspect repo conventions and the specialist skill's `references/source-index.md` when present.
5. Prefer existing YSS components and framework hooks over new abstractions.

中文说明：优先选一个主技能，再按需补充副技能；不要因为是 YSS 项目就把所有 YSS 技能全读进上下文。

## Common Combinations

- Page with backend list API: `yss-page-module-development` + `api-integration`.
- Tree-table page: `yss-page-module-development` + `yss-use-tree-height` + `yss-use-table-height`.
- Search form plus table: `yss-page-module-development` + `yss-formily` + `api-integration`.
- Backend CRUD from table: `yss-domain` + `yss-dto` + `yss-repository` + `yss-web-controller`.
- Metadata/DDL to backend layers: `yss-db2mybatis` + `yss-web-controller`.
- Cached query endpoint: `yss-cache` + `yss-mybatis` + `yss-dto` when DTO/page results are involved.

## Source Indexes

Backend component skills have generated source indexes under `references/source-index.md`. Read them when the task depends on concrete component classes, configuration, annotations, or troubleshooting:

中文说明：当问题涉及真实类名、配置项、注解、拦截器、自动配置或排障时，先读对应 `source-index.md`，它会指向后端组件源码库里的真实入口。

- Core framework/component examples: `yss-cache`, `yss-mybatis`, `yss-dto`, `yss-audit-log`, `yss-excel-mvc`, `yss-distributed-id`, `yss-jdbc`.
- Extended component examples: `yss-dictionary`, `yss-dir`, `yss-file`, `yss-log`, `yss-liquibase`, `yss-resilience4j`, `yss-sql-condition`, `yss-sql-tpl`, `yss-taskflow`, `yss-validation`, `yss-security-algorithm`, `yss-userinfo`, `yss-variable`, `yss-quality`, `yss-anti-scheduler`, `yss-exception`, `yss-mail`, `yss-filerunner`, `yss-valuation`, `yss-duckdb`, `yss-mapper-dynamic`.

Regenerate these indexes with `yss-source-index/scripts/refresh-yss-skill-index.py` after `yss-cloud-microservice` changes. Read `yss-source-index/references/source-map-config.md` when you need the full skill-to-source mapping.

## Boundaries

Read `references/boundaries.md` when two or more YSS skills appear to overlap.
