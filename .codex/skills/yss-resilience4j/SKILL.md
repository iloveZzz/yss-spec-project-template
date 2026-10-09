---
name: yss-resilience4j
description: "接入或排查 YSS Resilience4j starter、网关熔断、限流降级与断路器配置。"
---

# yss-resilience4j

执行路线消费当前 Profile 主控合同的 `request_triage.delivery_path` 与固定 CLI 的 `route` / `verify-daily` 结果。仅已启用且合格的 Spec、Backend、Frontend `daily` 使用同一 Ticket 的范围、验收、工程基线、实际测试与独立审查；本端写范围不扩大。缺政策或能力时保持正式路径，已有正式任务不得降级；本技能不授予执行授权。

处理 YSS 网关断路器、fallback 响应和韧性配置；阈值、状态与恢复行为按服务 SLO 和当前 API 契约核验。

## 平台与源码门禁

接入、修改、代码生成或提供精确类名/配置前，必须读取并执行 [共享平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，以 `--skill yss-resilience4j` 校验当前路线已核验的精确平台线及匹配源码根（`daily` 来自同 Ticket 的已有工程基线，`governed` 来自批准的配置）；不因普通路径跳过源码检查。缺失、错配或漂移返回 `blocked`；不跨代回退，不在业务实现中升级、降级或替换组件。只读分诊可继续，但须标注未完成源码核验，不能据此宣称跨 Boot/JDK 兼容。

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

## 执行证据与新增影响

`daily` 将命中的组件来源、技术约束和真实测试/命令/退出码回填同 Ticket，接受独立审查；`governed` 保留原合同与正式结果协议。缺平台/源码事实、测试失败或超出当前范围的影响时停止受影响动作并回生命周期调查，未知或排除风险升级；不从本技能取得迁移、升级或新生产接入授权。
