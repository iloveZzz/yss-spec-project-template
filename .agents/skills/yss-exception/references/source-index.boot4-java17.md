# yss-exception Source Index

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

- `yss-microservice-components/yss-component-exception` — HEAD tree `5fece1ee6189a35d8a520ab5c17cb21ab60f025b`，当前内容 `sha256:9655847d43bfa06af81a8d0b3de518ce3e1eb48788d7e14910fd6b3e524ef633`

## Inherited POM Identity

- `pom.xml` — `sha256:57cf2619ba118c89d8bf99c9c4fee0784e07842573d2d2dab3aeb1767308fb74`
- `yss-components-bom/pom.xml` — `sha256:bdc7a61153352abf186f9e4da29cc00dc3af0c994ed901d83dd0e3d90c64ed83`
- `yss-microservice-components/pom.xml` — `sha256:10067db08f0f01332e870098610298070991a566b965659849572d7dd9db3bb1`

## Maven Modules

- `yss-microservice-components/yss-component-exception/pom.xml` — GAV `com.yss.cloud:yss-component-exception:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-microservice-components:4.0.0-SNAPSHOT`

## Platform Signals

- Java `17`，Spring Boot `4.1.2`，Spring Cloud `2025.1.4`，Spring Cloud Alibaba `2025.1.0.0`。
- 本索引记录当前候选源码入口，具体本地消费与未测范围见平台目录对应candidate配方的verification_scope。远程发布与宿主原生验证分别确认。

## Current API and Configuration

- 公开异常入口为BizException、SysException和ExceptionFactory，GlobalExceptionAdvice负责HTTP映射。
- BizException返回400，上传过大返回413，未知/runtime失败返回脱敏500并公开X-Trace-Id，validation violations扩展默认关闭。
- SysException使用com.fasterxml.jackson.annotation.JsonIgnoreProperties隐藏Throwable内部字段。组件使用spring-boot-starter-jackson，HTTP mapper由Boot4消费应用装配。

## Auto-configuration Metadata

- `yss-microservice-components/yss-component-exception/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.exception.advice.GlobalExceptionAdvice | com.yss.cloud.exception.YssGlobalExceptionProperties`

## Key Java Entry Points

- `yss-microservice-components/yss-component-exception/src/main/java/com/yss/cloud/exception/BizException.java` — `sha256:aab9a1c55d7c54110ed9dd99f8c6ec0fc85d3c4a0892c063148b3aa4899933c0`
- `yss-microservice-components/yss-component-exception/src/main/java/com/yss/cloud/exception/ExceptionFactory.java` — `sha256:871070981022984dc5e991bcc6a250fb9fdda31efe94a6e151bd86dfebc7162b`
- `yss-microservice-components/yss-component-exception/src/main/java/com/yss/cloud/exception/ResultErrorCode.java` — `sha256:cfc1ce146b99ba5d938bdc6bfb80758582e0c80cf1e37472967d5fdc334b8f81`
- `yss-microservice-components/yss-component-exception/src/main/java/com/yss/cloud/exception/SysException.java` — `sha256:9683b5c742e1df368a896ead729e2042b83d8323be0e1737b7ab2e403469259c`
- `yss-microservice-components/yss-component-exception/src/main/java/com/yss/cloud/exception/YssGlobalExceptionProperties.java` — `sha256:71a5cc8d2a8be6f60b973bf88c1fa5bce38b638f874cfd40c5876f58df665bd3`
- `yss-microservice-components/yss-component-exception/src/main/java/com/yss/cloud/exception/advice/GlobalExceptionAdvice.java` — `sha256:56fe16973f1847ffd7580270fb2ef73c7c03cc81d549cf070a0c975f32853df7`

## Freshness and Use

- 新建工程使用默认Boot4配方时读取本索引。已有工程先读POM/effective POM与实际解析依赖，再选择对应平台线。
- 当前源码与索引不同时读取相关差异，并说明影响。实际源码或构件不可读时保留未知事实。
- 仅按当前任务读取入口。索引刷新及受管镜像同步由对应维护授权覆盖。
