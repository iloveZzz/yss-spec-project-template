# 同家族升级适配

| CLI | 实例 metadata |
|---|---|
| create-yss-spec | .yss-template.json |
| create-yss-harness-design | .yss-harness-design.json |
| create-yss-harness-backend | .yss-harness-backend.json |
| create-yss-harness-frontend | .yss-harness-frontend.json |

身份还需通过各 CLI 原有 profile/schema 检查。多个 metadata、旧 dev 家族、未知 schema、符号链接或矛盾 profile 均不能自动接管。`migrate` 不是降级或跨家族工具。

四类 CLI 的新入口一致：`migrate plan|apply|status|recover|rollback`，支持 `--json`。`migrate plan` 只向显式指定的项目外新文件输出；`apply --plan <文件>` 显式写入。recover/rollback 默认只读，写入需 `--apply`。不要从旧 `sync` 推断新接口：主 CLI 普通 sync 会写入，专职 CLI sync 默认预览。

目标模板来自当前固定 CLI 包，不接受计划中的下载地址或脚本。版本、模板和执行器摘要不匹配时更换为生成计划的原包，或重新规划；不得修改计划来绕过。已有 `update/upgrade` 仅更新 CLI 程序，既有 `recover` 仍只恢复原事务。
