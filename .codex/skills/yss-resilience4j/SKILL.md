---
name: yss-resilience4j
description: "接入或排查 YSS Resilience4j starter、网关熔断、限流降级与断路器配置。"
---

# yss-resilience4j

Use this skill for YSS Resilience4j 组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS Resilience4j 组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-skill-source-index-refresh/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-resilience4j-starter`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Read `references/source-index.md`, then read component `readme.md`.
2. Identify whether the task is gateway circuit breaker configuration, fallback response, global circuit exception handling, or resilience troubleshooting.
3. Inspect `GatewayConfiguration` for route/filter wiring and `GlobalCircuitExceptionAdvice` for exception response behavior.
4. Tune thresholds/timeouts in configuration rather than hardcoding resilience behavior in business handlers.
5. Keep fallback responses consistent with gateway/API response contracts.

## Capability Split

- Gateway resilience wiring: `GatewayConfiguration`.
- Circuit exception mapping: `GlobalCircuitExceptionAdvice`.
- Operational guidance: README "轻量微服务断路器".

## Checklist

- Required dependency or starter module is present.
- Circuit breaker names and route IDs match gateway configuration.
- Fallback status/body are acceptable for frontend/API consumers.
- Timeout, slow-call, and failure thresholds match service SLOs.
- Logs/metrics make open/half-open/recovered states diagnosable.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.

## 平台与源码门禁

接入、修改、代码生成或给出精确类名/配置前，读取 [后端组件平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，从批准的 `platform_configuration.component_platform_line` 选择 `source-index.boot2-java8.md` 或 `source-index.boot3-java17.md`，并以 `--skill yss-resilience4j --platform-line <line> --source-root <matching-root>` 运行统一 freshness 校验。平台线与源码根不匹配、组件 tree 不一致、组件子树 dirty、索引缺少平台信号，或 Manifest / 组件 GAV 缺少 verified 兼容证据时返回 `blocked`；不得回退另一代索引，也不在业务实现中升级、降级或替换 YSS 组件。既有工程只读分诊可继续，但不得据此宣称跨 Boot/JDK 兼容。
