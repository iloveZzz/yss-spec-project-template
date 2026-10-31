---
name: yss-resilience4j
description: "接入或排查 YSS Resilience4j starter、网关熔断、限流降级与断路器配置。"
---

# yss-resilience4j

处理 YSS 网关断路器、fallback 响应和韧性配置；阈值、状态与恢复行为按服务 SLO 和当前 API 契约核验。

## 源码定位

按 [源码定位策略](../yss-skill-source-index-refresh/references/source-location.md) 确认真实位置，再从 [平台索引](references/source-index.md) 定位当前任务需要的源码。`yss-microservice-components/yss-component-resilience4j-starter` 仅是模块路径提示。

## 工作流

1. 按平台索引定位当前组件源码与 `readme.md`。
2. 区分网关断路器配置、fallback 响应、全局 circuit 异常映射与韧性排障。
3. 装配问题核验 `GatewayConfiguration` 的 route/filter；异常响应核验 `GlobalCircuitExceptionAdvice`。
4. 阈值和超时在配置中调整，不硬编码到业务 handler。
5. fallback 状态和正文与网关/API 合同一致。

## 能力边界

- 网关韧性装配：`GatewayConfiguration`。
- Circuit 异常映射：`GlobalCircuitExceptionAdvice`。
- 运行指引：README“轻量微服务断路器”。

## 验收

- 核验所需依赖或 starter 已进入实际工程。
- 断路器名称和 route ID 与网关配置一致。
- fallback 状态/正文符合前端与 API 消费方契约。
- 超时、慢调用与失败阈值符合服务 SLO。
- 日志/指标可诊断 open、half-open 和 recovered 状态。

## 修改边界

- 类名和配置 key 先核验当前索引与源码，不凭记忆补造。
- 使用组件已有扩展 seam，不以业务本地框架代码替换。
- 保持当前组件任务范围；扩展到其他组件须有用户要求或重新路由依据。
