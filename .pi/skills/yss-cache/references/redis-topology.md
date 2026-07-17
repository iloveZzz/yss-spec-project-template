# Redis 拓扑

框架使用 Spring Boot `spring.redis` 属性和 Jedis 客户端。

## Standalone

```yaml
spring:
  redis:
    host: localhost
    port: 6379
    database: 10
    username: ${REDIS_USERNAME:}
    password: ${REDIS_PASSWORD:}
    connect-timeout: 5s
    timeout: 10s
    client-type: jedis
    jedis:
      pool:
        enabled: true
        max-active: 16
        max-idle: 8
        min-idle: 2
        max-wait: 2s
```

## Sentinel

```yaml
spring:
  redis:
    database: 10
    username: ${REDIS_USERNAME:}
    password: ${REDIS_PASSWORD:}
    sentinel:
      master: mymaster
      nodes: host1:26379,host2:26379,host3:26379
      username: ${SENTINEL_USERNAME:}
      password: ${SENTINEL_PASSWORD:}
```

业务 Redis 认证与 Sentinel 自身认证相互独立。

## Cluster

```yaml
spring:
  redis:
    database: 0
    username: ${REDIS_USERNAME:}
    password: ${REDIS_PASSWORD:}
    cluster:
      nodes: host1:6379,host2:6379,host3:6379
      max-redirects: 5
```

## 强制约束

- Sentinel 和 Cluster 不能同时配置，违反时启动失败。
- Redis Cluster 只允许 DB 0，非零 `spring.redis.database` 会启动失败。
- username/password、SSL、client-name、连接/读取超时和 Jedis pool 参数会传入连接配置。
- 不要提供 Lettuce 专属调优参数；当前实现明确使用 Jedis。
