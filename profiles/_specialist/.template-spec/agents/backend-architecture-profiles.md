# 后端架构 Profile 执行约定

Profile、模块闭包、生成器、成熟度和 Recipe 的权威映射见 `yss-skill-registry.yaml`。本文件定义分层执行边界及对象命名与外部规范适配，不从目录名推断架构。

执行前比较工程基线、仓库登记、Manifest 与当前合同的 `architecture_identity`。缺失、digest 漂移、Profile 不匹配或越界写路径均停止；既有工程不能自动重选架构。新 Profile 的真实编译及首切片验证未通过前保持 `draft`，不能设置 `ready-for-agent`。

## 既有工程适配

`existing_project_profiles` 与下述生成器 Profile 独立维护。首版两个 Maven 适配器通过真实 Git/POM 三方核验、对应架构的成功/失败行为测试与 Maven test/package 后标记 supported；当前适配行为由 `tests/scenarios/verify-existing-backend-architecture-scenarios.mjs` 和对应独立 fixture 核验。这是适配协议支持证据，不是实际产品批准、数据库兼容或真实跨仓 S0 结论。每个工程仍须自己的固定来源、架构边界审查和执行证据，详见 `.template-spec/process/existing-backend-architecture.md`。生成器原有 draft 和首切片要求保持。

## MVC 分层

- `layered-mvc-service` 的用例层为 `service`；`mvc-data-analysis-v1` 的用例层为 `core`。后者是薄应用层，不是合并 Domain 的容器。MVC 不加载 `yss-domain`，不生成 DDD Gateway。
- 用例层拥有事务、业务规则、幂等和内部 Command / Query / Result；可依赖 Spring Context / `spring-tx`，不依赖 Spring MVC、HTTP client DTO 或数据库驱动。Controller 不直连 Repository。
- Repository 拥有 PO、MyBatis-Plus Repository / XML 及持久化转换；不得反向依赖 service/core/server/client。数据库操作的因果异常应保留，禁止把内部错误原文输出给客户端。
- Adapter 拥有外部系统适配，Feign client 只承载远程调用契约。不得把 Repository 当作对外集成层。
- 私有 HTTP DTO 在 server；启用 published-client 时公开 DTO 可在 client；数据分析 Profile 的公开 DTO 固定在 client。client 不依赖 service/core/repository/server。server 用 MapStruct 在 wire DTO 与内部模型之间转换；core 不依赖 client。
- Bean Validation 在 server/client 的输入边界；业务校验及稳定错误语义在 service/core；HTTP 状态、包装和脱敏在 server。事务回滚、校验失败、已知/未知异常和序列化必须有行为测试。

## 对象命名与外部规范适配

技术设计、脚手架和后端实现先核验当前 `architecture_identity`、工程基线与合同，再消费对应 YSS 专项技能；阿里 Java 手册和 COLA 示例只补充适用的编码建议，不另选架构、模块或对象协议。工程基线与所选 YSS Profile 冲突时先调查并返回 `drift` / `new_impacts`，不得静默改写基线或择一放行。

| 对象职责 | YSS 新工程命名与所有权 | 权威技能 |
|---|---|---|
| 数据库映射对象 | 新 YSS 工程的持久化类型使用 `*PO`；DDD 位于 Infrastructure，MVC 位于 repository。手册/COLA 的数据库 `DO`（Data Object）按此职责适配，不表示 Domain Entity。 | `yss-repository` + `yss-mybatis` |
| DDD 聚合根 / Entity | 默认 `*Entity`，位于 Domain；值对象、事件和具体类型由当前战术设计确定，不带 ORM、Web 或 YSS DTO/Exception 依赖。 | `yss-tactical-design` + `yss-domain` |
| 内部命令 / 查询 / 结果 | `*Command` / `*Query` / `*Result` 属于用例层：DDD Application、通用 MVC service、数据分析 MVC core；不借用 HTTP DTO。 | `yss-application` |
| HTTP 请求 / 响应 | 名称及字段来自冻结 API 和工程基线；DDD 在 Web，MVC 按本文件的 server/client 分流，不从 COLA client 示例反推模块。 | `yss-dto` + `yss-web-controller` |

- 既有工程已确认使用 `*DO` 或其他领域类型名时沿用该基线，不自动改名；新增同职责类型保持工程内一致。改名不能解除跨层依赖或持久化泄漏，也不为同一数据映射同时创建 PO 和 DO。命名例外记录具体职责、类型及依据。
- 阿里手册的 Service/Manager/DAO 分层按所选 Profile 映射，不新增 Manager 层或把 DAO 对象直接传到 Web。DDD 的领域行为与不变量归 Domain；MVC 的规则和事务归 service/core，不为 MVC 补造 Domain/Gateway。
- COLA 仅作架构参考，不自动引入依赖、`com.alibaba.cola` 注解、组件或返回包装；不得照搬示例的 Domain `BizException`、client DTO 穿层、字段注入或静态 MapStruct `INSTANCE`。异常、wire 协议、转换和注入分别按 `yss-exception`、`yss-dto`、`mapstruct` 及当前 Profile 执行。
- PO/DTO 的通用 POJO 建议不代替领域身份、值相等、创建/重建和不变量；不得据此为 Entity 添加任意 setter、机械 `@Data`，或禁止创建入口校验。DTO 默认值与公开字段以当前 wire 合同为准，不以手册一般条款删除组件协议。
- 手册的数据库字段、主键和审计示例按当前数据合同及 YSS 组件适配；不得因此切换已确认的分布式 ID 策略或引入生产驱动。覆盖率、日志语言和留存按已采纳工程基线执行，建议值不自动成为质量门禁。规则原始等级保留；安全、权限、敏感信息、SQL 参数绑定与防数据损坏约束不得豁免。

## 数据库与 Java 基线

- 新脚手架统一 `verification_database=h2`、`production_database=not-bound`。仅测试和显式 `scaffold-local` 使用 H2；普通配置不设置数据库或默认激活 Profile。不另加生产驱动、第三方数据源或 Mock 服务。
- 生产数据库、DDL、索引和方言在后续批准的存储工作单元接入；H2 测试不能证明生产方言兼容。脚手架不包含业务 SQL、schema/data 占位或业务 API。
- DDD / 通用 MVC 消费批准的 `platform_configuration` v2，平台清单与证据规则见 `.template-spec/engineering/backend-platforms.md`。凡注册表标记 `component_binding: required` 的能力，编译器必须从该配置指向的同一 compatibility 条目解析 `component_capabilities`；未登记、非 `verified`、架构证据缺失或构件摘要漂移均阻断。数据分析初始化器保留 `spring-boot-2.7-jdk8` / `javax`，不自动开放新平台。组件 Skill 不擅自升级 Java、Boot、处理器或替换 YSS 依赖。MapStruct + Lombok 必须验证 binding 与生成代码编译。
- 对 SQL 注入、敏感信息、权限和事务的规则不因 H2 或模板而豁免。MySQL 专属语法规则仅适用于批准的 MySQL 存储工作单元；框架命名/返回包装等差异须记录明确的 YSS 基线例外。

## 验证含义

结构测试只证明分流/生成约束。三种 Profile 各自需要临时 `CompatibilityProbe` 的真实 Maven validate/test/package 与首切片端到端证据才能声明受支持。Probe 不进入分发骨架。用户工程空骨架验证成功最多为 `empty-scaffold-verified`，不能替代自身批准的首切片验证。
