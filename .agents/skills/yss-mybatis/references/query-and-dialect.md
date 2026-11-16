# 查询组织与数据库方言

用于 Java DSL／XML 选择、多数据库兼容、JSON 参数或 Profile 组合排查。先读取实际 POM、Mapper、运行配置及组件能力，不改变工程已有持久层模式，也不默认增加方言、插件或数据源。

## 单表 DSL 与复杂 XML

采用 MyBatis-Plus 的新增或本次重写代码，单表查询使用 `Wrappers.lambdaQuery(PO.class)`，更新使用 `Wrappers.lambdaUpdate(PO.class)`，列由 PO getter 引用。只选择本次所需列，保留原租户、版本、过滤及排序条件；明确 NULL 的更新不得被默认忽略策略吞掉。普通主键 CRUD 使用已选 Mapper 的现有入口，不再包装空 Repository。

复杂多表 JOIN、EXISTS 和关联子查询放入 Mapper XML，列表、总数和详情复用同一权限及租户条件。值用参数绑定，动态标识符使用已确认白名单。返回 record 或不可变对象时，按实际 Java／MyBatis 能力显式映射构造器，核对参数类型、次序和空值语义。同步 namespace、方法参数及资源加载路径，检查最终包内确实包含 XML。

通用 SQL 共用片段，只把真实方言差异放进对应 `databaseId` 语句或片段。不要复制整个查询主体，也不为了展示兼容而制造差异。分页沿用当前唯一责任者，不能在手写 LIMIT 与分页插件间叠加处理。

## 方言必须对应实际连接

分别核对三项：

| 项目 | 责任 |
|---|---|
| `DbType` 或现有方言配置 | 当前 MP／插件及数据库专属参数策略 |
| MyBatis `databaseId` | 选择 XML 中匹配的语句或片段，名称区分大小写 |
| 实际 JDBC 连接 | 提供数据库厂商、版本及当前库／schema 的运行事实 |

先复用组件已有 provider、映射和配置入口。按支持矩阵核对三者是否一致；未知或不匹配的类型应清楚拒绝或报告未支持，不静默套用默认 SQL。一个 SqlSessionFactory 的数据库选择不等于动态路由或多数据源事务能力。

需要跨数据库复用的 PO 不固定某个环境的 schema，由实际连接选择默认库／schema。已有跨 schema 引用属于结构事实，需按适用设计保留，不能机械删除命名空间。

## Profile 与最终绑定值

共享业务 Profile 不应写入覆盖调用方数据库选择的兜底方言。确需默认值时放在适用的基础配置，由数据库专用配置覆盖；核对 Profile group 展开顺序、环境变量及配置优先级，不只检查文件中是否写过正确值。

方言或 JSON 绑定异常时，先检查当前激活的 Profile、实际绑定的 `DbType`／`databaseId` 和连接厂商，再调查缓存、handler 实例或静态状态。装配测试应断言最终绑定值，避免把配置覆盖误判为实例串扰。

## JSON 与专属 TypeHandler

数据库专属绑定同时处理非空值与 SQL NULL。按当前驱动及目标列类型选择 JDBC 类型；不能只实现非空分支而让 NULL 继续使用另一数据库的类型。文本保留、语义比较及数据库内部表示分别说明，不用格式化字符串相等替代业务内容比较。

携带方言的 handler 与当前 SqlSessionFactory 保持一致，先按实际 MP／MyBatis 源码核对显式字段 handler 的创建和实例注册路径。注册范围限定到所需 Java／JDBC 组合；不要让 JSON handler 替换普通 String／VARCHAR 处理器，也不用全局可变静态方言决定绑定。

例如实际版本支持且字段映射适用时，可使用 `registry.register(String.class, JdbcType.OTHER, handler)` 限定注册。具体 JDBC 组合、实例获取和默认构造要求仍以所用版本为准，不把该示例作为所有数据库的固定方案。

## 验证范围

按本次支持矩阵验证默认及数据库模式装配、最终方言、XML 分支、参数次序、非空／NULL 绑定、普通字符串及权限回归。存在多个 Spring Context／SqlSessionFactory 时，验证处理器与配置不互相污染。

SQL 生成、解析、真实执行、类型往返和业务事务分别报告。只解析各表 INSERT 不能证明各表业务 CRUD 均通过；一个数据库或版本的结果不能代替整个支持矩阵。测试范围及目标环境按 `yss-backend-testing` 当前方法确定。
