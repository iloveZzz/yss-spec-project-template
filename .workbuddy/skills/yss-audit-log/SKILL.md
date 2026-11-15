---
name: yss-audit-log
description: "接入或排查 YSS AuditLog 的 SpEL 摘要、异步发布、订阅注册与审计投递。"
---

# yss-audit-log

用于处理 `yss-component-audit-log` 的接入、排障和代码修改。

## 何时使用

- 用户要求接入或修改审计日志。
- 用户提到 `@AuditLog`、`@EnableAuditLog`、SpEL 摘要、审计订阅器、异步发布。
- 用户反馈审计日志未生效、摘要解析失败、日志未下发到系统管理。

## 工作方式

1. 先确认用户是在做“接入”还是“排障”。
2. 涉及真实类名、配置项、订阅器或排障时，先读 `references/source-index.md`，再定位源码或文档。
3. 优先检查项目里是否已有注解、配置项和订阅器实现，再决定改法。
4. 只给出与当前问题直接相关的接入点：注解、配置、切面链路、`CurrentUserProvider` 和订阅器扩展。

## 源码索引

- 源码位置不要假设固定目录；先按 [源码定位策略](../yss-skill-source-index-refresh/references/source-location.md) 定位。
- 当前技能索引：`references/source-index.md`
- 重点源码入口通常包括审计注解、启用注解、切面、发布服务、事件模型、默认订阅器。

组件源码变化时按真实源码说明差异；只有收到索引维护请求并具备对应写入授权时，才使用 `yss-skill-source-index-refresh` 修改技能源或受管副本。读取或刷新前都先确认真实位置。

## 接入检查清单

- 启动类是否启用了类似 `@EnableAuditLog` 的能力。
- 目标方法是否是可被 AOP 代理拦截的 Spring Bean 方法。
- `@AuditLog` 是否标在正确的方法上。
- `boot3-java17` / `boot4-java17` 通过 `AuditLog.detailPaths()` 显式选择安全标量，只有选中且非空的值进入审计消息与 SpEL 上下文。根 key 使用 `args`、`result`，方法参数名不会自动进入上下文。
- `isNeedArgs`、`isNeedResult` 已弃用，不能用于开启整参数或整返回值采集。旧用法迁移到下面的字段白名单。
- `boot3-java17` / `boot4-java17` 不再使用中文 context key，也不得把 Boot 2 的历史模板直接复制到 Boot 3/4。处理旧模板时先读取所选平台线索引并显式迁移。
- 按匹配源码核验 `yss.audit.enabled`、`sendSysManageEnabled` 与 `auditLogPrintEnabled` 是否控制订阅器注册及投递，不能从字段名或历史快照推断开关生效。
- 审计身份由 `CurrentUserProvider` 提供；不得在审计切面中重新解析 Header 或未验签 JWT。

## 安全字段与摘要

以下为当前 `boot3-java17` / `boot4-java17` 源码 API，接入前核验实际解析的组件版本。假定首个参数有 `orderId`，返回值有 `status`，两者均为安全标量。

```java
@AuditLog(
    summary = "创建订单 #{args[0][orderId]}，状态 #{result[status]}",
    operation = AuditOperationType.CREATE,
    detailPaths = {"args[0].orderId", "result.status"})
```

- 最多 16 条路径，参数下标为 0–15。支持 `args[n]`、`args[n].field`、`result.field` 的单层选择。未选择的值不会进入摘要上下文。
- 直接选择 `args[n]` 标量时，运行时必须能取得安全的真实参数名。参数名缺失、形如 `arg0` 或含敏感词时拒绝。`args[n].field` 按所选字段名检查。
- 只接受字符串、布尔、数值与枚举。字符串去除换行并截断至 128 字符，数值文本及枚举名超过 128 字符时拒绝。复杂对象、集合与整返回对象均不采集。
- 字段名忽略大小写和下划线后，包含 password、passwd、pwd、token、secret、credential、privatekey、authorization、cookie、apikey、accesskey 时拒绝。业务敏感字段仍需由调用方排除，技术过滤无法识别全部业务含义。
- 非法路径或不安全值会导致本次采集失败并记录指标。摘要表达式解析失败时使用操作与方法名作为 fallback。排查时同时核验白名单和表达式，避免把缺失字段当作正常摘要。

## 发布时机与投递限制

- 当前 `AuditLogAspect` 使用 `@AfterReturning`，在被代理方法正常返回后调用 `YssAuditPublishService.publish(AuditMessage)`。方法抛出异常时不会经过这条采集路径。
- 方法正常返回、数据库事务提交、下游持久化是三个独立结果。当前源码没有事务提交后钩子或事务 outbox。切面执行与事务拦截顺序须结合工程核验，外层事务后续仍可能回滚。Boot 4 当前用例已观察到外层回滚后publish总调用仍为一次，业务失败对象正常返回也会触发采集。
- `publish` 返回 `void`，使用容量 1000 的进程内队列。停收、无订阅器或队列满时丢弃并计数。入队成功也无法证明下游已持久化。
- 工作线程逐个调用订阅器，单个订阅器失败会计数并继续后续订阅器，当前链路没有失败重试或持久补偿。进程退出可能丢失内存消息。正常关闭最多等待 2 秒，随后中断并清理剩余队列。
- 若用户要求提交后、可靠投递或异常操作审计，先说明现有能力差距，再按实际授权处理对应实现范围。

## 排障顺序

1. 注解是否生效。
2. 切面是否拦截到方法。
3. `detailPaths` 是否只选中安全标量，SpEL 是否从其 `args` / `result` 取到值。
4. 发布服务是否成功入队。
5. 订阅器是否被 Spring 扫描并注册。
6. 下游系统管理或打印订阅器是否被开关禁用。
7. 采集失败、队列丢弃及订阅器失败指标和对应告警是否出现。
8. 参数位置、返回值字段、异常分支是否满足摘要模板。

## 修改约束

- 不要把业务日志和审计日志混为一套机制。
- 不要把审计规则硬编码在 Controller。
- 需要扩展新日志落点时，优先新增订阅器实现，不要改坏默认发布链路。
- 若无法确认真实注解或配置名，先在代码库里搜索现有实现，再修改。

## 按需读取

以下 `assets/*.java` 均为 `boot2-java8` 历史资料，含 javax 与旧中文 SpEL key。Boot 3/4 使用其平台索引定位当前 jakarta / args / result 源码；不要修改历史资料来冒充新平台源码。

- 源码索引：`references/source-index.md`
- 审计切面与 SpEL 解析：`assets/AuditLogAspect.java`
- 异步发布链路：`assets/YssAuditPublishService.java`
- 默认订阅器：`assets/YssAuditLogPrintSubscriberImpl.java`、`assets/YssAuditLogSysManagerSubscriberImpl.java`
