# yss-audit-log Source Index

Index schema: `backend-component-source-index-v2`
Platform line: `boot3-java17`
Generated: 2026-09-18T18:40:26.031Z
Source commit: `5041c41fbe96c25821bbc15f688c0521b8c97a3d`
Component worktree: `clean`
Component tree `yss-microservice-components/yss-component-audit-log`: `c642c01ee64abd557d3637eb7fe15f9f4947cb2d`
Indexed source root: resolved at refresh time; set `YSS_SOURCE_ROOT_BOOT3_JAVA17` to reproduce or refresh.

Paths are relocatable source hints. Exact guidance comes from the current readable source; indexed commits, tree hashes and worktree status describe the indexing time, not prerequisites for investigation. Explain relevant local changes without requiring a clean checkout or index refresh.

## 2026-11-15 局部核对

本次仅核对下列当前源码与相关配置，保留上方 2026-09-18 快照身份以及下方历史 GAV、树与文件哈希。未执行全量索引刷新。核对来源为 `yss-cloud-microservice` 的 `3d287faba5e10b0784ae23eeb58278825af105e5` 基线与本轮未提交候选工作树，当前组件版本为 `3.2.0-SNAPSHOT`。本次源码核对不证明已发布构件能力。

当前模块相对路径为 `yss-microservice-components/yss-component-audit-log`，按源码定位策略解析实际工程根后读取以下入口。

- `src/main/java/com/yss/cloud/audit/AuditLog.java` 的 `detailPaths()` 显式选择安全标量。`isNeedArgs`、`isNeedResult` 为弃用 API。
- `src/main/java/com/yss/cloud/audit/configuration/AuditDetailExtractor.java` 负责路径、敏感字段、标量及长度校验，最多 16 路径。字符串限 128 字符。`args[n]` 直接标量要求安全的真实参数名，字段选择单独核验字段名。
- `src/main/java/com/yss/cloud/audit/configuration/AuditLogAspect.java` 使用 `@AfterReturning` 采集，SpEL 只读取白名单中的 `args` / `result`。身份来自 `CurrentUserProvider`。
- `src/main/java/com/yss/cloud/audit/subscriber/YssAuditPublishService.java` 的入口为 `publish(AuditMessage)`，使用进程内有界队列。队列拒绝和订阅失败有指标，当前无事务提交后钩子、持久队列或失败重试，退出可能丢失消息。
- `src/main/java/com/yss/cloud/audit/configuration/AuditConfiguration.java` 与 `AuditConfigurationProperties.java` 中，`yss.audit.enabled`、`auditLogPrintEnabled`、`sendSysManageEnabled` 默认均为 false。启用相应条件后才注册切面、发布器及默认订阅器。

技能 `assets/*.java` 继续保留 Boot 2 历史资料身份。接入示例与投递边界见 [技能正文](../SKILL.md)。

## Component Path Hints

- `yss-microservice-components/yss-component-audit-log` (existed when indexed)

## Documentation Files

- No component documentation files found.

Component documentation and the indexed facts below are discovery aids. Confirm API signatures, conditions and defaults against current source; mark unavailable facts as unknown.

## Maven Modules

- `yss-microservice-components/yss-component-audit-log/pom.xml` — GAV `com.yss.cloud:yss-component-audit-log:3.0.0-SNAPSHOT`; parent `com.yss.cloud:yss-microservice-components:3.0.0-SNAPSHOT`

## Platform Signals

- Inherited Java signals: `17`.
- Inherited Spring Boot signals: `3.5.16`.
- Namespace source signals: `javax.*` in 0 main Java files; `jakarta.*` in 2 main Java files.
- Auto-configuration metadata: 0 `spring.factories`; 0 `AutoConfiguration.imports` files.
- These are historical source observations, not compatibility certification. Check the actual project platform, current component source and relevant behavior before claiming compatibility.

## Key Java Entry Points

- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/AuditLog.java` — `sha256:09d7d6cae894bbb9d5e9651812d0cc599dd5907cc728b81c82843e57845d3a11`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/EnableAuditLog.java` — `sha256:cc1085f77fcd3ffd995a73d4eca083059d204c8aee3c51779fa9427797033a9b`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/AuditConfiguration.java` — `sha256:abf75caddee4ade5169a178be11b56ad2a5da9525b50e11d4e6306fef6430ca4`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/AuditConfigurationProperties.java` — `sha256:32664d23f229583e05a1f14a3a45547b585d9f521d2f20c08604b04fcc1e2b3d`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/AuditLogAspect.java` — `sha256:3db4297a0d52e97cff70a13800ae4f412f87799abc231e9cd8b9b43ecf7c1c00`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/EnableAuditLogImportSelector.java` — `sha256:4877f5c1319d16c8796a2cd775d20d8703c6000a33069b4eff2a566b685b47ef`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/UUIDGenerator.java` — `sha256:02f61fcd3e1c225acc7aaf36dfdc16f1ccb429b79711f969bb3fdf40a7bcbfaa`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/feign/YssDmSystemManageFeign.java` — `sha256:3a76cd33dbff182f964975c7ce4a63405660c0edb15057ff57eeebf0085b942a`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/subscriber/YssAuditPublishService.java` — `sha256:0de3ddc7ff56051d7b955a4d9d0f0ec3230d5674abfb2a3cc10ba457dbcc7afd`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/subscriber/YssAuditSubscriber.java` — `sha256:f8274254df0be009f26f5fd1bbffd801b5410f28c0dd2981182bfe4940be66da`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/subscriber/impl/YssAuditLogPrintSubscriberImpl.java` — `sha256:bf74f628ffa94b3f58402960b0808663410235f979cf83cafeadacbe4de7a798`
- `yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/subscriber/impl/YssAuditLogSysManagerSubscriberImpl.java` — `sha256:5f8853eea7484726ba3816899b3ea3afb7fb3c74635ff7008d331ec9b697d2ef`

## Freshness and Use

- Locate the current source root using `YSS_SOURCE_ROOT_BOOT3_JAVA17`, CodeGraph, Maven artifact names or repository search.
- Read the relevant current source and local differences. Historical tree hashes can locate differences; a mismatch or dirty subtree does not prevent read-only investigation.
- State source/version limitations when they affect the conclusion. If source is unavailable, keep precise API claims unknown rather than treating this index as current evidence.
- Read only the entries needed for the task. Reporting an outdated index does not authorize editing the skill source, managed copies or another repository; refresh only with the corresponding request and write authorization.
