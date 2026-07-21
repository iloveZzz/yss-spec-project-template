---
name: yss-backend-scaffold-application
description: YSS 管理服务应用层开发框架和技术指南。在实现应用服务、用例协调或 DTO 转换时需要用到。
---

# Application 层开发规范 (Application Layer Development Guide)

本 Skill 提供了 YSS 数据质量管理服务 **Application (应用层)** 的开发规范。Application 层负责协调领域对象完成业务用例，是连接 Adapter 层和 Domain 层的桥梁。

## 1. 核心职责 (Core Responsibilities)

- **业务用例编排 (Use Case Orchestration)**: 协调 Domain Service 和 Gateway 完成复杂的业务流程。
- **服务接口实现 (Service Implementation)**: 实现 Application Service 接口，对外提供业务能力。
- **DTO 转换 (DTO Conversion)**: 负责将 Domain 对象转换为 Adapter 层所需的 DTO/VO。
- **事务控制 (Transaction Management)**: 在应用层进行 `@Transactional` 事务管理。

## 2. 代码结构 (Code Structure)

```
com.yss.{module}.core
├── service                 # 应用服务接口
│   ├── impl                # 应用服务实现
│   └── convertor           # MapStruct 转换器 (App 层专用)
├── component               # 业务组件 (Exporter, Handler)
└── job                     # 任务执行逻辑 (Runner, Func)
```

## 3. 开发规范 (Development Guidelines)

### 3.1 应用服务实现 (ServiceImpl)

- **位置**: `com.yss.{module}.core.service.impl`。
- **注解**: `@Service`，通常配合 `@RequiredArgsConstructor` 进行构造器注入。
- **事务**: 在写操作方法上添加 `@Transactional` 注解。
- **逻辑**: 主要负责调用 Domain Service 或 Gateway，**不应包含核心领域逻辑**（应下沉到 Domain 层）。

### 3.2 对象转换 (Convertor)

- **工具**: MapStruct。
- **位置**: `com.yss.{module}.core.service.convertor`。
- **职责**: 将 `Domain Object` (VO/Entity) 转换为 `Application VO` 或 `Client VO`。
- **规范**: 定义 `INSTANCE` 常量，使用 `Mappers.getMapper(...)` 获取实例。

### 3.3 异常处理

- **业务异常**: 抛出 `BizException` 或其子类。
- **系统异常**: 抛出 `RuntimeException`，由全局异常处理器捕获。

## 4. 详细案例 (Detailed Examples)

### 4.1 Application Service Implementation

```java
package com.yss.quality.core.service.impl;

import com.yss.cloud.dto.result.PageResult;
import com.yss.quality.client.dto.cmd.QualityTemplateAddCmd;
import com.yss.quality.client.dto.query.QualityTemplatePage;
import com.yss.quality.client.vo.QualityTemplateVO;
import com.yss.quality.domain.template.gateway.QualityTemplateGateway;
import com.yss.quality.domain.template.service.QualityTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 数据质量规则模板应用服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QualityTemplateServiceImpl implements QualityTemplateService {

    private final QualityTemplateGateway qualityTemplateGateway;

    @Override
    public PageResult<QualityTemplateVO> pageQualityTemplate(QualityTemplatePage query) {
        // 直接调用 Domain Gateway
        return qualityTemplateGateway.pageQualityTemplate(query);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long addQualityTemplate(QualityTemplateAddCmd cmd) {
        // 可以在此进行简单的应用层校验或编排
        log.info("Adding quality template: {}", cmd.getTemplateName());
        return qualityTemplateGateway.addQualityTemplate(cmd);
    }
}
```

### 4.2 Convertor (MapStruct)

```java
package com.yss.quality.core.service.convertor;

import com.yss.quality.client.vo.QualityTechTemplateVO;
import com.yss.quality.client.vo.QualityTemplateVO;
import com.yss.quality.params.base.PluginParams;
import org.mapstruct.Mapper;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS
)
public interface QualityTechTemplateConvertor {
    QualityTechTemplateConvertor INSTANCE = Mappers.getMapper(QualityTechTemplateConvertor.class);

    // 将 Domain VO 和 PluginParams 组合转换为 TechTemplateVO
    QualityTechTemplateVO useQualityTechTemplateVO(QualityTemplateVO qualityTemplateVO, List<PluginParams> pluginParams);
}
```

## 5. 注意事项 (Notes)

1.  **职责分离**: Application 层关注“做什么”（流程编排），Domain 层关注“怎么做”（业务规则）。
2.  **依赖方向**: Application 层依赖 Domain 层，不应依赖 Adapter 层（Web/Job）。
3.  **事务边界**: Application Service 方法通常是一个事务的边界。
4.  **日志记录**: 在关键业务节点记录日志，便于问题排查。

## 6. 阶段 7 合同

- 明确当前 Use Case、Application 边界、事务边界、跨聚合协调和异常映射，只消费批准后的合同版本。
- AppService 骨架可受控生成；用例编排、事务、幂等、权限和失败行为必须使用 `behavior-tdd`。
- 返回统一 `YSS Skill Execution Result`，证据至少包含 Application 代码、测试、MapStruct/Lombok 条件和实际 `./mvnw ...` 结果。
