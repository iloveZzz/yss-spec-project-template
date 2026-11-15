# Backend 脚手架、技术栈与技能整合调研结论

调研日期：2026-11-15（Asia/Shanghai）。本报告供模板、CLI 与后端组件维护者判断优化范围和实施顺序。结论来自本地源码、已安装 CLI 的只读命令与纯预览、代表组件的离线 Maven 解析，以及官方文档和开源技能源码。本文是研究与设计建议，所列改造尚未实施。

**建议保留 DDD/MVC 双架构和现有 Backend 技能集合，先解决入口、说明和依赖的一致性，再推进新版平台适配。** 当前没有证据支持重写整套框架或批量换用社区技能。优先级较高的问题已有具体证据：审计说明落后于实现；代表组件确实解析到旧的 Jackson/POI 覆盖版本；脚手架预览接受未经 YSS 验证的跨代组合；部分深层参考仍依赖已经退役的流程协议。

本次形成六项结论：

1. **统一新工程生成入口。** 已发布 CLI 能满足的生成交给 CLI；技能负责选型、参数、已有工程维护和生成后的适配。共享模板资产，保留两种架构的职责差异。
2. **保留 42 项默认技能、54 项可用库。** 安装数量不代表一次加载数量；修订触发冲突、过时示例和重复规则，比合成一个万能技能更有依据。
3. **优先修正组件使用事实。** 审计改用 `detailPaths`；JWT 业务 claim 映射需要明确支持范围；审计的方法返回、事务提交和持久投递三种语义必须分开。
4. **收敛实际生效的依赖覆盖。** 代表 Excel 模块解析到 Jackson 2.16.2、POI 5.2.3；逐项核对覆盖原因，不能仅升级 Boot 属性后宣称依赖已整体升级。
5. **Boot 3.5 是当前 YSS 的维护与迁移过渡线。** Boot 4 是后续候选，不应因 catalog 中存在平台选项或 dry-run 成功而宣布整组兼容。
6. **增加工程方法深度，暂不扩大默认基础设施。** 在既有参考中补充认证授权接线、MVC 事务幂等、数据库迁移和可观测性；根据真实需求决定是否引入 Outbox、Testcontainers 或新的运行组件。

本次读取的版本如下。后续复用结论时，应重新核对涉及变化的文件与实际构件。

| 对象 | 本轮基线 | 观察范围 |
|---|---|---|
| 模板源码 | `yss-spec-project-template`，`main / 377d251e` | 开始时工作树干净；相较前轮 `b8a8ceb8`，本次关注的脚手架技能/资产、平台目录和旧流程问题未变 |
| CLI 源码 | `yss-cli`，`main / f36cdb6` | 开始时工作树干净；`src/scaffold/`、`src/cli.rs` 相较前轮 `bcef09a` 未变 |
| 本机已安装程序 | CLI `3.6.0 / bcef09a`，内嵌 Template `5.6.0 / b8a8ceb8` | 实际执行帮助、catalog 和纯预览；不是当前源码 HEAD 的构建 |
| 后端组件本体 | `yss-cloud-microservice`，`branch-3.2.0 / 3d287faba5e10b0784ae23eeb58278825af105e5` | 路径位于 `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice`；仅 `.openidea/` 未跟踪，没有已跟踪源码改动 |
| 公开来源 | 2026-11-15 访问的官方文档、维护者仓库 | GitHub `main`、`current` 文档属于可变来源；本文未导入或安装第三方技能 |

报告使用四种证据层次：实际命令结果证明该次观察；源码分析证明已读实现的条件与路径；历史记录仅证明当时记录的范围；建议说明下一步取舍。源码存在、生成成功、解析成功、编译通过、测试通过和运行成功不能互相替代。

**现有架构的主要边界合理，应继续复用。** DDD Domain 不直接承载持久化，Application 管理用例和事务，Infrastructure 实现持久化适配，Web 负责 HTTP 与边界模型；MVC 用 Service 承担规则和事务，不另加 Domain/Gateway。两者服务于不同复杂度，不需要合并为同一种目录结构。

