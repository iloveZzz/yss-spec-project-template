# 后端组件平台与源码门禁

本合同适用于 `yss-cache`、`yss-mybatis`、`yss-dto`、`yss-audit-log`、`yss-excel-mvc`、`yss-distributed-id`、`yss-resilience4j`、`yss-validation`、`yss-security-algorithm`、`yss-userinfo` 和 `yss-exception`。

## 执行入口

1. 接入、修改、代码生成或给出精确类名/配置前，从批准的 `platform_configuration.component_platform_line` 选择目标 Skill 的 `references/source-index.boot2-java8.md` 或 `references/source-index.boot3-java17.md`，并执行：

   ```bash
     node ../yss-skill-source-index-refresh/scripts/check-backend-skill-source-index.mjs \
       --skill <skill-id> \
       --platform-line <boot2-java8|boot3-java17> \
       --source-root <包含-yss-microservice-components-的仓库根>
   ```

2. 平台线与源码根不匹配、校验非零、组件 tree 不一致、组件子树 dirty、索引缺少平台信号或真实源码不可定位时，精确接入和实现返回 `blocked`。不得退回另一代索引。只读故障分诊可以继续，但必须把结论标为未完成源码核验。
3. 新脚手架及其切片消费批准且当前的 `platform_configuration` v2，并核对工程 Manifest、解析后的组件 GAV 和兼容证据。缺少 verified 组合或目标组件证据时回实现合同编译器，不替换 YSS 组件、不降级 Boot/Java，也不把候选渲染或源码编译当作兼容认证。
4. 既有工程以登记的架构身份、实际 POM/effective POM 和依赖树为准；平台升级或组件升级单独立项。源码索引中的 Java、Boot、命名空间和自动配置只用于发现风险，不能批准升级。

## 平台边界

- `yss-microservice-components` 当前源码行的 POM/namespace 信号不自动授权任意 Boot/JDK。最终支持范围只来自仓库共享平台目录中的 verified 兼容组合及其原始证据。
- Boot 2.7 使用 Java 8 与 `javax` Web/Validation 基线；Boot 3.5/4.1 使用 Java 17 或 21 与 `jakarta`，Boot 4 还涉及 Jackson 3 和新的 starter/自动配置结构。目标组件没有对应证据时必须阻断。
- BOM 版本不等于每个组件 artifact 的实际版本。比较依赖树中的精确 GAV；索引输出的本地 POM lineage 是定位证据，不代替 effective POM 和运行验证。
- `javax.sql`、`javax.crypto` 等 Java SE 包不是 Jakarta 迁移目标，不能用简单字符串替换处理。

共享平台事实源为 `docs/engineering/backend-platforms.json` 和 `docs/engineering/backend-platforms.md`。
