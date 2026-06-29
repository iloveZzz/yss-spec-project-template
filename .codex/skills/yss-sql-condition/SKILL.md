---
name: yss-sql-condition
description: 用于 YSS SQL condition 组件、SqlTranspiler、CaseWhenSqlGenerator、SqlTemplateRenderer、SqlValidator、动态 SQL 条件生成和 SQL 校验排障。
---

# yss-sql-condition

Use this skill for YSS SQL 条件组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS SQL 条件组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-sql-condition`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Read `references/source-index.md`, then read the component `README.md` before changing behavior.
2. Identify whether the task is rule import, DSL-to-SQL conversion, CASE WHEN generation, SQL template rendering, or SQL validation.
3. Use `RuleConfig` / `RuleConfigImporter` for Excel/CSV rule configuration instead of inventing a new config format.
4. Use `SqlTranspiler` for simple expression conversion (`&&`, `||`, `==`, `!=`, null checks, quoted strings).
5. Use `CaseWhenSqlGenerator` when the desired output is a SQL `CASE WHEN` fragment by rule code and priority.
6. Use `SqlTemplateRenderer` for template placeholder replacement, then `SqlValidator` to parse-check the final SQL.
7. Treat generated SQL as code: validate before execution and keep raw user input out of unchecked templates.

## Capability Split

- Rule storage/import: `RuleConfig`, `RuleConfigImporter`, `rule_config.sql`.
- Expression conversion: `SqlTranspiler` / QLExpress-to-SQL style conversion.
- CASE WHEN generation: `CaseWhenSqlGenerator`.
- Template assembly: `SqlTemplateRenderer`.
- Syntax validation: `SqlValidator` with JSqlParser.

## SQL Safety Notes

- Empty expressions may become broad conditions such as `1=1`; confirm this is intended.
- Null comparisons should become `IS NULL` / `IS NOT NULL`, not `= null`.
- Rendered SQL should be parsed by `SqlValidator` before use in ETL/batch jobs.
- Keep rule priority explicit because first matching `CASE WHEN` branches change output semantics.

## Checklist

- Required dependency or starter module is present.
- Rule code, rule priority, enabled flag, result value, and default ELSE value are defined.
- Rule import validates required fields before persisting.
- Generated SQL fragment has an alias only when the caller expects one.
- Template placeholders are controlled by the application, not raw external input.
- SQL validation failures are surfaced with the parser error message.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
