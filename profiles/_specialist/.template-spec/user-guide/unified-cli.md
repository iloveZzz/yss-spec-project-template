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

支持日常能力的 CLI 对政策已启用的 Profile 提供两个只读接口（以下以 Spec 为例）：

```bash
yss lifecycle route --profile spec --root /absolute/path/spec --task docs/task.md --implementation-root /absolute/path/implementation --base <40位完整SHA> --json
yss lifecycle verify-daily --profile spec --root /absolute/path/spec --task docs/task.md --implementation-root /absolute/path/implementation --base <40位完整SHA> --json
```

第一项返回 `daily / governed / needs-info`、原因和必要检查；第二项核验当前差异、测试、独立审查与适用 API 证据。事实与实际证据保存在同一 Markdown Ticket/PR 的证据区，不生成阶段 checkpoint、批准或 `ready-for-agent`。策略只由生命周期编排合同 `request_triage.delivery_path` 定义；格式见生命周期 `references/daily-delivery.md`。旧 CLI、Profile 未启用或缺政策时返回不支持，不能套用正式校验器的豁免开关。正式任务不可降级；无关正式资产不阻断新的日常任务。

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
yss 1.3.5 — Spec / Design / Backend / Frontend 统一入口
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
  正式：入口分诊 → Plan（战略规划） → Spec / 功能架构 → 产品设计与业务 Ticket 正式化 → 系统 / 数据架构与工程契约 → 实现切片拆分与合同准入 → 垂直切片实现 → 验证 / 发布 / 复盘
  固定模板：d947b648aa5feac74bd17ddb407a666a28cf5dd2；来源摘要：39a8e314412faa8e3ffe82d6f834dbe81d512105df9ae2c49f17b70f21fb892c
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
来源摘要：template=d947b648aa5feac74bd17ddb407a666a28cf5dd2；registry=39a8e314412faa8e3ffe82d6f834dbe81d512105df9ae2c49f17b70f21fb892c；profile=尚未登记；policy=3617d6ba1b8236d56b0af517c9ed46fca437dabf6862d4124e18ac687c41b051
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
目标：固化解决方案和功能边界，同时按用户行为与验收结果起草业务 Ticket。
  yss stage query --root ./demo-spec --id stage.spec-architecture --json
  yss stage update --root ./demo-spec --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-spec/docs/stage-plan-next.json
  yss lifecycle verify --root ./demo-spec --checkpoint .work/feature/checkpoint.json --json --diagnostics
  更新计划经审阅后使用 stage apply；Spec 由批准的战略输入承接。
  同时起草业务 Ticket 草案及 FR/AC 覆盖；业务票不授予实现资格。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Spec 基线和功能边界可审查；适用业务 Ticket 草案及 FR/AC 覆盖可读取。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. 产品设计与业务 Ticket 正式化（stage.product-design）
目标：按产品设计影响校准页面流、状态和业务 Ticket；在技术分析前完成适用业务 Ticket 正式化。
  yss stage query --root ./demo-spec --id stage.product-design --json
  yss assets list --root ./demo-spec --json
  yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
  仅命中产品设计影响时使用原型与设计技能；未命中项按权威条件说明适用性。
  产品设计校准后完成 work-unit.business-ticket-formalization，再进入技术分析；无产品设计影响时从 Spec 直接进入业务正式化，不生成空原型。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的设计门禁通过，适用业务 Ticket 正式化及当前审查闭合；无产品设计影响时记录依据，从 Spec 进入业务正式化，不生成空原型。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. 系统 / 数据架构与工程契约（stage.system-data-engineering）
目标：消费已正式化业务 Ticket 和当前批准的 Spec / 设计，围绕当前交付范围固化系统、数据、工程基线及 API 契约。
  yss stage query --root ./demo-spec --id stage.system-data-engineering --json
  消费已正式化业务 Ticket 和当前批准的 Spec / 设计；工程契约围绕当前已确认交付范围形成。
  yss contract verify --root ./demo-spec --kind scaffold --file docs/scaffold.json --json --diagnostics
  yss handoff verify --root ./demo-spec --kind package --package docs/handoff --json
  API：OAS 3.1 YAML Draft → 锁定工具校验 → 独立 Review → Freeze → 实现与契约测试；由 OpenAPI 技能及负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：新建后端已由用户确认 DDD / MVC 与精确 Spring Boot 版本，既有工程已核验并复用登记值；受影响工程契约冻结或记录无 API 影响；required 脚手架证据齐全。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

