# 架构与选择

以下模型划分适用于接入决策；具体配置、默认值及跨节点行为按所选平台线的当前源码核验。本轮新增的 Redis 故障模式、区域策略和 JetCache 运行证据属于 Boot 3 当前组件。

## 三种模型

| 模型 | 行为 | 一致性边界 |
|---|---|---|
| Spring Cache 后端路由 | `yss.cache.active-type` 在 Redis、Caffeine、Hazelcast 中选择一个 Provider | 同一时刻是单后端，不是多级缓存 |
| Redis fallback | Redis 故障时可临时改用另一个 Provider | 是故障降级；Caffeine 会产生节点间不一致窗口 |
| JetCache | 独立扩展，可配置 local + remote | broadcast channel 配置本身不证明包装器已启用跨 JVM 本地失效同步 |

## 模块

- `yss-component-spring-cache`：注解、解析器、拦截器、路由和公共属性。
- `yss-component-redis-cache`：Jedis 连接、RedisTemplate、RedisCacheManager、健康检查和 fallback。
- `yss-component-caffeine-cache`：节点本地缓存。
- `yss-component-hazelcast-cache`：显式依赖的集群内存后端。
- `yss-component-cache-starter`：默认聚合 Spring Cache、Redis 和 Caffeine。
- `yss-component-jetcache`：与 Spring Cache 路由模型分开分析。

## 选择规则

- 跨节点共享且不接受节点本地旧值：使用纯 Redis。
- 读多写少并允许短暂节点差异：可选择 Caffeine。
- Redis 故障期间业务可用性高于缓存一致性：评估后启用 fallback。
- 需要 local + remote：按 [JetCache 专项参考](jetcache.md) 核对实际创建的 Cache、配置来源及首次创建参数，并用跨 JVM 测试证明同步，不要只看依赖或 `bootstrap.yml`。
