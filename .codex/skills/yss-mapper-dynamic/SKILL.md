---
name: yss-mapper-dynamic
description: 用于 YSS mapper-dynamic 组件、动态 Mapper、动态 SQL 映射和 Mapper 生成/加载排障。
---

# yss-mapper-dynamic

Use this skill for YSS 动态 Mapper 组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 动态 Mapper 组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-mapper-dynamic`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is dynamic datasource creation, dynamic mapper definition, SQL execution/debugging, API generation, cache strategy, or datasource listener behavior.
2. Read `references/source-index.md`, then inspect the relevant package: `cmd`, `config`, `constant`, `core/datasource`, `core/execute`, `domain`, or `util`.
3. For datasource support, inspect processors for MySQL, PostgreSQL, Oracle, OceanBase, DWS PostgreSQL, and `HikariDataSourceFactory`.
4. For query execution, inspect `DataQueryExecute`, `MybatisQuerySqlExecute`, and `DebugSqlSession`.
5. For metadata conversion, inspect `DasConfig2MybatisConvert`, `DatasourceUtil`, and `MapperUtil`.
6. Keep SQL, datasource credentials, and generated API exposure under explicit validation/authorization.

## Capability Split

- Commands: data/query/debug request models.
- Datasource layer: processors, factory, datasource constants/enums.
- Dynamic mapper lifecycle: events, binders, listeners.
- Execution layer: data query and debug SQL sessions.
- Domain model: mapper/result map/select/cache strategy/query config.

## Checklist

- Required dependency or starter module is present.
- Datasource type and connection parameters are complete and protected.
- SQL/debug execution is not exposed without authorization.
- Mapper/result-map definitions align with returned columns.
- Timeout/cache strategy is explicit for expensive dynamic queries.
- Generated API request/response params match the actual SQL contract.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
