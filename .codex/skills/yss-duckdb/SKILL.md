---
name: yss-duckdb
description: 用于 YSS DuckDB 组件接入、DuckDB 查询、嵌入式分析和相关配置排障。
---

# yss-duckdb

Use this skill for YSS DuckDB 组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS DuckDB 组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-duckdb`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is DuckDB datasource setup, report table query, column data modeling, or quality/report data analysis.
2. Read `references/source-index.md`, then inspect `DefaultDuckDataSource`, `ReportTable`, `ReportTableQuery`, `ReportData`, and `ColumnDataModel`.
3. Use this skill for the standalone DuckDB quality/report-table component; load `yss-report` when the task is report template/export integration.
4. Keep embedded/temporary database lifecycle explicit: connection creation, table creation, file cleanup, and query scope.
5. Validate SQL and data shape before running large local analytical queries.

## Checklist

- Required dependency or starter module is present.
- DuckDB datasource lifecycle is clear.
- Column metadata matches incoming report data.
- Large datasets consider memory/temp-file behavior.
- SQL is controlled by the application or validated before execution.
- Result shape is mapped through existing report/quality models.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
