# 后端脚手架平台合同

DDD 和 Layered MVC 共同消费 `backend-platforms.json`。平台定义是候选配方，`compatibility` 是 YSS 父 POM、BOM、组件能力与证据的同一组合清单。`blocked` 条目只表达已经定位的坐标和缺口，不表示组合已获认证；没有 `verified` 条目表示尚无可开放组合，不表示官方框架不支持这些版本。

## 用户选择

运行 `scripts/backend-platforms` 展示 Boot 精确补丁、Java、YSS 父 POM/BOM、逐组件状态、构件证据和阻塞原因。`scripts/backend-platforms --require-profile <profile-id>` 只校验指定 Profile 的平台基础组合；缺条目或组合阻断时输出 JSON 诊断并返回非 0。组件状态独立展示，是否可用由编译器针对实际请求的 capability 调用组件解析器判定，单个组件阻断不会降级一个已经验证的平台基础组合。新建后端在进入 DDD / MVC 分支设计前必须通过 `gate.backend-architecture-platform-approved`；生命周期编排器将平台与架构放在同一次用户决定中。缺少选择时询问；已有批准且当前的选择只展示摘要并复用。既有工程核验并复用登记的 `architecture_identity` 与固定工程基线/POM 中的实际 Spring Boot 版本，该门禁记录为 `not-applicable`，不重复询问；平台升级另行立项。独立子项目可继承或覆盖，也可一次确认明确列出的多个项目。同一 Maven Reactor 不混用平台。

候选为 2.7.18 / Java 8、3.5.16 / Java 17 或 21、4.1.1 / Java 17 或 21。3.5 和 4.1 推荐 Java 17。新增补丁必须先通过组合验证，生成合同不接受 `x`、版本范围或 `latest`。

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

配置可由 `platformBinding(profile, entry)` 机械构造；该函数把 Profile 中规范化的 `component_platform_line` 持久化到 v2 binding，并由 schema、解析器、架构身份摘要和 Slice 组件绑定摘要共同校验。组件平台线表示可消费的双平台源码索引，不承载 `maintenance`、`candidate` 或 `blocked` 生命周期；生命周期继续由 compatibility 与 capability 状态表达。当前 Boot 2 与 Boot 3 分别固定为 `boot2-java8`、`boot3-java17`。Boot 4 没有现有组件平台线，不生成可批准的 v2 `platform_configuration`，继续在选择阶段阻断。该函数不批准用户选择或开放支持。修改平台、YSS 坐标或依赖配方会使绑定失效；仅更新同配方证据不改变用户选择摘要。历史 Manifest 继续只读验证，不自动补字段或重写批准。仅继承架构不等于继承平台批准。

`resolveBackendPlatform(binding, { root })` 在未显式传入 catalog 时读取该 `root` 下的 `docs/engineering/backend-platforms.json`；未传 `root` 时读取模板仓目录。这样 Slice freshness 与隔离 fixture 使用各自的目录事实，不会意外回退到模板工作区。

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

Boot 2 私服中的 Cache `3.0.0-SNAPSHOT` 使用 JDK 8 构建且 BOM 2.x 管理的是 `2.0.0-SNAPSHOT`；Distributed ID 3.x 同样是 JDK 8 / `javax` 代际。这两个坐标不能作为 Boot 3 主线证据。UserInfo 源模块继承 `com.yss.cloud`，BOM 仍登记 `com.yss.datamiddle`，坐标冲突继续阻断。Boot 3.5 候选单独绑定 Cache 与 Distributed ID `3.1.0-SNAPSHOT`，Validation 使用平台管理的 `org.springframework.boot:spring-boot-starter-validation:3.5.16`；Excel 只保留 `yss-component-excel-mvc`，已移除的 `yss-component-excel-starter` 不再登记。Fesod `2.1.0-SNAPSHOT` 在当前私服不可解析，因此 `external_snapshot_bindings` 为空；Excel 外部依赖改用 Apache 正式发布的 `org.apache.fesod:fesod-sheet:2.0.2-incubating`，并以实际 POM、二进制 JAR 与 sources JAR SHA-256 保存为不可变 `resolved` release binding。Fesod 字节绑定不替代消费认证；YSS parent/BOM、timestamped SNAPSHOT、源码绑定、`AutoConfiguration.imports` 与 DDD/Layered MVC 消费证据仍未闭合，所以 Boot 3.5 compatibility 继续 `blocked`。Boot 4.1 没有 compatibility entry；当前目录不对任何 Profile 宣称可选择。

