---
name: "yss-backend-scaffold-infrastructure"
description: "YSS 服务的基础设施层开发框架和技术指南。在实现数据访问层、数据库实体、外部服务适配器时需要用到。"
---

# Infrastructure 层开发规范 (Infrastructure Layer Development Guide)

本 Skill 提供了 YSS **Infrastructure (基础设施层)** 的通用开发规范。Infrastructure 层负责实现 Domain 层定义的网关接口，处理数据持久化、外部服务调用和配置管理。

## 1. 核心职责 (Core Responsibilities)

- **实现网关接口 (Gateway Implementation)**: 实现 Domain 层定义的 `Gateway` 接口。
- **数据持久化 (Persistence)**: 定义 `Repository` 接口和 `PO` (Persistent Object) 实体，操作数据库。
- **对象转换 (Conversion)**: 使用 MapStruct 实现 PO 与 Domain Model/DTO 之间的转换。
- **外部适配 (External Adapters)**: 集成外部服务 (如文件存储、消息队列)。

## 2. 代码结构 (Code Structure)

```
com.yss.{module}.repository
├── entity                  # 持久化对象 (PO)
├── gateway.impl            # Domain Gateway 接口实现
├── convertor               # MapStruct 转换器
├── util                    # 工具类
└── {Domain}Repository.java # MyBatis Plus Repository 接口
```

## 3. 开发规范 (Development Guidelines)

### 3.1 持久化对象 (PO)

- **命名**: `DomainName` + `PO` (e.g., `QualityTemplatePO`)。
- **继承**: 推荐继承 `AuditableEntity` 以自动处理审计字段 (`created_by`, `created_date` 等)，但非强制要求。
- **注解**:
  - `@TableName("t_table_name")`: 指定数据库表名。
  - `@TableId(value = "id", type = IdType.ASSIGN_ID)`: 指定主键策略 (雪花算法)。
  - `@TableField("column_name")`: 指定字段映射。
  - `@Data`, `@EqualsAndHashCode(callSuper = true)`: Lombok 注解。

### 3.2 Repository 接口

- **继承**: `com.yss.cloud.mybatis.support.BasePlusRepository<PO>`。
- **位置**: 直接位于 `com.yss.{module}.repository` 包下。
- **Mapper XML**: 对应的 XML 文件位于 `src/main/resources/mappers`。

### 3.3 Gateway 实现

- **位置**: `com.yss.{module}.repository.gateway.impl`。
- **注解**: `@Repository` 或 `@Service`。
- **依赖注入**: 使用 `@RequiredArgsConstructor` (Lombok) 或 `@Autowired` 注入 Repository。
- **查询逻辑**: 使用 `Wrappers.lambdaQuery()` 构建类型安全的查询条件。
- **分页处理**: 使用 `PageUtil.page(query)` 构建分页对象，返回 `PageResult.of(...)`。

### 3.4 对象转换 (Convertor)

- **工具**: MapStruct。
- **位置**: `com.yss.{module}.repository.convertor`。
- **命名**: `DomainName` + `Convertor` (e.g., `QualityTemplateConvertor`)。
- **规范**: 定义 `INSTANCE` 常量，使用 `Mappers.getMapper(...)` 获取实例。

## 4. 详细案例 (Detailed Examples)

### 4.1 Persistent Object (PO)

```java
package com.yss.quality.repository.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_quality_template")
public class QualityTemplatePO extends AuditableEntity {

    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    @TableField("template_name")
    private String templateName;

    @TableField("template_code")
    private String templateCode;

    @TableField("status")
    private Integer status;
}
```

### 4.2 Repository Interface

```java
package com.yss.quality.repository;

import com.yss.cloud.mybatis.support.BasePlusRepository;
import com.yss.quality.repository.entity.QualityTemplatePO;

public interface QualityTemplateRepository extends BasePlusRepository<QualityTemplatePO> {
}
```

### 4.3 Gateway Implementation

```java
package com.yss.quality.repository.gateway.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.yss.cloud.dto.result.PageResult;
import com.yss.quality.client.dto.query.QualityTemplatePage;
import com.yss.quality.client.vo.QualityTemplateVO;
import com.yss.quality.domain.template.gateway.QualityTemplateGateway;
import com.yss.quality.repository.QualityTemplateRepository;
import com.yss.quality.repository.convertor.QualityTemplateConvertor;
import com.yss.quality.repository.entity.QualityTemplatePO;
import com.yss.quality.repository.util.PageUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class QualityTemplateGatewayImpl implements QualityTemplateGateway {

    private final QualityTemplateRepository qualityTemplateRepository;

    @Override
    public PageResult<QualityTemplateVO> pageQualityTemplate(QualityTemplatePage query) {
        LambdaQueryWrapper<QualityTemplatePO> wrapper = Wrappers.lambdaQuery(QualityTemplatePO.class);

        // 构建查询条件
        if (StringUtils.hasText(query.getTemplateName())) {
            wrapper.like(QualityTemplatePO::getTemplateName, query.getTemplateName());
        }
        if (query.getStatus() != null) {
            wrapper.eq(QualityTemplatePO::getStatus, query.getStatus());
        }

        wrapper.orderByDesc(QualityTemplatePO::getCreatedDate);

        // 执行分页查询
        IPage<QualityTemplatePO> result = qualityTemplateRepository.selectPage(PageUtil.page(query), wrapper);

        // 转换结果
        List<QualityTemplateVO> records = QualityTemplateConvertor.INSTANCE.toQualityTemplateVOList(result.getRecords());

        return PageResult.of(
                records,
                result.getTotal(),
                result.getSize(),
                result.getCurrent()
        );
    }
}
```

### 4.4 Convertor (MapStruct)

```java
package com.yss.quality.repository.convertor;

import com.yss.quality.client.vo.QualityTemplateVO;
import com.yss.quality.repository.entity.QualityTemplatePO;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper
public interface QualityTemplateConvertor {
    QualityTemplateConvertor INSTANCE = Mappers.getMapper(QualityTemplateConvertor.class);

    QualityTemplateVO toQualityTemplateVO(QualityTemplatePO po);

    List<QualityTemplateVO> toQualityTemplateVOList(List<QualityTemplatePO> pos);
}
```

## 5. 注意事项 (Notes)

1.  **AuditableEntity**: 推荐业务 PO 继承此基类，以便自动维护审计信息。
2.  **Lombok 使用**: 使用 `@RequiredArgsConstructor` 进行构造器注入是推荐的最佳实践。
3.  **Wrapper 使用**: 优先使用 `Wrappers.lambdaQuery()` 而不是字符串列名，以提高重构安全性。
4.  **分页工具**: 使用 `PageUtil` 统一处理分页参数，避免手动计算 offset。
