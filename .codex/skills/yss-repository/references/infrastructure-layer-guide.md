# YSS Infrastructure Target Profile 指南

本指南只定义 `target-domain-model + mybatis-plus`。历史 `Entity + DTO/VO Gateway` 为 `unsupported`，不存在旧架构 Profile。

## 1. 职责

- 实现 Domain Gateway，负责 Aggregate 持久化。
- 实现 Application Query Port，负责分页、列表和读模型。
- 定义 PO、MyBatis-Plus Repository/Mapper、XML 和数据源适配。
- 通过 Spring MapStruct Bean 完成 `PO <-> Domain Model`、`PO -> Application Result`。

Infrastructure 不拥有业务事务边界，不向 Application/Web 暴露 PO，也不直接生成 HTTP VO。

## 2. 包结构

```text
{base_package}.infrastructure
├── persistence
│   ├── po
│   ├── repository
│   ├── convertor
│   └── gateway
└── query
    ├── adapter
    └── convertor
```

新脚手架固定使用 `{base_package}.infrastructure`。已有 `{base_package}.repository` 工程不由 scaffold 改写；需要现代化时单独立项。

## 3. Domain Gateway 实现

```java
@Repository
@RequiredArgsConstructor
public class QualityTemplateGatewayImpl implements QualityTemplateGateway {
    private final QualityTemplateRepository repository;
    private final QualityTemplatePersistenceConvertor convertor;

    @Override
    public Optional<QualityTemplate> findById(QualityTemplateId id) {
        return Optional.ofNullable(repository.selectById(id.value()))
                .map(convertor::toDomain);
    }

    @Override
    public void save(QualityTemplate aggregate) {
        repository.insertOrUpdate(convertor.toPO(aggregate));
    }
}
```

GatewayImpl 不接收 Web Cmd/Query，不返回 VO/PageResult，不声明新的业务事务。

## 4. Query Port 实现

分页/列表属于 Application Query Port：

```java
@Repository
@RequiredArgsConstructor
public class QualityTemplateQueryAdapter implements QualityTemplateQueryPort {
    private final QualityTemplateRepository repository;
    private final QualityTemplateQueryConvertor convertor;

    @Override
    public PageResult<QualityTemplateResult> page(QualityTemplatePageQuery query) {
        // orderBy/groupBy 必须先映射到批准列白名单，再构造 MyBatis 条件。
        return convertor.toResultPage(repository.selectPage(...));
    }
}
```

`PageQuery` 可以在 Web/Application/Infrastructure 协作链使用，但不得进入 Domain。`orderBy` / `groupBy` 禁止直接拼接 SQL。

## 5. PO 与 Repository

- Target Profile 使用 `*PO`；旧式 `*Entity` 布局为 `unsupported`。
- PO 默认使用最小 Lombok 注解，不无条件使用 `@Data`。
- 当前实现继承项目既有 `BasePlusRepository<PO>`；普通 MyBatis 为 `unsupported`。
- Mapper XML 位于项目既有扫描路径；扫描包和 XML 路径必须由集成测试证明。

## 6. MapStruct

```java
@Mapper(componentModel = "spring")
public interface QualityTemplatePersistenceConvertor {
    QualityTemplate toDomain(QualityTemplatePO source);
    QualityTemplatePO toPO(QualityTemplate source);
}
```

- 禁止 `INSTANCE = Mappers.getMapper(...)`。
- Convertor 使用构造器注入。
- 父 POM 必须配置 `mapstruct-processor`、Lombok 和 `lombok-mapstruct-binding`。
- 验证必须编译生成实现，不能只检查接口文本。

## 7. 验证

- Domain Gateway：保存后可通过 Gateway seam 重新加载等价 Aggregate。
- Query Port：分页、total、排序白名单和空结果。
- Mapper/Repository：实际 MyBatis-Plus/H2 或批准数据库 fixture。
- Architecture：Infrastructure 可以依赖 Application/Domain；反向依赖必须失败。
- 使用项目根 `./mvnw test/package` 留证。

## 8. 旧架构边界

检测到 Repository 直接接收 client Query、返回 VO、Convertor 做 `PO -> VO` 或使用旧式 Entity 布局时，返回 `unsupported`，不得由新 scaffold 自动改写。旧项目继续按原工程维护；现代化改造必须单独立项。
