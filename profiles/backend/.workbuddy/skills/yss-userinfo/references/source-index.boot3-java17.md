# yss-userinfo Source Index

Index schema: `backend-component-source-index-v2`
Platform line: `boot3-java17`
Generated: 2026-09-18T18:40:26.031Z
Source commit: `5041c41fbe96c25821bbc15f688c0521b8c97a3d`
Component worktree: `clean`
Component tree `yss-microservice-components/yss-component-userinfo-starter`: `96c79dcb754df0dbcc59a465e45d6871601275ff`
Indexed source root: resolved at refresh time; set `YSS_SOURCE_ROOT_BOOT3_JAVA17` to reproduce or refresh.

Paths are relocatable source hints. Exact guidance comes from the current readable source; indexed commits, tree hashes and worktree status describe the indexing time, not prerequisites for investigation. Explain relevant local changes without requiring a clean checkout or index refresh.

## Component Path Hints

- `yss-microservice-components/yss-component-userinfo-starter` (existed when indexed)

## Documentation Files

- No component documentation files found.

Component documentation and the indexed facts below are discovery aids. Confirm API signatures, conditions and defaults against current source; mark unavailable facts as unknown.

## Maven Modules

- `yss-microservice-components/yss-component-userinfo-starter/pom.xml` — GAV `com.yss.cloud:yss-component-userinfo-starter:3.0.0-SNAPSHOT`; parent `com.yss.cloud:yss-microservice-components:3.0.0-SNAPSHOT`

## Platform Signals

- Inherited Java signals: `17`.
- Inherited Spring Boot signals: `3.5.16`.
- Namespace source signals: `javax.*` in 0 main Java files; `jakarta.*` in 1 main Java files.
- Auto-configuration metadata: 0 `spring.factories`; 1 `AutoConfiguration.imports` files.
- These are historical source observations, not compatibility certification. Check the actual project platform, current component source and relevant behavior before claiming compatibility.

## Key Java Entry Points

- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/domain/DmUser.java` — `sha256:c25b546485977a7e28c23ed22735e0ea43eb166f6a856e43159b7d40677570fe`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/domain/DmUserDetails.java` — `sha256:ab34afc0f0e28fe85b405e56b12ee08b57884cfc120b6bd5d8b0e8e095e51a2c`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/AuthUserInfoUtil.java` — `sha256:e3c8cd0f18754644a95ccccb76a7ae66d5446af35f683a212daf7566b13a7eaf`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/CurrentUserProvider.java` — `sha256:4f76eab3eb10a24af0a3f40eacfbac6a7f1d367af532c6c30cf25d118ba4d1fa`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/SecurityContextCurrentUserProvider.java` — `sha256:fd83da91f69c016623c13efc33ef85de3dcc5864fb7ee42de3a0054a7c6d9e70`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/TrustedGatewayHeaderCurrentUserProvider.java` — `sha256:72c8e5e1f60e90f02685ec2e494efc0271ee35ddf2df989b96f3b76aa0401737`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/config/TrustedGatewayUserInfoProperties.java` — `sha256:30f34ac4b4d43f854e46d5078dd6ed84e86280a4c0150508091cd557919ddab2`
- `yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/config/UserInfoAutoConfiguration.java` — `sha256:4bfc378fcba4f6dbb8f1bcc8e3ea4ee7c8fc9908f68cfb187c7945ebeee4dead`

## Freshness and Use

- Locate the current source root using `YSS_SOURCE_ROOT_BOOT3_JAVA17`, CodeGraph, Maven artifact names or repository search.
- Read the relevant current source and local differences. Historical tree hashes can locate differences; a mismatch or dirty subtree does not prevent read-only investigation.
- State source/version limitations when they affect the conclusion. If source is unavailable, keep precise API claims unknown rather than treating this index as current evidence.
- Read only the entries needed for the task. Reporting an outdated index does not authorize editing the skill source, managed copies or another repository; refresh only with the corresponding request and write authorization.