`compatibility[].artifact_resolution_evidence` 绑定私服解析报告的相对路径和原始字节摘要。加载 catalog 时会同时核对 report ID、仓库 ID、timestamped version、POM/JAR SHA-256 与可证明的 Git tree；报告字节或任一构件绑定变化都返回 `component-binding-drift`。报告不保存 Maven 用户名、密码或令牌。用户级 `settings.xml` 只提供下载配置；其中 profile 下的 `distributionManagement` 会被 Maven 忽略，发布目标必须由发布 POM 持有。

## 依赖与验证

Boot BOM 管理 Spring Framework/MVC、嵌入式容器、Servlet、Validation、Jackson 等依赖，Boot Plugin 与 Boot 精确版本相同。Boot 3.5 Validation 作为 `platform-managed` capability 解析，不再要求 YSS Validation starter。YSS 父 POM/BOM 仍由用户确认，解析结果冲突则阻断，不能依靠属性覆盖宣称兼容。清单记录构建工具、Lombok、MapStruct、Swagger、ArchUnit 的候选版本；YSS 组件源码不在脚手架步骤中改造。

Boot 4 使用对应 MVC / MVC 测试 starter、Jackson 3 默认栈与新的模块结构；MyBatis-Plus 必须使用相应 Boot 分支。Web/Validation 的 Jakarta 迁移不替换 `javax.sql` 等 Java SE API。Feign 等可选能力须在兼容条目的 `capabilities` 内有验证记录。清单记录 Boot 3.5 的 Spring Cloud `2025.0.3`、Spring Cloud Alibaba `2025.0.0.0`，以及其他候选线；实际内部 BOM 必须解析到对应组合。测试覆盖 Validation、JSON、MyBatis 查询映射和适用的 Feign JSON Decoder。

真实验证保存 Maven 实际 JDK、effective POM、每个模块的依赖树、固定三条 Wrapper 命令结果，以及显式 `scaffold-local` 打包启动结果。启动检查只绑定回环地址，通过启动日志与 HTTP 响应验证机械 Web 服务；测试内 Controller 通过随机端口覆盖 JSON POST 往返及非法参数 400，不编译进生产 Jar，并终止验证进程。H2 仅用于测试和显式本地 Profile，不绑定生产数据库。生成器不添加用户业务示例。

## 维护候选与开放组合

`scripts/verify-backend-platform-matrix --evidence-dir <目录> --inputs <输入.json>` 是维护入口；没有输入或环境时输出十组 `blocked` 及原因，不伪造 Maven 结果。输入结构：

- `catalog_ref`：相对输入文件的候选清单；保留官方平台定义，补充实际待验证的 YSS 组合。
- `java_homes`：以 `8`、`17`、`21` 为键的实际 JDK 根目录。
- `combinations`：每项有 `profile_id`、`spring_boot_version`、`architecture_family`、`contract_ref`，合同须真实批准、当前且指向不存在的输出目录。

兼容条目包含 `id`、`profile_id`、`spring_boot_version`、`parent`、`bom`、`status`、`capabilities`、`component_capabilities` 和 `evidence`。未验证时使用 `candidate` 或 `blocked`。每条证据绑定架构、可读取报告的 `ref` 与原始字节 `digest`。报告须匹配 Boot、Java、父 POM/BOM，三条 Maven 命令真实成功，并通过依赖、Surefire 实际用例和启动检查；跳过测试不通过。报告的 `verified_capabilities` 逐架构覆盖所选能力。`evidence_artifacts` 绑定日志、effective POM、依赖树和 `platform-tests.xml` 的相对路径与字节摘要，缺失或漂移即阻断。

候选工程始终标记 `platform_verification=candidate`，不能进入普通验证完成升级、业务生成或首切片验证。维护者将真实证据及相关日志保存为可分发的相对路径包，审阅全部适用能力后才可把对应组合登记为 `verified`。候选晋级或替换同配方证据不改变配置摘要；真正的依赖配方变化才重新确认。矩阵命令不自动修改兼容清单、不批准合同、不发布版本。

