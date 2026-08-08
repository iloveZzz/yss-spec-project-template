# 参考资料

本文档详细介绍了 `yss-component-jdbc` 组件的核心类和配置类。该组件基于 Hutool-db 进行了封装，提供了便捷的 JDBC 操作能力。

## 核心类 (Core Classes)

### 1. DefaultHutoolDbHolder.java

**位置**: `../assets/DefaultHutoolDbHolder.java`

基于 Hutool Db 的数据源持有者。

**功能**:

- **初始化**: 通过 `MultiDataSourceHolder` 获取系统配置的所有数据源。
- **获取 Db/Session**: 提供了静态方法 `getDb(dsName)` 和 `getSession(dsName)`，允许根据数据源名称快速获取 Hutool 的 `Db` 或 `Session` 对象。

### 2. JdbcSqlUtil.java

**位置**: `../assets/JdbcSqlUtil.java`

JDBC 操作工具类，提供了更底层的数据库操作封装。

**核心功能**:

- **动态连接**: 支持通过 `DsParam` (包含 url, user, password, driver) 动态创建连接，不依赖 Spring 容器管理的数据源。
- **批量插入**:
  - `batchAddTableData`: 将 `List<Entity>` 批量插入指定表。
  - `batchAddMapData`: 将 `List<Map<String, String>>` 批量插入指定表。
- **参数构建**: 提供了辅助方法构建批量参数。

### 3. DsParam.java

**位置**: `../assets/DsParam.java`

数据源参数实体类。

**属性**:

- `driverClass`: 驱动类名
- `jdbc`: JDBC URL
- `userName`: 用户名
- `password`: 密码

### 4. DefaultHutoolConfiguration.java

**位置**: `../assets/DefaultHutoolConfiguration.java`

Spring 配置类，负责扫描并注册组件。

## 使用场景

1. **多数据源操作**: 当系统配置了多数据源时，可以使用 `DefaultHutoolDbHolder` 方便地切换数据源进行 CRUD。
2. **临时/动态连接**: 当需要连接未在配置文件中定义的数据源（如用户输入的连接信息）时，使用 `JdbcSqlUtil` 配合 `DsParam`。
3. **批量数据处理**: 处理大量数据导入导出时，`JdbcSqlUtil` 提供了高效的批量插入方法。
