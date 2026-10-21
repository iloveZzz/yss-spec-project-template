# 统一入口与历史身份

本表用于项目身份识别；程序安装不要求已有实例。安装或升级 CLI 时读取 [程序安装与升级](program-installation.md)，新建、接管及资源补装读取 [项目操作](project-operations.md)。默认查询远程最新正式 Release，随后固定执行器、版本及摘要；项目目标来自该二进制内的固定 Bundle。

| 当前输入 | 允许路线 |
|---|---|
| Spec / Backend，`.yss.json` metadata4、根 identity2 | `doctor/diff` 后按需 `sync`；同来源缺资源才 ensure |
| Spec / Backend，统一 metadata3、identity1、policy1 | 显式 `migrate --plan --out`，核对政策变化与授权后 `migrate --apply --plan-file` |
| 仅 `.yss-template.json` / `.yss-harness-backend.json` | 旧 npm 家族，当前 CLI 不提供迁移；原件保留 |
| Design、Frontend、旧 dev 或退役插件 | 当前拒绝，不提供转为 Spec 或跨家族适配 |
| 多个矛盾身份、未知 schema、符号链接或模板源 | 只诊断受影响分支，不能重新 init、attach 或删 metadata |

当前新实例使用项目计划 v3、Bundle4、metadata4、identity2、Profile3、governance2；JSON envelope 和运行协议仍为 v1。不要把程序安装或 Tracker 的计划版本混为项目计划。旧统一实例直接 sync 会返回 `GOVERNANCE_MIGRATION_REQUIRED`；不支持的迁移保留 `MIGRATION_UNSUPPORTED` 或实际身份错误。历史源码 SHA 和旧 CLI 版本只描述其自身，不充当当前统一 CLI 来源。

原生身份绑定 Profile、协议、模板提交、Bundle/manifest 摘要和受管基线。迁移保存原身份、政策、历史记录及其摘要；历史批准只按原语义读取，不成为当前执行或批准资格。治理变化超出已有授权时先展示影响，不以普通 setup 推定未知决定。

`init` 默认直接初始化，本技能使用 `--plan --out` 后 `--apply --plan-file`。`attach/sync/skills ensure/assets ensure` 默认预演，写入使用保存计划。项目状态通过不带 `--apply` 的 `recover/rollback` 查询，写入才加 `--apply`；当前没有迁移状态、恢复、回退子命令。未完成治理迁移用 `recover --apply`；已完成治理迁移不支持降级，保留 `DOWNGRADE_UNSUPPORTED`。程序恢复仍使用独立的 `update` 合同。

当前后端交付插件绑定 `spec`；先核验插件实际公开接口与当前代际相容，再处理 binding 和来源的原子更新。`BINDING_REQUIRED`、`BINDING_CONFLICT` 不能用手改绑定绕过；同来源资源补装保护现有 binding 字节和权限。旧产品设计插件不是当前迁移入口。

`bundle inspect/export` 是公开读取接口。来源错配时恢复原固定二进制/Bundle 或重新规划，不另拉模板 main。缺技能的旧实例使用独立技能包或仓外导出读取说明，不能先 sync 来取得入口。

固定旧 npm 包、完整源码 SHA、摘要和恢复包继续保留，不执行 unpublish。历史未完成事务只由匹配的仓外旧执行器按自身帮助恢复；不能把历史恢复成功等同于当前 CLI 已支持迁移，也不承诺未经验证的分段迁移路径。
