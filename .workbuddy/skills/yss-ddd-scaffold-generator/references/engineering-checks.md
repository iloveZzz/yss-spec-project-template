# DDD 生成工程检查

生成后验收工程内容时读取；Maven 执行前先检查凭据、settings 与脱敏要求。

- 不要在 skill 里硬编码用户业务字段或真实连接信息。
- 生成后要检查依赖关系是否仍符合分层约束。
- 验证数据库固定 H2，生产数据库 `not-bound`；后续存储接入按批准的切片合同执行。
- `mvnw` 和受控例外下的 `mvn` 均先核验显式 settings，再参考用户目录 `~/.m2/settings.xml`；不要用模板配置覆盖用户已有的仓库、镜像、代理或认证。新工程的 `.mvn/maven.config` 不强制选择项目 settings。Maven 的用户配置与安装级配置合并，用户配置优先，见 [官方 settings 规则](https://maven.apache.org/settings.html)。
- 验证器接受 `YSS_MAVEN_SETTINGS` 指定文件路径；已有 `.mvn/maven.config` 或 `MAVEN_ARGS` 的 `-s` / `--settings` 优先保留，多个入口同时指定须消除冲突。找不到可用用户 settings 时，才可使用随工程提供的 `.mvn/settings.xml`：仓库 URL 来自 `YSS_MAVEN_REPOSITORY_URL`，凭据来自 `MAVEN_REPO_USERNAME` / `MAVEN_REPO_PASSWORD`，验证器显式加载文件并激活 `yss-internal`。
- settings 缺失、不可读、无效或实际仓库访问失败时，先向用户获取文件路径；需要新建配置时询问仓库地址、server id、profile 和认证方式，凭据通过本地文件或安全环境提供。禁止要求用户在聊天中贴密码，禁止把用户 settings、明文或加密凭据复制到 skill、模板或生成工程。报告只保存配置来源、路径、摘要与实际执行结果，日志脱敏；文件存在不代表仓库可访问或平台已认证。
- Domain POM 不得依赖 YSS DTO/Exception、Web Validation、Swagger 或 Jackson；DTO/Exception/OpenAPI 注解属于 Web。MapStruct 统一 `componentModel="spring"`，父 POM 负责 processor 与 `lombok-mapstruct-binding`。
- 生成工程必须携带 ArchUnit、Maven Enforcer 和 Wrapper checksum；DEBUG 与 MyBatis stdout SQL 只能进入 `application-local.yml`。
