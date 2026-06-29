---
name: yss-dictionary
description: 用于 YSS 字典组件接入、字典缓存、字典管理接口、字典 Feign 客户端和 EnableDicManage 排障。当用户提到字典、Dic、DicCache、YssDicFeign、EnableDicManage、字典导入模板或字典不刷新时调用。
---

# yss-dictionary

Use this skill for YSS 字典组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 字典组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-dictionary-parent`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is dictionary management, query/cache usage, Feign client integration, import/export template, or cache refresh troubleshooting.
2. Read `references/source-index.md`, then inspect the matching module: dictionary, client, feign, or starter.
3. For management endpoints, start with `DicController`, `DicQueryController`, `DicService`, and repositories.
4. For consumers, prefer `YssDicFeign`, `DicCacheHolder`, and `DicCacheAutoConfiguration` instead of duplicating dictionary queries.
5. For service-side enablement, check `EnableDicManage`, `EnableDicManageImportSelector`, and `DefaultDicConfiguration`.
6. For import/export tasks, inspect `DicExcelTemplate` and `DicExcelImportTemplate`.

## Capability Split

- `yss-component-dictionary`: controllers, services, gateways, repositories, entities.
- `yss-component-dictionary-client`: command/query DTOs and VO contracts.
- `yss-component-dictionary-feign`: Feign client, cache holder, cache scheduler, service-name properties.
- `yss-component-dictionary-starter`: `EnableDicManage` and default configuration.

## Checklist

- Required dependency or starter module is present.
- Management service has `EnableDicManage` where required.
- Consumer service points to the correct dictionary service name.
- Cache refresh/scheduler behavior is checked when values are stale.
- DTO/VO contracts from client module are reused.
- Import/export template changes preserve existing Excel field mapping.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
