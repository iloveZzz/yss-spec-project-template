# YSS Web Adapter Target Profile 指南

Web Adapter 负责 HTTP 边界、Wire DTO、校验、YSS Result 包装、WebConvertor 和异常翻译。它只调用 Application，不直接访问 Domain Gateway、Repository 或 PO。

## 1. 包结构

```text
{base_package}.rest
├── dto
│   ├── request
│   └── response
├── convertor
├── exception
└── *Controller.java
```

DTO 固定属于 Web module。独立 client module 与把 client DTO 放进 Domain module 均为 `unsupported`；如未来确需发布复用制品，必须另行设计并批准新的 Target Profile，不能由当前脚手架推断或回退。

## 2. Wire 合同

- Request/Response 字段必须来自冻结 OpenAPI 和批准 allowlist。
- 数据库 metadata 只补充 Java 类型候选，不能自行扩大公开字段。
- Web Page Request 不继承含内部协作字段的 `PageQuery`；只暴露批准的 `pageIndex/pageSize/orderBy/orderDirection/groupBy` 及业务查询字段。
- `orderBy` / `groupBy` 必须在 Application/Infrastructure 映射到数据库列白名单。
- `offset`、`needTotalCount`、`tempTotalCount` 禁止进入 HTTP 绑定面。

## 3. Controller

```java
@RestController
@RequestMapping("/api/quality/quality-rule")
@RequiredArgsConstructor
@Tag(name = "质量规则管理")
public class QualityRuleController {
    private final QualityRuleService service;
    private final QualityRuleWebConvertor webConvertor;

    @PostMapping
    public SingleResult<Long> create(@Valid @RequestBody QualityRuleCreateRequest request) {
        return SingleResult.of(service.create(webConvertor.toCreateCommand(request)));
    }
}
```

- 只使用 OpenAPI 3 `io.swagger.v3.oas.annotations`；Swagger 2 为 `unsupported`，不存在 legacy Profile。
- Controller 不捕获通用 `Exception`，不写业务规则，不手工执行持久化分页。
- Controller seam 只出现 Web Request/Response 和 Application Service。

## 4. WebConvertor

```java
@Mapper(componentModel = "spring")
public interface QualityRuleWebConvertor {
    QualityRuleCreateCommand toCreateCommand(QualityRuleCreateRequest source);
    QualityRuleResponse toResponse(QualityRuleResult source);
}
```

- 使用构造器注入，不定义静态 `INSTANCE`。
- Request → Application Command/Query；Application Result → Response。
- 不导入 Domain Model 或 Repository PO。
- 父 POM 必须配置 MapStruct processor、Lombok 与 `lombok-mapstruct-binding`，验证生成实现真实编译。

## 5. Exception Translator

- Domain/Application 错误经专门 Translator 映射为冻结 API 的 HTTP status、YSS error code 和消毒后的公开消息。
- known business、known system、unknown/runtime 三类都必须有 MockMvc/HTTP contract test。
- unknown/runtime 保留内部 cause/stack 用于日志，但公开响应禁止返回 `getLocalizedMessage()`。
- 复用 YSS global handler 前必须实测 auto-configuration 和 precedence；未经验证不能仅凭依赖存在宣称生效。

## 6. 生成门禁

- `generate_controller.mjs` 必须消费 `status=approved` 的 Web generation contract。
- 合同必须声明 `base_package`、`module_name`、`domain_segment`、`target-domain-model`、平台/validation Profile、`dto_placement=web`、OpenAPI Freeze 引用和每张表的 create/update/query/response allowlist；CLI 身份必须逐项匹配。
- 生成器是 initialize-only，必须在写入前规划全部目标；任一文件已存在或传入 `--force` 时整体阻断，不允许“跳过已有文件后继续生成”的部分成功。
- 权限、校验语义、异常行为和复杂查询仍使用 `behavior-tdd`，不能由 metadata 猜测。

## 7. 验证

- Controller 只依赖 Application。
- WebConvertor 无 Domain/Infrastructure import，并由 Spring 注入。
- Wire forbidden fields 无法绑定。
- OpenAPI 3 注解、YSS Result wrapper、Validation namespace 与平台 Profile 一致。
- 执行项目根 `./mvnw test/package`，并保留 HTTP/serialization/exception 证据。
