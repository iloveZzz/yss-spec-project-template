---
name: yss-taskflow
description: 用于 YSS 任务流组件、流程定义、任务定义、任务实例、TaskFactory、taskflow core/domain/bootstrap、任务状态和任务编排排障。
---

# yss-taskflow

Use this skill for YSS Taskflow 组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS Taskflow 组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-taskflow`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is definition management, instance execution, task implementation, datasource/variable adapter, web API, state transition, or troubleshooting.
2. Read `references/source-index.md`, then inspect the narrow module that matches the task.
3. For task implementation, start from task API classes: `AbstractTask`, `AbstractAsynchLogicTask`, `TaskExecutionContext`, `TaskType`.
4. For task dispatch, inspect `TaskFactory`, submitters, executors, thread pools, and `TaskflowExecutor`.
5. For state/repair logic, inspect `TaskExecutionStatus` and event handlers before changing persistence or retry behavior.
6. For web integration, inspect `TaskflowDefinitionController`, `TaskflowExecuteController`, `TaskflowInstanceController`, and `TaskInstanceController`.
7. Keep taskflow changes scoped; this component spans adapter, core, domain, and bootstrap modules.

## Capability Split

- Task types: `SHELL`, `SQL`, `SQLPLUS`, `SUB_PROCESS`, `DEPENDENT`, `CONDITIONS`, `SWITCH`.
- Task creation: `TaskFactory.createTask(TaskExecutionContext)` maps `TaskType` to concrete task implementations.
- Execution core: `TaskflowExecutor`, `TaskflowBootstrap`, submitters, executors, async/sync thread pools.
- State model: `TaskExecutionStatus` includes submitted, running, pause, stop, failure, success, fault tolerance, kill, delay, forced success, dispatch.
- Persistence/domain: process/task repositories and entities in `yss-component-taskflow-core` and `domain`.
- Adapters: datasource, variable, task shell/sql/sqlplus/api, and web controllers.

## State Notes

- Use `TaskExecutionStatus.isFinished()` and related helpers instead of duplicating status-code checks.
- `shouldFailover()` treats submitted, dispatch, running, and delay as failover candidates.
- Unsupported task type errors come from `TaskFactory`; check the task type string before debugging executors.

## Checklist

- Required dependency or starter module is present.
- Task type, sync/async behavior, timeout strategy, and dependency relation are explicit.
- Task context contains the parameters required by the concrete task implementation.
- State transitions use existing status helpers and event handlers.
- Logs use taskflow log collector/appender where applicable.
- Web API changes preserve DTO/query/page conventions already in the component.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
