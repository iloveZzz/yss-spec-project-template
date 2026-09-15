# lombok 条件参考

仅在需要具体注解或配置示例时定位对应章节。示例业务名与版本不是工程基线；按批准合同替换，禁止直接复制成业务实现。

## Maven Configuration

复用工程父 POM 中已批准的 Lombok 版本与编译插件配置。Lombok 依赖按工程策略使用 provided 或 optional；使用显式注解处理器路径的项目，将 Lombok 放入 `annotationProcessorPaths`。

与 MapStruct 共用时，在同一处理器配置中核验 Lombok、MapStruct processor 和适用的 lombok-mapstruct-binding；binding 不作为业务依赖单独引入。具体配置参见 [MapStruct 配置示例](../../mapstruct/references/annotation-examples.md#maven-configuration)，示例版本仍由当前工程基线替换。

## Common Annotations

### @Data (All-in-One)

```java
@Data
public class User {
    private Long id;
    private String name;
    private String email;
}

// Generates:
// - @Getter for all fields
// - @Setter for all non-final fields
// - @ToString
// - @EqualsAndHashCode
// - @RequiredArgsConstructor
```

### @Getter / @Setter

```java
public class User {
    @Getter @Setter
    private String name;

    @Getter // Read-only
    private final String email;

    @Setter(AccessLevel.PROTECTED)
    private String internalId;
}
```

### @NoArgsConstructor / @AllArgsConstructor / @RequiredArgsConstructor

```java
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private Long id;
    private String name;
}

@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository; // Included in constructor
    private final UserMapper userMapper;         // Included in constructor
    private String cacheName;                    // NOT included
}
```

### @Builder

```java
@Data
@Builder
public class User {
    private Long id;
    private String name;
    private String email;
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;
}

// Usage
User user = User.builder()
    .name("John")
    .email("john@example.com")
    .build();

// With toBuilder for updates
User updated = user.toBuilder()
    .name("Jane")
    .build();
```

### @Value (Immutable)

```java
@Value
public class UserResponse {
    Long id;
    String name;
    String email;
    LocalDateTime createdAt;
}

// Generates:
// - All fields are private final
// - @AllArgsConstructor
// - @Getter (no setters)
// - @ToString
// - @EqualsAndHashCode
```

## Entity Pattern

```java
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;
}
```

JPA/DDD entities must not default to `@Data`; choose equality and `toString` deliberately from stable identity and exclude lazy, relationship, and sensitive fields.

## Service Pattern with Constructor Injection

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponse create(CreateUserRequest dto) {
        log.info("Creating user");
        User user = userMapper.toEntity(dto);
        return userMapper.toResponse(userRepository.save(user));
    }
}
```

## Logging

```java
@Slf4j  // SLF4J logger
public class UserService {
    public void process() {
        log.info("Processing...");
        log.debug("Processing completed");
        log.error("Error occurred", exception);
    }
}

@Log4j2  // Log4j2 logger
@CommonsLog  // Apache Commons Logging
@JBossLog  // JBoss Logging
```

## DTO Pattern

```java
// Request DTO
@Getter
@Setter
@ToString(onlyExplicitlyIncluded = true)
public class CreateUserRequest {
    @NotBlank
    private String name;
    @Email
    private String email;
    @Size(min = 8)
    private String password;
}

// Response DTO (immutable)
@Value
@Builder
public class UserResponse {
    Long id;
    String name;
    String email;
    UserStatus status;
    LocalDateTime createdAt;
}
```

## @Cleanup

```java
public void readFile(String path) throws IOException {
    @Cleanup InputStream in = new FileInputStream(path);
    // in.close() called automatically
}
```

## @SneakyThrows

```java
@SneakyThrows  // Wraps checked exception
public String readConfig() {
    return new String(Files.readAllBytes(Paths.get("config.json")), StandardCharsets.UTF_8);
}
```

## @Synchronized

```java
public class Counter {
    @Synchronized
    public void increment() {
        // Thread-safe
    }
}
```

## @With (Immutable Updates)

```java
@Value
@With
public class Point {
    int x;
    int y;
}

Point p1 = new Point(1, 2);
Point p2 = p1.withX(5);  // Point(5, 2)
```

## Key Annotations

| Annotation | Purpose |
|------------|---------|
| `@Data` | Getter, Setter, ToString, Equals, Constructor |
| `@Value` | Immutable class |
| `@Builder` | Builder pattern |
| `@RequiredArgsConstructor` | Constructor for final fields |
| `@Slf4j` | Logger field |
| `@ToString.Exclude` | Exclude from toString |
| `@EqualsAndHashCode.Exclude` | Exclude from equals/hashCode |

---


## Anti-Patterns

| Anti-Pattern | Why It's Bad | Correct Approach |
|--------------|--------------|------------------|
| @Data on JPA entities | toString/equals issues | Use @Getter/@Setter selectively |
| Not excluding lazy relations | LazyInitializationException | Use @ToString.Exclude |
| @EqualsAndHashCode on entities | Proxy issues | Use @EqualsAndHashCode(onlyExplicitlyIncluded = true) |
| @SneakyThrows everywhere | Hides exceptions | Use proper exception handling |
| @Builder without @Default | Null fields | Add @Builder.Default |
| @Value with mutable fields | Breaks immutability | Use only immutable types |
| Mixing @Data and manual methods | Confusing API | Be consistent |
| Not configuring in lombok.config | Inconsistent behavior | Use lombok.config file |

---

## Quick Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Cannot find symbol" for getters | IDE not processing | Enable annotation processing |
| LazyInitializationException | toString on lazy relation | Add @ToString.Exclude |
| MapStruct not working | Wrong processor order | Lombok before MapStruct |
| Builder missing fields | No @Builder.Default | Add defaults or check config |
| StackOverflowError in equals | Circular reference | Exclude relation fields |
| IDE shows errors but compiles | IDE cache | Invalidate caches/restart |
| @Slf4j logger not found | SLF4J not in classpath | Add SLF4J dependency |
| Generated code not visible | delombok needed | Run delombok task |

---

## Reference Documentation
- [Lombok Documentation](https://projectlombok.org/features/)
- [Stable Features](https://projectlombok.org/features/all)
- [Configuration](https://projectlombok.org/features/configuration)