| 比较项 | DDD 当前产物 | MVC 当前产物 | 结论 |
|---|---|---|---|
| 模块 | domain/application/infrastructure/adapter/web/bootstrap | server/service/repository | 保留双路线；新建时按业务复杂度选择，维护时沿用既有结构 |
| 生成范围 | 空骨架、POM、启动配置、Wrapper、README、来源记录 | 同类空骨架及三模块依赖 | 不承诺业务样例或测试套件；当前参考目录不等于默认产物 |
| 版本参数 | Java、Boot、Parent/BOM 显式输入 | 相同 | 帮助示例不能称为隐式默认值 |
| 数据库 | 未选择生产数据库；本地运行配置使用 H2 | 本地运行配置使用 H2 | H2 仅支持本地检查，不证明生产方言 |
| 错误映射 | Web 声明 YSS Exception 依赖 | Server 未预装同项依赖 | 空 MVC 文档明确不生成错误映射，差异本身不等于缺陷；业务要统一协议时需补接入 |
| 健康探测 | Bootstrap 声明 Actuator | 空工程未预装 Actuator | 不把 MVC 根路由 404 当作健康接口；按实际工程确定探测方式 |
| OpenAPI | 有 Swagger annotations，未直接声明 springdoc runtime | 未直接声明 springdoc runtime | 注解依赖不能证明存在 `/v3/api-docs` 或 Swagger UI |
| ID 与逻辑删除 | 配置包含 `assign_id` 与 `deleted` 约定 | 未设置对应默认约定 | 说明工程策略，不由这些配置推导所有业务都应软删 |

依据：[DDD renderer](/Users/zhudaoming/Projects/yss-cli/src/scaffold/ddd.rs:16)、[MVC renderer](/Users/zhudaoming/Projects/yss-cli/src/scaffold/mvc.rs:26)、[Web POM](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-ddd-scaffold-generator/assets/templates/pom/web-pom.xml.template:33)、[DDD 配置](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-ddd-scaffold-generator/assets/templates/config/application.yml.template:8)、[MVC 产物边界](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-layered-mvc-scaffold-generator/references/architecture.md:33)。

**以下问题应进入第一批优化，其中运行风险与文档问题分开处理。** 优先级表示建议的处理先后，不代表已完成线上事故或安全漏洞定级。

| 编号 | 当前事实与影响 | 建议及边界 |
|---|---|---|
| F1：双重生成入口 | 技能要求 Agent 直接用资产生成，教程和已安装 CLI 已支持 scaffold；DDD 技能指向完整 reference 样例，而空骨架使用 templates | 两个技能统一优先使用现有 CLI；区分空骨架与教学参考。已有工程增量维护不重新生成 |
| F2：失效产物承诺 | DDD 文档仍声称生成 ArchitectureRulesTest；MVC 文档声称默认附带 examples/reference；部分参考保留固定 Maven 完成门槛 | 删除与当前行为不符的文字；保留必要验证说明，不为旧文档重建测试套件 |
| F3：审计接入说明过时 | 技能要求 isNeedArgs/isNeedResult；当前注解已弃用这两个开关，提取器只按 detailPaths 采集白名单字段 | 同步技能、示例、索引导航和副本；保留敏感字段拒绝、标量与长度限制 |
| F4：旧依赖覆盖实际生效 | Excel 模块离线解析得到 Jackson 2.16.2、POI 5.2.3 | 核对覆盖依据和实际消费者，按组合调整；没有运行故障或具体 CVE 证据时不作漏洞断言 |
| F5：用户身份映射边界不完整 | 标准已认证 JWT 可保留 name/authorities，但不进入 OAuth2AuthenticatedPrincipal 的自定义 claim 映射分支 | 在现有 provider 中补已认证 Jwt 映射或明确 converter 适配要求；不让业务代码自行解析原始 Bearer token |
| F6：审计语义需要澄清 | AfterReturning 直接投递内存队列，没有事务提交绑定和持久重试 | 分清方法成功、业务提交成功、不可丢失；按所需语义选择最小实现，不能仅调 AOP 顺序就承诺可靠审计 |
| F7：深层参考残留旧流程 | Domain、Web、Application、Boot 迁移参考仍包含暂停、批准 Profile、Manifest/Slice/合同编译器等退役前置 | 改为实际需求、源码、依赖和必要验证驱动；保留真实业务澄清、文件保护和安全限制 |
| F8：catalog 状态容易误读 | 显示历史 evidenceStatus，但验证范围展示不完整；允许无 YSS 验证记录的 Boot4 组合通过预览 | 展示生成能力、已验证范围和已知限制；未知不能包装成已支持，也不能只因未登记就拒绝自定义工程 |

F1/F2 依据：[DDD 技能](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-ddd-scaffold-generator/SKILL.md:8)、[DDD 架构参考](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-ddd-scaffold-generator/references/ARCHITECTURE.md:76)、[生成流程参考](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-ddd-scaffold-generator/references/generation-workflow.md:9)。F7 依据：[Domain 旧暂停协议](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-domain/references/domain-layer-guide.md:95)、[Web Profile 要求](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-web-controller/references/web-adapter-layer-guide.md:17)、[Application 旧布局限制](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-application/references/application-layer-guide.md:85)、[Boot 迁移旧流程](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-up-springboot3/SKILL.md:8)。

