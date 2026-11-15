# yss-cache Source Index

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

- `yss-microservice-components/yss-component-cache-parent` — HEAD tree `9e4ce676eef2b41141c945e1b12952e8f8a8d9c1`，当前内容 `sha256:0ff8b24c839f5b27a167a521c4a87af68041f854e8786cdc5c34637b198ca7ad`
- `yss-microservice-components/yss-component-cache-parent/yss-component-cache-starter` — HEAD tree `31385940719c12c20e055bcb833367b1f0272766`，当前内容 `sha256:603ba3d6d5efb51eafc3fce145f45cc6a18427f67b9d068353d2f22165e12063`
- `yss-microservice-components/yss-component-cache-parent/yss-component-caffeine-cache` — HEAD tree `89d3db07f810bee4f1b9073c860dfe58e69000e6`，当前内容 `sha256:e93c93f05fa91b8e055a1f4cd945d8b179c54f2892488a700a64f7dfe1b031a3`
- `yss-microservice-components/yss-component-cache-parent/yss-component-hazelcast-cache` — HEAD tree `5aa58c1a8809e7850f63ad236d9852d6dd04c635`，当前内容 `sha256:1740101d86c3ab25c4df6fe70a80cd67feb5f33c07d81fd85f48ee1d29b5e15c`
- `yss-microservice-components/yss-component-cache-parent/yss-component-jetcache` — HEAD tree `5fe1bcea0e90bdd5e1051b8441617e8b5880416b`，当前内容 `sha256:9b84526ca8a592ad08add2e421bcce4df53956e65dba1e657c0cf624d8db6ce2`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache` — HEAD tree `c7486aa0731dfcd2b9b0b618e4e2d4c3a94b3a95`，当前内容 `sha256:185028dc9e20286b8d481b52b75fa5140636da9932f9aa4c131c5cbcfa7a8331`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache` — HEAD tree `173962ac25d9064626b5f3ca39a2c403aaf6b12d`，当前内容 `sha256:379d7f7ffa62c458bcb12a519fa589b6cb15cdbf18f1cdad6cc15fa3819736d9`

## Inherited POM Identity

- `pom.xml` — `sha256:57cf2619ba118c89d8bf99c9c4fee0784e07842573d2d2dab3aeb1767308fb74`
- `yss-components-bom/pom.xml` — `sha256:bdc7a61153352abf186f9e4da29cc00dc3af0c994ed901d83dd0e3d90c64ed83`
- `yss-microservice-components/pom.xml` — `sha256:10067db08f0f01332e870098610298070991a566b965659849572d7dd9db3bb1`

## Maven Modules

