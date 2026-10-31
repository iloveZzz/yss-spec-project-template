# 后端架构 Profile 执行约定

本文件说明 DDD/MVC 的分层职责、对象命名与外部规范适配。以实际工程结构和当前需求选择适用规则，不从目录名、注册状态或历史合同推断架构。

## MVC 分层

- `layered-mvc-service` 的用例层为 `service`；已退役 `mvc-data-analysis-v1` 的历史用例层为 `core`。后者是薄应用层，不是合并 Domain 的容器。MVC 不加载 `yss-domain`，不生成 DDD Gateway。
- 用例层拥有事务、业务规则、幂等和内部 Command / Query / Result；可依赖 Spring Context / `spring-tx`，不依赖 Spring MVC、HTTP client DTO 或数据库驱动。Controller 不直连 Repository。
- Repository 拥有 PO、MyBatis-Plus Repository / XML 及持久化转换；不得反向依赖 service/core/server/client。数据库操作的因果异常应保留，禁止把内部错误原文输出给客户端。
- Adapter 拥有外部系统适配，Feign client 只承载远程调用契约。不得把 Repository 当作对外集成层。
- 私有 HTTP DTO 在 server；启用 published-client 时公开 DTO 可在 client；数据分析 Profile 的公开 DTO 固定在 client。client 不依赖 service/core/repository/server。server 用 MapStruct 在 wire DTO 与内部模型之间转换；core 不依赖 client。
- Bean Validation 在 server/client 的输入边界；业务校验及稳定错误语义在 service/core；HTTP 状态、包装和脱敏在 server。按本次影响检查事务回滚、校验失败、已知/未知异常和序列化；运行验证按任务需要选择，报告实际结果。

## 对象命名与外部规范适配

技术设计、脚手架和后端实现先读取当前工程结构、POM、接口与需求，再使用适用 YSS 技能；阿里 Java 手册和 COLA 示例只补充编码建议，不另选架构、模块或对象协议。资料与实际工程冲突时调查来源与影响，不静默改写基线；缺少影响实现的关键决定时澄清。

| 对象职责 | YSS 新工程命名与所有权 | 权威技能 |
|---|---|---|
| 数据库映射对象 | 新 YSS 工程的持久化类型使用 `*PO`；DDD 位于 Infrastructure，MVC 位于 repository。手册/COLA 的数据库 `DO`（Data Object）按此职责适配，不表示 Domain Entity。 | `yss-repository` + `yss-mybatis` |
| DDD 聚合根 / Entity | 默认 `*Entity`，位于 Domain；值对象、事件和具体类型由当前战术设计确定，不带 ORM、Web 或 YSS DTO/Exception 依赖。 | `yss-tactical-design` + `yss-domain` |
| 内部命令 / 查询 / 结果 | `*Command` / `*Query` / `*Result` 属于用例层：DDD Application、通用 MVC service、数据分析 MVC core；不借用 HTTP DTO。 | `yss-application` |
| HTTP 请求 / 响应 | 名称及字段来自当前 API 和工程约定；DDD 在 Web，MVC 按本文件的 server/client 分流，不从 COLA client 示例反推模块。 | `yss-dto` + `yss-web-controller` |

- 既有工程已确认使用 `*DO` 或其他领域类型名时沿用该基线，不自动改名；新增同职责类型保持工程内一致。改名不能解除跨层依赖或持久化泄漏，也不为同一数据映射同时创建 PO 和 DO。命名例外记录具体职责、类型及依据。
- 阿里手册的 Service/Manager/DAO 分层按所选 Profile 映射，不新增 Manager 层或把 DAO 对象直接传到 Web。DDD 的领域行为与不变量归 Domain；MVC 的规则和事务归 service/core，不为 MVC 补造 Domain/Gateway。
- COLA 仅作架构参考，不自动引入依赖、`com.alibaba.cola` 注解、组件或返回包装；不得照搬示例的 Domain `BizException`、client DTO 穿层、字段注入或静态 MapStruct `INSTANCE`。异常、wire 协议、转换和注入分别按 `yss-exception`、`yss-dto`、`mapstruct` 及当前 Profile 执行。
- PO/DTO 的通用 POJO 建议不代替领域身份、值相等、创建/重建和不变量；不得据此为 Entity 添加任意 setter、机械 `@Data`，或禁止创建入口校验。DTO 默认值与公开字段以当前 wire 合同为准，不以手册一般条款删除组件协议。

## 数据库与 Java 基线

- 新脚手架统一 `verification_database=h2`、`production_database=not-bound`。仅测试和显式 `scaffold-local` 使用 H2；普通配置不设置数据库或默认激活 Profile。不另加生产驱动、第三方数据源或 Mock 服务。
- 生产数据库、DDL、索引和方言按当前需求及真实操作授权接入；H2 测试不能证明生产方言兼容。业务空工程不包含产品 SQL 或 API；独立参考工程包含其专属 H2 脚本及 OAS 3.1。
- DDD / 通用 MVC 沿用项目实际 Boot、Java、Parent、BOM 和处理器版本；平台事实参考 `.template-spec/engineering/backend-platforms.md`。按相同版本与架构理解组件能力和证据，不把缺失记录当已验证。数据分析初始化器已退役，既有代码仍可按需求维护。组件技能不擅自升级或替换 YSS 依赖；涉及 MapStruct + Lombok 时核对 binding 与生成代码，未编译不宣称通过。
- 对 SQL 注入、敏感信息、权限和事务的规则不因 H2 或模板而豁免。MySQL 专属语法规则仅适用于实际采用 MySQL 的存储实现；框架命名/返回包装等差异须记录明确的 YSS 基线例外。
