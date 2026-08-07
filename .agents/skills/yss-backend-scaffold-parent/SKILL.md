---
name: yss-backend-scaffold-parent
description: Use when establishing or reviewing a YSS backend scaffold parent project, module boundaries, shared build rules, or engineering baseline.
---

# YSS Backend Scaffold Parent

本技能是 YSS 后端脚手架的工程基线入口。它确认目标实现仓库的技术栈、模块边界、依赖方向、公共 DTO / Gateway / Repository 约定和构建验证；不替代垂直切片专项技能，也不把示例代码当作业务实现。

## 1. 使用边界

- 新建后端工程或执行 `yss-ddd-scaffold-generator` 后，先使用本技能检查父工程和模块边界。
- 已有工程改造时，以目标仓库实际 `pom.xml`、`./mvnw`、模块结构和 CI 为准；本技能的示例不能覆盖现有工程事实。
- 业务切片继续按影响面加载 `yss-domain`、`yss-backend-scaffold-application`、`yss-repository`、`yss-backend-scaffold-infrastructure`、`yss-backend-scaffold-web`、`yss-dto` 等专项技能。

## 2. 技术栈与工程事实

- JDK、Spring Boot / Cloud、MyBatis / MyBatis-Plus、数据库和 YSS starter 版本必须从目标实现仓库的父 POM、依赖管理和 source-index 确认，不在本技能中硬编码过时版本。
- Maven 构建、测试、运行、OpenAPI 生成、CI 和 Release 默认使用目标工程根目录的 `./mvnw ...`；确实无法使用 wrapper 时，必须登记受控例外。
- `mvnw`、`mvnw.cmd`、`.mvn/` 和凭据读取约定属于生成工程的基线资产；Maven 凭据只能通过环境变量注入。

## 3. 分层与依赖方向

```text
Adapter / Web -> Application -> Domain <- Infrastructure
Bootstrap 负责组装和启动，不承载业务规则。
```

- **Domain**：聚合、实体、值对象、领域服务和 Gateway / Repository 接口；不得依赖 Application、Infrastructure、Adapter、HTTP、Mapper 或 PO。
- **Application**：用例编排、事务边界、跨聚合协调和 Command / Query handler。
- **Infrastructure**：实现 Domain Gateway / Repository，隔离 PO、Mapper、SQL、外部服务和配置。
- **Adapter / Web**：协议适配、鉴权上下文、参数校验、DTO / VO 转换和统一响应；不得下沉领域规则。
- **Bootstrap**：组装和启动；不得承载业务状态机或持久化逻辑。

标准调用链为：
`Controller / Adapter` -> `Application Use Case / Handler` -> `Domain Aggregate / Domain Service` -> `Gateway / Repository Interface` -> `Infrastructure Implementation` -> `Database / External System`。

数据转换边界为：
`Request DTO / Command / Query` -> `Domain Model` -> `PO / External DTO` -> `Domain Model` -> `Response VO`。

## 4. 工程基线检查

- 新服务是否已由 `yss-ddd-scaffold-generator` 生成，或已有服务是否登记了复用的模块和包命名。
- Domain / Application / Infrastructure / Adapter / Bootstrap 的职责和依赖是否与批准架构一致。
- Repository、PO、Convertor、GatewayImpl、Controller、DTO / VO 和统一响应边界是否按影响面落实。
- OpenAPI Draft / Freeze、权限、数据迁移、审计、测试 seam、CI 和回滚约束是否已经明确。

## 5. 阶段 7 合同

- 工程基线校验必须消费批准合同、实现仓库登记和 `scaffold_status`；脚手架生成只属于 `controlled-generation`。
- 业务规则、状态机、权限、事务、查询语义和跨系统行为使用 `behavior-tdd`，不能以生成器样例替代。
- 返回统一 `YSS Skill Execution Result`，包含模块边界、Wrapper、编译/测试、OpenAPI/CI 证据、偏离和新增影响。
