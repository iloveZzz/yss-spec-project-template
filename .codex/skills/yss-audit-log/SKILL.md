---
name: yss-audit-log
description: "接入或排查 YSS AuditLog 的 SpEL 摘要、异步发布、订阅注册与审计投递。"
---

# yss-audit-log

执行路线按 Spec 项目中的 `.agents/skills/yss-product-lifecycle/references/daily-delivery.md` 的项目本地政策与固定 CLI 核验。仅合格且范围已授权的 Spec `daily` 消费同 Ticket 的范围、验收与已核验工程基线；`governed` 保留当前批准合同。缺本地政策/能力、其他 Profile 或已绑定正式任务不能凭标签降级；路线不授予执行授权。

用于处理 `yss-component-audit-log` 的接入、排障和代码修改。

## 平台与源码门禁

接入、修改、代码生成或提供精确类名/配置前，必须读取并执行 [共享平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，以 `--skill yss-audit-log` 校验当前路线已核验的精确平台线及匹配源码根（`daily` 来自同 Ticket 的已有工程基线，`governed` 来自批准的配置）；不因普通路径跳过源码检查。缺失、错配或漂移返回 `blocked`；不跨代回退，不在业务实现中升级、降级或替换组件。只读分诊可继续，但须标注未完成源码核验，不能据此宣称跨 Boot/JDK 兼容。

## 何时使用

- 用户要求接入或修改审计日志。
- 用户提到 `@AuditLog`、`@EnableAuditLog`、SpEL 摘要、审计订阅器、异步发布。
- 用户反馈审计日志未生效、摘要解析失败、日志未下发到系统管理。

## 工作方式

1. 先确认用户是在做“接入”还是“排障”。
2. 涉及真实类名、配置项、订阅器或排障时，先读 `references/source-index.md`，再定位源码或文档。
3. 优先检查项目里是否已有注解、配置项和订阅器实现，再决定改法。
4. 只给出与当前问题直接相关的接入点：注解、配置、切面链路、`CurrentUserProvider` 和订阅器扩展。
5. 实现细节以所选平台线的当前源码为准。`assets/` 是 Boot 2 / Java 8 历史快照，仅在旧工程比对或迁移诊断时读取；不能作为 Boot 3 的实现模板或 freshness 证据。

## 源码索引

- 源码位置不要假设固定目录；先按 `yss-skill-source-index-refresh/references/source-location.md` 定位。
- 当前技能索引：`references/source-index.md`
- 重点源码入口通常包括审计注解、启用注解、切面、发布服务、事件模型、默认订阅器。

当组件源码变化后，用 `yss-skill-source-index-refresh` 刷新索引；刷新或读取前先按源码定位策略确认真实位置。

## 接入检查清单

下述 Boot 3 要点是所登记平台基线的核验项；只有匹配源码门禁通过，才能作为当前精确结论。索引或源码漂移时将受影响结论标为待核验并停止精确接入指导，不借历史快照补齐。

- 启动类是否启用了类似 `@EnableAuditLog` 的能力。
- 目标方法是否是可被 AOP 代理拦截的 Spring Bean 方法。
- `@AuditLog` 是否标在正确的方法上。
- `boot3-java17` 的 SpEL 根上下文只暴露 ASCII key：`args` 和 `result`；例如 `#{args[0]}`、`#{result[name]}`。方法参数名不会自动进入上下文。
- `args` 仅在 `@AuditLog(isNeedArgs = true)` 时写入，`result` 仅在 `isNeedResult = true` 时写入；表达式引用未启用的 key 属于配置错误，必须由组件 seam 测试覆盖。
- `boot3-java17` 不再使用中文 context key，也不得把 Boot 2 的历史模板直接复制到 Boot 3。处理旧模板时先读取所选平台线索引并显式迁移。
- 按匹配源码核验 `yss.audit.enabled`、`sendSysManageEnabled` 与 `auditLogPrintEnabled` 是否控制订阅器注册及投递，不能从字段名或历史快照推断开关生效。
- 审计身份由 `CurrentUserProvider` 提供；不得在审计切面中重新解析 Header 或未验签 JWT。

## 排障顺序

1. 注解是否生效。
2. 切面是否拦截到方法。
3. SpEL 是否能从已启用的 `args` / `result` 取到值。
4. 发布服务是否成功入队。
5. 订阅器是否被 Spring 扫描并注册。
6. 下游系统管理或打印订阅器是否被开关禁用。
7. 异步线程池或事件发布异常是否被吞掉。
8. 参数位置、返回值字段、异常分支是否满足摘要模板。

核验 `boot3-java17` 审计切面的 advice 与成功/异常边界；所登记平台基线使用 `@AfterReturning` 记录成功返回，源码漂移时该结论待核验。异常审计、参数脱敏、队列满丢弃、线程池关闭、重试和幂等须按当前组件能力和当前路线已确认的设计输入单独核验和测试（`daily` 使用同 Ticket 与已有工程基线，`governed` 使用批准设计），不能由旧基线推断已覆盖。组件测试至少覆盖 `#{result[name]}`、`args` / `result` 资源写入和可信身份来源。

## 修改约束

- 不要把业务日志和审计日志混为一套机制。
- 不要把审计规则硬编码在 Controller。
- 需要扩展新日志落点时，优先新增订阅器实现，不要改坏默认发布链路。
- 若无法确认真实注解或配置名，先在代码库里搜索现有实现，再修改。

## 按需读取

以下 `assets/*.java` 均为 `boot2-java8` 历史资料，含 javax 与旧中文 SpEL key。Boot 3 使用其平台索引定位当前 jakarta / args / result 源码；不要修改历史资料来冒充新平台源码。

- 源码索引：`references/source-index.md`
- 审计切面与 SpEL 解析：`assets/AuditLogAspect.java`
- 异步发布链路：`assets/YssAuditPublishService.java`
- 默认订阅器：`assets/YssAuditLogPrintSubscriberImpl.java`、`assets/YssAuditLogSysManagerSubscriberImpl.java`

## 执行证据与新增影响

`daily` 将命中的组件来源、技术约束和真实测试/命令/退出码回填同 Ticket，接受独立审查；`governed` 保留原合同与正式结果协议。缺平台/源码事实、测试失败或超出当前范围的影响时停止受影响动作并回生命周期调查，未知或排除风险升级；不从本技能取得迁移、升级或新生产接入授权。
