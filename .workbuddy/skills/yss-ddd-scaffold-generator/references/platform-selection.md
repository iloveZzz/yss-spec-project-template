# DDD 脚手架平台选择

新建前读取现装 CLI 的 `yss --version`、`yss scaffold catalog --json` 和 `yss scaffold ddd --help`，核对目标平台、精确 Spring Boot / Java、Maven Parent 与 YSS BOM 坐标。同一 Maven Reactor 保持一致的平台组合，项目版本来自用户或工程基线。

最少五项工程参数为 `--project-name`、`--base-package`、`--output-dir`、`--group-id`、`--project-version`，工程版本继续必填。支持当前默认解析的 CLI 会从 CLI catalog 的 `defaultRecipeId` 补齐 YSS `4.0.0-SNAPSHOT`、Boot `4.1.2`、Java `17`、Parent `com.yss.cloud:yss-cloud-microservice:4.0.0-SNAPSHOT` 和同版本 `com.yss.cloud:yss-components-bom`。显式技术参数优先，仅补齐唯一匹配组合。只选组件 `3.2.0-SNAPSHOT` 时补齐其 Parent 与 Boot `3.5.16` / Java `17`，歧义按错误补参数，未知版本需显式提供 Parent 等缺项。完整自定义输入沿用实际输入与兼容 warnings。

已有工程先读实际 POM/effective POM 与解析依赖，显式 Boot 2/3 继续走对应平台；新建默认仅在当前脚手架参数解析时适用。旧 CLI 先核对真实帮助，缺少默认解析时使用其支持的完整显式参数。

- catalog 描述该程序支持的参数组合。仓库中的可解析构件、组件源码和实际构建决定依赖是否可用。已有兼容记录可参考 `.template-spec/engineering/backend-platforms.md`，记录缺失时说明尚未证实的范围。
- 缺少关键版本或坐标先查询可信资料，仍不确定时澄清。解析冲突、缺失构件或已知不兼容须如实处理，版本替换需有当前任务依据。
- 现装 CLI 缺少目标能力时先说明限制，按 [资产使用边界](standalone-generation.md) 评估 fallback。路径校验和兼容限制继续适用，CLI 的拒绝结果须先查明原因。
- Spring MVC、Servlet、Validation、Jackson、starter 和处理器使用所选精确版本对应的坐标与命名空间。Jakarta 转换需区分 `javax.sql` 等 Java SE API。
- 历史样例、H2 或其他架构的记录仅证明对应样本的情况。版本调整需说明受影响依赖和调用方，生成后的构建或运行按当前任务需要执行，结果如实报告。
