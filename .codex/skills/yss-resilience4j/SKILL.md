---
name: yss-resilience4j
description: 用于 YSS Resilience4j starter、网关熔断、限流降级、GlobalCircuitExceptionAdvice、GatewayConfiguration 和断路器配置排障。
---

# yss-resilience4j

Use this skill for YSS Resilience4j 组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS Resilience4j 组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
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
