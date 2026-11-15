# YSS DDD 分层职责

新建 DDD 空工程使用现装 CLI 支持的 `scaffold ddd`。本文说明后续实现的职责与依赖，已有工程维护先读取其实际架构并增量编辑。

### Domain

- 聚合根、Entity、Value Object、领域行为、不变量、Domain Event。
- 聚合持久化使用 Domain Gateway/Port，只交换 Domain Model、领域值和领域标识。
- 不依赖 Application、Infrastructure、Repository、Web、YSS DTO/Exception、Jackson、Swagger 或 Validation。
- Domain error 使用稳定领域错误标识和参数，不决定 HTTP status 或公开消息。

推荐包：

```text
{base_package}.domain.{segment}
├── model
├── gateway
├── service
└── event
```

### Application

- 定义并编排 Use Case、事务边界、Application Command/Query/Result。
- 写用例调用 Domain Model/Domain Gateway。
- 分页、列表和读模型通过 Application Query Port，不把 `PageQuery`、`PageResult` 或 Web VO 放入 Domain。
- 不依赖 Infrastructure 或 Web。

推荐包：

```text
{base_package}.application
├── command
├── query
├── result
├── port
└── service
```

### Infrastructure

- 实现 Domain Gateway 和 Application Query Port。
- MyBatis-Plus Repository、PO、SQL、数据源配置和 `PO <-> Domain Model` MapStruct 转换位于本层。
- 持久化技术沿用工程基线与当前需求，具体映射和 SQL 按实际依赖实现。
- 事务边界由 Application 持有，不在 GatewayImpl 重复制造边界。

### Adapter/Web

- HTTP Request/Response、校验、Controller、WebConvertor 和异常到 HTTP/YSS Result 的映射。
- Request 字段来自当前 API 需求和适用 OpenAPI，保留业务输入与权限边界。
- WebConvertor 使用 `@Mapper(componentModel = "spring")` 和构造器注入。
- HTTP DTO 位于 Web。需要独立客户端制品时按当前需求另行设计公开契约与依赖。
- Web 不直接依赖 Infrastructure，不把 Domain Model 作为 Controller seam。

### Bootstrap

- 组合 Web 和 Infrastructure，提供机械 Spring Boot 入口与环境配置。
- 默认配置使用 INFO。DEBUG 和 MyBatis stdout SQL 仅存在于 `application-local.yml`。

## 2. 依赖方向

```text
Web -> Application -> Domain
Infrastructure -> Application + Domain
Bootstrap -> Web + Infrastructure
```

禁止：

- Domain → Application/Infrastructure/Web
- Application → Infrastructure/Web
- Web → Infrastructure
- Domain Gateway 接收 HTTP DTO、返回 Web VO/PageResult
- Repository 把 PO 直接返回给 Application/Web

实现或审查时核对上述依赖方向。当前 CLI 生成空骨架，架构测试按实际需求另行添加。

## 3. 调用链

写模型：

```text
HTTP Request -> WebConvertor -> Application Command -> Use Case
  -> Domain Model/Domain Gateway -> GatewayImpl -> Repository/MyBatis -> PO
```

读模型：

```text
HTTP Page Request -> WebConvertor -> Application Query -> Query Port
  -> Infrastructure Query Adapter -> Application Result -> Web Response
```

异常：

```text
Domain Error -> Application propagation/translation -> Web Exception Translator
  -> HTTP status + stable error code + sanitized public message
```

## 4. 生成与演进

现装 CLI 支持时生成空模块、POM、机械启动配置、Maven Wrapper 和 `.yss/scaffold.json` 来源收据。`assets/reference` 保留为教学资料，业务实现按当前需求继续。CLI 能力缺口按 [资产使用边界](standalone-generation.md) 评估，已有工程增量维护并保留用户文件。

文件生成、构建和实际运行分别报告，工程命令按任务需要使用根 `./mvnw`。
