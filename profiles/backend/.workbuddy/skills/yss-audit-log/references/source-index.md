# yss-audit-log Source Index Router

Index schema: `backend-component-source-index-router-v1`

新建工程采用当前默认配方时读取 `boot4-java17`。已有工程先读取实际 POM、effective POM、解析依赖与匹配源码，再选择平台线。显式 Boot 2/3 工程使用对应资料，已有平台调整按本次用户需求处理。

- `boot4-java17` — [Spring Boot 4.1.2 / Java 17 当前候选](source-index.boot4-java17.md)
- `boot3-java17` — [Spring Boot 3.5 / Java 17 历史索引](source-index.boot3-java17.md)
- `boot2-java8` — [Spring Boot 2.7 / Java 8 维护索引](source-index.boot2-java8.md)

索引提供可重定位源码路径、采集身份与 API 线索。精确行为使用当前可读源码及消费工程已解析构件确认。平台尚不明确时说明缺口并继续独立工作，不能从单个import、分支名或升级意向推定实际平台。`yss-up-springboot3` 继续只处理 Boot 2→3 迁移。