**依赖覆盖已经从静态线索推进到代表模块的实际解析证据。** 当前本体继承 Boot 3.5.16，组件聚合 POM 导入 YSS BOM；BOM 显式管理 Jackson/POI。根 `./mvnw` 离线执行 Excel 模块的 `help:effective-pom` 和 `dependency:tree` 均退出 0。本次未编译、运行测试或启动服务。

| 代表解析路径 | 实际版本 | 本模块 scope |
|---|---|---|
| Boot Web → starter-json → Jackson core/databind/annotations | Boot 3.5.16 → Jackson 2.16.2 | provided |
| starter-json → Jackson jdk8/jsr310/parameter-names | 2.16.2 | provided |
| fesod-sheet → fesod-common/fesod-shaded | 2.0.2-incubating | compile |
| fesod-sheet → poi/poi-ooxml → poi-ooxml-lite | 5.2.3 | compile |

本次离线缓存中导入的 YSS BOM 与仓库 BOM 逐字节一致，SHA-256 为 `335fa7b67232d0c0bc296d339806f13b59bed46a51b068970fce6dd5308fcee5`。因此该观察不能简单归因于“本机拿到了旧 BOM”。依据：[组件聚合 POM](/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/pom.xml:48)、[BOM 属性](/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-components-bom/pom.xml:55)、[Jackson 管理项](/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-components-bom/pom.xml:537)、[Excel POM](/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-excel-mvc/pom.xml:5)。