6. 实现切片拆分与合同准入（stage.ticket-formalization）
目标：消费冻结工程契约和当前实现仓库准备，将业务 Ticket 细化为可独立验证的实现切片，并批准当前 Slice Implementation Contract。
  yss stage query --root ./demo-spec --id stage.ticket-formalization --json
  yss contract verify --root ./demo-spec --kind slice --file docs/contract.json --checkpoint .work/feature/checkpoint.yaml --json --diagnostics
  输入为批准且当前的 Slice 合同及其消费证据；校验器不创建批准或设置 ready-for-agent。
  本阶段承接实现切片拆分与合同准入，工程契约和实现仓库准备须先闭合；业务 Ticket 正式化已在技术分析前完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：切片范围窄、依赖清晰、验收与测试 seam 可执行；工程前置闭合、合同批准且当前，生命周期复算后才能 ready-for-agent。
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
来源摘要：template=d947b648aa5feac74bd17ddb407a666a28cf5dd2；policy=3617d6ba1b8236d56b0af517c9ed46fca437dabf6862d4124e18ac687c41b051；日常能力=true
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
来源摘要：template=d947b648aa5feac74bd17ddb407a666a28cf5dd2；registry=39a8e314412faa8e3ffe82d6f834dbe81d512105df9ae2c49f17b70f21fb892c；profile=尚未登记；policy=3617d6ba1b8236d56b0af517c9ed46fca437dabf6862d4124e18ac687c41b051
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
目标：固化解决方案和功能边界，同时按用户行为与验收结果起草业务 Ticket。
  yss stage query --root ./demo-spec --id stage.spec-architecture --json
  yss stage update --root ./demo-spec --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-spec/docs/stage-plan-next.json
  yss lifecycle verify --root ./demo-spec --checkpoint .work/feature/checkpoint.json --json --diagnostics
  更新计划经审阅后使用 stage apply；Spec 由批准的战略输入承接。
  同时起草业务 Ticket 草案及 FR/AC 覆盖；业务票不授予实现资格。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Spec 基线和功能边界可审查；适用业务 Ticket 草案及 FR/AC 覆盖可读取。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. 产品设计与业务 Ticket 正式化（stage.product-design）
目标：按产品设计影响校准页面流、状态和业务 Ticket；在技术分析前完成适用业务 Ticket 正式化。
  yss stage query --root ./demo-spec --id stage.product-design --json
  yss assets list --root ./demo-spec --json
  yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
  仅命中产品设计影响时使用原型与设计技能；未命中项按权威条件说明适用性。
  产品设计校准后完成 work-unit.business-ticket-formalization，再进入技术分析；无产品设计影响时从 Spec 直接进入业务正式化，不生成空原型。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的设计门禁通过，适用业务 Ticket 正式化及当前审查闭合；无产品设计影响时记录依据，从 Spec 进入业务正式化，不生成空原型。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. 系统 / 数据架构与工程契约（stage.system-data-engineering）
目标：消费已正式化业务 Ticket 和当前批准的 Spec / 设计，围绕当前交付范围固化系统、数据、工程基线及 API 契约。
  yss stage query --root ./demo-spec --id stage.system-data-engineering --json
  消费已正式化业务 Ticket 和当前批准的 Spec / 设计；工程契约围绕当前已确认交付范围形成。
  yss contract verify --root ./demo-spec --kind scaffold --file docs/scaffold.json --json --diagnostics
  yss handoff verify --root ./demo-spec --kind package --package docs/handoff --json
  API：OAS 3.1 YAML Draft → 锁定工具校验 → 独立 Review → Freeze → 实现与契约测试；由 OpenAPI 技能及负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：新建后端已由用户确认 DDD / MVC 与精确 Spring Boot 版本，既有工程已核验并复用登记值；受影响工程契约冻结或记录无 API 影响；required 脚手架证据齐全。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

