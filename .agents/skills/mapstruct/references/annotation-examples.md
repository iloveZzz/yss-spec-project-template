# mapstruct 条件参考

仅在需要具体注解或配置示例时定位对应章节。示例业务名与版本不是工程基线；按批准合同替换，禁止直接复制成业务实现。

## Basic Mapper

```java
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface UserMapper {

    UserResponse toResponse(User user);

    List<UserResponse> toResponseList(List<User> users);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "password", ignore = true)
    User toEntity(CreateUserRequest dto);
}
```

## Update Mapping

```java
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface UserMapper {

    // Partial update - ignores null values
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(UpdateUserRequest dto, @MappingTarget User user);

    // Full update - sets all fields including nulls
    void updateEntityFull(UpdateUserRequest dto, @MappingTarget User user);
}
```

## Field Mapping

```java
@Mapper(componentModel = "spring")
public interface OrderMapper {

    // Different field names
    @Mapping(source = "customer.name", target = "customerName")
    @Mapping(source = "customer.email", target = "customerEmail")
    @Mapping(source = "items", target = "orderItems")
    OrderResponse toResponse(Order order);

    // Constant values
    @Mapping(target = "status", constant = "PENDING")
    @Mapping(target = "createdAt", expression = "java(java.time.LocalDateTime.now())")
    Order toEntity(CreateOrderRequest dto);

    // Expression
    @Mapping(target = "fullName", expression = "java(user.getFirstName() + \" \" + user.getLastName())")
    UserResponse toResponse(User user);

    // Date formatting
    @Mapping(source = "createdAt", target = "createdDate", dateFormat = "yyyy-MM-dd")
    OrderResponse toResponse(Order order);
}
```

## Nested Objects

```java
@Mapper(componentModel = "spring", uses = {AddressMapper.class, ItemMapper.class})
public interface OrderMapper {

    // Uses AddressMapper for address field
    // Uses ItemMapper for items collection
    OrderResponse toResponse(Order order);
}

@Mapper(componentModel = "spring")
public interface AddressMapper {
    AddressResponse toResponse(Address address);
}

@Mapper(componentModel = "spring")
public interface ItemMapper {
    ItemResponse toResponse(Item item);
}
```

## Enum Mapping

```java
@Mapper(componentModel = "spring")
public interface StatusMapper {

    @ValueMappings({
        @ValueMapping(source = "ACTIVE", target = "ENABLED"),
        @ValueMapping(source = "INACTIVE", target = "DISABLED"),
        @ValueMapping(source = MappingConstants.ANY_REMAINING, target = "UNKNOWN")
    })
    ExternalStatus toExternalStatus(InternalStatus status);
}
```

## Custom Methods

```java
@Mapper(componentModel = "spring")
public abstract class UserMapper {

    @Autowired
    protected RoleRepository roleRepository;

    public abstract UserResponse toResponse(User user);

    @Mapping(target = "roles", source = "roleIds")
    public abstract User toEntity(CreateUserRequest dto);

    // Custom mapping method
    protected Set<Role> mapRoles(Set<Long> roleIds) {
        if (roleIds == null) return new HashSet<>();
        return roleIds.stream()
            .map(id -> roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id)))
            .collect(Collectors.toSet());
    }
}
```

## Collection Mapping

```java
@Mapper(componentModel = "spring")
public interface ProductMapper {

    ProductResponse toResponse(Product product);

    List<ProductResponse> toResponseList(List<Product> products);

    Set<ProductResponse> toResponseSet(Set<Product> products);

    // Page mapping
    default Page<ProductResponse> toResponsePage(Page<Product> products) {
        return products.map(this::toResponse);
    }
}
```

## After/Before Mapping

```java
@Mapper(componentModel = "spring")
public abstract class UserMapper {

    @AfterMapping
    protected void afterMapping(@MappingTarget UserResponse response, User user) {
        response.setDisplayName(user.getFirstName() + " " + user.getLastName().charAt(0) + ".");
    }

    @BeforeMapping
    protected void beforeMapping(CreateUserRequest dto) {
        if (dto.getEmail() != null) {
            dto.setEmail(dto.getEmail().toLowerCase().trim());
        }
    }
}
```

