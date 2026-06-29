---
name: "yss-backend-scaffold-adapter"
description: "YSS 后端开发脚手架的适配器层开发框架和技术指南。在实现 Web 控制器、调度器或外部系统适配器时调用。"
---

# Adapter Layer Development Guide

本技能为开发 YSS 后端开发脚手架服务的**适配器层**（接口层）提供指导和框架。
适配器层负责处理外部请求（HTTP、计划任务），并将其适配到应用层，以及为外部系统（连接器、执行器）实现插件式适配器。

## 1. 核心职责 (Core Responsibilities)

The Adapter Layer serves as the entry point and integration point of the system:

- **Web Adapter (REST API)**: Handles HTTP requests, validates input, calls Application Services, and formats responses (standard `Result` wrappers).
- **Job Adapter (Scheduler)**: Adapts scheduled task triggers (e.g., DolphinScheduler, Quartz) to Application logic.
- **SPI Adapter (Plugins)**: Implements specific technical adapters defined by the Domain or Application layer (e.g., specific Database Connectors, Rule Executors).

## 2. 代码结构 (Code Structure)

Depending on the module type (Web Application or Plugin), the structure varies:

### 2.1 Web Adapter (Usually in `bootstrap` or `web` module)

```
com.yss.{module}.rest
├── {Domain}Controller.java      # REST API 控制器
└── {Domain}ReportController.java # 报表/统计类控制器
```

### 2.2 Scheduler Adapter (In `adapter/scheduler` module)

```
com.yss.{module}.scheduler
└── {Domain}ScheduleServiceImpl.java # 调度服务实现 (实现 API 接口)
```

### 2.3 Plugin Adapter (In `adapter/connector` or `adapter/executor` modules)

```
com.yss.{module}.executor
├── {Tech}Executor.java          # 执行器实现 (e.g., MybatisExecutor)
└── {Tech}DataSource.java        # 数据源适配实现
```

## 3. 开发规范 (Development Guidelines)

### 3.1 Web Controller 规范

- **注解**: 使用 `@RestController` 和 `@RequestMapping("/api/{module}/{resource}")`。
- **依赖注入**: 优先注入 **Application Service** (`XxxService`)。对于简单的查询 (CQRS)，允许直接注入 **Domain Gateway** (`XxxGateway`)。
- **请求参数**:
  - `POST`/`PUT` 使用 `@RequestBody` 接收 `Cmd` 对象 (e.g., `QualityRuleAddCmd`)。
  - `GET` 使用 `Query` 对象或 `@RequestParam` (e.g., `QualityRulePage`)。
  - 必须使用 `@Valid` 进行参数校验。
- **响应格式**: 必须使用统一的 `Result` 包装器：
  - 单个对象: `SingleResult<T>`
  - 列表对象: `MultiResult<T>`
  - 分页对象: `PageResult<T>`

### 3.2 Scheduler Adapter 规范

- **接口实现**: 实现 `adapter-api` 定义的接口 (e.g., `QualityScheduleService`)。
- **条件加载**: 使用 `@ConditionalOnProperty` 支持多调度引擎切换 (e.g., `dolphin`, `quartz`)。
- **异常处理**: 捕获运行时异常并转换为调度系统可识别的状态。

### 3.3 Plugin Adapter 规范

- **SPI 模式**: 实现核心定义的接口 (Interface)，不包含业务逻辑，仅负责技术适配。
- **上下文隔离**: 插件应包含自己独立的配置和依赖，避免污染核心上下文。

## 4. 代码示例 (Code Examples)

### 4.1 Web Controller (REST API)

```java
package com.yss.{module}.rest;

import com.yss.cloud.dto.result.PageResult;
import com.yss.cloud.dto.result.SingleResult;
import com.yss.{module}.client.dto.cmd.{Domain}AddCmd;
import com.yss.{module}.client.dto.cmd.{Domain}UpdateCmd;
import com.yss.{module}.client.dto.query.{Domain}Page;
import com.yss.{module}.client.vo.{Domain}VO;
import com.yss.{module}.core.service.{Domain}Service;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * {Domain} 管理控制器
 */
@RestController
@RequestMapping("/api/{module}/{domain}")
@RequiredArgsConstructor
public class {Domain}Controller {

    private final {Domain}Service {domain}Service;

    /**
     * 分页查询
     */
    @PostMapping("/page")
    public PageResult<{Domain}VO> page(@Valid @RequestBody {Domain}Page query) {
        return {domain}Service.page(query);
    }

    /**
     * 新增
     */
    @PostMapping
    public SingleResult<Long> add(@Valid @RequestBody {Domain}AddCmd cmd) {
        return SingleResult.of({domain}Service.add(cmd));
    }

    /**
     * 更新
     */
    @PutMapping
    public SingleResult<Boolean> update(@Valid @RequestBody {Domain}UpdateCmd cmd) {
        {domain}Service.update(cmd);
        return SingleResult.of(true);
    }
}
```

### 4.2 Scheduler Adapter (Task Runner)

```java
package com.yss.{module}.scheduler;

import com.yss.{module}.scheduler.api.QualityScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yss.scheduler", name = "plugin", havingValue = "dolphin")
public class DolphinScheduleServiceImpl implements QualityScheduleService {

    private final QualityScheduleGateway qualityScheduleGateway;
    // External Scheduler Facade
    // private final SchedulerFacadeApi schedulerFacadeApi;

    @Override
    public List<QualityScheduleVO> listSchedules(QualityScheduleQuery query) {
        return qualityScheduleGateway.list(query);
    }

    @Override
    public Long addSchedule(QualityScheduleAddCmd cmd) {
        // 适配 DolphinScheduler 的创建逻辑
        // Long code = schedulerFacadeApi.createTask(cmd);
        // cmd.setScheduleCode(String.valueOf(code));
        return qualityScheduleGateway.add(cmd);
    }
}
```

### 4.3 Executor Adapter (MyBatis Plugin)

```java
package com.yss.{module}.executor;

import com.yss.cloud.exception.SysException;
import com.yss.quality.executor.Executor;
import com.yss.quality.executor.cmd.QualityRuleResultSingleCmd;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.LinkedHashMap;

@Component
@Slf4j
public class MybatisExecutor implements Executor {

    @Override
    public LinkedHashMap<String, Object> execute(QualityRuleResultSingleCmd cmd) {
        try {
            // 构建 MyBatis 执行上下文
            // ApiCmd apiCmd = ...
            // 执行查询
            // return data;
            return new LinkedHashMap<>();
        } catch (Exception e) {
            log.error("MyBatis execution failed: {}", e.getMessage());
            throw new SysException("Execution failed: " + e.getMessage());
        }
    }

    @Override
    public String engineType() {
        return "MYBATIS";
    }
}
```
