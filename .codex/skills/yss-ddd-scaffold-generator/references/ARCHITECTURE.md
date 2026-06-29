# DDD 分层架构参考文档

## 1. 架构概述

本脚手架采用 DDD（领域驱动设计）分层架构，将系统划分为四个核心层次：

```
┌─────────────────────────────────────────────────────────────┐
│                         Adapter 层                           │
│                    (外部接口适配)                             │
├─────────────────────────────────────────────────────────────┤
│                       Application 层                         │
│                    (业务用例编排)                             │
├─────────────────────────────────────────────────────────────┤
│                         Domain 层                            │
│                    (核心业务逻辑)                             │
├─────────────────────────────────────────────────────────────┤
│                     Infrastructure 层                        │
│                      (技术实现)                              │
└─────────────────────────────────────────────────────────────┘
```

## 2. 各层职责

### 2.1 Domain 层（领域层）

**职责**:

- 定义核心业务模型和规则
- 定义数据传输对象（DTO）
- 定义网关接口（Gateway）
- 不包含任何技术实现细节

**包结构**:

```
com.yss.datamiddle.{module}
├── client/dto/
│   ├── cmd/        # 命令对象（写操作）
│   ├── query/      # 查询对象（读操作）
│   └── vo/         # 值对象（返回结果）
└── domain/
    ├── gateway/    # 网关接口
    ├── model/      # 领域模型
    └── service/    # 领域服务
```

**关键规范**:

- Command 继承 `CommandDTO`，使用 JSR-303 校验
- Query 继承 `PageQuery` 或 `QueryDTO`
- VO 实现 `Serializable` 接口
- Gateway 定义标准 CRUD 方法

### 2.2 Application 层（应用层）

**职责**:

- 业务用例编排
- 协调领域对象完成业务能力
- 处理事务边界
- 对象转换（DTO ↔ Domain）

**包结构**:

```
com.yss.datamiddle.{module}.core
├── service/
│   ├── impl/       # 服务实现
│   └── convertor/  # MapStruct 转换器
├── component/      # 业务组件
└── job/            # 任务执行逻辑
```

**关键规范**:

- Service 使用 `@RequiredArgsConstructor` 注入依赖
- 写操作添加 `@Transactional` 注解
- 使用 MapStruct 进行对象转换

### 2.3 Infrastructure 层（基础设施层）

**职责**:

- 实现 Domain 层定义的 Gateway 接口
- 数据持久化（Repository）
- 外部服务集成
- 配置管理

**包结构**:

```
com.yss.datamiddle.{module}.repository
├── entity/         # PO 对象
├── gateway/impl/   # Gateway 实现
├── convertor/      # 转换器
└── {Domain}Repository.java
```

**关键规范**:

- PO 继承 `AuditableEntity`
- Repository 继承 `BasePlusRepository`
- 使用 `Wrappers.lambdaQuery()` 构建查询

### 2.4 Adapter 层（适配器层）

**职责**:

- 处理外部请求（HTTP、MQ、RPC）
- 参数校验
- 响应格式化
- 异常处理

**包结构**:

```
com.yss.datamiddle.{module}.rest
└── {Domain}Controller.java
```

**关键规范**:

- Controller 使用 `@RestController`
- 参数使用 `@Valid` 校验
- 响应使用 `SingleResult`、`PageResult`、`MultiResult` 包装

## 3. 依赖关系

```
Bootstrap -> Application -> Domain
Infrastructure <-> Adapter (依赖倒置)
```

**依赖原则**:

- Domain 层不依赖任何其他层
- Application 层依赖 Domain 层
- Infrastructure 层依赖 Domain 层（实现 Gateway）
- Adapter 层依赖 Application 层
- Bootstrap 层依赖所有层

## 4. 调用链路

```
Controller -> Service -> Gateway -> Repository -> Database
     ↓         ↓         ↓          ↓
   DTO/VO <- DTO/VO <- Domain <- PO
```

## 5. 命名规范

| 类型       | 后缀        | 说明                   | 示例            |
| ---------- | ----------- | ---------------------- | --------------- |
| 持久化对象 | PO          | Persistent Object      | UserPO          |
| 值对象     | VO          | Value Object           | UserVO          |
| 命令对象   | Cmd         | Command                | UserAddCmd      |
| 查询对象   | Query       | Query                  | UserPageQuery   |
| 网关接口   | Gateway     | Gateway                | UserGateway     |
| 服务接口   | Service     | Service                | UserService     |
| 服务实现   | ServiceImpl | Service Implementation | UserServiceImpl |
| 控制器     | Controller  | Controller             | UserController  |
| 仓储接口   | Repository  | Repository             | UserRepository  |

## 6. 最佳实践

### 6.1 CQRS 模式

- 简单查询可以直接调用 Gateway
- 复杂业务逻辑通过 Service 编排

### 6.2 事务管理

- 事务边界在 Application 层
- 使用 `@Transactional(rollbackFor = Exception.class)`

### 6.3 异常处理

- 业务异常抛出 `BizException`
- 系统异常由全局异常处理器捕获

### 6.4 日志规范

- 使用 SLF4J + Logback
- 关键业务节点记录日志
- 日志级别：DEBUG、INFO、WARN、ERROR

## 7. 参考资料

- [YSS 后端开发规范](./yss-backend-scaffold-parent/SKILL.md)
- [Domain 层开发指南](./yss-backend-scaffold-domain/SKILL.md)
- [Application 层开发指南](./yss-backend-scaffold-application/SKILL.md)
- [Infrastructure 层开发指南](./yss-backend-scaffold-infrastructure/SKILL.md)
- [Web Adapter 开发指南](./yss-backend-scaffold-web/SKILL.md)