6. 实现切片拆分与合同准入（stage.ticket-formalization）
目标：消费冻结工程契约和当前实现仓库准备，将业务 Ticket 细化为可独立验证的实现切片，并批准当前 Slice Implementation Contract。
  yss stage query --root ./demo-spec --id stage.ticket-formalization --json
  yss contract verify --root ./demo-spec --kind slice --file docs/contract.json --checkpoint .work/feature/checkpoint.yaml --json --diagnostics
  输入为批准且当前的 Slice 合同及其消费证据；校验器不创建批准或设置 ready-for-agent。
  本阶段承接实现切片拆分与合同准入，工程契约和实现仓库准备须先闭合；业务 Ticket 正式化已在技术分析前完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：切片范围窄、依赖清晰、验收与测试 seam 可执行；工程前置闭合、合同批准且当前，生命周期复算后才能 ready-for-agent。
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
来源摘要：template=9c17657857002fb7fd9591151e1f1e6c2691b3fb；registry=78be460bcee78a5325f36c8f3c4b2c1454ab7821fea456eab4fefb0b73df3220；profile=581e38f7bc9c75f4ffc832ccbb7a8458d29060efb7bd0ea390514936847e1fe0；policy=尚未登记
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
来源摘要：template=c229b7194a74b6559486c9cd642295e840767d91；registry=6fa2b28b4838182e46f5f5b0b4222382153dbe89e5ede7245e23bef5dbd54a85；profile=daf3ad0ce3ca83ee539ea10913fe2f1bf39767e17eae3b463095abb6f942b59c；policy=尚未登记
前置条件：合法项目身份，从当前任务最近可信阶段继续；阶段触发与退出条件由该 Profile 固定模板及项目当前资产核验。
输入材料：当前 checkpoint、已确认战略/Spec/合同和相应证据。路径示例使用新项目 .work；旧项目按 tracker.root 替换。以下需要当前资产的命令在材料齐备后执行。

1. Plan（战略规划）（stage.plan）
目标：确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。
  yss stage query --root ./demo-backend --id stage.plan --json
  yss stage register --root ./demo-backend --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-backend/docs/stage-plan.json
  yss stage apply --root ./demo-backend --plan-file docs/stage-plan.json --json
  工作项 JSON 与 checkpoint 由当前任务准备；重定向保存原始计划，不加 --json envelope。Plan 撰写和批准由对应 Skill/负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的战略与阶段决策检查通过，用户统一批准当前 Plan；影响业务边界、关键规则或 MVP 的问题已解决，其他未决项有责任人和解决时点；下游可进入 Spec，不代表可实现。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

2. Spec / 功能架构（stage.spec-architecture）
目标：固化解决方案和功能边界。
  yss stage query --root ./demo-backend --id stage.spec-architecture --json
  yss stage update --root ./demo-backend --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-backend/docs/stage-plan-next.json
  yss lifecycle verify --root ./demo-backend --checkpoint .work/feature/checkpoint.json --json --diagnostics
  更新计划经审阅后使用 stage apply；Spec 由批准的战略输入承接。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Spec 基线和功能边界可审查。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

3. Harness 入口（stage.harness-entry）
目标：校验仓库身份、上游输入、影响面和实现仓库上下文。
  yss stage query --root ./demo-backend --id stage.harness-entry --json
  yss doctor --root ./demo-backend --json
  yss context verify --root ./demo-backend --json
  yss lifecycle query --root ./demo-backend --id work-unit.harness-entry --json
预期结果：查询/核验当前输入与适用条件。
下一步条件：上游输入版本当前，影响面、项目根、分支、写入范围和验证命令可解释。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. 技术设计（stage.technical-design）
目标：按已确认的 DDD 或 MVC 架构把批准需求细化为可实现、可验证的设计。
  yss stage query --root ./demo-backend --id stage.technical-design --json
  yss handoff verify --root ./demo-backend --kind package --package docs/handoff --json --diagnostics
  yss lifecycle status --root ./demo-backend --checkpoint .work/feature/checkpoint.yaml --json
  消费当前上游接收与工程约束；适用的技术/前端设计 Skill 及负责人完成设计、独立审查和批准。输入通过不授予实现资格。
