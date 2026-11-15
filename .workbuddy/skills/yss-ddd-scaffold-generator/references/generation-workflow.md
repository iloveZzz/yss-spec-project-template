# DDD 生成与产物核对

新建默认 YSS `4.0.0-SNAPSHOT` / Boot `4.1.2` / Java `17`。五项必填参数、3.2 选择与完整自定义见 [命令示例](command-examples.md)，补全与歧义规则见 [平台选择](platform-selection.md)。

新建工程先按 [CLI 命令](command-examples.md) 核对版本、catalog、帮助和真实输入，使用明确授权且已存在的输出父目录。目标工程目录须不存在，保留路径、符号链接和 Git 子模块保护。

生成后检查实际模块、POM、机械启动入口、配置、包路径、Maven Wrapper 及 `.yss/scaffold.json` 来源收据。当前 CLI 生成空骨架，业务 API、领域实现和教学 reference 需后续按需求添加。`assets/reference` 保留为教学资料。

构建检查按当前任务选择，优先使用工程根 `./mvnw`。需要核对 POM 时可运行 `./mvnw validate`，需要编译、测试或打包时选择对应 Maven 目标。执行前读取工程配置和可用依赖。仅执行生成时如实交付文件结果，执行过的构建或运行分别说明结果与限制。

用户已要求项目技能时，沿用已核验的 CLI 执行 `attach --root <生成目录> --profile backend --installation skills`。发生冲突时保留源码及原入口，按实际差异处理并报告接入状态。
