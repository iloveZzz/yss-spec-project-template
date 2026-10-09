# 统一 CLI 操作说明

四个 Profile 使用同一固定 `yss` 二进制。`spec` 是综合研发主控，`design` 是产品与业务设计，`backend` 和 `frontend` 是专职交付。三个 Agent 模板源继续维护，退役范围仅限四个旧生成器。

## 安装与来源核验

使用 `setup-yss-harness` 作为安装与维护入口，规则见 [统一协议](../process/harness-upgrade.md)。默认从 [官方最新正式 Release](https://github.com/iloveZzz/yss-cli/releases/latest) 取得本机平台产物及 `checksums.json`，排除草稿、预发布和未发布 main；不把当前版本写成长期默认。查询后固定 tag、完整源码 SHA、平台、归档大小及 SHA-256，核对包内 manifest、来源锁和平台发行资格。程序安装无需已有项目身份。

`setup` 指定工程时，在有效授权内将 CLI 与受管模板对齐所选固定版本：空目录初始化，普通工程接管，原生实例同步，旧实例迁移，插件绑定走插件公开接口。Profile 沿用合法身份；没有身份时按用途推荐，不能从框架或目录名猜测。程序与项目分别验收；CLI 已成功但项目失败时保留已验证程序、恢复项目自身，并报告整体未完成。

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

`--to` 固定版本，在线命令会重新读取该 tag 清单；需要严格绑定已审阅摘要或保存计划时使用下载后的 `update plan/apply`。在线回执与记录失配时停止后续项目操作。已最新且安装来源一致时返回 `unchanged`；查询结果本身不能证明安装一致。网络失败、限流或校验错误须明确诊断，不能静默换来源。缺平台包时从该 Release 完整 SHA 隔离构建、测试及打包，保持四 Profile 固定来源锁，并单独记录本机构建与验证范围，不将其标成官方发行资格。

安装后运行固定路径的 `yss version --json` 与各 Profile 的 `bundle inspect`，核对 CLI、协议、模板提交及 Bundle/manifest 摘要。程序升级结束后重新固定二进制，再独立规划项目同步；旧 CLI 版本仅表示历史迁移基线。

模板验证显式设置 `YSS_NATIVE_BINARY=/absolute/path/yss` 和 `YSS_NATIVE_BINARY_SHA256=<sha256>`。固定源构建另设置 `YSS_NATIVE_SOURCE_ROOT=/absolute/path/yss-cli`。脚本不从 PATH 猜版本，不自动调用旧 gitlink，也不修改全局安装。

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

## 日常交付能力

支持日常能力的 Spec CLI 提供两个只读接口：

```bash
yss lifecycle route --profile spec --root /absolute/path/spec --task docs/task.md --implementation-root /absolute/path/implementation --base <40位完整SHA> --json
yss lifecycle verify-daily --profile spec --root /absolute/path/spec --task docs/task.md --implementation-root /absolute/path/implementation --base <40位完整SHA> --json
```

第一项返回 `daily / governed / needs-info`、原因和必要检查；第二项核验当前差异、测试、独立审查与适用 API 证据。事实与实际证据保存在同一 Markdown Ticket/PR 的证据区，不生成阶段 checkpoint、批准或 `ready-for-agent`。策略只由生命周期编排合同 `request_triage.delivery_path` 定义；格式见生命周期 `references/daily-delivery.md`。旧 CLI、其他 Profile 或缺政策时返回不支持，不能套用正式校验器的豁免开关。正式任务不可降级；无关正式资产不阻断新的日常任务。

## 正式功能的可续推目标

本节用于已登记 checkpoint 的正式功能。支持新政策的完整 Spec 默认推进到 `business-accepted`；短目标到达后停止下游写入，扩展目标后复验续推。五个目标的完成规则消费[推进目标协议](../process/lifecycle-progression.md)及本地主控合同；操作指引按[本地用户手册索引](用户手册索引.md)进入本端说明。日常任务仍按前节的 `daily` 政策执行。

### 1. 核对能力和当前功能

```bash
yss version --json
yss capabilities --json
yss bundle inspect --profile spec --json
yss lifecycle target --help
```

程序能力清单应包含 `lifecycle-target-v1`，实例主控合同也须包含受支持的 `progression_target` 政策。帮助可以离线阅读，但不能证明实例能力或批准已经就绪。旧程序需取得支持能力的固定版本；旧原生实例另外审阅并应用 `sync` 计划，具体操作见[升级与回退](#升级与回退)。未发布开发候选和本机旧 `1.3.2` 不能仅凭版本号视为新策略已可用，来源和能力须实际核对。

从当前 checkpoint 读取 `feature_id`，核对 Tracker 的 `tracker.root` 和唯一 `map.md` 中的 `checkpoint_ref`。示例假设实际登记为 `feature.example` 和 `.work/example/checkpoint.json`，必须替换成当前值；checkpoint 可以使用实例当前合法扩展名，不能凭目录名新造功能身份。

```bash
yss lifecycle target --root /absolute/path/spec --checkpoint .work/example/checkpoint.json --json
```

该查询只读核验已有意图与当前证据；没有意图文件时读取政策默认目标，不补写历史配置。

### 2. 保存目标输入并规划

本地继续使用 `consumers: []`。把以下 JSON 保存到当前功能包已有临时目录中的 `target-input.json`。同一 Git 根同时承载治理与实现时，先核对临时目录已被项目现有规则忽略，避免输入草稿成为源码候选变化；工具不会自动新增忽略规则。

```json
{
  "schema_version": 1,
  "kind": "lifecycle-progression-target",
  "feature_id": "feature.example",
  "checkpoint_ref": ".work/example/checkpoint.json",
  "target": "spec-approved",
  "intent_source": "用户本次指令：先完成 Spec 批准",
  "consumers": []
}
```

```bash
yss lifecycle target --root /absolute/path/spec --checkpoint .work/example/checkpoint.json --input .work/example/tmp/target-input.json --plan --out /absolute/path/target-plan.json --json
```

目标只能填写 `spec-approved`、`product-design-completed`、`backend-deliverable`、`frontend-accepted` 或 `business-accepted`。`intent_source` 保存原始用户指令来源，不填自报批准或完成状态。`plan-to-backend` 的永久职责只允许前三项；专职 Profile 的只读 `profile-terminal` 不能写入此 JSON。

保存计划放在治理工程外的新路径，保留输入草稿直到 apply 完成。核对计划中的功能、输入摘要、目标和实际写入范围；设置目标不更改阶段、批准、冻结合同、交接包或 Receipt。

### 3. 应用目标，再读取当前完成依据

```bash
yss lifecycle target --root /absolute/path/spec --apply --plan-file /absolute/path/target-plan.json --json
yss lifecycle status --root /absolute/path/spec --checkpoint .work/example/checkpoint.json --json
```

apply 重新编译并核验原输入，拒绝输入漂移和篡改计划；成功计划可幂等重试。事务只写功能包 `progression-target.json` 及必要事务材料，目标文件不进入批准或交接证据闭包。apply 退出 0 只表示目标配置成功；实际工作仍由生命周期技能核验准入后推进。

成功 envelope 的 `result` 中：

| 字段 | 读法 |
|---|---|
| `progression.target`、`target_source`、`intent_source` | 本次目标及默认／显式来源 |
| `progression.status`、`reached`、`reason` | 当前证据核验结论及原因；`pending` 为待核验，`blocked` 为阻塞，`not-applicable` 必须有有效依据 |
| `progression.completion.milestone`、`.profile`、`.business` | 分别查看本次目标、本端职责和整体业务；不能用短目标达到替代整体业务完成 |
| `coordination` | 显式绑定消费者的 checkpoint、当前输入、交付和版本依据 |
| `next_action` | 承接 Profile、治理根、工作单元及继续／等待／复验／目标已达原因 |

只读查询消费当前证据，不启动实现、构建、回归或批准。目标已达时 `next_action.kind` 为 `target-reached`，仍保留 checkpoint 的真实 `next_work_unit`；这时 Agent 停止派发下游写任务。

### 4. 从 Spec 继续设计，再继续业务交付

同一功能后续要完成设计时，保留 `feature_id`、`checkpoint_ref` 和消费者绑定，将原输入中的 `target` 改为 `product-design-completed`，`intent_source` 改为新的原始用户指令。重新运行第 2、3 步，使用新的仓外计划路径。再由 `yss-product-lifecycle` 复验现有批准，完成适用设计和业务 Ticket 正式化。

要继续整个功能时，同样把目标改为 `business-accepted`，重新规划、应用并复验。有效批准和稳定 Ticket ID 沿用原记录；真实资产或批准依据变化仍按现行规则使受影响证据失效。CLI 没有执行生命周期的推进引擎，修改目标不会自动写实现代码。业务验收完成后，提交、推送、合并与发布继续按各自实际授权处理。

### 5. 需要独立专职消费者时

默认本地主线直接消费批准资产，代码写入已登记实现仓，不创建另外三个治理工程或自导自入。用户明确选择独立工程时，在同一输入中替换 `consumers`，例如：

```json
"consumers": [
  {"profile": "design", "root": "/absolute/path/design", "checkpoint_ref": ".work/example/checkpoint.json"},
  {"profile": "backend", "root": "/absolute/path/backend", "checkpoint_ref": ".work/example/checkpoint.json"},
  {"profile": "frontend", "root": "/absolute/path/frontend", "checkpoint_ref": ".work/example/checkpoint.json"}
]
```

此处展示 JSON 对象的成员片段，需放回完整输入；每个 checkpoint 使用接收方实际登记，属于同一 `feature_id`，每种 Profile 最多一项。尚未创建的消费者可先登记明确意图，但在身份、checkpoint、Receipt 和 Context 对账核验前保持待核验。一个工程有多个功能时只汇总这里显式绑定的记录，不从相邻目录或完成标签猜消费者。

设置消费者不导出、导入或批准资产。Spec → Design 通过原生 SpecBaseline 导出、导入和 Receipt 核验继续设计；独立 Backend／Frontend 接收同一冻结战略基线，前端再接收适用当前后端交付。操作见 `yss handoff export --help`、`yss handoff import --help`、`yss handoff verify --help` ；交接步骤按[本地用户手册索引](用户手册索引.md)进入本端说明。版本失配、过期 Receipt、Context 冲突或缺适用证据不能汇总为业务完成。

### 6. 失败、恢复与回退

| 现象 | 下一动作 |
|---|---|
| 缺能力／旧政策 | 核对固定程序及 Bundle；取得支持版本后另行审阅实例同步计划，不手补政策 |
| 身份、功能绑定或职责不符 | 重新核对当前登记和授权范围，不能通过改目标扩大职责 |
| 输入漂移／计划失配 | 保留现场，核对原输入，重新规划；不编辑保存计划绕过核验 |
| 配置已应用，但目标仍待核验 | 按 `reason` 与 `next_action` 补齐当前合法工作单元的证据 |
| Context、版本或 Receipt 冲突 | 在对应来源或接收方解决冲突，再核验当前记录与主控汇总 |

目标事务使用现有项目恢复入口；没有独立的 `lifecycle target recover` 或 `rollback` 子命令。先只读检查，确认实际事务和已有恢复授权后再显式应用：

```bash
yss recover --root /absolute/path/spec --json
yss recover --root /absolute/path/spec --apply --json
yss rollback --root /absolute/path/spec --json
yss rollback --root /absolute/path/spec --apply --json
```

`rollback` 处理最近成功项目事务；不要用它随意选择历史目标。只想继续或改终点时，正常重新规划目标即可；恢复冲突按原事务保护处理，不能覆盖后续用户修改。

## 升级与回退

`sync` 和 `migrate plan` 默认预演；`--apply --plan-file` 绑定保存计划与当前输入。旧 metadata 保留原字节，迁入 `.yss.json` 的身份、受管基线及插件 binding 进入同一事务。先用 `migrate status` 检查状态；旧未完成事务必须先由对应仓外固定旧执行器恢复，不能删状态目录。

已绑定后端交付或产品设计插件的项目，使用对应插件 `project-migration-plan` / `project-migration-apply` 迁移旧身份，使用 `project-upgrade-plan` / `project-upgrade-apply` 升级原生来源。插件把身份与 binding 纳入同一事务。直接 `yss sync` 更换来源而缺少新 binding 返回 `BINDING_REQUIRED`；既有身份与 binding 已失配返回 `BINDING_CONFLICT`。同一来源的 `assets ensure` / `skills ensure` 仍可按保存计划补装，输入保护既有 binding 原字节和权限。

普通 `yss recover --root <目标> --json` 和 `yss rollback --root <目标> --json` 只读检查；各加 `--apply` 才恢复未完成项目事务或整体回退最近成功项目事务。`yss migrate recover --root <目标> --json` 是显式恢复写入子命令，`yss migrate rollback --root <目标> --json` 是最近成功迁移的显式回退写入子命令，两者不要求 `--apply`。只在已有恢复授权范围内执行写入，后续用户修改导致 `CONCURRENT` 时拒绝覆盖并保留现场。成功回退后的重复回退保持幂等，不继续回退更早事务。程序安装与升级使用独立工具根的 `upgrade/update`，不顺带迁移项目。

程序只读状态用 `yss update status --tool-root <工具根> --json`；程序 `update recover` / `update rollback` 本身写入，不加 `--apply`，只处理程序安装事务。项目回退不改变程序版本，程序回退也不恢复项目。

成功须同时观察退出 0、`status=ok`、`code=OK`。错误报告保留版本化 envelope；必要能力的 `UNPORTED`、输入漂移或缺失证据阻断相应切换批次。

## Bundle 与历史恢复

`yss bundle export --profile <Profile> --out <项目外新目录> --json` 导出完整资产与 manifest，供插件和只读升级说明消费。插件固定二进制和摘要，不再使用旧 Node bin、私有 CommonJS 模块或旧成功 JSON。

真实业务工程先在隔离副本中验证，原地操作按明确范围安排。旧固定 npm 包、源码提交、上一版二进制、Bundle、来源锁和插件包长期保留。发行资格消费该 Release 明示平台范围内的实际原生收据与适用固定源码门禁，未验证平台不得标成通过。npm deprecated 和旧仓归档按各自授权及退役合同执行，不执行 unpublish。

## Context 校验与快照

运行 `yss context check --root /absolute/path/project --json`；按需要追加 `--allowed-context-ids ComplianceReview,Reporting` 和 `--term-refs Global/Customer,ComplianceReview/AdmissionDecision`。原生参数使用逗号分隔，成功快照在 envelope 的 `result.context_snapshot`；未选择术语时返回空引用集合及其摘要。旧重复参数仅由冻结历史检查的显式映射转换。

合法 `template-source` 可只读执行 Context check/verify/query，不要求实例 metadata；项目实例仍须通过原有身份校验。缺二进制、快照能力、错误协议、实际非零退出或摘要漂移均阻断，需显式取得正确版本；不得回退旧校验入口。校验不创建批准或执行授权。

## 正式路径中的 Ticket 边界

当前 Spec 模板在 Spec 中起草业务 Ticket，产品设计校准后完成业务正式化，再进入系统 / 数据架构与工程契约；无产品设计影响时从 Spec 直接进入业务正式化。工程契约和实现仓库准备闭合后，进入“实现切片拆分与合同准入”（`stage.ticket-formalization`），由生命周期批准当前 Slice 合同并复算就绪条件。业务 Ticket 不授予实现资格。

阶段名称和条件见[生命周期派生地图](../process/lifecycle-artifact-map.md)，工作单元依赖见[业务票协议](../process/business-tickets.md)。以下离线帮助消费 CLI 的固定 Bundle；新模板展示进入下一固定来源构建后，CLI 的来源摘要和阶段名称才相应更新。

<!-- YSS_CLI_HELP_START -->
<!-- Generated by go run ./tools/helpdocs; edit command metadata and fixed help views. -->
# YSS CLI 离线帮助与案例

终端默认中文摘要；管道和重定向保留原结果。`--human` 强制中文，`--json` 保持 outputVersion=1 / protocolVersion=1，二者互斥。`--json --diagnostics` 仅在失败时附加顶层诊断，不改变 `result`。帮助优先处理并始终为文本；它不读取项目、写入文件或访问网络。

诊断区分已确认原因、可能原因和待核验事项；处理命令标记只读、写入或联网。版本要求没有可核验记录时显示‘尚未登记’；远程确认使用 `yss upgrade --check`。

## 入口导航

```text
yss 1.3.3 — Spec / Design / Backend / Frontend 统一入口
──────────────────────

用法: yss [选项] <命令> [参数]

Profile 职责:
  spec 综合研发主控；支持目标政策的完整正式功能默认推进业务验收。
  design 产品与业务设计；backend/frontend 承担技术设计与专职交付。
  本次目标、本端职责与整体业务分别核验；旧实例先核对能力并显式同步。

快速上手（选择一个 Profile，在独立新目录运行）:
  yss init --profile spec --root ./demo-spec --project-name 演示项目
  yss init --profile design --root ./demo-design --project-name 演示项目
  yss init --profile backend --root ./demo-backend --project-name 演示项目
  yss init --profile frontend --root ./demo-frontend --project-name 演示项目
  yss doctor --root ./demo-spec --human
  yss context verify --root ./demo-spec --json

生命周期导航:
  正式：入口分诊 → Plan（战略规划） → Spec / 功能架构 → 产品设计 → 系统 / 数据架构与工程契约 → Ticket 正式化 → 垂直切片实现 → 验证 / 发布 / 复盘
  固定模板：5153d60ec657378421f6759b69cb3c02cd3d1512；来源摘要：d876225c5bfe1dd63ef05359c34688cd83194d59d05a47bc4a223833a1961ab5
  日常：需求与验收 → 技术技能 → 实现 → 测试 → 独立审查 → verify-daily（当前 Spec 政策）
  教程：yss help tutorial governed | yss help tutorial daily
  先 Spec、再设计、再交付：yss help tutorial spec
  目标设置与续推：yss lifecycle target --help | yss help examples lifecycle target

通用选项:
  -h, --help       显示离线帮助
  -V, --version    显示程序及来源
  --human          强制中文摘要；终端默认中文，管道保持原格式
  --json           输出机器协议 1；与 --human 互斥
  --diagnostics    与 --json 同用，失败时附加诊断

命令:
  [项目]
    init             创建固定模板来源的项目实例。
    profile          准备独立的下游 Profile 工程并登记显式关联。
    attach           首次接管已有工程的模板受管资产；原生实例使用 sync，旧实例使用 migrate。
    doctor           检查项目身份、受管基线和冲突。
    diff             查看当前文件相对固定模板的差异和同步计划。
    sync             将项目模板升级到本 CLI 内置固定 Bundle。
    migrate          显式迁移旧实例 metadata、受管基线及 binding。
    recover          查询或恢复未完成的项目事务。
    rollback         查询或整体回退最近一次成功项目事务。
  [资源]
    skills           查询或补装 Skill 及其依赖闭包。
    assets           查询或补装 阶段资源和 Skill 闭包。
    bundle           读取或导出完整固定 Bundle 与 manifest。
  [程序]
    version          查看 CLI、协议和固定来源身份。
    capabilities     查看原生能力、治理接口与发行证据边界。
    upgrade          从 GitHub 下载并事务安装稳定版 CLI。
    update           安装、恢复或回退指定本地发行包。
  [治理]
    context          查询或校验唯一 CONTEXT.md 及词汇快照。
    lifecycle        查询当前生命周期、配置本次推进目标并核验门禁。
    stage            查询、登记或更新既有阶段工作项。
    contract         校验 contract 的结构或原生领域语义。
    evidence         校验 evidence 的结构或原生领域语义。
    handoff          校验 handoff 的结构或原生领域语义。
    project-ci       核验或配置项目 CI。
  [工具]
    runtime          管理独立运行记录与保护标记。
    archive          安全打包、读取或核验 ZIP 资产。
    xml              读取 Maven project XML。
    compat           显式旧命令兼容适配。
    compat-api       供现役 JavaScript 消费者使用的原生传输接口。
  help [命令/子命令]  显示对应帮助；help tutorial 查看完整离线教程

项目常用参数（程序升级不接受这些参数）:
  --root <目录>    项目根，默认当前目录
  --profile <Profile>  spec|design|backend|frontend；init 必需，其余从身份检测

升级、同步与恢复:
  yss upgrade --check                         查询 CLI 稳定版本
  yss upgrade                                 升级 CLI 程序
  yss update status --tool-root ./tools/yss    诊断离线安装与事务
  yss sync --root ./demo-spec --plan --out /tmp/yss-sync-plan.json
  yss sync --root ./demo-spec --apply --plan-file /tmp/yss-sync-plan.json

帮助: yss -h | yss <命令/子命令> --help | yss help <命令/子命令>
完整离线教程: yss help tutorial
按主题阅读: yss help tutorial quickstart|daily|governed|spec|design|backend|frontend|maintenance
示例索引: yss help examples [命令/子命令]
错误索引: yss help errors [错误码]
入口区别: upgrade 升级程序；sync 同步模板；migrate 迁移旧实例；recover 恢复未完成事务；rollback 回退最近成功事务。
能力与限制: yss capabilities --json；未迁移行为返回 UNPORTED。
帮助不读取项目、不访问网络、不创建资产。

```

## 教程：quickstart

```text
快速上手
前置条件：在独立新目录选择一个 Profile；spec 综合研发主控，design 产品与业务设计，backend/frontend 承担技术设计与专职交付。新正式 Spec 功能默认推进到业务验收，可按里程碑续推。
输入材料：项目名称与目标目录；已有工程改用 attach 的保存计划。

  yss version --json
  yss capabilities --json
  yss init --profile spec --root ./demo-spec --project-name 演示项目 --plan --out ./demo-spec-init-plan.json
  yss init --profile spec --root ./demo-spec --apply --plan-file ./demo-spec-init-plan.json
  yss doctor --root ./demo-spec --human
  yss context verify --root ./demo-spec --json
  yss lifecycle query --root ./demo-spec --id work-unit.entry-triage --json

预期结果：计划保存、初始化形成身份与基线；后续查询返回当前输入状态。
下一步：yss help tutorial governed；符合日常政策时另读 daily。
失败恢复：目录错误查看 yss help errors IDENTITY；未完成原生事务先 yss recover --root ./demo-spec --json，再在已确认恢复范围内增加 --apply。
计划文件必须是新文件。终端默认中文；管道保留原格式；--human 强制中文；--json --diagnostics 在失败时附加结构化诊断。
```

## 教程：governed

```text
正式生命周期（spec）
来源摘要：template=5153d60ec657378421f6759b69cb3c02cd3d1512；registry=d876225c5bfe1dd63ef05359c34688cd83194d59d05a47bc4a223833a1961ab5；profile=尚未登记；policy=5d59f7d334d9c9c86c9d2557cacddb16029b12c31ef8cf0e48b81532125a299d
前置条件：合法项目身份，从当前任务最近可信阶段继续；阶段触发与退出条件由该 Profile 固定模板及项目当前资产核验。
输入材料：当前 checkpoint、已确认战略/Spec/合同和相应证据。路径示例使用新项目 .work；旧项目按 tracker.root 替换。以下需要当前资产的命令在材料齐备后执行。

本次目标、停止与续推（Spec 主控）
当前实例须启用 lifecycle-target-v1 政策；用 capabilities 查看 CLI 能力，并核验当前实例政策，不能仅凭版本号判断。旧原生实例缺能力时显式 sync --plan，审阅后 apply；不会静默补目标或改 checkpoint。此机制用于 governed，daily 仍走原分流政策。

三个完成结论分别核验：本次目标达到、Profile 职责完成、业务整体完成。新正式 Spec 功能默认 business-accepted；短目标达到不等于整体业务完成。已有 plan-to-backend 职责默认 backend-deliverable，仅允许前三目标，不能通过改目标扩大职责。
五个可写目标：
  spec-approved：当前 Spec 批准、业务 Ticket 草案和需求/验收覆盖已核验。
  product-design-completed：适用产品设计审查、验证、批准和业务 Ticket 正式化闭合；产品设计不适用须有当前依据，不生成空原型。
  backend-deliverable：当前批准合同、适用 API、后端实现、独立审查、构建及契约/部署验证闭合。
  frontend-accepted：当前前端实现、适用还原验证和独立验收闭合；前端不适用须另核批准影响评估及 Slice。
  business-accepted：Spec 主控完成同一业务范围的统一验收。验收完成不自动提交、合并或发布。
专职工程只读显示 profile-terminal，它是本端职责终点，不是第六个可写目标。

示例：用户要求“先完成 Spec”。先按实际 Tracker/map 登记替换 feature_id、checkpoint_ref 和目录；不要按目录名猜功能身份。创建项目内 .work/feature/tmp/target-input.json，JSON 内容为：
{
  "schema_version": 1,
  "kind": "lifecycle-progression-target",
  "feature_id": "feature.example",
  "checkpoint_ref": ".work/feature/checkpoint.json",
  "target": "spec-approved",
  "intent_source": "用户要求先完成 Spec",
  "consumers": []
}
草稿路径须已被项目现有忽略规则覆盖，计划放工程外；保留草稿至 apply 完成。输入不能占用 progression-target.json，也不填写批准、完成状态或 ready-for-agent。

  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --json
  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --input .work/feature/tmp/target-input.json --plan --out /tmp/spec-target-plan.json --json
  yss lifecycle target --root ./demo-spec --apply --plan-file /tmp/spec-target-plan.json --json
  yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.json --json

plan 只保存计划；apply 重新核验当前输入并拒绝篡改或漂移，写入仅限目标配置和必要事务记录。查询 target/status 不写入、不启动实现或业务测试。真正推进由 yss-product-lifecycle 及相应负责人完成。
达到目标后停止本次下游写入，保留 checkpoint 的真实 next_work_unit；next_action.kind=target-reached 表示停点，不将 checkpoint 改成整业务已完成。

用户随后要求“继续完成设计”：修改同一草稿的 target 为 product-design-completed，并更新 intent_source，再保存新计划并应用：
  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --input .work/feature/tmp/target-input.json --plan --out /tmp/design-target-plan.json --json
  yss lifecycle target --root ./demo-spec --apply --plan-file /tmp/design-target-plan.json --json
设计后要求完成前后端及业务验收：把 target 改为 business-accepted，更新 intent_source，再保存新计划并应用：
  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --input .work/feature/tmp/target-input.json --plan --out /tmp/business-target-plan.json --json
  yss lifecycle target --root ./demo-spec --apply --plan-file /tmp/business-target-plan.json --json
每次改目标后重验已有证据，从首个合法未完成工作单元续推；有效批准和稳定业务 Ticket ID 可复用。真实资产或批准依据变化仍使受影响证据失效。

本地或独立专职：
  consumers=[]：同一 Spec 主线消费本地批准资产，在已登记实现仓写代码；无需另建三个治理工程或自导自入。本地前端有后端/API/数据依赖时等待当前后端交付；纯 UI 以有依据的不适用记录核验。
  外部专职：consumers 每项给 profile（design/backend/frontend）、绝对 root、同功能 checkpoint_ref，每种最多一个；不能指向主控自身。未来尚未创建的端只能登记意图，未核验当前接收前不会报完成。
  Spec→Design 使用当前 SpecBaseline、Receipt 和目标 Context 对账；Spec/Design→Backend/Frontend 消费同一冻结战略基线；Backend→Frontend 消费当前接口及运行证据。前端可先准备设计与计划，正式实现仍核验当前依赖。
  主控只汇总显式绑定的同功能交付；过期 Receipt、版本失配和 Context 冲突阻断受影响完成判定。Context 以既有词汇归一化合同核验。

读结果：progression 给目标、来源、reached 和完成依据；completion.milestone/profile/business 区分本次、本端与整体；coordination 给显式消费者状态；next_action 给承接者、工程、工作单元或等待原因。pending 等待证据，blocked 先处理诊断，not-applicable 须有已核验依据。next_action 不授予执行授权。
失败恢复：保留原输入和计划；漂移后重新 plan。查询 yss recover / rollback 默认只读，增加 --apply 执行既有保护性恢复/回退；后续修改冲突时停止覆盖。目标不进入批准或交接证据闭包。
详细输入和独立消费者示例见 docs/lifecycle-target.md。

1. 入口分诊（stage.entry-triage）
目标：确认仓库身份、问题范围和影响面。
  yss stage query --root ./demo-spec --id stage.entry-triage --json
  yss doctor --root ./demo-spec --json
  yss context verify --root ./demo-spec --json
  yss lifecycle query --root ./demo-spec --id work-unit.entry-triage --json
预期结果：查询/核验当前输入与适用条件。
下一步条件：yss-project.yaml 合法，影响面和最近可信阶段可解释。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

2. Plan（战略规划）（stage.plan）
目标：确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。
  yss stage query --root ./demo-spec --id stage.plan --json
  yss stage register --root ./demo-spec --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-spec/docs/stage-plan.json
  yss stage apply --root ./demo-spec --plan-file docs/stage-plan.json --json
  工作项 JSON 与 checkpoint 由当前任务准备；重定向保存原始计划，不加 --json envelope。Plan 撰写和批准由对应 Skill/负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的战略与阶段决策检查通过，用户统一批准当前 Plan；影响业务边界、关键规则或 MVP 的问题已解决，其他未决项有责任人和解决时点；下游可进入 Spec，不代表可实现。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

3. Spec / 功能架构（stage.spec-architecture）
目标：固化解决方案和功能边界。
  yss stage query --root ./demo-spec --id stage.spec-architecture --json
  yss stage update --root ./demo-spec --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-spec/docs/stage-plan-next.json
  yss lifecycle verify --root ./demo-spec --checkpoint .work/feature/checkpoint.json --json --diagnostics
  更新计划经审阅后使用 stage apply；Spec 由批准的战略输入承接。
  同时起草业务 Ticket 草案及 FR/AC 覆盖；业务票不授予实现资格。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Spec 基线和功能边界可审查。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. 产品设计（stage.product-design）
目标：在存在产品设计影响时校准页面流和状态。
  yss stage query --root ./demo-spec --id stage.product-design --json
  yss assets list --root ./demo-spec --json
  yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
  仅命中产品设计影响时使用原型与设计技能；未命中项按权威条件说明适用性。
  产品设计校准后完成 work-unit.business-ticket-formalization，再进入技术分析；无产品设计影响时从 Spec 直接进入业务正式化，不生成空原型。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的设计门禁通过；未命中项记录 not-applicable 及原因。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. 系统 / 数据架构与工程契约（stage.system-data-engineering）
目标：固化系统、数据、工程基线和 API 契约。
  yss stage query --root ./demo-spec --id stage.system-data-engineering --json
  消费已正式化业务 Ticket 和当前批准的 Spec / 设计；工程契约围绕当前已确认交付范围形成。
  yss contract verify --root ./demo-spec --kind scaffold --file docs/scaffold.json --json --diagnostics
  yss handoff verify --root ./demo-spec --kind package --package docs/handoff --json
  API：OAS 3.1 YAML Draft → 锁定工具校验 → 独立 Review → Freeze → 实现与契约测试；由 OpenAPI 技能及负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：新建后端已由用户确认 DDD / MVC 与精确 Spring Boot 版本，既有工程已核验并复用登记值；受影响工程契约冻结或记录无 API 影响；required 脚手架证据齐全。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

6. Ticket 正式化（stage.ticket-formalization）
目标：在既有功能追踪入口下，将冻结范围正式化为垂直切片。
  yss stage query --root ./demo-spec --id stage.ticket-formalization --json
  yss contract verify --root ./demo-spec --kind slice --file docs/contract.json --checkpoint .work/feature/checkpoint.yaml --json --diagnostics
  输入为批准且当前的 Slice 合同及其消费证据；校验器不创建批准或设置 ready-for-agent。
  本阶段承接实现切片拆分与合同准入，工程契约和实现仓库准备须先闭合；业务 Ticket 正式化已在技术分析前完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：工作单元窄、依赖清晰、验收和测试 seam 可执行。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

7. 垂直切片实现（stage.vertical-slice-implementation）
目标：以批准合同驱动 TDD 实现和跨仓库协作。
  yss stage query --root ./demo-spec --id stage.vertical-slice-implementation --json
  yss skills list --root ./demo-spec --json
  yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
  仅按批准合同的写范围实现；需要的 Skill 闭包来自当前合同。前端在实际实现仓 pnpm，后端优先根 ./mvnw；记录真实测试并由独立审查者审查。
预期结果：查询/核验当前输入与适用条件。
下一步条件：允许写路径、禁止模式、证据和验证命令全部满足。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

8. 验证 / 发布 / 复盘（stage.verification-release-retrospective）
目标：完成 fresh verification、发布和回顾。
  yss stage query --root ./demo-spec --id stage.verification-release-retrospective --json
  yss evidence verify --root ./demo-spec --kind verification --file docs/verification.json --json --diagnostics
  yss project-ci verify --root ./demo-spec --base "<已确认40位SHA>" --runtime-store off --json
  yss lifecycle verify --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
  核验消费已有证据；真实发布、推送与外部动作消费相应授权，复盘保留实际结论。
预期结果：查询/核验当前输入与适用条件。
下一步条件：所有命中门禁通过，人工审查点已完成，checkpoint 可追溯。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。


```

## 教程：daily

```text
日常交付（Spec）
来源摘要：template=5153d60ec657378421f6759b69cb3c02cd3d1512；policy=5d59f7d334d9c9c86c9d2557cacddb16029b12c31ef8cf0e48b81532125a299d；日常能力=true
前置条件：当前 Spec 实例启用日常政策；同一任务有需求与验收、单一实现仓、已确认完整基线、适用 Skills、实际测试、独立审查和回滚依据。
输入材料：docs/daily-task.md 的同一 Ticket/PR 证据区；实际实现仓；已确认的40位 SHA。格式消费项目 .agents/skills/yss-product-lifecycle/references/daily-delivery.md。
顺序：需求与验收 → YSS 技术技能 → 实现 → 测试 → 独立审查 → verify-daily。

  yss lifecycle route --root ./demo-spec --task docs/daily-task.md --implementation-root "/实际实现仓" --base "<已确认40位SHA>" --json --diagnostics
  yss lifecycle verify-daily --root ./demo-spec --task docs/daily-task.md --implementation-root "/实际实现仓" --base "<已确认40位SHA>" --json --diagnostics

预期结果：route 返回 daily、governed 或 needs-info 及原因。
  daily：满足政策，按同一记录实现、实际测试及独立审查，再 verify-daily。
  governed：已有正式绑定或命中排除风险，从最近可信正式阶段继续。
  needs-info：缺事实先调查，补齐同一任务记录后再次 route。
下一步：verify-daily 通过后按当前范围交付；它核验已有记录，不执行业务测试或创建批准。
失败恢复：缺独立审查、过期测试或差异变化时补当前证据；已有正式任务不降级。其他 Profile 以实际政策与能力为准。
内部测试中的模拟日志和审查记录仅验证协议；公开项目的实际命令、独立审查和批准由对应负责人取得。
```

## 教程：spec

```text
Profile spec
职责：综合研发主控；新正式功能默认完成业务验收，可调整里程碑后续推；日常任务按当前政策分流。
日常政策启用：true

前置条件：独立新目录，或先 attach 接管已有工程；已有任务从最近可信接入点恢复。
输入材料：项目名称、当前职责对应的合同/交接材料。

  yss init --profile spec --root ./demo-spec --project-name 演示项目
  yss doctor --root ./demo-spec --json
  yss context verify --root ./demo-spec --json
  yss lifecycle query --root ./demo-spec --id work-unit.entry-triage --json
  yss assets list --root ./demo-spec --json
  yss skills list --root ./demo-spec --json

预期结果：仅安装该 Profile 支持的资源，返回实际来源与输入状态。
下一步：按以下固定 Profile 顺序继续；交接核验见 yss handoff verify --help。
失败恢复：身份、依赖或交接材料不匹配时补当前输入；未支持能力明确返回 UNPORTED。

正式生命周期（spec）
来源摘要：template=5153d60ec657378421f6759b69cb3c02cd3d1512；registry=d876225c5bfe1dd63ef05359c34688cd83194d59d05a47bc4a223833a1961ab5；profile=尚未登记；policy=5d59f7d334d9c9c86c9d2557cacddb16029b12c31ef8cf0e48b81532125a299d
前置条件：合法项目身份，从当前任务最近可信阶段继续；阶段触发与退出条件由该 Profile 固定模板及项目当前资产核验。
输入材料：当前 checkpoint、已确认战略/Spec/合同和相应证据。路径示例使用新项目 .work；旧项目按 tracker.root 替换。以下需要当前资产的命令在材料齐备后执行。

本次目标、停止与续推（Spec 主控）
当前实例须启用 lifecycle-target-v1 政策；用 capabilities 查看 CLI 能力，并核验当前实例政策，不能仅凭版本号判断。旧原生实例缺能力时显式 sync --plan，审阅后 apply；不会静默补目标或改 checkpoint。此机制用于 governed，daily 仍走原分流政策。

三个完成结论分别核验：本次目标达到、Profile 职责完成、业务整体完成。新正式 Spec 功能默认 business-accepted；短目标达到不等于整体业务完成。已有 plan-to-backend 职责默认 backend-deliverable，仅允许前三目标，不能通过改目标扩大职责。
五个可写目标：
  spec-approved：当前 Spec 批准、业务 Ticket 草案和需求/验收覆盖已核验。
  product-design-completed：适用产品设计审查、验证、批准和业务 Ticket 正式化闭合；产品设计不适用须有当前依据，不生成空原型。
  backend-deliverable：当前批准合同、适用 API、后端实现、独立审查、构建及契约/部署验证闭合。
  frontend-accepted：当前前端实现、适用还原验证和独立验收闭合；前端不适用须另核批准影响评估及 Slice。
  business-accepted：Spec 主控完成同一业务范围的统一验收。验收完成不自动提交、合并或发布。
专职工程只读显示 profile-terminal，它是本端职责终点，不是第六个可写目标。

示例：用户要求“先完成 Spec”。先按实际 Tracker/map 登记替换 feature_id、checkpoint_ref 和目录；不要按目录名猜功能身份。创建项目内 .work/feature/tmp/target-input.json，JSON 内容为：
{
  "schema_version": 1,
  "kind": "lifecycle-progression-target",
  "feature_id": "feature.example",
  "checkpoint_ref": ".work/feature/checkpoint.json",
  "target": "spec-approved",
  "intent_source": "用户要求先完成 Spec",
  "consumers": []
}
草稿路径须已被项目现有忽略规则覆盖，计划放工程外；保留草稿至 apply 完成。输入不能占用 progression-target.json，也不填写批准、完成状态或 ready-for-agent。

  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --json
  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --input .work/feature/tmp/target-input.json --plan --out /tmp/spec-target-plan.json --json
  yss lifecycle target --root ./demo-spec --apply --plan-file /tmp/spec-target-plan.json --json
  yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.json --json

plan 只保存计划；apply 重新核验当前输入并拒绝篡改或漂移，写入仅限目标配置和必要事务记录。查询 target/status 不写入、不启动实现或业务测试。真正推进由 yss-product-lifecycle 及相应负责人完成。
达到目标后停止本次下游写入，保留 checkpoint 的真实 next_work_unit；next_action.kind=target-reached 表示停点，不将 checkpoint 改成整业务已完成。

用户随后要求“继续完成设计”：修改同一草稿的 target 为 product-design-completed，并更新 intent_source，再保存新计划并应用：
  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --input .work/feature/tmp/target-input.json --plan --out /tmp/design-target-plan.json --json
  yss lifecycle target --root ./demo-spec --apply --plan-file /tmp/design-target-plan.json --json
设计后要求完成前后端及业务验收：把 target 改为 business-accepted，更新 intent_source，再保存新计划并应用：
  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --input .work/feature/tmp/target-input.json --plan --out /tmp/business-target-plan.json --json
  yss lifecycle target --root ./demo-spec --apply --plan-file /tmp/business-target-plan.json --json
每次改目标后重验已有证据，从首个合法未完成工作单元续推；有效批准和稳定业务 Ticket ID 可复用。真实资产或批准依据变化仍使受影响证据失效。

本地或独立专职：
  consumers=[]：同一 Spec 主线消费本地批准资产，在已登记实现仓写代码；无需另建三个治理工程或自导自入。本地前端有后端/API/数据依赖时等待当前后端交付；纯 UI 以有依据的不适用记录核验。
  外部专职：consumers 每项给 profile（design/backend/frontend）、绝对 root、同功能 checkpoint_ref，每种最多一个；不能指向主控自身。未来尚未创建的端只能登记意图，未核验当前接收前不会报完成。
  Spec→Design 使用当前 SpecBaseline、Receipt 和目标 Context 对账；Spec/Design→Backend/Frontend 消费同一冻结战略基线；Backend→Frontend 消费当前接口及运行证据。前端可先准备设计与计划，正式实现仍核验当前依赖。
  主控只汇总显式绑定的同功能交付；过期 Receipt、版本失配和 Context 冲突阻断受影响完成判定。Context 以既有词汇归一化合同核验。

读结果：progression 给目标、来源、reached 和完成依据；completion.milestone/profile/business 区分本次、本端与整体；coordination 给显式消费者状态；next_action 给承接者、工程、工作单元或等待原因。pending 等待证据，blocked 先处理诊断，not-applicable 须有已核验依据。next_action 不授予执行授权。
失败恢复：保留原输入和计划；漂移后重新 plan。查询 yss recover / rollback 默认只读，增加 --apply 执行既有保护性恢复/回退；后续修改冲突时停止覆盖。目标不进入批准或交接证据闭包。
详细输入和独立消费者示例见 docs/lifecycle-target.md。

1. 入口分诊（stage.entry-triage）
目标：确认仓库身份、问题范围和影响面。
  yss stage query --root ./demo-spec --id stage.entry-triage --json
  yss doctor --root ./demo-spec --json
  yss context verify --root ./demo-spec --json
  yss lifecycle query --root ./demo-spec --id work-unit.entry-triage --json
预期结果：查询/核验当前输入与适用条件。
下一步条件：yss-project.yaml 合法，影响面和最近可信阶段可解释。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

2. Plan（战略规划）（stage.plan）
目标：确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。
  yss stage query --root ./demo-spec --id stage.plan --json
  yss stage register --root ./demo-spec --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-spec/docs/stage-plan.json
  yss stage apply --root ./demo-spec --plan-file docs/stage-plan.json --json
  工作项 JSON 与 checkpoint 由当前任务准备；重定向保存原始计划，不加 --json envelope。Plan 撰写和批准由对应 Skill/负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的战略与阶段决策检查通过，用户统一批准当前 Plan；影响业务边界、关键规则或 MVP 的问题已解决，其他未决项有责任人和解决时点；下游可进入 Spec，不代表可实现。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

3. Spec / 功能架构（stage.spec-architecture）
目标：固化解决方案和功能边界。
  yss stage query --root ./demo-spec --id stage.spec-architecture --json
  yss stage update --root ./demo-spec --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-spec/docs/stage-plan-next.json
  yss lifecycle verify --root ./demo-spec --checkpoint .work/feature/checkpoint.json --json --diagnostics
  更新计划经审阅后使用 stage apply；Spec 由批准的战略输入承接。
  同时起草业务 Ticket 草案及 FR/AC 覆盖；业务票不授予实现资格。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Spec 基线和功能边界可审查。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. 产品设计（stage.product-design）
目标：在存在产品设计影响时校准页面流和状态。
  yss stage query --root ./demo-spec --id stage.product-design --json
  yss assets list --root ./demo-spec --json
  yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
  仅命中产品设计影响时使用原型与设计技能；未命中项按权威条件说明适用性。
  产品设计校准后完成 work-unit.business-ticket-formalization，再进入技术分析；无产品设计影响时从 Spec 直接进入业务正式化，不生成空原型。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的设计门禁通过；未命中项记录 not-applicable 及原因。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. 系统 / 数据架构与工程契约（stage.system-data-engineering）
目标：固化系统、数据、工程基线和 API 契约。
  yss stage query --root ./demo-spec --id stage.system-data-engineering --json
  消费已正式化业务 Ticket 和当前批准的 Spec / 设计；工程契约围绕当前已确认交付范围形成。
  yss contract verify --root ./demo-spec --kind scaffold --file docs/scaffold.json --json --diagnostics
  yss handoff verify --root ./demo-spec --kind package --package docs/handoff --json
  API：OAS 3.1 YAML Draft → 锁定工具校验 → 独立 Review → Freeze → 实现与契约测试；由 OpenAPI 技能及负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：新建后端已由用户确认 DDD / MVC 与精确 Spring Boot 版本，既有工程已核验并复用登记值；受影响工程契约冻结或记录无 API 影响；required 脚手架证据齐全。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

6. Ticket 正式化（stage.ticket-formalization）
目标：在既有功能追踪入口下，将冻结范围正式化为垂直切片。
  yss stage query --root ./demo-spec --id stage.ticket-formalization --json
  yss contract verify --root ./demo-spec --kind slice --file docs/contract.json --checkpoint .work/feature/checkpoint.yaml --json --diagnostics
  输入为批准且当前的 Slice 合同及其消费证据；校验器不创建批准或设置 ready-for-agent。
  本阶段承接实现切片拆分与合同准入，工程契约和实现仓库准备须先闭合；业务 Ticket 正式化已在技术分析前完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：工作单元窄、依赖清晰、验收和测试 seam 可执行。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

7. 垂直切片实现（stage.vertical-slice-implementation）
目标：以批准合同驱动 TDD 实现和跨仓库协作。
  yss stage query --root ./demo-spec --id stage.vertical-slice-implementation --json
  yss skills list --root ./demo-spec --json
  yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
  仅按批准合同的写范围实现；需要的 Skill 闭包来自当前合同。前端在实际实现仓 pnpm，后端优先根 ./mvnw；记录真实测试并由独立审查者审查。
预期结果：查询/核验当前输入与适用条件。
下一步条件：允许写路径、禁止模式、证据和验证命令全部满足。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

8. 验证 / 发布 / 复盘（stage.verification-release-retrospective）
目标：完成 fresh verification、发布和回顾。
  yss stage query --root ./demo-spec --id stage.verification-release-retrospective --json
  yss evidence verify --root ./demo-spec --kind verification --file docs/verification.json --json --diagnostics
  yss project-ci verify --root ./demo-spec --base "<已确认40位SHA>" --runtime-store off --json
  yss lifecycle verify --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
  核验消费已有证据；真实发布、推送与外部动作消费相应授权，复盘保留实际结论。
预期结果：查询/核验当前输入与适用条件。
下一步条件：所有命中门禁通过，人工审查点已完成，checkpoint 可追溯。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。


```

## 教程：design

```text
Profile design
职责：产品与业务设计；技术设计由前后端工程路线承担。
日常政策启用：false

前置条件：独立新目录，或先 attach 接管已有工程；已有任务从最近可信接入点恢复。
输入材料：项目名称、当前职责对应的合同/交接材料。

  yss init --profile design --root ./demo-design --project-name 演示项目
  yss doctor --root ./demo-design --json
  yss context verify --root ./demo-design --json
  yss lifecycle query --root ./demo-design --id work-unit.entry-triage --json
  yss assets list --root ./demo-design --json
  yss skills list --root ./demo-design --json

预期结果：仅安装该 Profile 支持的资源，返回实际来源与输入状态。
下一步：按以下固定 Profile 顺序继续；交接核验见 yss handoff verify --help。
失败恢复：身份、依赖或交接材料不匹配时补当前输入；未支持能力明确返回 UNPORTED。

正式生命周期（design）
来源摘要：template=961a4afbb59ad56f107fccfad255bf003ab33260；registry=78be460bcee78a5325f36c8f3c4b2c1454ab7821fea456eab4fefb0b73df3220；profile=c4cd307dc2bea3279d50dd7988b5e43b59d3aece408c89e82287497ebe0f8e84；policy=尚未登记
前置条件：合法项目身份，从当前任务最近可信阶段继续；阶段触发与退出条件由该 Profile 固定模板及项目当前资产核验。
输入材料：当前 checkpoint、已确认战略/Spec/合同和相应证据。路径示例使用新项目 .work；旧项目按 tracker.root 替换。以下需要当前资产的命令在材料齐备后执行。

1. 入口分诊（stage.entry-triage）
目标：确认仓库身份、问题范围和影响面。
  yss stage query --root ./demo-design --id stage.entry-triage --json
  yss doctor --root ./demo-design --json
  yss context verify --root ./demo-design --json
  yss lifecycle query --root ./demo-design --id work-unit.entry-triage --json
预期结果：查询/核验当前输入与适用条件。
下一步条件：yss-project.yaml 合法，影响面和最近可信阶段可解释。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

2. Plan（战略规划）（stage.plan）
目标：确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。
  yss stage query --root ./demo-design --id stage.plan --json
  yss stage register --root ./demo-design --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-design/docs/stage-plan.json
  yss stage apply --root ./demo-design --plan-file docs/stage-plan.json --json
  工作项 JSON 与 checkpoint 由当前任务准备；重定向保存原始计划，不加 --json envelope。Plan 撰写和批准由对应 Skill/负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的业务边界与阶段决策检查通过，用户统一批准当前 Plan；关键问题已解决，非关键项有责任人、解决时点和接收方；下游可进入 Spec，不代表可实现。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

3. Spec / 功能架构（stage.spec-architecture）
目标：固化解决方案和功能边界。
  yss stage query --root ./demo-design --id stage.spec-architecture --json
  yss stage update --root ./demo-design --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-design/docs/stage-plan-next.json
  yss lifecycle verify --root ./demo-design --checkpoint .work/feature/checkpoint.json --json --diagnostics
  更新计划经审阅后使用 stage apply；Spec 由批准的战略输入承接。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Spec 基线和功能边界可审查。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. 产品设计（stage.product-design）
目标：在存在产品设计影响时校准页面流和状态。
  yss stage query --root ./demo-design --id stage.product-design --json
  yss assets list --root ./demo-design --json
  yss lifecycle status --root ./demo-design --checkpoint .work/feature/checkpoint.yaml --json
  仅命中产品设计影响时使用原型与设计技能；未命中项按权威条件说明适用性。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的设计门禁通过；未命中项记录 not-applicable 及原因。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. Ticket 正式化（stage.ticket-formalization）
目标：在既有功能追踪入口下，将冻结范围正式化为垂直切片。
  yss stage query --root ./demo-design --id stage.ticket-formalization --json
  yss handoff verify --root ./demo-design --kind package --package docs/handoff --json --diagnostics
  Design 正式化业务级 Ticket 并交接批准且当前的业务方案；研发合同与实现由下游接收方完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：工作单元窄、依赖清晰、验收和测试 seam 可执行。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

其他登记阶段仅供跨 Profile 引用，本 Profile 不执行：
  系统 / 数据架构与工程契约（stage.system-data-engineering）
  垂直切片实现（stage.vertical-slice-implementation）
  验证 / 发布 / 复盘（stage.verification-release-retrospective）

```

## 教程：backend

```text
Profile backend
职责：消费战略交接及批准工程合同，完成后端专职交付。
日常政策启用：false

前置条件：独立新目录，或先 attach 接管已有工程；已有任务从最近可信接入点恢复。
输入材料：项目名称、当前职责对应的合同/交接材料。

  yss init --profile backend --root ./demo-backend --project-name 演示项目
  yss doctor --root ./demo-backend --json
  yss context verify --root ./demo-backend --json
  yss lifecycle query --root ./demo-backend --id work-unit.harness-entry --json
  yss assets list --root ./demo-backend --json
  yss skills list --root ./demo-backend --json

预期结果：仅安装该 Profile 支持的资源，返回实际来源与输入状态。
下一步：按以下固定 Profile 顺序继续；交接核验见 yss handoff verify --help。
失败恢复：身份、依赖或交接材料不匹配时补当前输入；未支持能力明确返回 UNPORTED。

正式生命周期（backend）
来源摘要：template=ebf5236f44c2c91d58366e838b64551e6f30751d；registry=4a3eabfb5adc2cdd999cd7d7967a0b7c344b3cbd618cea36b752fd5292dd2ac9；profile=3af7f3d5f15babfbc6f90fa918c9fb5e6f81b6488062087575fe374bb4ccfeca；policy=尚未登记
前置条件：合法项目身份，从当前任务最近可信阶段继续；阶段触发与退出条件由该 Profile 固定模板及项目当前资产核验。
输入材料：当前 checkpoint、已确认战略/Spec/合同和相应证据。路径示例使用新项目 .work；旧项目按 tracker.root 替换。以下需要当前资产的命令在材料齐备后执行。

1. Harness 入口（stage.harness-entry）
目标：校验仓库身份、上游输入、影响面和实现仓库上下文。
  yss stage query --root ./demo-backend --id stage.harness-entry --json
  yss doctor --root ./demo-backend --json
  yss context verify --root ./demo-backend --json
  yss lifecycle query --root ./demo-backend --id work-unit.harness-entry --json
预期结果：查询/核验当前输入与适用条件。
下一步条件：上游输入版本当前，影响面、项目根、分支、写入范围和验证命令可解释。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

2. 技术设计（stage.technical-design）
目标：按已确认的 DDD 或 MVC 架构把批准需求细化为可实现、可验证的设计。
  yss stage query --root ./demo-backend --id stage.technical-design --json
  yss handoff verify --root ./demo-backend --kind package --package docs/handoff --json --diagnostics
  yss lifecycle status --root ./demo-backend --checkpoint .work/feature/checkpoint.yaml --json
  消费当前上游接收与工程约束；适用的技术/前端设计 Skill 及负责人完成设计、独立审查和批准。输入通过不授予实现资格。
预期结果：查询/核验当前输入与适用条件。
下一步条件：新建后端的架构与精确 Spring Boot 版本已由用户确认，既有工程已核验并复用登记架构与实际版本；后端 Technical Design Contract 已批准且当前；数据影响为真时数据架构已批准，否则有可核验的不适用记录；gate.engineering-contract-approved 已通过。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

3. 实现仓库准备（stage.implementation-repository-preparation）
目标：在已批准的技术/数据设计之后接入既有仓库或生成纯机械后端骨架。
  yss stage query --root ./demo-backend --id stage.implementation-repository-preparation --json
  yss contract verify --root ./demo-backend --kind scaffold --file docs/scaffold.json --json --diagnostics
  由工程接入或脚手架 Skill 在批准且当前的工程合同下接入真实实现仓；先核对 Scaffold/Preparation 证据。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Implementation Repository Preparation Result v2 当前且通过；新生成仅使用 Scaffold Contract/Manifest v4，历史 v3 已完成恢复对账。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. Slice Contract（stage.slice-contract）
目标：将战术设计和冻结契约编译为一个跨前后端测试的实现合同。
  yss stage query --root ./demo-backend --id stage.slice-contract --json
  yss contract verify --root ./demo-backend --kind slice --file docs/contract.json --checkpoint .work/feature/checkpoint.yaml --json --diagnostics
  消费批准且当前的 Slice 合同、条件化交接与工程输入；编译器不创建批准。
预期结果：查询/核验当前输入与适用条件。
下一步条件：合同版本当前、四个角色分区完整、写路径和验证命令明确，且就绪公式满足。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. 垂直切片实现（stage.slice-implementation）
目标：由前端、后端和测试 Agent 按同一合同并行实现和验证。
  yss stage query --root ./demo-backend --id stage.slice-implementation --json
  yss skills list --root ./demo-backend --json
  yss lifecycle status --root ./demo-backend --checkpoint .work/feature/checkpoint.yaml --json
  仅按批准合同的写范围实现；需要的 Skill 闭包来自当前合同。前端在实际实现仓 pnpm，后端优先根 ./mvnw；记录真实测试并由独立审查者审查。
预期结果：查询/核验当前输入与适用条件。
下一步条件：行为实现、测试证据、契约一致性和写入边界均满足合同。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

6. 独立验证（stage.verification）
目标：由测试 Agent 以独立执行态完成 Fresh Verification 和合并前复核。
  yss stage query --root ./demo-backend --id stage.verification --json
  yss evidence verify --root ./demo-backend --kind verification --file docs/verification.json --json --diagnostics
  yss project-ci verify --root ./demo-backend --base "<已确认40位SHA>" --runtime-store off --json
  yss lifecycle verify --root ./demo-backend --checkpoint .work/feature/checkpoint.yaml --json
  核验消费已有证据；真实发布、推送与外部动作消费相应授权，复盘保留实际结论。
预期结果：查询/核验当前输入与适用条件。
下一步条件：所有命中门禁通过，阻塞信号清空，证据可读且 checkpoint 可追溯。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。


```

## 教程：frontend

```text
Profile frontend
职责：核验战略与后端交接输入，在批准合同内完成前端交付。
日常政策启用：false

前置条件：独立新目录，或先 attach 接管已有工程；已有任务从最近可信接入点恢复。
输入材料：项目名称、当前职责对应的合同/交接材料。

  yss init --profile frontend --root ./demo-frontend --project-name 演示项目
  yss doctor --root ./demo-frontend --json
  yss context verify --root ./demo-frontend --json
  yss lifecycle query --root ./demo-frontend --id work-unit.harness-entry --json
  yss assets list --root ./demo-frontend --json
  yss skills list --root ./demo-frontend --json

预期结果：仅安装该 Profile 支持的资源，返回实际来源与输入状态。
下一步：按以下固定 Profile 顺序继续；交接核验见 yss handoff verify --help。
失败恢复：身份、依赖或交接材料不匹配时补当前输入；未支持能力明确返回 UNPORTED。

正式生命周期（frontend）
来源摘要：template=00ca3eb844b0c4e778dfe679552d29e034cea6eb；registry=27eb6b4d0bf80472ba6ca4f0ea54dcffe519660e1779035b1dc7b835a7e55905；profile=6f87ffbcdc392a4a88830048ffffc3f0e4b7d52a089048c5eca22ec01f351cf1；policy=尚未登记
前置条件：合法项目身份，从当前任务最近可信阶段继续；阶段触发与退出条件由该 Profile 固定模板及项目当前资产核验。
输入材料：当前 checkpoint、已确认战略/Spec/合同和相应证据。路径示例使用新项目 .work；旧项目按 tracker.root 替换。以下需要当前资产的命令在材料齐备后执行。

1. Harness 入口（stage.harness-entry）
目标：校验仓库身份、上游输入、影响面和实现仓库上下文。
  yss stage query --root ./demo-frontend --id stage.harness-entry --json
  yss doctor --root ./demo-frontend --json
  yss context verify --root ./demo-frontend --json
  yss lifecycle query --root ./demo-frontend --id work-unit.harness-entry --json
预期结果：查询/核验当前输入与适用条件。
下一步条件：上游输入版本当前，影响面、项目根、分支、写入范围和验证命令可解释。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

2. 前端工程设计（stage.frontend-engineering-design）
目标：联合输入通过后定义组件、状态管理、API 消费和前端测试边界。
  yss stage query --root ./demo-frontend --id stage.frontend-engineering-design --json
  yss handoff verify --root ./demo-frontend --kind package --package docs/handoff --json --diagnostics
  yss lifecycle status --root ./demo-frontend --checkpoint .work/feature/checkpoint.yaml --json
  消费当前上游接收与工程约束；适用的技术/前端设计 Skill 及负责人完成设计、独立审查和批准。输入通过不授予实现资格。
预期结果：查询/核验当前输入与适用条件。
下一步条件：前端实现计划可审阅；本地无领域影响已记录 not-applicable，新领域问题回交上游。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

3. Slice Contract（stage.slice-contract）
目标：将当前前端工程设计、条件化后端交付和冻结契约编译为前端垂直切片实现合同。
  yss stage query --root ./demo-frontend --id stage.slice-contract --json
  yss contract verify --root ./demo-frontend --kind slice --file docs/contract.json --checkpoint .work/feature/checkpoint.yaml --json --diagnostics
  消费批准且当前的 Slice 合同、条件化交接与工程输入；编译器不创建批准。
预期结果：查询/核验当前输入与适用条件。
下一步条件：合同版本当前、四个角色分区完整、写路径和验证命令明确，且就绪公式满足。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. 垂直切片实现（stage.slice-implementation）
目标：由前端、后端和测试 Agent 按同一合同并行实现和验证。
  yss stage query --root ./demo-frontend --id stage.slice-implementation --json
  yss skills list --root ./demo-frontend --json
  yss lifecycle status --root ./demo-frontend --checkpoint .work/feature/checkpoint.yaml --json
  仅按批准合同的写范围实现；需要的 Skill 闭包来自当前合同。前端在实际实现仓 pnpm，后端优先根 ./mvnw；记录真实测试并由独立审查者审查。
预期结果：查询/核验当前输入与适用条件。
下一步条件：行为实现、测试证据、契约一致性和写入边界均满足合同。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. 独立验证（stage.verification）
目标：由测试 Agent 以独立执行态完成 Fresh Verification 和合并前复核。
  yss stage query --root ./demo-frontend --id stage.verification --json
  yss evidence verify --root ./demo-frontend --kind verification --file docs/verification.json --json --diagnostics
  yss project-ci verify --root ./demo-frontend --base "<已确认40位SHA>" --runtime-store off --json
  yss lifecycle verify --root ./demo-frontend --checkpoint .work/feature/checkpoint.yaml --json
  核验消费已有证据；真实发布、推送与外部动作消费相应授权，复盘保留实际结论。
预期结果：查询/核验当前输入与适用条件。
下一步条件：所有命中门禁通过，阻塞信号清空，证据可读且 checkpoint 可追溯。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。


```

## 教程：maintenance

```text
维护与恢复
前置条件：分别确认程序、项目模板、旧实例及插件绑定的来源与事务范围。
程序升级：upgrade；模板同步：sync；旧实例迁移：migrate。
普通 recover/rollback 默认只读，增加 --apply 执行；migrate recover/rollback 与 update recover/rollback 本身写入。
先核对状态及归档，在已确认范围内恢复。已绑定插件使用对应插件 project-upgrade-plan/apply 或 project-migration-plan/apply。
预期结果：计划、应用与恢复均绑定实际输入；后续用户修改阻止覆盖。
下一步：核对 doctor/diff 或 update status，保留本次真实验证与恢复材料。
失败恢复：冲突与输入漂移先保留现场，再检查诊断并重新规划；原始旧事务由对应固定旧执行器恢复。

YSS 离线入门教程

1. 查看程序与选择模板
   yss version --json
   yss capabilities --json
   yss init --profile spec --root ./demo-spec --project-name 演示项目
   也可选择 design、backend、frontend；在各自的新目录初始化。

2. 检查实例（只读）
   yss doctor --root ./demo-spec --json
   yss diff --root ./demo-spec --json

3. 升级项目模板（先检查计划，再应用）
   yss sync --root ./demo-spec --plan --out /tmp/yss-sync-plan.json
   yss sync --root ./demo-spec --apply --plan-file /tmp/yss-sync-plan.json
   计划文件须不存在；输入或定制冲突变化时重新生成计划。

4. 查询和补装资源
   yss skills list --root ./demo-spec --json
   yss skills ensure yss-research --root ./demo-spec --plan --out /tmp/yss-skill-plan.json
   yss skills --root ./demo-spec --apply --plan-file /tmp/yss-skill-plan.json
   yss assets list --root ./demo-spec --json
   使用 list 的实际标识；阶段资源以当前 Profile 登记为准。

5. 旧实例迁移
   yss doctor --root ./old-project --json
   yss migrate plan --root ./old-project --out /tmp/yss-migrate-plan.json --json
   yss migrate apply --root ./old-project --plan-file /tmp/yss-migrate-plan.json --json
   yss migrate rollback --root ./old-project --json
   旧未完成事务先由对应仓外固定旧执行器恢复，不能跳过恢复直接迁移。

6. 升级 CLI 程序
   yss upgrade --check
   yss upgrade
   yss upgrade --to 1.3.0 --tool-root ./tools/yss --json
   自动识别实际运行的受管工具目录；未受管裸二进制须显式选择新工具目录。

   1.0.0 没有 upgrade 命令：首次进入新版从
   https://github.com/iloveZzz/yss-cli/releases 下载本机包和 checksums.json，
   读取其中对应归档 SHA-256，再执行现有离线入口：
   yss update plan --tool-root ./tools/yss --artifact /path/yss_1.3.0_darwin_arm64.tar.gz --sha256 "<SHA-256>" --out /tmp/yss-install-plan.json --json
   yss update apply --tool-root ./tools/yss --plan-file /tmp/yss-install-plan.json --json
   ./tools/yss/yss version --json
   将该受管目录的 yss 链接到 PATH 后即可使用 upgrade。

7. 程序恢复和回退
   yss update status --tool-root ./tools/yss --json
   yss update recover --tool-root ./tools/yss --json
   yss update rollback --tool-root ./tools/yss --json
   自动安装用户应使用 upgrade 输出的 toolRoot，示例目录只是显式安装案例。
   后续用户修改会阻止覆盖；程序事务与项目 sync/migrate 事务分别恢复。

   出现“受管程序文件与安装清单不一致”时：
   先对错误中实际 toolRoot 执行 update status，查看 diagnostic.files 的
   expected/actual 摘要、权限以及 recordedVersion/runningVersion。
   运行版本仅在查询当前执行程序所在目录时比较；其他目录不会混用版本。
   有未完成程序事务先检查状态与归档，再执行 update recover。
   没有未完成事务但文件或版本不一致时，保留旧目录，选择不存在的新目录：
   yss upgrade --tool-root ./tools/yss-clean
   ./tools/yss-clean/yss version --json
   ./tools/yss-clean/yss update status --tool-root ./tools/yss-clean --json
   确认一致后再将 PATH 入口指向新目录的完整受管安装。
   离线安装使用第 6 步的 update plan/apply，tool-root 改为新目录。
   不要只替换 yss 文件、改写安装收据或删除旧归档；回退仍可能因后续修改而拒绝。

8. 治理入口
   yss context verify --root ./demo-spec --json
   yss lifecycle query --root ./demo-spec --id work-unit.entry-triage --json
   yss lifecycle route --help
   日常路由需已确认任务、实现仓和完整基线；机器校验不创建批准。

每个命令都有 -h / --help，例如 yss update apply -h。
本教程只输出文本；示例需由用户在适当目录显式执行。

```

## 案例材料与验证

公开示例的占位符须替换为真实目录、合同、完整基线和当前证据。批准、独立审查和外部操作由对应负责人取得。源码中的 `internal/cli/testdata/tutorial`、日常测试和治理测试是内部案例，不构成业务批准。

案例实际执行结果记录在候选验证报告，区分通过、预期阻断和未执行。CLI 核验消费已有测试记录，不代替执行测试。阶段计划重定向保存原始结果，不添加 `--json`；envelope 不能当作 `--plan-file` 输入。项目计划用 `--out` 保存。

## 命令参考

| 命令 | 用途 | 示例入口 |
| --- | --- | --- |
| `archive` | 安全打包、读取或核验 ZIP 资产。 | `yss help examples archive` |
| `archive pack` | 打包指定项目目录。 | `yss help examples archive pack` |
| `archive unpack` | 安全解包到新位置。 | `yss help examples archive unpack` |
| `archive verify` | 只读核验归档结构。 | `yss help examples archive verify` |
| `assets` | 查询或补装 阶段资源和 Skill 闭包。 | `yss help examples assets` |
| `assets ensure` | 补装指定 阶段资源和 Skill 闭包。 | `yss help examples assets ensure` |
| `assets list` | 列出当前 Profile 支持的标识。 | `yss help examples assets list` |
| `attach` | 首次接管已有工程的模板受管资产；原生实例使用 sync，旧实例使用 migrate。 | `yss help examples attach` |
| `bundle` | 读取或导出完整固定 Bundle 与 manifest。 | `yss help examples bundle` |
| `bundle export` | 导出 Bundle 全部 bytes、mode 和 manifest。 | `yss help examples bundle export` |
| `bundle inspect` | 检查 Bundle 身份、来源及摘要。 | `yss help examples bundle inspect` |
| `capabilities` | 查看原生能力、治理接口与发行证据边界。 | `yss help examples capabilities` |
| `compat` | 显式旧命令兼容适配。 | `yss help examples compat` |
| `compat create-yss-harness-backend` | 固定旧别名的显式原生适配。 | `yss help examples compat create-yss-harness-backend` |
| `compat create-yss-harness-design` | 固定旧别名的显式原生适配。 | `yss help examples compat create-yss-harness-design` |
| `compat create-yss-harness-frontend` | 固定旧别名的显式原生适配。 | `yss help examples compat create-yss-harness-frontend` |
| `compat create-yss-spec` | 固定旧别名的显式原生适配。 | `yss help examples compat create-yss-spec` |
| `compat-api` | 供现役 JavaScript 消费者使用的原生传输接口。 | `yss help examples compat-api` |
| `compat-api native.run` | 版本化兼容传输方法。 | `yss help examples compat-api native.run` |
| `compat-api native.snapshot` | 版本化兼容传输方法。 | `yss help examples compat-api native.snapshot` |
| `compat-api projectDiff` | 版本化兼容传输方法。 | `yss help examples compat-api projectDiff` |
| `compat-api projectDoctor` | 版本化兼容传输方法。 | `yss help examples compat-api projectDoctor` |
| `compat-api templateApply` | 版本化兼容传输方法。 | `yss help examples compat-api templateApply` |
| `compat-api templatePlan` | 版本化兼容传输方法。 | `yss help examples compat-api templatePlan` |
| `compat-api toErrorEnvelope` | 版本化兼容传输方法。 | `yss help examples compat-api toErrorEnvelope` |
| `context` | 查询或校验唯一 CONTEXT.md 及词汇快照。 | `yss help examples context` |
| `context check` | 校验词汇结构。 | `yss help examples context check` |
| `context query` | 查询稳定词汇。 | `yss help examples context query` |
| `context verify` | 校验当前词汇和可选快照。 | `yss help examples context verify` |
| `contract` | 校验 contract 的结构或原生领域语义。 | `yss help examples contract` |
| `contract check` | 执行显式 Schema 结构校验。 | `yss help examples contract check` |
| `contract verify` | 执行当前领域规则和独立消费者绑定校验。 | `yss help examples contract verify` |
| `diff` | 查看当前文件相对固定模板的差异和同步计划。 | `yss help examples diff` |
| `doctor` | 检查项目身份、受管基线和冲突。 | `yss help examples doctor` |
| `evidence` | 校验 evidence 的结构或原生领域语义。 | `yss help examples evidence` |
| `evidence check` | 执行显式 Schema 结构校验。 | `yss help examples evidence check` |
| `evidence verify` | 执行当前领域规则和独立消费者绑定校验。 | `yss help examples evidence verify` |
| `handoff` | 校验 handoff 的结构或原生领域语义。 | `yss help examples handoff` |
| `handoff check` | 执行显式 Schema 结构校验。 | `yss help examples handoff check` |
| `handoff export` | 导出当前已批准的 Spec 基线及来源证据。 | `yss help examples handoff export` |
| `handoff import` | 将批准 Spec 基线接入独立 Design。 | `yss help examples handoff import` |
| `handoff verify` | 执行当前领域规则和独立消费者绑定校验。 | `yss help examples handoff verify` |
| `init` | 创建固定模板来源的项目实例。 | `yss help examples init` |
| `lifecycle` | 查询当前生命周期、配置本次推进目标并核验门禁。 | `yss help examples lifecycle` |
| `lifecycle query` | 查询注册表中的稳定 ID。 | `yss help examples lifecycle query` |
| `lifecycle route` | 只读判定日常或正式交付路径。 | `yss help examples lifecycle route` |
| `lifecycle status` | 只读核验 checkpoint、本次目标与显式消费者的当前证据。 | `yss help examples lifecycle status` |
| `lifecycle target` | 读取或事务设置 Spec 单功能的本次推进目标。 | `yss help examples lifecycle target` |
| `lifecycle verify` | 核验当前 checkpoint 的领域门禁。 | `yss help examples lifecycle verify` |
| `lifecycle verify-daily` | 核验同一日常任务的当前差异、测试和独立审查。 | `yss help examples lifecycle verify-daily` |
| `migrate` | 显式迁移旧实例 metadata、受管基线及 binding。 | `yss help examples migrate` |
| `migrate apply` | 应用迁移计划。 | `yss help examples migrate apply` |
| `migrate plan` | 生成只读迁移计划（默认动作）。 | `yss help examples migrate plan` |
| `migrate recover` | 恢复未完成迁移事务。 | `yss help examples migrate recover` |
| `migrate rollback` | 恢复迁移前实例。 | `yss help examples migrate rollback` |
| `migrate status` | 查询迁移事务。 | `yss help examples migrate status` |
| `profile` | 准备独立的下游 Profile 工程并登记显式关联。 | `yss help examples profile` |
| `profile prepare` | 生成或执行单端、联合初始化保存计划。 | `yss help examples profile prepare` |
| `project-ci` | 核验或配置项目 CI。 | `yss help examples project-ci` |
| `project-ci apply` | 应用有限原生 CI 保存计划。 | `yss help examples project-ci apply` |
| `project-ci check` | 核验完整治理或显式有限 CI。 | `yss help examples project-ci check` |
| `project-ci install` | 生成有限原生 CI 安装计划。 | `yss help examples project-ci install` |
| `project-ci plan` | 生成有限原生 CI 安装计划。 | `yss help examples project-ci plan` |
| `project-ci transition` | 核验工作单元流转条件。 | `yss help examples project-ci transition` |
| `project-ci verify` | 按完整 Git 基线核验 CI。 | `yss help examples project-ci verify` |
| `recover` | 查询或恢复未完成的项目事务。 | `yss help examples recover` |
| `rollback` | 查询或整体回退最近一次成功项目事务。 | `yss help examples rollback` |
| `runtime` | 管理独立运行记录与保护标记。 | `yss help examples runtime` |
| `runtime begin` | 创建运行记录并返回所有权 token。 | `yss help examples runtime begin` |
| `runtime commands` | 只读查询运行记录。 | `yss help examples runtime commands` |
| `runtime complete` | 以实际退出码结束运行记录。 | `yss help examples runtime complete` |
| `runtime event` | 追加运行事件。 | `yss help examples runtime event` |
| `runtime events` | 只读查询运行记录。 | `yss help examples runtime events` |
| `runtime inspect` | 只读查询运行记录。 | `yss help examples runtime inspect` |
| `runtime pin` | 维护运行记录保护标记。 | `yss help examples runtime pin` |
| `runtime pins` | 只读查询运行记录。 | `yss help examples runtime pins` |
| `runtime run` | 只读查询运行记录。 | `yss help examples runtime run` |
| `runtime unpin` | 维护运行记录保护标记。 | `yss help examples runtime unpin` |
| `skills` | 查询或补装 Skill 及其依赖闭包。 | `yss help examples skills` |
| `skills ensure` | 补装指定 Skill 及其依赖闭包。 | `yss help examples skills ensure` |
| `skills list` | 列出当前 Profile 支持的标识。 | `yss help examples skills list` |
| `stage` | 查询、登记或更新既有阶段工作项。 | `yss help examples stage` |
| `stage apply` | 事务应用已保存的阶段工作项计划。 | `yss help examples stage apply` |
| `stage check` | 读取并校验当前阶段工作项。 | `yss help examples stage check` |
| `stage plan` | 生成阶段工作项写入计划。 | `yss help examples stage plan` |
| `stage query` | 查询阶段或 checkpoint 中的工作项。 | `yss help examples stage query` |
| `stage register` | 生成阶段工作项写入计划。 | `yss help examples stage register` |
| `stage status` | 读取并校验当前阶段工作项。 | `yss help examples stage status` |
| `stage update` | 生成阶段工作项写入计划。 | `yss help examples stage update` |
| `sync` | 将项目模板升级到本 CLI 内置固定 Bundle。 | `yss help examples sync` |
| `update` | 安装、恢复或回退指定本地发行包。 | `yss help examples update` |
| `update apply` | 应用保存的程序安装计划。 | `yss help examples update apply` |
| `update plan` | 生成离线程序安装计划（默认动作）。 | `yss help examples update plan` |
| `update recover` | 恢复唯一未完成的程序事务。 | `yss help examples update recover` |
| `update rollback` | 回退最近一次成功程序安装。 | `yss help examples update rollback` |
| `update status` | 只读诊断安装一致性及程序事务状态。 | `yss help examples update status` |
| `upgrade` | 从 GitHub 下载并事务安装稳定版 CLI。 | `yss help examples upgrade` |
| `version` | 查看 CLI、协议和固定来源身份。 | `yss help examples version` |
| `xml` | 读取 Maven project XML。 | `yss help examples xml` |
| `xml inspect` | 读取 Maven project 结构。 | `yss help examples xml inspect` |
| `xml query` | 查询 Maven project 读取结果。 | `yss help examples xml query` |

### archive

```text
yss 1.3.3 — archive
──────────────────────
安全打包、读取或核验 ZIP 资产。

用法: yss archive <子命令> --root <目录>

子命令:
pack  打包指定项目目录。
unpack  安全解包到新位置。
verify  只读核验归档结构。

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
拒绝路径逃逸、链接、碰撞和超限资产。

最小示例:
yss archive verify --root ./demo-spec --file docs/package.zip --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples archive
```

### archive pack

```text
yss 1.3.3 — archive pack
──────────────────────
打包指定项目目录。

用法: yss archive pack --root <目录> --source <目录> --output <文件>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
拒绝路径逃逸、链接、碰撞和超限资产。

最小示例:
yss archive pack --root ./demo-spec --source docs/handoff --output /tmp/yss-handoff.zip --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --output <路径>                 文件或目录路径
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --source <路径>                 文件或目录路径
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--source  输入目录
--output  仓外绝对路径，输出 ZIP

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples archive pack
```

### archive unpack

```text
yss 1.3.3 — archive unpack
──────────────────────
安全解包到新位置。

用法: yss archive unpack --root <目录> --file <ZIP> --output <目录>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
拒绝路径逃逸、链接、碰撞和超限资产。

最小示例:
yss archive unpack --root ./demo-spec --file docs/handoff.zip --output /tmp/yss-unpacked --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --output <路径>                 文件或目录路径
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --source <路径>                 文件或目录路径
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--file  输入 ZIP
--output  仓外绝对路径，目标须不存在

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples archive unpack
```

### archive verify

```text
yss 1.3.3 — archive verify
──────────────────────
只读核验归档结构。

用法: yss archive verify --root <目录> --file <ZIP>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
拒绝路径逃逸、链接、碰撞和超限资产。

最小示例:
yss archive verify --root ./demo-spec --file docs/handoff.zip --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --source <路径>                 文件或目录路径
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--file / --source  待验 ZIP

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples archive verify
```

### assets

```text
yss 1.3.3 — assets
──────────────────────
查询或补装 阶段资源和 Skill 闭包。

用法: yss assets <子命令> --root <目录>

子命令:
ensure  补装指定 阶段资源和 Skill 闭包。
list  列出当前 Profile 支持的标识。

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
可用标识来自当前 Profile 的内置 Bundle；不猜测能力闭包。

最小示例:
yss assets list --root ./demo-spec --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
先 list 核对当前 Profile 支持的标识，再按保存计划补装。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples assets
```

### assets ensure

```text
yss 1.3.3 — assets ensure
──────────────────────
补装指定 阶段资源和 Skill 闭包。

用法: yss assets ensure --root <目录> <标识...> --plan --out <新文件>

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
须先 list 确认该 Profile 支持相应标识。

最小示例:
yss assets ensure stage.spec-architecture --root ./demo-spec --plan --out /tmp/yss-resource-plan.json
yss assets --root ./demo-spec --apply --plan-file /tmp/yss-resource-plan.json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
位置参数: 阶段 ID；支持多个
--plan --out <新文件>  生成保存计划，输出文件必须不存在
--apply --plan-file <文件>  应用保存计划；输入变化时拒绝

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
先 list 核对当前 Profile 支持的标识，再按保存计划补装。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples assets ensure
```

### assets list

```text
yss 1.3.3 — assets list
──────────────────────
列出当前 Profile 支持的标识。

用法: yss assets list --root <目录> [--json]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
可用标识来自当前 Profile 的内置 Bundle；不猜测能力闭包。

最小示例:
yss assets list --root ./demo-spec --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
只读查询

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
先 list 核对当前 Profile 支持的标识，再按保存计划补装。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples assets list
```

### attach

```text
yss 1.3.3 — attach
──────────────────────
首次接管已有工程的模板受管资产；原生实例使用 sync，旧实例使用 migrate。

用法: yss attach --root <目录> --profile <Profile> --plan --out <新文件>

前置条件:
已有普通工程；先检查定制与受管范围，再保存接管计划。
保留业务目录、CONTEXT.md 和用户 .github；定制冲突须先处置。

最小示例:
yss attach --profile backend --root ./existing-backend --plan --out /tmp/yss-attach-plan.json
yss attach --root ./existing-backend --apply --plan-file /tmp/yss-attach-plan.json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --base-bundle <路径>            显式提供完整历史 Bundle 材料；默认离线
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --resolution-file <文件>        结合 --plan-file 原计划重新规划已决议资产
  --review-out <新目录>           在项目外导出冲突、基线、合并候选和决议模板
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--plan --out <新文件>  生成保存计划，输出文件必须不存在
--apply --plan-file <文件>  应用保存计划；输入变化时拒绝
--review-out <新目录>  项目外审查材料与决议模板
--base-bundle <路径>  离线历史 Bundle 完整材料
--resolution-file <文件>  与 --plan --plan-file 原计划一起重新规划
--full  选择完整资源集合
--binding-file <文件>  将插件 binding 纳入同一计划

预期结果:
输出可审阅计划；应用保存计划时重新核验当前输入。

下一步:
yss doctor --help；核对身份后用 lifecycle 查询当前入口。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples attach
```

### bundle

```text
yss 1.3.3 — bundle
──────────────────────
读取或导出完整固定 Bundle 与 manifest。

用法: yss bundle <子命令> --profile <Profile>

子命令:
export  导出 Bundle 全部 bytes、mode 和 manifest。
inspect  检查 Bundle 身份、来源及摘要。

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
无需项目或网络；公开资产接口供插件及构建消费者使用。

最小示例:
yss bundle inspect --profile spec --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--profile <spec|design|backend|frontend>  必需

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples bundle
```

### bundle export

```text
yss 1.3.3 — bundle export
──────────────────────
导出 Bundle 全部 bytes、mode 和 manifest。

用法: yss bundle export --profile <Profile> --out <新目录>

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
无需项目或网络；公开资产接口供插件及构建消费者使用。

最小示例:
yss bundle export --profile spec --out /tmp/yss-spec-bundle --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--profile <spec|design|backend|frontend>  必需
--out <新目录>  必需且不能已存在

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples bundle export
```

### bundle inspect

```text
yss 1.3.3 — bundle inspect
──────────────────────
检查 Bundle 身份、来源及摘要。

用法: yss bundle inspect --profile <Profile> [--json]

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
无需项目或网络；公开资产接口供插件及构建消费者使用。

最小示例:
yss bundle inspect --profile spec --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--profile <spec|design|backend|frontend>  必需
不支持 --out；只读

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples bundle inspect
```

### capabilities

```text
yss 1.3.3 — capabilities
──────────────────────
查看原生能力、治理接口与发行证据边界。

用法: yss capabilities [--json]

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
支持清单不等于某个平台已通过原生发行验收。

最小示例:
yss capabilities --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--json  输出机器可读能力清单

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples capabilities
```

### compat

```text
yss 1.3.3 — compat
──────────────────────
显式旧命令兼容适配。

用法: yss compat <旧命令> [参数]

子命令:
create-yss-harness-backend  固定旧别名的显式原生适配。
create-yss-harness-design  固定旧别名的显式原生适配。
create-yss-harness-frontend  固定旧别名的显式原生适配。
create-yss-spec  固定旧别名的显式原生适配。

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
仅维护已登记兼容行为；新增用户操作优先使用原生 yss 命令。未迁移行为返回明确错误，详见 compat/README.md。

最小示例:
yss compat create-yss-spec --help

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
旧命令: create-yss-spec / create-yss-harness-design / create-yss-harness-backend / create-yss-harness-frontend

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat
```

### compat create-yss-harness-backend

```text
yss 1.3.3 — compat create-yss-harness-backend
──────────────────────
固定旧别名的显式原生适配。

用法: yss compat create-yss-harness-backend --native <命令> [参数]

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
优先使用 yss doctor --root；兼容说明见 compat/README.md。

最小示例:
yss compat create-yss-harness-backend --native doctor --target-dir ./demo-backend --json

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--native  使用原生协议 1；其余旧成功行为可能返回 UNPORTED

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat create-yss-harness-backend
```

### compat create-yss-harness-design

```text
yss 1.3.3 — compat create-yss-harness-design
──────────────────────
固定旧别名的显式原生适配。

用法: yss compat create-yss-harness-design --native <命令> [参数]

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
优先使用 yss doctor --root；兼容说明见 compat/README.md。

最小示例:
yss compat create-yss-harness-design --native doctor --target-dir ./demo-design --json

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--native  使用原生协议 1；其余旧成功行为可能返回 UNPORTED

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat create-yss-harness-design
```

### compat create-yss-harness-frontend

```text
yss 1.3.3 — compat create-yss-harness-frontend
──────────────────────
固定旧别名的显式原生适配。

用法: yss compat create-yss-harness-frontend --native <命令> [参数]

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
优先使用 yss doctor --root；兼容说明见 compat/README.md。

最小示例:
yss compat create-yss-harness-frontend --native doctor --target-dir ./demo-frontend --json

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--native  使用原生协议 1；其余旧成功行为可能返回 UNPORTED

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat create-yss-harness-frontend
```

### compat create-yss-spec

```text
yss 1.3.3 — compat create-yss-spec
──────────────────────
固定旧别名的显式原生适配。

用法: yss compat create-yss-spec --native <命令> [参数]

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
优先使用 yss doctor --root；兼容说明见 compat/README.md。

最小示例:
yss compat create-yss-spec --native doctor --target-dir ./demo-spec --json

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--native  使用原生协议 1；其余旧成功行为可能返回 UNPORTED

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat create-yss-spec
```

### compat-api

```text
yss 1.3.3 — compat-api
──────────────────────
供现役 JavaScript 消费者使用的原生传输接口。

用法: yss compat-api <API标识>

子命令:
native.run  版本化兼容传输方法。
native.snapshot  版本化兼容传输方法。
projectDiff  版本化兼容传输方法。
projectDoctor  版本化兼容传输方法。
templateApply  版本化兼容传输方法。
templatePlan  版本化兼容传输方法。
toErrorEnvelope  版本化兼容传输方法。

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
调用形状见 compat/README.md；不复刻无人消费的私有 CommonJS API。

最小示例:
yss help compat-api

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
从 stdin 读取版本化请求 JSON

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat-api
```

### compat-api native.run

```text
yss 1.3.3 — compat-api native.run
──────────────────────
版本化兼容传输方法。

用法: yss compat-api native.run < request.json

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
请求形状见 compat/README.md；旧成功方法 projectDoctor/projectDiff/templatePlan/templateApply 返回 UNPORTED。

最小示例:
yss compat-api native.run < request.json

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
stdin  单个 JSON object，上限 4 MiB

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat-api native.run
```

### compat-api native.snapshot

```text
yss 1.3.3 — compat-api native.snapshot
──────────────────────
版本化兼容传输方法。

用法: yss compat-api native.snapshot < request.json

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
请求形状见 compat/README.md；旧成功方法 projectDoctor/projectDiff/templatePlan/templateApply 返回 UNPORTED。

最小示例:
yss compat-api native.snapshot < request.json

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
stdin  单个 JSON object，上限 4 MiB

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat-api native.snapshot
```

### compat-api projectDiff

```text
yss 1.3.3 — compat-api projectDiff
──────────────────────
版本化兼容传输方法。

用法: yss compat-api projectDiff < request.json

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
请求形状见 compat/README.md；旧成功方法 projectDoctor/projectDiff/templatePlan/templateApply 返回 UNPORTED。

最小示例:
yss compat-api projectDiff < request.json

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
stdin  单个 JSON object，上限 4 MiB

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat-api projectDiff
```

### compat-api projectDoctor

```text
yss 1.3.3 — compat-api projectDoctor
──────────────────────
版本化兼容传输方法。

用法: yss compat-api projectDoctor < request.json

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
请求形状见 compat/README.md；旧成功方法 projectDoctor/projectDiff/templatePlan/templateApply 返回 UNPORTED。

最小示例:
yss compat-api projectDoctor < request.json

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
stdin  单个 JSON object，上限 4 MiB

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat-api projectDoctor
```

### compat-api templateApply

```text
yss 1.3.3 — compat-api templateApply
──────────────────────
版本化兼容传输方法。

用法: yss compat-api templateApply < request.json

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
请求形状见 compat/README.md；旧成功方法 projectDoctor/projectDiff/templatePlan/templateApply 返回 UNPORTED。

最小示例:
yss compat-api templateApply < request.json

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
stdin  单个 JSON object，上限 4 MiB

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat-api templateApply
```

### compat-api templatePlan

```text
yss 1.3.3 — compat-api templatePlan
──────────────────────
版本化兼容传输方法。

用法: yss compat-api templatePlan < request.json

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
请求形状见 compat/README.md；旧成功方法 projectDoctor/projectDiff/templatePlan/templateApply 返回 UNPORTED。

最小示例:
yss compat-api templatePlan < request.json

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
stdin  单个 JSON object，上限 4 MiB

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat-api templatePlan
```

### compat-api toErrorEnvelope

```text
yss 1.3.3 — compat-api toErrorEnvelope
──────────────────────
版本化兼容传输方法。

用法: yss compat-api toErrorEnvelope < request.json

前置条件:
固定历史别名或已登记的原生传输请求；保留旧接口的兼容边界。
请求形状见 compat/README.md；旧成功方法 projectDoctor/projectDiff/templatePlan/templateApply 返回 UNPORTED。

最小示例:
yss compat-api toErrorEnvelope < request.json

参数:
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --json                          执行结果输出 JSON；帮助始终输出文本
  --native <值>                   按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
stdin  单个 JSON object，上限 4 MiB

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples compat-api toErrorEnvelope
```

### context

```text
yss 1.3.3 — context
──────────────────────
查询或校验唯一 CONTEXT.md 及词汇快照。

用法: yss context <子命令> --root <目录>

子命令:
check  校验词汇结构。
query  查询稳定词汇。
verify  校验当前词汇和可选快照。

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。
合法 schema v1 模板源可只读校验；check/verify 返回 context_snapshot，不创建批准。

最小示例:
yss context verify --root ./demo-spec --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples context
```

### context check

```text
yss 1.3.3 — context check
──────────────────────
校验词汇结构。

用法: yss context check --root <目录> [--file <文件>]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。
合法 schema v1 模板源可只读校验；check/verify 返回 context_snapshot，不创建批准。

最小示例:
yss context check --root ./demo-spec --json

参数:
  --allowed-context-ids <值>      按当前命令说明指定
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --snapshot <路径>               文件或目录路径
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --term-refs <值>                按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--file / --snapshot  可选快照

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples context check
```

### context query

```text
yss 1.3.3 — context query
──────────────────────
查询稳定词汇。

用法: yss context query --root <目录> [--id <术语ID>]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。
合法 schema v1 模板源可只读校验；check/verify 返回 context_snapshot，不创建批准。

最小示例:
yss context query --root ./demo-spec --json

参数:
  --allowed-context-ids <值>      按当前命令说明指定
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --term-refs <值>                按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--id / --term-refs  选择术语
--allowed-context-ids  限定责任区

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples context query
```

### context verify

```text
yss 1.3.3 — context verify
──────────────────────
校验当前词汇和可选快照。

用法: yss context verify --root <目录> [--snapshot <文件>]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。
合法 schema v1 模板源可只读校验；check/verify 返回 context_snapshot，不创建批准。

最小示例:
yss context verify --root ./demo-spec --json

参数:
  --allowed-context-ids <值>      按当前命令说明指定
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --snapshot <路径>               文件或目录路径
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --term-refs <值>                按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--snapshot / --file  待验快照
--term-refs / --allowed-context-ids  独立消费范围

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples context verify
```

### contract

```text
yss 1.3.3 — contract
──────────────────────
校验 contract 的结构或原生领域语义。

用法: yss contract <子命令> --root <目录>

子命令:
check  执行显式 Schema 结构校验。
verify  执行当前领域规则和独立消费者绑定校验。

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss contract verify --root ./demo-spec --kind scaffold --file docs/scaffold.json --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples contract
```

### contract check

```text
yss 1.3.3 — contract check
──────────────────────
执行显式 Schema 结构校验。

用法: yss contract check --root <目录> --file <文件> --schema <Schema>

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
示例文件需按对应 Schema 先创建。结构校验不替代领域 verify。

最小示例:
yss contract check --root ./demo-spec --file .template-spec/process/lifecycle-registry.yaml --schema .template-spec/process/schemas/lifecycle-registry.schema.json --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --schema <路径>                 文件或目录路径
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--file  待验资产
--schema  项目本地 Schema

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples contract check
```

### contract verify

```text
yss 1.3.3 — contract verify
──────────────────────
执行当前领域规则和独立消费者绑定校验。

用法: yss contract verify --root <目录> --kind <类型> [--file <文件>]

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss contract verify --root ./demo-spec --kind scaffold --file docs/scaffold.json --json

参数:
  --approval-ref <值>             按当前命令说明指定
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --history                       布尔开关，可使用 =true 或 =false；默认 false
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --kind <类型>                   当前命令的领域类型；runtime begin 默认 command；可选值: slice|scaffold|task|frontend-delivery
  --phase <值>                    按当前命令说明指定；可选值: preflight|design|contract|inputs|implementation|verification
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --run-dir <路径>                文件或目录路径
  --slice <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --template-checkout <路径>      文件或目录路径
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  --unit <值>                     按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--kind <slice|scaffold|task|frontend-delivery>
--file / --checkpoint  资产与独立消费期待
--approval-ref / --unit  slice；frontend-delivery 的 --unit 限批准的前端工作单元
--slice / --phase  仅 frontend-delivery；本地输入 --file 与 --checkpoint 指同一当前 checkpoint
--phase <preflight|design|contract|inputs|implementation|verification>  准备阶段不授实现资格
--history  仅 task；历史结构不授予当前放行
--home / --run-dir / --tool-root / --template-checkout  固定依赖来源

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples contract verify
```

### diff

```text
yss 1.3.3 — diff
──────────────────────
查看当前文件相对固定模板的差异和同步计划。

用法: yss diff --root <目录> [--profile <Profile>] [--json]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
只读。旧实例需要显式 migrate；遇到业务定制先查看诊断。

最小示例:
yss diff --root ./demo-spec --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
根据实际诊断选择计划、恢复或迁移入口；应用后再 doctor/diff。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples diff
```

### doctor

```text
yss 1.3.3 — doctor
──────────────────────
检查项目身份、受管基线和冲突。

用法: yss doctor --root <目录> [--profile <Profile>] [--json]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
只读。旧实例需要显式 migrate；遇到业务定制先查看诊断。

最小示例:
yss doctor --root ./demo-spec --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
根据实际诊断选择计划、恢复或迁移入口；应用后再 doctor/diff。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples doctor
```

### evidence

```text
yss 1.3.3 — evidence
──────────────────────
校验 evidence 的结构或原生领域语义。

用法: yss evidence <子命令> --root <目录>

子命令:
check  执行显式 Schema 结构校验。
verify  执行当前领域规则和独立消费者绑定校验。

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss evidence verify --root ./demo-spec --kind verification --file docs/verification.json --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples evidence
```

### evidence check

```text
yss 1.3.3 — evidence check
──────────────────────
执行显式 Schema 结构校验。

用法: yss evidence check --root <目录> --file <文件> --schema <Schema>

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
示例文件需按对应 Schema 先创建。结构校验不替代领域 verify。

最小示例:
yss evidence check --root ./demo-spec --file .template-spec/process/lifecycle-registry.yaml --schema .template-spec/process/schemas/lifecycle-registry.schema.json --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --schema <路径>                 文件或目录路径
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--file  待验资产
--schema  项目本地 Schema

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples evidence check
```

### evidence verify

```text
yss 1.3.3 — evidence verify
──────────────────────
执行当前领域规则和独立消费者绑定校验。

用法: yss evidence verify --root <目录> --kind <类型> [--file <文件>]

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss evidence verify --root ./demo-spec --kind verification --file docs/verification.json --json

参数:
  --approval-ref <值>             按当前命令说明指定
  --boundary <值>                 按当前命令说明指定
  --checkpoint <路径>             文件或目录路径
  --continuation                  布尔开关，可使用 =true 或 =false；默认 false
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  --gate <值>                     按当前命令说明指定
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --history                       布尔开关，可使用 =true 或 =false；默认 false
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --kind <类型>                   当前命令的领域类型；runtime begin 默认 command；可选值: approval|user-decision|verification
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --require-approved              布尔开关，可使用 =true 或 =false；默认 false
  --requirements <路径>           文件或目录路径
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --run-dir <路径>                文件或目录路径
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --task <路径>                   文件或目录路径
  --template-checkout <路径>      文件或目录路径
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--kind <approval|user-decision|verification>
--file / --checkpoint / --task  资产与独立消费期待
--gate / --boundary / --require-approved / --history  仅 approval
--requirements / --continuation  仅 user-decision
--approval-ref  仅 verification
--home / --run-dir / --tool-root / --template-checkout  固定依赖来源

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples evidence verify
```

### handoff

```text
yss 1.3.3 — handoff
──────────────────────
校验 handoff 的结构或原生领域语义。

用法: yss handoff <子命令> --root <目录>

子命令:
check  执行显式 Schema 结构校验。
export  导出当前已批准的 Spec 基线及来源证据。
import  将批准 Spec 基线接入独立 Design。
verify  执行当前领域规则和独立消费者绑定校验。

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss handoff verify --root ./demo-spec --kind package --package docs/handoff --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples handoff
```

### handoff check

```text
yss 1.3.3 — handoff check
──────────────────────
执行显式 Schema 结构校验。

用法: yss handoff check --root <目录> --file <文件> --schema <Schema>

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
示例文件需按对应 Schema 先创建。结构校验不替代领域 verify。

最小示例:
yss handoff check --root ./demo-spec --file .template-spec/process/lifecycle-registry.yaml --schema .template-spec/process/schemas/lifecycle-registry.schema.json --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --schema <路径>                 文件或目录路径
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--file  待验资产
--schema  项目本地 Schema

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples handoff check
```

### handoff export

```text
yss 1.3.3 — handoff export
──────────────────────
导出当前已批准的 Spec 基线及来源证据。

用法: yss handoff export --root <Spec工程> --kind spec-baseline --checkpoint <当前检查点> --out <新目录>

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
保留源批准、业务票稳定 ID 和原始字节摘要；导出不会推进源阶段。

最小示例:
yss handoff export --root ./spec --kind spec-baseline --checkpoint .work/feature/checkpoint.yaml --out /tmp/spec-baseline

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --kind <类型>                   当前命令的领域类型；runtime begin 默认 command；可选值: spec-baseline
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --package <路径>                文件或目录路径
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--kind spec-baseline
--checkpoint <文件>
--out <新目录>

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples handoff export
```

### handoff import

```text
yss 1.3.3 — handoff import
──────────────────────
将批准 Spec 基线接入独立 Design。

用法: yss handoff import --root <Design工程> --kind spec-baseline --package <目录包> --plan --out <新计划>

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
初始化与导入分别保存计划、分别执行事务。完成目标 Context 对账及接入核验后由主控登记当前工作。

最小示例:
yss handoff import --root ./design --kind spec-baseline --package /tmp/spec-baseline --plan --out /tmp/spec-import.json
yss handoff import --root ./design --kind spec-baseline --apply --plan-file /tmp/spec-import.json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --kind <类型>                   当前命令的领域类型；runtime begin 默认 command；可选值: spec-baseline
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --package <路径>                文件或目录路径
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--kind spec-baseline
--package <目录包>
--plan --out <新文件>  生成保存计划，输出文件必须不存在
--apply --plan-file <文件>  应用保存计划；输入变化时拒绝

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples handoff import
```

### handoff verify

```text
yss 1.3.3 — handoff verify
──────────────────────
执行当前领域规则和独立消费者绑定校验。

用法: yss handoff verify --root <目录> --kind <类型> [--file <文件>]

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss handoff verify --root ./demo-spec --kind package --package docs/handoff --json

参数:
  --checkpoint <路径>             文件或目录路径
  --consumer <值>                 按当前命令说明指定
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --kind <类型>                   当前命令的领域类型；runtime begin 默认 command；可选值: package|consumption|spec-baseline
  --package <路径>                文件或目录路径
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --run-dir <路径>                文件或目录路径
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --template-checkout <路径>      文件或目录路径
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--kind <package|consumption|spec-baseline>
--file / --checkpoint  资产与独立消费期待
--package  package 包或 spec-baseline 基线包；spec-baseline 的 --package 与 --file 互斥
--consumer  仅 consumption
--home / --run-dir / --tool-root / --template-checkout  固定依赖来源

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples handoff verify
```

### init

```text
yss 1.3.3 — init
──────────────────────
创建固定模板来源的项目实例。

用法: yss init --profile <spec|design|backend|frontend> --root <目录> [--project-name <名称>]

前置条件:
选择一个 Profile 和不存在或空的新目录；需要审阅写范围时先 --plan --out，再应用保存计划。
拒绝覆盖用户文件；初始化使用程序内置 Bundle，无需 Node/Python 或网络。已有工程请先查看 yss attach --help。

最小示例:
yss init --profile spec --root ./demo-spec --project-name 演示项目
yss init --profile design --root ./demo-design --plan --out /tmp/yss-init-plan.json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--profile       必需，选择四类模板之一
--root          项目目录；默认当前目录，推荐显式指定新目录
--project-name  项目名称
--business-domain / --team-size  模板变量
--full          安装该 Profile 的完整资源，默认初始分发集合
--plan --out <新文件>  只生成计划；默认直接初始化
--apply --plan-file <文件>  应用已保存计划
--issue-tracker <local-markdown|github|gitlab>  Spec Tracker 配置

预期结果:
形成所选 Profile 的项目身份与受管基线；--plan 模式只生成计划。

下一步:
yss doctor --help；核对身份后用 lifecycle 查询当前入口。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples init
```

### lifecycle

```text
yss 1.3.3 — lifecycle
──────────────────────
查询当前生命周期、配置本次推进目标并核验门禁。

用法: yss lifecycle <子命令> --root <目录>

子命令:
query  查询注册表中的稳定 ID。
route  只读判定日常或正式交付路径。
status  只读核验 checkpoint、本次目标与显式消费者的当前证据。
target  读取或事务设置 Spec 单功能的本次推进目标。
verify  核验当前 checkpoint 的领域门禁。
verify-daily  核验同一日常任务的当前差异、测试和独立审查。

前置条件:
查询注册表需项目身份；状态/verify 消费当前 checkpoint；daily 接口需同一任务、已确认实现仓和完整基线。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。
新正式 Spec 默认推进到 business-accepted；先完成 Spec 或设计时，用 target 保存本次目标，后续仍由生命周期 Skill 推进。

最小示例:
yss lifecycle query --root ./demo-spec --id work-unit.entry-triage --json

参数:
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples lifecycle
```

### lifecycle query

```text
yss 1.3.3 — lifecycle query
──────────────────────
查询注册表中的稳定 ID。

用法: yss lifecycle query --root <目录> [--id <ID>]

前置条件:
查询注册表需项目身份；状态/verify 消费当前 checkpoint；daily 接口需同一任务、已确认实现仓和完整基线。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。
新正式 Spec 默认推进到 business-accepted；先完成 Spec 或设计时，用 target 保存本次目标，后续仍由生命周期 Skill 推进。

最小示例:
yss lifecycle query --root ./demo-spec --id work-unit.entry-triage --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --stage <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目
  --work-unit <值>                按当前命令说明指定

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--id / --work-unit / --stage  选择注册对象

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples lifecycle query
```

### lifecycle route

```text
yss 1.3.3 — lifecycle route
──────────────────────
只读判定日常或正式交付路径。

用法: yss lifecycle route --root <目录> --task <Markdown> --implementation-root <Git根> --base <完整SHA>

前置条件:
查询注册表需项目身份；状态/verify 消费当前 checkpoint；daily 接口需同一任务、已确认实现仓和完整基线。
只支持已启用对应政策的 Spec 实例；其他 Profile 不支持日常路径。已有正式任务不得降级。

最小示例:
yss lifecycle route --root ./demo-spec --task docs/daily-task.md --implementation-root /path/implementation --base "<完整40位SHA>" --json

参数:
  --base <完整SHA>                已确认实现仓的完整 Git 基线
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --implementation-root <路径>    文件或目录路径
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --task <路径>                   文件或目录路径
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--task  同一任务的需求、验收及证据
--implementation-root  已确认实现仓 Git 根
--base  完整40位基线 SHA；不接受缩写

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples lifecycle route
```

### lifecycle status

```text
yss 1.3.3 — lifecycle status
──────────────────────
只读核验 checkpoint、本次目标与显式消费者的当前证据。

用法: yss lifecycle status --root <目录> --checkpoint <文件>

前置条件:
查询注册表需项目身份；状态/verify 消费当前 checkpoint；daily 接口需同一任务、已确认实现仓和完整基线。
查询不写入、不启动实现或业务测试。达到短目标仍保留 checkpoint.next_work_unit；next_action 不是执行授权。旧实例未启用目标政策时保留旧行为，须显式 sync 后核验能力。

最小示例:
yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json

参数:
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--checkpoint / --file  当前 checkpoint
progression  本次目标及本端职责/整体业务完成结论
coordination  显式同功能消费者的当前来源、接收及交付
next_action  承接者、工程、工作单元和等待原因

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss help tutorial spec；达到本次目标后停止下游写入，续推重新 plan/apply 目标并由生命周期 Skill 核验真实 next_work_unit。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples lifecycle status
```

### lifecycle target

```text
yss 1.3.3 — lifecycle target
──────────────────────
读取或事务设置 Spec 单功能的本次推进目标。

用法: yss lifecycle target --root <目录> --checkpoint <文件> [--plan --input <JSON> --out <新计划>] 或 --apply --plan-file <原计划>

前置条件:
当前实例具备 lifecycle-target-v1 政策；Tracker/map 唯一登记当前功能 checkpoint。写目标仅限 Spec，输入 JSON 必须绑定同一 feature/checkpoint。
新正式 Spec 默认 business-accepted；plan-to-backend 的职责上限只允许前三目标。仅支持 lifecycle-target-v1 政策的 Spec 主控可写；专职只读 profile-terminal 不是可写枚举。写入仅限 progression-target.json 及必要事务记录，不改 checkpoint、批准、冻结包或 Receipt，不授 ready-for-agent。达到目标后停止本次下游写入，保留真实 next_work_unit；续推修改 JSON target/intent_source，再 plan/apply 并重验，从首个合法未完成工作单元继续。能力缺失的旧原生实例先显式 sync；帮助教程见 yss help tutorial spec。草稿使用已有忽略规则覆盖的功能 tmp 目录，不自动添加 ignore。

最小示例:
yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --input .work/feature/tmp/target-input.json --plan --out /tmp/target-plan.json --json
yss lifecycle target --root ./demo-spec --apply --plan-file /tmp/target-plan.json --json
yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --input <值>                    按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
无 plan/apply：只读核验目标、显式交接与完成依据
--checkpoint  Tracker/map 唯一登记的当前功能 checkpoint
--input  项目内 JSON：schema_version、kind、feature_id、checkpoint_ref、target、intent_source、consumers
JSON target 五选一：spec-approved / product-design-completed / backend-deliverable / frontend-accepted / business-accepted
consumers  本地推进用 []；独立专职端显式给 profile、绝对 root、同功能 checkpoint_ref，每种 Profile 最多一个
--plan --out  保存新计划；输入草稿保留到 apply 完成，计划建议放工程外
--apply --plan-file  仅消费原保存计划；不要同时传 checkpoint/input/plan/out

预期结果:
查询只读返回本次目标、显式消费者及当前证据；plan 保存意图配置计划，apply 重验原计划后仅写目标和必要事务记录，不创建批准或执行实现。

下一步:
yss help tutorial spec；达到本次目标后停止下游写入，续推重新 plan/apply 目标并由生命周期 Skill 核验真实 next_work_unit。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples lifecycle target
```

### lifecycle verify

```text
yss 1.3.3 — lifecycle verify
──────────────────────
核验当前 checkpoint 的领域门禁。

用法: yss lifecycle verify --root <目录> --checkpoint <文件>

前置条件:
查询注册表需项目身份；状态/verify 消费当前 checkpoint；daily 接口需同一任务、已确认实现仓和完整基线。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。
新正式 Spec 默认推进到 business-accepted；先完成 Spec 或设计时，用 target 保存本次目标，后续仍由生命周期 Skill 推进。

最小示例:
yss lifecycle verify --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json

参数:
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --history                       布尔开关，可使用 =true 或 =false；默认 false
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --run-dir <路径>                文件或目录路径
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --template-checkout <路径>      文件或目录路径
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--checkpoint / --file  当前 checkpoint
--history  仅历史结构，不授予当前放行
--home / --run-dir / --tool-root / --template-checkout  独立依赖来源

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples lifecycle verify
```

### lifecycle verify-daily

```text
yss 1.3.3 — lifecycle verify-daily
──────────────────────
核验同一日常任务的当前差异、测试和独立审查。

用法: yss lifecycle verify-daily --root <目录> --task <Markdown> --implementation-root <Git根> --base <完整SHA>

前置条件:
查询注册表需项目身份；状态/verify 消费当前 checkpoint；daily 接口需同一任务、已确认实现仓和完整基线。
只支持已启用对应政策的 Spec 实例；其他 Profile 不支持日常路径。已有正式任务不得降级。

最小示例:
yss lifecycle verify-daily --root ./demo-spec --task docs/daily-task.md --implementation-root /path/implementation --base "<完整40位SHA>" --json

参数:
  --base <完整SHA>                已确认实现仓的完整 Git 基线
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --implementation-root <路径>    文件或目录路径
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --task <路径>                   文件或目录路径
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--task  同一任务的需求、验收及证据
--implementation-root  已确认实现仓 Git 根
--base  完整40位基线 SHA；不接受缩写

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples lifecycle verify-daily
```

### migrate

```text
yss 1.3.3 — migrate
──────────────────────
显式迁移旧实例 metadata、受管基线及 binding。

用法: yss migrate <子命令> --root <目录>

子命令:
apply  应用迁移计划。
plan  生成只读迁移计划（默认动作）。
recover  恢复未完成迁移事务。
rollback  恢复迁移前实例。
status  查询迁移事务。

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
旧未完成事务先由仓外固定旧执行器恢复；原 metadata 字节进入回退材料。

最小示例:
yss migrate plan --root ./old-project --out /tmp/yss-migrate-plan.json --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --base-bundle <路径>            显式提供完整历史 Bundle 材料；默认离线
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --migration-kind <类型>         工作包目录迁移；缺省保持模板迁移；可选值: work-layout
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --resolution-file <文件>        结合 --plan-file 原计划重新规划已决议资产
  --review-out <新目录>           在项目外导出冲突、基线、合并候选和决议模板
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
根据实际诊断选择计划、恢复或迁移入口；应用后再 doctor/diff。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples migrate
```

### migrate apply

```text
yss 1.3.3 — migrate apply
──────────────────────
应用迁移计划。

用法: yss migrate apply --root <目录> --plan-file <文件>

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
旧未完成事务先由仓外固定旧执行器恢复；原 metadata 字节进入回退材料。

最小示例:
yss migrate apply --root ./old-project --plan-file /tmp/yss-migrate-plan.json --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--plan-file <文件>  必需；身份、基线与 binding 同一事务

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
根据实际诊断选择计划、恢复或迁移入口；应用后再 doctor/diff。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples migrate apply
```

### migrate plan

```text
yss 1.3.3 — migrate plan
──────────────────────
生成只读迁移计划（默认动作）。

用法: yss migrate plan --root <目录> --out <新文件>

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
旧未完成事务先由仓外固定旧执行器恢复；原 metadata 字节进入回退材料。

最小示例:
yss migrate plan --root ./old-project --out /tmp/yss-migrate-plan.json --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --base-bundle <路径>            显式提供完整历史 Bundle 材料；默认离线
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --migration-kind <类型>         工作包目录迁移；缺省保持模板迁移；可选值: work-layout
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --resolution-file <文件>        结合 --plan-file 原计划重新规划已决议资产
  --review-out <新目录>           在项目外导出冲突、基线、合并候选和决议模板
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--out <新文件>  保存迁移计划

预期结果:
输出可审阅计划；应用保存计划时重新核验当前输入。

下一步:
根据实际诊断选择计划、恢复或迁移入口；应用后再 doctor/diff。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples migrate plan
```

### migrate recover

```text
yss 1.3.3 — migrate recover
──────────────────────
恢复未完成迁移事务。

用法: yss migrate recover --root <目录> [--json]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
旧未完成事务先由仓外固定旧执行器恢复；原 metadata 字节进入回退材料。

最小示例:
yss migrate recover --root ./old-project --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
仅消费项目迁移范围

预期结果:
显示所属事务及实际恢复结果；按子命令标明的只读/写入语义执行。

下一步:
根据实际诊断选择计划、恢复或迁移入口；应用后再 doctor/diff。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples migrate recover
```

### migrate rollback

```text
yss 1.3.3 — migrate rollback
──────────────────────
恢复迁移前实例。

用法: yss migrate rollback --root <目录> [--json]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
旧未完成事务先由仓外固定旧执行器恢复；原 metadata 字节进入回退材料。

最小示例:
yss migrate rollback --root ./old-project --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
最近成功迁移，拒绝覆盖后续用户修改

预期结果:
显示所属事务及实际恢复结果；按子命令标明的只读/写入语义执行。

下一步:
根据实际诊断选择计划、恢复或迁移入口；应用后再 doctor/diff。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples migrate rollback
```

### migrate status

```text
yss 1.3.3 — migrate status
──────────────────────
查询迁移事务。

用法: yss migrate status --root <目录> [--json]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
旧未完成事务先由仓外固定旧执行器恢复；原 metadata 字节进入回退材料。

最小示例:
yss migrate status --root ./old-project --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
只读查询

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
根据实际诊断选择计划、恢复或迁移入口；应用后再 doctor/diff。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples migrate status
```

### profile

```text
yss 1.3.3 — profile
──────────────────────
准备独立的下游 Profile 工程并登记显式关联。

用法: yss profile <子命令> --root <源工程>

子命令:
prepare  生成或执行单端、联合初始化保存计划。

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
已有普通工程使用 attach；关联回退不回退下游工程。

最小示例:
yss profile prepare --root ./design --backend-root ./backend --frontend-root ./frontend --plan --out /tmp/delivery-prepare.json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --backend-root <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --checkpoint <路径>             文件或目录路径
  --design-root <路径>            文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --frontend-root <路径>          文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples profile
```

### profile prepare

```text
yss 1.3.3 — profile prepare
──────────────────────
生成或执行单端、联合初始化保存计划。

用法: yss profile prepare --root <源工程> [--design-root <目录>] [--backend-root <目录>] [--frontend-root <目录>] --plan --out <新文件>

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
全部目标预检后登记关联，再依次初始化；失败保留已成功工程，按原计划重试剩余步骤。初始化不授予阶段实施资格。

最小示例:
yss profile prepare --root ./spec --design-root ./design --plan --out /tmp/design-prepare.json
yss profile prepare --root ./design --backend-root ./backend --frontend-root ./frontend --plan --out /tmp/delivery-prepare.json
yss profile prepare --root ./design --apply --plan-file /tmp/delivery-prepare.json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --backend-root <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --checkpoint <路径>             文件或目录路径
  --design-root <路径>            文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --frontend-root <路径>          文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--plan --out <新文件>  生成保存计划，输出文件必须不存在
--apply --plan-file <文件>  应用保存计划；输入变化时拒绝
--checkpoint <文件>  可选，绑定当前工作及来源证据

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples profile prepare
```

### project-ci

```text
yss 1.3.3 — project-ci
──────────────────────
核验或配置项目 CI。

用法: yss project-ci <子命令> --root <目录>

子命令:
apply  应用有限原生 CI 保存计划。
check  核验完整治理或显式有限 CI。
install  生成有限原生 CI 安装计划。
plan  生成有限原生 CI 安装计划。
transition  核验工作单元流转条件。
verify  按完整 Git 基线核验 CI。

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss project-ci check --root ./demo-spec --runtime-store off --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples project-ci
```

### project-ci apply

```text
yss 1.3.3 — project-ci apply
──────────────────────
应用有限原生 CI 保存计划。

用法: yss project-ci apply --root <目录> --scope native-go --plan-file <文件>

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss project-ci apply --root ./demo-spec --scope native-go --plan-file docs/ci-plan.json --json

参数:
  --additional-path <值>          按当前命令说明指定
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --base <完整SHA>                已确认实现仓的完整 Git 基线
  --branch <值>                   按当前命令说明指定
  --checkpoint <路径>             文件或目录路径
  --cli-source <路径>             文件或目录路径
  --current-work-unit <值>        按当前命令说明指定
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --next-work-unit <值>           按当前命令说明指定
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --provider <提供方>             CI 提供方，默认 github；可选值: github
  --recover                       布尔开关，可使用 =true 或 =false；默认 false
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --run-dir <路径>                文件或目录路径
  --runtime-store <值>            按当前命令说明指定
  --scope <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --task <路径>                   文件或目录路径
  --template-checkout <路径>      文件或目录路径
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--scope native-go  必需
--plan-file  项目内原始写入计划

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples project-ci apply
```

### project-ci check

```text
yss 1.3.3 — project-ci check
──────────────────────
核验完整治理或显式有限 CI。

用法: yss project-ci check --root <目录> [--scope native-go]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
有限通过不代表完整治理通过。

最小示例:
yss project-ci check --root ./demo-spec --runtime-store off --json

参数:
  --additional-path <值>          按当前命令说明指定
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --base <完整SHA>                已确认实现仓的完整 Git 基线
  --branch <值>                   按当前命令说明指定
  --checkpoint <路径>             文件或目录路径
  --cli-source <路径>             文件或目录路径
  --current-work-unit <值>        按当前命令说明指定
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --next-work-unit <值>           按当前命令说明指定
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --provider <提供方>             CI 提供方，默认 github；可选值: github
  --recover                       布尔开关，可使用 =true 或 =false；默认 false
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --run-dir <路径>                文件或目录路径
  --runtime-store <值>            按当前命令说明指定
  --scope <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --task <路径>                   文件或目录路径
  --template-checkout <路径>      文件或目录路径
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--scope native-go  有限原生检查；默认完整治理
--runtime-store off  当前完整治理支持的存储模式
--checkpoint / --task  追加当前消费入口

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples project-ci check
```

### project-ci install

```text
yss 1.3.3 — project-ci install
──────────────────────
生成有限原生 CI 安装计划。

用法: yss project-ci install --root <目录> --scope native-go --cli-source <路径> [--provider github]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
先准备项目内 vendor/yss-cli 固定源码；路径示例不会自动取得源码。有限 CI 不替代完整治理；保存原始计划时不加 --json。

最小示例:
yss project-ci install --root ./demo-spec --scope native-go --cli-source vendor/yss-cli > ./demo-spec/docs/ci-plan.json
yss project-ci apply --root ./demo-spec --scope native-go --plan-file docs/ci-plan.json --json

参数:
  --additional-path <值>          按当前命令说明指定
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --base <完整SHA>                已确认实现仓的完整 Git 基线
  --branch <值>                   按当前命令说明指定
  --checkpoint <路径>             文件或目录路径
  --cli-source <路径>             文件或目录路径
  --current-work-unit <值>        按当前命令说明指定
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --next-work-unit <值>           按当前命令说明指定
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --provider <提供方>             CI 提供方，默认 github；可选值: github
  --recover                       布尔开关，可使用 =true 或 =false；默认 false
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --run-dir <路径>                文件或目录路径
  --runtime-store <值>            按当前命令说明指定
  --scope <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --task <路径>                   文件或目录路径
  --template-checkout <路径>      文件或目录路径
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--scope native-go  必需
--provider github  当前唯一支持的 provider，默认 github
--branch  默认项目配置分支或 main
--cli-source  必需；项目内已存在的固定 Go CLI 源码目录
--additional-path  CI 补充路径
默认只输出计划；--apply --plan-file 应用保存计划

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples project-ci install
```

### project-ci plan

```text
yss 1.3.3 — project-ci plan
──────────────────────
生成有限原生 CI 安装计划。

用法: yss project-ci plan --root <目录> --scope native-go --cli-source <路径> [--provider github]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
先准备项目内 vendor/yss-cli 固定源码；路径示例不会自动取得源码。有限 CI 不替代完整治理；保存原始计划时不加 --json。

最小示例:
yss project-ci plan --root ./demo-spec --scope native-go --cli-source vendor/yss-cli > ./demo-spec/docs/ci-plan.json
yss project-ci apply --root ./demo-spec --scope native-go --plan-file docs/ci-plan.json --json

参数:
  --additional-path <值>          按当前命令说明指定
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --base <完整SHA>                已确认实现仓的完整 Git 基线
  --branch <值>                   按当前命令说明指定
  --checkpoint <路径>             文件或目录路径
  --cli-source <路径>             文件或目录路径
  --current-work-unit <值>        按当前命令说明指定
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --next-work-unit <值>           按当前命令说明指定
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --provider <提供方>             CI 提供方，默认 github；可选值: github
  --recover                       布尔开关，可使用 =true 或 =false；默认 false
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --run-dir <路径>                文件或目录路径
  --runtime-store <值>            按当前命令说明指定
  --scope <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --task <路径>                   文件或目录路径
  --template-checkout <路径>      文件或目录路径
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--scope native-go  必需
--provider github  当前唯一支持的 provider，默认 github
--branch  默认项目配置分支或 main
--cli-source  必需；项目内已存在的固定 Go CLI 源码目录
--additional-path  CI 补充路径
默认只输出计划；--apply --plan-file 应用保存计划

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples project-ci plan
```

### project-ci transition

```text
yss 1.3.3 — project-ci transition
──────────────────────
核验工作单元流转条件。

用法: yss project-ci transition --root <目录> --scope native-go --checkpoint <文件> [--next-work-unit <ID>]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
仅核验已存在的当前门禁，不创建批准、不自动推进工作单元。

最小示例:
yss project-ci transition --root ./demo-spec --scope native-go --checkpoint .work/feature/checkpoint.yaml --json

参数:
  --additional-path <值>          按当前命令说明指定
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --base <完整SHA>                已确认实现仓的完整 Git 基线
  --branch <值>                   按当前命令说明指定
  --checkpoint <路径>             文件或目录路径
  --cli-source <路径>             文件或目录路径
  --current-work-unit <值>        按当前命令说明指定
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --next-work-unit <值>           按当前命令说明指定
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --provider <提供方>             CI 提供方，默认 github；可选值: github
  --recover                       布尔开关，可使用 =true 或 =false；默认 false
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --run-dir <路径>                文件或目录路径
  --runtime-store <值>            按当前命令说明指定
  --scope <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --task <路径>                   文件或目录路径
  --template-checkout <路径>      文件或目录路径
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--scope native-go  必需
--checkpoint / --file  当前 checkpoint
--current-work-unit / --next-work-unit  默认读取 checkpoint

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples project-ci transition
```

### project-ci verify

```text
yss 1.3.3 — project-ci verify
──────────────────────
按完整 Git 基线核验 CI。

用法: yss project-ci verify --root <目录> --base <完整SHA>

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss project-ci verify --root ./demo-spec --base "<完整40位SHA>" --runtime-store off --json

参数:
  --additional-path <值>          按当前命令说明指定
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --base <完整SHA>                已确认实现仓的完整 Git 基线
  --branch <值>                   按当前命令说明指定
  --checkpoint <路径>             文件或目录路径
  --cli-source <路径>             文件或目录路径
  --current-work-unit <值>        按当前命令说明指定
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --next-work-unit <值>           按当前命令说明指定
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --provider <提供方>             CI 提供方，默认 github；可选值: github
  --recover                       布尔开关，可使用 =true 或 =false；默认 false
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --run-dir <路径>                文件或目录路径
  --runtime-store <值>            按当前命令说明指定
  --scope <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --task <路径>                   文件或目录路径
  --template-checkout <路径>      文件或目录路径
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--base  实现仓完整基线 SHA
--runtime-store off
--checkpoint / --task  追加当前消费入口

预期结果:
返回当前范围的逐项检查与诊断；仅在当前检查通过时得到通过结论。核验不执行业务测试或创建批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples project-ci verify
```

### recover

```text
yss 1.3.3 — recover
──────────────────────
查询或恢复未完成的项目事务。

用法: yss recover --root <目录> [--apply]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
程序安装事务使用 yss update recover --tool-root <目录>。

最小示例:
yss recover --root ./demo-spec --json
yss recover --root ./demo-spec --apply --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--apply  执行保护性恢复；默认只查询

预期结果:
显示所属事务及实际恢复结果；按子命令标明的只读/写入语义执行。

下一步:
根据实际诊断选择计划、恢复或迁移入口；应用后再 doctor/diff。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples recover
```

### rollback

```text
yss 1.3.3 — rollback
──────────────────────
查询或整体回退最近一次成功项目事务。

用法: yss rollback --root <目录> [--apply]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
后续用户修改会阻止覆盖。程序版本回退使用 yss update rollback。

最小示例:
yss rollback --root ./demo-spec --json
yss rollback --root ./demo-spec --apply --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--apply  执行回退；默认只查询

预期结果:
显示所属事务及实际恢复结果；按子命令标明的只读/写入语义执行。

下一步:
根据实际诊断选择计划、恢复或迁移入口；应用后再 doctor/diff。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples rollback
```

### runtime

```text
yss 1.3.3 — runtime
──────────────────────
管理独立运行记录与保护标记。

用法: yss runtime <子命令> --root <目录>

子命令:
begin  创建运行记录并返回所有权 token。
commands  只读查询运行记录。
complete  以实际退出码结束运行记录。
event  追加运行事件。
events  只读查询运行记录。
inspect  只读查询运行记录。
pin  维护运行记录保护标记。
pins  只读查询运行记录。
run  只读查询运行记录。
unpin  维护运行记录保护标记。

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss runtime inspect --root ./demo-spec --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples runtime
```

### runtime begin

```text
yss 1.3.3 — runtime begin
──────────────────────
创建运行记录并返回所有权 token。

用法: yss runtime begin --root <目录> [--kind <类型>]

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
保存返回的 id/token；之后 event、complete 和 pin 操作都须提供 token。

最小示例:
yss runtime begin --root ./demo-spec --kind command --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --input <值>                    按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --kind <类型>                   当前命令的领域类型；runtime begin 默认 command
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --report-dir <路径>             文件或目录路径
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--home  独立 SQLite 运行存储
--kind  默认 command
--input / --report-dir 尚未支持，返回 UNPORTED

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples runtime begin
```

### runtime commands

```text
yss 1.3.3 — runtime commands
──────────────────────
只读查询运行记录。

用法: yss runtime commands --root <目录> --id <运行ID>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
运行记录不授予生命周期批准或执行授权。

最小示例:
yss runtime commands --root ./demo-spec --id "<运行ID>" --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--home  独立 SQLite 运行存储；默认用户运行存储
--id  已登记运行 ID

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples runtime commands
```

### runtime complete

```text
yss 1.3.3 — runtime complete
──────────────────────
以实际退出码结束运行记录。

用法: yss runtime complete --root <目录> --id <ID> --token <token> --status <终态> --exit-code <整数>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss runtime complete --root ./demo-spec --id "<ID>" --token "<token>" --status passed --exit-code 0 --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --exit-code <整数>              实际退出码；成功状态必须为 0
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --status <终态>                 运行记录的终态；成功状态必须匹配退出码 0；可选值: passed|success|completed|ok|failed|failure|cancelled|canceled|timed-out|timeout|error
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --token <值>                    按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--id / --token  begin 返回的所有权凭证
--status  已知终态
--exit-code  实际整数退出码，passed 必须为 0

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples runtime complete
```

### runtime event

```text
yss 1.3.3 — runtime event
──────────────────────
追加运行事件。

用法: yss runtime event --root <目录> --id <ID> --token <token> --type <类型> [--value <JSON>]

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss runtime event --root ./demo-spec --id "<ID>" --token "<token>" --type progress --value '{"message":"checked"}' --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --token <值>                    按当前命令说明指定
  --type <值>                     按当前命令说明指定
  --value <JSON>                  单个 JSON 值，默认 null
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--id / --token  begin 返回的所有权凭证
--type  必需
--value  单个 JSON 值，默认 null

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples runtime event
```

### runtime events

```text
yss 1.3.3 — runtime events
──────────────────────
只读查询运行记录。

用法: yss runtime events --root <目录> --id <运行ID>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
运行记录不授予生命周期批准或执行授权。

最小示例:
yss runtime events --root ./demo-spec --id "<运行ID>" --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--home  独立 SQLite 运行存储；默认用户运行存储
--id  已登记运行 ID

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples runtime events
```

### runtime inspect

```text
yss 1.3.3 — runtime inspect
──────────────────────
只读查询运行记录。

用法: yss runtime inspect --root <目录> [--json]

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
运行记录不授予生命周期批准或执行授权。

最小示例:
yss runtime inspect --root ./demo-spec --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--home  独立 SQLite 运行存储；默认用户运行存储
--id  已登记运行 ID

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples runtime inspect
```

### runtime pin

```text
yss 1.3.3 — runtime pin
──────────────────────
维护运行记录保护标记。

用法: yss runtime pin --root <目录> --id <ID> --token <token> --reason <理由>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss runtime pin --root ./demo-spec --id "<ID>" --token "<token>" --reason '审查材料' --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --reason <值>                   按当前命令说明指定
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --token <值>                    按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--id / --token  begin 返回的所有权凭证
--reason  必需，记录保护标记变更理由

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples runtime pin
```

### runtime pins

```text
yss 1.3.3 — runtime pins
──────────────────────
只读查询运行记录。

用法: yss runtime pins --root <目录> --id <运行ID>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
运行记录不授予生命周期批准或执行授权。

最小示例:
yss runtime pins --root ./demo-spec --id "<运行ID>" --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--home  独立 SQLite 运行存储；默认用户运行存储
--id  已登记运行 ID

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples runtime pins
```

### runtime run

```text
yss 1.3.3 — runtime run
──────────────────────
只读查询运行记录。

用法: yss runtime run --root <目录> --id <运行ID>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
运行记录不授予生命周期批准或执行授权。

最小示例:
yss runtime run --root ./demo-spec --id "<运行ID>" --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--home  独立 SQLite 运行存储；默认用户运行存储
--id  已登记运行 ID

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples runtime run
```

### runtime unpin

```text
yss 1.3.3 — runtime unpin
──────────────────────
维护运行记录保护标记。

用法: yss runtime unpin --root <目录> --id <ID> --token <token> --reason <理由>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss runtime unpin --root ./demo-spec --id "<ID>" --token "<token>" --reason '审查材料' --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --home <路径>                   文件或目录路径
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --reason <值>                   按当前命令说明指定
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --token <值>                    按当前命令说明指定
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--id / --token  begin 返回的所有权凭证
--reason  必需，记录保护标记变更理由

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples runtime unpin
```

### skills

```text
yss 1.3.3 — skills
──────────────────────
查询或补装 Skill 及其依赖闭包。

用法: yss skills <子命令> --root <目录>

子命令:
ensure  补装指定 Skill 及其依赖闭包。
list  列出当前 Profile 支持的标识。

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
可用标识来自当前 Profile 的内置 Bundle；不猜测能力闭包。

最小示例:
yss skills list --root ./demo-spec --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
先 list 核对当前 Profile 支持的标识，再按保存计划补装。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples skills
```

### skills ensure

```text
yss 1.3.3 — skills ensure
──────────────────────
补装指定 Skill 及其依赖闭包。

用法: yss skills ensure --root <目录> <标识...> --plan --out <新文件>

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
须先 list 确认该 Profile 支持相应标识。

最小示例:
yss skills ensure yss-research --root ./demo-spec --plan --out /tmp/yss-resource-plan.json
yss skills --root ./demo-spec --apply --plan-file /tmp/yss-resource-plan.json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
位置参数: Skill 名称；支持多个
--plan --out <新文件>  生成保存计划，输出文件必须不存在
--apply --plan-file <文件>  应用保存计划；输入变化时拒绝

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
先 list 核对当前 Profile 支持的标识，再按保存计划补装。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples skills ensure
```

### skills list

```text
yss 1.3.3 — skills list
──────────────────────
列出当前 Profile 支持的标识。

用法: yss skills list --root <目录> [--json]

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
可用标识来自当前 Profile 的内置 Bundle；不猜测能力闭包。

最小示例:
yss skills list --root ./demo-spec --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
只读查询

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
先 list 核对当前 Profile 支持的标识，再按保存计划补装。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples skills list
```

### stage

```text
yss 1.3.3 — stage
──────────────────────
查询、登记或更新既有阶段工作项。

用法: yss stage <子命令> --root <目录>

子命令:
apply  事务应用已保存的阶段工作项计划。
check  读取并校验当前阶段工作项。
plan  生成阶段工作项写入计划。
query  查询阶段或 checkpoint 中的工作项。
register  生成阶段工作项写入计划。
status  读取并校验当前阶段工作项。
update  生成阶段工作项写入计划。

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss stage query --root ./demo-spec --id stage.spec-architecture --json

参数:
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --stage <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目
  --work-unit <值>                按当前命令说明指定

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples stage
```

### stage apply

```text
yss 1.3.3 — stage apply
──────────────────────
事务应用已保存的阶段工作项计划。

用法: yss stage apply --root <目录> --plan-file <文件>

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss stage apply --root ./demo-spec --plan-file docs/stage-plan.json --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --item <路径>                   文件或目录路径
  --items <路径>                  文件或目录路径
  --json                          执行结果输出 JSON；帮助始终输出文本
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --refresh <值>                  按当前命令说明指定
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--plan-file  项目内保存的原始写入计划

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples stage apply
```

### stage check

```text
yss 1.3.3 — stage check
──────────────────────
读取并校验当前阶段工作项。

用法: yss stage check --root <目录> --checkpoint <文件>

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss stage check --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json

参数:
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --stage <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目
  --work-unit <值>                按当前命令说明指定

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--checkpoint / --file  已存在的 checkpoint

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples stage check
```

### stage plan

```text
yss 1.3.3 — stage plan
──────────────────────
生成阶段工作项写入计划。

用法: yss stage plan --root <目录> --checkpoint <文件> --items <JSON文件> [--apply --plan-file <文件>]

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
使用项目本地 stage-tracking 合同；计划保存时不加 --json，应用时核验输入摘要。不创建阶段批准。

最小示例:
yss stage plan --root ./demo-spec --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-spec/docs/stage-plan.json
yss stage apply --root ./demo-spec --plan-file docs/stage-plan.json --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --item <路径>                   文件或目录路径
  --items <路径>                  文件或目录路径
  --json                          执行结果输出 JSON；帮助始终输出文本
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --refresh <值>                  按当前命令说明指定
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--checkpoint / --file  已存在的 JSON checkpoint；YAML 仅支持只读
--items / --item  合同规定的工作项 JSON
默认只输出计划；保存计划必须位于项目内
--apply --plan-file  应用已保存计划
--refresh 尚未支持，返回 UNPORTED

预期结果:
输出可审阅计划；应用保存计划时重新核验当前输入。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples stage plan
```

### stage query

```text
yss 1.3.3 — stage query
──────────────────────
查询阶段或 checkpoint 中的工作项。

用法: yss stage query --root <目录> [--checkpoint <文件>] [--id <ID>]

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss stage query --root ./demo-spec --id stage.spec-architecture --json

参数:
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --stage <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目
  --work-unit <值>                按当前命令说明指定

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
无 checkpoint: --id / --stage  阶段 ID
有 checkpoint: --id  工作项 ID；--work-unit / --stage 筛选尚未支持

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples stage query
```

### stage register

```text
yss 1.3.3 — stage register
──────────────────────
生成阶段工作项写入计划。

用法: yss stage register --root <目录> --checkpoint <文件> --items <JSON文件> [--apply --plan-file <文件>]

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
使用项目本地 stage-tracking 合同；计划保存时不加 --json，应用时核验输入摘要。不创建阶段批准。

最小示例:
yss stage register --root ./demo-spec --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-spec/docs/stage-plan.json
yss stage apply --root ./demo-spec --plan-file docs/stage-plan.json --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --item <路径>                   文件或目录路径
  --items <路径>                  文件或目录路径
  --json                          执行结果输出 JSON；帮助始终输出文本
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --refresh <值>                  按当前命令说明指定
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--checkpoint / --file  已存在的 JSON checkpoint；YAML 仅支持只读
--items / --item  合同规定的工作项 JSON
默认只输出计划；保存计划必须位于项目内
--apply --plan-file  应用已保存计划
--refresh 尚未支持，返回 UNPORTED

预期结果:
输出可审阅计划；应用保存计划时重新核验当前输入。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples stage register
```

### stage status

```text
yss 1.3.3 — stage status
──────────────────────
读取并校验当前阶段工作项。

用法: yss stage status --root <目录> --checkpoint <文件>

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
读取当前项目的治理资产；校验通过不会创建批准或授予实现、发布权限。必要资产、身份和依赖必须已存在，能力缺失返回 UNPORTED。

最小示例:
yss stage status --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json

参数:
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --id <值>                       按当前命令说明指定
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --stage <值>                    按当前命令说明指定
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目
  --work-unit <值>                按当前命令说明指定

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--checkpoint / --file  已存在的 checkpoint

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples stage status
```

### stage update

```text
yss 1.3.3 — stage update
──────────────────────
生成阶段工作项写入计划。

用法: yss stage update --root <目录> --checkpoint <文件> --items <JSON文件> [--apply --plan-file <文件>]

前置条件:
合法项目身份，以及命令所需的当前合同、checkpoint 或证据；资产来源与消费范围必须可核验。
使用项目本地 stage-tracking 合同；计划保存时不加 --json，应用时核验输入摘要。不创建阶段批准。

最小示例:
yss stage update --root ./demo-spec --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-spec/docs/stage-plan.json
yss stage apply --root ./demo-spec --plan-file docs/stage-plan.json --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --checkpoint <路径>             文件或目录路径
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --item <路径>                   文件或目录路径
  --items <路径>                  文件或目录路径
  --json                          执行结果输出 JSON；帮助始终输出文本
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --refresh <值>                  按当前命令说明指定
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--checkpoint / --file  已存在的 JSON checkpoint；YAML 仅支持只读
--items / --item  合同规定的工作项 JSON
默认只输出计划；保存计划必须位于项目内
--apply --plan-file  应用已保存计划
--refresh 尚未支持，返回 UNPORTED

预期结果:
输出可审阅计划；应用保存计划时重新核验当前输入。

下一步:
yss lifecycle status --help；消费当前证据和权威退出条件后，由对应负责人继续。

常见错误:
ARGUMENT、IDENTITY、INPUT、SCHEMA_VALIDATION、GOVERNED_REQUIRED、UNPORTED；yss help errors <错误码>
详细示例: yss help examples stage update
```

### sync

```text
yss 1.3.3 — sync
──────────────────────
将项目模板升级到本 CLI 内置固定 Bundle。

用法: yss sync --root <目录> --plan --out <新文件>

前置条件:
合法项目身份及所需输入；项目根默认当前目录，推荐显式 --root。
这是项目模板升级。升级 CLI 程序使用 yss upgrade；不会自动迁移旧 metadata。

最小示例:
yss sync --root ./demo-spec --plan --out /tmp/yss-sync-plan.json
yss sync --root ./demo-spec --apply --plan-file /tmp/yss-sync-plan.json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --base-bundle <路径>            显式提供完整历史 Bundle 材料；默认离线
  --binding-file <路径>           文件或目录路径
  --business-domain <领域>        项目业务领域，作为模板变量
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --full                          init/attach 安装完整资源；默认初始分发集合
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --issue-tracker <追踪器>        Spec Tracker 配置；可选值: local-markdown|github|gitlab
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --project-name <名称>           项目名称，作为模板变量
  --resolution-file <文件>        结合 --plan-file 原计划重新规划已决议资产
  --review-out <新目录>           在项目外导出冲突、基线、合并候选和决议模板
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  --team-size <规模>              团队规模，作为模板变量
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--plan --out <新文件>  生成保存计划，输出文件必须不存在
--apply --plan-file <文件>  应用保存计划；输入变化时拒绝
--review-out <新目录>  项目外审查材料与决议模板
--base-bundle <路径>  离线历史 Bundle 完整材料
--resolution-file <文件>  与 --plan --plan-file 原计划一起重新规划

预期结果:
输出可审阅计划；应用保存计划时重新核验当前输入。

下一步:
根据实际诊断选择计划、恢复或迁移入口；应用后再 doctor/diff。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples sync
```

### update

```text
yss 1.3.3 — update
──────────────────────
安装、恢复或回退指定本地发行包。

用法: yss update <子命令> --tool-root <目录>

子命令:
apply  应用保存的程序安装计划。
plan  生成离线程序安装计划（默认动作）。
recover  恢复唯一未完成的程序事务。
rollback  回退最近一次成功程序安装。
status  只读诊断安装一致性及程序事务状态。

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
保留离线安装接口；每次写入绑定摘要和程序事务。

最小示例:
yss update status --tool-root ./tools/yss --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --artifact <归档>               本机平台 .tar.gz 或 .zip 发行包
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --sha256 <SHA-256>              发行包的 64 位十六进制 SHA-256
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--tool-root <目录>  必需；工具目录不能是项目或 Git 仓库根

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss update status --help；程序来源一致后，独立规划项目模板同步。

常见错误:
ARGUMENT、NETWORK、ARTIFACT、INSTALLATION、INTERRUPTED、CONCURRENT、VERSION；yss help errors <错误码>
详细示例: yss help examples update
```

### update apply

```text
yss 1.3.3 — update apply
──────────────────────
应用保存的程序安装计划。

用法: yss update apply --tool-root <目录> --plan-file <文件>

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
保持文件权限；用户改动及输入漂移会阻止安装。

最小示例:
yss update apply --tool-root ./tools/yss --plan-file /tmp/yss-install-plan.json --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --artifact <归档>               本机平台 .tar.gz 或 .zip 发行包
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --sha256 <SHA-256>              发行包的 64 位十六进制 SHA-256
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--tool-root <目录>  必需；工具目录不能是项目或 Git 仓库根
--plan-file <文件>  必需；读取 update plan 生成的计划

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss update status --help；程序来源一致后，独立规划项目模板同步。

常见错误:
ARGUMENT、NETWORK、ARTIFACT、INSTALLATION、INTERRUPTED、CONCURRENT、VERSION；yss help errors <错误码>
详细示例: yss help examples update apply
```

### update plan

```text
yss 1.3.3 — update plan
──────────────────────
生成离线程序安装计划（默认动作）。

用法: yss update plan --tool-root <目录> --artifact <归档> --sha256 <摘要> [--out <新文件>]

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
归档必须来自可信固定来源。

最小示例:
yss update plan --tool-root ./tools/yss --artifact /path/yss.tar.gz --sha256 "<SHA-256>" --out /tmp/yss-install-plan.json --json

参数:
  --apply                         应用已保存计划或显式恢复；写入前检查冲突
  --artifact <归档>               本机平台 .tar.gz 或 .zip 发行包
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --out <新路径>                  计划文件或导出目录；目标须不存在，按命令选择
  --plan                          只生成计划，使用 --out 保存；不应用项目修改
  --plan-file <文件>              消费已有计划；写入前核验输入摘要
  --sha256 <SHA-256>              发行包的 64 位十六进制 SHA-256
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--tool-root <目录>  必需；工具目录不能是项目或 Git 仓库根
--artifact <文件>  本机平台的 .tar.gz 或 .zip
--sha256 <摘要>  归档 SHA-256
--out <新文件>  保存计划到工具目录外；默认只输出计划

预期结果:
输出可审阅计划；应用保存计划时重新核验当前输入。

下一步:
yss update status --help；程序来源一致后，独立规划项目模板同步。

常见错误:
ARGUMENT、NETWORK、ARTIFACT、INSTALLATION、INTERRUPTED、CONCURRENT、VERSION；yss help errors <错误码>
详细示例: yss help examples update plan
```

### update recover

```text
yss 1.3.3 — update recover
──────────────────────
恢复唯一未完成的程序事务。

用法: yss update recover --tool-root <目录> [--json]

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
保护性恢复开始后完成还原，可重复执行；用户改动时停止覆盖。

最小示例:
yss update recover --tool-root ./tools/yss --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--tool-root <目录>  必需；工具目录不能是项目或 Git 仓库根
仅处理 program-update；恢复前核验受管范围

预期结果:
显示所属事务及实际恢复结果；按子命令标明的只读/写入语义执行。

下一步:
yss update status --help；程序来源一致后，独立规划项目模板同步。

常见错误:
ARGUMENT、NETWORK、ARTIFACT、INSTALLATION、INTERRUPTED、CONCURRENT、VERSION；yss help errors <错误码>
详细示例: yss help examples update recover
```

### update rollback

```text
yss 1.3.3 — update rollback
──────────────────────
回退最近一次成功程序安装。

用法: yss update rollback --tool-root <目录> [--json]

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
后续用户改动会阻止整体回退。

最小示例:
yss update rollback --tool-root ./tools/yss --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--tool-root <目录>  必需；工具目录不能是项目或 Git 仓库根
仅回退最近成功 program-update

预期结果:
显示所属事务及实际恢复结果；按子命令标明的只读/写入语义执行。

下一步:
yss update status --help；程序来源一致后，独立规划项目模板同步。

常见错误:
ARGUMENT、NETWORK、ARTIFACT、INSTALLATION、INTERRUPTED、CONCURRENT、VERSION；yss help errors <错误码>
详细示例: yss help examples update rollback
```

### update status

```text
yss 1.3.3 — update status
──────────────────────
只读诊断安装一致性及程序事务状态。

用法: yss update status --tool-root <目录> [--json]

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
保留离线安装接口；每次写入绑定摘要和程序事务。

最小示例:
yss update status --tool-root ./tools/yss --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--tool-root <目录>  必需；工具目录不能是项目或 Git 仓库根
仅查询，不写入；展示安装记录、逐文件摘要和权限差异。
installationConsistent 只表示安装检查结果，不授予发行资格。

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss update status --help；程序来源一致后，独立规划项目模板同步。

常见错误:
ARGUMENT、NETWORK、ARTIFACT、INSTALLATION、INTERRUPTED、CONCURRENT、VERSION；yss help errors <错误码>
详细示例: yss help examples update status
```

### upgrade

```text
yss 1.3.3 — upgrade
──────────────────────
从 GitHub 下载并事务安装稳定版 CLI。

用法: yss upgrade [--check] [--to <稳定版本>] [--tool-root <目录>] [--json]

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
固定来源 iloveZzz/yss-cli。校验失败、降级、冲突或未完成事务均拒绝。恢复: yss update recover --tool-root <目录>；回退: yss update rollback --tool-root <目录>。1.0.0 首次安装新版使用离线 update，见 yss help tutorial。

最小示例:
yss upgrade --check
yss upgrade
yss upgrade --to 1.3.0 --tool-root ./tools/yss --json

参数:
  --check                         仅查询在线版本；不下载发行包、不写入
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --to <稳定版本>                 在线升级目标，如 1.3.0 或 v1.3.0；默认最新稳定版
  --tool-root <目录>              程序安装目录；update 必需，upgrade 默认识别运行目录
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--check  只检查版本，不下载、不写入
--to <版本>  指定稳定版，如 1.3.0 或 v1.3.0；默认最新稳定版
--tool-root <目录>  显式工具目录；默认识别实际运行二进制的受管目录

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
yss update status --help；程序来源一致后，独立规划项目模板同步。

常见错误:
ARGUMENT、NETWORK、ARTIFACT、INSTALLATION、INTERRUPTED、CONCURRENT、VERSION；yss help errors <错误码>
详细示例: yss help examples upgrade
```

### version

```text
yss 1.3.3 — version
──────────────────────
查看 CLI、协议和固定来源身份。

用法: yss version [--json]

前置条件:
无需项目身份。安装/恢复操作使用独立工具目录；程序写入按对应保存计划或明确恢复范围执行。
不需要项目目录。

最小示例:
yss version --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
也可使用 yss -V 或 yss --version

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples version
```

### xml

```text
yss 1.3.3 — xml
──────────────────────
读取 Maven project XML。

用法: yss xml <子命令> --root <目录>

子命令:
inspect  读取 Maven project 结构。
query  查询 Maven project 读取结果。

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
仅支持 Maven project XML；禁止 DTD 和外部实体，不执行外部代码。

最小示例:
yss xml inspect --root ./demo-backend --file pom.xml --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples xml
```

### xml inspect

```text
yss 1.3.3 — xml inspect
──────────────────────
读取 Maven project 结构。

用法: yss xml inspect --root <目录> --file <文件>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
仅支持 Maven project XML；禁止 DTD 和外部实体，不执行外部代码。

最小示例:
yss xml inspect --root ./demo-backend --file pom.xml --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--file  项目本地 Maven XML，大小上限 16 MiB

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples xml inspect
```

### xml query

```text
yss 1.3.3 — xml query
──────────────────────
查询 Maven project 读取结果。

用法: yss xml query --root <目录> --file <文件>

前置条件:
准备对应运行标识、存储、归档或 XML 文件；查看本子命令的范围与限制。
仅支持 Maven project XML；禁止 DTD 和外部实体，不执行外部代码。

最小示例:
yss xml query --root ./demo-backend --file pom.xml --json

参数:
  --diagnostics                   与 --json 同用，在失败 envelope 中附加诊断
  --file <路径>                   文件或目录路径
  -h, --help                      显示当前命令帮助；不读取项目、不联网、不写入
  --human                         强制中文摘要；与 --json 互斥；管道默认保留原格式
  --json                          执行结果输出 JSON；帮助始终输出文本
  --profile <Profile>             项目模板类型；项目命令可从身份检测，init 必需；可选值: spec|design|backend|frontend
  --root <目录>                   项目根，默认当前目录；仅项目命令
  --target-dir <目录>             项目根的兼容参数；优先使用 --root
  -V, --version                   显示 CLI 版本及来源；不需要项目

参数说明与条件:
--root <目录>  项目根，默认当前目录；推荐显式指定
--profile <spec|design|backend|frontend>  必需或从项目身份检测
--file  项目本地 Maven XML，大小上限 16 MiB

预期结果:
返回实际查询或操作结果及适用范围；查询成功不代表阶段批准。

下一步:
查看同组命令帮助和当前查询结果，选择需要的下一项操作。

常见错误:
ARGUMENT、IDENTITY、PATH、CONFLICT、INPUT_DRIFT、UNPORTED；yss help errors <错误码>
详细示例: yss help examples xml query
```

### 错误 AMBIGUOUS

```text
AMBIGUOUS — 事务或恢复状态需要处理

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：先查询所属事务及恢复材料；项目、迁移和程序事务各自恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss recover --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ARCHIVE

```text
ARCHIVE — 归档或 XML 输入无法读取

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查源文件、类型、大小限制及可移植路径，修复后重新只读检查。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss archive --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ARGUMENT

```text
ARGUMENT — 命令或参数不符合当前接口

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对当前子命令、必需参数、可选值和互斥条件。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ARTIFACT

```text
ARTIFACT — 发行包或安装材料核验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对本机平台、固定来源、归档摘要、manifest 和安装收据。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss update status --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET

```text
ASSET — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_ALIAS

```text
ASSET_ALIAS — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_DEPTH

```text
ASSET_DEPTH — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_DUPLICATE_KEY

```text
ASSET_DUPLICATE_KEY — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_EMPTY

```text
ASSET_EMPTY — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_KEY

```text
ASSET_KEY — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_MULTIPLE_DOCUMENTS

```text
ASSET_MULTIPLE_DOCUMENTS — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_NUMBER

```text
ASSET_NUMBER — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_PARSE

```text
ASSET_PARSE — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_TAG

```text
ASSET_TAG — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_UNICODE

```text
ASSET_UNICODE — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_UTF8

```text
ASSET_UTF8 — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 BASELINE

```text
BASELINE — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 BASE_BUNDLE

```text
BASE_BUNDLE — 保存计划或当前输入未通过核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查计划类型、根目录和输入；处理变化后保存新计划，重新审阅再应用。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 BINDING

```text
BINDING — 插件 binding 与固定来源不一致

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
常见类型：PLUGIN_BINDING_SOURCE_MISMATCH、PLUGIN_BINDING_UPGRADE_REQUIRED。通过实际绑定插件的公开升级/迁移计划更新，身份与 binding 同一事务应用。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：通过对应插件的 project-upgrade-plan/apply 或 project-migration-plan/apply 更新身份和 binding。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 BINDING_CONFLICT

```text
BINDING_CONFLICT — 插件 binding 与固定来源不一致

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
常见类型：PLUGIN_BINDING_SOURCE_MISMATCH、PLUGIN_BINDING_UPGRADE_REQUIRED。通过实际绑定插件的公开升级/迁移计划更新，身份与 binding 同一事务应用。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：通过对应插件的 project-upgrade-plan/apply 或 project-migration-plan/apply 更新身份和 binding。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 BINDING_REQUIRED

```text
BINDING_REQUIRED — 插件 binding 与固定来源不一致

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
常见类型：PLUGIN_BINDING_SOURCE_MISMATCH、PLUGIN_BINDING_UPGRADE_REQUIRED。通过实际绑定插件的公开升级/迁移计划更新，身份与 binding 同一事务应用。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：通过对应插件的 project-upgrade-plan/apply 或 project-migration-plan/apply 更新身份和 binding。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 BUNDLE

```text
BUNDLE — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 BUNDLE_RULE

```text
BUNDLE_RULE — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CANCELLED

```text
CANCELLED — 事务或恢复状态需要处理

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：先查询所属事务及恢复材料；项目、迁移和程序事务各自恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss recover --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CANDIDATE_DRIFT

```text
CANDIDATE_DRIFT — 保存计划或当前输入未通过核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查计划类型、根目录和输入；处理变化后保存新计划，重新审阅再应用。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CI_CONFIG

```text
CI_CONFIG — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CI_CONFLICT

```text
CI_CONFLICT — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CI_EVIDENCE_DRIFT

```text
CI_EVIDENCE_DRIFT — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CI_IDENTITY

```text
CI_IDENTITY — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CI_INPUT

```text
CI_INPUT — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CI_RECEIPT

```text
CI_RECEIPT — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CI_REFERENCE

```text
CI_REFERENCE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CI_SCOPE

```text
CI_SCOPE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CI_SOURCE

```text
CI_SOURCE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CONCURRENT

```text
CONCURRENT — 文件冲突或用户后续修改阻止操作

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：查看冲突路径、基线与当前字节，保留现场；处理差异后重新规划。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss diff --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CONFLICT

```text
CONFLICT — 文件冲突或用户后续修改阻止操作

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：查看冲突路径、基线与当前字节，保留现场；处理差异后重新规划。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss diff --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CONTEXT

```text
CONTEXT — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CONTEXT_REFERENCE

```text
CONTEXT_REFERENCE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CONTEXT_SNAPSHOT

```text
CONTEXT_SNAPSHOT — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CONTEXT_SNAPSHOT_STALE

```text
CONTEXT_SNAPSHOT_STALE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 DIGEST

```text
DIGEST — 发行包或安装材料核验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对本机平台、固定来源、归档摘要、manifest 和安装收据。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss update status --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 EXISTS

```text
EXISTS — 文件冲突或用户后续修改阻止操作

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：查看冲突路径、基线与当前字节，保留现场；处理差异后重新规划。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss diff --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 GOVERNED_REQUIRED

```text
GOVERNED_REQUIRED — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 IDENTITY

```text
IDENTITY — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
常见类型：PROJECT_ROOT_NOT_FOUND、PROJECT_METADATA_MISSING、PROFILE_IDENTITY_CONFLICT、METADATA_SCHEMA_UNSUPPORTED。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 INPUT

```text
INPUT — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 INPUT_DRIFT

```text
INPUT_DRIFT — 保存计划或当前输入未通过核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
常见类型：SAVED_PLAN_INPUT_CHANGED、SAVED_STAGE_PLAN_CHANGED。先核对 affectedInputs/path；原计划失效后重新生成与审阅。

处理：检查计划类型、根目录和输入；处理变化后保存新计划，重新审阅再应用。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 INSTALLATION

```text
INSTALLATION — 发行包或安装材料核验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对本机平台、固定来源、归档摘要、manifest 和安装收据。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss update status --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 INTERRUPTED

```text
INTERRUPTED — 事务或恢复状态需要处理

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：先查询所属事务及恢复材料；项目、迁移和程序事务各自恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss recover --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 KIND

```text
KIND — 命令或参数不符合当前接口

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对当前子命令、必需参数、可选值和互斥条件。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 LEGACY

```text
LEGACY — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 LEGACY_INTERRUPTED

```text
LEGACY_INTERRUPTED — 事务或恢复状态需要处理

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
常见类型：LEGACY_EXECUTOR_PENDING。保留旧事务；固定旧执行器的 recover 或 migrate recover 消费原事务，原生 recover --apply 不能替代。

处理：先查询所属事务及恢复材料；项目、迁移和程序事务各自恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss recover --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 LEGACY_POLICY

```text
LEGACY_POLICY — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 LIFECYCLE

```text
LIFECYCLE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 LIFECYCLE_ID

```text
LIFECYCLE_ID — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 LOCKED

```text
LOCKED — 事务或恢复状态需要处理

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：先查询所属事务及恢复材料；项目、迁移和程序事务各自恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss recover --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 MERGE

```text
MERGE — 文件冲突或用户后续修改阻止操作

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：查看冲突路径、基线与当前字节，保留现场；处理差异后重新规划。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss diff --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 MIGRATION_REQUIRED

```text
MIGRATION_REQUIRED — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 NETWORK

```text
NETWORK — 固定来源网络请求失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查连接、HTTP 状态和限流；确认固定官方来源后重新查询。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss upgrade --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PATH

```text
PATH — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
常见类型：UNSAFE_ROOT_COMPONENT；核对错误中的实际路径组件，使用已确认的普通目录。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PLAN

```text
PLAN — 保存计划或当前输入未通过核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查计划类型、根目录和输入；处理变化后保存新计划，重新审阅再应用。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PLAN_REQUIRED

```text
PLAN_REQUIRED — 保存计划或当前输入未通过核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查计划类型、根目录和输入；处理变化后保存新计划，重新审阅再应用。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PLAN_VERSION

```text
PLAN_VERSION — 保存计划或当前输入未通过核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查计划类型、根目录和输入；处理变化后保存新计划，重新审阅再应用。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PLATFORM

```text
PLATFORM — 发行包或安装材料核验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对本机平台、固定来源、归档摘要、manifest 和安装收据。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss update status --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PROFILE

```text
PROFILE — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PROJECT_CI_REJECTED

```text
PROJECT_CI_REJECTED — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PROTECTED

```text
PROTECTED — 文件冲突或用户后续修改阻止操作

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：查看冲突路径、基线与当前字节，保留现场；处理差异后重新规划。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss diff --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 READ_ONLY

```text
READ_ONLY — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 RECOVERY_FAILED

```text
RECOVERY_FAILED — 事务或恢复状态需要处理

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
常见类型：RECOVERY_USER_MODIFICATION。保留用户当前内容和归档，确认内容与恢复范围后再检查，不能覆盖后续修改。

处理：先查询所属事务及恢复材料；项目、迁移和程序事务各自恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss recover --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 RESOLUTION

```text
RESOLUTION — 保存计划或当前输入未通过核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查计划类型、根目录和输入；处理变化后保存新计划，重新审阅再应用。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 RESOLUTION_POLICY

```text
RESOLUTION_POLICY — 保存计划或当前输入未通过核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查计划类型、根目录和输入；处理变化后保存新计划，重新审阅再应用。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 RESOLUTION_STALE

```text
RESOLUTION_STALE — 保存计划或当前输入未通过核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查计划类型、根目录和输入；处理变化后保存新计划，重新审阅再应用。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ROOT

```text
ROOT — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 RUNTIME

```text
RUNTIME — 运行记录或运行存储状态异常

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对运行标识、所有者、存储目录及当前记录，保留证据后按对应入口恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss runtime --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 RUNTIME_BUSY

```text
RUNTIME_BUSY — 运行记录或运行存储状态异常

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对运行标识、所有者、存储目录及当前记录，保留证据后按对应入口恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss runtime --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 RUNTIME_DATA

```text
RUNTIME_DATA — 运行记录或运行存储状态异常

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对运行标识、所有者、存储目录及当前记录，保留证据后按对应入口恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss runtime --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 RUNTIME_INTEGRITY

```text
RUNTIME_INTEGRITY — 运行记录或运行存储状态异常

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对运行标识、所有者、存储目录及当前记录，保留证据后按对应入口恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss runtime --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 RUNTIME_OWNER

```text
RUNTIME_OWNER — 运行记录或运行存储状态异常

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对运行标识、所有者、存储目录及当前记录，保留证据后按对应入口恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss runtime --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 RUNTIME_SCHEMA

```text
RUNTIME_SCHEMA — 运行记录或运行存储状态异常

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对运行标识、所有者、存储目录及当前记录，保留证据后按对应入口恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss runtime --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 RUNTIME_STATE

```text
RUNTIME_STATE — 运行记录或运行存储状态异常

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对运行标识、所有者、存储目录及当前记录，保留证据后按对应入口恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss runtime --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 SCHEMA

```text
SCHEMA — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 SCHEMA_DRAFT_UNSUPPORTED

```text
SCHEMA_DRAFT_UNSUPPORTED — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 SCHEMA_ID

```text
SCHEMA_ID — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 SCHEMA_ID_CONFLICT

```text
SCHEMA_ID_CONFLICT — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 SCHEMA_OFFLINE

```text
SCHEMA_OFFLINE — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 SCHEMA_REF

```text
SCHEMA_REF — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 SCHEMA_REGEX_INCOMPATIBLE

```text
SCHEMA_REGEX_INCOMPATIBLE — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 SCHEMA_VALIDATION

```text
SCHEMA_VALIDATION — 输入资产格式或 Schema 校验失败

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查报告中的文件、字段及本地引用；按照当前锁定 Schema 修复输入。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss contract check --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 SCOPE

```text
SCOPE — 命令或参数不符合当前接口

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对当前子命令、必需参数、可选值和互斥条件。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 SKILL

```text
SKILL — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 STATE

```text
STATE — 事务或恢复状态需要处理

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：先查询所属事务及恢复材料；项目、迁移和程序事务各自恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss recover --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 SYNC_REQUIRED

```text
SYNC_REQUIRED — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKER

```text
TRACKER — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_CANCEL

```text
TRACKING_CANCEL — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_COMPLETION

```text
TRACKING_COMPLETION — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_CONFLICT

```text
TRACKING_CONFLICT — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_DEFERRAL

```text
TRACKING_DEFERRAL — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_DEFINITION

```text
TRACKING_DEFINITION — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_DEPENDENCY

```text
TRACKING_DEPENDENCY — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_ENTRY

```text
TRACKING_ENTRY — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_FEATURE

```text
TRACKING_FEATURE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_ID

```text
TRACKING_ID — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_IDENTITY

```text
TRACKING_IDENTITY — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_PATH

```text
TRACKING_PATH — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_PROFILE

```text
TRACKING_PROFILE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_PROGRESS

```text
TRACKING_PROGRESS — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_REQUIRED

```text
TRACKING_REQUIRED — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_ROUTE

```text
TRACKING_ROUTE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_SCHEMA

```text
TRACKING_SCHEMA — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_STAGE

```text
TRACKING_STAGE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_STALE

```text
TRACKING_STALE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRACKING_TRANSITION

```text
TRACKING_TRANSITION — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 UNPORTED

```text
UNPORTED — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
能力边界：核对 yss capabilities --json。只有当前帮助及能力表明确支持的入口可用；结构 check 只验证格式，不能替代领域 verify。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 VERIFY

```text
VERIFY — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 VERSION

```text
VERSION — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 WORK_LAYOUT_CHECKPOINT

```text
WORK_LAYOUT_CHECKPOINT — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 WORK_LAYOUT_CONFIG

```text
WORK_LAYOUT_CONFIG — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 WORK_LAYOUT_FEATURE

```text
WORK_LAYOUT_FEATURE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 WORK_LAYOUT_MIGRATION_REQUIRED

```text
WORK_LAYOUT_MIGRATION_REQUIRED — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 WORK_LAYOUT_RESERVED

```text
WORK_LAYOUT_RESERVED — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 XML

```text
XML — 归档或 XML 输入无法读取

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查源文件、类型、大小限制及可移植路径，修复后重新只读检查。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss archive --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 XML_LIMIT

```text
XML_LIMIT — 归档或 XML 输入无法读取

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查源文件、类型、大小限制及可移植路径，修复后重新只读检查。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss archive --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ZIP

```text
ZIP — 归档或 XML 输入无法读取

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查源文件、类型、大小限制及可移植路径，修复后重新只读检查。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss archive --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ZIP_LIMIT

```text
ZIP_LIMIT — 归档或 XML 输入无法读取

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查源文件、类型、大小限制及可移植路径，修复后重新只读检查。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss archive --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CAPABILITY

```text
CAPABILITY — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 EXECUTION

```text
EXECUTION — 操作未完成

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：保留原始错误、命令和版本信息；先查看命令帮助，仍无法恢复时提交最小复现。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 INTERNAL

```text
INTERNAL — 操作未完成

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：保留原始错误、命令和版本信息；先查看命令帮助，仍无法恢复时提交最小复现。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 EVIDENCE

```text
EVIDENCE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PROVENANCE

```text
PROVENANCE — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PERMISSION

```text
PERMISSION — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 NOT_FOUND

```text
NOT_FOUND — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CHECKPOINT_REQUIRED

```text
CHECKPOINT_REQUIRED — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PROFILE_LINKS

```text
PROFILE_LINKS — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PROFILE_ROUTE

```text
PROFILE_ROUTE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRANSACTION_PROFILE

```text
TRANSACTION_PROFILE — 事务或恢复状态需要处理

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：先查询所属事务及恢复材料；项目、迁移和程序事务各自恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss recover --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 TRANSACTION_SCOPE

```text
TRANSACTION_SCOPE — 事务或恢复状态需要处理

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：先查询所属事务及恢复材料；项目、迁移和程序事务各自恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss recover --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PROGRESSION_TARGET

```text
PROGRESSION_TARGET — 命令或参数不符合当前接口

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对当前子命令、必需参数、可选值和互斥条件。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PROGRESSION_BINDING

```text
PROGRESSION_BINDING — 插件 binding 与固定来源不一致

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：通过对应插件的 project-upgrade-plan/apply 或 project-migration-plan/apply 更新身份和 binding。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PROGRESSION_TARGET_BLOCKED

```text
PROGRESSION_TARGET_BLOCKED — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PROGRESSION_EVIDENCE

```text
PROGRESSION_EVIDENCE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ASSET_TRANSACTION_PENDING

```text
ASSET_TRANSACTION_PENDING — 事务或恢复状态需要处理

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：先查询所属事务及恢复材料；项目、迁移和程序事务各自恢复。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss recover --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 CONTEXT_MISSING

```text
CONTEXT_MISSING — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 FRONTEND_PROBE_AUTHORIZATION

```text
FRONTEND_PROBE_AUTHORIZATION — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 FRONTEND_PROBE_UNAVAILABLE

```text
FRONTEND_PROBE_UNAVAILABLE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 GIT_BASELINE

```text
GIT_BASELINE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 HANDOFF_POLICY_CAPABILITY

```text
HANDOFF_POLICY_CAPABILITY — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 NEEDS_INFO

```text
NEEDS_INFO — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PLAN_REVIEW_POLICY_INVALID

```text
PLAN_REVIEW_POLICY_INVALID — 保存计划或当前输入未通过核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查计划类型、根目录和输入；处理变化后保存新计划，重新审阅再应用。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 PLAN_REVIEW_PROTOCOL_REQUIRED

```text
PLAN_REVIEW_PROTOCOL_REQUIRED — 保存计划或当前输入未通过核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：检查计划类型、根目录和输入；处理变化后保存新计划，重新审阅再应用。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss sync --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 READONLY_SOURCE_LAYOUT_REQUIRED

```text
READONLY_SOURCE_LAYOUT_REQUIRED — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 WORK_LAYOUT_PATH

```text
WORK_LAYOUT_PATH — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 WORK_LAYOUT_REFERENCE

```text
WORK_LAYOUT_REFERENCE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 WORK_LAYOUT_SOURCE

```text
WORK_LAYOUT_SOURCE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 WORK_LAYOUT_VERIFY

```text
WORK_LAYOUT_VERIFY — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 APPROVAL_REBIND_REQUIRED

```text
APPROVAL_REBIND_REQUIRED — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 IMMUTABLE

```text
IMMUTABLE — 文件冲突或用户后续修改阻止操作

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：查看冲突路径、基线与当前字节，保留现场；处理差异后重新规划。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss diff --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 WORK_LAYOUT_SCHEMA

```text
WORK_LAYOUT_SCHEMA — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 ARGS

```text
ARGS — 命令或参数不符合当前接口

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对当前子命令、必需参数、可选值和互斥条件。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors ARGS 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 INVALID

```text
INVALID — 命令或参数不符合当前接口

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对当前子命令、必需参数、可选值和互斥条件。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors INVALID 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 UNKNOWN_ALIAS

```text
UNKNOWN_ALIAS — 命令或参数不符合当前接口

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对当前子命令、必需参数、可选值和互斥条件。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors UNKNOWN_ALIAS 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 GIT_IGNORE

```text
GIT_IGNORE — 文件冲突或用户后续修改阻止操作

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：查看冲突路径、基线与当前字节，保留现场；处理差异后重新规划。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss diff --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 WORK_LAYOUT_PERMISSION

```text
WORK_LAYOUT_PERMISSION — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 MISSING_REFERENCE

```text
MISSING_REFERENCE — 当前治理条件或证据未满足

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：消费逐项诊断与恢复条件，补齐当前资产、实际验证及独立审查证据，再核验当前边界。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss lifecycle verify --help
详细运行诊断：在统一原生命令上增加 --human，或 --json --diagnostics。
```

### 错误 YSS_ARGUMENT_INVALID

```text
YSS_ARGUMENT_INVALID — 命令或参数不符合当前接口

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对当前子命令、必需参数、可选值和互斥条件。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_ARGUMENT_INVALID 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_COMMAND_FAILED

```text
YSS_COMMAND_FAILED — 操作未完成

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：保留原始错误、命令和版本信息；先查看命令帮助，仍无法恢复时提交最小复现。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_COMMAND_FAILED 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_FAMILY_IDENTITY_INVALID

```text
YSS_FAMILY_IDENTITY_INVALID — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_FAMILY_IDENTITY_INVALID 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_GIT_PROTECTED

```text
YSS_GIT_PROTECTED — 文件冲突或用户后续修改阻止操作

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：查看冲突路径、基线与当前字节，保留现场；处理差异后重新规划。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss diff --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_GIT_PROTECTED 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_IDENTITY_INVALID

```text
YSS_IDENTITY_INVALID — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_IDENTITY_INVALID 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_METADATA_INVALID

```text
YSS_METADATA_INVALID — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_METADATA_INVALID 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_MIGRATION_CONFLICT

```text
YSS_MIGRATION_CONFLICT — 文件冲突或用户后续修改阻止操作

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：查看冲突路径、基线与当前字节，保留现场；处理差异后重新规划。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss diff --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_MIGRATION_CONFLICT 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_OWNERSHIP_PROTECTED

```text
YSS_OWNERSHIP_PROTECTED — 文件冲突或用户后续修改阻止操作

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：查看冲突路径、基线与当前字节，保留现场；处理差异后重新规划。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss diff --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_OWNERSHIP_PROTECTED 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_PATH_SAFETY

```text
YSS_PATH_SAFETY — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_PATH_SAFETY 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_SNAPSHOT_INVALID

```text
YSS_SNAPSHOT_INVALID — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_SNAPSHOT_INVALID 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_TARGET_INVALID

```text
YSS_TARGET_INVALID — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_TARGET_INVALID 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_UNPORTED

```text
YSS_UNPORTED — 当前来源、格式或能力不兼容

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。
版本：最低支持版本与修复版本尚未登记时按实际输出标注；远程版本用 yss upgrade --check --json 查询。

处理：核对 CLI、协议、模板来源及实例格式，选择对应程序升级或实例迁移入口。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss capabilities --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_UNPORTED 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```

### 错误 YSS_UNSAFE_PATH

```text
YSS_UNSAFE_PATH — 项目身份或路径无法核验

原因：以当前执行错误和逐项诊断为依据；可能原因与已确认事实分别显示。

处理：核对实际项目根与 Profile；新项目使用 init，已有工程使用 attach，旧实例先诊断再显式 migrate。
复验：修复当前输入后重复原只读核验；写入前重新保存并审阅计划。
帮助：yss doctor --help
历史兼容入口：保持其冻结输出和参数合同。使用 yss help errors YSS_UNSAFE_PATH 查阅诊断；不要向历史入口追加 --human 或 --diagnostics。
```
<!-- YSS_CLI_HELP_END -->
