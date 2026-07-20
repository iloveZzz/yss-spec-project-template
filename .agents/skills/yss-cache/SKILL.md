---
name: yss-cache
description: 用于 YSS 缓存框架的接入、配置、代码修改和故障诊断。Use when tasks involve QueryCache、UpdateCache、ClearCache、TTL、SpEL key、事务提交后缓存操作、Redis/Caffeine/Hazelcast 后端切换、Redis Standalone/Sentinel/Cluster、Jedis 连接池、Redis fallback、JetCache、多级缓存、序列化兼容、缓存不命中或失效不一致。
---

# yss-cache

处理 `yss-component-cache-parent` 及其消费项目的缓存任务。

## 工作流

1. 按 `yss-source-index/references/source-location.md` 定位真实源码。当前工作区有 `.codegraph/` 时先用 CodeGraph；否则读取 [source-index.md](references/source-index.md) 后用符号或 Maven 模块搜索。
2. 识别使用模型：Spring Cache 单后端路由、Redis 故障降级，或 JetCache local + remote。不要混用三者的行为假设。
3. 明确缓存名、key、TTL、更新/删除路径、跨节点一致性和序列化兼容要求。
4. 先检查现有依赖、启动注解、配置和注解用法，再决定修改业务代码、配置还是组件。
5. 修改后执行对应 reference 的验证；组件跨模块修改必须从父 reactor 构建，不要依赖本地旧 SNAPSHOT。

## 不变量

- 新增查询缓存时同时覆盖更新、删除和状态变更的失效路径。
- key 必须稳定并显式包含租户、机构、账套等隔离维度；不要依赖 DTO 的不稳定序列化结果。
- 不要把 Redis fallback 当作正常二级缓存。Caffeine fallback 存在节点间不一致窗口。
- 不要声称纯 Redis 后端会广播本地缓存失效。只有确认 JetCache 配置了 local、remote 和 broadcast channel 后才能作此判断。
- 不要在没有双读、版本前缀、灰度清理或迁移窗口时修改 serializer、key prefix 或 cache name。
- 不明确一致性要求时，不默认启用本地缓存或 fallback。

## 按场景读取

- 模块、后端选择或多级缓存边界：[architecture.md](references/architecture.md)
- 新增或修改缓存注解、SpEL、空 key、全量清理：[annotations.md](references/annotations.md)
- 依赖、启动注解、TTL、Caffeine/Hazelcast、Bean backoff：[configuration.md](references/configuration.md)
- Redis 单机、哨兵、集群、认证、SSL、超时、Jedis pool：[redis-topology.md](references/redis-topology.md)
- Redis 故障、fallback、恢复清理和一致性：[redis-fallback.md](references/redis-fallback.md)
- RedisTemplate/RedisCacheManager 数据格式或迁移：[serialization.md](references/serialization.md)
- 缓存不生效、未失效、启动失败、Redis 异常：[troubleshooting.md](references/troubleshooting.md)
- 完成修改后的组件与消费项目验收：[verification.md](references/verification.md)

## 工具

- `scripts/inspect-cache-usage.sh <project-root>`：只读扫描消费项目；发现阻断缺陷返回 1，输入或环境错误返回 2。
- `scripts/verify-cache-component.sh [--source-root PATH] [--consumer-root PATH --consumer-module MODULE]`：验证组件、真实 Redis、Java 8 字节码及可选消费模块。
- `scripts/check-skill-freshness.sh [source-root]`：比较技能契约与当前组件源码；发现漂移返回 1。

当组件源码变化后，用 `yss-source-index` 刷新 [source-index.md](references/source-index.md)，再运行 freshness 检查。不要手工修改生成索引。
