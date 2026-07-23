# 多数据源与多方言迁移

当模块自行构造 `SpringLiquibase`、迁移控制库与目标库、按运行期数据源选择脚本，或同一模块支持多种数据库时读取本文。

## 可复用结构

以迁移“区域”和“方言”组成资源矩阵：

```text
db/<module>/
├── control/
│   ├── mysql/
│   ├── oracle/
│   └── postgresql/
└── target/
    ├── mysql/
    ├── oracle/
    └── postgresql/
```

每个叶子目录维护独立 `db.changelog-master.xml`，同一逻辑版本在所有受支持方言同步新增。control 与 target 表达不同部署边界，不应通过运行期猜测混用脚本。

## 编程式迁移核查

构造 `SpringLiquibase` 时逐项确认：

- `DataSource` 是控制库还是目标库，Bean 选择是否存在歧义。
- `changeLog` 根据数据库元数据和区域稳定解析，未知产品是否快速失败。
- `databaseChangeLogTable` 与 `databaseChangeLogLockTable` 是否需要模块专用名称。
- `dropFirst` 必须保持关闭，除非用户明确要求重建一次性环境。
- `shouldRun`、contexts、labels、default schema、parameters 是否按配置透传。
- Bean 生命周期是否会在应用启动阶段自动执行；文档和发布流程必须与此一致。
- 异常是否阻止启动，以及这是否符合系统的可用性策略。

目标数据源来自 Bean 名映射时，还要验证空 Bean 名、Bean 不存在、Bean 类型错误和别名。多个业务键可能绑定同一个 `DataSource`；对象身份去重只对单次 JVM 初始化有效。多实例、连接池代理重建、租户注册或运行期新增数据源必须使用稳定数据库身份和数据库级锁协调。

## 数据库产品路由

优先从 `Connection.getMetaData().getDatabaseProductName()` 获取产品名，并集中维护显式映射。至少区分：

- PostgreSQL -> `postgresql`
- MySQL、经确认兼容的 MariaDB -> `mysql`
- Oracle -> `oracle`

不要默认接受 H2 或未知数据库。MariaDB 复用 MySQL 脚本前，应检查版本和实际 DDL 差异，而不是只匹配产品名。

## 方言矩阵审查

对每个逻辑变更逐方言核对：

| 关注点 | MySQL | Oracle | PostgreSQL |
| --- | --- | --- | --- |
| 64 位主键 | `BIGINT`/`BIGINT UNSIGNED` | `NUMBER(19)` | `BIGINT` |
| 大文本 | `LONGTEXT` | `CLOB` | `TEXT` |
| 时间 | `DATETIME`/`TIMESTAMP` | `TIMESTAMP` | `TIMESTAMP` |
| 修改列 | `CHANGE COLUMN` 等版本相关语法 | `RENAME COLUMN`/`MODIFY` | `RENAME COLUMN`/`ALTER COLUMN` |
| 索引 | 可内联于建表 | 通常独立 `CREATE INDEX` | 通常独立 `CREATE INDEX` |
| 标识符 | 关注大小写与保留字 | 关注版本相关长度限制 | 关注引号导致的大小写语义 |

表中类型只是审查提示，不是可直接复制的固定模板；以目标数据库版本、YSS 主键策略和现有模块约定为准。

## 从 file-sync-service 验证出的模式

该模块提供一个可参考但不可机械复制的实现：

- 依赖 `yss-component-liquibase-starter`，同时由模块自有 `FileSyncSchemaMigrator` 构造 `SpringLiquibase`。
- control 和 target 使用分离的 changelog，支持 MySQL、Oracle、PostgreSQL。
- 通过数据库产品名路由资源；多个目标绑定共享同一 `DataSource` 时只迁移一次。
- 使用专用 `FS_FILE_SYNC_CHANGELOG` 和 `FS_FILE_SYNC_CHANGELOG_LOCK`，避免污染应用既有记录，并控制名称长度。
- 资源测试约束方言矩阵、关键 schema 契约和禁止的破坏性 DDL；路由测试约束支持数据库及未知数据库失败行为。

该模块的执行模式由两个开关控制，并通过实现 `InitializingBean` 的迁移器在 Bean 初始化期运行；发布文档当前要求默认关闭、由 DBA 显式迁移。分析类似项目时必须同时检查属性默认值、环境覆盖、生命周期代码和发布文档，不能只复述其中一处。

## 租户、分片和持续迁移

- 注册数据源时检查目标版本，记录每个租户/分片的迁移状态、失败和重试。
- 大规模目标库按批次限流，支持暂停、恢复和进度观测。
- 部分目标成功时保持跨版本 schema 兼容，禁止默认全局回滚。
- 目标长期离线、版本落后或数据库不受支持时隔离该目标，并阻止需要新 schema 的流量。
- 所有目标完成前，应用代码保持新旧结构兼容。

## 最低测试矩阵

1. 每个 `区域 x 方言` 的 master 和所有 include 文件均存在。
2. 各方言包含相同逻辑版本；允许因部署边界不同而使 control 与 target 版本号不同。
3. product name 到目录的映射和未知产品失败已测试。
4. control/target 开关、context/label 以及目标绑定错误已测试。
5. 同一 `DataSource` 被多个业务键引用时只迁移一次。
6. 专用 changelog 表名满足所有目标数据库长度限制。
7. 至少覆盖空库初始化和从上一个已发布版本升级两条路径。
