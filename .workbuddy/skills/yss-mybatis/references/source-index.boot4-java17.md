# yss-mybatis Source Index

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

- `yss-microservice-components/yss-component-persistence` — HEAD tree `b2caee99d5e98d93aab27570b0c44309085e20a0`，当前内容 `sha256:f61b50b5913eacfd134439c13375143c8282259ab21cfe4d3d76541d26730a1b`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-mapper` — HEAD tree `d9159f616ac3a227130c39cc1ee4d58a13eb510b`，当前内容 `sha256:af0cfe05e2afbacc8a89b5ce2ef4aa878d22fb10830a82b0258f299a2777f02f`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-plus-starter` — HEAD tree `456ce090288a1558a3e73898731c8ca0c71fc5ec`，当前内容 `sha256:88b268f75f8a07df996173bcf22789d9b9359f70fdc3584a6cbac7e138a52af1`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-starter` — HEAD tree `f474e78e6bcf8bd9497c989d85d2567712f40198`，当前内容 `sha256:407a7a04fa907325cb82533cbaa7cb5651157e80762249d9f8b4bfee26d0dd94`
- `yss-microservice-components/yss-component-persistence/yss-component-persistence-common` — HEAD tree `c31be334f4a2156caf9e0feee086280dfeac6c35`，当前内容 `sha256:cefabebfb74aeff761c64b32ef73ad2c2d1a5a7e0a617ccd83ad87fff072aea8`

## Inherited POM Identity

- `pom.xml` — `sha256:57cf2619ba118c89d8bf99c9c4fee0784e07842573d2d2dab3aeb1767308fb74`
- `yss-components-bom/pom.xml` — `sha256:bdc7a61153352abf186f9e4da29cc00dc3af0c994ed901d83dd0e3d90c64ed83`
- `yss-microservice-components/pom.xml` — `sha256:10067db08f0f01332e870098610298070991a566b965659849572d7dd9db3bb1`

## Maven Modules

- `yss-microservice-components/yss-component-persistence/pom.xml` — GAV `com.yss.cloud:yss-component-persistence:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-microservice-components:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-mapper/pom.xml` — GAV `com.yss.cloud:yss-component-mybatis-mapper:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-component-persistence:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-plus-starter/pom.xml` — GAV `com.yss.cloud:yss-component-mybatis-plus-starter:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-component-persistence:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-starter/pom.xml` — GAV `com.yss.cloud:yss-component-mybatis-starter:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-component-persistence:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-persistence/yss-component-persistence-common/pom.xml` — GAV `com.yss.cloud:yss-component-persistence-common:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-component-persistence:4.0.0-SNAPSHOT`

## Platform Signals

- Java `17`，Spring Boot `4.1.2`，Spring Cloud `2025.1.4`，Spring Cloud Alibaba `2025.1.0.0`。
- 本索引记录当前候选源码入口，具体本地消费与未测范围见平台目录对应candidate配方的verification_scope。远程发布与宿主原生验证分别确认。

## Current API and Configuration

- MybatisPlusConfiguration使用Boot4的org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration，按DataSource和MP类条件导入配置。
- MP使用mybatis-plus-spring-boot4-starter，BasePlusRepository继承BaseMapper并通过BatchInsertSettings分片批量插入。普通MyBatis的BaseRepository保留其Mapper/BaseMapper/ListMapper泛型合同。
- MultiDataSourceProperties使用Boot4 JDBC包下的DataSourceProperties/DataSourceBuilder/DatabaseDriver/EmbeddedDatabaseConnection，主Java未直接导入Jackson。
- MultiDataSourceConfiguration的绑定advisor仅处理命名数据源Inner目标，所有配置来源均确认无后代时跳过标准标量；存在后代或来源UNKNOWN时继续原Binder。空spring.datasource.password不会建立额外命名池，password.url仍可定义同名数据源，非法driver继续失败。

## Auto-configuration Metadata

- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-mapper/src/main/resources/META-INF/spring.factories` — 仅历史注释，当前无注册项
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-mapper/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `io.mybatis.config.spring.SpringEnvAutoConfiguration`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-plus-starter/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.mybatis.MybatisPlusConfiguration`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-starter/src/main/resources/META-INF/spring.factories` — 仅历史注释，当前无注册项
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-starter/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.mybatis.MybatisBaseConfiguration | com.yss.cloud.mybatis.MybatisPlusConfiguration`
- `yss-microservice-components/yss-component-persistence/yss-component-persistence-common/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.mybatis.MultiDataSourceConfiguration`

## Key Java Entry Points

- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-plus-starter/src/main/java/com/yss/cloud/mybatis/MybatisPlusConfiguration.java` — `sha256:4c2471e195fdafda4082bec706cd84e0a6fd1669ee1439db8393cba76398beff`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-plus-starter/src/main/java/com/yss/cloud/mybatis/YssMybatisMapperProperties.java` — `sha256:2fda7b769434bd6942f680cdc7ffa71030c0d6a0e448d762e0f19b2d0b33cd85`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-plus-starter/src/main/java/com/yss/cloud/mybatis/config/BatchInsertSettings.java` — `sha256:b1ae05aed5f90a97c36ad29d240b05f9f7c5ee5796f2bc293917e09f7d1c8bd2`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-plus-starter/src/main/java/com/yss/cloud/mybatis/config/BatchSqlInjector.java` — `sha256:463dfc881c0c33e27ed2a9157041e8b06d2b2e8bbab0dae1a106f467c31fb4ef`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-plus-starter/src/main/java/com/yss/cloud/mybatis/config/DialectInsertBatchSomeColumn.java` — `sha256:c5622bb0583e558d58203922c7d140177491519d7a83c5af340f80ca5ee7ce8b`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-plus-starter/src/main/java/com/yss/cloud/mybatis/config/MapperConfiguration.java` — `sha256:185e3f65ca91d0735200583e9d80ce9a7f1ec240f0ea9c20b5fa6f706b9166b4`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-plus-starter/src/main/java/com/yss/cloud/mybatis/support/BasePlusRepository.java` — `sha256:3c37b73a2a2dcaa1ad47fee42f8fb4f9b9ecf51b095f8d1fef816cf785fcbb05`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-starter/src/main/java/com/yss/cloud/mybatis/aop/EntityQueryAspect.java` — `sha256:cd8e530a9346440b9935339b15a11296bb7f23ff432b63ee49ce21a7f300d789`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-starter/src/main/java/com/yss/cloud/mybatis/config/PageQueryEntityConfigration.java` — `sha256:c2659f417c10db7fd9e1a91f825d3b6396ae949f7858dbd3b3d9f8917ae42031`
- `yss-microservice-components/yss-component-persistence/yss-component-mybatis-starter/src/main/java/com/yss/cloud/mybatis/support/BaseRepository.java` — `sha256:0deee9120062b8bd1b4ee5bb41fae0ea858bbd20fd2ed5f7b25d048be0c40fb8`
- `yss-microservice-components/yss-component-persistence/yss-component-persistence-common/src/main/java/com/yss/cloud/mybatis/MultiDataSourceConfiguration.java` — `sha256:c4b30b1e56f62470a7480532206ea81c6e22b4f6ab1c6a275c4d50d20423255e`
- `yss-microservice-components/yss-component-persistence/yss-component-persistence-common/src/main/java/com/yss/cloud/mybatis/MultiDataSourceHolder.java` — `sha256:5378a994213dcc611fac5f9f6ded5db24790360c48088c06c7dbea21984aef51`
- `yss-microservice-components/yss-component-persistence/yss-component-persistence-common/src/main/java/com/yss/cloud/mybatis/MultiDataSourceProperties.java` — `sha256:9a7938c49c6872a6b90394d2ed17f459f71044d780ebf1fc2eb58bde91d3caca`

## Freshness and Use

- 新建工程使用默认Boot4配方时读取本索引。已有工程先读POM/effective POM与实际解析依赖，再选择对应平台线。
- 当前源码与索引不同时读取相关差异，并说明影响。实际源码或构件不可读时保留未知事实。
- 仅按当前任务读取入口。索引刷新及受管镜像同步由对应维护授权覆盖。