建议先解释每项覆盖的兼容原因，再删除无依据覆盖。Jackson 优先回到选定平台统一管理；POI 与 Fesod 按其依赖和实际导入导出行为共同验证。反向限制是：该模块的 Jackson 为 provided，消费应用最终运行版本仍取决于自己的依赖管理；本轮没有证明所有产品运行的都是该版本，也没有执行漏洞审计。Spring Boot 提供依赖版本管理，但应用显式覆盖会改变最终组合。[官方依赖管理说明](https://docs.spring.io/spring-boot/3.5/appendix/dependency-versions/coordinates.html)

**身份组件的安全入口合理，但“能读到认证身份”与“业务字段完整”是两件事。** 当前 provider 拒绝空、未认证和 anonymous；通用已认证对象保留 `authentication.getName()` 和 authorities；只有 principal 为 `OAuth2AuthenticatedPrincipal` 时才映射自定义用户字段。Spring Security 6.5.11 的本机 sources JAR 表明，标准 `JwtAuthenticationToken` 默认 principal 为 `Jwt`，后者实现 `JwtClaimAccessor`，不实现上述接口。因此标准 JWT 的 `userCode`、显示名、email、issuer 不会进入当前专门映射分支。

这是字段映射缺口，不能表述为 JWT 没有认证或整个身份丢失。应用若已经把 principal 转为 `UserInfo`，则不受该限制。建议在现有 provider 中显式支持已认证 Jwt，复用映射规则，或者在接入说明中要求使用已有 converter；从 claim 到用户编号、租户或权限的含义仍应来自真实业务约定。依据：[provider](/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/SecurityContextCurrentUserProvider.java:14)、[现有测试](/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-userinfo-starter/src/test/java/com/yss/cloud/user/SecurityContextCurrentUserProviderTest.java:21)、[Spring Security JWT 模型](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)。本轮未执行真实 JWT 请求或这些测试。

**审计应明确采用哪一种成功语义。** 当前注解和字段提取器已有白名单加固，技能需要跟上；发布可靠性则是另一项设计问题。[旧技能说明](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-audit-log/SKILL.md:36)、[当前 AuditLog](/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/AuditLog.java:34)、[白名单提取器](/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/AuditDetailExtractor.java:28)。

| 所需语义 | 当前实现能否保证 | 最小设计方向 |
|---|---|---|
| 被代理方法正常返回后尝试记录 | 对命中切面的方法有对应路径；仍受队列和订阅失败影响 | 保留现实现，写清允许丢失与指标含义 |
| 业务事务成功提交才记录 | 不能统一保证；AfterReturning 不等于外层事务提交 | 在发布边界绑定提交回调，并定义无事务调用行为 |
| 已提交记录在进程崩溃后仍可恢复投递 | 内存队列不能保证 | 只有确有该需求时采用同事务 Outbox、持久重试和消费者幂等 |
| 操作尝试及失败也要留痕 | 单纯 AfterReturning 不覆盖所有失败 | 单独定义失败事件与采集范围，避免把失败误记为业务成功 |

已读发布器为容量 1000 的内存队列，10 个工作线程，入队失败会丢弃并计量，订阅失败记录指标/警告；关闭时最多等待 2 秒，未结束则请求停止，随后清理残余队列。外层事务调用另一个带审计的 Bean，内层正常返回后可能已投递，外层随后仍可能回滚；源码没有将事件绑定外层提交。反例是审计位于 Controller、内部服务事务已完成的调用，此时发布可能发生在提交之后。准确结论是“缺少提交后保证”，而不是“所有审计都在提交前发出”。[切面](/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/configuration/AuditLogAspect.java:77)、[发布器](/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/subscriber/YssAuditPublishService.java:60)。

Spring 的事务事件可以绑定提交阶段，但提交后回调本身不提供崩溃恢复；Spring Modulith 的事件发布记录可作为持久化方向参考。是否采用应由所需可靠性和现有技术栈决定，不默认加入每个工程。[事务事件官方说明](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html)、[持久事件发布参考](https://docs.spring.io/spring-modulith/reference/events.html)

**脚手架输入应区分合法参数、可生成组合和已验证运行组合。** 本轮实际以 Boot 4.1.1 / Java 17 / `spring-boot-4.1-jdk17`，配合 `com.yss.cloud:yss-cloud-microservice:3.2.0-SNAPSHOT` 和 YSS BOM 3.2.0-SNAPSHOT 执行 DDD、MVC 的 `--dry-run --json`。DDD 返回 planned、21 个文件，MVC 返回 planned、20 个文件，退出码均为 0；目标目录均未创建。

这证明 CLI 没有拒绝该组合。源码验证目前主要检查参数格式与 platform/Boot/Java 一致，未验证 Parent/BOM 与平台的关系；YSS 3.2.0 的既有记录与实际本体是 Boot 3.5，目录还列有 Boot3 专用 MyBatis starter。由此可以判断存在跨代组合误用风险，但本轮没有生成、构建并证明该 Boot4 组合必然失败。[参数校验](/Users/zhudaoming/Projects/yss-cli/src/scaffold/context.rs:218)、[YSS 3.2.0 平台记录](/Users/zhudaoming/Projects/yss-spec-project-template/.template-spec/engineering/backend-platforms.json:817)、[Boot3 starter 记录](/Users/zhudaoming/Projects/yss-spec-project-template/.template-spec/engineering/backend-platforms.json:1084)。

建议先把 catalog 中已有的验证范围和限制显示出来，未知组合明确标为未验证。后续只有能够由准确坐标与真实依赖证明的矛盾才做针对性输入校验，不以历史 verified 白名单拒绝用户自定义 Parent。保持已有目录、符号链接、占位符、固定凭据保护，以及 dry-run 不写文件的行为。[catalog 实现](/Users/zhudaoming/Projects/yss-cli/src/scaffold/mod.rs:99)

**上游维护状态要求规划新版平台，但不能跳过 YSS 适配。** 官方 2026-06-25 公告将 Boot 3.5.16 标为该系列最后一次开源发布；当前 Spring Cloud 页面将 2025.0 标为结束支持。商业支持是另一条路径，本轮没有调查团队是否购买或采用了相应支持。[Boot 公告](https://spring.io/blog/2026/06/25/spring-boot-3-5-16-available-now/)、[Cloud 支持矩阵](https://spring.io/projects/spring-cloud/)

| 路线 | 本次判断 | 建议 |
|---|---|---|
| Boot 2.7 / Java 8 | 历史维护与迁移对象，非本轮源码审计主线 | 不作为新建推荐；保留准确的旧线分诊知识 |
| Boot 3.5.16 / Java 17 / YSS 3.2.0-SNAPSHOT | 当前本体与既有定向验证所对应的组合 | 作为存量维护和迁移过渡线；解释支持安排，处理依赖覆盖与实际缺陷 |
| Boot 4.1 / Java 17 | 上游可行，YSS 整组兼容尚未验证 | 先作为候选；保持 Java 17 可减少同时变动的变量，不直接改默认 |
| Java 21 及其他更新 JDK | 不能由 Boot 的最低 JDK 要求推导 YSS、部署环境和所有工具已通过 | 有明确部署或语言需求时独立评估，避免与 Boot 大版本升级捆绑 |
| Cloud 2025.1 + Boot 4.1 | Spring 官方矩阵注明从 Cloud 2025.1.2 起支持 | 使用具体 service release，并单独核查 Alibaba 及实际使用组件 |

本次访问的 Boot 系统要求页显示 4.1.2，最低 Java 为 17。Alibaba 官方当前列出的 2025.1.0.0 组合是 Cloud 2025.1.0 / Boot 4.0.0，不能仅由 Spring Cloud 的 4.1 支持外推出 Alibaba 整组已支持；缺少记录也不等于证明不兼容。[Boot 系统要求](https://docs.spring.io/spring-boot/system-requirements.html)、[Alibaba 版本说明](https://sca.aliyun.com/en/docs/2025.x/overview/version-explain/)

Boot4 适配范围至少涉及 Jackson 3、starter/自动配置包结构、测试模块、Security 及各实际组件。官方明确不建议用同一 starter 构件同时承担 Boot3/4 适配；可沿用同一源码仓和共享业务核心，但平台适配必须有明确版本边界。当前 `AutoConfiguration.imports` 已在多项 Boot3 组件源码中存在，不能再把“没有迁移自动配置入口”当作现状问题。[官方迁移指南](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)、[UserInfo 注册文件](/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-userinfo-starter/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports:1)

技术栈整合建议限定在已有能力上：

| 领域 | 保留或调整方向 | 不应直接推导的结论 |
|---|---|---|
| Web 与持久化 | 保留 Spring MVC、MyBatis-Plus 和既有 YSS 封装；按目标 Boot 选择 starter 与分页插件 | 不因社区示例采用 JPA/WebFlux 就整体替换当前栈 |
| DTO 与映射 | 保留 Result/PageResult、既有 wire 约定、MapStruct/Lombok 和 binding | 不因社区推荐 ProblemDetail 就破坏现有 API |
| 缓存 | 维持按租户/机构隔离 key、同时覆盖失效路径、明确 fallback 一致性 | Spring Cache 抽象不提供跨进程一致性；Redis fallback 不自动成为可靠二级缓存 |
| 分布式 ID | 当前 Local + Segment/Snowflake 按实际需求选择；保留迁移水位和唯一性约束 | 不因历史技能有 CosId 就重新引入；空工程不自动决定所有业务主键策略 |
| 数据库迁移 | 沿用项目已经采用的机制；需要选型时比较 Flyway/Liquibase 等与目标库的适配 | 不自动执行 DDL，不改写已经执行的迁移，不以 H2 替代生产方言证据 |
| 测试与观测 | 复用当前测试技能；按需使用目标数据库/Testcontainers、Actuator/Micrometer | 不默认新增容器依赖、遥测后端、全量端点或固定测试门禁 |
| 架构演进 | 先保留 DDD/MVC；模块边界治理确有需要时参考 Spring Modulith | 暂不增加第三套架构脚手架，不默认将单体拆成微服务 |

上游对照：[MyBatis-Plus 安装与代际 starter](https://baomidou.com/en/getting-started/install/)、[MapStruct 与 Lombok](https://mapstruct.org/faq/)、[Spring Cache 边界](https://docs.spring.io/spring-framework/reference/integration/cache/strategies.html)、[Testcontainers](https://java.testcontainers.org/)、[Spring 可观测性](https://docs.spring.io/spring-boot/reference/actuator/observability.html)、[Spring Modulith 模块模型](https://docs.spring.io/spring-modulith/reference/fundamentals.html)。这些来源支持候选方法，不构成 YSS 消费工程的实测结论。

**开源社区适合提供可选择的方法和反例，不能替代当前工程事实。** 本轮查看的是维护者仓库中的技能正文，未以市场评分、下载量或目录网站标签判断质量。以下建议均是适配方向，没有直接安装或复制整包。

| 来源 | 可吸收的方法 | YSS 中的落点与限制 |
|---|---|---|
| [Agent Skills 规范](https://agentskills.io/specification) | 元数据发现、正文按需加载、资源继续按需读取 | 保持清晰 description 与短入口；42 项预装不等于每次加载42项 |
| [create-spring-boot-java-project](https://github.com/github/awesome-copilot/blob/main/skills/create-spring-boot-java-project/SKILL.md) | 区分新建与已有工程，先检测版本，使用 Wrapper | 复用 YSS CLI/Parent/BOM；不直接继承其数据库、Docker 等默认选择 |
| [java-springboot](https://github.com/github/awesome-copilot/blob/main/skills/java-springboot/SKILL.md) | 按实际版本、持久化方式和工程惯例选择参考，不隐式升级 | 补入既有用例/Web/技术设计参考；不覆盖 YSS 契约或引入第二套主入口 |
| [spring-security](https://github.com/github/awesome-copilot/blob/main/skills/spring-security/SKILL.md) | 区分 Bearer 与 Cookie/Session，端点和方法授权，401/403 与安全测试 | 补 userinfo 接线、Web 对象归属与租户授权；不把当前用户组件改造成认证平台 |
| [spring-observability](https://github.com/github/awesome-copilot/blob/main/skills/spring-observability/SKILL.md) | 指标标签基数、端点暴露、日志关联、追踪与运行诊断分工 | 补技术设计和构建部署参考；不默认引入仪表盘、Agent 或公网诊断端点 |
| [spring-boot-testing](https://github.com/github/awesome-copilot/blob/main/skills/spring-boot-testing/SKILL.md) | 根据被验证行为选最小测试层次，区分 Boot3/4、实际测试阶段与工具版本 | 补已有 yss-backend-testing 参考；JPA 专用切片不能直接套在 MyBatis 上 |
| [spring-boot-4-migration](https://github.com/github/awesome-copilot/blob/main/skills/spring-boot-4-migration/SKILL.md) | 独立迁移任务、按版本处理 Jackson/starter/配置/测试变化 | 独立研究 YSS Boot4 适配；不扩写名为 up-springboot3 的技能去暗含 Boot4 支持 |
| [Jeffallan spring-boot-engineer](https://github.com/Jeffallan/claude-skills/blob/main/skills/spring-boot-engineer/SKILL.md) | 构造器注入、校验和分层示例 | 其 Boot3/JPA/WebFlux 范围与 YSS 有差异，适合择例参考，不适合整包替换 |

一个具体反向信号是：本次读取的社区 `spring-boot-testing` 入口将 MockMvcTester 的参考标为“3.2+”，而 Spring Framework 官方 API 明确其起始版本为 6.2。不能把社区标签直接作为所有 Boot3 工程的可用性条件，应核对目标实际 Framework 版本。该例说明社区技能仍需技术复核，不代表整份技能无价值。[官方 MockMvcTester API](https://docs.spring.io/spring-framework/docs/6.2.16/javadoc-api/org/springframework/test/web/servlet/assertj/MockMvcTester.html)

**技能整合建议保持成员稳定，收敛规则所有权。** 现有“按职责整合后完整预装”的方向已有仓库设计记录，当前分发为42项默认、54项可用；本轮不提出缩减默认集合，也不增加新的总路由技能。默认成员按职责可归为下表，合计42项。[既有整合设计](/Users/zhudaoming/Projects/yss-spec-project-template/.template-source/design/2026-11-01-backend-skills-delivery-design.md:7)、[当前技能地图](/Users/zhudaoming/Projects/yss-spec-project-template/.template-spec/agents/profile-skills.md:5)

| 职责组 | 数量 | 当前默认技能 | 本轮建议 |
|---|---:|---|---|
| 协调与工作维护 | 10 | setup-yss-harness、implement、to-tickets、handoff、using-git-worktrees、resolving-merge-conflicts、java-backend-commit、git-commit-core、i-have-adhd、yss-skill-source-index-refresh | 保留；统一 MVC 用例能力指向；拆票、提交、索引刷新等继续按对应请求调用 |
| 研究与设计 | 8 | yss-research、grilling、yss-technical-design、yss-tactical-design、codebase-design、domain-modeling、prototype、database-analysis-docs | 保留；系统设计与 DDD 内部设计分工不变 |
| 质量与诊断 | 4 | code-review、diagnosing-bugs、yss-backend-testing、tdd | 保留；普通测试不自动触发 TDD |
| 脚手架 | 2 | yss-ddd-scaffold-generator、yss-layered-mvc-scaffold-generator | 保留双入口，共享真实可复用资产 |
| Java 实现辅助 | 3 | alibaba-java-code-style、lombok、mapstruct | 按涉及代码加载，不默认重写现有风格 |
| 分层实现 | 4 | yss-domain、yss-application、yss-repository、yss-web-controller | 清理深层参考冲突；Application 同时承接 DDD Application 与 MVC Service |
| 协议与边界 | 4 | yss-dto、yss-openapi-governance、yss-validation、yss-exception | DTO 唯一持有响应约定，其余引用；避免重复定义 |
| 组件 | 7 | yss-mybatis、yss-cache、yss-userinfo、yss-audit-log、yss-distributed-id、yss-excel-mvc、yss-resilience4j | 按实际依赖和任务读取，安装不意味着接入 |

前轮已按共享源加 Backend 覆盖层合成有效树，对默认42项 Backend WorkBuddy 副本逐文件比对，没有发现内容漂移；技能内部 Markdown 相对引用也未发现缺失。`prototype/LOGIC.md` 属于清单明确排除项。本轮增量核查未改变该成员集合。该结果只证明检查范围内的文件一致性，不证明所有宿主的自动发现或实际调用效果。

四类代表任务的静态分析如下。这是对规则的推演，没有运行真实宿主实验或用虚构成功率证明改进。

| 代表请求 | 应有路径 | 当前偏差 | 修订后的边界 |
|---|---|---|---|
| 修复已有 MVC Service 的重复提交 | implement → application 的 MVC 分支 → 必要持久化/测试 | 主入口支持 MVC，地图/implement 指向不够一致，MVC 专页过薄 | 沿用 Service；不新增 Domain/Gateway，不重新生成工程 |
| 在已有 DDD 中增加规则明确的聚合 | 按需技术/战术设计 → Domain/Application/Repository/Web | Domain 深层参考仍要求进入 new_impacts 并暂停 | 已授权明确规则直接承接；真正业务决定缺失才澄清 |
| 排查分页或缓存失效 | 对应组件技能＋诊断，查实际 POM/调用方/源码 | 历史索引容易被误作现行实现 | 索引仅定位；不自动更新索引或加载全部组件 |
| 评估或执行 Boot2→3 迁移 | 迁移技能 → 真实依赖和组件 → 对应验证 | 仍依赖旧 Manifest、Slice 和合同编译器 | 保留兼容和数据安全约束，删除退役流程前置；不外推 Boot4 |

依据：[Application 主入口](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-application/SKILL.md:8)、[MVC 参考](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-application/references/profiles/layered-mvc-service.md:3)、[Backend implement](/Users/zhudaoming/Projects/yss-spec-project-template/profiles/backend/.agents/skills/implement/SKILL.md:12)。

现有指南已经覆盖不少关键工程约束，补充内容应准确落到缺口，而不重复造技能：

| 领域 | 已有覆盖 | 最小补充 |
|---|---|---|
| 认证授权 | 认证先于身份读取、可信代理、Web 授权与字段白名单 | Principal 支持表、资源服务器接线、对象/租户授权、Cookie/Bearer 差异及拒绝语义 |
| 事务幂等 | 用例事务、提交后副作用、并发、重试与恢复 | MVC 代理/自调用、唯一约束与幂等键、重复请求返回、提交后失败恢复的具体示例 |
| 数据库迁移 | 新建 DDL 与既有库迁移区分、历史数据、锁和恢复 | 现有迁移工具接入、不可改写已执行迁移、应用/schema 兼容顺序 |
| 可观测性 | 健康入口、日志位置、异常脱敏和运维说明 | Actuator/Micrometer/Tracing 接线、低基数标签、日志关联、liveness/readiness 分工 |
| 后端测试 | HTTP认证授权、真实配置集成、事务回滚、生产方言、mock边界、Surefire/Failsafe结果判读 | 按目标版本的数据库隔离/容器、schema初始化、真实提交后副作用与并发冲突示例 |

依据：[技术设计方法](/Users/zhudaoming/Projects/yss-spec-project-template/profiles/backend/.agents/skills/yss-technical-design/references/design-method.md:21)、[DDL 迁移边界](/Users/zhudaoming/Projects/yss-spec-project-template/profiles/backend/.agents/skills/database-analysis-docs/references/ddl-generation.md:28)、[构建部署参考](/Users/zhudaoming/Projects/yss-spec-project-template/profiles/backend/.agents/skills/implement/references/build-deploy-guide.md:15)、[测试设计](/Users/zhudaoming/Projects/yss-spec-project-template/profiles/backend/.agents/skills/yss-backend-testing/references/test-design.md:7)、[测试执行](/Users/zhudaoming/Projects/yss-spec-project-template/profiles/backend/.agents/skills/yss-backend-testing/references/test-execution.md:3)。

**建议按以下顺序实施，每批都可独立产生可审阅结果。** 表中的核对动作服务于具体改动，不构成新的统一开工或交付门禁，也没有在本轮执行。

| 顺序 | 工作与责任范围 | 具体修改面 | 可观察完成结果 |
|---|---|---|---|
| 1 | 模板维护：纠正事实和触发 | 两个 scaffold 入口及相关生成参考；audit 技能/示例；Domain/Web/Application 旧参考；Boot3 迁移技能；Backend implement 与技能地图 | 新建走真实 CLI；已有工程继续增量维护；审计示例采用当前 API；无退役流程阻断 |
| 2 | CLI＋模板维护：统一资产与能力展示 | MVC POM 长字符串迁入既有模板资产体系；context/catalog 的 verification_scope 展示；对应说明与 bundle | 两种架构保留既有模块和有意差异；目录展示验证范围；dry-run及文件保护不变 |
| 3 | 组件维护：依赖和真实接入缺口 | YSS BOM 的第三方覆盖；userinfo provider 的 JWT claims；审计提交语义按已明确需求处理 | 代表消费工程解析与运行行为可解释；身份字段一致；审计事件含义与投递限制明确 |
| 4 | 技能维护：补必要工程深度 | 既有 MVC、userinfo、Web、技术设计、构建部署、测试参考 | 代表任务找到足够指导，不新增万能入口或默认基础设施 |
| 5 | 平台维护：Boot4 候选验证 | 明确版本的 Parent/BOM/starter 适配、模板配置及代表消费工程 | 只对实际验证过的组合和能力声明支持，再决定是否改变新建推荐 |

其中第2批不需要新模板引擎：DDD 已使用模板文件，MVC 可复用当前 `template/replace` 机制。应保持原坐标、模块依赖、Wrapper 和打包意图，注意 MVC 显式 repackage 与 DDD 依赖 Parent 管理之间的差异。只有当产品要求统一错误响应或健康探测时，才改变这些默认依赖。[DDD 父 POM](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-ddd-scaffold-generator/assets/templates/pom/parent-pom.xml.template:76)、[MVC POM 生成](/Users/zhudaoming/Projects/yss-cli/src/scaffold/mvc.rs:31)

技能修改以共享 `.agents/skills` 和 Backend 专有源为准，同步受影响的 WorkBuddy 有效副本、适用地图副本和已有锁记录。只有成员或依赖改变才修改默认清单和安装依赖；共享内容只按实际消费白名单同步到 Frontend。新引用若位于技能外，核对两种安装模式的分发范围。保留当前安全组件禁止新生产接入的约束，不把它随旧流程词一起删除。[技能维护规则](/Users/zhudaoming/Projects/yss-spec-project-template/.template-source/agents/skills-maintenance.md:3)、[安全组件边界](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-security-algorithm/SKILL.md:8)

后续改动应针对风险验证：文案修订检查代表请求与邻近非触发请求；POM 迁移核对语义和实际 Parent 下的打包；身份适配覆盖标准 JWT、UserInfo、自定义 principal、anonymous 和可信网关；审计覆盖内层返回后外层回滚、无事务、队列满与订阅失败；依赖调整覆盖真实消费应用的 JSON/wire 与 Excel 行为。需要生产方言时选用目标数据库；仅改说明时不建设测试工程。

仍需业务或平台所有者决定的事项有明确范围：审计究竟要求记录尝试、成功提交还是崩溃后可靠投递；新平台首先服务哪些实际消费者及数据库；存量 Boot3 的支持安排与迁移节奏。这些决定影响相应实现，不阻止先完成文档纠错、事实展示和依赖覆盖调查。

本次实际工作与边界如下：

| 核查 | 实际结果 | 不能据此宣称 |
|---|---|---|
| 版本、工作树、相关源码差异 | 已读取三个仓库基线，区分已安装 CLI 与源码 HEAD | 当前源码已重新构建或发行 |
| CLI 帮助与 catalog | 正常返回，实际能力与参数已核实 | 所有列出平台均兼容 YSS |
| Boot4＋YSS3.2 的 DDD/MVC dry-run | 均 planned、exit0，目标目录未创建 | 工程编译、启动或集成通过 |
| Excel effective POM/依赖树 | 离线解析成功，已保留坐标/版本/scope白名单摘要 | 私服当前发布字节、其他消费工程运行依赖、漏洞或运行故障结论 |
| 组件与上游源码 | 确认审计白名单、投递/事务边界、JWT映射条件、Boot3注册入口 | 真实请求、事务回滚或跨节点运行已验证 |
| 技能副本、内容与触发规则 | 前轮默认42项副本及内部链接检查，加本轮相关增量复核；形成静态场景分析 | 真实宿主调用成功率或效率提升 |
| Web 调研 | 对照官方版本/行为说明及维护者技能源码，寻找反向证据 | 社区代码已在 YSS 环境执行，或公开来源永不变化 |

两条实际 Maven 命令的工作目录均为 `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice`，使用根 Wrapper、离线模式及单模块 POM，退出码均为 0：

```sh
./mvnw -o -B -N \
  -f yss-microservice-components/yss-component-excel-mvc/pom.xml \
  org.apache.maven.plugins:maven-help-plugin:3.5.1:effective-pom \
  -Doutput=/tmp/yss-backend-research-2mdgo3xq/excel-effective.xml

./mvnw -o -B -N \
  -f yss-microservice-components/yss-component-excel-mvc/pom.xml \
  org.apache.maven.plugins:maven-dependency-plugin:3.8.1:tree \
  '-Dincludes=com.fasterxml.jackson.*:*,org.apache.poi:*,org.apache.fesod:*' \
  -DoutputType=json \
  -DoutputFile=/tmp/yss-backend-research-2mdgo3xq/excel-tree.json
```

解析的临时文件位于 `/tmp/yss-backend-research-2mdgo3xq/`；本报告已摘录必要的坐标、版本、scope和BOM摘要，不依赖临时目录长期存在，也未将完整 Maven 配置或日志复制到仓库。既有平台验证记录覆盖部分 DDD/MVC 样例，不覆盖生产数据库、缓存、Excel等全部能力；它不替代本次验证。[历史范围说明](/Users/zhudaoming/Projects/yss-spec-project-template/.template-spec/engineering/backend-platforms.md:61)

本轮仅新增本报告，未修改技能、CLI、组件或业务工程，未提交、推送、发布；未执行编译、测试、服务启动、真实 JWT/事务/数据库请求或宿主技能实验。
主要剩余风险是 SNAPSHOT 与消费环境漂移、Boot4 整组兼容未知，以及业务对审计完整性和身份字段的要求尚未逐个消费者确认。
