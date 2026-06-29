---
name: yss-log
description: 用于 YSS 日志 starter、日志链路、日志配置、请求日志或业务日志接入和排障。当用户提到 yss-component-log-starter、日志 starter 或日志不输出时调用。
---

# yss-log

Use this skill for YSS 日志组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 日志组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-log-starter`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is catch-and-log annotation usage, aspect behavior, auto-configuration, or centralized log collection guidance.
2. Read `references/source-index.md`, then read `README.md` and inspect `CatchAndLog`, `CatchLogAspect`, and `CatchLogAutoConfiguration`.
3. Use `CatchAndLog`/aspect behavior for method-level exception logging concerns; do not duplicate broad try/catch logging everywhere.
4. For platform logging architecture, follow the README guidance around Logstash/Filebeat/ELK-style collection.
5. Keep application logging, audit logging, and distributed tracing separate; load `yss-audit-log` for business audit events.

## Capability Split

- Code-level logging helper: `CatchAndLog` annotation and `CatchLogAspect`.
- Auto-configuration: `CatchLogAutoConfiguration`.
- Platform log collection: README guidance for Logstash/Filebeat/central storage/visualization.

## Checklist

- Required dependency or starter module is present.
- Logs include enough context but avoid secrets and oversized payloads.
- Exceptions are not swallowed unless the annotation/aspect contract explicitly says so.
- Logback/Log4j2 output format is compatible with collection pipeline.
- Business audit requirements are not implemented with ordinary technical logs.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
