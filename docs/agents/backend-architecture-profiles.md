# 后端架构 Profile 执行约定

Profile、模块闭包、生成器、成熟度和 Recipe 的权威映射见 `yss-skill-registry.yaml`。本文件只定义分层执行边界，不从目录名推断架构。

执行前比较工程基线、仓库登记、Manifest 与当前合同的 `architecture_identity`。缺失、digest 漂移、Profile 不匹配或越界写路径均停止；既有工程不能自动重选架构。新 Profile 的真实编译及首切片验证未通过前保持 `draft`，不能设置 `ready-for-agent`。

## MVC 分层

- `layered-mvc-service` 的用例层为 `service`；`mvc-data-analysis-v1` 的用例层为 `core`。后者是薄应用层，不是合并 Domain 的容器。MVC 不加载 `yss-domain`，不生成 DDD Gateway。
- 用例层拥有事务、业务规则、幂等和内部 Command / Query / Result；可依赖 Spring Context / `spring-tx`，不依赖 Spring MVC、HTTP client DTO 或数据库驱动。Controller 不直连 Repository。
- Repository 拥有 PO、MyBatis-Plus Repository / XML 及持久化转换；不得反向依赖 service/core/server/client。数据库操作的因果异常应保留，禁止把内部错误原文输出给客户端。
- Adapter 拥有外部系统适配，Feign client 只承载远程调用契约。不得把 Repository 当作对外集成层。
- 私有 HTTP DTO 在 server；启用 published-client 时公开 DTO 可在 client；数据分析 Profile 的公开 DTO 固定在 client。client 不依赖 service/core/repository/server。server 用 MapStruct 在 wire DTO 与内部模型之间转换；core 不依赖 client。
- Bean Validation 在 server/client 的输入边界；业务校验及稳定错误语义在 service/core；HTTP 状态、包装和脱敏在 server。事务回滚、校验失败、已知/未知异常和序列化必须有行为测试。

## 数据库与 Java 基线

- 新脚手架统一 `verification_database=h2`、`production_database=not-bound`。仅测试和显式 `scaffold-local` 使用 H2；普通配置不设置数据库或默认激活 Profile。不另加生产驱动、第三方数据源或 Mock 服务。
- 生产数据库、DDL、索引和方言在后续批准的存储工作单元接入；H2 测试不能证明生产方言兼容。脚手架不包含业务 SQL、schema/data 占位或业务 API。
- 三种新 Profile 使用 `spring-boot-2.7-jdk8` / `javax`。组件 Skill 消费工程基线，不擅自升级 Java、Boot、处理器版本或替换依赖。MapStruct + Lombok 必须验证 binding 与生成代码编译。
- 对 SQL 注入、敏感信息、权限和事务的规则不因 H2 或模板而豁免。MySQL 专属语法规则仅适用于批准的 MySQL 存储工作单元；框架命名/返回包装等差异须记录明确的 YSS 基线例外。

## 验证含义

结构测试只证明分流/生成约束。三种 Profile 各自需要临时 `CompatibilityProbe` 的真实 Maven validate/test/package 与首切片端到端证据才能声明受支持。Probe 不进入分发骨架。用户工程空骨架验证成功最多为 `empty-scaffold-verified`，不能替代自身批准的首切片验证。
