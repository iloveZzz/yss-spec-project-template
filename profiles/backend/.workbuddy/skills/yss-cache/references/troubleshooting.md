# 证据化排障

## 缓存未命中

1. 检查 starter/后端依赖和 `@EnableYssCloudCache`。
2. 检查 `active-type` 与实际 Provider/CacheManager Bean。
3. 确认调用经过 Spring 代理，不是同类自调用。
4. 检查 SpEL 参数名、null、集合顺序和租户维度。
5. 比较两次调用生成的 cache name/key，并检查 Redis 实际 key。
6. 检查 `condition`、`unless`、TTL 和序列化异常。

## 更新后仍读旧值

1. 列出所有写、删、状态变更入口，确认每条路径都更新或清理相同 cache/key。
2. 检查事务是否尚未提交；YSS 写/删/清理可能在 `afterCommit` 执行。
3. 检查是否误用了 Caffeine、fallback 或 JetCache local cache。
4. 检查 `allEntries`、`beforeInvocation` 和空 key 产生的 `SimpleKey.EMPTY`。

## Redis 启动或连接失败

1. 判定 Standalone/Sentinel/Cluster，检查拓扑互斥和 Cluster DB 0。
2. 分别核对 Redis 数据节点与 Sentinel 认证。
3. 检查 SSL、DNS、端口、connect/read timeout 和 Jedis pool。
4. 检查用户自定义连接工厂是否使默认配置回退。

## Redis 故障后行为异常

1. 检查 fallback 是否明确开启、目标 Provider 是否存在且 available。
2. 区分只读回退与脏写回退。
3. 查看恢复时 Redis 清理失败日志；失败时框架应保持降级并重试。
4. 多节点差异优先按 fallback 一致性窗口分析，不要误判为 Redis 广播失效。

可先运行 `scripts/inspect-cache-usage.sh <project-root>` 取得静态证据，再进入源码路径。
