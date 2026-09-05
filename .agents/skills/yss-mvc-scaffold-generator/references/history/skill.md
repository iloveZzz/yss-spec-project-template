---
name: yss-mvc-scaffold-generator
description: 从空目录初始化独立 Git 管理的 YSS Java 8 MVC 数据分析 project-instance，生成固定六模块、YSS 标准组件、Oracle/OceanBase Oracle 与 Mock HTTP API；不用于通用 DDD 服务。
---

# YSS MVC Scaffold Generator

本 Skill 是 YSS MVC 数据分析项目的确定性机械生成器。它生成独立 `project-instance`、独立 Git 仓库，并将项目根直接作为 Maven 工程根，包含 `server`、`core`、`client`、`repository`、`adapter`、`feign-client` 六模块；业务功能仍须回到 `yss-product-lifecycle` 与 `yss-implementation-contract-compiler` 按垂直切片实现。

生成器编排入口位于 `scripts/generate_project.mjs`，参数与环境解析、skillUtils 文件操作、项目治理封装和 Maven/Java 模板分别位于 `scripts/lib/`。初始化阶段只写入 staging 目录并在成功后原子重命名，不执行 Maven 或网络依赖下载。

用户以“初始化新项目”进入时，由 `product-service-artifacts` 调用本生成器并默认附加 `docs/service/` 服务级研发产物；不要要求用户在提示词中另行说明“初始化产物”。未提供职责时生成 `skeleton`，不阻断工程创建。

## 输入

- `project-name`：小写连字符项目名。
- `base-package`：合法 Java 包名。
- `target-dir`：最终项目根目录，必须显式给出。
- `database`：支持 `oracle`、`oceanbase-oracle`，默认 `oracle`。
- `with-mock`：生成 `mock` Profile、Mock 执行器及 HTTP 冒烟测试。
- `maven-settings`：可选的外部 Maven settings 绝对路径，仅用于后续验证；未显式提供时依次读取 `YSS_MAVEN_SETTINGS` 和用户目录 `.m2/settings.xml`。不复制进项目、不写入生成清单。

## 执行

先预演：

```bash
node scripts/generate_project.mjs --project-name mvc-analysis-item1 --base-package com.yss.dataanalysis.item1 --target-dir /path/to/mvc-analysis-item1 --database oracle --with-mock --maven-settings /path/to/settings.xml --dry-run
```

确认目标目录后去掉 `--dry-run`。生成后运行：

```bash
node scripts/verify_project.mjs --project-root /path/to/mvc-analysis-item1
cd /path/to/mvc-analysis-item1
./mvnw validate
./mvnw test
./mvnw package
./mvnw spring-boot:run -pl mvc-analysis-item1-server -Dspring-boot.run.profiles=mock
```

Windows 使用 `mvnw.cmd`。指定外部 settings 时，Maven 命令必须加 `-s <settings.xml>`。启动后对 `POST /api/analysis/query` 执行 HTTP 冒烟测试。

生成项目进入 API/Controller 实现后，登记命令必须包含 Java Web/Javadoc 检查、`fmt:check`、测试和构建。Smart-doc 仅作为人工按需从 Controller 生成辅助文档的工具，不属于默认 AI Coding 验证链路；只有用户明确要求生成 Smart-doc 文档时才执行对应 goal。

生成结果包含根 `yss-project.yaml`、`AGENTS.md`、`CONTEXT.md`、生命周期事实源、共享 skills、本地 Ticket 入口、`external-repository` 实现仓库登记和 `.gitignore`。生成器执行 `git init --initial-branch=main`；旧版 Git自动回退到 `git init` 后重命名分支。只初始化仓库，不创建 commit 或 remote。

## 硬约束

