# 使用示例

新建默认 YSS `4.0.0-SNAPSHOT` / Boot `4.1.2` / Java `17`。五项必填参数、3.2 选择与完整自定义见 [命令示例](command-examples.md)，补全与歧义规则见 [平台选择](platform-selection.md)。

## 新建 DDD 空工程

先核对实际 `yss --version`、`yss scaffold catalog --json` 和 `yss scaffold ddd --help`，收集工程、平台、版本与 Maven 坐标，再使用 [默认、3.2 与自定义参数示例](command-examples.md)。输出父目录须存在，目标工程目录须不存在，包括空目录。

当前生成逻辑模块为 `domain`、`application`、`infrastructure`、`adapter`、`bootstrap`。实际模块目录与包路径以本次生成文件为准。

当前 CLI 产物包含空模块、POM、机械启动配置、Maven Wrapper 和 `.yss/scaffold.json` 来源收据。业务模型、Controller、API 和持久化实现在后续需求中实现。`assets/reference` 中的 ReferenceEntry 是教学资料。

## 新建 MVC 空工程

读取 `yss scaffold mvc --help`，使用 `yss scaffold mvc` 及 [命令示例](command-examples.md) 的对应场景参数集合。当前核心模块为 `server`、`service`、`repository`，Service 承担用例规则和事务，Repository 承担持久化。

## 已有工程维护

维护已有 MVC Service 时读取实际调用方、Service、Repository 和 POM，沿用工程分层实现需求。维护已有 DDD 时按 [分层实现路由](layer-skill-routing.md) 选择技能并增量编辑。

## 仅安装 Backend 技能

新目录或空目录使用 `yss init --root <目录> --profile backend --installation skills`，普通已有工程使用 `yss attach --root <目录> --profile backend --installation skills`。先核对对应命令帮助，已有受管项目按 `setup-yss-harness` 处理。

## 能力缺口与验证

CLI 缺失先安装。不支持目标能力时，说明版本或平台限制，按 [资产使用边界](standalone-generation.md) 评估 fallback，继续保留路径与兼容保护。

需要构建或启动时读取工程实际模块、启动类和 Maven 配置，使用工程根 `./mvnw` 的对应目标。Maven settings 规则见 [工程检查说明](engineering-checks.md)。仅生成文件、实际构建和成功运行分别报告。
