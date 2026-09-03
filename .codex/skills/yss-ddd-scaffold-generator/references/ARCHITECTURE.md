# YSS DDD Target Profile

本文定义 `architecture=target-domain-model` 的唯一目标结构。历史 `core/client/repository`、DTO 型 Gateway、client-in-domain 以及其他旧架构全部为 `unsupported`，不存在 legacy Profile 或回退分支。

## 1. 模块职责

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
- 首个受支持 Profile 是 `persistence=mybatis-plus`；其他持久化方案必须先通过独立 fixture。
- 事务边界由 Application 持有，不在 GatewayImpl 重复制造边界。

### Adapter/Web

- HTTP Request/Response、校验、Controller、WebConvertor 和异常到 HTTP/YSS Result 的映射。
- Request 字段来自冻结 OpenAPI/批准 allowlist，不从数据库 metadata 全量推导。
- WebConvertor 使用 `@Mapper(componentModel = "spring")` 和构造器注入。
- DTO 物理位置固定为 Web；独立 client module 为 `unsupported`。如未来确需发布复用制品，必须另行设计并批准新的 Target Profile。
- Web 不直接依赖 Infrastructure，不把 Domain Model 作为 Controller seam。

### Bootstrap

- 组合 Web 和 Infrastructure，提供机械 Spring Boot 入口与环境配置。
- 默认配置使用 INFO；DEBUG 和 MyBatis stdout SQL 仅存在于 `application-local.yml`。

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

上述规则由生成工程的 `ArchitectureRulesTest` 执行，不只依赖文档约定。

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

- Scaffold 只生成机械模块、POM、Wrapper、配置、架构规则和 Manifest，不生成生产业务 CRUD。
- 初始生成器为 `initialize-only`，非空目标失败。
- Manifest v2 记录模板、脚手架父合同、Router 合同、downstream 完整 skill tree digest 与 generator-owned 文件 hash。
- 当前不支持模板升级，不得重跑初始生成器覆盖业务工程。未来如需支持同一 Target Profile 内的模板版本升级，必须另行设计、批准并验证。

## 5. 完成等级

- `generated`：文件已原子生成，尚未完成 Wrapper 验证。
- `empty-scaffold-verified`：根目录 `./mvnw validate/test/package` 全部通过。
- `first-slice-verified`：批准且版本当前的 golden first slice 已具备 Domain 模型/Gateway、Application Service 实现/事务/Query Port、Repository/Mapper/GatewayImpl/QueryAdapter、DTO/Web/Exception 与分层测试；下游完整 skill tree digest 无漂移，且根 Wrapper 全部通过。该状态只能由 `scripts/run_first_slice_verification.mjs` 写入。

只有首切片验证器可以把 Manifest 从 `empty-scaffold-verified` 升级到最后一级；手工写值、局部测试或结构扫描均无效。只有最后一级可以声明已满足下游 YSS skills 的首切片就绪条件。
