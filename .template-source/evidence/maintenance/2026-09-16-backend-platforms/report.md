# DDD / MVC 多版本平台维护记录

本轮按用户批准方案实施；仓库为 template-source，按生成语义和跨仓合同变更判定 L3。已保留开始时的未提交修改，并保留执行期间并行发生的 Slice v3 改动。本记录不把整个工作区视为本轮修改。未提交、推送或发布。

## 已实现

- 两个脚手架及生命周期、技术设计、合同编译器增加平台选择与承接规则。架构和平台合并确认；主子项目可继承或覆盖，同一 Maven 多模块统一平台。
- 共享清单定义五个平台候选，覆盖两种架构共十组：Boot 2.7.18 / Java 8，3.5.16 / Java 17、21，4.1.1 / Java 17、21。Project Scaffold Contract v4、决定、Manifest 和 architecture_identity 绑定精确版本、YSS 父 POM/BOM 与兼容摘要。
- 新生成缺配置、未验证的 YSS 组合、摘要漂移和不一致均在写工程前拒绝；底层生成器保持无交互。标准生成 CLI 不提供候选绕过开关，维护程序和合成测试夹具单独使用候选路径。
- POM、Java/Enforcer、注解处理器、Web/test starter、Swagger、Jakarta 和 Boot 4 Jackson 3 测试适配；保留既有 Maven 3.6.3 Wrapper 与校验和。数据分析初始化器仍限制原 Boot 2.7 / Java 8 范围。
- 实际验证程序检查 JDK、effective POM、依赖树、三条 Maven 命令、Surefire 用例、可执行 Jar 打包启动和回环 HTTP。机械集成测试覆盖参数校验、JSON、MyBatis 查询映射及适用的 Feign Decoder。跳过测试不算通过；日志和报告绑定字节摘要。首切片保持独立。
- canonical Skill、Agent 投影、backend Profile 补丁、技能锁和平台共享依赖已同步。四个 CLI 均生成工作树快照；三个专职 CLI 的 bundle 完整性检查通过。本体平台查询实际执行成功，新 backend CLI 接收实例的平台场景 16/16 通过。

## Fresh Verification 与边界

详细命令、退出码和日志摘要在 verification.json。

- 本体与战术后端各 73 项聚焦测试：69 通过、4 项依赖环境的测试跳过；包括十组候选生成和零写入负向测试。它们验证生成机制，不冒充真实 Java 构建证据。
- 13 个平台权威文件与 backend 接收方、CLI snapshot 字节一致。Profile、投影、锁、Skill 治理与 git diff --check 通过。
- Java 8、17、21 实际预检查通过。十组真实 Maven 矩阵均 blocked：缺少 YSS_MAVEN_REPOSITORY_URL、MAVEN_REPO_USERNAME、MAVEN_REPO_PASSWORD，以及逐组合真实批准合同/YSS 坐标。没有执行或伪造这些组合的 Maven 构建。
- 因此 compatibility 清单为空，五个平台均不可用于正式新生成，三条 Boot 版本线均未宣称认证通过。补齐本机环境和候选合同后运行 verify-backend-platform-matrix，审阅实际证据才能逐组合开放。密码不应写入合同、仓库或聊天。
- verify-template-fast 因工作区 AGENTS.md 等既有修改自动升级 release，退出 1。失败包括并行 Slice v3 的生命周期 schema 和迁移断言不一致，以及 WORKTREE 来源不能满足 --require-committed。未为通过总检修改其他任务的规则或伪造提交来源。
- 完整共享工具同步锁在期间会随并行 Slice 改造继续漂移；本轮平台文件已单独核验并固定在通过测试的接收快照中。整仓再次冻结并验证后，才能给出整体 implementation-ready / release-ready 结论。本轮不创建虚假的通过 checkpoint。

## 维护者自检

仅维护者自检，不声称独立审查。检查了写入前失败、平台摘要传播、javax.sql 保留、候选不可进入首切片、可选组件按需验证、历史读取分支以及私服日志脱敏。修复了入口文档预算、公共导出链接、接收方测试角色和缺失共享依赖等回归；没有放宽真实批准和生命周期门禁。实际 Spring/YSS 自动配置、版本调解和业务首切片仍须由后续真实矩阵证据证明。
