# yss-audit-log Source Index

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

- `yss-microservice-components/yss-component-audit-log` — HEAD tree `c1f84cffb5e8d9534508361c997500339feb0e4a`，当前内容 `sha256:36047a4f71068a8abb876fe9eb1f4f0057154f7edf760347d5212f3c2aef3da7`

## Inherited POM Identity

- `pom.xml` — `sha256:57cf2619ba118c89d8bf99c9c4fee0784e07842573d2d2dab3aeb1767308fb74`
- `yss-components-bom/pom.xml` — `sha256:bdc7a61153352abf186f9e4da29cc00dc3af0c994ed901d83dd0e3d90c64ed83`
- `yss-microservice-components/pom.xml` — `sha256:10067db08f0f01332e870098610298070991a566b965659849572d7dd9db3bb1`

## Maven Modules

- `yss-microservice-components/yss-component-audit-log/pom.xml` — GAV `com.yss.cloud:yss-component-audit-log:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-microservice-components:4.0.0-SNAPSHOT`

## Platform Signals

- Java `17`，Spring Boot `4.1.2`，Spring Cloud `2025.1.4`，Spring Cloud Alibaba `2025.1.0.0`。
- 本索引记录当前候选源码入口，具体本地消费与未测范围见平台目录对应candidate配方的verification_scope。远程发布与宿主原生验证分别确认。

## Current API and Configuration

- `@AuditLog` 通过 `detailPaths` 选择 args/result 安全标量，最多16路径、字符串128字符，旧整参数/整结果开关已弃用。
- `@EnableAuditLog` 显式导入配置。注解默认 enabled/sendSysManageEnabled=true、auditLogPrintEnabled=false，属性类三开关默认均为false，实际生效值需结合入口与环境。
- `AuditLogAspect` 在 `@AfterReturning` 后调用返回void的publish，进程内队列容量1000。正常方法返回、事务提交、下游持久化分别核验。外层回滚后已发生的publish调用仍可观察，业务失败对象正常返回仍触发采集。
- Jackson使用 `tools.jackson.databind` 的ObjectMapper/JsonMapper，注解仍为 `com.fasterxml.jackson.annotation`。

## Auto-configuration Metadata

- 当前模块未发现spring.factories或AutoConfiguration.imports，显式注解/调用入口见上文。

## Key Java Entry Points

- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/AuditLog.java` — `sha256:271dc5f4ec66bcf7d490e7550d90db4cc04c8c4130c3abc755c17c4b089a10d6`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/EnableAuditLog.java` — `sha256:483a702132c2452de165f9711c78ac962589056ef4cb95fdbc82d61a4fa7a417`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/AuditConfiguration.java` — `sha256:e4989f6d28d32c1118d508865df9c08fb9fe3d0f5893ca4e2566cc0aa642c30d`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/AuditConfigurationProperties.java` — `sha256:32664d23f229583e05a1f14a3a45547b585d9f521d2f20c08604b04fcc1e2b3d`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/AuditDetailExtractor.java` — `sha256:2b366805e10f97972487dbb9616b66ba62dabf698fa972b0b2fc627e23806a10`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/AuditLogAspect.java` — `sha256:70fe2c7bbc43d5eeea6e0b3f03d275a006c4f593e71e11d070f1e0da5ab7ae6c`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/EnableAuditLogImportSelector.java` — `sha256:21cd9c32ca914cbdb19dfd550963434ba37e1e9db29b4f96addc3faa2cad146d`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/UUIDGenerator.java` — `sha256:02f61fcd3e1c225acc7aaf36dfdc16f1ccb429b79711f969bb3fdf40a7bcbfaa`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/feign/YssDmSystemManageFeign.java` — `sha256:6538d9e608eee348b80016e95b7388b6e4cc1d694114df0b59e1a3a8bd49c992`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/subscriber/YssAuditPublishService.java` — `sha256:e810c2407bcbaa9949bd578a8be6607d1fb2202340eb1b1bd91b9d6abe6960dc`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/subscriber/YssAuditSubscriber.java` — `sha256:f8274254df0be009f26f5fd1bbffd801b5410f28c0dd2981182bfe4940be66da`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/subscriber/impl/YssAuditLogPrintSubscriberImpl.java` — `sha256:e41a26ad672227da85a932073d1e0fb045f568d1852794c8420cad4279c9a782`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/subscriber/impl/YssAuditLogSysManagerSubscriberImpl.java` — `sha256:1bb3916533a8c82adcecd9d0b24952504f34181d6f310816d85b458233bd6da8`

## Freshness and Use

- 新建工程使用默认Boot4配方时读取本索引。已有工程先读POM/effective POM与实际解析依赖，再选择对应平台线。
- 当前源码与索引不同时读取相关差异，并说明影响。实际源码或构件不可读时保留未知事实。
- 仅按当前任务读取入口。索引刷新及受管镜像同步由对应维护授权覆盖。
