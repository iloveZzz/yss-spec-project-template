---
name: yss-layered-mvc-scaffold-generator
description: 直接生成 YSS 分层 MVC 后端脚手架及参考工程，无需需求合同或设计审批。
---

# YSS Layered MVC Scaffold Generator

优先运行既有脚本和模板。默认生成 `server/service/repository` 业务空骨架及 `examples/reference/` 独立参考工程；参考工程不进入业务 Reactor、扫描或生命周期批准。

## 直接生成

按 [工程输入与命令](../yss-ddd-scaffold-generator/references/standalone-generation.md) 收集项目名、包名、输出父目录、精确 Spring Boot / JDK 平台及 Maven 坐标，运行 `scripts/generate_scaffold.mjs`。无合同参数默认独立生成，`--standalone` 为可选写法；无需先创建 Harness、需求合同、原型、Ticket 或阶段批准。

默认启用参考工程；`--with-example` 显式启用，`--without-example` 禁用，同时传入拒绝。参考场景仅为 ReferenceEntry 的创建、查询和重命名；Service 持有规则和事务，Repository 持久化，Server 持有 DTO、校验、MapStruct 和接口，不引入 Domain/Gateway。

收到任何合同或批准参数都进入正式路径；合同缺失、无效、过期或元数据不完整不得回退。

## 正式合同

- 新合同使用 Project Scaffold Contract v5，绑定 `reference_example`（是否启用、固定标识、版本、路径及当前模板摘要）和完整设计前置；来源见 [合同编译](../yss-implementation-contract-compiler/references/scaffold-compilation.md)。编译器只生成草案，当前生命周期批准、写范围、技术/数据/API 设计门禁仍需完整核验。
- 历史 v4 通用 MVC 合同保持空骨架语义；不能通过参数追加参考工程。历史 v3 只读恢复审计，不用于生成。旧独立 v1 / 正式 v4 Manifest 用 `scripts/audit-legacy-backend-scaffold --project-root <目录>` 核验文件所有权；结果不授予平台或生命周期资格。
- 平台与组件来自批准的 `platform_configuration` v2、精确 Maven Parent/BOM 和共享 [平台目录](../../../.template-spec/engineering/backend-platforms.md)。候选、生成成功或本地样例通过不授予平台支持、产品批准或 `ready-for-agent`。
- 固定核心模块为 server/service/repository；external-integration 增加 adapter，published-client 增加 client，feign-client 增加 client/feign-client。完整闭包与职责见 [architecture.md](references/architecture.md)。

## 退役与目录保护

`mvc-data-analysis-v1` 和专属 service-project-initialization 已退役。旧合同、Schema、架构身份与 Manifest 只用于历史只读审计；生成器在创建目录、Git 或 skillUtils 之前拒绝。替代路径：通用 MVC 脚手架 → 按需单独使用 `setup-yss-harness`。不自动转换旧合同、迁移六模块工程或删除用户文件。

目标目录必须不存在，严格 initialize-only；已有目标、`--force`、旧项目迁移或模板升级均拒绝。gitlink、空子模块挂载、detached HEAD 和符号链接保护保持生效。普通生成不初始化 Git 或治理实例。Harness 默认父容器为 `apps/backend/`；实际输出必须在用户或合同允许范围。

## 验证

优先 `scripts/generate_and_verify_scaffold.mjs`；业务工程与参考工程分别从自身根目录执行 `./mvnw validate/test/package`。实际命令、退出码和日志独立记录；参考工程结果只写 `reference_verification`，不替代首切片验收。默认验证核对全部参考文件所有权及摘要，禁止忽略整个 examples 目录。

Maven settings 规则复用 [工程检查](../yss-ddd-scaffold-generator/references/engineering-checks.md)：使用既有显式配置或用户 `~/.m2/settings.xml`，`YSS_MAVEN_SETTINGS` 可指定外部文件；不复制凭据。缺配置只记录未验证，不阻断直接生成。

业务工程 H2 仅用于测试或显式 scaffold-local Profile；参考工程自有 H2，默认仅监听 loopback，无生产数据库绑定。生成的参考 README、OAS 与行为测试说明真实用法。

业务实现继续按当前批准的 Slice 或已合格日常交付路线使用适用 YSS 技能；示例不是用户产品 API、业务批准或 DDD/MVC 迁移工具。
