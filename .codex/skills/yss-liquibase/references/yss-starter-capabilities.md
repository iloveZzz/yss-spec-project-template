# YSS Liquibase Starter 能力基线

本文件记录 2026-07-23 在本机 Maven 解析结果中验证的事实。项目版本不同时，重新读取依赖树、组件 POM/JAR 和源码，不得直接套用。

## 已验证基线

- 项目：`file-sync-service:3.0.0-SNAPSHOT`
- YSS 依赖：`com.yss.cloud:yss-component-liquibase-starter:2.0.0-SNAPSHOT`
- Spring Boot：`spring-boot-autoconfigure:2.7.18`
- Liquibase：`liquibase-core:4.9.1`

本机缓存的 `yss-component-liquibase-starter` 2.0.0 和 3.0.0 JAR 仅包含 Maven 元数据，没有 Java 类、自动配置元数据或资源；其 POM 直接引入 `liquibase-core`，并将 Spring Boot autoconfigure/configuration-processor 和 SLF4J 声明为 provided。因此在该基线下，它是依赖聚合模块，不能据此臆造 YSS 专有配置键或扩展点。

`file-sync-service` 的多数据源行为来自业务模块自有 `FileSyncSchemaMigrator`，不是 starter 自动提供。Spring Boot 原生配置和 `SpringLiquibase` API 的可用能力必须以 Boot 2.7.18、Liquibase 4.9.1 及实际源码为准。

## 刷新方法

1. 运行项目 Maven Wrapper 的 `dependency:tree`，锁定 starter、Liquibase、Spring Boot 和数据库驱动版本。
2. 查找匹配版本的源码；找不到时检查 Maven 缓存的 POM、JAR、sources JAR 和自动配置元数据。
3. 记录自动配置类、条件、Bean、配置前缀/默认值、扩展点、数据库支持和限制。
4. 标注组件版本、源码提交或快照时间。SNAPSHOT 坐标相同也可能内容变化，不能只比较版本字符串。
