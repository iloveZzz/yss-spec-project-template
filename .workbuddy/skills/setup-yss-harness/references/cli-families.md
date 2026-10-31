# 统一入口与来源身份

程序与项目分别核验。新安装使用经发行证明的 CLI，固定版本、完整源码提交、平台及摘要；实例使用 CLI 内置或受信登记的 Bundle，核对 Profile、模板版本、提交、快照、manifest 和 Bundle 摘要。

| 当前输入 | 允许路线 |
|---|---|
| 受信重发后来源的 Spec / Backend，installation=skills | 核验身份后按需 `doctor/diff/sync`；不要求治理身份与 Context |
| 受信重发后来源的 Spec / Backend，installation=governed | 核验治理身份和 Context 后按需 `doctor/diff/sync` |
| 受信当前实例，需要转换安装方式 | 显式 `migrate --installation skills\|governed --plan`；核验正式工作状态后应用 |
| 重发前同名版本、更早版本或来源不受信 | 停止受影响写入并保留原文件；不推定兼容 |
| 矛盾身份、未知 schema、符号链接或模板源 | 只诊断；不能重新 init、attach 或删除 metadata 绕过 |

新建和接管默认 governed；独立技能显式选择 `--installation skills`。同步要求 Git 已提交且工作区干净，拒绝覆盖被忽略的目标。失败时核对可能新增路径，人工处理后用 Git 恢复已跟踪文件；同步不支持自动恢复或回滚。程序升级失败后保留旧目录，在新目录重新安装。

项目状态查询不证明身份有效；`project verify` 的 `outcome=complete` 才表示原计划产物完整。后端插件先核验公开接口和 binding；`BINDING_REQUIRED`、`BINDING_CONFLICT` 不能靠手改绑定绕过。程序和项目操作分别固定来源、执行并报告结果。
