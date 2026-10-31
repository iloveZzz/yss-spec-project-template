---
name: yss-cache
description: "接入或排查 YSS QueryCache、UpdateCache、ClearCache、TTL、缓存后端与一致性问题。"
---

# yss-cache

处理 `yss-component-cache-parent` 及其消费项目的缓存任务。

## 工作流

1. 按 `yss-skill-source-index-refresh/references/source-location.md` 定位真实源码。当前工作区有 `.codegraph/` 时先用 CodeGraph；否则读取 [source-index.md](references/source-index.md) 后用符号或 Maven 模块搜索。
2. 识别使用模型：Spring Cache 单后端路由、Redis 故障处理，或独立的 JetCache local + remote。`fail-fast`/`bypass`/`fallback` 是当前 Boot 3 Redis 契约；Boot 2 以其独立源码索引为准，不要混用两代或三种模型的行为假设。
3. 明确缓存名、key、区域 TTL/容量/空值策略、更新/删除路径、跨节点一致性和序列化兼容要求。
4. 先检查现有依赖、启动注解、配置和注解用法，再决定修改业务代码、配置还是组件。

## 不变量

- 新增查询缓存时同时覆盖更新、删除和状态变更的失效路径。
- key 必须稳定并显式包含租户、机构、账套等隔离维度；不要依赖 DTO 的不稳定序列化结果。
- 不要把 Redis fallback 当作正常二级缓存。Caffeine fallback 存在节点间不一致窗口。
- 不要声称纯 Redis 后端会广播本地缓存失效。JetCache 即使存在 broadcast channel 配置，也须验证实际 local/remote 实例和同步开关后才能作此判断。
- 不要在没有双读、版本前缀、灰度清理或迁移窗口时修改 serializer、key prefix 或 cache name。
- 不明确一致性要求时，不默认启用本地缓存或 fallback。

## 按场景读取

- 模块、后端选择或多级缓存边界：[architecture.md](references/architecture.md)
- JetCache 包装器、`QuickConfig`、跨 JVM 失效与故障边界：[jetcache.md](references/jetcache.md)
- 新增或修改缓存注解、SpEL、空 key、全量清理：[annotations.md](references/annotations.md)
- 依赖、启动注解、TTL、Caffeine/Hazelcast、Bean backoff：[configuration.md](references/configuration.md)
- Redis 单机、哨兵、集群、认证、SSL、超时、Jedis pool：[redis-topology.md](references/redis-topology.md)
- Redis 故障、fallback、恢复清理和一致性：[redis-fallback.md](references/redis-fallback.md)
- RedisTemplate/RedisCacheManager 数据格式或迁移：[serialization.md](references/serialization.md)
- 缓存不生效、未失效、启动失败、Redis 异常：[troubleshooting.md](references/troubleshooting.md)
- 完成修改后的组件与消费项目验收：[verification.md](references/verification.md)
