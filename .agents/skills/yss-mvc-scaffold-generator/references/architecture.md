# 固定架构

| 模块 | 职责 |
|---|---|
| `client` | HTTP DTO 与稳定调用契约 |
| `core` | 查询用例和 `AnalysisQueryExecutor` seam |
| `repository` | 查询定义、元数据和后续持久化扩展 |
| `adapter` | Oracle 与 Mock 执行器实现 |
| `feign-client` | 面向其他服务的客户端契约扩展点 |
| `server` | Spring Boot 装配和 REST Controller |

依赖方向：

```text
server -> core + adapter + client
core -> client
repository -> client
adapter -> core + client
feign-client -> client
```

`core` 不依赖 Spring MVC、Oracle 驱动或具体数据源。Mock 和 Oracle 不能形成两套 HTTP 接口；二者只在 `AnalysisQueryExecutor` 的实现与 Profile 上不同。

## 项目边界

`target-dir` 同时是 `project-instance`、独立 Git 根和 Maven 聚合项目根。六个模块直接位于项目根；模板工具仓库只提供生成器；每个生成项目自行持有生命周期事实源、共享 skills、业务上下文、草案目录及 `external-repository` 实现仓库登记。Git 初始化只建立 `main` 分支，不创建 commit、remote 或跨项目父仓关系。

工程基线固定为 Java 8、项目版本 `2.0.0-SNAPSHOT`、`com.yss.cloud:yss-cloud-microservice:2.0.0-SNAPSHOT` 父 POM 和同版本 `yss-components-bom`。标准预设包含审计、分布式 ID、Excel、Nacos、Redis Cache、OpenFeign、Smart-doc、Userinfo、Actuator 与 Mock；持久层使用 YSS MyBatis-Plus，数据库在 Oracle 与 OceanBase Oracle 中选择且驱动互斥。Smart-doc 只是人工按需生成 Controller 辅助文档的工具，不绑定 Maven 生命周期，不进入默认 AI Coding 验证链路，也不替代冻结的 OpenAPI 3.1 YAML。
