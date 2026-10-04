---
name: yss-up-springboot3
description: "审查或迁移 YSS Spring Boot 2 到 3 的依赖、Jakarta 与 Spring Cloud 兼容性。"
---

# yss-up-springboot3

本 Skill 从精确 Spring Boot 2 平台分析并执行已批准的 Spring Boot 3 迁移，不替代具体组件 Skill。源平台、目标平台和组件能力只从 `.template-spec/engineering/backend-platforms.json`、批准的 `platform_configuration`、工程 Manifest、effective POM 与实际依赖树解析，不按版本记忆或源码可编译状态推断兼容。

## 何时使用

- 评估或迁移 YSS 后端的 Spring Boot 2 → 3 平台。
- 平台迁移涉及 `javax.*` → `jakarta.*`、Spring Security、Validation、Servlet、Gateway/OpenFeign 或依赖 BOM。
- 核验 YSS 组件在指定 Spring Boot 3 平台的兼容状态。

## 准入与阻断

- 先运行 `scripts/backend-platforms` 查询精确 profile。目标 profile 不可选择、缺 compatibility 条目或任一必需 `component_capabilities` 不是 `verified` 时，只能输出差距分析，迁移实现返回 `component-unavailable-for-platform` 或对应组件绑定错误。
- Spring Boot 4 不属于本 Skill 的 2→3 迁移执行范围。Boot 4 命中 Jackson 3、starter/自动配置结构或现有 YSS 组件时返回 `blocked`，建立独立平台迁移工作单元；不得把已完成的 Boot 3 改造解释为 Boot 4 兼容。
- 既有工程的源码编译、单元测试或 `javax`→`jakarta` 替换不等于平台认证。没有目标架构的真实构件、启动和组件 seam 证据时不得宣称迁移完成。
- 平台迁移不得夹带业务重构、架构族转换或组件替换。发现这些影响时返回 `new_impacts`，交实现合同编译器重新路由。

## 迁移流程

1. 从工程登记、Manifest、父/BOM、effective POM 和依赖树冻结源 `platform_configuration`、架构 Profile、全部 YSS GAV、组件绑定及基线验证命令；缺失或相互冲突时停止。
2. 从平台目录选择一个精确 Spring Boot 3 目标 profile，记录 compatibility id/digest；不得使用 `3.x`、`latest`、范围版本或自行拼装父/BOM。
3. 由当前 Slice/迁移合同解析所需 capability，再逐项核验目标 profile 的组件状态、架构证据、timestamped SNAPSHOT、POM/JAR 摘要和源码 tree。未登记的 JDBC 等能力记为缺口，不虚构 `yss-jdbc` Skill 或绕过 catalog。
4. 按命中能力加载已登记专项 Skill，例如 `yss-mybatis`、`yss-dto`、`yss-validation`、`yss-exception`、`yss-cache`、`yss-audit-log`、`yss-excel-mvc`、`yss-userinfo`、`yss-resilience4j` 和 `yss-security-algorithm`；分别用 `boot2-java8` 与 `boot3-java17` 索引核验源/目标组件 tree，源码索引只用于定位风险，不代替 compatibility evidence。
5. 编制迁移增量：Java 与编译插件、Servlet/Validation/JPA namespace、Spring Security、Spring Cloud/OpenFeign、MyBatis starter、自动配置注册、配置属性、Jackson 2 wire 行为、测试工具和打包方式。`javax.sql`、`javax.crypto` 等 Java SE API 不迁移。
6. 在批准的迁移工作单元内分批实施，每批保持可构建和可回滚；组件坐标或平台配方发生变化时重新编译合同，不在业务代码中临时替换依赖。
7. 使用工程根 `./mvnw` 记录 effective POM、依赖树、`validate`、`test`、`package`、随机端口启动和真实组件 seam；DDD 与 MVC 证据不可互相代替。
8. 重新解析全部组件绑定并比较摘要；通过只表示该工程的批准迁移结果，不自动把共享平台或其他工程标记为 verified。

## 适用检查

- 改代码前核对 Maven BOM 与插件版本。
- 仅目标框架要求 Jakarta 的 API 迁移 `javax.*` import。
- Spring Security 配置不依赖已移除的 `WebSecurityConfigurerAdapter` 模式。
- Validation 注解与异常处理仍映射到冻结 DTO/Result 合同。
- MyBatis 拦截器、自动配置与 starter metadata 符合目标 Boot 3 装载机制。
- 受影响测试或样例模块与框架代码同步。
- Jackson 2 的 Result/PageResult、日期、枚举、nullability 和错误响应 wire fixture 与冻结 OpenAPI 一致。
- `spring.factories` 与 `AutoConfiguration.imports` 的目标机制以真实 starter 为准，不能仅移动文件名后宣称自动配置生效。
- 输出包含源/目标 profile、compatibility digest、组件逐项结论、阻塞项、实际命令与回滚点。

## 修改边界

- 先核验依赖实际命名空间，不批量替换全部 `javax.*`。
- 迁移不夹带无关业务重构。
- 组件兼容结论使用源码、专项索引和平台证据，不使用版本记忆。
- 不能通过排除 starter、复制组件源码到服务或换未批准第三方依赖绕过组件阻断。
- Boot 4 另行路由，不复用 Boot 3 证据执行其迁移。
