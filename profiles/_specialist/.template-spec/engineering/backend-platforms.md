# 后端平台与兼容性参考

[backend-platforms.json](backend-platforms.json) 保存平台配方、YSS 父 POM/BOM、组件能力及原始验证记录。依据项目的精确版本与架构使用对应事实；`blocked` 或没有记录表示已知缺口或尚未证实，不代表框架普遍不支持。文中版本与状态描述已有记录，不宣称是当前最新版本或本轮重新验证结果。

新建和维护工程不要求生成平台合同、Manifest、批准包或资格记录。先读实际 POM、组件源码和用户需求；缺失关键版本先调查，实际冲突需解决，不能因取消流程门禁而忽略依赖错误。

## 读取既有配置

历史 `platform_configuration` v2 的字段保留用于理解旧资料，不是新工程必填输入。不能仅按 `profile_id` 选第一条或最新补丁；同时核对精确 Boot/Java、Parent/BOM 与架构。旧摘要算法名是历史格式说明，不表示当前存在同名执行工具。

| 字段 | 内容 |
|---|---|
| `schema_version` | `2`（v1 只读审计） |
| `profile_id` | 如 `spring-boot-3.5-jdk17` |
| `spring_boot_version` | 精确补丁，如 `3.5.16` |
| `java_version` | 经选择的 `8`、`17` 或 `21` |
| `component_platform_line` | 组件源码与 Skill 索引平台线；只允许 `boot2-java8` 或 `boot3-java17` |
| `parent` / `bom` | `group_id`、`artifact_id`、`version` |
| `compatibility_id` | 清单组合 ID |
| `compatibility_digest` | `platformRecipeDigest(profile, entry)`，排除证据列表、支持状态和展示提示 |

## 组件与构件事实

组件能力不在 catalog 顶层建立第二套目录。它只存在于绑定组合内，以注册表 capability ID 为键：`compatibility[].component_capabilities.<capability-id>`。当前登记 11 项：`contract.dto-wire`、`contract.request-validation`、`contract.error-mapping`、`framework.mybatis`、`component.cache`、`component.current-user-context`、`component.audit-log`、`component.excel-import-export`、`component.distributed-id`、`component.security-algorithm`、`component.gateway-resilience`。Maven `artifact_id` 只出现在 `artifacts`。

每项记录 `status`、`verified_architectures`、`artifacts`、`evidence`、`blockers` 和 `component_digest`。每个构件固定字段为 `group_id`、`artifact_id`、`declared_version`、`resolved_version`、`pom_sha256`、`jar_sha256`、`source_tree`。SNAPSHOT 的声明版本与仓库实际解析版本必须分离；已验证条目的 POM/JAR 摘要使用 `sha256:<64 位小写十六进制>`，`source_tree` 使用 40 位小写 Git tree SHA。阻断条目可将尚未取得的解析版本、摘要和 tree 设为 `null`，但必须给出稳定 blocker。

