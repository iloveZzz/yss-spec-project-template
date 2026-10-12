---
pipeline: <feature-id>
stage: engineering-baseline-review
status: draft
owner: ai
---

# <功能名称>工程基线 / YSS DDD Review

> 适用场景：新后端服务、新模块、DDD 分层、Gateway / Repository、统一响应、MapStruct 或工程结构受影响时。
> 本文确认本次变更是否符合 YSS DDD 工程基线，不替代系统概要设计、数据架构或代码审查。

## 1. 输入材料

| 资产 | 路径 / 链接 | 状态 | 备注 |
|------|-------------|------|------|
| Spec / 需求冻结 |  |  |  |
| 产品总体设计 / 功能架构 |  |  |  |
| API 影响记录 / 契约草案 / OpenAPI Draft / 无 API 影响记录 |  |  |  |
| 既有工程结构 |  |  |  |
| YSS skill 路由 |  |  |  |
| `prototype_confirmation` |  |  | UI 影响时必须是已确认；无 UI 影响记录 `not-applicable` 及原因 |
| 后端架构、平台与脚手架结果 |  |  | 新建工程记录 `gate.backend-architecture-platform-approved`、DDD / MVC、精确 Spring Boot / Java、目标目录、生成器输入和 Execution Result；既有工程记录登记值复用证据 |

## 2. 工程影响判断

| 检查项 | 结论 | 说明 |
|--------|------|------|
| 是否新建后端服务 | 是 / 否 |  |
| 是否新增后端模块 | 是 / 否 |  |
| 是否影响 Adapter / Application / Domain / Infrastructure 分层 | 是 / 否 |  |
| 是否新增 Gateway / Repository | 是 / 否 |  |
| 是否影响统一响应 / DTO / VO / Query / CMD | 是 / 否 |  |
| 是否存在高风险变更、人工确认项或回滚约束 | 是 / 否 |  |

## 3. YSS DDD 分层检查

| 层级 | 职责 | 本次影响 | 约束 / 结论 |
|------|------|----------|-------------|
| Adapter | 协议适配、校验、响应包装 |  |  |
| Application | 用例编排、事务边界 |  |  |
| Domain | 领域模型、领域服务、Gateway 接口 |  |  |
| Infrastructure | GatewayImpl、Repository、外部系统适配 |  |  |
| Bootstrap | 启动、配置、依赖组装 |  |  |

## 4. 推荐 YSS skills

| 场景 | 推荐 skill | 是否需要 | 备注 |
|------|-------------|----------|------|
| 新服务骨架 | `yss-ddd-scaffold-generator` / `yss-layered-mvc-scaffold-generator` | 是 / 否 |  |
| 后端基线检查 | `yss-ddd-scaffold-generator/references/engineering-baseline.md` | 是 / 否 |  |
| 领域建模 | `yss-domain` | 是 / 否 |  |
| Application 用例编排 / 事务边界 | `yss-application` | 是 / 否 |  |
| Repository / MyBatis | `yss-repository` / `yss-mybatis` | 是 / 否 |  |
| Web Controller / DTO | `yss-web-controller` / `yss-dto` | 是 / 否 |  |

## 4.1 原型确认后的后端脚手架门禁

| 检查项 | 结论 | 证据 / 备注 |
|---|---|---|
| 原型确认已完成，或已记录 `not-applicable` 原因 | 是 / 否 / 不适用 | `prototype_confirmation` |
| `scaffold_status=required` 时通过 `gate.backend-architecture-platform-approved` 同时确认 DDD/MVC 与精确 Spring Boot 版本，再完成 Technical Design、Data Architecture Decision 和工程合同批准，由 实现合同编译器 编译 schema v4 合同并经 Harness Orchestrator 批准，最后使用匹配生成器；既有工程核验复用登记值 | 是 / 否 / 不适用 | gate、架构与平台决定、技术/数据设计 digest、工程批准、`contract_id` / `contract_version`、Manifest v4 和仓库准备 v2 |
| 脚手架生成结果只包含工程结构、配置和机械模板 | 是 / 否 | 禁止生成业务行为 |
| 生成器输入、预期文件和实际 `./mvnw validate` / `./mvnw test` / `./mvnw package` 已留证 | 是 / 否 | 每条命令记录 `exit_code`、`duration_ms`、stdout/stderr 引用和执行时间；打印命令不算证据 |
| DDD 内部 `engineering-baseline` 校验已完成并重新进入 `yss-implementation-contract-compiler` | 是 / 否 / 不适用 |  |
| 脚手架后所有业务代码均绑定批准 Slice Implementation Contract 和 YSS Skill Execution Result | 是 / 否 |  |

## 5. 完成标准

- [ ] 调用方向符合 `Adapter -> Application -> Domain` 和 `Infrastructure -> Domain Gateway`。
- [ ] Domain 不依赖 Adapter、Infrastructure、Mapper、Controller 或 Web DTO。
- [ ] Controller 不穿透 Repository。
- [ ] 对象转换优先 MapStruct，重复 mapping 有处理策略。
- [ ] 所需 YSS skills 已最小化选择。
- [ ] 风险影响、验证证据和责任人已记录。
- [ ] 原型确认后已按脚手架顺序完成工程基线、生成器、内部 `engineering-baseline` 校验和实现合同编译器重编译；脚手架未生成业务行为。

## 6. 下一步门禁

- 结论：Approved / Blocked
- 下一步：系统概要设计 / 数据架构 / 回改契约草案 / OpenAPI Draft
- 阻断项：
