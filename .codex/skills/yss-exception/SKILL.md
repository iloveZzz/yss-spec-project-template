---
name: yss-exception
description: "接入或排查 YSS 统一异常、错误码、异常处理器与 exception starter。"
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
7. MVC Profile 的稳定业务错误归 service/core；Repository 保留 cause；server 持有 HTTP 映射与脱敏。不要为了复用错误码引入 Domain 层或让 core 依赖 client。分层依据 `docs/agents/backend-architecture-profiles.md`。

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

## 新脚手架平台约束

消费批准切片架构身份中的 `platform_configuration`，与工程 Manifest 核对后使用对应 YSS 组件。Boot 2.7 使用 `javax` Web/Validation API；Boot 3.5/4.1 使用 `jakarta`。Boot 4 按 Jackson 3、对应自动配置和 starter 适配；不替换 `javax.sql` 等 Java SE 包。平台不一致、兼容条目缺失或候选未验证时回合同编译器阻断，不在业务实现中升级或替换组件。详见 仓库共享合同 `docs/engineering/backend-platforms.md`。
