# DDD 分层实现路由

本文件只记录脚手架完成后的分层实现路由，不作为独立 Skill 被发现。实际实现必须回到已批准的 Slice Implementation Contract，并加载对应的顶层权威 Skill。

| 分层或适配器 | 权威 Skill | 边界 |
|---|---|---|
| Application | `yss-application` | 编排用例与事务，不复制领域规则。 |
| Domain | `yss-domain` | 持有聚合、实体、值对象、领域行为和端口。 |
| Infrastructure | `yss-repository`，按需追加 `yss-mybatis` | 实现持久化端口，不向 Domain 泄漏 PO、Mapper 或框架类型。 |
| Web | `yss-web-controller`，按需追加 `yss-dto`、`yss-exception`、`yss-validation` | Controller 只调用 Application Service；HTTP 与异常包装停留在 Web 边界。 |
| Scheduler / External Adapter | 按入口选择 `yss-application`、`yss-web-controller` 或 `yss-repository` | 只做协议、调度或外部系统适配，不承载领域规则。 |

Adapter 额外遵循以下约束：

- 输入先转换为 Application Command / Query，再调用 Application Service。
- 实现 Application 或 Domain 端口时，签名不得泄漏 HTTP DTO、PO、Mapper 或第三方 SDK 类型。
- 映射使用 Spring 管理的 MapStruct Bean，禁止静态 `Mappers.getMapper(...)` 或 `INSTANCE`。
- 旧式 Controller 或旧分层结构不是 `target-domain-model` 的实现依据；架构现代化必须单独立项。
