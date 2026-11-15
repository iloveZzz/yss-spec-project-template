# yss-resilience4j Source Index

Index schema: `backend-component-source-index-v2`
Platform line: `boot4-java17`
Generated: 2026-11-16
Source commit: `ad2642dd05527c073eb1da1213843b1130b44703`
Component worktree: `working-tree`
Source status SHA-256: `3821d54a47c93935fff8e516d777ebc27a0e764e83d7bc09d236cbca89b3dc75`
Source content SHA-256: `ab507485a5ff5451302b72e30a4a0e8887151a9491c85434d44a9ebff07f0b72`
Indexed source root: set `YSS_SOURCE_ROOT_BOOT4_JAVA17` to the matching readable source checkout.

路径以该环境变量对应的源码根为基准，可按模块GAV定位。HEAD描述提交基线，当前未提交B1/B2/B3改动由内容摘要另行标识。内容摘要算法与本轮C2一致，将相对路径到文件SHA-256的映射按Python `json.dumps(sort_keys=True, separators=(",", ":"))` 序列化后计算SHA-256，文件集合为Git tracked及非ignored untracked文件。它描述采集时源码，消费工程仍需核验实际解析构件。

## Component Path Hints

- `yss-microservice-components/yss-component-resilience4j-starter` — HEAD tree `dde2d21831a7a28d810f9ae7e2e6f73ae9e3e6f5`，当前内容 `sha256:33b7d581a67f22f471d31f14f4772b7ea8d724cfeb2d4da432351e66cb0ae31f`

## Inherited POM Identity

- `pom.xml` — `sha256:57cf2619ba118c89d8bf99c9c4fee0784e07842573d2d2dab3aeb1767308fb74`
- `yss-components-bom/pom.xml` — `sha256:bdc7a61153352abf186f9e4da29cc00dc3af0c994ed901d83dd0e3d90c64ed83`
- `yss-microservice-components/pom.xml` — `sha256:10067db08f0f01332e870098610298070991a566b965659849572d7dd9db3bb1`

## Maven Modules

- `yss-microservice-components/yss-component-resilience4j-starter/pom.xml` — GAV `com.yss.cloud:yss-component-resilience4j-starter:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-cloud-microservice:4.0.0-SNAPSHOT`

## Platform Signals

- Java `17`，Spring Boot `4.1.2`，Spring Cloud `2025.1.4`，Spring Cloud Alibaba `2025.1.0.0`。
- 本索引记录当前候选源码入口，具体本地消费与未测范围见平台目录对应candidate配方的verification_scope。远程发布与宿主原生验证分别确认。

## Current API and Configuration

- GatewayConfiguration是条件配置，要求CircuitBreaker类与Web应用，再导入GlobalCircuitExceptionAdvice。该类没有route/filter方法，路由与过滤器读取消费应用。
- GlobalCircuitExceptionAdvice将TimeoutException/CallNotPermittedException/RequestNotPermitted分别映射504/503/429。RecordFailurePredicate排除BizException。
- 当前POM排除resilience4j-spring-boot3，显式使用resilience4j-spring-boot4，根管理版本2.4.0。

## Auto-configuration Metadata

- `yss-microservice-components/yss-component-resilience4j-starter/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.breaker.config.GatewayConfiguration`

## Key Java Entry Points

- `yss-microservice-components/yss-component-resilience4j-starter/src/main/java/com/yss/cloud/breaker/config/GatewayConfiguration.java` — `sha256:7924b9c95f8c7f97636aa480f5613c21703eef646bd72c320966bafe147491ef`
- `yss-microservice-components/yss-component-resilience4j-starter/src/main/java/com/yss/cloud/breaker/exception/GlobalCircuitExceptionAdvice.java` — `sha256:96eb6f57fcf3f232d9685ee0f1161ace7f8b4f220abb3f90c4958850bbd19a18`
- `yss-microservice-components/yss-component-resilience4j-starter/src/main/java/com/yss/cloud/breaker/exception/RecordFailurePredicate.java` — `sha256:3a6ebb6ef6d61c9dd2d63e756948209b2705787ca88575f33381a12449786369`

## Freshness and Use

- 新建工程使用默认Boot4配方时读取本索引。已有工程先读POM/effective POM与实际解析依赖，再选择对应平台线。
- 当前源码与索引不同时读取相关差异，并说明影响。实际源码或构件不可读时保留未知事实。
- 仅按当前任务读取入口。索引刷新及受管镜像同步由对应维护授权覆盖。
