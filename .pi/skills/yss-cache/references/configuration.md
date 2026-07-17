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

```yaml
yss:
  cache:
    active-type: redis       # redis | caffeine | hazelcast
    default-ttl: 1h
    redis:
      fallback-enabled: false
      fallback-type: caffeine
      clear-fallback-on-recovery: true
```

- Redis 动态 cache 和 Caffeine 默认 TTL 使用 `yss.cache.default-ttl`。
- `CacheKeyCode` 中声明的 TTL 覆盖默认 TTL。
- Caffeine 的 `spring.cache.caffeine.spec` 可覆盖默认构建规格，修改前检查项目现有配置。
- Hazelcast 不在 starter 生产依赖中；使用时显式引入模块并配置 `active-type=hazelcast`。

## 自定义 Bean

默认配置会对用户提供的 `RedisProperties`、`RedisConnectionFactory`、`JedisClientConfiguration`、pool config、RedisCacheManager、resolver、provider、serializer、RedisTemplate 和 RedisMappingContext 回退。排障时按类型和名称检查实际 Bean，不能假设框架默认 Bean 一定生效。
