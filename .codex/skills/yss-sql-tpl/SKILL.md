---
name: yss-sql-tpl
description: 用于 YSS SQL 模板管理、EnableSqlTplManage、SqlTplConfig、SqlTplResource、SQL 模板 Repository/Gateway/Feign 接入和排障。
---

# yss-sql-tpl

Use this skill for YSS SQL 模板组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS SQL 模板组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-sql-tpl-parent`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is SQL template management, resource binding, history/rollback, cache behavior, starter enablement, or repository persistence.
2. Read `references/source-index.md`, then inspect client/core/repository/starter according to the task.
3. For API behavior, start with `SqlTemplateConfigController`, `SqlTemplateConfigService`, and `SqlTemplateResourceService`.
4. For persistence, use `SqlTplConfigGateway`, `SqlTplResourceGateway`, repository implementations, entities, and convertors.
5. For integration enablement, check `EnableSqlTplManage`, `DefaultSqlTplConfiguration`, and `DefaultSqlTplProperties`.
6. For contracts, reuse `SqlTplConfigAddCmd`, update/delete/rollback commands, page queries, VO classes, and enums.

## Capability Split

- `client`: commands, page queries, VO contracts, cache/datasource/typehandler enums.
- `core`: controller, domain model, service, gateway contracts.
- `repository`: MyBatis config, entities, repositories, convertors, gateway implementations.
- `yss-component-sql-tpl-starter`: enable annotation and default configuration/properties.

## Checklist

- Required dependency or starter module is present.
- SQL template and SQL resource are modeled separately.
- History/rollback behavior is preserved when updating templates.
- Cache type and datasource type match the deployment.
- Type handler choices are explicit for parameter/result mapping.
- Raw SQL text changes consider validation, audit, and rollback requirements.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
