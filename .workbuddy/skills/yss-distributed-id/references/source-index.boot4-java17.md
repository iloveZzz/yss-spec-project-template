# yss-distributed-id Source Index

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

- `yss-microservice-components/yss-component-distributed-id` — HEAD tree `625f45a3c85a6c53ca5cc3713d26b1df13085faf`，当前内容 `sha256:67603a5eaef1731c40a150ce06775196cad762e5b3eba2ddcd2496e6b5b9d2f1`
- `yss-microservice-components/yss-component-leaf` — HEAD tree `b1fc4e342bf38cb24348b7402fd4804b30385482`，当前内容 `sha256:945f43dbd6fa70a5e022447a82a5fed2211a08a6845a644a4ec0ccb19a10cf3c`
- `yss-microservice-components/yss-component-leaf/yss-cloud-leaf-rest` — HEAD tree `95cc01ce2c8e791a541f1080dbc237de37abd24f`，当前内容 `sha256:2c76a5a427eb77c0639a467c388303b7ddfdbb6ba0e0fa498df19d26d062b203`

## Inherited POM Identity

- `pom.xml` — `sha256:57cf2619ba118c89d8bf99c9c4fee0784e07842573d2d2dab3aeb1767308fb74`
- `yss-components-bom/pom.xml` — `sha256:bdc7a61153352abf186f9e4da29cc00dc3af0c994ed901d83dd0e3d90c64ed83`
- `yss-microservice-components/pom.xml` — `sha256:10067db08f0f01332e870098610298070991a566b965659849572d7dd9db3bb1`

## Maven Modules

- `yss-microservice-components/yss-component-distributed-id/pom.xml` — GAV `com.yss.cloud:yss-component-distributed-id:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-microservice-components:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-leaf/pom.xml` — GAV `com.yss.cloud:yss-component-leaf:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-microservice-components:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-leaf/yss-cloud-leaf-rest/pom.xml` — GAV `com.yss.cloud:yss-cloud-leaf-rest:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-component-leaf:4.0.0-SNAPSHOT`

## Platform Signals

- Java `17`，Spring Boot `4.1.2`，Spring Cloud `2025.1.4`，Spring Cloud Alibaba `2025.1.0.0`。
- 本索引记录当前候选源码入口，具体本地消费与未测范围见平台目录对应candidate配方的verification_scope。远程发布与宿主原生验证分别确认。

## Current API and Configuration

- 当前数值发号入口为DistributedIdGenerator.nextId(String)/strategy，策略为SEGMENT或SNOWFLAKE。默认LOCAL注入、Segment=true、Snowflake=false，LOCAL只能启用一种算法。
- LeafDataSourceConfiguration优先primaryDataSource，其次可用DataSource，缺失时失败。消费者IdentifierGenerator可替换默认MP实现。
- `@EnableDistributedId` 保留显式导入入口，autoRegister默认false。Snowflake使用Boot4的org.springframework.boot.web.server.context类型。
- 当前没有yss-cloud-leaf-feign模块。leaf聚合与leaf-rest仍可定位，主接入使用本地distributed-id模块，远程Feign注入被拒绝。javax.sql.DataSource属于JDBC API。

## Auto-configuration Metadata

- `yss-microservice-components/yss-component-distributed-id/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.sankuai.config.LeafDataSourceConfiguration`
- `yss-microservice-components/yss-component-leaf/yss-cloud-leaf-rest/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.leaf.conf.YssLeafRestConfiguration`

## Key Java Entry Points

- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/EnableDistributedId.java` — `sha256:68ae8f0db23a84a4a8314b1ec66b974212c30e4522453e55739f269b3c8a977e`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/EnableDistributedImportSelector.java` — `sha256:5a4af9da1614ac82540a03cf0eae6ff361738d1b10a1b4336fdeef5ee545c6a3`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/id/DistributedIdGenerator.java` — `sha256:b97eeda048b770147ade37499920cedc1c4f45844aba90e340d8809d855c1a65`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/ApplicationContextHelper.java` — `sha256:6f11dbad0f445687c8cb53b05573b2495678713003eb6bc8bf84902aad4e88a0`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/SegmentContextHelper.java` — `sha256:bc88eedcec63a593b770b9acfd7e8e27d230e91ccfd46b1a21f7772111f118f4`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/SegmentService.java` — `sha256:0308692d1558e48b35b712412a1b4f1eff335aa08f2328530c41847f8f8e43e8`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/SnowflakeContextHelper.java` — `sha256:cdb301faa39ca777a25b812e7b6100fae78f8914950620202e299f3b720c10dd`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/SnowflakeService.java` — `sha256:31650d3363aeb1f98f2506112c48c30d0daa618729dfb36354fa56d79c64f542`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/config/DistributedIdInjectionModeGuard.java` — `sha256:249f83415ccf91cffbb5bbb8ed5ca424974c2a8e9bad4e3129f1ab143b693bfa`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/config/DistributedIdProperties.java` — `sha256:f7d8bb01144a4c7a54869375f8551ef739cbf9c3318421cfc14895e827cf1cc9`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/config/LeafConf.java` — `sha256:c0545ff1a9051fd8b7754844b2d8bd2ecb4e6be4e407fb8efa7b71dcd38ebd65`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/config/LeafDataSourceConfiguration.java` — `sha256:d85258d111ebd67c4ff7c5b8cea24597e879cb4bacc0a2d8acdb78e89d67b134`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/config/LeafDatabaseType.java` — `sha256:d2abc8043adeebd78cdb903e0d5f92f590535b678d66c49c0d67e753f5597a3a`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/config/LeafSegmentProperties.java` — `sha256:6258a6c245b16435a074bac58b611afc8b72ed5a28a06f8721ab0eca68478c56`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/config/MissingTagPolicy.java` — `sha256:3a11f9d495782ee7635a0fc11072e623da0423969c554485b917dbacd1465740`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/config/SnowflakeProperties.java` — `sha256:2950793334c15bbce18df2b8adc56c68b831f482acce8abe6f492e84639a6fca`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/exception/LeafIdErrorCode.java` — `sha256:8a53ef6f433c1795edb04dbb461ebb3e4a5b095cfdec35575fa66ed32da4db61`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/exception/LeafIdException.java` — `sha256:8972158d5c1837de9846b23d0682c4665dd7ccc6ba0ecfd600435a67defaf4c3`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/exception/LeafServerException.java` — `sha256:da32dc4ddff2a62bed44e97e2786c673315914006e992468f550986d855c4176`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/health/LeafSegmentHealth.java` — `sha256:d193ab669c34310eb9c9effbfcf2bb0de338d61b23b8378834767e2d230594a1`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/inf/leaf/common/PropertyFactory.java` — `sha256:e7753cfb9348e0aa5e0fefa35a35f8da79a7e1a91186ad730ce327ea2570f8e2`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/inf/leaf/common/Result.java` — `sha256:cdeac0dc2aa0eeceaead71a1c9e24bb3c4ff8bf561f4631b6341e9527fb50f89`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/inf/leaf/common/Status.java` — `sha256:d9d404e6d1365107319088f0ec9134e17007ef520b9eebd3187e3fba38255530`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/inf/leaf/segment/dao/IDAllocMapper.java` — `sha256:9e70ab20d7426f8b034e1a732a91ad407aae6fc6e569b31e2ccd152dbb6f0f22`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/inf/leaf/segment/model/LeafAlloc.java` — `sha256:4bcd56bece377f15742f2992ac885f11dd17507255ebbd9c71d86bbe84d36e5b`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/inf/leaf/snowflake/SnowflakeNodeIdentity.java` — `sha256:d616299dc0417773a2e0066586fc8cfd09f163f9d6cd3db32be59314bd8d1595`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/inf/leaf/snowflake/SnowflakeNodeIdentityResolver.java` — `sha256:d4526129ec46ff98cb5f65e9739d14ed74a4286767e03f9a9f103f4e82848361`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/metrics/LeafSegmentMetrics.java` — `sha256:384a14d41d36993e905355ece4c18ccf6ed95ae82b553b5f4abe3f3484dd1d96`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/mybatis/AutoIdInterceptor.java` — `sha256:b31986069bfd3cc1db735cb51a612c19ff8e9a7fabb5d10ea99a9796fcbc8466`
- `yss-microservice-components/yss-component-distributed-id/src/main/java/com/yss/cloud/sankuai/mybatis/DistributedIdIdentifierGenerator.java` — `sha256:008e63ed5de67e39a7a52cf24a8f6ed45631b9213e15b31667cad92795e64084`
- `yss-microservice-components/yss-component-leaf/yss-cloud-leaf-rest/src/main/java/com/yss/cloud/leaf/conf/YssLeafRestConfiguration.java` — `sha256:963bca50c347ede15b7d6a499f463804834ec03733c3aa0a5f880c2587823888`
- `yss-microservice-components/yss-component-leaf/yss-cloud-leaf-rest/src/main/java/com/yss/cloud/leaf/controller/IdGenController.java` — `sha256:9402efdba8c3e1bc7eef0a2f476abf82538f6e1fbe6106d2790238625f29f86b`
- `yss-microservice-components/yss-component-leaf/yss-cloud-leaf-rest/src/main/java/com/yss/cloud/leaf/controller/LeafIdRestResponseFactory.java` — `sha256:582e20e26730a28289c8013a127b9233ab1a1b7832b7aeaab9dae5eb3a974595`
- `yss-microservice-components/yss-component-leaf/yss-cloud-leaf-rest/src/main/java/com/yss/cloud/leaf/health/LeafSegmentHealthIndicator.java` — `sha256:40c2d8b3536ea7b1cfab33a05b34526652397a13607ef042ac4c691f434e84ec`
- `yss-microservice-components/yss-component-leaf/yss-cloud-leaf-rest/src/main/java/com/yss/cloud/leaf/health/LeafSnowflakeHealthIndicator.java` — `sha256:bdcaebf6056a13e9a9c682ec7acd286fa9b46e1a3c14f6b736ce5c6eb6b0b593`

## Freshness and Use

- 新建工程使用默认Boot4配方时读取本索引。已有工程先读POM/effective POM与实际解析依赖，再选择对应平台线。
- 当前源码与索引不同时读取相关差异，并说明影响。实际源码或构件不可读时保留未知事实。
- 仅按当前任务读取入口。索引刷新及受管镜像同步由对应维护授权覆盖。
