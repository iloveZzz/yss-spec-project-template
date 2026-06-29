---
name: yss-jdbc
description: 用于 YSS JDBC 组件的使用与排障。当用户提到 Hutool Db、多数据源 JDBC、动态数据源连接、批量写入、JdbcSqlUtil 或 DefaultHutoolDbHolder 时调用。
---

# yss-jdbc

用于处理 `yss-component-jdbc` 的动态连接、多数据源、Hutool Db 封装和批量操作问题。

中文说明：本技能必须以本地源码为准，不再依赖旧的 `assets/*.java` 快照。

## 何时使用

- 用户要用 Hutool Db 访问已配置或动态拼装的数据源。
- 用户在做多数据源同步、搬迁、批量写入。
- 用户提到 `DefaultHutoolDbHolder`、`JdbcSqlUtil`、`DsParam`。
- 用户排查 JDBC 工具类、自动配置、连接参数、批量 SQL 或动态数据源问题。

## Source Index First

Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.

Before changing code or giving exact class/config advice, read:

`references/source-index.md`

Use the index to locate current implementations such as:

- `DefaultHutoolConfiguration`
- `DefaultHutoolDbHolder`
- `JdbcSqlUtil`
- `DsParam`
- JDBC-related auto configuration, properties, factory, holder, util, and tests

中文说明：如果源码索引与本技能文字不一致，以源码索引和真实源码为准。

## 工作方式

1. 先读 `references/source-index.md`，确认当前组件入口和真实类名。
2. 确认数据源是“Spring 已配置”还是“运行时动态输入”。
3. 已配置数据源优先查 `DefaultHutoolDbHolder` 的当前 API。
4. 动态外部连接优先查 `JdbcSqlUtil` + `DsParam` 的当前 API。
5. 批量场景优先复用组件提供的批处理能力，不要手写低质量循环 SQL。
6. 若源码存在测试或示例，优先按测试里的调用方式设计方案。

## 选择规则

- 已注册数据源：`DefaultHutoolDbHolder`
- 临时连接外部库：`JdbcSqlUtil.getDb(...)`
- 批量插入或批量 Map 数据：`JdbcSqlUtil` 的批处理能力
- Spring Boot 接入问题：先看 auto-configuration 和 properties 类
- 连接参数问题：先看 `DsParam` 字段、校验逻辑和工具方法签名

## 检查清单

- 数据源名称是否与配置一致。
- 动态连接参数是否完整。
- 批量操作是否需要事务包裹。
- 是否错误地把 JDBC 工具层当成完整 ORM 使用。
- 是否把账号、密码、URL 等敏感连接信息硬编码到业务代码。
- 是否在 Repository/MyBatis 已覆盖的场景绕过统一持久层规范。

## 修改约束

- 不要在已有 Repository 体系里滥用 JDBC 工具类替代正常持久层。
- 不要把账号密码直接写入代码常量。
- 动态连接场景下优先校验连接参数，再执行写操作。
- 不要凭记忆补类名、方法名或配置项；先从 source-index 跳到真实源码。

## 按需读取

- 源码索引：`references/source-index.md`
- 组件路径线索：`yss-microservice-components/yss-component-jdbc`
