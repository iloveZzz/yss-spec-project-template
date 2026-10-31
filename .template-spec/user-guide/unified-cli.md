# YSS CLI 使用说明

命令支持以所装版本帮助为准。先运行 `yss version` 和 `yss help`，仅使用该版本实际支持的命令；模板更新不改变旧二进制能力，也不代表当前程序是最新发行。

CLI 负责安装、同步、脚手架和工具升级。业务需求、设计与代码工作由 Agent 按当前目标直接开展。首次安装由 Agent 下载并核对用户选定的正式发行包；新接口不支持旧插件、旧兼容命令或旧保存计划。

- [安装与升级](cli/install-and-verify.md)
- [命令参考](cli/command-reference.md)
- [Spec 使用](cli/tutorial-spec.md)
- [Backend 使用](cli/tutorial-backend.md)
- [维护与恢复](cli/tutorial-maintenance.md)

写入命令默认直接执行，`--dry-run` 只预览，不保存计划、控制目录或目标文件。Profile 为 `spec` 或 `backend`；安装内容为 `project` 或 `skills`。