现有清单的 Boot 3.5 / JDK 17 配方记录 `Spring Cloud 2025.0.3`、`Spring Cloud Alibaba 2025.0.0.0`、Jakarta Validation、Jackson 2，并要求 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`。同一 compatibility entry 通过 `platform_artifact_bindings.parent/bom` 保存父 POM 与组件 BOM 候选，通过 `external_snapshot_bindings` 和 `external_artifact_bindings` 区分外部 SNAPSHOT 与正式发布构件。候选未发布或未完成本地解析时，`resolved_version`、`published_at`、POM/JAR SHA、`source_tree` 保持 `null`，`evidence` 保持空数组并写明 blocker；这些字段参与平台 recipe digest，不能改写成未经观察的结果。

平台与组件事实分开核对：空脚手架能运行不代表所有组件可用。读取同一 compatibility 条目的能力、架构范围、精确构件和 evidence；缺记录、字节漂移或解析冲突时说明实际限制，不能宣称已验证，也不补造报告或依赖已退役编译器。

`artifact_resolution_evidence` 指向构件解析报告及原始摘要。核对时对照 report ID、仓库、timestamped version、POM/JAR SHA-256 与可证明的 Git tree；来源目录位于 `evidence/`，不依赖未分发的 `.template-source`。报告不保存 Maven 用户名、密码或令牌。用户级 `settings.xml` 只提供下载配置，其中 profile 下的 `distributionManagement` 不代替发布 POM。

## 依赖与实际验证

- 依据所选 Boot BOM 与实际 compile/runtime 依赖树核对 Spring MVC、Servlet、Validation、Jackson 等；Boot Plugin 与 Boot 精确版本对应。内部 Parent/BOM 沿用已明确选择，不能用属性覆盖掩盖冲突。
- Boot 代际变化按对应版本资料选择 starter、Jackson、MyBatis-Plus 与 Jakarta 命名空间；不替换 `javax.sql` 等 Java SE API。可选 Feign 等能力按实际项目和证据判断，不自动加入。
- 构建或运行按任务需要执行，后端优先根 `./mvnw`；记录实际 JDK、命令及观察范围。effective POM、依赖树与可执行 Jar 能用于定位版本冲突，不要求固定命令数量或新增报告包。
- runtime 能力不能用 test/provided 依赖凑齐；打包时区分 Boot jarmode、provided Lombok 和空 starter 等工具行为与真实运行依赖。规则以所选配方和实际 Jar 为准，不因历史白名单限制当前用户明确需要的依赖。
- H2 和 RowBounds/TransactionTemplate 样例不证明生产方言、YSS 自动分页切面、真实 Service 代理事务或业务场景。当前代码与旧生成树不同时，不把历史记录当本次测试通过。
- 本地启动只用明确的监听范围，按测试需要选择回环/随机端口；验证结束停止自建进程，不改变用户运行中的服务。未执行启动不声称服务可运行。

## 历史组合与已知缺口

历史清单的 `spring-boot-2.7-jdk8` 组合登记为 `blocked`。阿里云 Maven 私服已解析出 12 个 timestamped SNAPSHOT 及 POM/JAR SHA-256；其中 11 个构件的发布 POM 与 sources JAR 可逐字节绑定到固定 Git tree，Cache 3.x 没有发布 sources JAR，仍缺源码绑定。Exception、UserInfo、Security 和 Resilience4j 的已解析构件对应固定提交，不包含当次隔离工作树中的加固候选。所有能力仍缺 DDD 与 Layered MVC 消费应用认证，因此未写入 `verified_architectures` 或组件 evidence。

Boot 2 私服中的 Cache `3.0.0-SNAPSHOT` 使用 JDK 8 构建且 BOM 2.x 管理的是 `2.0.0-SNAPSHOT`；Distributed ID 3.x 同样是 JDK 8 / `javax` 代际。这两个坐标不能作为 Boot 3 主线证据。UserInfo 源模块继承 `com.yss.cloud`，BOM 仍登记 `com.yss.datamiddle`，坐标冲突继续阻断。Boot 3.5 候选单独绑定 Cache 与 Distributed ID `3.1.0-SNAPSHOT`，Validation 使用平台管理的 `org.springframework.boot:spring-boot-starter-validation:3.5.16`；Excel 只保留 `yss-component-excel-mvc`，已移除的 `yss-component-excel-starter` 不再登记。Fesod `2.1.0-SNAPSHOT` 在当次私服不可解析，因此 `external_snapshot_bindings` 为空；Excel 外部依赖改用 Apache 正式发布的 `org.apache.fesod:fesod-sheet:2.0.2-incubating`，并以实际 POM、二进制 JAR 与 sources JAR SHA-256 保存为不可变 `resolved` release binding。Fesod 字节绑定不替代消费认证；YSS parent/BOM、timestamped SNAPSHOT、源码绑定、`AutoConfiguration.imports` 与 DDD/Layered MVC 消费证据仍未闭合，所以 Boot 3.5 compatibility 继续 `blocked`。Boot 4.1 没有 compatibility entry；该历史条目没有验证此组合；3.2.0 的定向认证见下文。

## 官方依据

- [Boot 2.7 系统要求](https://docs.spring.io/spring-boot/docs/2.7.18/reference/html/getting-started.html#getting-started.system-requirements)：Java 8 起，默认 Tomcat 9 / Servlet 4.0。
- [Boot 3.5 系统要求](https://docs.spring.io/spring-boot/3.5/system-requirements.html)：Java 17 起，Spring Framework 6.2，默认 Tomcat 10.1 / Servlet 6.0。
- [Boot 4.1.1 系统要求](https://docs.spring.io/spring-boot/system-requirements.html)：Java 17 起，Spring Framework 7.0，Tomcat 11 / Servlet 6.1。
- [Boot 4 迁移说明](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)：模块、starter、测试及 Jackson 变化。
- [MyBatis-Plus 安装](https://baomidou.com/getting-started/install/)：Boot 2、3、4 的 starter 坐标。

- [Spring Cloud 兼容矩阵](https://spring.io/projects/spring-cloud/)：发行列车、Boot 与 OpenFeign 版本对应。

以上是候选配方依据，不替代内部 YSS 组合的实际验证。

## 既有 3.2.0-SNAPSHOT 定向验证记录

已有记录 `yss-cloud-microservice-3.2.0-snapshot-boot-3.5-jdk17`，仅覆盖 Boot 3.5.16 / JDK 17 的 DDD 和通用 MVC。Parent、BOM 和样例所用组件的唯一 SNAPSHOT、POM/JAR 摘要及仓库来源见 `evidence/scaffold-3.2.0/resolution.json`；旧版本条目保持原状态。

两种空工程及两个独立参考工程均完成 validate/test/package、有效 POM、依赖树、打包检查和真实启动。独立参考工程通过创建、查询、重命名、空名称校验、不存在记录、YSS 响应/异常序列化、MapStruct 注入、MyBatis/H2 和真实 Service 事务回滚。该条目及实际执行的 DTO、错误映射、请求校验和 MyBatis 能力登记为 `verified`，证据仅覆盖这两个架构和这些行为。样例证据不授予业务生命周期批准。

精确配方按实际 Parent 声明使用 SnakeYAML 2.5，覆盖 Boot BOM 的默认 2.4；不改变 Boot/JDK/YSS 版本。打包检查依据真实 starter 清单中的 `Spring-Boot-Jar-Type: dependencies-starter` 识别 Boot 省略的空 starter，其他运行 JAR 继续核验。DDD 启动探测使用现有 `/actuator/health` 并要求 HTTP 200/UP，通用 MVC 空工程要求未声明根路由返回 404。已知异常组件对未定义静态资源返回 500 的行为保留记录，不属于本次参考接口认证；未修改或发布组件。

源码证据逐字节核对远端 POM、sources JAR 与本地组件源码，再以隔离 Git tree 保存源归档/POM 的内容身份，不冒充上游提交。来源状态为 working-tree；不据此宣称已有正式发行。未认证缓存、Excel、生产数据库、其他平台或组件全部 API。真实报告与日志位于 `evidence/scaffold-3.2.0/{ddd,mvc}/`。

参考工程的大型依赖报告以 gzip 保存，`evidence_artifacts` 同时登记压缩字节摘要与 `uncompressed_digest`；解压后与原始运行报告逐字节一致。
