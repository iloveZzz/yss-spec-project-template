---
name: yss-harness-upgrade
description: 用固定 yss 二进制升级 Spec、Design、Backend、Frontend 模板实例，显式迁移旧 CLI 身份并验证归档、事务恢复和回退；不处理业务代码或数据库迁移。
---

# YSS 实例升级

先读取根 `yss-project.yaml`、`CONTEXT.md` 和 [统一协议](../../../.template-spec/process/harness-upgrade.md)。目标必须是已登记的同家族 `project-instance`；身份/schema 不支持时只诊断，不能重新 init 或猜测身份。模板源的技能维护由 `maintaining-skills` 处理。

## 工作顺序

1. 确认目标绝对路径、授权范围、工作区改动、metadata 与 Profile。固定 `yss` 二进制版本、源码提交和 SHA-256，并用 `yss bundle inspect --profile <Profile> --json` 核对 Bundle、manifest 和模板提交。执行期间不引用 `latest`，也不自动安装全局程序。程序升级和实例迁移分别记录。
2. 按 [家族适配](references/cli-families.md) 检查原生及旧未完成事务。用 `yss migrate status` 或不带 `--apply` 的 `yss recover` 只读检查原生事务；恢复写入按下文选择入口。旧未完成事务先交给归档中的对应固定旧执行器恢复，再用 Go 生成迁移计划。不能删除状态目录绕过恢复。
3. 未绑定旧实例使用 `yss migrate plan --root <绝对路径> --profile <Profile> --out <项目外全新计划.json> --json`；原生实例使用 `yss sync --root <绝对路径> --plan --out <项目外全新计划.json> --json`。已绑定后端交付或产品设计插件的实例，分别使用对应插件的 `project-migration-plan` 或 `project-upgrade-plan`。核对身份、受管基线、插件 binding、输入摘要、保护路径、冲突和收据位置。旧 metadata 原字节进入同一事务的恢复材料。
4. 冲突或不支持能力阻断对应迁移。保留现场，在项目外起草处置差异并展示新增语义取舍；复用有效授权，缺失决定才等待。不能使用 `--force`、手改 metadata 或先改项目来消除冲突；未移植旧参数必须给出明确错误及替代路径。
5. 相同固定二进制执行 `yss migrate apply --root <绝对路径> --profile <Profile> --plan-file <计划> --json`，或按原生同步计划执行 `yss sync --root <绝对路径> --apply --plan-file <计划> --json`。插件计划由对应 `project-migration-apply` 或 `project-upgrade-apply` 应用，使身份与 binding 原子更新。执行器重新计算并绑定计划与输入；`INPUT_DRIFT`、摘要或身份变化时重新规划，不能编辑计划续跑。迁移不自动 commit、stash、reset、push 或发布。
6. 查看回执和实例验证结果，执行相同选项的新计划验证无重复迁移。核对业务文件与既有工作区改动保持，说明保留的定制和现有失败。输出实际版本、归档/回执位置、验证证据和剩余问题；结构检查不能代替真实 CLI 或 Agent 行为验证。

## 恢复与边界

- `yss recover` 和 `yss rollback` 不带 `--apply` 时只读检查；加 `--apply` 才恢复未完成项目事务或回退最近成功项目事务。`yss migrate status` 只读；`yss migrate recover` 是显式恢复写入子命令，`yss migrate rollback` 是最近成功迁移的显式回退写入子命令，两者不要求 `--apply`。写入只在已有迁移/恢复授权范围内执行；后续用户修改或归档损坏必须拒绝覆盖。旧执行器按其固定版本说明使用，不能混用这些规则。
- 已绑定插件的项目更换二进制、模板或 Bundle 来源时，使用对应插件公开升级计划；直接 `yss sync` 缺少新 binding 返回 `BINDING_REQUIRED`，身份与既有 binding 已失配返回 `BINDING_CONFLICT`。同一来源的 `assets ensure` / `skills ensure` 可按保存计划补装，并保护既有 binding 原字节和权限。
- Spec、Ticket、合同、人工回复、批准和正式验证默认保留。路径迁移不产生新批准；语义或批准绑定变化交回原生命周期，不补造旧状态。
- 不执行跨家族转换、任意历史版本跳转、业务重构或数据库迁移。未知基线不能由 Agent 猜测；归档不能作为扩大写入授权的理由。
- 旧实例缺少本技能时，用固定 `yss bundle export --profile <Profile> --out <项目外新目录> --json` 在项目外读取完整资产、manifest 与升级入口。不得先同步目标项目来安装技能。

本技能只编排，不复制迁移执行器。研究新技术事实时用 `yss-research`；结论输出按 `lifecycle-document-output` 使用 `i-have-adhd`。不批准 Slice、不设置 `ready-for-agent`、不宣称可发布。
