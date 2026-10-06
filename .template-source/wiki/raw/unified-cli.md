# 统一 CLI 操作说明

四个 Profile 使用同一固定 `yss` 二进制。`spec` 是综合治理，`design` 是战略与产品设计交接，`backend` 和 `frontend` 是专职交付。三个 Agent 模板源继续维护，退役范围仅限四个旧生成器。

## 安装与来源核验

从已批准的发行产物取得对应平台的二进制和发行清单，先核对 SHA-256，再运行 `yss version --json` 与 `yss bundle inspect --profile spec --json`。核对统一 CLI 版本/源码 SHA、协议、模板 SHA、Bundle 和 manifest 摘要；旧 CLI 版本仅表示历史迁移基线。`yss 1.0.0` 是首个稳定版目标，预发布验收记录不表示稳定版已发行。

模板验证显式设置 `YSS_NATIVE_BINARY=/absolute/path/yss` 和 `YSS_NATIVE_BINARY_SHA256=<sha256>`。固定源构建另设置 `YSS_NATIVE_SOURCE_ROOT=/absolute/path/yss-cli`。脚本不从 PATH 猜版本，不自动调用旧 gitlink，也不修改全局安装。

## 新建、接管和补装

```bash
yss init --profile spec --root /absolute/path/project --project-name Example --plan --out /absolute/path/init-plan.json --json
yss init --profile spec --root /absolute/path/project --apply --plan-file /absolute/path/init-plan.json --json
yss doctor --root /absolute/path/project --json
yss diff --root /absolute/path/project --json
yss assets ensure stage.system-data-engineering --root /absolute/path/project --plan --out /absolute/path/assets-plan.json --json
yss assets ensure stage.system-data-engineering --root /absolute/path/project --apply --plan-file /absolute/path/assets-plan.json --json
yss skills ensure yss-harness-upgrade --root /absolute/path/project --plan --out /absolute/path/skill-plan.json --json
yss skills ensure yss-harness-upgrade --root /absolute/path/project --apply --plan-file /absolute/path/skill-plan.json --json
```

`init` 不带 `--plan` 时直接初始化；上例显式保存预演计划，供审阅后应用。对已存在普通工程使用 `attach`，默认预演，保存计划后再显式应用。先查看 `assets list` / `skills list`，按 Profile 支持的闭包补装。新建和升级保护唯一根 `CONTEXT.md`、业务目录、用户 `.github`、Git index、文件类型和权限。冲突或不支持能力阻断写入，不能用 `--force` 继续。

## 升级与回退

`sync` 和 `migrate plan` 默认预演；`--apply --plan-file` 绑定保存计划与当前输入。旧 metadata 保留原字节，迁入 `.yss.json` 的身份、受管基线及插件 binding 进入同一事务。先用 `migrate status` 检查状态；旧未完成事务必须先由对应仓外固定旧执行器恢复，不能删状态目录。

已绑定后端交付或产品设计插件的项目，使用对应插件 `project-migration-plan` / `project-migration-apply` 迁移旧身份，使用 `project-upgrade-plan` / `project-upgrade-apply` 升级原生来源。插件把身份与 binding 纳入同一事务。直接 `yss sync` 更换来源而缺少新 binding 返回 `BINDING_REQUIRED`；既有身份与 binding 已失配返回 `BINDING_CONFLICT`。同一来源的 `assets ensure` / `skills ensure` 仍可按保存计划补装，输入保护既有 binding 原字节和权限。

普通 `yss recover --root <目标> --json` 和 `yss rollback --root <目标> --json` 只读检查；各加 `--apply` 才恢复未完成项目事务或整体回退最近成功项目事务。`yss migrate recover --root <目标> --json` 是显式恢复写入子命令，`yss migrate rollback --root <目标> --json` 是最近成功迁移的显式回退写入子命令，两者不要求 `--apply`。只在已有恢复授权范围内执行写入，后续用户修改导致 `CONCURRENT` 时拒绝覆盖并保留现场。成功回退后的重复回退保持幂等，不继续回退更早事务。程序升级使用 `update` 的独立工具根和固定离线产物，不顺带迁移项目。

成功须同时观察退出 0、`status=ok`、`code=OK`。错误报告保留版本化 envelope；必要能力的 `UNPORTED`、输入漂移或缺失证据阻断相应切换批次。

## Bundle 与历史恢复

`yss bundle export --profile <Profile> --out <项目外新目录> --json` 导出完整资产与 manifest，供插件和只读升级说明消费。插件固定二进制和摘要，不再使用旧 Node bin、私有 CommonJS 模块或旧成功 JSON。

真实业务工程只在隔离副本中验证。旧固定 npm 包、源码提交、上一版二进制、Bundle、来源锁和插件包长期保留。npm deprecated 和旧仓归档在固定源码、六平台原生验收、完整模板门禁及可审阅发行清单完成后分别授权；不执行 unpublish。
