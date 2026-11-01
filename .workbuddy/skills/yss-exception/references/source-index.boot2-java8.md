# yss-exception Source Index

Index schema: `backend-component-source-index-v2`
Platform line: `boot2-java8`
Generated: 2026-09-18T18:40:26.031Z
Source commit: `a3be2b2e33dca4545782e2b31894aaa00d0305cd`
Component worktree: `clean`
Component tree `yss-microservice-components/yss-component-exception`: `e5d71e213f26cd7e52d419ded1c2f5e7b7fbf40b`
Indexed source root: resolved at refresh time; set `YSS_SOURCE_ROOT_BOOT2_JAVA8` to reproduce or refresh.

Paths are relocatable source hints. Exact guidance comes from the current readable source; indexed commits, tree hashes and worktree status describe the indexing time, not prerequisites for investigation. Explain relevant local changes without requiring a clean checkout or index refresh.

## Component Path Hints

- `yss-microservice-components/yss-component-exception` (existed when indexed)

## Documentation Files

- `yss-microservice-components/yss-component-exception/readme.md`

Component documentation and the indexed facts below are discovery aids. Confirm API signatures, conditions and defaults against current source; mark unavailable facts as unknown.

## Maven Modules

- `yss-microservice-components/yss-component-exception/pom.xml` — GAV `com.yss.cloud:yss-component-exception:2.0.0-SNAPSHOT`; parent `com.yss.cloud:yss-microservice-components:2.0.0-SNAPSHOT`

## Platform Signals

- Inherited Java signals: `1.8`.
- Inherited Spring Boot signals: `2.7.18`.
- Namespace source signals: `javax.*` in 1 main Java files; `jakarta.*` in 0 main Java files.
- Auto-configuration metadata: 1 `spring.factories`; 0 `AutoConfiguration.imports` files.
- These are historical source observations, not compatibility certification. Check the actual project platform, current component source and relevant behavior before claiming compatibility.

## Key Java Entry Points

- `yss-microservice-components/yss-component-exception/src/main/java/com/yss/cloud/exception/ExceptionFactory.java` — `sha256:871070981022984dc5e991bcc6a250fb9fdda31efe94a6e151bd86dfebc7162b`
- `yss-microservice-components/yss-component-exception/src/main/java/com/yss/cloud/exception/ResultErrorCode.java` — `sha256:cfc1ce146b99ba5d938bdc6bfb80758582e0c80cf1e37472967d5fdc334b8f81`
- `yss-microservice-components/yss-component-exception/src/main/java/com/yss/cloud/exception/YssGlobalExceptionProperties.java` — `sha256:706136214248b90965feadced7940fde2f649e9d5f19a3953d55756a7f56ea84`
- `yss-microservice-components/yss-component-exception/src/main/java/com/yss/cloud/exception/advice/GlobalExceptionAdvice.java` — `sha256:c4233e0fdfccb63330fc82d26e4defd8fb8985ba04cc23d8fa3d0e2cbc0183b5`

## Freshness and Use

- Locate the current source root using `YSS_SOURCE_ROOT_BOOT2_JAVA8`, CodeGraph, Maven artifact names or repository search.
- Read the relevant current source and local differences. Historical tree hashes can locate differences; a mismatch or dirty subtree does not prevent read-only investigation.
- State source/version limitations when they affect the conclusion. If source is unavailable, keep precise API claims unknown rather than treating this index as current evidence.
- Read only the entries needed for the task. Reporting an outdated index does not authorize editing the skill source, managed copies or another repository; refresh only with the corresponding request and write authorization.
