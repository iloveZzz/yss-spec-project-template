# 参考资料

本文档详细介绍了 `yss-component-distributed-id` 框架的核心组件和实现原理。

## 核心类 (Core Classes)

### 1. AutoIdInterceptor.java
**位置**: `../assets/AutoIdInterceptor.java`

MyBatis 拦截器，是实现自动 ID 注入的核心。

**拦截逻辑**:
- **拦截点**: `StatementHandler.prepare` 方法。
- **判断条件**: 仅拦截 `INSERT` 语句。
- **处理流程**:
  1. 获取 SQL 绑定的参数对象 (`parameterObject`)。
  2. 支持处理单对象、`List`、`Array` 和 `Map` (MyBatis 多参数封装)。
  3. 遍历参数对象的实体类，检查是否有 `@Entity` (JPA) 或 `@TableName` (MP) 注解。
  4. 扫描实体字段，查找 `@GeneratedValue` 或 `@TableId` 注解。
  5. 根据注解指定的策略 (`segment`, `snowflake`, `cosid_segment` 等)，调用对应的 ID 生成器获取 ID。
  6. 通过反射将 ID 设置到实体的相应字段中。

### 2. EnableDistributedId.java
**位置**: `../assets/EnableDistributedId.java`

开启分布式 ID 功能的注解。

**属性**:
- `autoRegister`: 是否自动注册配置，默认为 `true`。
- `cosid`: 是否开启 CosId 模式，默认为 `false` (即默认使用 Leaf 模式)。

**作用**:
- 导入 `LeafDataSourceConfiguration` 和 `EnableDistributedImportSelector`，从而根据配置加载相应的 Bean。

### 3. LeafConf.java
**位置**: `../assets/LeafConf.java`

Leaf 模式的配置类，对应 `spring.leaf` 配置项。

**属性**:
- `leafSegmentEnable`: 是否开启号段模式。
- `leafSnowflakeEnable`: 是否开启雪花算法模式。

## ID 生成策略详解

| 策略名称 | 依赖组件 | 描述 | 适用场景 |
| :--- | :--- | :--- | :--- |
| **Leaf Segment** | DB (MySQL) | 基于数据库号段，每次从 DB 获取一个号段到内存，高性能，ID 趋势递增。 | 大多数业务场景，高可用要求高。 |
| **Leaf Snowflake** | Zookeeper | 基于 Twitter 雪花算法，依赖 ZK 进行 WorkerID 管理。 | 对 ID 生成速度要求极高，且不依赖 DB 的场景。 |
| **CosId Segment** | DB (MySQL) | CosId 的号段模式实现，支持更丰富的配置（如步长动态调整）。 | 需要 CosId 特性或作为 Leaf 的替代方案。 |
| **UUID** | JDK | 标准 UUID。 | 无需有序、不关心存储空间的场景。 |