预期结果：查询/核验当前输入与适用条件。
下一步条件：新建后端的架构与精确 Spring Boot 版本已由用户确认，既有工程已核验并复用登记架构与实际版本；后端 Technical Design Contract 已批准且当前；数据影响为真时数据架构已批准，否则有可核验的不适用记录；gate.engineering-contract-approved 已通过。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. 实现仓库准备（stage.implementation-repository-preparation）
目标：在已批准的技术/数据设计之后接入既有仓库或生成纯机械后端骨架。
  yss stage query --root ./demo-backend --id stage.implementation-repository-preparation --json
  yss contract verify --root ./demo-backend --kind scaffold --file docs/scaffold.json --json --diagnostics
  由工程接入或脚手架 Skill 在批准且当前的工程合同下接入真实实现仓；先核对 Scaffold/Preparation 证据。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Implementation Repository Preparation Result v2 当前且通过；新生成仅使用 Scaffold Contract/Manifest v4，历史 v3 已完成恢复对账。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

6. Slice Contract（stage.slice-contract）
目标：将战术设计和冻结契约编译为一个跨前后端测试的实现合同。
  yss stage query --root ./demo-backend --id stage.slice-contract --json
  yss contract verify --root ./demo-backend --kind slice --file docs/contract.json --checkpoint .work/feature/checkpoint.yaml --json --diagnostics
  消费批准且当前的 Slice 合同、条件化交接与工程输入；编译器不创建批准。
预期结果：查询/核验当前输入与适用条件。
下一步条件：合同版本当前、四个角色分区完整、写路径和验证命令明确，且就绪公式满足。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

7. 垂直切片实现（stage.slice-implementation）
目标：由前端、后端和测试 Agent 按同一合同并行实现和验证。
  yss stage query --root ./demo-backend --id stage.slice-implementation --json
  yss skills list --root ./demo-backend --json
  yss lifecycle status --root ./demo-backend --checkpoint .work/feature/checkpoint.yaml --json
  仅按批准合同的写范围实现；需要的 Skill 闭包来自当前合同。前端在实际实现仓 pnpm，后端优先根 ./mvnw；记录真实测试并由独立审查者审查。
预期结果：查询/核验当前输入与适用条件。
下一步条件：行为实现、测试证据、契约一致性和写入边界均满足合同。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

8. 独立验证（stage.verification）
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
来源摘要：template=85ebd4fa0e9041b09aa8fc393cfd9ba9e12cac7c；registry=347a8002f15be52cb67a819392d6b26a75b74895a9bcfbb8436b036ff175a2b1；profile=c4c1a7f9fb065b0b7f2b77fe3b204f81c0d98ce418066f5265e43167fa40690a；policy=尚未登记
前置条件：合法项目身份，从当前任务最近可信阶段继续；阶段触发与退出条件由该 Profile 固定模板及项目当前资产核验。
输入材料：当前 checkpoint、已确认战略/Spec/合同和相应证据。路径示例使用新项目 .work；旧项目按 tracker.root 替换。以下需要当前资产的命令在材料齐备后执行。

1. Plan（战略规划）（stage.plan）
目标：确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。
  yss stage query --root ./demo-frontend --id stage.plan --json
  yss stage register --root ./demo-frontend --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-frontend/docs/stage-plan.json
  yss stage apply --root ./demo-frontend --plan-file docs/stage-plan.json --json
  工作项 JSON 与 checkpoint 由当前任务准备；重定向保存原始计划，不加 --json envelope。Plan 撰写和批准由对应 Skill/负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的战略与阶段决策检查通过，用户统一批准当前 Plan；影响业务边界、关键规则或 MVP 的问题已解决，其他未决项有责任人和解决时点；下游可进入 Spec，不代表可实现。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

2. Spec / 功能架构（stage.spec-architecture）
目标：固化解决方案和功能边界。
  yss stage query --root ./demo-frontend --id stage.spec-architecture --json
  yss stage update --root ./demo-frontend --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-frontend/docs/stage-plan-next.json
  yss lifecycle verify --root ./demo-frontend --checkpoint .work/feature/checkpoint.json --json --diagnostics
  更新计划经审阅后使用 stage apply；Spec 由批准的战略输入承接。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Spec 基线和功能边界可审查。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

