---
name: yss-quality
description: 用于 YSS quality starter、质量任务 Feign、任务执行详情、质量任务查询、YssCloudQualityFeign 和质量组件接入排障。
---

# yss-quality

Use this skill for YSS 质量组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 质量组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-quality-starter`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is quality task query, task execution detail, SQL data query, retry, custom config update, Feign integration, or result/log troubleshooting.
2. Read `references/source-index.md`, then inspect common DTO/VO contracts and `YssCloudQualityFeign`.
3. For consumers, prefer the Feign module and `YssCloudQualityAutoConfiguration`.
4. Use common request/response models such as `TaskExecuteDetailReq`, `TaskQuerySqlDataReq`, `TaskRetryReq`, `TaskQueryResp`, and `TaskExecResultVo`.
5. Keep pagination/result contracts aligned with `Page` and `RetResult`.

## Capability Split

- `yss-component-quality-common`: DTOs, query/command models, result/page VO, status constants.
- `yss-component-quality-feign`: `YssCloudQualityFeign` and auto-configuration.

## Checklist

- Required dependency or starter module is present.
- Feign client points to the correct quality service.
- Retry and custom config updates use existing command models.
- Task logs/details/SQL data queries use the correct request DTO.
- Response mapping preserves `RetResult` and pagination semantics.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
