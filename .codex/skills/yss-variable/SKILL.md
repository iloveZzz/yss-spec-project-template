---
name: yss-variable
description: 用于 YSS variable 组件、变量命名空间、VariableController、VarNameSpaceController、变量解析、占位符替换和变量导入导出排障。
---

# yss-variable

Use this skill for YSS 变量组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 变量组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-variable`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is variable CRUD, namespace management, variable copy/move, import/export, wildcard search, author write handling, or async task status.
2. Read `references/source-index.md`, then inspect `VariableController`, `VarNameSpaceController`, `VariableService`, mappers, DTOs, and enums.
3. Keep namespace operations separate from variable definition operations.
4. Use `VarTypeEnum` and `UserFlagEnum` semantics instead of stringly typed business flags.
5. For import/copy/move tasks, inspect request/response DTOs and task response/status models.

## Capability Split

- Controllers: namespace and variable APIs.
- Service/mapper/entity: variable persistence and operations.
- DTOs: namespace page query, variable definition/copy/move/import/list responses.
- Common utilities: author write handler, SQL wildcard transform, result wrappers.

## Checklist

- Required dependency or starter module is present.
- Namespace and variable IDs/paths are handled consistently.
- Variable type and user flag values use enums.
- Import errors are returned through existing error response DTOs.
- Wildcard search escapes SQL-sensitive characters through existing utility behavior.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
