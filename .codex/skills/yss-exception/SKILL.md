---
name: yss-exception
description: "接入或排查 YSS 统一异常、错误码、异常处理器与 exception starter。"
---

# yss-exception

执行路线按 Spec 项目中的 `.agents/skills/yss-product-lifecycle/references/daily-delivery.md` 的项目本地政策与固定 CLI 核验。仅合格且范围已授权的 Spec `daily` 消费同 Ticket 的范围、验收与已核验工程基线；`governed` 保留当前批准合同。缺本地政策/能力、其他 Profile 或已绑定正式任务不能凭标签降级；路线不授予执行授权。

处理 YSS 业务、系统及未知异常的错误码、日志和 HTTP 映射；结论使用当前项目契约及匹配的平台源码。

## 平台与源码门禁

接入、修改、代码生成或提供精确类名/配置前，必须读取并执行 [共享平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，以 `--skill yss-exception` 校验当前路线已核验的精确平台线及匹配源码根（`daily` 来自同 Ticket 的已有工程基线，`governed` 来自批准的配置）；不因普通路径跳过源码检查。缺失、错配或漂移返回 `blocked`；不跨代回退，不在业务实现中升级、降级或替换组件。只读分诊可继续，但须标注未完成源码核验，不能据此宣称跨 Boot/JDK 兼容。

## 源码定位

按 [源码定位策略](../yss-skill-source-index-refresh/references/source-location.md) 确认真实位置，再从 [平台索引](references/source-index.md) 定位当前任务需要的源码。`yss-microservice-components/yss-component-exception` 仅是模块路径提示。

## 工作流

1. 修改异常行为前，按平台索引定位当前组件源码与可读取的 `readme.md`。
2. 区分业务异常、已知系统异常和未知异常。
3. 创建 YSS 组件错误时使用 `ExceptionFactory` 与 `ResultErrorCode` 约定，不临时构造无明确语义的 runtime exception。
4. 命中全局异常输出或日志配置时核验 `YssGlobalExceptionProperties`。
5. 保持异常与日志语义一致：业务异常通常不记 Error 堆栈；系统和未知异常通常需要。
6. `target-domain-model` 的稳定错误含义与参数归 Domain，不直接依赖 YSS `BizException` 或 HTTP；先验证组件 handler 优先级，再在 Web 边界翻译。
7. MVC Profile 的稳定业务错误归 service/core；Repository 保留 cause；server 持有 HTTP 映射与脱敏。不要为了复用错误码引入 Domain 层或让 core 依赖 client。分层依据 `.template-spec/agents/backend-architecture-profiles.md`。

## Boot 3 行为

- 以下当前行为针对 `boot3-java17`；Boot 2 旧工程必须读取其独立索引，旧行为只用于迁移识别。
- `GlobalExceptionAdvice` 将 `BizException` 映射到 HTTP 400；未知 `Exception`、`RuntimeException` 和 `NullPointerException` 映射到 HTTP 500，返回脱敏的 `SysException` 与 `ResultErrorCode.INTERNAL_ERROR`，不返回异常原文。
- `MaxUploadSizeExceededException` 映射到 HTTP 413（`PAYLOAD_TOO_LARGE`）与 `ResultErrorCode.MAX_UPLOAD_SIZE_EXCEEDED`。
- 系统和未知失败使用 SLF4J logger；`yss.exception.level=debug` 增加 logger debug 堆栈，不调用 `Throwable#printStackTrace()`。
- 每个处理响应在 MDC 中附加或复用 trace id，并通过 `X-Trace-Id` 响应头公开；正文不含原始 localized exception 或堆栈。
- 校验绑定失败转为 `SysException(PARAM_VALIDATION_ERROR)`；修改时协同 `yss-validation` 与契约测试。

## 异常语义

- `BizException`：有明确业务含义，通常不记 Error 日志、不重试。
- `SysException`：已知系统问题，记 Error 日志，是否可重试需按场景判断。
- 未知 `Exception`：保留完整堆栈日志，是否可重试需按场景判断。

## 验收

- 核验所需依赖或 starter 已进入实际工程。
- 错误码与消息对 API 消费方有明确含义。
- 公开消息已脱敏，不暴露原始 RuntimeException 或 localized exception 细节。
- 对受影响的 `boot3-java17` HTTP seam 验证业务 4xx、未知/runtime 5xx 与 trace header；仅上传限制影响验证 413。Boot 2 使用其独立源码与冻结合同，不引入 Boot 3 断言。
- 业务校验失败不归为未知系统错误。
- 未知/系统失败的堆栈保留在结构化日志中，不直接打印 stderr 或序列化给客户端。
- 重试建议与异常类型及实际用例一致。
- 已知系统失败使用 `ExceptionFactory.sysException(..., cause)`，Application 不改为无明确语义的 `RuntimeException`。
- Endpoint 测试覆盖实际受影响的失败类型；仅上传端点或上传处理变更执行上传限制测试。公开消息符合所选平台合同，不泄露受保护异常细节。

## 修改边界

- 类名和配置 key 先核验当前索引与源码，不凭记忆补造。
- 使用组件已有扩展 seam，不以业务本地框架代码替换。
- 保持当前组件任务范围；扩展到其他组件须有用户要求或重新路由依据。

## 执行证据与新增影响

`daily` 将命中的组件来源、技术约束和真实测试/命令/退出码回填同 Ticket，接受独立审查；`governed` 保留原合同与正式结果协议。缺平台/源码事实、测试失败或超出当前范围的影响时停止受影响动作并回生命周期调查，未知或排除风险升级；不从本技能取得迁移、升级或新生产接入授权。
