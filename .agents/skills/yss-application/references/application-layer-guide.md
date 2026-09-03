# YSS Application Target Profile 指南

Application 是 Web 与 Domain 之间的稳定用例边界。Target Profile 使用 `application` 包；历史 `core/service` 对新脚手架为 `unsupported`。

## 1. 职责

- 定义 Application Command、Query、Result 和 Use Case Service。
- 编排 Domain Model、Domain Service 和 Domain Gateway。
- 定义写用例事务边界、幂等和事件发布时点。
- 为分页、列表和投影查询定义 Application Query Port。
- 传播或转换领域错误语义，但不决定 HTTP status 和公开消息。

Application 不接收 HTTP Request DTO，不返回 Web VO，不依赖 Infrastructure/Web，也不处理 Repository PO。

## 2. 包结构

```text
{base_package}.application
├── command
├── query
├── result
├── port
└── service
```

## 3. 写用例

```java
@Service
@RequiredArgsConstructor
public class QualityTemplateService {
    private final QualityTemplateGateway gateway;

    @Transactional(rollbackFor = Exception.class)
    public QualityTemplateId create(QualityTemplateCreateCommand command) {
        QualityTemplate aggregate = QualityTemplate.create(command.name());
        gateway.save(aggregate);
        return aggregate.id();
    }
}
```

- WebConvertor 在 Controller 调用前把 Request 转成 Application Command。
- 核心规则由 Aggregate 公开方法执行，不复制到 AppService。
- 一次用例一个明确事务 seam；读操作按合同决定 `readOnly` 和总数策略。

## 4. 查询用例

```java
public interface QualityTemplateQueryPort {
    PageResult<QualityTemplateResult> page(QualityTemplatePageQuery query);
}
```

- Query Port 属于 Application，Infrastructure 实现。
- `QualityTemplatePageQuery` 使用 Application 语义，不接受未经白名单转换的数据库列名。
- Application Result 不等于 Web VO；WebConvertor 负责最后一跳。
- `PageResult` 可以作为 Application/Infrastructure 的 YSS 分页容器，但不得进入 Domain Gateway。

## 5. MapStruct

只有 Application 内确有不同模型转换时才创建 Convertor，并统一：

```java
@Mapper(componentModel = "spring")
public interface QualityTemplateApplicationConvertor {
}
```

禁止静态 `INSTANCE`；使用构造器注入。Web DTO 转换仍留在 Web，PO 转换留在 Infrastructure。

## 6. Error seam

- Domain error 保留稳定错误标识和参数。
- Application 不吞掉 unknown exception，不把 `getLocalizedMessage()` 变成公开响应。
- Web Exception Translator 依据冻结 API 合同映射 YSS error code、HTTP status 和消毒消息。

## 7. 验证

- 写用例通过 Application Service seam 测试事务、幂等和领域行为。
- 查询用例通过 Query Port seam 测试分页和白名单。
- ArchUnit 证明 Application 不依赖 Infrastructure/Web。
- 实际执行项目根 `./mvnw test/package`。

## 8. 旧架构边界

检测到 AppService 接收 client Cmd、返回 client VO、调用返回 VO 的 Domain Gateway 或位于 `core/service` 时，返回 `unsupported`，不得由新 scaffold 或本指南自动改写。旧项目继续按原工程维护；现代化改造必须单独立项、先评估再逐切片迁移。
