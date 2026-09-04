---
name: yss-exception
description: Use when 用于 YSS exception 组件、统一异常模型、异常处理、错误码和异常 starter 接入排障。
---

# yss-exception

Use this skill for YSS 异常组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 异常组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-skill-source-index-refresh/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-exception`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Read `references/source-index.md`, then read `readme.md` before changing exception behavior.
2. Classify the failure as business exception, known system exception, or unknown exception.
3. Use `ExceptionFactory` and `ResultErrorCode` conventions instead of ad-hoc runtime exceptions when creating YSS component errors.
4. Check `YssGlobalExceptionProperties` when global exception output/logging behavior is configurable.
5. Keep logging semantics aligned: business exceptions usually do not require error-stack logging; system/unknown exceptions usually do.
6. In the `target-domain-model` profile, Domain owns stable error meaning and parameters but does not depend directly on YSS `BizException` or HTTP. Translate at the Web boundary after verifying the component handler precedence.

## Current Source Behavior

- `GlobalExceptionAdvice` currently maps BizException, unknown Exception, and RuntimeException to HTTP 400; the OpenAPI error contract must reflect or deliberately override that behavior.
- The current RuntimeException handler returns `exception.getLocalizedMessage()` for many runtime failures; treat that as a response-information-leak risk and do not copy it into new APIs without an approved, sanitized error mapping.
- `yss.exception.level` only controls a direct `printStackTrace()` branch when its value is exactly `debug`; it is not a general response-format switch.
- Validation binding failures currently become `SysException(PARAM_VALIDATION_ERROR)`. Coordinate changes with `yss-validation` and contract tests.

## Source-Backed Exception Semantics

- `BizException`: clear business meaning, generally no Error log and no retry.
- `SysException`: known system problem, Error log, retry may be possible.
- unknown `Exception`: full stack log, retry may be possible.

## Checklist

- Required dependency or starter module is present.
- Error code/message are meaningful to API consumers.
- Response messages are sanitized and do not expose raw RuntimeException or localized exception details.
- Business validation failures are not reported as unknown system errors.
- Stack traces are preserved for unknown/system failures.
- Retry guidance matches exception type.
- Known system failures use `ExceptionFactory.sysException(..., cause)`; Application code does not replace them with ad-hoc `RuntimeException`.
- Endpoint contract tests cover business, known-system, and unknown/runtime failures; unknown public messages never expose `getLocalizedMessage()`.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
