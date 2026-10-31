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

- Request/Response 字段必须来自当前 OpenAPI 和批准 allowlist。
- 数据库 metadata 只补充 Java 类型候选，不能自行扩大公开字段。
- Web Page Request 不继承含内部协作字段的 `PageQuery`；分页字段、默认值、枚举和禁用字段全部来自合同绑定且 digest 匹配的 `yss-dto` wire profile，再与 `fields.<table>.pagination` allowlist 取交集。Web Adapter 不维护第二份分页协议。
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
- known business、known system、unknown/runtime 三类分别保持明确的 HTTP 状态、业务错误与脱敏策略。
- unknown/runtime 保留内部 cause/stack 用于日志，但公开响应禁止返回 `getLocalizedMessage()`。
- 复用 YSS global handler 前必须实测 auto-configuration 和 precedence；未经验证不能仅凭依赖存在宣称生效。

## 6. 生成参考

- `generate_controller.mjs` 只消费 `schema_version=2`、`status=approved` 且 `current_version=contract_version` 的 Web generation contract；schema v1 为 `unsupported`。
- `references/web-generation-contract.schema.json` 是 Web generation contract v2 的机器可读结构合同；生成器仍执行跨字段、文件系统与 Manifest 语义校验。
- `scaffold-v2` 模式必须绑定已达 `empty-scaffold-verified` 或 `first-slice-verified` 的 Manifest，并校验标准 Web module 路径和所有 Profile；`existing-project` 模式不得伪造 scaffold manifest。
- 生成器是 initialize-only，必须在写入前规划全部目标并校验每个目标位于批准写路径；任一文件已存在或传入 `--force` 时整体阻断。落盘使用排他创建，任一步失败都回滚本次已创建文件，不允许部分成功。

## 7. 验证

- Controller 只依赖 Application。
- WebConvertor 无 Domain/Infrastructure import，并由 Spring 注入。
- Wire forbidden fields 无法绑定。
- OpenAPI 3 注解、YSS Result wrapper、Validation namespace 与平台 Profile 一致。
- 执行项目根 `./mvnw test/package`，并保留 HTTP/serialization/exception 证据。

## 非 CRUD 适配

认证、OAuth 回调、Cookie、流式响应及协议端点可以手工实现，不强行套 CRUD metadata；仍消费当前 wire 约定、Application seam 和平台配置。Controller 不直连 Domain Gateway，也不自行编排登录、撤销或持久化。

协议转换、Cookie/Header 处理归 Web；业务决策归 Application/Domain。异常翻译器可以依赖领域错误类型，不能据此允许 Controller 调用领域端口。MapStruct 处理机械字段映射，协议编码及显式领域工厂适配使用有测试的自定义方法。

生成器推荐 rest 布局；已登记的 adapter.web 等布局通过合同绑定识别。审查按模块、实际 Controller 类型和依赖方向进行，包名偏离不能让检查空匹配通过。
