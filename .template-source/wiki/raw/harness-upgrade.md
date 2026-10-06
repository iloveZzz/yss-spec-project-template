# YSS 模板实例升级协议

本协议定义固定原生 `yss` 对 Spec、Design、Backend、Frontend 的同家族实例升级，以及旧四 CLI 实例的显式迁移。`yss-harness-upgrade` 负责判断、冲突处置和授权范围；执行器负责保存计划、输入校验、受管基线、事务、恢复和回退。历史批准及 Ticket 状态仍由各自权威协议管理。

## 输入、来源与接口

确认真实项目根、根 `yss-project.yaml`、`CONTEXT.md`、metadata/schema、Profile、插件 binding、受管基线及 Git 状态。身份缺失或矛盾时停止，不能按目录猜测、删除 metadata 或重新 init。固定统一 CLI 版本、源码提交和二进制 SHA-256，核对 `yss bundle inspect --profile <Profile> --json` 中的协议、模板提交、Bundle、manifest 和快照摘要。旧 CLI 版本只记录历史基线，不能冒充统一 CLI 来源。

| 操作 | 原生接口与写入语义 |
|---|---|
| 新建 | `init --profile <Profile> --root <目标>` 默认直接初始化；审阅路线加 `--plan --out <新计划>`，再以 `--apply --plan-file <计划>` 应用 |
| 接管普通工程 | `attach --profile <Profile> --root <目标> --plan --out <新计划>`；默认预演，写入用 `--apply --plan-file <计划>` |
| 升级原生实例 | `sync --root <目标> --plan --out <新计划>`；默认预演，写入用 `--apply --plan-file <计划>` |
| 迁移未绑定旧实例 | `migrate plan --root <目标> --profile <Profile> --out <新计划>`；写入用 `migrate apply --root <目标> --plan-file <计划>` |
| 状态 | `migrate status --root <目标>` 只读 |
| 普通项目恢复与回退 | `recover --root <目标>`、`rollback --root <目标>` 默认只读检查；各加 `--apply` 才恢复未完成项目事务或回退最近成功项目事务 |
| 迁移恢复与回退 | `migrate recover --root <目标>` 是显式恢复写入子命令；`migrate rollback --root <目标>` 是最近成功迁移的显式回退写入子命令，不要求 `--apply` |
| 资源补装 | `assets ensure <stage>` / `skills ensure <skill>` 默认预演，保存计划后用 `--apply --plan-file <计划>` 写入 |

命令均可用 `--json` 消费 `outputVersion`、`protocolVersion`、`command`、`profile`、`status`、`code`、`result` 的版本化 envelope。成功须同时观察实际退出 0、`status=ok`、`code=OK`。计划、metadata、Bundle 和输出 envelope 各有自己的 schema，不把旧成功 JSON 当原生协议。

计划推荐保存到项目外全新普通文件；原生也允许专用 `.yss/plans/`。业务目录、Git 内部目录、链接别名及已有输出文件不能用作计划覆盖目标。目标模板来自固定二进制内的 Bundle；apply 不查询 `latest` 或执行计划提供的外部脚本。`bundle export --profile <Profile> --out <项目外新目录> --json` 可独立读取完整资产与 manifest。

## 插件绑定

后端交付插件绑定 `spec`，产品设计插件绑定 `design`。绑定旧实例使用对应插件 `project-migration-plan` / `project-migration-apply`；绑定原生实例更换二进制、模板或 Bundle 来源时，使用对应插件 `project-upgrade-plan` / `project-upgrade-apply`。插件通过公开原生保存计划把 `.yss.json`、受管基线和新 binding 纳入同一事务，旧 metadata 与历史插件记录原字节进入恢复材料。

直接 `yss sync` 更换来源而没有匹配的新 binding 返回 `BINDING_REQUIRED`；既有身份和 binding 已失配返回 `BINDING_CONFLICT`。不能手改绑定或 metadata 绕过拒绝。同一来源的治理资源补装仍可使用 `assets ensure` / `skills ensure`，其输入保护现有 binding 的字节和权限。

## 计划、冲突与保护

