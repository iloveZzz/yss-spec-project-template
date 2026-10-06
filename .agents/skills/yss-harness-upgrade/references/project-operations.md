# 项目初始化与维护

仅在新建、接管、同步、迁移、补装或恢复项目时读取；[统一协议](../../../../.template-spec/process/harness-upgrade.md) 持有保护与事务规则。以下命令可在任意工作目录运行，`<固定yss>`、目标根和计划均使用绝对路径；Profile 明确选择 `spec/design/backend/frontend`，不按目录名猜测。

## 判断目标与准备输入

| 目标现状 | 允许路线 |
|---|---|
| 不存在或空目录，用户要求新建 | `init` 保存计划；无旧项目身份与 Context 是预期初始状态 |
| 普通工程，无 YSS 实例 metadata 或身份，用户要求接管 | `attach` 保存计划；先读既有业务 Context、Git 与业务资产，缺 Context 的结果按执行器合同核对 |
| 合法 `.yss.json` 原生实例 | 读取根身份、唯一 Context、Profile、受管基线及 binding 后 `sync` |
| 可识别的旧家族实例 | 按 [家族适配](cli-families.md) 检查 schema 与旧事务，`migrate plan/apply` |
| 模板源、多个矛盾身份、既有实例缺必需身份、未知 schema 或来源 | 只诊断；不能重新 init、attach 或删 metadata 绕过 |

新建/接管需明确 Profile、目标与工程范围；信息不足先调查，再补缺失决定。初始化治理资源不授予产品阶段批准或生产脚手架权限；实现工程接入与脚手架仍消费相应生命周期合同。

对既有实例先 `doctor/diff` 并记录已有失败、dirty/untracked、HEAD/index/gitlink 和受管文件定制。用 `bundle inspect --profile <Profile> --json` 核对固定二进制内来源；真实业务工程先在隔离副本验证。旧未完成事务须由对应仓外固定旧执行器恢复，不能交给 Go 猜旧日志。

## 新建与接管

```text
<固定yss> init --profile <Profile> --root <目标根> --project-name <名称> --plan --out <项目外新计划.json> --json
<固定yss> init --profile <Profile> --root <目标根> --apply --plan-file <计划.json> --json
<固定yss> attach --profile <Profile> --root <普通工程根> --plan --out <项目外新计划.json> --json
<固定yss> attach --profile <Profile> --root <普通工程根> --apply --plan-file <计划.json> --json
```

仅执行对应的一组命令。`init` 原生默认直接写入，本技能显式保存计划；已有工程用 `attach`，已登记实例用同步/迁移。核对新增资产、既有文件保护、变量、冲突及计划摘要，按既有授权应用，不把计划当新批准。

## 同步与旧身份迁移

```text
<固定yss> sync --root <原生实例根> --plan --out <项目外新计划.json> --json
<固定yss> sync --root <原生实例根> --apply --plan-file <计划.json> --json
<固定yss> migrate plan --root <旧实例根> --profile <Profile> --out <项目外新计划.json> --json
<固定yss> migrate apply --root <旧实例根> --profile <Profile> --plan-file <计划.json> --json
```

已绑定后端交付或产品设计插件的旧实例，使用对应插件 `project-migration-plan/apply`；绑定原生实例更换二进制、模板或 Bundle 来源时用 `project-upgrade-plan/apply`，身份、受管基线和 binding 原子更新。直接同步缺新 binding 的 `BINDING_REQUIRED`，或既有失配的 `BINDING_CONFLICT`，均不能手改绑定绕过。

冲突先在项目外起草保留/合并差异，新增语义选择取得真实决定后处理，再从当前输入重新规划。未知基线、受管文件定制和 `UNPORTED` 阻断对应写入；`INPUT_DRIFT`、摘要或身份变化不能通过编辑保存计划续跑。旧 metadata 原字节进入同一事务恢复材料。

## 资源补装

先 `<固定yss> skills list --root <项目根> --json` 或 `assets list`，只选择当前 Profile 实际支持的 Skill/阶段标识。

```text
<固定yss> skills ensure <skill> --root <项目根> --plan --out <项目外新计划.json> --json
<固定yss> skills ensure <skill> --root <项目根> --apply --plan-file <计划.json> --json
<固定yss> assets ensure <stage> --root <项目根> --plan --out <项目外新计划.json> --json
<固定yss> assets ensure <stage> --root <项目根> --apply --plan-file <计划.json> --json
```

安装受支持的依赖闭包，不从其他 Profile 拷贝目录。同一来源补装可保留既有插件 binding 原字节和权限；更换来源先走插件升级。缺本技能的旧实例用 `bundle export --profile <Profile> --out <项目外新目录> --json` 读取完整入口，不能先修改项目来取得说明。

## 恢复、回退与验收

普通 `recover/rollback --root <目标> --json` 默认只读，明确恢复授权内增加 `--apply` 写入；`migrate status` 只读，`migrate recover/rollback` 本身写入，不加 `--apply`。程序 `update` 的事务不能作为项目恢复入口。

操作后检查回执、`doctor/diff`、身份、Context、受管基线、锁与投影、插件 binding 和适用治理；再次用同来源、同选项保存新计划，确认无重复变更。`doctor` 只检查其实际覆盖范围，已有产品治理缺口单独记录。核对业务文件、工作区改动、Git 状态和权限仍保持；报告原失败与新增失败、计划/备份/回执及未覆盖项。回退最近成功适用事务前检查用户后续修改与归档；重复回退不退到更早事务，不改变程序版本或历史批准。
