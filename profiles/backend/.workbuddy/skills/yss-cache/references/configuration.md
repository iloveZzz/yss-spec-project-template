# 接入与配置

## 推荐接入

```xml
<dependency>
  <groupId>com.yss.cloud</groupId>
  <artifactId>yss-component-cache-starter</artifactId>
</dependency>
```

启动类使用 `@EnableYssCloudCache`。`@EnableYssCloudRedisCache` 仅为兼容保留并已废弃。

## 公共属性

以下示例及 `failure-mode`、区域策略、空值策略说明针对当前 Boot 3 / Java 17 组件。Boot 2 / Java 8 维护须先核对其独立源码索引与匹配源码，不套用这些新属性或默认值。

```yaml
yss:
  cache:
    active-type: redis       # redis | caffeine | hazelcast
    default-ttl: 1h
    failure-mode: fail-fast  # fail-fast | bypass | fallback；仅 active-type=redis
    redis:
      fallback-enabled: false
      fallback-type: caffeine
      clear-fallback-on-recovery: true
```

- `failure-mode` 默认 fail-fast；旧 `redis.fallback-enabled=true` 仍映射 fallback，同时配置为冲突值会拒绝启动。bypass 仅将 Redis 连接/资源故障的查询视为 miss，显式写入和失效仍报告错误；业务与序列化异常不降级。fallback 仅可选择已安装的 Caffeine，不是默认二级缓存。
- 区域 `yss.cache.regions[区域名]` 可逐字段设置 `ttl`、`caffeine-maximum-size`、`null-policy`。TTL 以区域值优先；Caffeine 用户显式过期策略、`CacheKeyCode` 与 `default-ttl` 的实际优先级按当前组件源码核对。`null-policy=cache` 必须指定正的区域 TTL；`skip` 不等于删除旧值，`reject` 的契约错误不能吞成 Redis 故障。
- Caffeine `spring.cache.caffeine.spec`、自定义 Builder/Loader 与区域覆盖的组合可能无法表达；核对当前组件的启动拒绝条件。自定义 CacheManager/Provider 时需证明区域策略真实生效，不能因配置存在就宣称 TTL、容量或空值策略已应用。
- Hazelcast 不在 starter 生产依赖中；使用时显式引入模块并配置 `active-type=hazelcast`。

## 自定义 Bean

默认配置会对用户提供的 `RedisProperties`、`RedisConnectionFactory`、`JedisClientConfiguration`、pool config、RedisCacheManager、resolver、provider、serializer、RedisTemplate 和 RedisMappingContext 回退。排障时按类型和名称检查实际 Bean，不能假设框架默认 Bean 一定生效。
