# YSS 安装、初始化与升级维护协议

本协议定义 YSS Go CLI 安装与升级、四 Profile 治理工程新建与接管、同家族实例同步、旧四 CLI 显式迁移、资源补装及事务恢复回退。`yss-harness-upgrade` 负责分流、来源核验、冲突处置和授权范围；执行器负责保存计划、输入校验、受管基线和事务。历史批准及 Ticket 状态仍由各自权威协议管理。

## 程序来源与安装

默认查询固定官方仓库 `iloveZzz/yss-cli` 的 [最新正式 Release](https://github.com/iloveZzz/yss-cli/releases/latest)（API：`https://api.github.com/repos/iloveZzz/yss-cli/releases/latest`），排除草稿、预发布和未发布 main。每次任务重新查询，不把当前版本写成长期默认。用户明确指定版本或可信离线产物时消费该来源。查询后记录固定 tag/URL、校验清单、完整源码 SHA、平台、归档名、大小、归档及二进制 SHA-256、来源锁与实际发行资格；不把分支名或交叉编译当固定提交或平台验收。

程序安装不要求已有项目的身份与 Context。确认实际二进制绝对路径、入口链接和工具根；`version --json`、`update status --tool-root <工具根> --json`、安装收据、manifest、受管文件摘要及权限必须相符。旧版本缺安装诊断字段时逐项核验，不能将缺字段或版本查询成功当一致性通过。默认复用合法受管目录；首次安装采用用户级独立目录（Unix `~/.local/share/yss`，Windows `%LOCALAPPDATA%\yss`，展开绝对路径），不得覆盖未受管文件。工具根不能是 Git 仓库根或治理项目根。

| 程序操作 | 接口与写入语义 |
|---|---|
| 查询最新正式版 | `upgrade --check --json` 只查询，不下载程序包、不写入；以实际能力/帮助为准 |
| 在线升级 | `upgrade --to <查询得到的版本> --tool-root <工具根> --json` 显式写入；无 `plan/apply` 子命令 |
| 固定包安装/离线升级 | `update plan --tool-root <工具根> --artifact <本机包> --sha256 <包摘要> --out <工具根外新计划>`，再 `update apply --tool-root <工具根> --plan-file <计划>` |
| 状态/恢复/回退 | `update status` 只读；`update recover` / `update rollback` 本身写入，不要求 `--apply`；均显式指定工具根 |

没有 CLI 时在仓外新临时目录安全展开已校验发行包，拒绝越界、链接与非预期成员，核对包内 manifest 文件摘要和权限后使用引导二进制。旧 CLI 缺在线入口或不能读取新包合同，同样可使用固定新引导执行器；不能先复制裸二进制到工具根绕过安装事务。计划和应用使用同一固定执行器，核对范围与来源后在已有授权内执行。

在线 `--to` 固定版本，CLI 会重新查询该 tag 清单，并在一次执行内核验下载与包内来源；它没有预期摘要参数。需要严格绑定查询时已审阅的包摘要或保存计划时，采用下载固定产物后的 `update plan/apply`，不声称在线两次调用锁住同 tag 的原摘要。在线回执与先前来源记录不符时停止后续项目操作并保留程序事务证据；已下载固定包后出现更晚 Release 不改变本批次。已最新且受管来源一致时返回 `unchanged`，不重复下载或创建事务。

下载失败、限流、缺清单或摘要错误时停止相应来源分支，记录准确诊断；不静默换 npm、镜像、main 或预发布。缺合适平台包时，从选定 Release 的完整 SHA 在仓外干净检出，消费该提交的工具链、测试、CGO0 构建及打包入口，保留原四 Profile 固定来源锁；无法证明提交或构建失败则阻断。本地包及实际平台验证独立记录，保持打包的发行资格原值，不把交叉编译或本机安装标成官方稳定发行。

安装不一致时保留旧目录、链接、收据与事务；未完成程序事务先检查状态与材料后恢复，其他失配可安装到全新工具根，验证后再切换用户 PATH。未知入口不直接删除，系统级安装另按实际授权处理。程序事务只消费 `program-update`，回退最近成功安装且重复回退不跨越更早事务；用户后续字节或权限修改阻断覆盖。程序安装与项目迁移分别记录，程序安装成功后重新固定新二进制及 Bundle，再独立规划项目操作，不复用旧项目计划。

## 输入、来源与接口

项目操作确认真实项目根、metadata/schema、Profile、插件 binding、受管基线及 Git 状态。新建目标不存在或为空，无旧身份和 Context 是预期初始状态；普通工程接管需用户明确工程与 Profile，先检查已有 Context、业务资产及 Git。既有实例必须读取根 `yss-project.yaml` 和唯一 `CONTEXT.md`；身份缺失、矛盾或 schema 不支持时停止，不能按目录猜测、删除 metadata、重新 init 或 attach。模板源不是实例升级目标。固定统一 CLI 版本、源码提交和二进制 SHA-256，核对 `yss bundle inspect --profile <Profile> --json` 中的协议、模板提交、Bundle、manifest 和快照摘要。旧 CLI 版本只记录历史基线，不能冒充统一 CLI 来源。

| 操作 | 原生接口与写入语义 |
|---|---|
| 新建 | `init --profile <Profile> --root <目标>` 默认直接初始化；本技能使用 `--plan --out <新计划>`，再以 `--apply --plan-file <计划>` 应用 |
| 接管普通工程 | `attach --profile <Profile> --root <目标> --plan --out <新计划>`；默认预演，写入用 `--apply --plan-file <计划>` |
| 升级原生实例 | `sync --root <目标> --plan --out <新计划>`；默认预演，写入用 `--apply --plan-file <计划>` |
| 迁移未绑定旧实例 | `migrate plan --root <目标> --profile <Profile> --out <新计划>`；写入用 `migrate apply --root <目标> --plan-file <计划>` |
| 状态 | `migrate status --root <目标>` 只读 |
| 普通项目恢复与回退 | `recover --root <目标>`、`rollback --root <目标>` 默认只读检查；各加 `--apply` 才恢复未完成项目事务或回退最近成功项目事务 |
| 迁移恢复与回退 | `migrate recover --root <目标>` 是显式恢复写入子命令；`migrate rollback --root <目标>` 是最近成功迁移的显式回退写入子命令，不要求 `--apply` |
| 资源补装 | 先 `assets list` / `skills list` 选择当前 Profile 实际标识；`assets ensure <stage>` / `skills ensure <skill>` 默认预演，保存计划后用 `--apply --plan-file <计划>` 写入 |

命令均可用 `--json` 消费 `outputVersion`、`protocolVersion`、`command`、`profile`、`status`、`code`、`result` 的版本化 envelope。成功须同时观察实际退出 0、`status=ok`、`code=OK`。计划、metadata、Bundle 和输出 envelope 各有自己的 schema，不把旧成功 JSON 当原生协议。

本次升级接口采用计划 v2、metadata v3 和 Bundle v3；输出 envelope 和运行协议保持 v1。新执行器可识别历史 metadata 和事务材料；旧保存计划可读取诊断，应用返回 `PLAN_VERSION`，必须重新生成。旧 Bundle v1/v2 只提供已有分发来源，不授予删除或改名规则。

`attach` 先识别身份，再选择资源。无 metadata 的普通工程生成首次接管计划；原生实例返回 `SYNC_REQUIRED` 并给出 `sync` 命令，可识别旧实例返回 `MIGRATION_REQUIRED`。身份矛盾、未知 schema 或未完成事务须先诊断或恢复，不能以 `--full` 重新接管。

计划推荐保存到项目外全新普通文件；原生也允许专用 `.yss/plans/`。业务目录、Git 内部目录、链接别名及已有输出文件不能用作计划覆盖目标。目标模板来自固定二进制内的 Bundle，不另拉模板 main；项目 apply 不查询 `latest` 或执行计划提供的外部脚本。`bundle export --profile <Profile> --out <项目外新目录> --json` 可独立读取完整资产与 manifest。治理工程初始化及资源补装不授予产品阶段批准或生产脚手架权限，工程接入与生成仍消费相应生命周期合同。

## 插件绑定

后端交付插件绑定 `spec`，产品设计插件绑定 `design`。绑定旧实例使用对应插件 `project-migration-plan` / `project-migration-apply`；绑定原生实例更换二进制、模板或 Bundle 来源时，使用对应插件 `project-upgrade-plan` / `project-upgrade-apply`。插件通过公开原生保存计划把 `.yss.json`、受管基线和新 binding 纳入同一事务，旧 metadata 与历史插件记录原字节进入恢复材料。

直接 `yss sync` 更换来源而没有匹配的新 binding 返回 `BINDING_REQUIRED`；既有身份和 binding 已失配返回 `BINDING_CONFLICT`。不能手改绑定或 metadata 绕过拒绝。同一来源的治理资源补装仍可使用 `assets ensure` / `skills ensure`，其输入保护现有 binding 的字节和权限。

## 计划、冲突与保护

保存计划绑定命令、绝对项目根、Profile、协议、目标模板提交、快照摘要、变量、资源选择、binding、输入描述、变更前后字节及 mode 和整体摘要。应用使用相同固定二进制，重新核验输入并重建候选；手改计划或重算摘要不能替代合法规划，计划摘要也不授予权限。

metadata v3 按文件分别记录模板基线、实际应用描述、基线来源和有效保留决定。模板原字节与渲染后基线作为事务材料保存，复用对象去重；普通项目操作仍不得写入 `.yss`。历史基线先从核验过的事务归档读取，其次使用显式 `--base-bundle` 提供的完整旧 Bundle，原字节须匹配登记摘要。`bundle export` 的 `.yss-bundle.snapshot.json` 保存初始与完整变体。材料缺失时标记“基线不可用”，提供双向对照和人工候选，不推测、不联网下载。

selected 分发计算当前基础资源、已安装阶段、Skills 及所选运行时的依赖闭包，更新补装资源、投影和锁；legacy-all 保持既有宽分发。四 Profile 的固定分发政策以 `upgradePolicy` 声明资产类别和迁移规则；规则绑定完整旧模板提交、快照及稳定 ID，并纳入 Bundle 摘要。新增与更新进入计划，删除或改名仅在规则匹配、旧基线可信且未定制时自动规划。改名的目标写入与源删除属于同一事务；目标占用、路径别名或定制进入冲突。没有匹配规则的退役文件明确报告并保留。

`AGENTS.md`、`.gitignore` 等可定制入口未定制时更新，定制时生成三方候选；Skills、投影和治理脚本的固定来源修改进入冲突，不能接受破坏来源锁的任意合并。登记生成资产由生成器重建；Context、Tracker 和项目配置及用户资产保持原样，不兼容时给出单独诊断。既有 Spec、Plan、批准与业务证据不属于升级写范围。旧 metadata 在迁移事务中按原字节归档；Git HEAD/index/gitlink、dirty/untracked 业务工作和原权限受保护。

预演可成功返回包含 `conflicts` 的计划；有冲突的 apply 返回 `CONFLICT`。`INPUT_DRIFT` 要求从当前现场重新规划，`BUNDLE` 要求恢复原计划的固定快照或重新规划。必要资源的 `UNPORTED` 阻断对应升级。负例验证必须检查准确错误码，不能把偶然输入漂移当作冲突、身份或恢复保护通过。

`attach`、`sync` 和 `migrate plan` 共用 `--review-out <项目外新目录>`、`--base-bundle <路径>` 和 `--resolution-file <文件>`。审查包包含原计划、逐项冲突、基线和模板对照、三方候选及空决议模板。决议使用政策允许的 `keep-local`、`use-template` 或 `use-merged`；合并候选必须绑定原字节 SHA-256。干净三方候选也不能直接应用；重叠修改由人或 Agent 完成候选后提交决议。基线不可用时只提供双向对照，不生成假三方基线。

```sh
yss sync --root ./project --plan --out /review/plan.json --review-out /review/package
yss sync --root ./project --plan --plan-file /review/plan.json --resolution-file /review/decisions.json --out /review/resolved.json
yss sync --root ./project --apply --plan-file /review/resolved.json
```

决议绑定原计划摘要、路径、前后描述、迁移规则及改名目标，`use-merged` 还绑定候选摘要。输入变化使相应决议失效，候选篡改返回 `CANDIDATE_DRIFT`。应用重建完整计划，不能编辑后重签绕过。计划保留 `changes/conflicts/preserved` 摘要，增加 `assets`、`blockers`、`coverage` 和 `readyToApply`；范围内每项资产必须有处理结论。有效保留差异持续显示为例外，必需固定来源仍不兼容时保持阻断。

新增语义决定复用有效授权，缺真实决定才等待。原生不仿制旧 `--resolutions`、`--migrate-layout`、`--prune`、`--archive-dir`；布局重组和范围外资产清理另行安排。不得用 `--force`、reset、clean、stash 或删除状态绕过保护。

## 事务、恢复与回退

原生事务位于项目专用 `.yss/transactions/`，保存事务计划、持久日志、原字节及权限备份；回执给出 `transactionId`、状态和 `backupPath`。需要仓外长期恢复材料时，按归档清单保存固定二进制、Bundle、来源锁、插件包和完整事务材料，不能把旧执行器的默认外部归档路径写成原生行为。

输入、受管文件、metadata 与 binding 在互斥锁下作为同一事务处理。取消、失败及中断按持久状态恢复；准备阶段中断也从原生恢复入口检查与收敛。恢复前核验身份、范围、日志和备份，不删除损坏或未完成状态制造成功。旧未完成事务由下一节的对应固定旧执行器处理，不交由原生执行器猜测旧日志。

提交完成前运行原生校验，检查计划后置描述、身份、Profile、Context、资源闭包、来源锁、投影和插件 binding。校验失败使用同一事务整体还原，恢复受阻保留现场及证据；不自动执行项目业务测试或创建批准。回执的 `fileApplication` 与 `verification` 分别报告文件应用和验证结果。

回退仅针对最近成功的适用事务；`migrate rollback` 要求最近成功事务为迁移，普通 `rollback --apply` 支持项目事务。恢复原件前先预检全部当前状态及备份；apply 后、首次 rollback 前的用户修改返回 `CONCURRENT` 并保持整个现场。备份损坏、身份或范围不符也阻断写入。成功回退后的重复回退保持幂等，不继续回退更早事务。回退不改变程序安装版本；程序升级使用独立工具根的 `update` 合同。

## 历史执行器边界

旧四 CLI 的固定 npm 包、完整源码 SHA、包摘要、模板快照、运行时和恢复说明由仓外恢复清单保留。历史版本长期可获取，不执行 unpublish。活跃构建、插件和分发不 require 旧 gitlink 私有模块。

发现旧 journal、lock 或未完成事务时，原生迁移以 `LEGACY_INTERRUPTED` 拒绝。先在隔离副本核验对应固定旧执行器能够独立取得和运行，按该版本自身的 `migrate status/recover/rollback`、预览与 `--apply` 规则完成恢复，再生成原生迁移计划。旧 `--target-dir`、`--output`、外部归档和决议协议只属于这些历史版本，不与上面的原生命令互换。

旧恢复、原生迁移、整体回退和恢复后的旧执行器维护均留真实公共入口日志与包、二进制摘要。不能用手造 metadata 或 synthetic CI fixture 替代历史实例验收。

## 验证与结论

迁移后核验身份、Profile、Context、受管基线、Skill 锁与投影、插件 binding 和适用实例治理；再按相同选项规划，确认没有重复变更。核对业务文件、无关 dirty/untracked 工作、Git index/HEAD/gitlink 和权限保护；原有失败与新增失败分别记录。

交付说明实际二进制和来源、计划/回执/备份位置、真实命令与退出码、恢复结果、冲突及未覆盖风险。升级成功不代表产品阶段批准或发行就绪。真实业务项目先在隔离副本验证，原地迁移另行安排；提交、推送、发布、npm 弃用与仓库归档按各自授权执行。
