# DDD 生成工程检查

生成后验收工程内容时读取；Maven 执行前先检查凭据、settings 与脱敏要求。

- 不要在 skill 里硬编码用户业务字段或真实连接信息。
- 生成后要检查依赖关系是否仍符合分层约束。
- 验证数据库固定 H2，生产数据库 `not-bound`；后续存储接入按批准的切片合同执行。
- `.mvn/settings.xml` 只能通过 `${env.MAVEN_REPO_USERNAME}` 和 `${env.MAVEN_REPO_PASSWORD}` 读取 Maven 仓库凭据；内部仓库构建前由 CI 或本地安全环境注入变量，禁止把 Maven 仓库用户名、明文密码或 Maven 加密密码写入 skill、模板或生成工程。
- `.mvn/maven.config` 必须显式加载项目级 `.mvn/settings.xml` 并激活 `yss-internal`；仓库 URL 来自 `YSS_MAVEN_REPOSITORY_URL`，凭据来自 `MAVEN_REPO_USERNAME` / `MAVEN_REPO_PASSWORD`。预检缺失时先于 Maven 执行阻断，日志必须脱敏。
- Domain POM 不得依赖 YSS DTO/Exception、Web Validation、Swagger 或 Jackson；DTO/Exception/OpenAPI 注解属于 Web。MapStruct 统一 `componentModel="spring"`，父 POM 负责 processor 与 `lombok-mapstruct-binding`。
- 生成工程必须携带 ArchUnit、Maven Enforcer 和 Wrapper checksum；DEBUG 与 MyBatis stdout SQL 只能进入 `application-local.yml`。