3. Harness 入口（stage.harness-entry）
目标：校验仓库身份、上游输入、影响面和实现仓库上下文。
  yss stage query --root ./demo-frontend --id stage.harness-entry --json
  yss doctor --root ./demo-frontend --json
  yss context verify --root ./demo-frontend --json
  yss lifecycle query --root ./demo-frontend --id work-unit.harness-entry --json
预期结果：查询/核验当前输入与适用条件。
下一步条件：上游输入版本当前，影响面、项目根、分支、写入范围和验证命令可解释。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. 前端工程设计（stage.frontend-engineering-design）
目标：联合输入通过后定义组件、状态管理、API 消费和前端测试边界。
  yss stage query --root ./demo-frontend --id stage.frontend-engineering-design --json
  yss handoff verify --root ./demo-frontend --kind package --package docs/handoff --json --diagnostics
  yss lifecycle status --root ./demo-frontend --checkpoint .work/feature/checkpoint.yaml --json
  消费当前上游接收与工程约束；适用的技术/前端设计 Skill 及负责人完成设计、独立审查和批准。输入通过不授予实现资格。
预期结果：查询/核验当前输入与适用条件。
下一步条件：前端实现计划可审阅；本地无领域影响已记录 not-applicable，新领域问题回交上游。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. Slice Contract（stage.slice-contract）
目标：将当前前端工程设计、条件化后端交付和冻结契约编译为前端垂直切片实现合同。
  yss stage query --root ./demo-frontend --id stage.slice-contract --json
  yss contract verify --root ./demo-frontend --kind slice --file docs/contract.json --checkpoint .work/feature/checkpoint.yaml --json --diagnostics
  消费批准且当前的 Slice 合同、条件化交接与工程输入；编译器不创建批准。
预期结果：查询/核验当前输入与适用条件。
下一步条件：合同版本当前、四个角色分区完整、写路径和验证命令明确，且就绪公式满足。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

6. 垂直切片实现（stage.slice-implementation）
目标：由前端、后端和测试 Agent 按同一合同并行实现和验证。
  yss stage query --root ./demo-frontend --id stage.slice-implementation --json
  yss skills list --root ./demo-frontend --json
  yss lifecycle status --root ./demo-frontend --checkpoint .work/feature/checkpoint.yaml --json
  仅按批准合同的写范围实现；需要的 Skill 闭包来自当前合同。前端在实际实现仓 pnpm，后端优先根 ./mvnw；记录真实测试并由独立审查者审查。
预期结果：查询/核验当前输入与适用条件。
下一步条件：行为实现、测试证据、契约一致性和写入边界均满足合同。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

7. 独立验证（stage.verification）
目标：由测试 Agent 以独立执行态完成 Fresh Verification 和合并前复核。
  yss stage query --root ./demo-frontend --id stage.verification --json
  yss evidence verify --root ./demo-frontend --kind verification --file docs/verification.json --json --diagnostics
  yss project-ci verify --root ./demo-frontend --base "<已确认40位SHA>" --runtime-store off --json
  yss lifecycle verify --root ./demo-frontend --checkpoint .work/feature/checkpoint.yaml --json
  核验消费已有证据；真实发布、推送与外部动作消费相应授权，复盘保留实际结论。
预期结果：查询/核验当前输入与适用条件。
下一步条件：所有命中门禁通过，阻塞信号清空，证据可读且 checkpoint 可追溯。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

8. 产品设计（stage.product-design）
目标：在存在产品设计影响时校准页面流和状态。
  yss stage query --root ./demo-frontend --id stage.product-design --json
  yss assets list --root ./demo-frontend --json
  yss lifecycle status --root ./demo-frontend --checkpoint .work/feature/checkpoint.yaml --json
  仅命中产品设计影响时使用原型与设计技能；未命中项按权威条件说明适用性。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的设计门禁通过；未命中项记录 not-applicable 及原因。
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
| `contract view` | 按当前 Slice 或唯一工作单元阅读；不验证批准、不授予执行权限。 | `yss help examples contract view` |
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
| `skills list` | 列出当前 Profile 支持的标识；--details 返回注册信息及安装声明。 | `yss help examples skills list` |
| `skills resolve` | 只读核验所选内置技能及命中的上下文依赖。 | `yss help examples skills resolve` |
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

