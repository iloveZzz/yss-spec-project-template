# YSS Application Target Profile 指南

本页描述 DDD Application 的用例边界与新脚手架的 `application` 布局。既有 DDD 沿用真实模块与包名维护职责，MVC Service 的事务、幂等与转换读取 [MVC 用例说明](profiles/layered-mvc-service.md)。

## 1. 职责

- 定义 Application Command、Query、Result 和 Use Case Service。
- 编排 Domain Model、Domain Service 和 Domain Gateway。
- 定义写用例事务边界、幂等和事件发布时点。
- 为分页、列表和投影查询定义 Application Query Port。
- 事实、规则与编排的归属遵守项目根 `.template-spec/agents/backend-architecture-profiles.md`；允许 Infrastructure 实现本层 Port，不允许其调用具体用例 Service。
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
        QualityTemplateEntity aggregate = QualityTemplateEntity.create(command.getName());
        gateway.save(aggregate);
        return aggregate.getId();
    }
}
```

- WebConvertor 在 Controller 调用前把 Request 转成 Application Command。
- 核心规则由 Aggregate 公开方法执行，不复制到 AppService。
- 一次用例一个明确事务 seam；读操作按用例需要决定 `readOnly` 和总数策略。

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
- Web Exception Translator 依据现有 API 约定映射 YSS error code、HTTP status 和消毒消息。

## 7. 验证

- 写用例通过 Application Service seam 测试事务、幂等和领域行为。
- 查询用例通过 Query Port seam 测试分页和白名单。
- Application 不依赖 Infrastructure/Web。
- 按实际风险选择工程已有测试命令，优先根 `./mvnw`；区分编译、测试和未验证范围。

## 8. 既有工程边界

按真实调用方检查 AppService 的输入输出、Gateway 和依赖方向。`core/service` 或 client 模块名称本身不阻止增量维护；HTTP 模型穿透、公开接口变化或职责冲突需要结合当前行为处理。只改本次需求涉及的部分并同步调用方，架构迁移按用户授权另行评估范围与兼容性。

## 事务与外部副作用

- 按当前需求明确需要原子提交的数据库写入及所属用例；事务从 Application 公共代理 seam 进入。无需原子写入的查询或纯计算不强制增加事务注解。
- Repository 参与既有事务，不另行决定业务提交边界。多表聚合保存的回滚测试从用例入口注入中途失败，不能只验证单个 Mapper。
- 幂等键、重复请求结果、重试范围及失败恢复来自当前业务规则与接口约定；不在技能中默认引入分布式事务或通用重试。测试覆盖回滚不发布、提交后失败及重复消费。
