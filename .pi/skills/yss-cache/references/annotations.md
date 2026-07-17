# 注解契约

## 映射

- `@QueryCache` -> Spring `CacheableOperation`。
- `@UpdateCache` -> Spring `CachePutOperation`。
- `@ClearCache` -> Spring `CacheEvictOperation`。
- `value` 与 `cacheNames` 是别名；非空 `cacheName` 会覆盖枚举 cache names。
- 默认 resolver 是 `cacheComposeResolver`。
- `key` 与 `keyGenerator` 互斥。

## 参数语义

- `condition`：调用前判断，false 时跳过缓存操作。
- `unless`：结果产生后判断；Query/Update 支持。ClearCache 虽保留该字段，但当前解析器不映射它。
- `sync`：QueryCache 映射到同步加载；UpdateCache 和 ClearCache 当前不映射该字段。
- `allEntries=true`：明确清空整个 cache。
- `beforeInvocation=true`：业务方法执行前清理；后续业务失败不会恢复旧缓存。

## Key 与清理

```java
@QueryCache(cacheName = "valuation:plan", key = "#tenantId + ':' + #planId")
public PlanDTO get(String tenantId, Long planId) { ... }

@ClearCache(cacheName = "valuation:plan", key = "#tenantId + ':' + #planId")
public void delete(String tenantId, Long planId) { ... }
```

- 未配置 key 时由 Spring KeyGenerator 生成；无参数方法会得到 `SimpleKey.EMPTY`。
- 当前 YSS 拦截器将 `SimpleKey.EMPTY` 视为全量清理。需要单 key 清理时必须给出稳定 key。
- 全量清理优先显式写 `allEntries=true`，不要依赖偶然 key 形态。
- 集合参数先稳定排序；null、大小写和空白必须归一化。

## AOP 与事务

- 缓存方法必须通过 Spring 代理调用；同类 `this.method()` 自调用会绕过拦截。
- private 方法不能作为代理入口；final 方法/类受代理方式限制。
- `put`、`evict`、`clear` 在事务同步激活时延迟到 `afterCommit`；回滚不执行缓存变更。
