---
name: yss-log
description: Use when YSS `CatchAndLog`, `CatchLogAspect`, log starter auto-configuration, request-parameter logging, latency logging, or centralized log collection is involved.
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

1. Identify whether the task is DEBUG request/latency logging, exception logging, auto-configuration, or centralized collection. These are different capabilities.
2. Read `references/source-index.md`, then read `README.md` and inspect `CatchAndLog`, `CatchLogAspect`, and `CatchLogAutoConfiguration`.
3. `CatchAndLog` currently logs DEBUG request arguments and successful elapsed time. It does **not** catch target exceptions or guarantee a `finally` latency record; do not describe it as exception logging.
4. For platform logging architecture, follow the README guidance around Logstash/Filebeat/ELK-style collection.
5. Keep application logging, audit logging, and distributed tracing separate; load `yss-audit-log` for business audit events.

## Capability Split

- Code-level logging helper: `CatchAndLog` annotation and `CatchLogAspect`.
- Auto-configuration: `CatchLogAutoConfiguration`.
- Platform log collection: README guidance for Logstash/Filebeat/central storage/visualization.

## Checklist

- Required dependency or starter module is present.
- Logs include enough context but avoid secrets and oversized payloads.
- Request arguments are redacted/allowlisted and bounded before JSON serialization; never log tokens, passwords, private keys, or raw file/stream bodies.
- Exceptions are not swallowed unless the annotation/aspect contract explicitly says so.
- Logback/Log4j2 output format is compatible with collection pipeline.
- Business audit requirements are not implemented with ordinary technical logs.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not infer behavior from the unused `pointcutAll()`; verify the pointcut actually bound to the advice.
- Do not broaden the task into unrelated YSS components unless the user asks.
