# yss-cloud-microservice 框架能力映射

- 关联 Ticket：[对齐 yss-cloud-microservice 模块与技能能力边界](https://github.com/iloveZzz/yss-spec-project-template/issues/40)
- 盘点日期：2026-08-07
- 外部源码：`/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice`
- 源码版本：`71fd026a142328b8a36e6b57aa0a5a30ebc60f8f`，提交时间 2026-08-06 17:38:01 +08:00

## 结论

外部仓库是由 38 个顶层 component 目录和约 115 个 Maven `pom.xml` 模块组成的 Spring Boot / Spring Cloud 组件库。根 POM声明 Spring Boot `2.7.18`、Spring Cloud `2021.0.9`、Spring Cloud Alibaba `2021.0.6.0`、Java `1.8`，组件聚合根为 `yss-microservice-components`。

当前 YSS skills 混合了四种抽象：

1. 直接描述 runtime component / starter 的专项技能。
2. 描述 DDD 应用代码形状和工程分层的 scaffold / architecture 技能。
3. 描述生命周期、路由、OpenAPI 和治理过程的流程技能。
4. 描述 frontend 文档、生成器和 Codex 执行器的平台技能。

因此数量多不完全等于重复；主要复杂度来自“组件能力、应用架构、流程治理、平台工具”共用 `yss-*` 平面名称，且没有统一能力索引。

## 源码直接对应的 runtime component skills

`.codex/skills/yss-source-index/references/source-map-config.md` 定义了 19 个仍维护的 backend skill 到 22 个 source path hint 的映射；当前外部源码中 22 个路径全部存在。已退役组件不再进入 skill source-index。

### 基础设施与公共模型

- `yss-cache` → `yss-component-cache-parent`：Spring Cache / JetCache、本地与 Redis 缓存、注解和解析器。
- `yss-mybatis` → `yss-component-persistence`：MyBatis / MyBatis-Plus、Mapper、Repository、多数据源、分页。
- `yss-dto` → `yss-component-dto`：Command/Query/Result/Page DTO、用户和审计公共模型。
- `yss-jdbc` → `yss-component-jdbc`。

### 平台组件与中间件

- `yss-audit-log` → `yss-component-audit-log`；`yss-log` → `yss-component-log-starter`；`yss-exception` → `yss-component-exception`。
- `yss-distributed-id` → `yss-component-distributed-id` + `yss-component-leaf`；`yss-security-algorithm` → `yss-component-security-algorithm`。
- `yss-resilience4j` → `yss-component-resilience4j-starter`；`yss-userinfo` → `yss-component-userinfo-starter`。
- `yss-dictionary` → `yss-component-dictionary-parent`。
- `yss-validation` → `yss-component-validation-engine-parent` + `yss-component-validation-jsr303`。

### 文件、数据和业务组件

- `yss-excel-mvc` → `yss-component-excel-mvc` + `yss-component-excel-starter`；`yss-valuation` → `yss-component-valuation`。
- `yss-sql-condition` → `yss-component-sql-condition`；`yss-sql-tpl` → `yss-component-sql-tpl-parent`。
- `yss-taskflow` → `yss-component-taskflow`；`yss-duckdb` → `yss-component-duckdb`。

## 代表性源码证据

- 缓存 README 明确说明 Spring Cache / JetCache、本地 + 远程多级缓存；源码存在 `EnableYssCloudCache`、`YssCacheInterceptor`、`RedisCacheBackendProvider`。
- 持久化 README 明确说明 MyBatis / MyBatis-Plus、多数据源和分页；源码存在 `BaseRepository`、`MybatisBaseConfiguration`、`MybatisPlusConfiguration`、`MultiDataSourceConfiguration`。
- DTO 源码存在 `CommandDTO`、`QueryDTO`、`Result`、`PageResult`、`UserInfo`；审计源码存在 `EnableAuditLog`、`AuditLogAspect`、`AuditConfiguration`。
- 日志源码存在 `CatchAndLog`、`CatchLogAspect`、`CatchLogAutoConfiguration`；异常源码存在 `BaseException`、`BizException`、`GlobalExceptionAdvice`。
- 分布式 ID 源码存在 `EnableDistributedId`、Leaf/CosID 实现和测试；外部仓库最新提交正是分布式 ID 3.0 优化。
- Taskflow 源码存在 `TaskflowExecutor`、`ProcessDefinitionServiceImpl`、任务执行器和变量 adapter；validation 源码存在多种 EL parser。

## 仅部分关联或没有直接 runtime component 的 skills

### 应用架构与工程生成

`yss-ddd-scaffold-generator` 生成 parent、adapter、application、domain、infrastructure、web、bootstrap 等应用模块模板；六个 `yss-backend-scaffold-*` 已在 `.agents/skills` 作为 shared canonical entrypoint，不再在 generator `references/` 下重复注册。它们不是外部组件的单一 runtime 对应物。`yss-domain`、`yss-repository`、`yss-web-controller` 描述业务工程如何使用组件和组织代码。

`yss-dto`、`yss-mybatis` 同时拥有 runtime component 证据和应用规范；应归为“应用规范 + 组件适配”，不要误认为与单一 Java component 同层。`yss-db2mybatis` 是数据库元数据到代码的生成工具，和 persistence 有生成结果关联，但没有同名 runtime component。

### 流程、契约与 frontend

`domain-modeling`、`yss-product-lifecycle`、`yss-router`、`yss-api-integration`、`yss-openapi`、`yss-openapi-draft-review`、`yss-openapi-governance` 主要定义流程、契约和路由，不应强行寻找 Java component。

`yss-ui`、`yss-components`、`yss-hook`、`yss-use-table-height`、`yss-use-tree-height`、`yss-page-module-development` 的 source-map 指向 frontend 文档入口；`yss-design-system`、`yss-formily`、`yss-formily-schema-generator`、`yss-frontend-scaffold-generator` 不应混入 backend component 路由。

`yss-source-index`、`yss-microapp-commit`、`yss-up-springboot3` 是平台维护/迁移/提交辅助能力，不是 runtime component 封装。

## Freshness 与缺口

- 除 `yss-cache` 的索引生成时间为 2026-07-17 外，其余 backend source-index 大多生成于 2026-06-29；外部源码最新提交为 2026-08-06。
- 路径 hint 全部存在，但“路径存在”不等于索引内容覆盖最新 API、版本和测试；`yss-distributed-id` 应作为 freshness pilot。
- source-map-config 没有覆盖外部仓库所有 38 个顶层 component，例如 liquibase、message、report、tag、text-search、anti-corrosion 等，应显式标记为“未封装/不在范围”，而不是默认为缺口。
- 当前没有统一证据字段区分“源码证明”“技能规范”“生成模板”“平台操作”，这是后续分类和路由优化的关键缺口。

## 初步决策输入

1. 保留一组 Component Adapter skills 承载 26 个 runtime 组件映射，统一记录 source-index、版本、新鲜度、公共 API 和验证命令。
2. 将 DDD scaffold / application / domain / infrastructure / web 归为 Application Architecture skills，不和 runtime component skills 混排。
3. 将 lifecycle / router / OpenAPI governance 归为 Process & Contract skills。
4. 将 frontend 和 Codex-only 执行器归为 Platform/Frontend skills，通过能力索引发现，不作为 backend YSS 默认闭包。
5. 对外部仓库已有但尚未封装的组件先记录 coverage gap，不自动新增 skill；新增必须经过粒度和复用价值决策。
