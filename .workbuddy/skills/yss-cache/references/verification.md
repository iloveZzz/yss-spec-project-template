# 验证与完成标准

## 组件

```bash
./mvnw -f yss-microservice-components/yss-component-cache-parent/pom.xml clean verify
```

跨模块测试使用父 reactor 的 `-pl <module> -am`，避免解析本地旧 SNAPSHOT。也可运行：

```bash
scripts/verify-cache-component.sh --platform-line boot3-java17 --source-root /path/to/boot3/yss-cloud-microservice
```

运行前将 `JAVA_HOME` 与 `PATH` 设为所选平台的 JDK（Boot 2 为 Java 8，Boot 3 为 Java 17）；脚本从 `clean verify` 后的每个 cache class 检查 major，无法读取任一 class 即失败。

## 消费项目

```bash
./mvnw -pl <starter-module> -am -DskipTests package
```

完整启动依赖数据库、注册中心等外部服务时，构建验证与启动验证分开报告。

## 验收矩阵

通用命中、隔离和失效项适用于所选平台线；下述 `failure-mode`、区域策略、`empty-key-eviction` 与 JetCache 场景核验的是当前 Boot 3 / Java 17 组件。Boot 2 的对应行为按其源码和实际配置另行验证。

- 首次调用执行业务，第二次相同 key 命中缓存。
- 不同租户/业务 key 不串值。
- 更新、删除、状态变更后旧值失效。
- `condition`、`unless` 和异常返回行为符合预期。
- 默认 TTL 和枚举覆盖 TTL 在后端物理存在。
- Redis 故障时 fail-fast、bypass、fallback 的查询与显式写行为分别符合配置；恢复时脏 Redis 区域必须失效，失效失败不得切回。
- 区域 TTL/容量/空值策略按实际后端生效；`SimpleKey.EMPTY` 在 legacy-clear 与 evict 下分别执行清区与单 key 删除。
- JetCache 分别验证包装器与原生 `QuickConfig`：包装器即使配置广播频道也不自动同步本地失效；原生 `BOTH + syncLocal(true)` 在频道、相同 area/name 和订阅生效后，用两个独立 JVM 验证更新、删除与未订阅时的旧值边界；第二次创建不改变首次缓存配置。
- Sentinel/Cluster 创建正确连接工厂，Cluster 使用 DB 0。
- Docker 可用时真实 Redis 认证、JSON template、JDK cache serialization 和 TTL 测试实际执行。
- 所选 Boot 2 / Java 8 源码 class major 为 52；Boot 3 / Java 17 为 61。两条平台线分别使用匹配的源码根运行脚本，Docker 不可用时单独报告真实 Redis 集成测试未执行。
- `git diff --check` 通过，消费 starter 构建通过。
