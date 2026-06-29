# 参考资料

本文档详细介绍了 `yss-component-audit-log` 组件的核心类和配置类。

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
     - 收集用户信息（从 JWT 解析）。
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
- **开关**: 通过 `yss.audit.auditLogPrintEnabled` 控制。

#### YssAuditLogSysManagerSubscriberImpl.java

**位置**: `../assets/YssAuditLogSysManagerSubscriberImpl.java`

- **功能**: 调用 `YssDmSystemManageFeign` 将审计日志发送到系统管理服务进行持久化存储。
- **开关**: 通过 `yss.audit.sendSysManageEnabled` 控制。

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
