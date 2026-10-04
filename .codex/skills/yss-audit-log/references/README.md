# Boot 2 历史审计资料

本文件说明 `assets/` 中的 `boot2-java8` 历史快照，仅用于旧工程比对与迁移诊断，不作为当前 Boot 3 实现模板或 freshness 证据。当前平台任务从 [平台索引](source-index.md) 定位匹配源码并执行共享门禁；[入口](../SKILL.md) 中的身份、SpEL 和异步边界同样须与所选平台当前源码核对。

## 核心类 (Core Classes)

### 1. AuditLogAspect.java

**位置**: `../assets/AuditLogAspect.java`

审计日志切面，是日志收集的核心入口。

**拦截逻辑**:

- **切点**: 拦截带有 `@AuditLog` 注解且为 public 的方法。
- **处理流程**:
  1. **解析注解**: 获取 `@AuditLog` 中的操作类型、描述、资源类型等信息。
  2. **SpEL 解析**: 如果 `summary` 中包含 `#{...}` 表达式，会解析方法参数和返回值，动态生成日志内容。
  3. **构建消息**:
     - 历史快照使用 `AuthUserInfoUtil.currentUserJson()`；特定 `Principal` 返回分支还解析 `id_token`。这段历史行为不构成可信认证依据，不能迁入 Boot 3 的 `CurrentUserProvider` 链路。
     - 收集请求信息（URL, IP, User-Agent）。
     - 收集参数和结果（根据 `isNeedArgs` 和 `isNeedResult` 配置）。
  4. **发布消息**: 调用 `YssAuditPublishService.publish` 将构建好的 `AuditMessage` 发布出去。

### 2. YssAuditPublishService.java

**位置**: `../assets/YssAuditPublishService.java`

异步日志发布服务。

**机制**:

- 维护一个内部阻塞队列 `ArrayBlockingQueue` (容量1000)。
- 启动固定线程池（10个线程）作为消费者，不断从队列中获取消息。
- 将消息分发给所有注册的 `YssAuditSubscriber` 实现类。

### 3. Subscriber 实现

#### YssAuditLogPrintSubscriberImpl.java

**位置**: `../assets/YssAuditLogPrintSubscriberImpl.java`

- **功能**: 简单的控制台日志打印，用于开发调试。
- **配置核验**: 历史订阅器快照自身不检查 `auditLogPrintEnabled`。开关是否控制注册或投递须检查实际工程的配置装配，不能从字段名推断生效。

#### YssAuditLogSysManagerSubscriberImpl.java

**位置**: `../assets/YssAuditLogSysManagerSubscriberImpl.java`

- **功能**: 调用 `YssDmSystemManageFeign` 将审计日志发送到系统管理服务进行持久化存储。
- **配置核验**: 历史订阅器快照自身不检查 `sendSysManageEnabled`。按实际工程核验配置装配及投递；当前平台行为不由这份快照证明。

## 关键注解

### @AuditLog

用于标记需要审计的方法。

```java
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditLog {
    String summary() default ""; // 操作描述，支持 SpEL
    AuditOperationType operation(); // 操作类型 (ADD, UPDATE, DELETE, QUERY, etc.)
    AuditResourceType resource() default AuditResourceType.DM; // 资源类型
    boolean isNeedResult() default false; // 是否记录返回值
    boolean isNeedArgs() default true; // 是否记录参数
}
```
