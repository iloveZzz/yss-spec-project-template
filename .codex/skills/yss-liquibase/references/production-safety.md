# 生产安全与发布审计

在处理生产发布、锁、checksum、回滚、在线数据库状态或 `release-audit` 时读取本文。

## 执行所有者

为每个数据库和 changelog 指定一个主执行所有者：应用启动、迁移 Job、发布流水线、CLI 或 DBA。关闭其他写入口，检查 Spring Boot 原生自动配置、自定义 `SpringLiquibase`、`InitializingBean`、流水线和发布文档是否重复执行。

多实例启动时确认 Liquibase 锁覆盖并发、启动超时足够，以及迁移失败后旧版本是否继续服务。不要用 JVM 内互斥替代数据库级协调。

## 证据等级

1. 工作区相对 `HEAD` 的变化：只能说明本地修改。
2. 相对用户指定发布 tag/commit 的变化：说明发布基线中已存在的文件被修改，不能证明生产已执行。
3. 目标数据库 `DATABASECHANGELOG` 的 `ID`、`AUTHOR`、`FILENAME`、`MD5SUM`：可以证明执行历史；仍须核对数据库、schema 和 changelog 表是否正确。

不得把 Git 中存在、已经合并和生产已经执行混为一谈。

## 在线诊断

优先分析用户提供的脱敏导出。在线查询必须获得明确授权，只读取：数据库/驱动版本、当前 schema/catalog、changelog、lock 表和必要元数据。不得从配置、命令历史或进程环境中主动搜集未授权凭据。

遇到锁时先确认迁移进程是否仍存活、`LOCKEDBY`、`LOCKGRANTED`、数据库会话和长事务。只有确认锁陈旧且目标准确后，才能提出 `releaseLocks`；执行仍需单独授权。

遇到 checksum 变化时先比对完整身份、文件内容、Liquibase 版本和历史部署。优先追加修复 changeset。`clearCheckSums` 只在确认变化合法并接受所有 checksum 重算影响时使用；手工更新或删除 changelog 记录默认禁止。

## 风险门禁

| 等级 | 典型变更 | 最低验证 |
| --- | --- | --- |
| 低 | 新表、独立索引、兼容的可空列 | 静态审计、`validate`、空库 `update`、模块测试 |
| 中 | 非空列、默认值、唯一约束、回填、大表索引 | 增加升级测试、`updateSQL` 审阅、数据量评估、目标数据库测试 |
| 高 | 删除、改型、大表重写、跨 schema、不可逆数据 | 增加兼容发布、相近规模演练、锁/时长观测、审批、恢复验证 |

## 发布清单

输出 changeset 完整身份、执行所有者、目标 schema、context/label、执行窗口、应用兼容区间、预估耗时和空间、前置检查、成功判据、失败判据、恢复步骤、验证证据和审批状态。`rollbackSQL` 不等于恢复验证。

报告需脱敏 JDBC URL、用户名、SQL 参数和业务敏感数据。
