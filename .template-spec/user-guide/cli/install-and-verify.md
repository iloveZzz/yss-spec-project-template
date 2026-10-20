# 安装、接管、升级与恢复

本页是[统一 CLI 操作说明](../unified-cli.md)的一部分。

## 安装与来源核验

使用 `setup-yss-harness` 作为安装与维护入口，规则见 [统一协议](../../process/harness-upgrade.md)。默认从 [官方最新正式 Release](https://github.com/iloveZzz/yss-cli/releases/latest) 取得本机平台产物及 `checksums.json`，排除草稿、预发布和未发布 main；不把当前版本写成长期默认。查询后固定 tag、完整源码 SHA、平台、归档大小及 SHA-256，核对包内 manifest、来源锁和平台发行资格。程序安装无需已有项目身份。

`setup` 指定工程时，在有效授权内将 CLI 与受管模板对齐所选固定版本：空目录初始化，普通工程接管，当前原生实例同步，受支持的旧统一实例显式治理迁移，当前插件 binding 先核验公开接口。Profile 沿用合法身份；没有身份时按用途推荐，不能从框架或目录名猜测。程序与项目分别验收；CLI 已成功但项目失败时保留已验证程序、恢复项目自身，并报告整体未完成。

技能支持独立安装到 Agent 用户级目录。模板维护者可用 `scripts/export-yss-skills --skill setup-yss-harness --output <仓外新目录>` 生成便携包，再以相同选项加 `--check` 检查来源；安装其中 `skills/setup-yss-harness/` 整个目录，必需说明与协议参考均在目录内。来源包不要求已有模板 checkout 或 CLI。已有同名目录先保存差异和恢复材料，按实际安装授权处理。

源码更名不会改变已发布 CLI 的内嵌 Bundle。先用 `yss skills list` 核对实际标识；旧包中的 `yss-harness-upgrade` 只作历史读取，新包支持 `setup-yss-harness` 后才使用下述补装名称。缺新入口时可先调用独立技能，不能手改 metadata 或同步工程来取得说明。

没有 CLI 时在仓外临时新目录安全展开已校验包，用其中二进制执行以下离线安装；旧版没有在线升级入口时也使用此路径。目标为独立用户工具目录，不能是项目或 Git 根。示例中的 `<固定版本>`、`<包SHA-256>` 替换为本次远程查询结果，命令路径替换为已校验的固定二进制：

```text
yss update plan --tool-root /absolute/path/tools/yss --artifact /absolute/path/yss-package.tar.gz --sha256 <包SHA-256> --out /absolute/path/install-plan.json --json
yss update apply --tool-root /absolute/path/tools/yss --plan-file /absolute/path/install-plan.json --json
/absolute/path/tools/yss/yss version --json
/absolute/path/tools/yss/yss update status --tool-root /absolute/path/tools/yss --json
```

先核对计划范围及输入，再按已有授权应用；引导程序不能预先复制进目标目录。默认复用合法受管目录，首次安装采用用户级独立目录。安装一致性核验同时检查实际版本、收据、manifest、文件摘要及权限；未知或裸复制入口不能直接覆盖。失配时保留旧目录，在新目录安装并验证后切换用户 PATH，保护原链接及未知入口。

支持在线升级的版本先只读查询，再使用查得的明确版本：

```text
yss upgrade --check --json
yss upgrade --to <固定版本> --tool-root /absolute/path/tools/yss --json
```

`--to` 固定版本，在线命令会重新读取该 tag 清单；需要严格绑定已审阅摘要或保存计划时使用下载后的 `update plan/apply`。在线回执与记录失配时停止后续项目操作。已最新且安装来源一致时返回 `unchanged`；查询结果本身不能证明安装一致。网络失败、限流或校验错误须明确诊断，不能静默换来源。缺平台包时从该 Release 完整 SHA 隔离构建、测试及打包，保持该版本实际 Profile 的固定来源锁，并单独记录本机构建与验证范围，不将其标成官方发行资格。

安装后运行固定路径的 `yss version --json` 与各 Profile 的 `bundle inspect`，核对 CLI、协议、模板提交及 Bundle/manifest 摘要。程序升级结束后重新固定二进制，再独立规划项目同步；旧 CLI 版本仅表示历史迁移基线。

模板验证显式设置 `YSS_NATIVE_BINARY=/absolute/path/yss` 和 `YSS_NATIVE_BINARY_SHA256=<sha256>`。固定源构建另设置 `YSS_NATIVE_SOURCE_ROOT=/absolute/path/yss-cli`。脚本不从 PATH 猜版本，不自动调用旧 gitlink，也不修改全局安装。

按实际 Release 资产及稳定/仅构建清单核验平台资格，`supportedPlatforms` 不表示已发布平台包。`stableReady=false` 或 `nativeRuntimeVerified=false` 不具备稳定在线升级资格，不能用离线安装绕过。macOS 归档与工具根须在同一支持原子克隆的 APFS 卷；跨卷或不支持返回 `UNPORTED`，不降级复制。仅要求检查时保持只读。

## 新建、接管和补装

```bash
yss init --profile spec --root /absolute/path/project --project-name Example --plan --out /absolute/path/init-plan.json --json
yss init --profile spec --root /absolute/path/project --apply --plan-file /absolute/path/init-plan.json --json
yss doctor --root /absolute/path/project --json
yss diff --root /absolute/path/project --json
yss assets ensure stage.system-data-engineering --root /absolute/path/project --plan --out /absolute/path/assets-plan.json --json
yss assets ensure stage.system-data-engineering --root /absolute/path/project --apply --plan-file /absolute/path/assets-plan.json --json
yss skills ensure setup-yss-harness --root /absolute/path/project --plan --out /absolute/path/skill-plan.json --json
yss skills ensure setup-yss-harness --root /absolute/path/project --apply --plan-file /absolute/path/skill-plan.json --json
```

`init` 不带 `--plan` 时直接初始化；上例显式保存预演计划，供审阅后应用。对已存在普通工程使用 `attach`，默认预演，保存计划后再显式应用。先查看 `assets list` / `skills list`，按 Profile 支持的闭包补装。新建和升级保护唯一根 `CONTEXT.md`、业务目录、用户 `.github`、Git index、文件类型和权限。冲突或不支持能力阻断写入，不能用 `--force` 继续。

## 升级与回退

当前 metadata4 / identity2 Spec、Backend 使用 `sync --plan --out <计划>`；旧统一 metadata3 / identity1 / policy1 必须显式 `migrate --plan --out <计划>`，再 `migrate --apply --plan-file <计划>`。旧原生实例直接 sync 返回 `GOVERNANCE_MIGRATION_REQUIRED`，仅旧 npm 家族、Design、Frontend 或旧 dev 不提供当前迁移。项目保存计划 v3、metadata4、Bundle4、identity2、Profile3、governance2；输出和运行协议仍为 v1。程序、项目与 Tracker 计划分别识别，跨代际不沿用旧计划。原政策、身份和记录封存，历史批准不授予当前资格；政策变化仅在已有授权覆盖时执行。项目状态通过不带 `--apply` 的 recover/rollback 查询；旧未完成事务按匹配的固定旧执行器处理，不能删状态目录。

资产协议版本升级见[资产 Schema 显式迁移](../../process/asset-schema-migration.md)。该迁移另行生成草稿，不改写历史资产或继承原批准。

当前支持的后端交付插件绑定项目先核验插件公开接口与实际代际相容；原生来源升级使用 `project-upgrade-plan/apply`，治理迁移只在插件明确支持时用对应接口，不能套用退役产品设计插件。插件使身份与 binding 原子更新。直接 sync 的 `BINDING_REQUIRED`、`BINDING_CONFLICT` 不得手改绕过；同来源补装保护 binding 字节和权限。

`yss recover --root <目标> --json` 和 `yss rollback --root <目标> --json` 默认只读；各加 `--apply` 才恢复未完成事务或回退最近成功的适用项目事务。当前没有 `migrate status/recover/rollback` 子命令。未完成治理迁移使用 `recover --apply`；已完成治理迁移不支持降级并返回 `DOWNGRADE_UNSUPPORTED`。只在已有恢复授权范围内写入，后续修改导致 `CONCURRENT` 时拒绝覆盖。普通项目回退后重复回退不跨到更早事务。程序安装升级使用独立工具根，不顺带迁移项目。

程序只读状态用 `yss update status --tool-root <工具根> --json`；程序 `update recover` / `update rollback` 本身写入，不加 `--apply`，只处理程序安装事务。项目回退不改变程序版本，程序回退也不恢复项目。

成功须同时观察退出 0、`status=ok`、`code=OK`。错误报告保留版本化 envelope；必要能力的 `UNPORTED`、输入漂移或缺失证据阻断相应切换批次。

## Bundle 与历史恢复

`yss bundle export --profile <Profile> --out <项目外新目录> --json` 导出完整资产与 manifest，供插件和只读升级说明消费。插件固定二进制和摘要，不再使用旧 Node bin、私有 CommonJS 模块或旧成功 JSON。

真实业务工程先在隔离副本中验证，原地操作按明确范围安排。旧固定 npm 包、源码提交、上一版二进制、Bundle、来源锁和插件包长期保留。发行资格消费该 Release 明示平台范围内的实际原生收据与适用固定源码门禁，未验证平台不得标成通过。npm deprecated 和旧仓归档按各自授权及退役合同执行，不执行 unpublish。
