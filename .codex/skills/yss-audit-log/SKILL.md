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
4. 只给出与当前问题直接相关的接入点：注解、配置、切面链路、订阅器扩展。
5. 需要看实现细节时，再读取 `assets/` 下源码，不要先讲整套组件原理。

## 源码索引

- 源码位置不要假设固定目录；先按 `yss-skill-source-index-refresh/references/source-location.md` 定位。
- 当前技能索引：`references/source-index.md`
- 重点源码入口通常包括审计注解、启用注解、切面、发布服务、事件模型、默认订阅器。

当组件源码变化后，用 `yss-skill-source-index-refresh` 刷新索引；刷新或读取前先按源码定位策略确认真实位置。

## 接入检查清单

- 启动类是否启用了类似 `@EnableAuditLog` 的能力。
- 目标方法是否是可被 AOP 代理拦截的 Spring Bean 方法。
- `@AuditLog` 是否标在正确的方法上。
- `summary` 中的 SpEL 变量必须使用源码实际暴露的 context keys (`参数审计` / `结果审计`)；方法参数名不会自动进入 context。
- 当前源码的变量正则只接受 ASCII 字母、数字、下划线和路径符号，不能可靠识别中文 context key；涉及 `#{参数审计...}` / `#{结果审计...}` 时先标记 `blocked`，除非组件修复并有表达式测试，不要声称摘要会被解析。
- 项目编译参数是否保留了参数名。
- `yss.audit.enabled` 是否开启；`sendSysManageEnabled` 与 `auditLogPrintEnabled` 在当前实现中不会自动阻止订阅器注册，需按源码验证，不能假设开关生效。

## 排障顺序

1. 注解是否生效。
2. 切面是否拦截到方法。
3. SpEL 是否能从参数和返回值取到值。
4. 发布服务是否成功入队。
5. 订阅器是否被 Spring 扫描并注册。
6. 下游系统管理或打印订阅器是否被开关禁用。
7. 异步线程池或事件发布异常是否被吞掉。
8. 参数名、返回值字段、异常分支是否满足摘要模板。

审计切面当前是 `@AfterReturning`，只记录成功返回；异常审计、参数脱敏、队列满丢弃、线程池关闭、重试和幂等必须单独设计并测试。

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

## 平台与源码门禁

接入、修改、代码生成或给出精确类名/配置前，读取 [后端组件平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，从批准的 `platform_configuration.component_platform_line` 选择 `source-index.boot2-java8.md` 或 `source-index.boot3-java17.md`，并以 `--skill yss-audit-log --platform-line <line> --source-root <matching-root>` 运行统一 freshness 校验。平台线与源码根不匹配、组件 tree 不一致、组件子树 dirty、索引缺少平台信号，或 Manifest / 组件 GAV 缺少 verified 兼容证据时返回 `blocked`；不得回退另一代索引，也不在业务实现中升级、降级或替换 YSS 组件。既有工程只读分诊可继续，但不得据此宣称跨 Boot/JDK 兼容。
