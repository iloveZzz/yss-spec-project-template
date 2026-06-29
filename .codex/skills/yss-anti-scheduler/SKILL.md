---
name: yss-anti-scheduler
description: 用于 YSS anti-corrosion anti-scheduler、DolphinScheduler SDK、调度器 API client、工作流/任务/租户/资源中心客户端接入和排障。
---

# yss-anti-scheduler

Use this skill for YSS 调度器防腐层组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 调度器防腐层组件，覆盖统一 Scheduler API 以及 DolphinScheduler、DM Scheduler、XXL-JOB、ElasticJob 等后端适配。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-anti-corrosion/yss-component-anti-scheduler`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task targets the unified scheduler API, a concrete scheduler backend, generated SDK client calls, workflow/task/resource APIs, cron/schedule behavior, or execution/log troubleshooting.
2. Read `references/source-index.md`, then start from the unified API module before touching a backend adapter.
3. Prefer `SchedulerFacadeApi` as the application-facing entry point; it combines execution commands, cron commands, executor operations, and query operations.
4. For execution behavior, inspect `SchedulerExecutor`; for query/log/history behavior, inspect `SchedulerQuery`; for schedule expression behavior, inspect `SchedulerCronCommand` and `SchedulerCron`.
5. Choose the concrete backend adapter only after the target scheduler is known: DM Scheduler, DolphinScheduler, XXL-JOB, or ElasticJob.
6. For raw REST/API interactions, inspect the generated SDK module matching the backend (`dm-scheduler-sdk`, `dolphinscheduler-sdk`, `xxljob-sdk`) and its `ApiClient`/server configuration.
7. Keep backend-specific models isolated behind the anti-corrosion API unless the task is explicitly adapter development.

## Capability Split

- Unified API: `yss-component-anti-scheduler-api`, especially `SchedulerFacadeApi`, `SchedulerExecutor`, `SchedulerQuery`, `SchedulerCronCommand`, and `SchedulerFactory`.
- DM Scheduler adapter: `yss-component-anti-scheduler-dmscheduler` plus `dm-scheduler-sdk`.
- DolphinScheduler adapter: `yss-component-anti-scheduler-dolphin` plus `dolphinscheduler-sdk`.
- XXL-JOB adapter: `yss-component-anti-scheduler-xxljob` plus `xxljob-sdk`.
- ElasticJob adapter: `yss-component-anti-scheduler-elasticjob`.
- Cross-domain APIs: task flow, task definition/instance, workflow execution, resource/file, tenant/user, datasource, quality, tag, variable, and log APIs in generated clients.

## Checklist

- Required dependency or scheduler adapter module is present.
- Target scheduler backend is identified before using backend-specific APIs.
- Scheduler host/token/auth/server configuration is externalized.
- Task group, task instance, cron, and log identifiers use the component domain model consistently.
- `stop`, `taskInstance`, subtask, and other default methods may be unsupported by some backends; check implementation before relying on them.
- Backend-specific DTOs do not leak into business modules unless the adapter boundary is the task.
- Execution/log/retry operations are checked against scheduler permissions and environment.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
