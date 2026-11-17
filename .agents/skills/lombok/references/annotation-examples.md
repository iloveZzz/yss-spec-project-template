# Lombok 条件参考

示例说明注解的适用职责，省略 import；类型、字段和业务行为使用中文 Javadoc。架构、PO/Domain 的 POJO 默认形态及既有工程例外以项目根 `.template-spec/agents/backend-architecture-profiles.md` 为准，不能从注解示例反推模块或业务规则。

## Common Annotations

| 注解 | 使用边界 |
|---|---|
| `@Getter` / `@Setter` | PO 可按映射需要使用；Domain Entity 只暴露所需读取与业务行为，不增加任意 setter。 |
| `@RequiredArgsConstructor` | 适合 Spring Bean 的 final 依赖构造器注入；不等于领域创建规则。 |
| `@NoArgsConstructor` / `@AllArgsConstructor` | 按持久化/序列化工具实际需要选可见性；不为 Domain 默认开放无效状态或全参入口。 |
| `@Data` | 会组合访问器、相等、日志表示等行为；仅在这些行为均符合对象职责时选择，不作为 PO/Entity 的机械模板。 |
| `@Value` | 适合值相等且成员不可变的普通类；含集合、数组或可变元素时仍需防御性复制。 |
| `@Builder` / `@With` | 不得绕过领域工厂与不变量。Builder 默认值必须已有接口或业务依据，不能用 `@Builder.Default` 掩盖遗漏映射。 |
| `@ToString` / `@EqualsAndHashCode` | 分别按日志边界与身份/值语义选择字段；排除敏感信息及不应遍历的关联。 |

### PO Pattern

以下为 DDD Infrastructure 或 MVC repository 中的数据库映射对象；表、主键和审计注解按实际 MyBatis 基线补充，示例不决定发号策略。

```java
/** 用户表的持久化映射，不承担用户业务规则。 */
@Getter
@Setter
@NoArgsConstructor
public class UserPO {
    /** 用户主键，发号方式沿用数据库及写入方约定。 */
    private Long id;

    /** 用户名称，空值约束与数据库及业务模型保持一致。 */
    private String name;
}
```

## Entity Pattern

以下为 DDD Domain，使用调用方已提供的稳定身份，示例业务规则是新建/改名时名称不得全由 Java 空白或 Unicode 空格分隔符组成；重建仅检查必需结构，不重放创建过程。Domain 不带 JPA/MyBatis 注解。

```java
/** 以用户标识维持身份，通过业务方法修改名称的领域实体。 */
@Getter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public final class UserEntity {
    /** 已分配且不可改变的用户标识。 */
    @EqualsAndHashCode.Include
    private final Long id;

    /** 已保存的用户名称。 */
    private String name;

    private UserEntity(Long id, String name) {
        this.id = Objects.requireNonNull(id, "id");
        this.name = Objects.requireNonNull(name, "name");
    }

    /** 使用已分配身份创建用户，并执行当前名称规则。 */
    public static UserEntity create(Long id, String name) {
        requireName(name);
        return new UserEntity(id, name);
    }

    /** 恢复已保存的身份和状态，不生成新身份或发送创建事件。 */
    public static UserEntity reconstitute(Long id, String name) {
        return new UserEntity(id, name);
    }

    /** 修改名称；拒绝空白值并保持用户身份不变。 */
    public void rename(String name) {
        requireName(name);
        this.name = name;
    }

    /** 名称规则的示例；实际错误类型及标识沿用当前领域。 */
    private static void requireName(String name) {
        if (name == null || name.codePoints()
                .allMatch(c -> Character.isWhitespace(c) || Character.isSpaceChar(c))) {
            throw new IllegalArgumentException("user-name-required");
        }
    }
}
```

- 嵌套 State、Fact、值对象同样采用普通类与必要 Lombok，不因只是辅助类型就省略业务注释。
- 集合在构造入口复制，输出只读副本；可变元素还需逐项复制或转换成不可变值。不能只对调用方集合套只读视图后继续保留别名。
- 文本规则先确认空白集合和长度单位，不将 `trim`、`isBlank` 或某个校验注解的默认范围当作业务定义。上述示例保留合法文本原样，覆盖非断行空格；不据此禁止全部不可见字符或擅自做文本归一化。
- 已采用 JPA 的工程，其持久化实体按 ORM 的构造器、代理、主键及关联要求维护，不能照搬上面的 final 类或身份实现；更不能把 JPA `@Entity`、全量 setter、延迟关联引入独立 DDD Domain。数据库生成身份未赋值时的相等行为须单独考虑。

## Service Pattern with Constructor Injection

以下为 DDD Application 的依赖声明片段，HTTP DTO 转换留在 Web；MVC Service 则注入实际 Repository，沿用其既有分层。

```java
/** 编排用户用例，领域规则由用户实体执行。 */
@Service
@RequiredArgsConstructor
public class UserService {
    /** 用户聚合的持久化端口。 */
    private final UserGateway userGateway;
    // 用例方法按当前需求实现。
}
```

## DTO Pattern

HTTP Request/Response 与 Application Command/Result 按各自序列化、校验和映射要求选择访问器或构造器；不得为复用示例让 Service 接收 Request 或直接生成 Entity。敏感输入不进入 `toString`，请求缺失与 null 的区别不由 Lombok 默认值替代。

## Maven Configuration

复用工程父 POM 的 Lombok 版本与编译插件配置，按工程策略选择 provided 或 optional。使用显式注解处理器路径时核验 Lombok、MapStruct processor 和适用的 lombok-mapstruct-binding；binding 是处理器协作配置，不作为业务依赖。

具体检查使用项目根 `.agents/skills/mapstruct/references/annotation-examples.md` 的 Maven Configuration。不把处理器列表顺序当作兼容性证明；编译受影响模块并检查实际生成代码。

## Quick Troubleshooting

| 现象 | 优先检查 |
|---|---|
| getter 或构造器未生成 | 编译器的注解处理器配置、Lombok/Java 兼容性与实际编译错误；仅 IDE 报错时再核对 IDE 配置。 |
| MapStruct 看不到属性 | 同一编译链的 Lombok、MapStruct processor、适用 binding 和生成源码。 |
| Builder 字段为 null | 输入、字段初始化、`@Builder.Default` 的实际生成行为与业务依据；不自动补业务默认值。 |
| equals/hashCode 或 toString 递归/泄漏 | 稳定身份、关联字段、可变成员和敏感字段范围；不以全字段注解修复。 |
| `@Value` 对象仍被外部改变 | 构造入参、返回值及嵌套元素是否保留可变引用。 |

## Reference Documentation

- [Lombok 官方注解说明](https://projectlombok.org/features/)
- [`@Value` 的生成范围](https://projectlombok.org/features/Value)
- [`@Builder` 与默认值](https://projectlombok.org/features/Builder)
