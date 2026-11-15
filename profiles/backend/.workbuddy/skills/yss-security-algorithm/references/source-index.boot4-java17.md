# yss-security-algorithm Source Index

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

- `yss-microservice-components/yss-component-security-algorithm` — HEAD tree `050a32cd4981544535b3b21bb1b397988d8d09d8`，当前内容 `sha256:22cad4afa6f976a81755cf0e2cd4c0d36ef8f9b106f4621e9be24ae8e3051f12`

## Inherited POM Identity

- `pom.xml` — `sha256:57cf2619ba118c89d8bf99c9c4fee0784e07842573d2d2dab3aeb1767308fb74`
- `yss-components-bom/pom.xml` — `sha256:bdc7a61153352abf186f9e4da29cc00dc3af0c994ed901d83dd0e3d90c64ed83`
- `yss-microservice-components/pom.xml` — `sha256:10067db08f0f01332e870098610298070991a566b965659849572d7dd9db3bb1`

## Maven Modules

- `yss-microservice-components/yss-component-security-algorithm/pom.xml` — GAV `com.yss.cloud:yss-component-security-algorithm:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-cloud-microservice:4.0.0-SNAPSHOT`

## Platform Signals

- Java `17`，Spring Boot `4.1.2`，Spring Cloud `2025.1.4`，Spring Cloud Alibaba `2025.1.0.0`。
- 本索引记录当前候选源码入口，具体本地消费与未测范围见平台目录对应candidate配方的verification_scope。远程发布与宿主原生验证分别确认。

## Current API and Configuration

- Jwks的deprecated generateRsa/generateEc/generateSecret均抛IllegalStateException并要求managed JWKSource。
- DefaultJwtConfiguration提供可被自定义替换的delegating PasswordEncoder，兼容静态factory委派PasswordEncoderFactories。
- SecurityCryptoUtil委派显式SecurityCryptoProvider，默认fail closed。RsaEcbOAEPWithSHA保留public无参构造和TextEncryptor签名，委派该facade。
- spring.factories中的BootstrapConfiguration/ApplicationContextInitializer与Boot自动配置分开核验。javax.crypto属于JDK API。既有生产接入范围仍按技能正文处理。

## Auto-configuration Metadata

- `yss-microservice-components/yss-component-security-algorithm/src/main/resources/META-INF/spring.factories` — `org.springframework.cloud.bootstrap.BootstrapConfiguration=\ | com.yss.cloud.config.SpringConfigAutoDecrypt | org.springframework.context.ApplicationContextInitializer=\ | com.yss.cloud.config.SpringConfigAutoDecrypt`
- `yss-microservice-components/yss-component-security-algorithm/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.config.DefaultJwtConfiguration`

## Key Java Entry Points

- `yss-microservice-components/yss-component-security-algorithm/src/main/java/com/yss/cloud/CryptoType.java` — `sha256:8012f5f45f0038b4c994cd60cdf43db02805e41d938fbe928a50879feebba5b7`
- `yss-microservice-components/yss-component-security-algorithm/src/main/java/com/yss/cloud/SecurityCryptoProvider.java` — `sha256:cdd98bd56701af5e2cc7d794017ca7caa139f358d7706eb3f66afb50cb370ecc`
- `yss-microservice-components/yss-component-security-algorithm/src/main/java/com/yss/cloud/config/DefaultJwtConfiguration.java` — `sha256:538f9fd8cc643efc44614642b47d03cee34d9a4e59e5714e3ec2740f26a92658`
- `yss-microservice-components/yss-component-security-algorithm/src/main/java/com/yss/cloud/jose/Jwks.java` — `sha256:b71a46f5e6900770914d8adfc36552f0efacc206078bf76fdfb75536a460688e`
- `yss-microservice-components/yss-component-security-algorithm/src/main/java/com/yss/cloud/jose/KeyGeneratorUtils.java` — `sha256:ae92d9c55b8f54ec476b472e0aa9c3b3cc4a238fd643030fc132a2bf86783bf8`
- `yss-microservice-components/yss-component-security-algorithm/src/main/java/com/yss/cloud/util/RsaEcbOAEPWithSHA.java` — `sha256:7484151e1781313fda6376df95b8bc2bcb83dd7d86ea88cb600d1277438374a4`
- `yss-microservice-components/yss-component-security-algorithm/src/main/java/com/yss/cloud/util/SecurityCryptoUtil.java` — `sha256:6e53bb3da3ef717723f473a3c965034bd90f8285e787f43e4a93d14e7a497c4d`

## Freshness and Use

- 新建工程使用默认Boot4配方时读取本索引。已有工程先读POM/effective POM与实际解析依赖，再选择对应平台线。
- 当前源码与索引不同时读取相关差异，并说明影响。实际源码或构件不可读时保留未知事实。
- 仅按当前任务读取入口。索引刷新及受管镜像同步由对应维护授权覆盖。