## 错误索引

```text
YSS 错误索引（查看详情：yss help errors <错误码>）
  AMBIGUOUS                      事务或恢复状态需要处理
  APPROVAL_REBIND_REQUIRED       当前治理条件或证据未满足
  ARCHIVE                        归档或 XML 输入无法读取
  ARGS                           命令或参数不符合当前接口
  ARGUMENT                       命令或参数不符合当前接口
  ARTIFACT                       发行包或安装材料核验失败
  ASSET                          当前治理条件或证据未满足
  ASSET_ALIAS                    输入资产格式或 Schema 校验失败
  ASSET_DEPTH                    输入资产格式或 Schema 校验失败
  ASSET_DUPLICATE_KEY            输入资产格式或 Schema 校验失败
  ASSET_EMPTY                    输入资产格式或 Schema 校验失败
  ASSET_KEY                      输入资产格式或 Schema 校验失败
  ASSET_MULTIPLE_DOCUMENTS       输入资产格式或 Schema 校验失败
  ASSET_NUMBER                   输入资产格式或 Schema 校验失败
  ASSET_PARSE                    输入资产格式或 Schema 校验失败
  ASSET_TAG                      输入资产格式或 Schema 校验失败
  ASSET_TRANSACTION_PENDING      事务或恢复状态需要处理
  ASSET_UNICODE                  输入资产格式或 Schema 校验失败
  ASSET_UTF8                     输入资产格式或 Schema 校验失败
  BASELINE                       当前来源、格式或能力不兼容
  BASE_BUNDLE                    保存计划或当前输入未通过核验
  BINDING                        插件 binding 与固定来源不一致
  BINDING_CONFLICT               插件 binding 与固定来源不一致
  BINDING_REQUIRED               插件 binding 与固定来源不一致
  BUNDLE                         当前来源、格式或能力不兼容
  BUNDLE_RULE                    当前来源、格式或能力不兼容
  CANCELLED                      事务或恢复状态需要处理
  CANDIDATE_DRIFT                保存计划或当前输入未通过核验
  CAPABILITY                     当前来源、格式或能力不兼容
  CHECKPOINT_REQUIRED            当前治理条件或证据未满足
  CI_CONFIG                      当前治理条件或证据未满足
  CI_CONFLICT                    当前治理条件或证据未满足
  CI_EVIDENCE_DRIFT              当前治理条件或证据未满足
  CI_IDENTITY                    当前治理条件或证据未满足
  CI_INPUT                       当前治理条件或证据未满足
  CI_RECEIPT                     当前治理条件或证据未满足
  CI_REFERENCE                   当前治理条件或证据未满足
  CI_SCOPE                       当前治理条件或证据未满足
  CI_SOURCE                      当前治理条件或证据未满足
  CONCURRENT                     文件冲突或用户后续修改阻止操作
  CONFLICT                       文件冲突或用户后续修改阻止操作
  CONTEXT                        当前治理条件或证据未满足
  CONTEXT_MISSING                当前治理条件或证据未满足
  CONTEXT_REFERENCE              当前治理条件或证据未满足
  CONTEXT_SNAPSHOT               当前治理条件或证据未满足
  CONTEXT_SNAPSHOT_STALE         当前治理条件或证据未满足
  CONTRACT_INVALID               操作未完成
  CONTRACT_SCHEMA                操作未完成
  DIGEST                         发行包或安装材料核验失败
  EVIDENCE                       当前治理条件或证据未满足
  EXECUTION                      操作未完成
  EXISTS                         文件冲突或用户后续修改阻止操作
  FRONTEND_PROBE_AUTHORIZATION   当前治理条件或证据未满足
  FRONTEND_PROBE_UNAVAILABLE     当前治理条件或证据未满足
  GIT_BASELINE                   当前治理条件或证据未满足
  GIT_IGNORE                     文件冲突或用户后续修改阻止操作
  GOVERNED_REQUIRED              当前治理条件或证据未满足
  HANDOFF_POLICY_CAPABILITY      当前治理条件或证据未满足
  IDENTITY                       项目身份或路径无法核验
  IMMUTABLE                      文件冲突或用户后续修改阻止操作
  INPUT                          当前治理条件或证据未满足
  INPUT_DRIFT                    保存计划或当前输入未通过核验
  INSTALLATION                   发行包或安装材料核验失败
  INTERNAL                       操作未完成
  INTERRUPTED                    事务或恢复状态需要处理
  INVALID                        命令或参数不符合当前接口
  KIND                           命令或参数不符合当前接口
  LEGACY                         当前来源、格式或能力不兼容
  LEGACY_INTERRUPTED             事务或恢复状态需要处理
  LEGACY_POLICY                  当前来源、格式或能力不兼容
  LIFECYCLE                      当前治理条件或证据未满足
  LIFECYCLE_ID                   当前治理条件或证据未满足
  LOCATOR_INVALID                操作未完成
  LOCKED                         事务或恢复状态需要处理
  MERGE                          文件冲突或用户后续修改阻止操作
  MIGRATION_REQUIRED             当前来源、格式或能力不兼容
  MISSING_REFERENCE              当前治理条件或证据未满足
  NEEDS_INFO                     当前治理条件或证据未满足
  NETWORK                        固定来源网络请求失败
  NOT_FOUND                      项目身份或路径无法核验
  PATH                           项目身份或路径无法核验
  PERMISSION                     项目身份或路径无法核验
  PLAN                           保存计划或当前输入未通过核验
  PLAN_REQUIRED                  保存计划或当前输入未通过核验
  PLAN_REVIEW_POLICY_INVALID     保存计划或当前输入未通过核验
  PLAN_REVIEW_PROTOCOL_REQUIRED  保存计划或当前输入未通过核验
  PLAN_VERSION                   保存计划或当前输入未通过核验
  PLATFORM                       发行包或安装材料核验失败
  PROFILE                        项目身份或路径无法核验
  PROFILE_LINKS                  项目身份或路径无法核验
  PROFILE_ROUTE                  当前治理条件或证据未满足
  PROGRESSION_BINDING            插件 binding 与固定来源不一致
  PROGRESSION_EVIDENCE           当前治理条件或证据未满足
  PROGRESSION_TARGET             命令或参数不符合当前接口
  PROGRESSION_TARGET_BLOCKED     当前治理条件或证据未满足
  PROJECT_CI_REJECTED            当前治理条件或证据未满足
  PROTECTED                      文件冲突或用户后续修改阻止操作
  PROVENANCE                     当前来源、格式或能力不兼容
  READONLY_SOURCE_LAYOUT_REQUIRED 当前治理条件或证据未满足
  READ_ONLY                      当前治理条件或证据未满足
  RECOVERY_FAILED                事务或恢复状态需要处理
  RESOLUTION                     保存计划或当前输入未通过核验
  RESOLUTION_POLICY              保存计划或当前输入未通过核验
  RESOLUTION_STALE               保存计划或当前输入未通过核验
  ROOT                           项目身份或路径无法核验
  RUNTIME                        运行记录或运行存储状态异常
  RUNTIME_BUSY                   运行记录或运行存储状态异常
  RUNTIME_DATA                   运行记录或运行存储状态异常
  RUNTIME_INTEGRITY              运行记录或运行存储状态异常
  RUNTIME_OWNER                  运行记录或运行存储状态异常
  RUNTIME_SCHEMA                 运行记录或运行存储状态异常
  RUNTIME_STATE                  运行记录或运行存储状态异常
  SCHEMA                         输入资产格式或 Schema 校验失败
  SCHEMA_DRAFT_UNSUPPORTED       输入资产格式或 Schema 校验失败
  SCHEMA_ID                      输入资产格式或 Schema 校验失败
  SCHEMA_ID_CONFLICT             输入资产格式或 Schema 校验失败
  SCHEMA_OFFLINE                 输入资产格式或 Schema 校验失败
  SCHEMA_REF                     输入资产格式或 Schema 校验失败
  SCHEMA_REGEX_INCOMPATIBLE      输入资产格式或 Schema 校验失败
  SCHEMA_VALIDATION              输入资产格式或 Schema 校验失败
  SCOPE                          命令或参数不符合当前接口
  SKILL                          当前治理条件或证据未满足
  STALE                          操作未完成
  STATE                          事务或恢复状态需要处理
  SYNC_REQUIRED                  当前来源、格式或能力不兼容
  TRACKER                        当前治理条件或证据未满足
  TRACKING_CANCEL                当前治理条件或证据未满足
  TRACKING_COMPLETION            当前治理条件或证据未满足
  TRACKING_CONFLICT              当前治理条件或证据未满足
  TRACKING_DEFERRAL              当前治理条件或证据未满足
  TRACKING_DEFINITION            当前治理条件或证据未满足
  TRACKING_DEPENDENCY            当前治理条件或证据未满足
  TRACKING_ENTRY                 当前治理条件或证据未满足
  TRACKING_FEATURE               当前治理条件或证据未满足
  TRACKING_ID                    当前治理条件或证据未满足
  TRACKING_IDENTITY              当前治理条件或证据未满足
  TRACKING_PATH                  当前治理条件或证据未满足
  TRACKING_PROFILE               当前治理条件或证据未满足
  TRACKING_PROGRESS              当前治理条件或证据未满足
  TRACKING_REQUIRED              当前治理条件或证据未满足
  TRACKING_ROUTE                 当前治理条件或证据未满足
  TRACKING_SCHEMA                当前治理条件或证据未满足
  TRACKING_STAGE                 当前治理条件或证据未满足
  TRACKING_STALE                 当前治理条件或证据未满足
  TRACKING_TRANSITION            当前治理条件或证据未满足
  TRANSACTION_PROFILE            事务或恢复状态需要处理
  TRANSACTION_SCOPE              事务或恢复状态需要处理
  UNKNOWN_ALIAS                  命令或参数不符合当前接口
  UNPORTED                       当前来源、格式或能力不兼容
  VERIFY                         当前治理条件或证据未满足
  VERSION                        当前来源、格式或能力不兼容
  WORK_LAYOUT_CHECKPOINT         当前治理条件或证据未满足
  WORK_LAYOUT_CONFIG             当前治理条件或证据未满足
  WORK_LAYOUT_FEATURE            当前治理条件或证据未满足
  WORK_LAYOUT_MIGRATION_REQUIRED 当前治理条件或证据未满足
  WORK_LAYOUT_PATH               当前治理条件或证据未满足
  WORK_LAYOUT_PERMISSION         当前治理条件或证据未满足
  WORK_LAYOUT_REFERENCE          当前治理条件或证据未满足
  WORK_LAYOUT_RESERVED           当前治理条件或证据未满足
  WORK_LAYOUT_SCHEMA             当前治理条件或证据未满足
  WORK_LAYOUT_SOURCE             当前治理条件或证据未满足
  WORK_LAYOUT_VERIFY             当前治理条件或证据未满足
  XML                            归档或 XML 输入无法读取
  XML_LIMIT                      归档或 XML 输入无法读取
  YSS_ARGUMENT_INVALID           命令或参数不符合当前接口
  YSS_COMMAND_FAILED             操作未完成
  YSS_FAMILY_IDENTITY_INVALID    项目身份或路径无法核验
  YSS_GIT_PROTECTED              文件冲突或用户后续修改阻止操作
  YSS_IDENTITY_INVALID           项目身份或路径无法核验
  YSS_METADATA_INVALID           当前来源、格式或能力不兼容
  YSS_MIGRATION_CONFLICT         文件冲突或用户后续修改阻止操作
  YSS_OWNERSHIP_PROTECTED        文件冲突或用户后续修改阻止操作
  YSS_PATH_SAFETY                项目身份或路径无法核验
  YSS_SNAPSHOT_INVALID           当前来源、格式或能力不兼容
  YSS_TARGET_INVALID             项目身份或路径无法核验
  YSS_UNPORTED                   当前来源、格式或能力不兼容
  YSS_UNSAFE_PATH                项目身份或路径无法核验
  ZIP                            归档或 XML 输入无法读取
  ZIP_LIMIT                      归档或 XML 输入无法读取

```
<!-- YSS_CLI_HELP_END -->
