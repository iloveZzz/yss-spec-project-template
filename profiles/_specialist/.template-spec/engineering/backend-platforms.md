# 后端脚手架平台合同

DDD 和 Layered MVC 共同消费 `backend-platforms.json`。平台定义是候选配方，`compatibility` 是 YSS 父 POM、BOM、组件能力与证据的同一组合清单。`blocked` 条目只表达已经定位的坐标和缺口，不表示组合已获认证；没有 `verified` 条目表示尚无可开放组合，不表示官方框架不支持这些版本。

## 配置与一致性

Project Scaffold Contract v4 新增 `platform_configuration` v2，两个脚手架的新生成必须提供；前端及数据分析初始化器保持原边界。架构决策保存同一对象，参与原用户决定快照和 digest。Manifest 顶层及 `architecture_identity` 传递同一配置。

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

## 组件能力绑定

组件能力不在 catalog 顶层建立第二套目录。它只存在于绑定组合内，以注册表 capability ID 为键：`compatibility[].component_capabilities.<capability-id>`。当前登记 11 项：`contract.dto-wire`、`contract.request-validation`、`contract.error-mapping`、`framework.mybatis`、`component.cache`、`component.current-user-context`、`component.audit-log`、`component.excel-import-export`、`component.distributed-id`、`component.security-algorithm`、`component.gateway-resilience`。Maven `artifact_id` 只出现在 `artifacts`。

每项记录 `status`、`verified_architectures`、`artifacts`、`evidence`、`blockers` 和 `component_digest`。每个构件固定字段为 `group_id`、`artifact_id`、`declared_version`、`resolved_version`、`pom_sha256`、`jar_sha256`、`source_tree`。SNAPSHOT 的声明版本与仓库实际解析版本必须分离；已验证条目的 POM/JAR 摘要使用 `sha256:<64 位小写十六进制>`，`source_tree` 使用 40 位小写 Git tree SHA。阻断条目可将尚未取得的解析版本、摘要和 tree 设为 `null`，但必须给出稳定 blocker。

