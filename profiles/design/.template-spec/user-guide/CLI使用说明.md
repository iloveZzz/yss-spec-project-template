# yss design 使用说明

统一 CLI `yss` 使用 `--profile design` 创建和维护 `harness.business-ddd-strategy-handoff` 的治理资产。先用 `yss version --json`、`yss capabilities --json` 和 `yss bundle inspect --profile design --json` 核对已安装二进制、当前能力与固定模板来源；安装和升级消费已验收的固定发行，不按旧包名或 `latest` 推断来源。

## 本端职责与综合主控目标

本 Profile 完成战略设计交接，由 Spec 综合主控汇总同一业务范围的整体验收。支持 `lifecycle-target-v1` 的实例在只读状态中显示 `profile-terminal`，这是本端职责终点，不是可写目标枚举；本端不使用 `lifecycle target --plan/--apply` 写综合目标。

```sh
yss lifecycle status --root ./new-project --checkpoint "<本端当前已登记checkpoint>" --json
```

原始 checkpoint 引用按本端真实登记替换。只有当前输入、适用批准和交付证据闭合才可报告本端完成；接收成功、文件存在或历史完成标签不能替代。Spec 主控若要消费本端结果，应显式绑定本工程绝对根、同功能 checkpoint 及当前接收／交付依据。旧实例缺政策时先核对固定程序能力，另行审阅模板同步计划，不静默启用。

本次目标、停止与续推、消费者绑定及恢复步骤见[统一 CLI 操作说明](unified-cli.md#正式功能的可续推目标)。产品设计里程碑达到仍须分别核验战略交接职责；技术设计由前后端工程路线承担。

## 创建与接入

新实例先保存计划，再应用同一计划。计划文件放在项目外的已有目录，输出文件必须尚不存在。

```sh
yss init --profile design --root ./new-project --project-name 我的项目 --business-domain 业务领域 --plan --out ../new-project-plan.json --json
yss init --profile design --root ./new-project --apply --plan-file ../new-project-plan.json --json
yss attach --profile design --root ./existing-project --plan --out ../attach-plan.json --json
yss attach --profile design --root ./existing-project --apply --plan-file ../attach-plan.json --json
```

init 只接受不存在或空目录。attach 先检查既有项目身份和受管冲突，不把已有另一家族实例转换到本 Profile。计划绑定项目根、Profile、模板摘要和文件字节及权限；输入变化后重新生成计划。直接 `yss init` 会创建新实例；其余文件更新应用已保存的计划。

## 诊断与同步

```sh
yss doctor --profile design --root ./new-project --json
yss diff --profile design --root ./new-project --json
yss sync --profile design --root ./new-project --plan --out ../sync-plan.json --json
yss sync --profile design --root ./new-project --apply --plan-file ../sync-plan.json --json
```

doctor、diff 和计划生成只读。当前原生入口不支持旧 CLI 的 `--force`、`--prune` 或 `--dry-run` 参数；冲突需要保留用户修改并重新审阅迁移方案，不借旧参数绕过保护。业务文件、根 `CONTEXT.md` 和项目已有决定仍由项目维护；分发同步不重新批准生命周期资产。

## 旧实例显式迁移

历史 `create-yss-harness-design` 的实例元数据为 `.yss-harness-design.json`。当前原生元数据为 `.yss.json`，其 Profile 必须是 `design`；统一 CLI 的版本和构建来源与模板提交分别记录。旧包版本只作历史来源识别，不能替代统一 CLI 版本或当前模板版本。

```sh
yss migrate plan --profile design --root ./old-project --out ../migration-plan.json --json
yss migrate apply --profile design --root ./old-project --plan-file ../migration-plan.json --json
yss doctor --profile design --root ./old-project --json
yss migrate status --profile design --root ./old-project --json
yss migrate rollback --profile design --root ./old-project --json
```

普通 sync 不隐式接管旧实例；先用 migrate plan 核对同家族身份、来源、受管差异和冲突。迁移保留旧元数据及归档，rollback 使用实际迁移事务恢复旧字节和权限。回退前受管文件已被修改时返回 `CONCURRENT` 并保留现场；修复前不覆盖用户改动。重复成功回退保持幂等。

如果旧固定执行器留下未完成迁移，原生入口返回 `LEGACY_INTERRUPTED`。先使用该实例匹配且已经归档校验的旧固定包公开 `migrate recover --apply` 恢复，必要时用同一旧包的公开 migrate plan/apply 补齐，再重新生成原生迁移计划。旧执行器仅用于历史实例恢复，不作为新实例默认入口。

## 原生事务恢复与来源核对

`yss recover --profile design --root ./new-project --json` 只读检查该项目未完成的原生事务；确认已有恢复授权后，加 `--apply` 才执行恢复写入。普通成功事务需要撤销时，先用 `yss rollback --profile design --root ./new-project --json` 查看，再用同命令加 `--apply` 回退。文件、技能锁与元数据属于同一事务，保护条件失败时保留现场。

实例来源以 `.template-spec/process/harness-profile.yaml` 和 `.yss.json` 为准：`cli_package: yss`、`native_profile: design`、`metadata_file: .yss.json`。异族、未知 Profile、损坏元数据、符号链接、gitlink 或越界路径在写入前拒绝。实例使用二进制内固定 Bundle；source lock 冻结模板提交及分发政策摘要，不在运行时调用旧 CLI 或拉取浮动模板。

本 Profile 的职责和生命周期终点继续以 Harness Profile 及生命周期注册表为准。项目工作方式见[战略设计子项目用户手册](战略设计子项目用户手册.md)。
