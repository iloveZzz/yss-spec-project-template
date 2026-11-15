# yss-validation Source Index

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

- `yss-microservice-components/yss-component-validation-jsr303` — HEAD tree `035a7114b46ef05faee491870cd39fe0810b835f`，当前内容 `sha256:211291093d7e6a27131f831921d8f4875e3bf7c7866fcb82f0fb30d3cc469a9a`

## Inherited POM Identity

- `pom.xml` — `sha256:57cf2619ba118c89d8bf99c9c4fee0784e07842573d2d2dab3aeb1767308fb74`
- `yss-components-bom/pom.xml` — `sha256:bdc7a61153352abf186f9e4da29cc00dc3af0c994ed901d83dd0e3d90c64ed83`
- `yss-microservice-components/pom.xml` — `sha256:10067db08f0f01332e870098610298070991a566b965659849572d7dd9db3bb1`

## Maven Modules

- `yss-microservice-components/yss-component-validation-jsr303/pom.xml` — GAV `com.yss.cloud:yss-component-validation-jsr303:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-cloud-microservice:4.0.0-SNAPSHOT`

## Platform Signals

- Java `17`，Spring Boot `4.1.2`，Spring Cloud `2025.1.4`，Spring Cloud Alibaba `2025.1.0.0`。
- 本索引记录当前候选源码入口，具体本地消费与未测范围见平台目录对应candidate配方的verification_scope。远程发布与宿主原生验证分别确认。

## Current API and Configuration

- 当前具有本地Java自动配置YssValidationAutoConfiguration，在MessageSource之后、Boot4 ValidationAutoConfiguration之前装配默认Validator的configuration customizer。
- yss.validation.messages.enabled默认true，defaultLocale默认简体中文。YssValidationMessageInterpolator提供无参、(MessageSource,Locale)、(MessageSource,Locale,ClassLoader)构造。
- 消息回退顺序为应用Spring MessageSource、应用ValidationMessages、组件com.yss.cloud.validation.messages、provider插值。无显式Locale时先用线程Locale，再回退defaultLocale。
- 包内customizer给同优先级或更高优先级消费方customizer让位，保留Boot Validator的DI、方法校验与生命周期。HTTP失败映射属于exception组件，历史EL/parser模块仍需独立确认来源。

## Auto-configuration Metadata

- `yss-microservice-components/yss-component-validation-jsr303/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.validation.YssValidationAutoConfiguration`

## Key Java Entry Points

- `yss-microservice-components/yss-component-validation-jsr303/src/main/java/com/yss/cloud/validation/YssValidationAutoConfiguration.java` — `sha256:39e1dfac510f06d948d827edcd0bb4d7d28913c99a660ea596d05f0f7ee25a92`
- `yss-microservice-components/yss-component-validation-jsr303/src/main/java/com/yss/cloud/validation/YssValidationConfigurationCustomizer.java` — `sha256:84f43179365d93ebdc992cc4fb3bcb86ff7767af7e5c9975623c9d6418ebc11d`
- `yss-microservice-components/yss-component-validation-jsr303/src/main/java/com/yss/cloud/validation/YssValidationMessageInterpolator.java` — `sha256:8dacc93ea2ab875b98a74c6f4be589325df8f2c973eabd42f65394c0764eda4d`
- `yss-microservice-components/yss-component-validation-jsr303/src/main/java/com/yss/cloud/validation/YssValidationMessageProperties.java` — `sha256:327b598808200f346052a9bfae9a0f009d378c6df61bfab2169c20f8e39c9f1c`

## Freshness and Use

- 新建工程使用默认Boot4配方时读取本索引。已有工程先读POM/effective POM与实际解析依赖，再选择对应平台线。
- 当前源码与索引不同时读取相关差异，并说明影响。实际源码或构件不可读时保留未知事实。
- 仅按当前任务读取入口。索引刷新及受管镜像同步由对应维护授权覆盖。
