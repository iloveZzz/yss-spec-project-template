# DDD 分层实现路由

用于已有 DDD 工程维护和空工程生成后的业务实现。先读取实际代码、POM 和工程约定，按本次需求选择分层技能。已有 MVC Service 沿其分层增量维护，Service 持有规则与事务。

| 分层或适配器 | 权威 Skill | 边界 |
|---|---|---|
| Application | `yss-application` | 编排用例与事务，不复制领域规则。 |
| Domain | `yss-domain` | 持有聚合、实体、值对象、领域行为和端口。 |
| Infrastructure | `yss-repository`，按需追加 `yss-mybatis` | 实现持久化端口，不向 Domain 泄漏 PO、Mapper 或框架类型。 |
| Web | `yss-web-controller`，按需追加 `yss-dto`、`yss-exception`、`yss-validation` | Controller 只调用 Application Service。HTTP 与异常包装停留在 Web 边界。 |
| Scheduler / External Adapter | 按入口选择 `yss-application`、`yss-web-controller` 或 `yss-repository` | 只做协议、调度或外部系统适配，不承载领域规则。 |

Adapter 额外遵循以下约束：

- 输入先转换为 Application Command / Query，再调用 Application Service。
- 实现 Application 或 Domain 端口时，签名不得泄漏 HTTP DTO、PO、Mapper 或第三方 SDK 类型。
- 映射使用 Spring 管理的 MapStruct Bean，禁止静态 `Mappers.getMapper(...)` 或 `INSTANCE`。
- 维护已有结构时保留调用方行为与用户内容。架构调整按实际影响和当前授权推进。