- `target-dir` 是最终项目根，不在其下再次创建项目名目录。
- Windows 下优先使用纯 ASCII、长度可控且不属于其他项目 Git 根的父目录（例如 `C:\\projects`）；旧 Maven 插件在非 ASCII 长路径上可能产生 reactor classpath 编码错误。
- 非空目标目录拒绝生成；本 Skill 不提供隐式覆盖或删除。
- 目标目录必须成为独立 Git 根；生成前必须能执行 `git --version`，生成后必须验证 Git 根等于 `target-dir`、分支为 `main`、commit 数为零且 remote 为空。
- 生成前必须从 `git config --get user.name` 读取非空作者名；作者名包含换行或 `*/` 时拒绝生成。生成的 Controller 类和公开接口方法以该值填写 `@author`，不得固定为 `system`。
- 项目根同时是 Maven 工程根和独立 Git 根，固定登记为 `repository_scope: external-repository`、`project_root: .`；六模块直接位于项目根目录。
- 生成内容先写入同父目录 staging，全部步骤成功后再原子重命名；失败时只清理本次 staging，不留下不可重试的半成品。Maven 依赖解析明确延后到验证阶段；settings 缺失只记录 `maven-default` / `maven_settings_available=false`，不会压缩或截断生成的文件结构。
- 每个项目持有自己的 `project-instance` 身份与业务资产；不得为了新项目改写模板工具仓库的项目名称或业务上下文。
- 模块名固定使用正确拼写 `feign-client`；旧项目中的 `fegin-client` 只作为迁移来源，不继续传播。
- Mock 与 Oracle 使用同一 Controller 和 DTO 契约，只替换 `AnalysisQueryExecutor` 实现。
- Mock 仅用于本地联调和契约验证，不得携带真实凭据或生产数据。
- 启用 Mock 时必须生成 `bootstrap-mock.yml`，并在 Spring Cloud Bootstrap 阶段同时禁用 Nacos Discovery、Nacos Config 和 Config import-check；不能只在 `application-mock.yml` 中禁用。
- `bootstrap.yml` 的默认顺序为 `${app.env:dev},datasource,nacos,<database-profile>,mock`，`mock` 必须最后以覆盖 Nacos Bootstrap 配置，且 profile 列表不得有尾随逗号。未启用 Mock 时不生成、不激活 `mock`。
- Mock 与数据库 profile 同时出现时，Mock 执行器优先；数据库执行器使用 `<database-profile> & !mock` 表达式，禁止两个 `AnalysisQueryExecutor` 同时注册。
- Mock 的 `application-mock.yml` 必须关闭 Leaf Segment/Snowflake，并在 `spring.autoconfigure.exclude` 中排除 `DataSourceAutoConfiguration`、`MybatisPlusConfiguration` 和 `LeafDataSourceConfiguration`；组件扫描同时排除 `com.yss.cloud.mybatis..*`、`com.yss.cloud.sankuai..*`，`@EnableDistributedId` 与 `MapperConfiguration` 只允许在 `!mock` 配置类中加载，确保无数据库时 Mock 测试和 HTTP 冒烟可运行。
- Oracle Adapter 只保留可编译 seam；连接信息通过环境变量注入，生成器不写真实账号密码。
- 工程版本、YSS 父 POM 和组件 BOM 固定为 `2.0.0-SNAPSHOT`，运行时固定 Java 8。
- 标准能力默认包含审计日志、分布式 ID、Excel、Nacos、Redis Cache、OpenFeign、Smart-doc、用户信息和 Actuator。
- server POM 必须保留 `spring-boot-maven-plugin`和默认激活的 `nacos` profile；Nacos 依赖只在该 profile 中声明。
- `bootstrap-nacos.yml` 默认使用 `${nacosserver:192.168.165.58:8848}`、`${nacos_group:yss-dm}` 和 `${namespace:yss-datamiddle}`，Discovery/Config 在 `nacos` profile 中开启，并由 `bootstrap-mock.yml` 在 Mock 模式覆盖关闭。
- Smart-doc 使用 `assets/smart-doc.json.template`的完整配置并动态生成项目名、Controller 包和修订时间；Torna Token 与内网地址不进入生成项目。Smart-doc 插件保留跨模块 `includes`，但不绑定 Maven `executions`，不进入默认 `validate` / `test` / `package` / CI / AI Coding 验证命令。
- Logback 使用 `assets/logback-spring.xml.template`；`dev,mock` 与 `uat,pro,oracle,oceanbase-oracle` 必须是并列 profile，项目名和基础包动态替换。
- Controller 类和公开接口方法必须按真实业务语义生成 Javadoc，`@author` 使用生成时读取的 Git 用户名，`@date` 使用 `yyyy/MM/dd HH:mm`，方法按签名完整生成 `@param`和 `@return`。
- API 实现不得交付单行 Javadoc block tag、Mapping 注解/方法同行或方法体单行压缩代码；相关规范由生成项目中的工程约定和实际验证命令约束。
- API 完成证据必须包含 `yss-skill-execution-result.yaml` 和 `fresh-verification.md`，并记录 Controller 路由、DTO、响应 Wrapper、错误响应及契约测试与冻结 OpenAPI 的一致性。Smart-doc 输出不是 OpenAPI Freeze、契约审查或功能完成证据。
- Maven settings 始终是项目外部的私密输入；不得复制到目标目录、写入 README/生成清单或提交 Git。
- 持久层固定使用 YSS MyBatis-Plus；标准 CRUD 使用 MP，复杂 SQL 写入 mapper.xml，主键策略为 `IdType.ASSIGN_ID`。
- 生成范围仅包含工程骨架、示例 Mock seam 和验证测试，不声称业务 Spec、OpenAPI Freeze 或 Slice Implementation Contract 已批准。
- 完成结论必须包含结构验证，以及实际执行的 Maven 命令；无法下载依赖时如实记录环境阻塞。

模块职责和依赖方向见 [references/architecture.md](references/architecture.md)。

## API 契约与人工文档边界

- 冻结的 OpenAPI 3.1 YAML 是接口契约的唯一事实来源；`yss-openapi-governance` 负责契约治理与 Freeze，`yss-openapi-draft-review` 负责冻结前审查，`yss-web-controller` 负责按冻结契约实现 Controller。
- Smart-doc 是人工可选的源码文档工具。其输出只用于查看当前 Controller 实现，不得反向定义、覆盖或批准冻结 OpenAPI。
- AI 默认不执行 `smart-doc:html`、`smart-doc:openapi` 或 `smart-doc:torna-rest`。`torna-rest` 涉及外部写入，执行前还必须获得对应授权。
- 本生成器只用于空目录初始化。生成项目使用已物化的 `project-instance` 资产和实现 skills 开发后续需求；其共享 `skillUtils` 不应再分发 `yss-mvc-scaffold-generator` 本身。
