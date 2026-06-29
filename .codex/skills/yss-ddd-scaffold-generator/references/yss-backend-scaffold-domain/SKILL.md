---
name: "yss-backend-scaffold-domain"
description: "YSS 管理服务领域层的脚手架和最佳实践。在实现业务逻辑、定义数据网关或创建领域模型时调用。"
---

# Domain 层开发规范 (Domain Layer Development Guide)

本 Skill 提供了 YSS 数据质量管理服务 **Domain (领域层)** 的开发规范。Domain 层是系统的核心，包含业务逻辑、领域模型和接口定义。

## 1. 核心职责 (Core Responsibilities)

- **定义业务模型 (Model)**: 包含实体 (Entity)、值对象 (VO)、聚合根 (Aggregate Root)。
- **定义服务接口 (Gateway/Service)**: 定义与 Infrastructure 层交互的接口 (Gateway) 以及领域内部服务 (Domain Service)。
- **定义数据契约 (DTO)**: 定义 Command (增删改), Query (查询), VO (视图) 等数据传输对象。
- **业务逻辑实现**: 核心业务规则的校验和处理。

## 2. 代码结构 (Code Structure)

```
com.yss.{module}
├── client                  # 对外暴露的数据契约 (DTOs)
│   ├── dto
│   │   ├── cmd             # Command: 写操作参数 (e.g., QualityRuleAddCmd)
│   │   └── query           # Query: 读操作参数 (e.g., QualityRulePage)
│   └── vo                  # Value Object: 返回结果 (e.g., QualityBusinessRuleVO)
└── domain                  # 领域核心实现
    └── {domain_name}       # 具体的领域模块 (e.g., user, metadata)
        ├── gateway         # 网关接口定义 (e.g., UserGateway)
        ├── model           # 领域实体/枚举 (e.g., User, UserType)
        └── service         # 领域服务 (e.g., UserService)
```

## 3. 开发规范 (Development Guidelines)

### 3.1 数据传输对象 (DTO)

- **Command (Cmd)**: 用于数据修改 (Create/Update/Delete)。
  - 继承 `com.yss.cloud.dto.CommandDTO`。
  - 使用 Lombok `@Data`。
  - 必须使用 JSR-303/380 注解进行参数校验 (`@NotBlank`, `@NotNull`, `@Size` 等)。
  - **示例**: `QualityRuleAddCmd`

- **Query**: 用于数据查询。
  - 分页查询继承 `com.yss.cloud.dto.page.PageQuery`。
  - 普通查询继承 `com.yss.cloud.dto.QueryDTO`。
  - **示例**: `QualityRulePage`

- **View Object (VO)**: 用于展示层返回数据。
  - 纯 POJO，使用 Lombok `@Data`。
  - **示例**: `QualityBusinessRuleVO`

### 3.2 网关接口 (Gateway)

Gateway 定义了领域层对外的依赖接口，通常由 Infrastructure 层实现。

- **命名**: `DomainName` + `Gateway` (e.g., `QualityTemplateGateway`)。
- **方法定义规范**:
  - **分页查询**: `PageResult<VO> pageXxx(Query query)`
  - **列表查询**: `List<VO> listXxx(Query query)`
  - **单条查询**: `VO getXxxById(Long id)` 或 `VO getXxxByCode(String code)`
  - **新增**: `Long/ResultVO addXxx(Cmd cmd)` (返回 ID 或 结果对象)
  - **更新**: `void/ResultVO updateXxx(Cmd cmd)`
  - **删除**: `void deleteXxx(Cmd cmd)`

### 3.3 领域服务 (Domain Service)

当业务逻辑涉及多个聚合根或不适合放入单一实体时，使用 Domain Service。

- **命名**: `DomainName` + `Service` (e.g., `QualityTemplateService`)。
- **职责**: 编排领域逻辑，调用 Gateway。

### 3.4 常用类与注解

- **分页结果**: `com.yss.cloud.dto.result.PageResult<T>`
- **校验注解**: `javax.validation.constraints.*` (`@NotNull`, `@NotBlank`)
- **Lombok**: `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`

## 4. 详细案例 (Detailed Examples)

### 4.1 Command (新增命令)

