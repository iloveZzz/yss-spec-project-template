---
name: yss-audit-log
description: 用于 YSS 审计日志组件问题排查与接入实现。当用户提到 AuditLog、EnableAuditLog、SpEL 审计描述、审计日志异步发布、订阅器扩展或审计日志不生效时调用。
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
4. 只给出与当前问题直接相关的接入点：注解、配置、切面链路、订阅器扩展。
5. 需要看实现细节时，再读取 `assets/` 下源码，不要先讲整套组件原理。

## 源码索引

- 源码位置不要假设固定目录；先按 `yss-source-index/references/source-location.md` 定位。
- 当前技能索引：`references/source-index.md`
- 重点源码入口通常包括审计注解、启用注解、切面、发布服务、事件模型、默认订阅器。

当组件源码变化后，用 `yss-source-index` 刷新索引；刷新或读取前先按源码定位策略确认真实位置。

## 接入检查清单

- 启动类是否启用了类似 `@EnableAuditLog` 的能力。
- 目标方法是否是可被 AOP 代理拦截的 Spring Bean 方法。
- `@AuditLog` 是否标在正确的方法上。
- `summary` 中的 SpEL 变量名是否与方法参数名一致。
- 项目编译参数是否保留了参数名。
- 是否开启了对应的日志输出或系统管理投递开关。

## 排障顺序

1. 注解是否生效。
2. 切面是否拦截到方法。
3. SpEL 是否能从参数和返回值取到值。
4. 发布服务是否成功入队。
5. 订阅器是否被 Spring 扫描并注册。
6. 下游系统管理或打印订阅器是否被开关禁用。
7. 异步线程池或事件发布异常是否被吞掉。
8. 参数名、返回值字段、异常分支是否满足摘要模板。

## 修改约束

- 不要把业务日志和审计日志混为一套机制。
- 不要把审计规则硬编码在 Controller。
- 需要扩展新日志落点时，优先新增订阅器实现，不要改坏默认发布链路。
- 若无法确认真实注解或配置名，先在代码库里搜索现有实现，再修改。

## 按需读取

- 源码索引：`references/source-index.md`
- 审计切面与 SpEL 解析：`assets/AuditLogAspect.java`
- 异步发布链路：`assets/YssAuditPublishService.java`
- 默认订阅器：`assets/YssAuditLogPrintSubscriberImpl.java`、`assets/YssAuditLogSysManagerSubscriberImpl.java`
