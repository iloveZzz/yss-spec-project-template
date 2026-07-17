# 验证与完成标准

## 组件

```bash
./mvnw -f yss-microservice-components/yss-component-cache-parent/pom.xml verify
```

跨模块测试使用父 reactor 的 `-pl <module> -am`，避免解析本地旧 SNAPSHOT。也可运行：

```bash
scripts/verify-cache-component.sh --source-root /path/to/yss-cloud-microservice
```

## 消费项目

```bash
./mvnw -pl <starter-module> -am -DskipTests package
```

完整启动依赖数据库、注册中心等外部服务时，构建验证与启动验证分开报告。

## 验收矩阵

- 首次调用执行业务，第二次相同 key 命中缓存。
- 不同租户/业务 key 不串值。
- 更新、删除、状态变更后旧值失效。
- `condition`、`unless` 和异常返回行为符合预期。
- 默认 TTL 和枚举覆盖 TTL 在后端物理存在。
- Redis 停止后行为符合 fallback 配置；恢复后旧 Redis 值不会重新出现。
- Sentinel/Cluster 创建正确连接工厂，Cluster 使用 DB 0。
- Docker 可用时真实 Redis 认证、JSON template、JDK cache serialization 和 TTL 测试实际执行。
- Java 8 组件 class major version 为 52。
- `git diff --check` 通过，消费 starter 构建通过。