```java
package com.yss.quality.client.dto.cmd;

import com.yss.cloud.dto.CommandDTO;
import com.yss.quality.domain.QualityRuleTemplateType;
import com.yss.quality.domain.QualityType;
import com.yss.quality.domain.datasource.entity.DatabaseType;
import com.yss.quality.domain.rule.entity.QualityRuleType;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

/**
 * 数据质量规则模板新增命令对象
 */
@Data
public class QualityTemplateAddCmd extends CommandDTO {

    @NotBlank(message = "模板名称不能为空")
    private String templateName;

    @NotBlank(message = "模板编码不能为空")
    private String templateCode;

    @NotEmpty(message = "数据库类型不能为空")
    private List<DatabaseType> databaseType;

    @NotNull(message = "模板类型不能为空")
    private QualityRuleTemplateType templateType;

    @NotNull(message = "模板规则类型不能为空")
    private QualityType ruleType;

    private String description;

    @NotBlank(message = "异常SQL不能为空")
    private String exceptionCountSql;

    @NotNull
    private String resultLabel;

    private Boolean defaultFlag;

    Map<String, Object> ruleTemplateParam;
}
```

### 4.2 Query (分页查询)

```java
package com.yss.quality.client.dto.query;

import com.yss.cloud.dto.page.PageQuery;
import com.yss.quality.domain.QualityRuleTemplateType;
import com.yss.quality.domain.QualityType;
import lombok.Data;

import javax.validation.constraints.NotNull;

/**
 * 数据质量规则模板查询对象
 */
@Data
public class QualityTemplatePage extends PageQuery {
    /**
     * 模板类型
     */
    private QualityRuleTemplateType templateType;

    /**
     * 规则类型
     */
    @NotNull
    private QualityType ruleType;

    /**
     * 模板名称
     */
    private String templateName;

    private Integer status;
}
```

### 4.3 Gateway (网关接口)

```java
package com.yss.quality.domain.template.gateway;

import com.yss.cloud.dto.result.PageResult;
import com.yss.quality.client.dto.cmd.QualityTemplateAddCmd;
import com.yss.quality.client.dto.cmd.QualityTemplateDeleteCmd;
import com.yss.quality.client.dto.cmd.QualityTemplateUpdateCmd;
import com.yss.quality.client.dto.query.QualityTemplatePage;
import com.yss.quality.client.vo.QualityTemplateVO;

/**
 * 数据质量规则模板网关接口
 */
public interface QualityTemplateGateway {

    /**
     * 分页查询数据质量规则模板
     */
    PageResult<QualityTemplateVO> pageQualityTemplate(QualityTemplatePage query);

    /**
     * 根据ID查询数据质量规则模板
     */
    QualityTemplateVO getQualityTemplateById(Long id);

    /**
     * 新增数据质量规则模板
     */
    Long addQualityTemplate(QualityTemplateAddCmd cmd);

    /**
     * 更新数据质量规则模板
     */
    void updateQualityTemplate(QualityTemplateUpdateCmd cmd);

    /**
     * 删除数据质量规则模板
     */
    void deleteQualityTemplate(QualityTemplateDeleteCmd cmd);
}
```

### 4.4 Domain Service (领域服务)

```java
package com.yss.quality.domain.template.service;

import com.yss.cloud.dto.result.PageResult;
import com.yss.quality.client.dto.cmd.QualityTemplateAddCmd;
import com.yss.quality.client.dto.query.QualityTemplatePage;
import com.yss.quality.client.vo.QualityTemplateVO;

/**
 * 数据质量规则模板服务接口
 */
public interface QualityTemplateService {

    PageResult<QualityTemplateVO> pageQualityTemplate(QualityTemplatePage query);

    QualityTemplateVO getQualityTemplateById(Long id);

    Long addQualityTemplate(QualityTemplateAddCmd cmd);

    // 更多业务方法...
}
```

### 4.5 Value Object (视图对象)

```java
package com.yss.quality.client.vo;

import lombok.Data;
import java.io.Serializable;
import java.util.Map;

/**
 * 数据质量规则模板值对象
 */
@Data
public class QualityTemplateVO implements Serializable {
    private Long id;
    private String templateName;
    private String templateCode;
    private String resultLabel;
    private String databaseType;
    private String qualityRuleType;
    private String qualityType;
    private Map<String,Object> ruleTemplateParam;
    private Boolean defaultFlag;
}
```

## 5. 注意事项 (Notes)

1.  **依赖倒置**: Domain 层**不应依赖** Infrastructure 层或 Web 层。所有外部交互通过 Gateway 接口定义。
2.  **贫血模型 vs 充血模型**: 虽然目前主要是贫血模型 (DTO/VO)，但鼓励将核心业务逻辑下沉到 Domain Model 中。
3.  **参数校验**: 必须在 Cmd 对象中使用注解进行严格的参数校验，Gateway 实现层应进行 `@Valid` 校验。
