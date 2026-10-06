# 统一入口与历史身份

本表用于项目身份识别；程序安装不要求已有实例。安装或升级 CLI 时读取 [程序安装与升级](program-installation.md)，新建、接管及资源补装读取 [项目操作](project-operations.md)。CLI 默认来源为远程最新正式 Release，选定后固定版本及摘要；四个项目 Profile 均消费该二进制内的固定 Bundle。

| `yss --profile` | 原生 metadata | 仅用于历史识别和恢复的旧身份 |
|---|---|---|
| spec | .yss.json | create-yss-spec / .yss-template.json |
| design | .yss.json | create-yss-harness-design / .yss-harness-design.json |
| backend | .yss.json | create-yss-harness-backend / .yss-harness-backend.json |
| frontend | .yss.json | create-yss-harness-frontend / .yss-harness-frontend.json |

原生身份绑定 `profile`、`profileId`、协议、模板提交、Bundle/manifest 摘要和受管基线。旧 CLI 版本和提交只表示历史迁移基线，不能作为 `yss` 来源。多个有效 metadata、旧 dev 家族、未知 schema、符号链接或矛盾 Profile 均不能自动接管。`migrate` 不是降级或跨家族转换工具。

原生读取 `--json` 返回 `outputVersion`、`protocolVersion`、`command`、`profile`、`status`、`code`、`result` envelope。成功必须同时满足实际退出 0 和 `status=ok/code=OK`；拒绝测试检查目标错误码，不能把 `INPUT_DRIFT` 当其他保护语义通过。

`init` 默认直接初始化；需要先审阅时使用 `--plan --out <项目外新文件>`，再用 `--apply --plan-file <已保存计划>` 应用。`attach/sync/skills ensure/assets ensure` 默认预演，写入须保存计划后显式应用。`migrate plan` 只读，`migrate apply --plan-file` 显式迁移。普通 `recover/rollback` 不带 `--apply` 只读，加 `--apply` 才写入；`migrate recover|rollback` 本身是显式写入子命令，不要求 `--apply`。

后端交付插件绑定的 Profile 是 `spec`，产品设计插件绑定的 Profile 是 `design`。绑定旧实例走对应插件 `project-migration-plan/apply`；绑定原生实例更换来源走 `project-upgrade-plan/apply`。直接同步缺少新绑定返回 `BINDING_REQUIRED`，原身份与绑定已不一致返回 `BINDING_CONFLICT`。同一来源补装资源仍可用公开原生计划，其输入绑定既有插件记录。

目标模板来自固定二进制内的 Bundle；`bundle inspect/export` 是公开读取接口。来源摘要错配时恢复生成计划的二进制/Bundle，或重新规划。旧 npm 精确版本、源码 SHA 和恢复包继续保留，不执行 unpublish。旧未完成事务先用对应仓外固定旧执行器处理，迁入原生事务后才能切换默认入口。
