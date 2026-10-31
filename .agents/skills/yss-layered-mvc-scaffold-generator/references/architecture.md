# 通用分层 MVC 架构合同

## 模块闭包

| 能力 | 解析模块 |
|---|---|
| 核心 | `server`、`service`、`repository` |
| `external-integration` | `adapter` |
| `published-client` | `client` |
| `feign-client` | `client`、`feign-client` |

合同保存 `requested_capabilities`、`resolved_modules` 和 `resolution_version: 1`。模块按 `server`、`service`、`repository`、`adapter`、`client`、`feign-client` 的稳定顺序生成。

`mvc-data-analysis-v1` 已退役，仅保留历史六模块身份和只读审计；不再生成治理信封、skillUtils 或 Git。替代入口为通用 MVC 后按需 setup-yss-harness。

## 职责和依赖

对象命名及阿里/COLA 适配消费 `.template-spec/agents/backend-architecture-profiles.md` 的“对象命名与外部规范适配”；具体类型由工程基线和当前设计绑定，生成器只产出机械骨架。

| 模块 | 职责 | 允许依赖 |
|---|---|---|
| `server` | Spring Boot 启动、Controller 装配和 Web 配置 | `service`、可选 `client` |
| `service` | 应用服务、事务脚本和用例编排 | `repository`、可选 `adapter` / `feign-client` |
| `repository` | PO、Mapper、SQL 与数据库访问 | 无本项目上游模块 |
| `adapter` | 外部系统适配实现 | 无本项目上游模块 |
| `client` | 对外稳定调用契约 | 无本项目上游模块 |
| `feign-client` | `client` 的 Feign 实现 | `client` |

MVC 模式不等于禁止领域分析。若技术分析发现聚合不变量、复杂状态机、跨聚合一致性、Domain Event 或复杂并发，Agent 应推荐 `domain-driven`；用户仍选择 MVC 时必须记录覆盖理由和残余风险。局部 Tactical DDD Check 仍可按真实领域影响触发。

## 生成边界

允许生成 POM、Wrapper、启动入口、环境配置、包级占位。业务空工程不生成业务 API、DTO、字段、查询、状态、事务规则、权限、错误映射和 Mock 业务数据；独立参考工程仅生成下述固定参考场景。

新生成默认附带 examples/reference/ 独立 ReferenceEntry reactor；Service 承担规则和事务，Repository 持久化，Server 持有公开 DTO、校验和接口。示例不进入业务构建或扫描。
