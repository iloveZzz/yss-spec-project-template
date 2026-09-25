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
7. MVC Profile 的稳定业务错误归 service/core；Repository 保留 cause；server 持有 HTTP 映射与脱敏。不要为了复用错误码引入 Domain 层或让 core 依赖 client。分层依据 `.template-spec/agents/backend-architecture-profiles.md`。

## Boot 3 Current Source Behavior

- 以下当前行为针对 `boot3-java17`；Boot 2 旧工程必须读取其独立索引，旧行为只用于迁移识别。
- `GlobalExceptionAdvice` maps `BizException` to HTTP 400. Unknown `Exception`, `RuntimeException`, and `NullPointerException` map to HTTP 500 and return a sanitized `SysException` with `ResultErrorCode.INTERNAL_ERROR` instead of raw exception text.
- `MaxUploadSizeExceededException` maps to HTTP 413 (`PAYLOAD_TOO_LARGE`) with `ResultErrorCode.MAX_UPLOAD_SIZE_EXCEEDED`.
- System and unknown failures are recorded with the SLF4J logger. `yss.exception.level=debug` adds a logger-backed debug stack trace; it never calls `Throwable#printStackTrace()`.
- Every handled response attaches or reuses a trace id in MDC and exposes it through the `X-Trace-Id` response header. The public body does not contain the raw localized exception or stack trace.
- Validation binding failures become `SysException(PARAM_VALIDATION_ERROR)`. Coordinate changes with `yss-validation` and contract tests.

## Source-Backed Exception Semantics

- `BizException`: clear business meaning, generally no Error log and no retry.
- `SysException`: known system problem, Error log, retry may be possible.
- unknown `Exception`: full stack log, retry may be possible.

## Checklist

- Required dependency or starter module is present.
- Error code/message are meaningful to API consumers.
- Response messages are sanitized and do not expose raw RuntimeException or localized exception details.
- For affected boot3-java17 HTTP seams, assert the documented business 4xx, unknown/runtime 5xx and trace header behavior. Assert upload 413 only for upload-limit impact. Boot 2 assertions follow its own source and frozen contract; do not import Boot 3 behavior into it.
- Business validation failures are not reported as unknown system errors.
- Stack traces are preserved in structured logger output for unknown/system failures, never printed directly to stderr or serialized to clients.
- Retry guidance matches exception type.
- Known system failures use `ExceptionFactory.sysException(..., cause)`; Application code does not replace them with ad-hoc `RuntimeException`.
- Endpoint tests cover the failure types actually affected by this change; upload-limit tests apply only to upload endpoints or changed upload handling. Public messages must follow the selected platform contract and never leak protected exception details.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.

## 平台与源码门禁

接入、修改、代码生成或给出精确类名/配置前，读取 [后端组件平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，从批准的 `platform_configuration.component_platform_line` 选择 `source-index.boot2-java8.md` 或 `source-index.boot3-java17.md`，并以 `--skill yss-exception --platform-line <line> --source-root <matching-root>` 运行统一 freshness 校验。平台线与源码根不匹配、组件 tree 不一致、组件子树 dirty、索引缺少平台信号，或 Manifest / 组件 GAV 缺少 verified 兼容证据时返回 `blocked`；不得回退另一代索引，也不在业务实现中升级、降级或替换 YSS 组件。既有工程只读分诊可继续，但不得据此宣称跨 Boot/JDK 兼容。