`scripts/fixtures/backend-scaffold/` 下的合成合同仅测试机制，绝不作为兼容证据。标准生成 CLI 无候选参数或环境变量后门。

## 官方依据

- [Boot 2.7 系统要求](https://docs.spring.io/spring-boot/docs/2.7.18/reference/html/getting-started.html#getting-started.system-requirements)：Java 8 起，默认 Tomcat 9 / Servlet 4.0。
- [Boot 3.5 系统要求](https://docs.spring.io/spring-boot/3.5/system-requirements.html)：Java 17 起，Spring Framework 6.2，默认 Tomcat 10.1 / Servlet 6.0。
- [Boot 4.1.1 系统要求](https://docs.spring.io/spring-boot/system-requirements.html)：Java 17 起，Spring Framework 7.0，Tomcat 11 / Servlet 6.1。
- [Boot 4 迁移说明](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)：模块、starter、测试及 Jackson 变化。
- [MyBatis-Plus 安装](https://baomidou.com/getting-started/install/)：Boot 2、3、4 的 starter 坐标。

- [Spring Cloud 兼容矩阵](https://spring.io/projects/spring-cloud/)：发行列车、Boot 与 OpenFeign 版本对应。

以上是候选配方依据，不替代内部 YSS 组合的实际验证。

## 验证绑定与安全重试

新生成使用平台配置 v2；Project Scaffold Contract 仍为 v4。v1 原始记录保留只读审计，不能原样用于新生成或新的支持认证。

兼容证据同时绑定 recipe_digest、generator/verifier source_fingerprint 和 generated_tree_digest。模板、Wrapper、共享生成逻辑或验证逻辑改变时，旧证据不能开放新生成；源文件摘要不包括 Skill 说明文字。输入配方与验证记录分离不代表忽略证据，报告或日志缺失、漂移、失败仍阻断。

版本行按 `(profile_id, spring_boot_version, java_version)` 唯一；同一版本线新增补丁时追加行，不覆盖旧行。多个补丁存在时不得只凭 profile_id 选第一个或最新版本；合同、组合条目和矩阵输入均带精确版本。原补丁的配方和批准不会因追加新补丁而变化。

依赖核验以启动模块 compile/runtime 树为准，不用其他模块或 test/provided 依赖凑齐能力；从独立解析的所选 Boot BOM 获取精确托管版本进行比较，非 Boot 管理的内部兼容版本可通过组合 `components` 映射约束。随后检查实际可执行 Jar 的 BOOT-INF/lib。Maven effective-pom 的 artifact 参数及 dependency tree JSON 行为依据 [Maven Help Plugin](https://maven.apache.org/plugins/maven-help-plugin/effective-pom-mojo.html) 和 [Dependency Plugin](https://maven.apache.org/plugins/maven-dependency-plugin/tree-mojo.html)。

首次生成成功而 Maven 验证失败时，使用原输入加 `--resume`。恢复前重新验证当前合同、架构决定与工程批准，并核对 Manifest、生成文件、文件清单和生成器/验证器摘要；任一漂移即阻断，绝不覆盖用户修改或再次生成。每次验证写入新的证据目录，旧日志保留。Surefire 报告必须来自本次命令执行，旧报告或跳过测试不能补足证据。发生源码或模板变化时，请使用新候选输出目录和对应合同，不通过恢复模式覆盖旧工程。

空脚手架验证的证据目录必须位于生成工程外部，避免证据文件被误认为新增源码。首切片验证在批准的切片合同通过既有门禁后复用构建检查，但记录 `verification_scope=first-slice`；其证据不能用于开放平台组合，也不要求业务代码保持空脚手架摘要。

通用运行时依赖仍由真实依赖树和 Boot BOM 核验。YSS 组件能力的精确构件绑定只读取同一兼容条目内的 `component_capabilities`，不得再从 catalog 顶层列表或平行 `components` 目录推断。

Jar 核验拒绝未登记或版本不符的额外库；仅允许 Boot 对应版本的 jarmode 工具以及已选配方中的 provided Lombok 随包出现。原因是 [Boot repackage 默认包含 provided 依赖](https://docs.spring.io/spring-boot/maven-plugin/packaging.html)；这些打包例外不能补足必须存在于 compile/runtime 树的 Web、Servlet、JSON 等能力。
