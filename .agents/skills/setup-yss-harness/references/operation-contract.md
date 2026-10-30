<!-- Generated from .template-spec/process/harness-upgrade.md by .template-source/scripts/sync-harness-upgrade.mjs; edit the source protocol. -->

# YSS 安装、初始化与升级维护协议

本协议定义 YSS Go CLI 安装与升级、Spec/Backend 的 skills/governed 安装、新建与接管、同步、安装方式转换、旧统一实例治理迁移、资源补装及事务恢复回退。`setup-yss-harness` 负责分流、来源核验、冲突处置和授权范围；执行器负责保存计划、输入校验、受管基线和事务。历史批准及 Ticket 状态仍由各自权威协议管理。

## Setup 目标与环境分流

用户指定工程并要求 `setup` 时，`setup-yss-harness` 在有效授权内完成 CLI 就绪与受管模板对齐所选固定版本；用户仅要求程序安装或升级时执行程序分支。程序和项目分别取证、规划、应用及验收，不逐步重复确认已有决定。新建或接管的用途、Profile 或实质取舍缺失时先调查，再补决定。

已有合法身份沿用登记 Profile 和安装方式；没有身份时按用途选择 `spec/backend` 与 `skills/governed`，不按目录名猜。新建和接管默认 governed；仅安装独立技能时显式选择 skills，不要求治理身份、Context、Ticket 或 checkpoint。治理安装不授予阶段批准。`--full` 不切换安装方式。metadata4/5 原生实例 sync 保持原方式，明确转换时用 `migrate --installation skills|governed`；不传 installation 的 migrate 保留 metadata3/identity1/policy1 旧治理迁移语义。

仅旧 npm 家族 metadata、Design、Frontend、旧 dev 和退役插件仍不提供当前迁移。普通工程 attach，空目标 init；模板源、矛盾身份、既有实例缺其安装方式必需身份或未知 schema 时只诊断。插件 binding 先核验公开接口对实际代际的支持。仅检查或评估时保持只读，不准备下载、安装、同步、补装或恢复写入。

可定制资产的政策允许处置能保留本地定制且不引入新业务决定时，Agent 可形成候选及绑定决议，再重新规划和验证；干净合并也需合法决议。无法证明保留定制、存在实质取舍或新增业务决定时展示差异并询问。固定来源资产、生成锁、身份与 binding 仍遵守下文各自规则。

程序已经成功而项目失败时保留已验证 CLI；项目事务恢复自身，分别报告安装、项目和恢复结果。整体 setup 仅在全部适用操作与验收通过时完成，部分成功报告未完成。

技能支持用户级独立安装，其必需说明和协议参考由 canonical 来源生成并随包携带。协议的可安装参考由 `.template-source/scripts/sync-harness-upgrade.mjs` 从本文件生成；生成副本不成为新事实源。项目分发和独立包使用同一技能身份。源码更名不改变已发布 Bundle，读取旧 Bundle 时以实际能力与标识为准；历史包和既有实例按明确升级或迁移更新。

## 程序来源与安装

