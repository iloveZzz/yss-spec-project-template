# YSS DDD 脚手架 Target Profile RED / GREEN 记录

日期：2026-09-03
范围：`yss-ddd-scaffold-generator`、`yss-web-controller`、下游后端技能与生命周期/Router 合同

## RED

在实现前先把已批准的目标剖面写成公开 seam 测试：服务级 contract v2、Manifest v2、initialize-only、显式 Profile、命名 Maven repository、Domain 依赖纯度、Spring MapStruct、Web DTO 归属和黄金首切片。

- Scaffold 测试首次运行：15 个用例中 7 通过、8 失败。失败集中在旧 schema v1 / `slice_id`、缺少 Profile/ownership lineage、允许覆盖、旧 POM 分层与缺少构建门禁。
- Web generator 测试首次运行：3 个用例中 1 通过、2 失败。失败集中在缺少批准字段合同、DTO 写入 Domain、静态 MapStruct 与写操作未经过 Convertor。

这些失败证明测试捕获的是改造前真实行为，而不是实现后的追认。

## GREEN

```text
node --test \
  .agents/skills/yss-ddd-scaffold-generator/scripts/scaffold-generator.test.mjs \
  .agents/skills/yss-ddd-scaffold-generator/scripts/first-slice-compatibility.test.mjs \
  .agents/skills/yss-web-controller/scripts/generate_controller.test.mjs
```

结果：分发同步后的严格边界轮次共 26 个用例，23 通过，0 失败，3 跳过。三个跳过项都要求真实受控 YSS Maven 仓库 URL、用户名和密码；当前环境缺少这些变量，所以不得据此声明 `empty-scaffold-verified`、`first-slice-verified` 或正式的 exception starter 集成门禁已关闭。新增 seam 证明 scaffold contract/Manifest schema v1 均为 `unsupported`、Wrapper 不会执行；Web initialize-only 也从“跳过已有文件继续写”改为全量预规划、身份绑定与写前整体阻断。

## Exception starter 真实制品 RED / GREEN

本机 Maven 缓存存在实际 `com.yss.cloud:yss-component-exception:2.0.0-SNAPSHOT` 二进制，JAR SHA-256 为 `80d1f0b6df6105c7b1bc99519dff3619bd280696aae3458ee841cb5192c684ff`；包内含 `META-INF/spring.factories`、`GlobalExceptionAdvice.class` 和 `YssGlobalExceptionProperties.class`。

- RED：golden web 测试上下文加载该 starter 的 `GlobalExceptionAdvice` 后，组件默认处理器接管三类异常，公开状态码和错误体不满足目标 slice 合同，测试失败。
- GREEN：只在 golden first slice 行为 fixture 中加入 `Ordered.HIGHEST_PRECEDENCE` 的 `@RestControllerAdvice`，并保持 starter advice 同时存在。聚焦 Maven 测试通过，证明业务冲突、已知系统错误、未知运行时错误分别序列化为固定的 `409 / QUALITY_RULE_CONFLICT`、`503 / QUALITY_RULE_SYSTEM`、`500 / SYS_ERROR`，响应不包含测试注入的内部异常消息。

该轮使用本机已有 Maven 缓存作 TDD 诊断，没有使用或记录仓库凭据，不替代受控 Maven 仓库的可复现门禁。业务错误映射没有写入空脚手架模板，只存在于 golden first slice fixture，符合“机械骨架不冻结业务行为”的边界。

补充通过：

- `scripts/verify-scaffold-generator-scenarios`
- `scripts/verify-yss-router-scenarios`
- `scripts/verify-lifecycle-scenarios`
- `xmllint --noout .agents/skills/yss-ddd-scaffold-generator/assets/templates/pom/*.xml.template`
- `scripts/sync-skills --check`
- `scripts/update-skill-lock --check`
- `scripts/verify-template-fast`

## REFACTOR

- Scaffold parent / Adapter reference 不再复制旧分层示例，改为路由到共享权威技能；旧架构统一标记 `unsupported`。
- Web module 移除对 Domain / Infrastructure 的直接依赖。
- `spring-boot-2.7-jdk8` 固定映射 `javax`；其他组合必须由合同显式声明且有独立 fixture。
- 文档、生命周期合同、Router 合同、生成器、模板、测试、跨平台投影和 lock 同步为同一 Target Profile。

## 尚未关闭的受控 seam

- 真实内部 Maven 环境下的根 Wrapper 三阶段构建尚未执行；因此本轮只达到模板维护 `implementation-ready`。
- YSS exception starter 已完成本机实际制品的 auto-configuration、handler precedence、三类映射和序列化 TDD；仍需在受控 Maven 仓库环境中 fresh 重跑，才能形成可复现的正式制品证据。
- 模板正式发布仍需候选冻结、独立审查和完整 `scripts/verify-template`。
