# yss-dto Source Index

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

- `yss-microservice-components/yss-component-dto` — HEAD tree `0bb01975f990296eb7613080c20e14219efb9b5e`，当前内容 `sha256:e6afe29a1353ae5ec050560cb904a249fd36a9c6dcc3e5475412eead469a018d`

## Inherited POM Identity

- `pom.xml` — `sha256:57cf2619ba118c89d8bf99c9c4fee0784e07842573d2d2dab3aeb1767308fb74`
- `yss-components-bom/pom.xml` — `sha256:bdc7a61153352abf186f9e4da29cc00dc3af0c994ed901d83dd0e3d90c64ed83`
- `yss-microservice-components/pom.xml` — `sha256:10067db08f0f01332e870098610298070991a566b965659849572d7dd9db3bb1`

## Maven Modules

- `yss-microservice-components/yss-component-dto/pom.xml` — GAV `com.yss.cloud:yss-component-dto:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-microservice-components:4.0.0-SNAPSHOT`

## Platform Signals

- Java `17`，Spring Boot `4.1.2`，Spring Cloud `2025.1.4`，Spring Cloud Alibaba `2025.1.0.0`。
- 本索引记录当前候选源码入口，具体本地消费与未测范围见平台目录对应candidate配方的verification_scope。远程发布与宿主原生验证分别确认。

## Current API and Configuration

- CommandDTO实现Serializable，QueryDTO继承它。canonical返回包为com.yss.cloud.dto.result，SingleResult/MultiResult/PageResult要求T extends Serializable。
- PageQuery默认pageSize=10、pageIndex=1、orderDirection=DESC，保留内部计数与计算offset。公开输入继续按wire profile白名单处理。
- Jackson注解来自com.fasterxml.jackson.annotation，databind来自tools.jackson.core的Jackson3。具体HTTP字段由目标mapper与接口观察支持。

## Auto-configuration Metadata

- 当前模块未发现spring.factories或AutoConfiguration.imports，显式注解/调用入口见上文。

## Key Java Entry Points

- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/SystemIdEnum.java` — `sha256:9020b1c1f5b50c391c6d9c59986bb991725b729a0e35ee5fa110238450671f29`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/cache/CacheKey.java` — `sha256:226063adae6cba030c0193331c8b706ef31402adcbbec20cd6bc18b2ecc6d111`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/cache/CacheKeyCode.java` — `sha256:234f7c2ba2e96a28ef66fea958dd319aef12e25b93dda48fd5c959b49bcc2e0e`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/cache/CacheType.java` — `sha256:f5a565ec95348c16ba74665953c3ac2a03c7b82bbf93e93e4bbffaefb67dca8b`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/CommandDTO.java` — `sha256:7a60b0034f15a3879ff6348d66648deb6d3383dcb3ff72d4273f88e2279227a5`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/QueryDTO.java` — `sha256:5b16982feb8696dca989bb5fd877229042cfdff588a73acab31f0f1ad0157b2c`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/audit/message/AuditMessage.java` — `sha256:ba76a4bdd2975f1d9d7f4071a6fe917c4db466b5ceba95b7e995e4ca14f06341`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/audit/message/AuditOperationType.java` — `sha256:09fc77b1fc627abefe66c6bbdc68bf3ae1255f3d8e2c56c263741928625eba4e`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/audit/message/AuditResourceType.java` — `sha256:38e0ef2b7ab5ab731f387c71b0938785cffe8dd1a96cfc17af935f171e1c0296`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/audit/message/EventMessage.java` — `sha256:833b63b800c903dd8a69b41367b05490e7410017cd1658257f0e050a5d5b6104`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/page/PageQuery.java` — `sha256:cd10750339a7b9ff055f2ac004889113bd592b6da3b12dd8bc76828667cf128f`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/page/PageRequestFactory.java` — `sha256:fb3428ed689a30ec01f94ecf440623c508cfd5fbae390ed2b41831afaba3c419`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/response/MultiResult.java` — `sha256:8399312fcf4f7ac8f4f0b787355942d75e3213b3f600ae100e29887412a199f3`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/response/PageResult.java` — `sha256:8b2edfdd3f3318c15787cc55b00eb9b0cb2366d54ad232fe4c088ae573893dce`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/response/Result.java` — `sha256:4f9b350b50968afb0e215642805fd3adb19f8bdc3fb9c2e68da5eeb719c1a9f7`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/response/SingleResult.java` — `sha256:89fa522d8a5638b09c05abd3a33558038c82a480a11d1bd41f2696f52b4e3ef5`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/result/MultiResult.java` — `sha256:3ec2ee0189b19a5b2af8a37926b677a14e5c81dcb3dcab1fbcf12135fce52146`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/result/PageResult.java` — `sha256:90a568d6ccd1082285c3a94c67fee8221d13f2bdf64178930f00fb99ee0899a9`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/result/Result.java` — `sha256:7c2a905a8bb06e254ecfff1eea55be280160c6e3088b05fea17a7c8fb76b6d93`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/result/SingleResult.java` — `sha256:6bb23e9d74050e208b266b35b268bb626e8d7cbe67ace5d3fdd71a7fec62b992`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/support/DicMapUtil.java` — `sha256:812e5dbe270912a29fcfc6d4e99ef2df94947be189008b39cea6e2d25d1bd22d`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/upload/FileInfo.java` — `sha256:ccb84cff8b8650567a229c70748864f14d099488b1a0914500adbf4e56c51fc4`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/user/UserInfo.java` — `sha256:df30966767fa3f0d58a0f54d814ca663f9182ec85dce1ed0898307e586560d2f`
- `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/sankuai/GenerationTypeSeq.java` — `sha256:f770c9a4e0f49c82b762e820a571518522e726cf37a33d86cb728ac4b96b4aa5`

## Freshness and Use

- 新建工程使用默认Boot4配方时读取本索引。已有工程先读POM/effective POM与实际解析依赖，再选择对应平台线。
- 当前源码与索引不同时读取相关差异，并说明影响。实际源码或构件不可读时保留未知事实。
- 仅按当前任务读取入口。索引刷新及受管镜像同步由对应维护授权覆盖。