Boot 3.5 / JDK 17 Profile 固定 `Spring Cloud 2025.0.3`、`Spring Cloud Alibaba 2025.0.0.0`、Jakarta Validation、Jackson 2，并要求 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`。同一 compatibility entry 通过 `platform_artifact_bindings.parent/bom` 保存父 POM 与组件 BOM 候选，通过 `external_snapshot_bindings` 和 `external_artifact_bindings` 区分外部 SNAPSHOT 与正式发布构件。候选未发布或未完成本地解析时，`resolved_version`、`published_at`、POM/JAR SHA、`source_tree` 保持 `null`，`evidence` 保持空数组并写明 blocker；这些字段参与平台 recipe digest，不能在批准后静默变化。

`resolveComponentCapabilities(binding, capabilityIds, architectureFamily, options?)` 先按 binding 精确找到同一 compatibility entry，再解析其中的 capability map。成功结果是可序列化 binding 数组；未登记、非 `verified`、架构不符、构件字段缺失、同坐标解析不一致、组件摘要或证据字节漂移均 fail-closed。错误前缀及稳定码为：

- `component-capability: component-unavailable-for-platform`
- `component-capability: component-artifact-coordinate-conflict`
- `component-capability: component-evidence-missing`
- `component-capability: component-binding-drift`

编译器在需要组件而缺少平台 binding 时使用 `component-capability: component-platform-binding-required`。平台解析和组件解析保持两个独立步骤；组件 evidence 不伪装成平台空脚手架的 Maven、启动或集成测试证据。

当前 `spring-boot-2.7-jdk8` 组合登记为 `blocked`。阿里云 Maven 私服已解析出 12 个 timestamped SNAPSHOT 及 POM/JAR SHA-256；其中 11 个构件的发布 POM 与 sources JAR 可逐字节绑定到固定 Git tree，Cache 3.x 没有发布 sources JAR，仍缺源码绑定。Exception、UserInfo、Security 和 Resilience4j 的已解析构件对应固定提交，不包含当前隔离工作树中的加固候选。所有能力仍缺 DDD 与 Layered MVC 消费应用认证，因此未写入 `verified_architectures` 或组件 evidence。

Boot 2 私服中的 Cache `3.0.0-SNAPSHOT` 使用 JDK 8 构建且 BOM 2.x 管理的是 `2.0.0-SNAPSHOT`；Distributed ID 3.x 同样是 JDK 8 / `javax` 代际。这两个坐标不能作为 Boot 3 主线证据。UserInfo 源模块继承 `com.yss.cloud`，BOM 仍登记 `com.yss.datamiddle`，坐标冲突继续阻断。Boot 3.5 候选单独绑定 Cache 与 Distributed ID `3.1.0-SNAPSHOT`，Validation 使用平台管理的 `org.springframework.boot:spring-boot-starter-validation:3.5.16`；Excel 只保留 `yss-component-excel-mvc`，已移除的 `yss-component-excel-starter` 不再登记。Fesod `2.1.0-SNAPSHOT` 在当前私服不可解析，因此 `external_snapshot_bindings` 为空；Excel 外部依赖改用 Apache 正式发布的 `org.apache.fesod:fesod-sheet:2.0.2-incubating`，并以实际 POM、二进制 JAR 与 sources JAR SHA-256 保存为不可变 `resolved` release binding。Fesod 字节绑定不替代消费认证；YSS parent/BOM、timestamped SNAPSHOT、源码绑定、`AutoConfiguration.imports` 与 DDD/Layered MVC 消费证据仍未闭合，所以 Boot 3.5 compatibility 继续 `blocked`。Boot 4.1 没有 compatibility entry；该历史条目不授予选择资格；3.2.0 的定向认证见下文。

`compatibility[].artifact_resolution_evidence` 绑定私服解析报告的相对路径和原始字节摘要。加载 catalog 时会同时核对 report ID、仓库 ID、timestamped version、POM/JAR SHA-256 与可证明的 Git tree；报告字节或任一构件绑定变化都返回 `component-binding-drift`。报告不保存 Maven 用户名、密码或令牌。用户级 `settings.xml` 只提供下载配置；其中 profile 下的 `distributionManagement` 会被 Maven 忽略，发布目标必须由发布 POM 持有。

供实例运行时消费的解析报告保存在 `.template-spec/engineering/evidence/`，与平台清单一起分发并保持原始字节摘要；不得引用实例分发排除的 `.template-source/` 维护证据。报告可读只证明构件解析绑定，不改变平台或能力的认证状态。

## 依赖与验证

Boot BOM 管理 Spring Framework/MVC、嵌入式容器、Servlet、Validation、Jackson 等依赖，Boot Plugin 与 Boot 精确版本相同。Boot 3.5 Validation 作为 `platform-managed` capability 解析，不再要求 YSS Validation starter。YSS 父 POM/BOM 仍由用户确认，解析结果冲突则阻断，不能依靠属性覆盖宣称兼容。清单记录构建工具、Lombok、MapStruct、Swagger、ArchUnit 的候选版本；YSS 组件源码不在脚手架步骤中改造。

Boot 4 使用对应 MVC / MVC 测试 starter、Jackson 3 默认栈与新的模块结构；MyBatis-Plus 必须使用相应 Boot 分支。Web/Validation 的 Jakarta 迁移不替换 `javax.sql` 等 Java SE API。Feign 等可选能力须在兼容条目的 `capabilities` 内有验证记录。清单记录 Boot 3.5 的 Spring Cloud `2025.0.3`、Spring Cloud Alibaba `2025.0.0.0`，以及其他候选线；实际内部 BOM 必须解析到对应组合。测试覆盖 Validation、JSON、MyBatis 查询映射和适用的 Feign JSON Decoder。

真实验证保存 Maven 实际 JDK、effective POM、每个模块的依赖树、固定三条 Wrapper 命令结果，以及显式 `scaffold-local` 打包启动结果。启动检查只绑定回环地址，通过启动日志与 HTTP 响应验证机械 Web 服务；测试内 Controller 通过随机端口覆盖 JSON POST 往返及非法参数 400，不编译进生产 Jar，并终止验证进程。H2 仅用于测试和显式本地 Profile，不绑定生产数据库。生成器不添加用户业务示例。

## 维护候选与开放组合

- `catalog_ref`：相对输入文件的候选清单；保留官方平台定义，补充实际待验证的 YSS 组合。
- `java_homes`：以 `8`、`17`、`21` 为键的实际 JDK 根目录。
- `combinations`：每项有 `profile_id`、`spring_boot_version`、`architecture_family`、`contract_ref`，合同须真实批准、当前且指向不存在的输出目录。

## 官方依据

- [Boot 2.7 系统要求](https://docs.spring.io/spring-boot/docs/2.7.18/reference/html/getting-started.html#getting-started.system-requirements)：Java 8 起，默认 Tomcat 9 / Servlet 4.0。
- [Boot 3.5 系统要求](https://docs.spring.io/spring-boot/3.5/system-requirements.html)：Java 17 起，Spring Framework 6.2，默认 Tomcat 10.1 / Servlet 6.0。
- [Boot 4.1.1 系统要求](https://docs.spring.io/spring-boot/system-requirements.html)：Java 17 起，Spring Framework 7.0，Tomcat 11 / Servlet 6.1。
- [Boot 4 迁移说明](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)：模块、starter、测试及 Jackson 变化。
- [MyBatis-Plus 安装](https://baomidou.com/getting-started/install/)：Boot 2、3、4 的 starter 坐标。

- [Spring Cloud 兼容矩阵](https://spring.io/projects/spring-cloud/)：发行列车、Boot 与 OpenFeign 版本对应。

以上是候选配方依据，不替代内部 YSS 组合的实际验证。

## 验证绑定与安全重试

新生成使用平台配置 v2；新后端 Project Scaffold Contract 为 v5，v4 保留空工程兼容。v1 原始记录保留只读审计，不能原样用于新生成或新的支持认证。

兼容证据同时绑定 recipe_digest、generator/verifier source_fingerprint 和 generated_tree_digest。模板、Wrapper、共享生成逻辑或验证逻辑改变时，旧证据不能开放新生成；源文件摘要不包括 Skill 说明文字。输入配方与验证记录分离不代表忽略证据，报告或日志缺失、漂移、失败仍阻断。

版本行按 `(profile_id, spring_boot_version, java_version)` 唯一；同一版本线新增补丁时追加行，不覆盖旧行。多个补丁存在时不得只凭 profile_id 选第一个或最新版本；合同、组合条目和矩阵输入均带精确版本。原补丁的配方和批准不会因追加新补丁而变化。

依赖核验以启动模块 compile/runtime 树为准，不用其他模块或 test/provided 依赖凑齐能力；从独立解析的所选 Boot BOM 获取精确托管版本进行比较，非 Boot 管理的内部兼容版本可通过组合 `components` 映射约束。随后检查实际可执行 Jar 的 BOOT-INF/lib。Maven effective-pom 的 artifact 参数及 dependency tree JSON 行为依据 [Maven Help Plugin](https://maven.apache.org/plugins/maven-help-plugin/effective-pom-mojo.html) 和 [Dependency Plugin](https://maven.apache.org/plugins/maven-dependency-plugin/tree-mojo.html)。

通用运行时依赖仍由真实依赖树和 Boot BOM 核验。YSS 组件能力的精确构件绑定只读取同一兼容条目内的 `component_capabilities`，不得再从 catalog 顶层列表或平行 `components` 目录推断。

Jar 核验拒绝未登记或版本不符的额外库；仅允许 Boot 对应版本的 jarmode 工具以及已选配方中的 provided Lombok 随包出现。原因是 [Boot repackage 默认包含 provided 依赖](https://docs.spring.io/spring-boot/maven-plugin/packaging.html)；这些打包例外不能补足必须存在于 compile/runtime 树的 Web、Servlet、JSON 等能力。

## 双平台专项认证

本轮必选范围为 `spring-boot-2.7-jdk8:2.7.18` 与 `spring-boot-3.5-jdk17:3.5.16`，各覆盖
`domain-driven`、`layered-mvc`。矩阵输入可指定 `required_combinations`，或重复传
`--require-combination <profile_id>:<spring_boot_version>:<architecture_family>`。不指定时仍执行完整矩阵。
未选择的组合记录 `not-executed`，不计为通过，也不影响专项总状态。专项通过不自动修改清单可选性。

每个组合使用合同选择的平台和显式 `java_homes`，本机默认 Java 不决定项目版本。生成的测试夹具覆盖
HTTP JSON/Validation 错误响应、MapStruct 编译与字段映射、MyBatis 持久化往返/分页、事务失败回滚。
夹具在 test scope 使用 H2、标准 MyBatis RowBounds 和 TransactionTemplate；它不证明生产方言、YSS 自动分页切面、业务 Service 代理事务或特定
组件能力。对应能力仍须读取所选平台的源码索引、验证实际组件并绑定独立证据。新增用例必须出现在本次

## 本次 3.2.0-SNAPSHOT 定向验证

新增 `yss-cloud-microservice-3.2.0-snapshot-boot-3.5-jdk17`，仅覆盖 Boot 3.5.16 / JDK 17 的 DDD 和通用 MVC。Parent、BOM 和样例所用组件的唯一 SNAPSHOT、POM/JAR 摘要及仓库来源见 `evidence/scaffold-3.2.0/resolution.json`；旧版本条目保持原状态。

两种空工程及两个独立参考工程均完成 validate/test/package、有效 POM、依赖树、打包检查和真实启动。独立参考工程通过创建、查询、重命名、空名称校验、不存在记录、YSS 响应/异常序列化、MapStruct 注入、MyBatis/H2 和真实 Service 事务回滚。该条目及实际执行的 DTO、错误映射、请求校验和 MyBatis 能力登记为 `verified`，证据仅覆盖这两个架构和这些行为。样例证据不授予业务生命周期批准。

精确配方按实际 Parent 声明使用 SnakeYAML 2.5，覆盖 Boot BOM 的默认 2.4；不改变 Boot/JDK/YSS 版本。打包检查依据真实 starter 清单中的 `Spring-Boot-Jar-Type: dependencies-starter` 识别 Boot 省略的空 starter，其他运行 JAR 继续核验。DDD 启动探测使用现有 `/actuator/health` 并要求 HTTP 200/UP，通用 MVC 空工程要求未声明根路由返回 404。已知异常组件对未定义静态资源返回 500 的行为保留记录，不属于本次参考接口认证；未修改或发布组件。

源码证据逐字节核对远端 POM、sources JAR 与本地组件源码，再以隔离 Git tree 保存源归档/POM 的内容身份，不冒充上游提交。来源状态为 working-tree；正式固定提交及发布资格另行闭合。未认证缓存、Excel、生产数据库、其他平台或组件全部 API。真实报告与日志位于 `evidence/scaffold-3.2.0/{ddd,mvc}/`。
