---
name: "yss-backend-scaffold-web"
description: "YSS 管理服务的 Web Adapter 开发框架和技术指南。在实现 REST API 控制器、请求处理和响应格式化时需要用到。"
---

# Web Adapter Layer Development Guide

本技能为开发 YSS 服务的**Web 适配器层**（REST API）提供指导和框架。
Web 适配器负责通过 HTTP 公开业务功能、处理输入验证和格式化响应。

## 1. 核心职责 (Core Responsibilities)

- **Request Handling**: Map HTTP requests (GET, POST, PUT, DELETE) to Java methods.
- **Input Validation**: Validate request bodies and parameters using JSR-303/380 annotations (`@Valid`, `@NotNull`, etc.).
- **Response Formatting**: Wrap business results into standard `Result` objects (`SingleResult`, `PageResult`, `MultiResult`).
- **Orchestration Delegation**: Delegate business logic to the **Application Service**. Simple queries can be delegated directly to the **Domain Gateway** (CQRS pattern).

## 2. 代码结构 (Code Structure)

Web Adapters are typically located in the `bootstrap` module or a dedicated `web` module.

```
com.yss.{module}.rest
├── {Domain}Controller.java      # Main REST Controller
└── {Domain}ReportController.java # Optional: For reporting/stats APIs
```

## 3. 开发规范 (Development Guidelines)

### 3.1 Controller 定义

- **注解**: 使用 `@RestController`。
- **路径**: `@RequestMapping("/api/{module}/{domain}")` (e.g., `/api/quality/rule`).
- **依赖注入**: 使用 Lombok `@RequiredArgsConstructor` 进行构造器注入。
- **命名**: `{Domain}Controller` (e.g., `QualityRuleController`).

### 3.2 依赖注入原则

- **写操作/复杂逻辑**: 必须注入 **Application Service** (`XxxService`)。
- **读操作 (Query)**: 允许直接注入 **Domain Gateway** (`XxxGateway`) 以减少样板代码 (CQRS)。

### 3.3 参数与响应

- **Command (写)**: 使用 `@PostMapping`/`@PutMapping` + `@RequestBody` + `{Domain}Cmd` 对象。
- **Query (读)**: 使用 `@PostMapping` (for complex search) + `@RequestBody` + `{Domain}Page/Query` 对象。
- **Wrapper**:
  - `SingleResult<T>`: 单个对象或基本类型。
  - `MultiResult<T>`: 列表。
  - `PageResult<T>`: 分页数据。
- **Validation**: 必须在参数前添加 `@Valid` 注解。

### 3.4 异常处理

- **不要**在 Controller 中捕获通用异常 (`Exception`)。
- 让全局异常处理器 (`GlobalExceptionHandler`) 统一处理运行时异常。
- 仅在需要特定 HTTP 状态码转换时捕获特定异常。

## 4. 代码示例 (Code Examples)

### 4.1 标准 CRUD Controller

```java
package com.yss.{module}.rest;

import com.yss.cloud.dto.result.MultiResult;
import com.yss.cloud.dto.result.PageResult;
import com.yss.cloud.dto.result.SingleResult;
import com.yss.{module}.client.dto.cmd.{Domain}AddCmd;
import com.yss.{module}.client.dto.cmd.{Domain}UpdateCmd;
import com.yss.{module}.client.dto.cmd.{Domain}StatusCmd;
import com.yss.{module}.client.dto.query.{Domain}Page;
import com.yss.{module}.client.vo.{Domain}VO;
import com.yss.{module}.core.service.{Domain}Service;
// Optional: Import Gateway for direct queries
// import com.yss.{module}.domain.gateway.{Domain}Gateway;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * {Domain} 管理控制器
 *
 * @author {User}
 */
@RestController
@RequestMapping("/api/{module}/{domain-path}")
@RequiredArgsConstructor
public class {Domain}Controller {

    private final {Domain}Service {domainVar}Service;
    // private final {Domain}Gateway {domainVar}Gateway; // For CQRS if needed

    /**
     * 分页查询 {Domain}
     *
     * @param query 查询条件
     * @return 分页结果
     */
    @PostMapping("/page")
    public PageResult<{Domain}VO> page(@Valid @RequestBody {Domain}Page query) {
        return {domainVar}Service.page(query);
    }

    /**
     * 根据ID查询详情
     *
     * @param id 主键ID
     * @return 详情对象
     */
    @GetMapping("/detail/{id}")
    public SingleResult<{Domain}VO> detail(@PathVariable String id) {
        return SingleResult.of({domainVar}Service.detail(id));
    }

    /**
     * 新增 {Domain}
     *
     * @param cmd 新增命令
     * @return 新增结果 (通常是ID或完整对象)
     */
    @PostMapping
    public SingleResult<Long> add(@Valid @RequestBody {Domain}AddCmd cmd) {
        return SingleResult.of({domainVar}Service.add(cmd));
    }

    /**
     * 更新 {Domain}
     *
     * @param cmd 更新命令
     * @return 更新结果
     */
    @PutMapping
    public SingleResult<Boolean> update(@Valid @RequestBody {Domain}UpdateCmd cmd) {
        {domainVar}Service.update(cmd);
        return SingleResult.of(true);
    }

    /**
     * 状态变更 (启用/禁用)
     *
     * @param cmd 状态命令
     * @return 变更后的状态
     */
    @PostMapping("/enabled")
    public SingleResult<Integer> switchStatus(@Valid @RequestBody {Domain}StatusCmd cmd) {
        {domainVar}Service.switchStatus(cmd);
        return SingleResult.of(cmd.getStatus());
    }
}
```

### 4.2 复杂业务操作示例

```java
    /**
     * 执行业务操作 (e.g. 立即运行检查)
     *
     * @param cmd 执行命令
     * @return 执行结果ID
     */
    @PostMapping("/execute")
    public SingleResult<String> execute(@Valid @RequestBody {Domain}ExecuteCmd cmd) {
        // 调用 Service 处理复杂业务逻辑
        return SingleResult.of(
                {domainVar}Service.execute(cmd)
        );
    }
```