- `yss-microservice-components/yss-component-cache-parent/pom.xml` — GAV `com.yss.cloud:yss-component-cache-parent:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-microservice-components:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-cache-parent/yss-component-cache-starter/pom.xml` — GAV `com.yss.cloud:yss-component-cache-starter:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-component-cache-parent:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-cache-parent/yss-component-caffeine-cache/pom.xml` — GAV `com.yss.cloud:yss-component-caffeine-cache:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-component-cache-parent:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-cache-parent/yss-component-hazelcast-cache/pom.xml` — GAV `com.yss.cloud:yss-component-hazelcast-cache:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-component-cache-parent:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-cache-parent/yss-component-jetcache/pom.xml` — GAV `com.yss.cloud:yss-component-jetcache:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-component-cache-parent:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache/pom.xml` — GAV `com.yss.cloud:yss-component-redis-cache:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-component-cache-parent:4.0.0-SNAPSHOT`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/pom.xml` — GAV `com.yss.cloud:yss-component-spring-cache:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-component-cache-parent:4.0.0-SNAPSHOT`

## Platform Signals

- Java `17`，Spring Boot `4.1.2`，Spring Cloud `2025.1.4`，Spring Cloud Alibaba `2025.1.0.0`。
- 本索引记录当前候选源码入口，具体本地消费与未测范围见平台目录对应candidate配方的verification_scope。远程发布与宿主原生验证分别确认。

## Current API and Configuration

- Spring Cache 使用QueryCache/UpdateCache/ClearCache和cacheComposeResolver，active-type默认redis，默认TTL一小时，空key默认legacy-clear。Redis故障策略为fail-fast/bypass/fallback，fallback仅支持caffeine。
- Spring Cache 的CacheType为 `com.yss.cloud.cache.CacheType`，定义位于DTO模块。JetCache包装器实际参数仍为 `org.springframework.boot.autoconfigure.cache.CacheType`，两参数getCache默认五分钟，重载接收Duration。
- Boot4 Redis绑定 `org.springframework.boot.data.redis.autoconfigure.DataRedisProperties` 与spring.data.redis，旧spring.redis经EnvironmentPostProcessor迁移。
- RedisTemplate使用Jackson3 JsonMapper和JacksonJsonRedisSerializer。RedisCacheManager仍使用JDK value serialization和cacheName::前缀，两条数据路径的迁移分别处理。

## Auto-configuration Metadata

- `yss-microservice-components/yss-component-cache-parent/yss-component-cache-starter/src/main/resources/META-INF/spring.factories` — 仅历史注释，当前无注册项
- `yss-microservice-components/yss-component-cache-parent/yss-component-cache-starter/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.cache.CacheAutoConfiguration`
- `yss-microservice-components/yss-component-cache-parent/yss-component-caffeine-cache/src/main/resources/META-INF/spring.factories` — 仅历史注释，当前无注册项
- `yss-microservice-components/yss-component-cache-parent/yss-component-caffeine-cache/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.cache.caffeine.config.CacheCaffeineManagerConfig`
- `yss-microservice-components/yss-component-cache-parent/yss-component-hazelcast-cache/src/main/resources/META-INF/spring.factories` — 仅历史注释，当前无注册项
- `yss-microservice-components/yss-component-cache-parent/yss-component-hazelcast-cache/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.cache.hazelcast.config.CacheHazelcastManagerConfig`
- `yss-microservice-components/yss-component-cache-parent/yss-component-jetcache/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.cache.jetcache.JetCacheAdapterAutoConfiguration`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache/src/main/resources/META-INF/spring.factories` — `org.springframework.boot.env.EnvironmentPostProcessor=\ | com.yss.cloud.cache.redis.config.RedisLegacyPropertiesEnvironmentPostProcessor`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.cache.redis.config.RedisConnFactoryConfig | com.yss.cloud.cache.redis.config.RedisTemplateConfig | com.yss.cloud.cache.redis.config.RedisMappingConfig`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/resources/META-INF/spring.factories` — 仅历史注释，当前无注册项
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.cloud.cache.config.CacheOperationSourceConfiguration | com.yss.cloud.cache.config.YssCachingAutoConfiguration`

## Key Java Entry Points

- `yss-microservice-components/yss-component-cache-parent/yss-component-cache-starter/src/main/java/com/yss/cloud/cache/CacheAutoConfiguration.java` — `sha256:5d0d79dc6772405eb8cd1a6a8297c5256463f0d0791e48aede04a1dee25a8e92`
- `yss-microservice-components/yss-component-cache-parent/yss-component-caffeine-cache/src/main/java/com/yss/cloud/cache/caffeine/config/CacheCaffeineManagerConfig.java` — `sha256:b7caf8fcc663e2c9f5af7e02f2f4ae55eafbc832231a7206f1d1a1f03e7b81e5`
- `yss-microservice-components/yss-component-cache-parent/yss-component-caffeine-cache/src/main/java/com/yss/cloud/cache/caffeine/config/CacheCaffeineResolver.java` — `sha256:5f52841deb24c7c33d84f328be6a5944a531d823635d2290ab822916d0e7522c`
- `yss-microservice-components/yss-component-cache-parent/yss-component-caffeine-cache/src/main/java/com/yss/cloud/cache/caffeine/config/CaffeineCacheBackendProvider.java` — `sha256:339d539693c34750ad568b7c04c1ffe55ce3bfd85bb0e471f0c5e8e252ebbd7d`
- `yss-microservice-components/yss-component-cache-parent/yss-component-hazelcast-cache/src/main/java/com/yss/cloud/cache/hazelcast/config/CacheHazelcastManagerConfig.java` — `sha256:9fcd9e7098c742b5715c4da3ae17651a961e610dd0213716457513fdfa03c744`
- `yss-microservice-components/yss-component-cache-parent/yss-component-hazelcast-cache/src/main/java/com/yss/cloud/cache/hazelcast/config/HazelcastCacheBackendProvider.java` — `sha256:c75a5bbae463c88ddd4b7c8b61779a6bf05054b28c1e914fe8a199ffca3f7d50`
- `yss-microservice-components/yss-component-cache-parent/yss-component-hazelcast-cache/src/main/java/com/yss/cloud/cache/hazelcast/config/YssCacheHazelcastProperties.java` — `sha256:52568d1eadaafd7a054b5fd765303b5c840b9a4660370ace933267da716424ac`
- `yss-microservice-components/yss-component-cache-parent/yss-component-jetcache/src/main/java/com/yss/cloud/cache/jetcache/CacheManagerCompose.java` — `sha256:4c9fd8a98140246d6d896133abea70139e18656cde6ae64af1ee6ddf21bb3c33`
- `yss-microservice-components/yss-component-cache-parent/yss-component-jetcache/src/main/java/com/yss/cloud/cache/jetcache/JetCacheAdapterAutoConfiguration.java` — `sha256:9976fd95a646cb7a696a778ce95d2f638d458e08af81fd1024d24b60d57e428a`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache/src/main/java/com/yss/cloud/cache/redis/config/RedisCacheBackendProvider.java` — `sha256:0c42c7e0ee457e03a16c14704ba7ca50bced37e7b82b7e0f22ff922f93c42beb`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache/src/main/java/com/yss/cloud/cache/redis/config/RedisConnFactoryConfig.java` — `sha256:03cfdbc8154d34d3b7bdf328cb1c159dc69677f9e744c0f70cfc4f9853e3a0fe`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache/src/main/java/com/yss/cloud/cache/redis/config/RedisLegacyPropertiesEnvironmentPostProcessor.java` — `sha256:db87505b069217633fa443890241063d9914e4f46b5dc2a0323f725a3b166120`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache/src/main/java/com/yss/cloud/cache/redis/config/RedisTemplateConfig.java` — `sha256:d8351db69ac8bd26d76aa48edba641bb008a2b8566fadb112042d8fb6b5cef61`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache/src/main/java/com/yss/cloud/cache/redis/config/SafeRedisCache.java` — `sha256:9c0440cb9be42d3485b7db13fc73c6f3bd9c30747992adf79eef00c0f8a37859`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache/src/main/java/com/yss/cloud/cache/redis/config/YssCacheRedisResolver.java` — `sha256:6fffd157fea909ee898908e7385c3fa99ccb22496a4fb2d4c57f04e1df0b93fe`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache/src/main/java/com/yss/cloud/cache/repository/BaseRedisRepository.java` — `sha256:c79736715e3881a3c8fcb57f44b9024813954c8bc4d9185d9ddbe78f1d6eb749`
- `yss-microservice-components/yss-component-cache-parent/yss-component-redis-cache/src/main/java/com/yss/cloud/cache/repository/YssDatamiddle.java` — `sha256:e6f29975ea8b282c8ff51318855a86161cc213210669a735ec68c53268493dc1`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/ApplicationContextCacheHelper.java` — `sha256:fe5a61cc853fc88a98de5c232b6fd4f2f6da65acd8e4c2774e950aa04f01c088`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/CacheComposeResolver.java` — `sha256:e0c4bc33f0b722eb1ef0fa2dfc29593a6437426615ae70117504a071841ae2d6`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/CacheManagerCompose.java` — `sha256:9c9b672c9a1332c4e5e2a326b815afdde0f5b4e3510cdacd3310539878771585`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/CacheMemResolver.java` — `sha256:dd2bd24aefd88069959249bd35f3e35985fc6dd568ec79d603768190e818053c`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/CacheRedisResolver.java` — `sha256:f6dc85477873cf60ad81320ad2b888ddc67c926ef97f571d1c39c580bb3cfb3f`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/EnableYssCloudCache.java` — `sha256:bc0b30d76b9e2b6fda9719dfe06af317fa7de80de02a9f6afadcf2481dd01b05`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/EnableYssCloudRedisCache.java` — `sha256:1600cf165ab949be30436e50569ac1d0e9e15618fa4319840f1b93e60ab5b217`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/YssCacheBackendProvider.java` — `sha256:3276420a1a2d97083fb763a1ef3df5cc96c4fc0c8e169785fec745a859985fff`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/YssCacheInterceptor.java` — `sha256:6e130c33b1076107f0dde3b56bc42d4c85a73b8f4652904ee84075b22e0b8dff`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/YssCacheProperties.java` — `sha256:653537a777ed9b4252cf6ec73b347db1ed03a0037634dadc9a65c9b7ba91ca41`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/annotation/ClearCache.java` — `sha256:61dd140b8a2126e2619f19484908757409766a0647bd2fdd7c0d96a1600452cf`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/annotation/QueryCache.java` — `sha256:7368d795819edc21ecf38a9c1604e5642cdb4d841251e85634d6a877e5b13529`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/annotation/UpdateCache.java` — `sha256:2efe5f0d1134cba3bc0076770f3fb4b2cf78433bc2c53d21c256bb3dd7aa2a92`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/annotation/YssCacheAnnotationParser.java` — `sha256:9838e82ae26fa8b52c74e95946c4f837379b010efb06f6ce75d5187b9bb546d2`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/config/CacheOperationSourceConfiguration.java` — `sha256:fed39b481e7e574c4714de75399eb435faff96163b6656e7393294da5256aeea`
- `yss-microservice-components/yss-component-cache-parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/config/YssCachingAutoConfiguration.java` — `sha256:febce68e13907460d8f683a199fc7c8db8aec88691260586e945bc4db3e49771`

## Freshness and Use

- 新建工程使用默认Boot4配方时读取本索引。已有工程先读POM/effective POM与实际解析依赖，再选择对应平台线。
- 当前源码与索引不同时读取相关差异，并说明影响。实际源码或构件不可读时保留未知事实。
- 仅按当前任务读取入口。索引刷新及受管镜像同步由对应维护授权覆盖。
