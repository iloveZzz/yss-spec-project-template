# 序列化兼容

当前存在两条不同数据路径：

- 框架 `RedisTemplate` 使用 Jackson JSON serializer。
- Spring `RedisCacheManager` 沿用默认 JDK value serialization。

两者的数据不可假设互相可读。`RedisTemplate` 的历史泛型声明与通用 JSON 行为也不完全一致，修改前必须检查消费方注入类型和实际操作。

以下变化都属于 Redis 数据协议变更：

- 修改 value/hash serializer。
- 修改 key serializer 或 cache prefix。
- 重命名 cache name。
- 改变 key 的字段、顺序、归一化或版本。

实施协议迁移前至少选择一种策略：双读单写、双写、版本化前缀、灰度清理或停机迁移。必须验证旧值读取、新值写入、回滚和混合版本节点；禁止把“统一 serializer”当作无风险重构。
