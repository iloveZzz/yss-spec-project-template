# JetCache 独立接入与验证

本页记录当前 Boot 3 / Java 17 `yss-component-jetcache` 工作树的接入判断；Boot 2 的精确能力以其平台索引和匹配源码为准。JetCache 与 YSS Spring Cache 是两条独立入口，不继承 `yss.cache.active-type`、区域 TTL 或 Redis `failure-mode`。

## 先确认实际入口

- 检查运行时上游 `CacheManager`、local/remote builder、应用自己的 JetCache 配置及实际创建的 area/name。依赖 JAR 中有 `bootstrap.yml` 不证明应用加载了它；无有效 local builder 时，LOCAL 请求可能在运行时失败。
- 组件兼容包装器的两参数 `getCache` 默认 TTL 为 5 分钟，重载接收 `Duration`；它不设置 `syncLocal`、loader 或刷新策略。包装器的类型映射也不证明 LOCAL 实际采用 Caffeine。需要这些能力时核对原生 `QuickConfig` 与上游管理器。
- 管理器按 area/name 复用已创建缓存。类型、TTL、`syncLocal` 等参数在第一次创建时确定，后续 `getOrCreateCache` 不会重建同名缓存；修改配置须使用新名称或明确的生命周期切换。

## 跨 JVM 本地失效

原生 `QuickConfig` 选择 `BOTH`、设置 `syncLocal(true)`，并为所有参与节点配置兼容的 `jetcache.remote.default.broadcastChannel`、编码及相同 area/name。包装器即使存在广播频道也不会自行开启 `syncLocal`；缺频道时不能据 `syncLocal(true)` 宣称已同步。

验收时启动两个独立 JVM，在两端创建同名缓存，确认广播订阅实际建立后，从一端更新和删除并观察另一端本地值失效；同时用未同步的对照缓存确认失效范围。广播是异步通知，不承诺强一致或断连期间的持久补偿。

## 故障与数据格式

- 读取 `CacheResult` 状态来区分未命中和故障；便利 `get`/`getValue` 可能将远端故障折叠为 `null`。REMOTE 与 BOTH 的故障结果也不同，不能套用主线 Redis 的 fail-fast/bypass/fallback。
- JetCache Java 编码保存 `CacheValueHolder`，与 Spring RedisCache 的 JDK 业务值及 RedisTemplate 的 Jackson 值不同。缓存名称、key 前缀或 serializer 迁移前，核对实际物理 key 和兼容方案，避免混写。
- 包装器不提供主线缓存的事务后提交协调。刷新须核对原生 loader 与 refresh policy 是否同时配置；本轮未验证多节点刷新去重、断连补偿或生产 SLA。
