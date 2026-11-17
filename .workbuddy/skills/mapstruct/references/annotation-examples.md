# MapStruct 条件参考

以下仅示范机械映射，省略 import，模型字段以真实接口为准。架构和方向采用项目根 `.template-spec/agents/backend-architecture-profiles.md`；优先复用工程已有 MapperConfig、构造器注入和处理器版本。`org.mapstruct.Mapper` 不是执行 SQL 的 MyBatis Mapper。

## Basic Mapper

DDD Web / MVC server 的 Convertor 只连接 HTTP 模型与用例模型。Request 中的嵌套对象也要转换，不能直接塞入 Command；Response 的嵌套字段及泛型参数不保留内部类型。

```java
/** HTTP 用户模型与用例输入输出之间的机械转换。 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR,
        injectionStrategy = InjectionStrategy.CONSTRUCTOR)
public interface UserWebConvertor {
    /** 将允许的请求字段映射为用例输入，不创建领域实体。 */
    CreateUserCommand toCommand(CreateUserRequest request);

    /** 将用例结果映射为公开响应。 */
    UserResponse toResponse(UserResult result);

    /** 转换请求内的地址，不共享 HTTP 嵌套类型。 */
    AddressCommand toAddressCommand(AddressRequest request);

    /** 转换结果内的地址，只暴露接口允许的字段。 */
    AddressResponse toAddressResponse(AddressResult result);
}
```

不提供 `CreateUserRequest → UserEntity/UserPO` 的捷径；Domain 创建由用例调用工厂，PO 转换在 Infrastructure/repository。Controller 负责调用 WebConvertor 与用例，不把转换逻辑移入 Service 来接收 HTTP DTO。

## Field Mapping

字段改名、已确定的表示转换和已获授权公开的投影可以在 Convertor 中完成：

```java
/** 将订单用例结果投影为 HTTP 响应，订单状态已由业务层决定。 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface OrderWebConvertor {
    /** 按接口字段名展开客户名称，不在转换时查询客户。 */
    @Mapping(source = "customer.name", target = "customerName")
    OrderResponse toResponse(OrderResult result);
}
```

业务状态、默认资格、主键和当前时间不得用 `constant`、`defaultValue`、`expression` 或回调临时生成。需要这些值时由所属业务层、可信上下文或既定持久化填充机制提供。枚举未知值按当前规则拒绝或映射，不能统一兜底 `UNKNOWN` 掩盖数据错误。

## Nested Objects / Collection Mapping

- 给嵌套字段和集合元素提供同方向映射方法；复用其他 Convertor 时使用 `uses` 和项目的 Spring 注入约定，不使用静态 `INSTANCE`。
- 只复制顶层 List 不代表元素已经转成 Response；分页的 items、total 和元数据分别按当前协议映射，不为示例引入另一套 Page 类型。
- 集合为 null、空集合和缺失字段的含义来自请求/响应方向；转换工具不能自行将 null 全部改成空集合。领域可变集合另按防御性复制约定处理。

## Update Mapping

先确定更新对象及语义，再选择 `@MappingTarget`：它适用于允许直接赋值的内部传输对象或 PO，不能绕过 Entity 的业务方法。

- `NullValuePropertyMappingStrategy.IGNORE` 用于更新映射时保留目标原值，不能凭它区分“字段未提供”与“显式清空”。接口需要区分时，输入模型保留存在性并显式处理。
- 全量替换需明确允许清空的字段、必填字段和集合语义，不依赖全局默认策略；null 源对象与 null 属性是不同配置范围。
- ID、版本、租户和审计字段按实际所有权映射或明确忽略，不能机械一律忽略。部分加载后的回写同时遵守字段白名单，不能把未加载字段写成 null。

## Persistence Mapping

DDD Infrastructure 的 PO → Domain 转换通过领域重建入口恢复已保存事实，不执行创建工厂的新增规则、发号或事件。以下为显式转换示意，不要求 MapStruct 生成不可变实体：

```java
/** 在 Infrastructure 中恢复用户实体，字段事实来自持久化结果。 */
@Component
public class UserPersistenceConvertor {
    /** 通过领域重建入口恢复身份和已保存名称。 */
    public UserEntity toDomain(UserPO source) {
        if (source == null) {
            return null;
        }
        return UserEntity.reconstitute(source.getId(), source.getName());
    }
}
```

实际工厂签名、空值与非法持久化状态按当前 Domain 处理；不为映射增加任意 setter。机械部分可继续由 MapStruct 生成，显式部分同样核对字段完整性、身份、枚举/值对象、集合及往返语义。MVC repository 使用其既有内部模型，不照此补造 Domain。

## Custom Methods / Mapping Hooks

自定义方法与 `@BeforeMapping` / `@AfterMapping` 只处理必要的机械表示转换，不注入 Repository 查角色、不调用具体用例 Service、不改变请求源对象、不判权限或补业务默认值。需要查询的事实由用例取得后传入；领域规则由 Domain（MVC 为 Service）决定。

`@Condition` 不能把合法空字符串、零值或显式 null 当作缺失而跳过；是否规范化大小写、空白和日期格式须有接口依据。复杂业务决策不藏在表达式或回调内。

## Maven Configuration

- 复用当前 Parent/BOM、Java、Lombok、MapStruct 与 compiler plugin 版本，不复制示例版本覆盖工程基线。
- 显式配置注解处理器路径的工程，在同一编译链核对 Lombok、MapStruct processor 与适用的 lombok-mapstruct-binding；binding 不作为业务运行依赖，处理器顺序不替代实际生成验证。
- Spring 映射使用当前 `componentModel` 与构造器注入；新增字段显式映射或按接口语义忽略，保留 `ReportingPolicy.ERROR` 或工程等效严格策略。
- 编译受影响模块，检查生成实现的属性、构造器/Builder 选择、嵌套类型、null 分支及访问器兼容性；模型从 record 改为 POJO 时同步调用方和 XML 映射，不能只改类声明。

## Quick Troubleshooting

| 现象 | 优先检查 |
|---|---|
| 未生成实现或 Lombok 属性缺失 | 原始编译错误、处理器路径、binding、Java 兼容性及生成源码。 |
| Mapper 不能注入 | Spring componentModel、Bean 扫描、构造器及循环依赖；不要扩大 MyBatis MapperScan。 |
| 新字段未映射 | 目标字段、嵌套映射和严格策略；按语义映射或逐项忽略，不改全局 IGNORE。 |
| null 或清空行为错误 | 源对象/属性/集合分别对应的策略，以及字段存在性和更新方向；不要盲加 IGNORE。 |
| 领域重建失败 | 先核实持久化事实、工厂契约与字段遗漏，不绕过校验或开放 setter。 |

按本次变更选择已有映射测试或代表性案例，覆盖实际受影响的字段、null/空值、更新及往返行为；不把所有示例列为必跑项。

## Reference Documentation

- [MapStruct Reference](https://mapstruct.org/documentation/stable/reference/html/)
- [更新属性的 null 策略](https://mapstruct.org/documentation/stable/reference/html/#controlling-mapping-result-for-null-properties-in-bean-mappings)
- [源字段存在性](https://mapstruct.org/documentation/stable/reference/html/#source-presence-check)
- [Lombok Integration](https://mapstruct.org/faq/#can-i-use-mapstruct-together-with-project-lombok)
