# yss-userinfo Source Index

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

- `yss-microservice-components/yss-component-userinfo-starter` — HEAD tree `9a2ee72ca26462e36857559e97545d2e1ee0a21b`，当前内容 `sha256:dabea0670bb6bcd30480c21e7796fd9d53adf06dd5704f66f11dd1a311346cf0`

## Inherited POM Identity

- `pom.xml` — `sha256:57cf2619ba118c89d8bf99c9c4fee0784e07842573d2d2dab3aeb1767308fb74`
- `yss-components-bom/pom.xml` — `sha256:bdc7a61153352abf186f9e4da29cc00dc3af0c994ed901d83dd0e3d90c64ed83`
- `yss-microservice-components/pom.xml` — `sha256:10067db08f0f01332e870098610298070991a566b965659849572d7dd9db3bb1`

## Maven Modules

- `yss-microservice-components/yss-component-userinfo-starter/pom.xml` — GAV `com.yss.cloud:yss-component-userinfo-starter:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-microservice-components:4.0.0-SNAPSHOT`

## Platform Signals

- Java `17`，Spring Boot `4.1.2`，Spring Cloud `2025.1.4`，Spring Cloud Alibaba `2025.1.0.0`。
- 本索引记录当前候选源码入口，具体本地消费与未测范围见平台目录对应candidate配方的verification_scope。远程发布与宿主原生验证分别确认。

## Current API and Configuration

- CurrentUserProvider.currentUser()返回Optional<UserInfo>。当前未提交B1候选先处理既有UserInfo，再处理OAuth2AuthenticatedPrincipal，随后映射ClaimAccessor，最后使用普通principal名称。
- 空、未认证与anonymous返回empty。新对象权限只来自Authentication.getAuthorities()，JWT验证由资源服务器认证链负责。
- 字段回退为preferred_username/sub/Authentication名称，userCode/user_code，loginDisplayName/name，另读email/iss。网关fallback要求显式启用、非空trusted-proxies和可信remote address，SecurityContext优先。
- AuthUserInfoUtil使用Jackson3 tools.jackson ObjectMapper/JsonMapper，POM另保留旧jackson-datatype-jsr310声明，精确依赖以消费解析为准。源码候选与已发布构件支持分别核验。

## Auto-configuration Metadata

- `yss-microservice-components/yss-component-userinfo-starter/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.user.config.UserInfoAutoConfiguration`

## Key Java Entry Points

- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/domain/DmUser.java` — `sha256:c25b546485977a7e28c23ed22735e0ea43eb166f6a856e43159b7d40677570fe`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/domain/DmUserDetails.java` — `sha256:ab34afc0f0e28fe85b405e56b12ee08b57884cfc120b6bd5d8b0e8e095e51a2c`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/AuthUserInfoUtil.java` — `sha256:22625d7cd149f547883a0bee6771a84a4d1e10d538110a22f7c45898e8f94485`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/CurrentUserProvider.java` — `sha256:4f76eab3eb10a24af0a3f40eacfbac6a7f1d367af532c6c30cf25d118ba4d1fa`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/SecurityContextCurrentUserProvider.java` — `sha256:8ea76749800ecc4abfe7095f2d2f0ac31229ba156d69a3acb4cb4e0a24680375`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/TrustedGatewayHeaderCurrentUserProvider.java` — `sha256:7c531e5143f34053dd49fc6fa6408ea2eecd3b2c200b46fa01a1b6140c820051`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/config/TrustedGatewayUserInfoProperties.java` — `sha256:30f34ac4b4d43f854e46d5078dd6ed84e86280a4c0150508091cd557919ddab2`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/config/UserInfoAutoConfiguration.java` — `sha256:4bfc378fcba4f6dbb8f1bcc8e3ea4ee7c8fc9908f68cfb187c7945ebeee4dead`

## Freshness and Use

- 新建工程使用默认Boot4配方时读取本索引。已有工程先读POM/effective POM与实际解析依赖，再选择对应平台线。
- 当前源码与索引不同时读取相关差异，并说明影响。实际源码或构件不可读时保留未知事实。
- 仅按当前任务读取入口。索引刷新及受管镜像同步由对应维护授权覆盖。
