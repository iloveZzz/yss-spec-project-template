# 命令参考

命令支持以所装版本帮助为准。先运行 `yss version` 和 `yss help`，仅使用该版本实际支持的命令；模板更新不改变旧二进制能力，也不代表当前程序是最新发行。

| 命令 | 用途 |
|---|---|
| `init` | 初始化项目入口与所选资产 |
| `attach` | 接管已有工程，保护用户文件 |
| `sync` | 同步受管资产；安装方式转换用该版本帮助列出的开关 |
| `skills list` / `skills ensure` | 列举或补装所选技能与依赖资源 |
| `scaffold catalog` | 查看 Java 平台及 frontend 环境声明和参数 |
| `scaffold ddd` / `scaffold mvc` | 在全新目标目录生成后端骨架 |
| `scaffold frontend` | 在全新目标目录生成最小 Vue 工程；CLI 3.3.0 起支持，先查实际帮助 |
| `upgrade` | 在线或离线升级 CLI |
| `doctor` | 诊断受管文件、冲突与安装状态 |
| `recover` | 恢复未完成事务，保护后续用户修改 |
| `version` / `help` | 查看实际版本、来源与帮助 |

CLI 3.2.0 的项目选择支持 `--profile spec|backend|frontend`、`--installation project|skills`。frontend 需要对应 Bundle，3.1.4 及以前不支持；先确认实际版本与帮助。`init`、`attach`、`sync`、`skills ensure`、`scaffold` 和 `upgrade` 使用 `--dry-run` 预览；实际参数以对应帮助为准。前端接入见 [Frontend](tutorial-frontend.md)。

在线升级指定 `upgrade --to <版本> --tool-root <工具目录>`；离线升级指定 `upgrade --artifact <归档> --sha256 <摘要> --tool-root <工具目录>`。不要将两组来源混用。恢复操作按 `recover --help` 选择实际支持的项目或工具目录参数。

此接口不提供旧 plan/apply、生命周期、合同、证据、门禁、插件或脚本执行入口。

CLI 3.0.3 起，在线升级默认 GitHub `iloveZzz/yss-cli`，GitLab 为次级选择：先确认 `upgrade --help` 支持 `--source`，再用 `upgrade --source gitlab --to <版本> --tool-root <目录>` 显式选择，并提供该来源要求的 CA 与鉴权。来源失败不自动切换；离线归档不与 `--source` 混用。旧程序不会随模板文档自动获得这些行为。

`scaffold frontend --project-name <kebab-case> --output-dir <已有父目录>` 从 CLI 3.3.0 起支持，仅生成工程，`--dry-run` 也要求父目录存在；空目标目录同样拒绝。不由 Profile 支持版本推断命令能力；旧 CLI 缺少时说明能力缺口。
