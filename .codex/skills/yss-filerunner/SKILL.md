---
name: yss-filerunner
description: 用于 YSS filerunner parent、文件运行 starter、client/core 文件执行流程和文件任务排障。
---

# yss-filerunner

Use this skill for YSS 文件运行组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 文件运行组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-filerunner-parent`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is running SQL/Python files, exposing file-runner APIs, parsing scheduler logs, or adding a new file execution type.
2. Read `references/source-index.md`, then inspect `FileRunnerController`, `FileRunnerService`, `FileExecuterManager`, and concrete executers.
3. Current supported `FileType` values are `SQL` and `PYTHON`; unsupported types throw `BizException`.
4. `FileExecuterManager` depends on `SchedulerFacadeApi`; load `yss-anti-scheduler` when execution delegates to scheduler APIs.
5. For logs, inspect `DolphinLogParser` and `LogType`.
6. For starter integration, inspect `DefaultFileRunnerConfiguration`.

## Capability Split

- Client contracts: `FileType`, `LogType`.
- Core API/service: controller and service implementation.
- Execution strategy: `AbstractFileExecuter`, `SqlFileExecuter`, `PythonFileExecuter`, `FileExecuterManager`.
- Scheduler integration: anti-scheduler facade dependency.

## Checklist

- Required dependency or starter module is present.
- File type is validated before execution.
- Scheduler facade configuration is available.
- Log parsing matches the scheduler backend.
- New file types update enum, manager registration, executor implementation, and tests together.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
