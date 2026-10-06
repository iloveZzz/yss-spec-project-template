---
name: yss-harness-upgrade
description: 安装或升级 YSS Go CLI，默认取得 GitHub 最新正式 Release；编排四 Profile 工程新建、接管、模板同步、旧实例迁移、资源补装、诊断和事务恢复回退。
---

# YSS 安装、初始化与升级维护

本技能编排固定 `yss` 公开入口；操作合同以 [统一协议](../../../.template-spec/process/harness-upgrade.md) 为准。先判断用户要维护程序还是项目，只加载对应参考。模板源的技能修改交给 `maintaining-skills`；业务实现、数据库迁移及产品批准由原工作单元处理。

## 操作分流

| 用户目标 | 入口与必读参考 |
|---|---|
| 安装、升级 CLI，或缺少平台包时构建 | [程序安装与升级](references/program-installation.md)：远程最新正式 Release → 固定版本及摘要 → 程序事务 |
| 新建治理工程或接管普通工程 | [项目操作](references/project-operations.md)：`init` / `attach` 保存计划后应用 |
| 原生模板同步、旧四 CLI 实例迁移 | [项目操作](references/project-operations.md) 与 [家族适配](references/cli-families.md)：`sync` / `migrate plan/apply`；有插件 binding 时走插件公开接口 |
| 补装技能或阶段资源 | [项目操作](references/project-operations.md)：先 `skills/assets list`，再 `ensure` 保存计划后应用 |
| 诊断、恢复或回退 | 按程序/项目选择上述参考；先只读查状态，再在已有授权范围使用对应事务写入入口 |

## 共同执行规则

1. 明确操作、目标绝对路径和已有授权范围。程序安装不要求已有项目的 `yss-project.yaml` 或 `CONTEXT.md`；项目操作读取目标根身份、唯一 Context、metadata、Profile、binding、受管基线和 Git 状态。新建与接管的身份前置条件见项目参考；既有实例身份非法或 schema 不支持时只诊断，不能猜身份或重新 init。
2. 默认查询固定仓库 `iloveZzz/yss-cli` 的最新正式 Release，排除草稿、预发布和未发布 main；记录 Release、完整源码 SHA、平台、包与二进制 SHA-256。每个执行批次固定来源；先查最新、再用明确版本或已下载包执行，不把 `latest` 留在项目 apply 中。用户明确指定固定版本或离线产物时消费该来源。
3. 核对实际运行文件、版本、安装回执和来源清单；程序恢复与项目恢复分别记录。回执、摘要或身份失配时保留现场，不能手改 metadata/收据、删除事务、`--force` 或覆盖裸二进制。程序安装成功后重新固定新二进制，再独立规划项目操作。
4. 保存计划先核对范围、输入、冲突和备份位置，应用使用生成计划的同一固定二进制。`INPUT_DRIFT` 或来源变化要求重新规划；原生不接受的旧参数须说明错误与替代路径。新增语义选择先展示处置差异，复用有效授权，缺真实决定才等待。
5. 核对实际退出 0、envelope `status=ok/code=OK`、回执及操作后的状态；项目操作再做同选项计划，验证无重复变更。记录定制、已有失败、来源、计划/回执/归档、实际命令及未覆盖项。结构检查不代替真实 CLI 或 Agent 行为验证。

## 保护与恢复

- 程序 `update status`、项目 `migrate status` 只读。程序 `update recover/rollback` 和项目 `migrate recover/rollback` 本身是显式写入子命令，不加 `--apply`；普通项目 `recover/rollback` 默认只读，加 `--apply` 才写入。旧固定执行器消费其自身版本规则。
- 程序目录与项目根分别指定；回退只针对最近成功的适用事务，重复回退不跨到更早事务。后续用户字节/权限变化或归档损坏时拒绝覆盖；不能把归档当扩大授权的理由。
- 保护唯一 Context、业务文件、用户 `.github`、Git HEAD/index/gitlink、文件类型和权限。Spec、Ticket、合同、人工回复、批准和正式验证默认保留；语义或批准绑定变化回交生命周期。
- 旧实例缺技能时用固定 `bundle export` 在项目外读取入口，不能先同步来安装技能。CLI 升级只改程序；实例同步使用新二进制内固定 Bundle，不另拉模板 main。
- 不自动 commit、stash、reset、clean、push 或发布；不执行跨家族转换、任意历史回退、业务重构或数据库迁移。本技能不批准 Slice，不设置 `ready-for-agent`，不宣称可发布。

研究新增事实时用 `yss-research`；维护说明按 `lifecycle-document-output` 使用 `i-have-adhd`。
