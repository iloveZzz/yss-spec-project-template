---
name: yss-backend-scaffold-adapter
description: Use when implementing a YSS backend Web, scheduler, connector, or SPI adapter around an approved application boundary.
---

# YSS Backend Scaffold Adapter

本技能用于 YSS 后端适配器层。它覆盖 Web、计划任务和插件/SPI 适配；只负责把外部协议或技术实现接到已批准的 Application / Domain 边界，不承载业务规则。

## 何时使用

- 实现调度器、任务触发器或外部系统连接器。
- 实现插件式执行器、数据源或其他 SPI adapter。
- Web 入口同时涉及调度/插件适配时，与 `yss-backend-scaffold-web`、`yss-web-controller` 配合使用。

仅 REST Controller / DTO 变更时，使用 `yss-backend-scaffold-web`、`yss-web-controller` 和 `yss-dto`；不要因为 Controller 位于 adapter 模块就加载本技能。

## 核心职责

- **Web Adapter**：接收 HTTP 请求、校验输入、调用 Application Service，并使用统一 `Result` 包装响应。
- **Job Adapter**：将 DolphinScheduler、Quartz 等调度触发适配到 Application 用例；使用条件装配支持引擎切换。
- **SPI Adapter**：实现 Domain / Application 定义的技术接口，隔离连接器、执行器和外部依赖，不复制业务规则。

## 代码结构

```text
com.yss.{module}.rest
├── {Domain}Controller.java
└── {Domain}ReportController.java

com.yss.{module}.scheduler
└── {Domain}ScheduleServiceImpl.java

com.yss.{module}.executor
├── {Tech}Executor.java
└── {Tech}DataSource.java
```

## 实现约束

- Web Adapter 使用 `@RestController`、`@RequestMapping`、`@Valid` 和 `SingleResult` / `MultiResult` / `PageResult`；复杂写操作调用 Application Service。
- Scheduler Adapter 实现 `adapter-api` 契约，使用 `@ConditionalOnProperty` 隔离具体调度引擎，并把运行时异常转换为调度系统可识别的状态。
- Plugin Adapter 只实现接口和技术转换，独立管理配置与依赖；不得把外部 SDK、PO、Mapper 或 HTTP 细节泄漏到 Domain。
- 不在 Adapter 中捕获通用 `Exception`、编排跨聚合事务或直接访问 Repository；发现边界变化时返回 `new_impacts` 并暂停工作单元。

## 阶段 7 合同

- 只消费批准的 Slice Implementation Contract、OpenAPI/no-impact record 和已登记的实现仓库路径。
- Adapter 行为、权限、错误映射、调度状态和外部交互使用 `behavior-tdd`；纯接口/配置骨架才可标记 `controlled-generation`。
- 返回统一 `YSS Skill Execution Result`，包含 changed/evidence files、实际验证、`seam_deferred`、偏离和 `new_impacts`。
