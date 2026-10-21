# 分布式 ID 能力与迁移说明

本文件只说明选择和核验边界。类名、配置默认值及方法签名以所选平台线的生成索引和匹配的干净源码为准，不复制组件实现。

| 场景 | Boot 3 / Java 17 当前工作树观察 | 核验重点 |
|---|---|---|
| Segment | 本地号段；默认 local + Segment | DataSource、目标方言建表、`biz_tag` 唯一键、已分配水位、缺失标签策略 |
| Snowflake | 本地节点发号；可配置 worker-id，未指定时按节点地址派生 | 所有实例 worker-id 无冲突、时钟回拨和序列等待；不假设 ZooKeeper 注册 |
| 主键自动填充 | MyBatis 拦截与 MyBatis-Plus `IdentifierGenerator` 两条入口 | `AUTO` 与 `ASSIGN_ID` 区分、已有值保留、批量参数形态、`Integer` 溢出 |
| String UUID | 本地拦截器仍有 UUID 字符串分支 | 仅核对显式 UUID 策略及 String 字段，不当作 Segment/Snowflake 的数值主键迁移替代 |
| CosId、Feign/远程注入 | 当前 Boot 3 主线不提供 | 仅对既有项目按其实际平台线和源码做迁移分诊，不把旧模块写成新接入依赖 |

Segment 从现有业务表接管 ID 时，先记录业务表最大值、`leaf_alloc.max_id` 和尚未用尽的已分配号段，再在停写窗口确定不回退的起点。缺失标签自动创建不会计算这些值；不得删除或重置控制记录。Snowflake 切换需验证新旧机器位语义及所有活跃节点，不在混合写流量时直接换算法。遗留 `feign_segment` 注解仍是明确的拒绝路径，迁移须清理旧注解及依赖，不能用已有非零 ID 掩盖它。

只读分诊可参考当前组件 `readme.md` 和源码路径提示；组件子树 dirty、索引 tree 不一致或兼容证据未 verified 时，这些观察不构成精确接入或发布结论。
