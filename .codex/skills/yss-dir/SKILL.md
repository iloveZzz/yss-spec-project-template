---
name: yss-dir
description: 用于 YSS 目录/标准目录组件接入、目录树、目录资源、EnableDirManage、StandardDir、StandardDirResource、目录权限或目录缓存排障。
---

# yss-dir

Use this skill for YSS 目录组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 目录组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-dir-parent`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is standard directory CRUD, directory tree query, resource binding, repeat-checking, starter enablement, or permission/context troubleshooting.
2. Read `references/source-index.md`, then inspect `StandardTreeDirController`, `StandardDirService`, `StandardDirResourceService`, and repositories.
3. For model changes, separate `StandardDir` from `StandardDirResource`; resource binding should not be collapsed into directory metadata.
4. For integration enablement, check `EnableDirManage`, `DefaultDirConfiguration`, and `DefaultDirProperties`.
5. For client contracts, reuse `StandardDirAddCmd`, `StandardDirUpdateCmd`, `StandardDirResourceAddCmd`, `StandardDirQuery`, and VO classes.

## Capability Split

- `yss-component-dir`: service/controller/repository implementation for standard directory and resource relation.
- `yss-component-dir-client`: command/query DTOs and VO contracts.
- `yss-component-dir-common`: shared enums/tree utilities such as `DmStatus` and `LoginUtil`.
- `yss-component-dir-starter`: `EnableDirManage` and default configuration/properties.

## Checklist

- Required dependency or starter module is present.
- Directory tree and resource relation are handled through the correct service.
- Repeat checks use existing query/logic instead of ad-hoc duplicate detection.
- Auto ID behavior is checked before adding manual ID assignment.
- Status handling follows the common enum/model already present.
- Starter properties match the target service name and deployment.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
