# 分层 MVC 架构

新建默认 YSS `4.0.0-SNAPSHOT` / Boot `4.1.2` / Java `17`。五项必填、3.2 选择与完整自定义见 [命令示例](../../yss-ddd-scaffold-generator/references/command-examples.md)，显式技术值优先，仅补齐唯一组合。

## 当前生成边界

现装 CLI 支持时使用 `yss scaffold mvc` 生成新目标，参数与模块以实际帮助和产物为准。当前核心模块为 `server`、`service`、`repository`，产物为 Java 空骨架、POM、机械启动配置、Maven Wrapper 与 `.yss/scaffold.json` 来源收据。

业务 API、DTO、字段、查询、状态、事务规则、权限、错误映射和 Mock 数据按后续需求实现。项目根 `.agents/skills/yss-ddd-scaffold-generator/assets/reference` 保留独立 ReferenceEntry 教学资料，按需参考。

## 职责和依赖

对象命名及阿里/COLA 适配参考 `.template-spec/agents/backend-architecture-profiles.md` 的“对象命名与外部规范适配”，具体类型沿用工程基线与当前需求。

| 模块 | 职责 | 依赖方向 |
|---|---|---|
| `server` | Spring Boot 启动、Controller、公开 DTO、校验与 Web 配置 | `service` |
| `service` | 应用服务、事务脚本和用例编排 | `repository` |
| `repository` | PO、Mapper、SQL 与数据库访问 | 保持持久层边界 |

外部适配或发布客户端等额外模块按实际需求设计，生成前核对现装 CLI 是否支持。已有 MVC 工程的 Service 继续承担规则和事务，维护时先读取现有结构并增量修改。

复杂领域行为的架构选择由实际业务与工程决定，需要调整架构时说明影响并按用户授权推进。