## Conditional Mapping

```java
@Mapper(componentModel = "spring")
public abstract class UserMapper {

    @Condition
    public boolean isNotEmpty(String value) {
        return value != null && !value.trim().isEmpty();
    }

    // Only maps non-empty strings
    UserResponse toResponse(User user);
}
```

## Maven Configuration

```xml
<properties>
    <mapstruct.version>1.6.2</mapstruct.version>
    <lombok.version>1.18.30</lombok.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct</artifactId>
        <version>${mapstruct.version}</version>
    </dependency>

    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <version>${lombok.version}</version>
        <optional>true</optional>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.13.0</version>
            <configuration>
                <source>${maven.compiler.source}</source>
                <target>${maven.compiler.target}</target>
                <annotationProcessorPaths>
                    <!-- Use the approved processor configuration, including Lombok binding -->
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok</artifactId>
                        <version>${lombok.version}</version>
                    </path>
                    <path>
                        <groupId>org.mapstruct</groupId>
                        <artifactId>mapstruct-processor</artifactId>
                        <version>${mapstruct.version}</version>
                    </path>
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok-mapstruct-binding</artifactId>
                        <version>0.2.0</version>
                    </path>
                </annotationProcessorPaths>
                <compilerArgs>
                    <arg>-Amapstruct.defaultComponentModel=spring</arg>
                </compilerArgs>
            </configuration>
        </plugin>
    </plugins>
</build>
```

## Key Annotations

| Annotation | Purpose |
|------------|---------|
| `@Mapper` | Define mapper interface/abstract class |
| `@Mapping` | Field-level mapping configuration |
| `@MappingTarget` | Update existing object |
| `@BeanMapping` | Bean-level mapping settings |
| `@AfterMapping` | Post-processing method |
| `@BeforeMapping` | Pre-processing method |
| `@Condition` | Conditional mapping |
| `@ValueMapping` | Enum value mapping |

## Best Practices

1. Use `componentModel = "spring"` for Spring injection
2. Keep unmapped targets visible with `ReportingPolicy.ERROR`; explicitly ignore only fields excluded by the contract
3. Map or explicitly exclude identity and audit fields according to ownership in the contract
4. Use `@MappingTarget` for partial updates
5. Configure Lombok, MapStruct and the required binding processor from the engineering baseline
6. Use abstract classes instead of interfaces for custom logic
7. Use `@Condition` for conditional mapping logic

---


## Anti-Patterns

| Anti-Pattern | Why It's Bad | Correct Approach |
|--------------|--------------|------------------|
| Mapping entities to entities | Breaks change tracking | Map DTO to entity |
| Not using @MappingTarget | Inefficient updates | Use for partial updates |
| Complex logic in expressions | Hard to test | Use custom methods |
| Ignoring all unmapped | Misses fields silently | Use ERROR and explicit field mappings |
| Not excluding audit fields | Overwrites metadata | Exclude id, timestamps |
| Circular references | StackOverflowError | Break cycles with custom mapping |
| Using interfaces for custom logic | Can't inject dependencies | Use abstract classes |
| Not testing mappers | Runtime mapping errors | Write mapper tests |

---

## Quick Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Cannot find implementation" | Annotation processing failed | Check processor configuration |
| Lombok fields not found | Missing processor or binding | Check annotationProcessorPaths and Lombok binding |
| Mapper not autowired | Wrong componentModel | Use componentModel = "spring" |
| Circular dependency | Mappers reference each other | Review mapper dependencies and remove cycles |
| UnmappedTargetProperty warning | Missing mapping | Add an explicit mapping or a contract-approved field ignore |
| NullPointerException in mapping | Null source | Add null checks or NullValuePropertyMappingStrategy |
| Custom method not called | Wrong signature | Match method parameters exactly |
| Generated code not updated | IDE cache | Clean and rebuild project |

---

## Reference Documentation
- [MapStruct Reference](https://mapstruct.org/documentation/stable/reference/html/)
- [Spring Integration](https://mapstruct.org/documentation/stable/reference/html/#spring)
- [Lombok Integration](https://mapstruct.org/faq/#can-i-use-mapstruct-together-with-project-lombok)
