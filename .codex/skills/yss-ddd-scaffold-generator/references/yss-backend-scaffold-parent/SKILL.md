---
name: "yss-backend-scaffold-parent"
description: "YSS 服务的后端开发脚手架框架和技术指南。在开发后端功能、创建新模块或检查架构标准时需要用到。"
---

# 赢时胜数据质量管理服务后端开发规范 (YSS Data Quality Backend Dev Guide)

本 Skill 包含了项目的核心技术栈、架构设计原则以及开发规范，旨在帮助开发者快速上手并遵循项目标准。

## 1. 技术栈 (Tech Stack)

### 核心框架

- **JDK**: 8
- **Spring Boot**: 2.7.18
- **Spring Framework**: 5.3.x
- **ORM**: MyBatis Plus (底层封装于 `yss-component-mybatis-starter`)
- **连接池**: HikariCP

### 数据库支持

- **MySQL**: 8.0+
- **Oracle**: 12c+
- **PostgreSQL**: 12+
- **OpenGauss**
- **DuckDB**

### 工具库

- **Lombok**: 减少样板代码
- **Hutool**: Java 通用工具库
- **MapStruct**: 高性能对象映射
- **Jackson**: JSON 处理
- **Guava**: Google 核心库

### 构建工具

- **Maven**: 3.x (请使用项目根目录下的 `./mvnw` 脚本进行构建)

## 2. 架构设计 (Architecture)

项目采用基于 DDD (领域驱动设计) 的分层架构：

### 分层职责

1.  **Adapter (适配层)**: `adapter`
    - 处理外部请求 (Web API, Job Runner)
    - 适配数据库连接器
2.  **Application (应用层)**: `application`
    - 业务用例编排
    - Command/Query/Event Handlers
3.  **Domain (领域层)**: `domain`
    - 核心业务逻辑
    - 包含：聚合根, 实体, 值对象, 领域服务, 仓储接口
4.  **Infrastructure (基础设施层)**: `infrastructure`
    - 仓储接口实现 (Repository Impl)
    - 外部服务适配
    - 配置管理

### 模块依赖

`Bootstrap` -> `Application` -> `Domain`
`Infrastructure` <-> `Adapter` (依赖倒置)

## 3. 开发规范 (Development Guidelines)

### 命名规范

- **PO (Persistent Object)**: 持久化对象，对应数据库表。
- **VO (Value Object)**: 视图对象，用于 API 返回。
- **CMD (Command)**: 命令对象，用于增删改操作参数。
- **Query**: 查询对象，用于查询条件参数。

### 调用链路

标准的调用流向为：
`Controller` -> `Service` -> `Gateway/Domain` -> `Repository` -> `Database`

数据流向：
`DTO/VO` <- `DTO/VO` <- `Domain Model` <- `PO`

### Repository 开发

- 接口继承 `BasePlusRepository<PO>`。
- 实体类字段使用 `@TableField` 映射。
- 主键使用 `@TableId(value = "id", type = IdType.ASSIGN_ID)`。
- 实体类继承 `AuditableEntity` 以自动处理审计字段 (创建人、时间等)。

### 对象转换

- 必须使用 **MapStruct** 进行对象转换。
- 定义接口并添加 `@Mapper` 注解。

### API 设计

- 遵循 RESTful 风格 (GET/POST/PUT/DELETE)。
- 使用统一响应包装类：
  - 单个对象: `SingleResult<T>`
  - 列表: `MultiResult<T>`
  - 分页: `PageResult<T>`

## 4. 常用命令

```bash
# 清理并编译
./mvnw clean compile

# 打包 (跳过测试)
./mvnw clean package -DskipTests
```
