# 工程基线

新建默认 YSS `4.0.0-SNAPSHOT` / Boot `4.1.2` / Java `17`。五项必填参数、3.2 选择与完整自定义见 [命令示例](command-examples.md)，补全与歧义规则见 [平台选择](platform-selection.md)。

已有工程读取其 Java、Spring Boot、Maven Parent/BOM 与组件版本，沿用实际架构增量维护。新建工程先核对 `yss --version`、`yss scaffold catalog --json` 和对应生成命令帮助，明确项目名、包名、平台、精确版本、Maven 坐标和输出目录。缺失关键输入先调查或询问。

DDD 职责与依赖方向见 [架构说明](ARCHITECTURE.md)，MVC 见对应技能的架构说明。现装 CLI 支持时使用 CLI。能力不足时按 [资产使用边界](standalone-generation.md) 评估 fallback，继续核对版本、兼容性和路径保护。

当前 CLI 产出空骨架、POM、机械启动配置、Maven Wrapper 与 `.yss/scaffold.json` 来源收据。`assets/reference` 保留为教学资料，业务实现和测试按需求另行添加。来源收据记录生成来源，保留真实内容。构建或运行按任务需要执行。

使用现有 Maven settings，凭据保留在原安全配置或环境中。
