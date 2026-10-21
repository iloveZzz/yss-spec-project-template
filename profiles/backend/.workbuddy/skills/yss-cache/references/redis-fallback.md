# Redis 故障降级与恢复

以下故障模式和脏 Redis 区域恢复顺序是当前 Boot 3 / Java 17 组件契约。Boot 2 / Java 8 的故障处理和恢复默认值须单独核对其索引及源码。

## 状态流

```text
Redis 健康 -> 命令或健康检查失败 -> 标记不健康 -> 跳过 Redis
-> 可选 fallback -> 周期健康检查 -> Redis 可连接
-> 清理脏 Redis cache；按配置清理本地 fallback cache -> 恢复 Redis
```

- fallback 默认关闭，默认目标是 Caffeine。
- Redis 健康检查当前每 20 秒执行一次。
- Redis 命令级连接故障也会立即报告不健康，不必等待下一轮检查。
- 只读 fallback 不标记 Redis cache 为脏。
- put、putIfAbsent、evict、clear、invalidate 和 valueLoader 产生的回退写入会标记为脏。
- 恢复时始终先清理降级期间发生写操作的 Redis cache；`clear-fallback-on-recovery=true` 时还清理本地 fallback cache。
- Redis 失效失败时继续保持不健康状态并在后续检查重试，不能提前切回旧 Redis 数据。

## 一致性判断

- Caffeine fallback 是每节点独立数据，不能保证跨节点读到相同值。
- `clear-fallback-on-recovery=false` 只跳过本地备用缓存清理，不跳过脏 Redis 区域失效。Redis 失效失败时不切回；关闭本地清理仍须评估后续备用使用时的本地旧值窗口。
- 强一致、锁、幂等状态或余额类数据不应依赖缓存 fallback 保证正确性。