默认查询固定官方仓库 `iloveZzz/yss-cli` 的 [最新正式 Release](https://github.com/iloveZzz/yss-cli/releases/latest)（API：`https://api.github.com/repos/iloveZzz/yss-cli/releases/latest`），排除草稿、预发布和未发布 main。每次任务重新查询，不把当前版本写成长期默认。用户明确指定版本或可信离线产物时消费该来源。查询后记录固定 tag/URL、校验清单、完整源码 SHA、平台、归档名、大小、归档及二进制 SHA-256、来源锁与实际发行资格；不把分支名或交叉编译当固定提交或平台验收。

技能随包 `scripts/bootstrap.py` 使用 Python 3.11+ 标准库：`inspect` 只读检查平台与 PATH 候选，不执行候选或证明其可信；`prepare --work-dir <仓外全新绝对目录> [--version <具体版本>]` 查询并固定一次 Release，核验后提供执行器和归档，不安装、不改 PATH、不操作项目。成功需退出 0、JSON `status=ok`，消费 result 中的 executor、archive、archiveSha256、version、cliCommit、platform、releaseUrl；失败消费 stage/code/message 和非零退出。缺 Python 时报告缺口，不自动安装；可信离线包仍按下文合同处理。

程序安装不要求已有项目的身份与 Context。确认实际二进制绝对路径、入口链接和工具根；`version --json`、`update status --tool-root <工具根> --json`、安装收据、manifest、受管文件摘要及权限必须相符。旧版本缺安装诊断字段时逐项核验，不能将缺字段或版本查询成功当一致性通过。默认复用合法受管目录；首次安装采用用户级独立目录（Unix `~/.local/share/yss`，Windows `%LOCALAPPDATA%\yss`，展开绝对路径），不得覆盖未受管文件。工具根不能是 Git 仓库根或治理项目根。

| 程序操作 | 接口与写入语义 |
|---|---|
| 查询最新正式版 | `upgrade --check --json` 只查询，不下载程序包、不写入；以实际能力/帮助为准 |
| 在线升级 | `upgrade --to <查询得到的版本> --tool-root <工具根> --json` 显式写入；无 `plan/apply` 子命令 |
| 固定包安装/离线升级 | `update plan --tool-root <工具根> --artifact <本机包> --sha256 <包摘要> --out <工具根外新计划>`，再 `update apply --tool-root <工具根> --plan-file <计划>` |
| 状态/恢复/回退 | `update status` 只读；`update recover` / `update rollback` 本身写入，不要求 `--apply`；均显式指定工具根 |

没有 CLI 时在仓外新临时目录安全展开已校验发行包，拒绝越界、链接与非预期成员，核对包内 manifest 文件摘要和权限后使用引导二进制。旧 CLI 缺在线入口或不能读取新包合同，同样可使用固定新引导执行器；不能先复制裸二进制到工具根绕过安装事务。计划和应用使用同一固定执行器，核对范围与来源后在已有授权内执行。

在线 `--to` 固定版本，CLI 会重新查询该 tag 清单，并在一次执行内核验下载与包内来源；它没有预期摘要参数。需要严格绑定查询时已审阅的包摘要或保存计划时，采用下载固定产物后的 `update plan/apply`，不声称在线两次调用锁住同 tag 的原摘要。在线回执与先前来源记录不符时停止后续项目操作并保留程序事务证据；已下载固定包后出现更晚 Release 不改变本批次。已最新且受管来源一致时返回 `unchanged`，不重复下载或创建事务。

下载失败、限流、缺清单或摘要错误时停止相应来源分支，记录失败环节、可用 HTTP 状态和准确诊断，错误页不作清单。检查系统既有代理与执行器环境是否一致，可在单次命令中复用已有设置，不修改持久配置或输出凭据；保持官方来源和已固定 tag/摘要。不得静默换 npm、镜像、main 或预发布。缺合适平台包时，从选定 Release 的完整 SHA 在仓外干净检出，消费该提交的工具链、验证、CGO0 构建及打包入口，保留固定来源锁；无法证明提交或构建失败则阻断。本地包及平台验证独立记录，保持发行资格原值。

按实际 Release 资产及稳定/仅构建清单识别可安装包、构建包、缺包和来源异常；`supportedPlatforms` 不证明存在安装包。`stableReady=false` 或 `nativeRuntimeVerified=false` 不具备稳定在线升级资格，不能用离线入口绕过或伪报本机构建资格。macOS 实际事务 `objects/<摘要>` 恢复对象与目标临时文件须在同一支持原子克隆的文件系统（通常 APFS）；下载归档位置不是此条件的判据。核对工具根内挂载边界，跨卷或不支持时保留 `UNPORTED`，不降级为覆盖复制。安装后按实际二进制 Profile 清单核验，当前新实例仅 Spec、Backend。

安装不一致时保留旧目录、链接、收据与事务；未完成程序事务先检查状态与材料后恢复，其他失配可安装到全新工具根，验证后再切换用户 PATH。未知入口不直接删除，系统级安装另按实际授权处理。程序事务只消费 `program-update`，回退最近成功安装且重复回退不跨越更早事务；用户后续字节或权限修改阻断覆盖。程序安装与项目迁移分别记录，程序安装成功后重新固定新二进制及 Bundle，再独立规划项目操作，不复用旧项目计划。

## 输入、来源与接口

项目操作确认真实根、metadata/schema、Profile、installation、binding、受管基线及 Git 状态。支持时先 `project inspect --root <根> --json`，消费 identityState、installation、transactionState 与 notices；退出 0 不证明身份合法，absent 不代替 init/attach 保护，invalid/unsupported/pending/blocked 先诊断。缺能力时读取原始身份和事务材料。

新建目标不存在或为空；普通工程接管先检查已有 Context、业务资产及 Git。只有 governed 既有实例要求根 `yss-project.yaml` 与唯一 `CONTEXT.md`，skills 不补造治理资产。必需身份缺失、矛盾或不支持时停止，不删 metadata 或重新 init/attach。模板源不是升级目标。固定 CLI 版本、源码提交、二进制摘要，用 `bundle inspect --profile <Profile> --json` 核对来源；旧 CLI 版本仅记录历史基线。

| 操作 | 原生接口与写入语义 |
|---|---|
| 新建 | `init --profile <Profile> --installation <方式> --root <目标>` 默认直接初始化；本技能使用保存计划，支持时加 `--bind-cli` |
| 接管普通工程 | `attach --profile <Profile> --installation <方式> --root <目标> --plan --out <新计划>`；支持时加 `--bind-cli`，写入消费原计划 |
| 升级原生实例 | `sync --root <目标> --plan --out <新计划>`；默认预演，写入用 `--apply --plan-file <计划>` |
| 安装方式转换 | metadata4/5 使用 `migrate --installation skills\|governed --root <目标> --plan --out <新计划>`；应用仅消费保存计划 |
| 治理迁移 | `migrate --root <旧统一实例> --profile <Profile> --plan --out <新计划>`；写入用 `migrate --root <目标> --profile <Profile> --apply --plan-file <计划>` |
| 项目状态 | `recover --root <目标>` 或 `rollback --root <目标>` 不带 `--apply` 时只读 |
| 实际产物核查 | `project verify --plan-file <原计划> --json`；只读，消费 outcome、missing、mismatched 与 notices |
| 普通项目恢复与回退 | `recover --root <目标>`、`rollback --root <目标>` 默认只读检查；各加 `--apply` 才恢复未完成项目事务或回退最近成功项目事务 |
| 治理迁移恢复 | 未完成迁移使用 `recover --root <目标> --apply`；已完成迁移不支持降级，返回 `DOWNGRADE_UNSUPPORTED` |
| 资源补装 | 先 `assets list` / `skills list` 选择当前 Profile 实际标识；`assets ensure <stage>` / `skills ensure <skill>` 默认预演，保存计划后用 `--apply --plan-file <计划>` 写入 |

命令均可用 `--json` 消费 `outputVersion`、`protocolVersion`、`command`、`profile`、`status`、`code`、`result` 的版本化 envelope。成功须同时观察实际退出 0、`status=ok`、`code=OK`。计划、metadata、Bundle 和输出 envelope 各有自己的 schema，不把旧成功 JSON 当原生协议。

当前 Bundle5/metadata5 的普通项目保存计划为 v4；显式绑定 CLI 的 init/attach 计划为 v5。governed 使用 identity2/Profile3/governance2，输出 envelope 和运行协议保持 v1。历史 Bundle4/metadata4 是治理安装。程序、Tracker、普通项目与绑定计划分别识别；跨执行器或代际按实际 PLAN_VERSION、PLAN、BUNDLE 或漂移诊断重新规划，不编辑重签。

安装方式转换只接受 metadata4/5；活动或无法核验的正式工作返回 `MIGRATION_ACTIVE_TASK`/`MIGRATION_INPUT`，同方式返回 `INSTALLATION_UNCHANGED`，工作资产漂移要求重新规划。原任务、批准、checkpoint 和用户文件保留。metadata3/identity1/policy1 先按原治理 migrate 处理；直接 sync 返回 `GOVERNANCE_MIGRATION_REQUIRED`，不支持的代际保留 `MIGRATION_UNSUPPORTED` 或实际身份错误。历史批准不授予新资格；治理语义变化须由已有授权覆盖。

`--bind-cli` 仅用于 init/attach 的 `--plan --out`；保存 `kind=installation-plan/schemaVersion=5` 的原文件和 digest，核对 CLI 版本/提交/文件 SHA、完整 Bundle、模板提交及快照。应用使用同一执行器并传 `--expected-digest <原摘要>`；缺摘要为 `PLAN_REQUIRED`，不匹配为 `INPUT_DRIFT`。回执 planDigest 是内部事务摘要，不替换原计划 digest。普通 v4 计划仍按原合同消费；旧执行器缺绑定能力时核验来源，不伪造新计划。apply 不另加 installation 改写选择。

`attach` 先识别身份，再选择资源。无 metadata 的普通工程生成首次接管计划；原生实例返回 `SYNC_REQUIRED` 并给出 `sync` 命令，可识别旧实例返回 `MIGRATION_REQUIRED`。身份矛盾、未知 schema 或未完成事务须先诊断或恢复，不能以 `--full` 重新接管。

计划推荐保存到项目外全新普通文件；原生也允许专用 `.yss/plans/`。业务目录、Git 内部目录、链接别名及已有输出文件不能用作计划覆盖目标。目标模板来自固定二进制内的 Bundle，不另拉模板 main；项目 apply 不查询 `latest` 或执行计划提供的外部脚本。`bundle export --profile <Profile> --out <项目外新目录> --json` 可独立读取完整资产与 manifest。治理工程初始化及资源补装不授予产品阶段批准或生产脚手架权限，工程接入与生成仍消费相应生命周期合同。

## 插件绑定

当前后端交付插件绑定 `spec`，退役产品设计插件不是当前入口。先核验该插件公开接口与当前代际相容；绑定原生实例更换二进制、模板或 Bundle 来源时使用 `project-upgrade-plan` / `project-upgrade-apply`，治理迁移只在插件明确支持时使用对应迁移接口，无法证明则停止该分支。插件通过公开原生保存计划把 `.yss.json`、受管基线和新 binding 纳入同一事务，旧 metadata 与历史插件记录原字节进入恢复材料。

直接 `yss sync` 更换来源而没有匹配的新 binding 返回 `BINDING_REQUIRED`；既有身份和 binding 已失配返回 `BINDING_CONFLICT`。不能手改绑定或 metadata 绕过拒绝。同一来源的治理资源补装仍可使用 `assets ensure` / `skills ensure`，其输入保护现有 binding 的字节和权限。

## 计划、冲突与保护

保存计划绑定命令、绝对项目根、Profile、协议、目标模板提交、快照摘要、变量、资源选择、binding、输入描述、变更前后字节及 mode 和整体摘要。应用使用相同固定二进制，重新核验输入并重建候选；手改计划或重算摘要不能替代合法规划，计划摘要也不授予权限。

metadata4/5 按文件记录模板基线、实际应用描述、基线来源和有效保留决定。模板原字节与渲染基线作为事务材料保存，复用对象去重；Agent 不手写 `.yss` 状态。历史基线先读已核验事务归档，再用显式 `--base-bundle` 的完整旧 Bundle，原字节须匹配摘要。导出快照保存初始与完整变体；材料缺失时标记“基线不可用”，仅提供双向对照和人工候选，不推测、不联网下载。

同步保留安装方式；skills 计算技能闭包，governed 按 selected/既有分发语义计算基础资源、已安装阶段和技能。运行时投影按实例登记处理。`upgradePolicy` 迁移规则按精确旧提交/快照或登记模板版本区间匹配，未知版本消费 notices，不猜匹配。删除、改名仅在规则匹配、旧基线可信且未定制时自动规划；改名的目标写入与源删除同事务，目标占用、路径别名或定制进入冲突。无规则的退役文件保留。审阅删除项的 resolutionOptions，允许时用 keep-local 拒绝删除并保留为稳定例外。

补装先按实际 Profile/安装方式列出资源；skills 不用 assets ensure 启用治理。技能 resolve 消费 result.status，missing 仅补规范缺失集合，blocked 先诊断。省略 agent-runtime 仅核验 canonical，显式 runtime 才检查对应已登记投影；未登记 runtime 和旧目录迁移需显式 sync，ensure 不代替。文件就绪、投影与宿主发现分别报告，宿主无可靠接口记 unknown；普通技能发现不强制先做治理 route 或 resolve。

`AGENTS.md`、`.gitignore` 等可定制入口未定制时更新，定制时生成三方候选；Skills、投影和治理脚本的固定来源修改进入冲突，不能接受破坏来源锁的任意合并。登记生成资产由生成器重建；Context、Tracker 和项目配置及用户资产保持原样，不兼容时给出单独诊断。既有 Spec、Plan、批准与业务证据不属于升级写范围。旧 metadata 在迁移事务中按原字节归档；Git HEAD/index/gitlink、dirty/untracked 业务工作和原权限受保护。

预演可成功返回包含 `conflicts` 的计划；有冲突的 apply 返回 `CONFLICT`。`INPUT_DRIFT` 要求从当前现场重新规划，`BUNDLE` 要求恢复原计划的固定快照或重新规划。必要资源的 `UNPORTED` 阻断对应升级。负例验证必须检查准确错误码，不能把偶然输入漂移当作冲突、身份或恢复保护通过。

`attach`、`sync` 和 `migrate --plan` 共用 `--review-out <项目外新目录>`、`--base-bundle <路径>` 和 `--resolution-file <文件>`。审查包包含原计划、逐项冲突、基线和模板对照、三方候选及空决议模板。决议使用政策允许的 `keep-local`、`use-template` 或 `use-merged`；合并候选必须绑定原字节 SHA-256。干净三方候选也不能直接应用；重叠修改由人或 Agent 完成候选后提交决议。基线不可用时只提供双向对照，不生成假三方基线。

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

提交完成前运行原生校验，检查计划后置描述、身份、Profile、安装方式、资源闭包、来源锁、投影及 binding；仅 governed 要求治理 Context。校验失败按同一事务整体还原，恢复受阻保留现场；不自动运行业务测试或创建批准。回执 fileApplication 与 verification 分别报告文件应用和校验。

支持时应用后用原计划 project verify 核查，只有 outcome=complete 表示该计划产物完成；not-applied/incomplete/unknown 分别保留，退出 0 不等于完成。取消、异常或 CANCELLED 后同样核查实际文件与事务状态，不推定零写入、自动回滚或直接重跑 apply。核查不删除用户后加文件，不授予恢复写入资格。

当前没有 `migrate status/recover/rollback` 子命令。项目状态以不带 `--apply` 的 `recover/rollback` 查询，写入使用相应 `--apply`。未完成治理迁移可 `recover --apply`；已完成治理迁移不支持降级并返回 `DOWNGRADE_UNSUPPORTED`。普通项目回退仅针对最近成功的适用事务。恢复原件前先预检全部当前状态及备份；apply 后、首次 rollback 前的用户修改返回 `CONCURRENT` 并保持整个现场。备份损坏、身份或范围不符也阻断写入。成功回退后的重复回退保持幂等，不继续回退更早事务。回退不改变程序安装版本；程序升级使用独立工具根的 `update` 合同。

## 历史执行器边界

历史旧 CLI 的固定 npm 包、完整源码 SHA、包摘要、模板快照、运行时和恢复说明由仓外恢复清单保留。历史版本长期可获取，不执行 unpublish。活跃构建、插件和分发不 require 旧 gitlink 私有模块。

发现历史 journal、lock 或未完成事务时，先保留现场并读取准确诊断。历史事务只能在隔离副本核验匹配的仓外固定旧执行器后，按该版本自身帮助和写入规则恢复。历史恢复成功不说明当前 CLI 支持该身份迁移；仅旧家族 metadata 的实例仍不提供迁移。旧 `--target-dir`、`--output`、外部归档和决议协议只属于这些历史版本，不与上面的原生命令互换。

旧恢复、原生迁移、整体回退和恢复后的旧执行器维护均留真实公共入口日志与包、二进制摘要。不能用手造 metadata 或 synthetic CI fixture 替代历史实例验收。

## 验证与结论

操作后核验身份、Profile、安装方式、受管基线、Skill 锁/适用投影及 binding；仅 governed 检查 Context 和治理。同步、补装同选项重规划应无重复变更，迁移后按新身份运行 doctor/diff 与只读 sync 计划。doctor 的文件对齐、技能就绪、workflow 结论分开；not-evaluated/unknown 不算工作流或宿主通过。核对业务文件、dirty/untracked、Git index/HEAD/gitlink 和权限；原有失败与新增失败分别记录。

交付说明实际二进制和来源、计划/回执/备份位置、真实命令与退出码、恢复结果、冲突及未覆盖风险。升级成功不代表产品阶段批准或发行就绪。真实业务项目先在隔离副本验证，原地迁移另行安排；提交、推送、发布、npm 弃用与仓库归档按各自授权执行。
