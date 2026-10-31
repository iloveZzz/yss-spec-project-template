# Backend 项目与脚手架

本文描述正在整理的新 CLI 接口，尚未作为正式发行发布。先运行已安装程序的 `yss version` 和 `yss help`，仅使用该版本实际支持的命令；旧发行版不因模板更新而获得新接口。

项目入口使用 `init` 或 `attach --profile backend`，技能补装使用 `skills list`、`skills ensure`。先查看所用命令的实际帮助。

新骨架先读 `scaffold catalog`，再使用 `scaffold ddd` 或 `scaffold mvc`。明确项目名、Java 包名、输出父目录、平台、精确 Spring Boot/Java 版本和 Maven 工程、Parent、YSS BOM 坐标；不猜版本。`--dry-run` 只在内存预览，不创建目标、控制目录或计划。目标必须不存在，输出路径不能经过符号链接，已有工程不能用脚手架覆盖。

生成不需要合同、批准或平台资格证据，不生成测试与门禁，也不自动执行 Maven。后续业务实现复用适用 YSS 技能，工程命令优先根 `./mvnw`；按任务实际需要验证并报告结果。
