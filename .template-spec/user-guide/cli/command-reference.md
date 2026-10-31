# 命令参考

本文描述正在整理的新 CLI 接口，尚未作为正式发行发布。先运行已安装程序的 `yss version` 和 `yss help`，仅使用该版本实际支持的命令；旧发行版不因模板更新而获得新接口。

| 命令 | 用途 |
|---|---|
| `init` | 初始化项目入口与所选资产 |
| `attach` | 接管已有工程，保护用户文件 |
| `sync` | 同步受管资产；安装方式转换用该版本帮助列出的开关 |
| `skills list` / `skills ensure` | 列举或补装所选技能与依赖资源 |
| `scaffold catalog` | 查看平台和生成参数 |
| `scaffold ddd` / `scaffold mvc` | 在全新目标目录生成后端骨架 |
| `upgrade` | 在线或离线升级 CLI |
| `doctor` | 诊断受管文件、冲突与安装状态 |
| `recover` | 恢复未完成事务，保护后续用户修改 |
| `version` / `help` | 查看实际版本、来源与帮助 |

项目选择使用 `--profile spec|backend`、`--installation project|skills`。`init`、`attach`、`sync`、`skills ensure`、`scaffold` 和 `upgrade` 使用 `--dry-run` 预览；实际参数以对应帮助为准。

在线升级指定 `upgrade --to <版本> --tool-root <工具目录>`；离线升级指定 `upgrade --artifact <归档> --sha256 <摘要> --tool-root <工具目录>`。不要将两组来源混用。恢复操作按 `recover --help` 选择实际支持的项目或工具目录参数。

此接口不提供旧 plan/apply、生命周期、合同、证据、门禁、插件或脚本执行入口。
