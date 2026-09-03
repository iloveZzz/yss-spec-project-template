# YSS DDD 脚手架 Target Profile 决策记录

> 日期：2026-09-03
> 仓库身份：`template-source`
> 依据：用户在两轮 Grill 中明确选择“全部应用推荐”
> 状态：approved-for-template-maintenance

## 1. 已批准决策

1. 新项目只支持 `target-domain-model`；`client-in-domain` 和其他旧架构为 `unsupported`，不提供 legacy Profile、兼容分支或静默回退。
2. 脚手架是服务级工程基线，使用 `scaffold_request_id`，不要求尚未形成的垂直切片 `slice_id`。
3. 生成器严格 `initialize-only`。非空目标、`--force`、旧项目迁移和当前模板升级均为 `unsupported`；暂不提供 `plan/diff/migrate`。
4. Maven 仓库采用命名 Profile。具体 URL、凭据和镜像策略来自受控环境，不固化在共享模板。
5. 完成状态拆分为 `empty-scaffold-verified` 与 `first-slice-verified`；后者必须通过 golden first slice。
6. HTTP DTO/VO 属于 Adapter/Web；独立 client module 对当前 scaffold 为 `unsupported`。Domain 不拥有 DTO/VO。
7. Web DTO 经 WebConvertor 转为 Application Command；Application 返回 Application Result；Domain Model 不穿透 Controller。
8. Domain Gateway 只交换聚合、领域值和领域标识。分页/列表由 Application Query Port 承担，`PageQuery`、`PageResult`、VO 不进入 Domain。
9. 当前唯一持久化 Profile 为 `mybatis-plus`；普通 MyBatis 为 `unsupported`，不纳入当前 scaffold。
10. MapStruct 统一 `componentModel = "spring"`，使用构造器注入；父 POM 配置 annotation processor 与 `lombok-mapstruct-binding`。
11. Domain 保留纯领域错误语义；HTTP 状态、YSS Result 和公开消息由 Web exception translator 映射，unknown/runtime 消息必须消毒。
12. 平台基线必须显式选择；首个 Profile 为 `spring-boot-2.7-jdk8` + `javax.validation`，不得自动猜测 `javax` / `jakarta`。
13. Scaffold 不生成生产业务 CRUD，只生成机械模块、构建配置、架构规则、测试基础设施和 Manifest；业务代码继续由 Tactical Design、Slice Contract、Router 与 TDD 驱动。

## 2. Canonical 调用链

`HTTP DTO -> WebConvertor -> Application Command/Result -> Domain Model/Domain Gateway`

持久化侧为：

`Domain Gateway <- Infrastructure GatewayImpl -> Repository/MyBatis -> PO`

读模型侧为：

`HTTP PageQuery -> Application Query -> Application Query Port -> Infrastructure Query Adapter -> Application Result -> HTTP VO`

## 3. 验证 seam

- Scaffold contract v2 输入校验、路径与仓库身份校验。
- 初始化生成的模块/POM/Profile/Wrapper/Manifest v2。
- generator-owned 文件散列和模板/合同/downstream skill lineage。
- Domain/Application/Infrastructure/Web 依赖方向的可执行规则。
- golden first slice 的聚合不变量、MapStruct、分页白名单、Wire forbidden fields 和异常消毒。
- 项目根 `./mvnw validate`、`./mvnw test`、`./mvnw package`。

## 4. 明确不做

- 不在 scaffold 中生成真实业务字段、Controller、Entity、DDL 或 CRUD。
- 不把 JHipster、Spring Initializr、Copier、Spring Modulith 或 jMolecules 直接引入运行时；只借鉴 typed description、贡献器、测试和演进协议。
- 不用当前空骨架 Maven 证据宣称下游技能已满足首切片就绪条件。
- 不迁移、识别或覆盖旧项目；架构现代化必须单独立项并逐切片实施。
- 当前不提供模板版本升级；未来只可能针对同一 Target Profile 另行设计，不能据此形成现有承诺。

## 5. 后续路由

`work-unit.ssot-update -> work-unit.skill-projection-sync -> work-unit.intensity-aware-verification`

本记录批准模板维护方向，不批准产品 Slice、不设置 `ready-for-agent`，也不构成 `release-ready`。
