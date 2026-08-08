---
name: yss-backend-scaffold-application
description: Use when implementing YSS application use cases, transaction boundaries, cross-aggregate orchestration, idempotency, or application-level DTO conversion.
---

# Application 层开发规范 (Application Layer Development Guide)

本 Skill 约束 Application 层的用例边界。它是目标 DDD 架构规则，不等同于现有 YSS 组件仓库中所有 `core/service` 的历史实现；先探测工程布局并记录兼容 profile。

## 1. 核心职责 (Core Responsibilities)

- **业务用例编排 (Use Case Orchestration)**: 协调 Domain Service 和 Gateway 完成复杂的业务流程。
- **服务接口实现 (Service Implementation)**: 实现 Application Service 接口，对外提供业务能力。
- **DTO 转换 (DTO Conversion)**: 只在合同指定时负责 Domain/Application model 与 client/web DTO/VO 的转换；不得把 Repository PO 带入 Application。
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

### 3.1 应用服务实现 (AppServiceImpl)

- **位置**: 新 DDD 工程优先 `application/.../service/impl`；legacy profile 才使用 `core/service/impl`。
- **注解**: `@Service`，通常配合 `@RequiredArgsConstructor` 进行构造器注入。
- **事务**: 只在已确认的用例边界添加 `@Transactional(rollbackFor = Exception.class)`；读用例明确 `readOnly` 与总数策略。
- **逻辑**: 主要负责调用 Domain Service 或 Gateway，**不应包含核心领域逻辑**（应下沉到 Domain 层）。

### 3.2 对象转换 (Convertor)

- **工具**: MapStruct。
- **位置**: `com.yss.{module}.core.service.convertor`。
- **职责**: 将 `Domain Object` (VO/Entity) 转换为 `Application VO` 或 `Client VO`。
- **规范**: 定义 `INSTANCE` 常量，使用 `Mappers.getMapper(...)` 获取实例。

### 3.3 异常处理

- **业务异常**: 使用 `ExceptionFactory.bizException(...)` 或项目已批准的 `BizException` 错误码。
- **已知系统异常**: 使用 `ExceptionFactory.sysException(...)` 并保留 cause；未知异常交由全局处理器兜底，不在 Application 吞并或改写。

## 4. Legacy 参考案例

以下 `QualityTemplate*` 代码只展示现有 `core/service` 风格，不定义新模块的包名、接口或返回模型。新 DDD profile 必须由批准合同生成中性 Application 接口，不能复制该历史样例的 DTO/VO Gateway 泄漏。

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
        log.info("Adding quality template");
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
3.  **事务边界**: 一个用例一个边界；跨聚合写入、幂等键、事件发布时点必须写入合同并用 `behavior-tdd` 验证。
4.  **上下文能力**: 当前用户、审计、普通技术日志、校验和异常是条件依赖，按 `yss-router` 影响闭包加载，不在 AppService 内手工解析 Header/JWT。

## 6. 架构探测门禁

先确认工程是新 DDD `application/domain/infrastructure/adapter`，还是 legacy `core/client/repository`。没有 `backend_repository`、Maven Wrapper 和已批准合同版本时输出 `blocked`；不得用示例包名推断真实接口。

## 7. 阶段 7 合同

- 明确当前 Use Case、Application 边界、事务边界、跨聚合协调和异常映射，只消费批准后的合同版本。
- AppService 骨架可受控生成；用例编排、事务、幂等、权限和失败行为必须使用 `behavior-tdd`。
- 返回统一 `YSS Skill Execution Result`，证据至少包含 Application 代码、测试、MapStruct/Lombok 条件和实际 `./mvnw ...` 结果。
