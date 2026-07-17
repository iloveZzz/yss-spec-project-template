# Redis 故障降级与恢复

## 状态流

```text
Redis 健康 -> 命令或健康检查失败 -> 标记不健康 -> 跳过 Redis
-> 可选 fallback -> 周期健康检查 -> Redis 可连接
-> 清理脏 Redis cache 与本地 fallback cache -> 恢复 Redis
```

- fallback 默认关闭，默认目标是 Caffeine。
- Redis 健康检查当前每 20 秒执行一次。
- Redis 命令级连接故障也会立即报告不健康，不必等待下一轮检查。
- 只读 fallback 不标记 Redis cache 为脏。
- put、putIfAbsent、evict、clear、invalidate 和 valueLoader 产生的回退写入会标记为脏。
- 恢复时先清理降级期间发生写操作的 Redis cache，再清理本地 fallback cache。
- Redis 失效失败时继续保持不健康状态并在后续检查重试，不能提前切回旧 Redis 数据。

## 一致性判断

- Caffeine fallback 是每节点独立数据，不能保证跨节点读到相同值。
- `clear-fallback-on-recovery=false` 会跳过恢复清理，可能重新暴露 Redis 旧值；除非业务明确接受，不要关闭。
- 强一致、锁、幂等状态或余额类数据不应依赖缓存 fallback 保证正确性。