保存计划绑定命令、绝对项目根、Profile、协议、目标模板提交、快照摘要、变量、资源选择、binding、输入描述、变更前后字节及 mode 和整体摘要。应用使用相同固定二进制，重新核验输入并重建候选；手改计划或重算摘要不能替代合法规划，计划摘要也不授予权限。

原生 metadata 保存受管基线与已应用状态。符合基线的受管文件可更新；用户修改、未知基线或不能证明权限来源的旧受管文件进入冲突，不能自动覆盖。旧 metadata 在迁移事务中按原字节保留。唯一根 `CONTEXT.md`、业务资产、用户 `.github`、Git HEAD/index/gitlink、文件类型与权限按执行器既有保护规则保留。

预演可成功返回包含 `conflicts` 的计划；有冲突的 apply 返回 `CONFLICT`。`INPUT_DRIFT` 要求从当前现场重新规划，`BUNDLE` 要求恢复原计划的固定快照或重新规划。必要资源的 `UNPORTED` 阻断对应升级。负例验证必须检查准确错误码，不能把偶然输入漂移当作冲突、身份或恢复保护通过。

冲突处置先在项目外起草差异，说明保留和合并选择；新增语义决定取得真实用户回复后按授权处理，再从当前输入重新规划。原生不仿制旧 `--resolutions`、`--migrate-layout`、`--prune`、`--archive-dir` 等参数；未支持参数明确拒绝，布局重组、资产清理或人工合并另行形成可审阅范围。不得用 `--force`、reset、clean、stash 或删除状态绕过保护。

## 事务、恢复与回退

原生事务位于项目专用 `.yss/transactions/`，保存事务计划、持久日志、原字节及权限备份；回执给出 `transactionId`、状态和 `backupPath`。需要仓外长期恢复材料时，按归档清单保存固定二进制、Bundle、来源锁、插件包和完整事务材料，不能把旧执行器的默认外部归档路径写成原生行为。

输入、受管文件、metadata 与 binding 在互斥锁下作为同一事务处理。取消、失败及中断按持久状态恢复；准备阶段中断也从原生恢复入口检查与收敛。恢复前核验身份、范围、日志和备份，不删除损坏或未完成状态制造成功。旧未完成事务由下一节的对应固定旧执行器处理，不交由原生执行器猜测旧日志。

回退仅针对最近成功的适用事务；`migrate rollback` 要求最近成功事务为迁移，普通 `rollback --apply` 支持项目事务。恢复原件前先预检全部当前状态及备份；apply 后、首次 rollback 前的用户修改返回 `CONCURRENT` 并保持整个现场。备份损坏、身份或范围不符也阻断写入。成功回退后的重复回退保持幂等，不继续回退更早事务。回退不改变程序安装版本；程序升级使用独立工具根的 `update` 合同。

## 历史执行器边界

旧四 CLI 的固定 npm 包、完整源码 SHA、包摘要、模板快照、运行时和恢复说明由仓外恢复清单保留。历史版本长期可获取，不执行 unpublish。活跃构建、插件和分发不 require 旧 gitlink 私有模块。

发现旧 journal、lock 或未完成事务时，原生迁移以 `LEGACY_INTERRUPTED` 拒绝。先在隔离副本核验对应固定旧执行器能够独立取得和运行，按该版本自身的 `migrate status/recover/rollback`、预览与 `--apply` 规则完成恢复，再生成原生迁移计划。旧 `--target-dir`、`--output`、外部归档和决议协议只属于这些历史版本，不与上面的原生命令互换。

旧恢复、原生迁移、整体回退和恢复后的旧执行器维护均留真实公共入口日志与包、二进制摘要。不能用手造 metadata 或 synthetic CI fixture 替代历史实例验收。

## 验证与结论

迁移后核验身份、Profile、Context、受管基线、Skill 锁与投影、插件 binding 和适用实例治理；再按相同选项规划，确认没有重复变更。核对业务文件、无关 dirty/untracked 工作、Git index/HEAD/gitlink 和权限保护；原有失败与新增失败分别记录。

交付说明实际二进制和来源、计划/回执/备份位置、真实命令与退出码、恢复结果、冲突及未覆盖风险。升级成功不代表产品阶段批准或发行就绪。真实业务项目先在隔离副本验证，原地迁移另行安排；提交、推送、发布、npm 弃用与仓库归档按各自授权执行。
