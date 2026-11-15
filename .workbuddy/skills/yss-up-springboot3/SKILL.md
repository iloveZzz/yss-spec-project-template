---
name: yss-up-springboot3
description: "审查或迁移 YSS Spring Boot 2 到 3 的依赖、Jakarta 与 Spring Cloud 兼容性。"
---

# yss-up-springboot3

本 Skill 按用户要求评估或执行 Spring Boot 2 → 3 迁移。先读当前需求、父 POM/BOM、effective POM、依赖树和实际源码，确定源版本、精确目标版本及使用的组件。平台目录 `.template-spec/engineering/backend-platforms.json` 与组件索引供定位已有记录，兼容结论需核对当前工程和对应运行证据。

## 何时使用

- 评估或迁移 YSS 后端的 Spring Boot 2 → 3 平台。
- 平台迁移涉及 `javax.*` → `jakarta.*`、Spring Security、Validation、Servlet、Gateway/OpenFeign 或依赖 BOM。
- 核验 YSS 组件在指定 Spring Boot 3 平台的兼容状态。

## 范围与证据

- Spring Boot 4 迁移需按其实际需求另行评估，涉及 Jackson 3、starter/自动配置结构和组件兼容等变化，本 Skill 只承接 2→3。Boot 3 运行证据不能外推 Boot 4 兼容。
- 既有工程的源码编译、单元测试或 `javax`→`jakarta` 替换不等于平台认证。没有目标架构的真实构件、启动和组件 seam 证据时不得宣称迁移完成。
- 发现业务重构、架构转换或组件替换需求时，说明具体影响并核对当前授权，继续可独立完成的迁移部分。真正缺少目标版本或业务兼容决定时定点澄清。

## 迁移流程

1. 从真实源码、父 POM/BOM、effective POM 和依赖树记录源 Java/Boot/Cloud、工程架构、YSS 坐标、组件绑定及已有验证命令。版本冲突先查实际解析结果，无法确认的关键项说明影响。
2. 按当前需求确定精确 Spring Boot 3 目标、Java、Cloud、父 POM/BOM 和插件组合。`3.x`、`latest` 或范围版本不足以复现迁移，目录已有组合的兼容记录也须核对适用范围。
3. 按实际使用能力逐项核验目标组件、构件与源码。SNAPSHOT 记录实际解析的时间戳或构件摘要，防止版本名相同而内容漂移。目录未登记的能力调查真实依赖并保留未知，不虚构组件技能或兼容结论。
4. 按命中能力加载专项 Skill，例如 `yss-mybatis`、`yss-dto`、`yss-validation`、`yss-exception`、`yss-cache`、`yss-audit-log`、`yss-excel-mvc`、`yss-userinfo`、`yss-resilience4j` 和 `yss-security-algorithm`。源/目标索引分别对应 `boot2-java8` 与 `boot3-java17` 时按其定位源码，实际平台以工程为准。索引只用于定位风险，`yss-security-algorithm` 保持禁止新生产接入的限制。
5. 编制迁移增量：Java 与编译插件、Servlet/Validation/JPA namespace、Spring Security、Spring Cloud/OpenFeign、MyBatis starter、自动配置注册、配置属性、Jackson 2 wire 行为、测试工具和打包方式。`javax.sql`、`javax.crypto` 等 Java SE API 不迁移。
6. 在已授权范围内分批实施，保留可定位的恢复点。组件坐标或平台组合变化时重查依赖与受影响调用方，避免在业务代码中临时绕过不兼容。
7. 优先使用工程根 `./mvnw` 核对 effective POM、依赖树，并按影响执行编译、测试、打包、启动和真实组件验证。记录实际命令、结果与未验证范围，DDD 与 MVC 运行证据分别说明。
8. 重新解析受影响组件绑定并比较构件，检查迁移前后 API、数据和关键行为。结论限于本次工程、组合与实际覆盖能力，共享平台和其他工程的状态需各自证据。

## 适用检查

- 改代码前核对 Maven BOM 与插件版本。
- 仅目标框架要求 Jakarta 的 API 迁移 `javax.*` import。
- Spring Security 配置不依赖已移除的 `WebSecurityConfigurerAdapter` 模式。
- Validation 注解与异常处理仍遵循当前 DTO/Result 与公开 API 约定。
- MyBatis 拦截器、自动配置与 starter metadata 符合目标 Boot 3 装载机制。
- 受影响测试或样例模块与框架代码同步。
- Jackson 2 的 Result/PageResult、日期、枚举、nullability 和错误响应 wire fixture 与当前 OpenAPI 一致。
- `spring.factories` 与 `AutoConfiguration.imports` 的目标机制以真实 starter 为准，不能仅移动文件名后宣称自动配置生效。
- 输出包含源/目标精确版本、实际构件、组件逐项结论、阻塞项、实际命令与恢复点。涉及数据库、序列化或外部副作用变化时说明恢复限制。

## 修改边界

- 先核验依赖实际命名空间，不批量替换全部 `javax.*`。
- 迁移不夹带无关业务重构。
- 组件兼容结论使用源码、专项索引和平台证据，不使用版本记忆。
- 组件不兼容时说明原因及可验证方案，不能通过随意排除 starter、复制组件源码到服务或超出授权替换依赖掩盖问题。
- Boot 4 另行路由，不复用 Boot 3 证据执行其迁移。
