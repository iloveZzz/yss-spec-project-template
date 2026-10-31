# 统一 CLI 操作说明

现行 Profile 使用同一固定 `yss` 二进制，仅提供 `spec` 综合研发主控与 `backend` 专职交付；产品与业务设计由 Spec 承担。旧 Design / Frontend 资料按固定版本用于历史核验与迁移，不作为新项目入口。

## 安装与来源核验

使用 `setup-yss-harness` 作为安装与维护入口，规则见 [统一协议](../process/harness-upgrade.md)。默认从 [官方最新正式 Release](https://github.com/iloveZzz/yss-cli/releases/latest) 取得本机平台产物及 `checksums.json`，排除草稿、预发布和未发布 main；不把当前版本写成长期默认。查询后固定 tag、完整源码 SHA、平台、归档大小及 SHA-256，核对包内 manifest、来源锁和平台发行资格。程序安装无需已有项目身份。

`setup` 指定工程时，在有效授权内将 CLI 与受管模板对齐所选固定版本：空目录初始化，普通工程接管，原生实例同步，旧实例迁移，插件绑定走插件公开接口。Profile 沿用合法身份；没有身份时按用途推荐，不能从框架或目录名猜测。程序与项目分别验收；CLI 已成功但项目失败时保留已验证程序、恢复项目自身，并报告整体未完成。

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

### 1. 核对能力和当前功能

```bash
yss version --json
yss capabilities --json
yss bundle inspect --profile spec --json
yss lifecycle target --help
```

程序能力清单应包含 `lifecycle-target-v1`，实例主控合同也须包含受支持的 `progression_target` 政策。帮助可以离线阅读，但不能证明实例能力或批准已经就绪。旧程序需取得支持能力的固定版本；旧原生实例另外审阅并应用 `sync` 计划，具体操作见[升级与回退](#升级与回退)。未发布开发候选和本机旧 `1.3.2` 不能仅凭版本号视为新策略已可用，来源和能力须实际核对。

该查询只读核验已有意图与当前证据；没有意图文件时读取政策默认目标，不补写历史配置。

### 2. 保存目标输入并规划

本地继续使用 `consumers: []`。把以下 JSON 保存到当前功能包已有临时目录中的 `target-input.json`。同一 Git 根同时承载治理与实现时，先核对临时目录已被项目现有规则忽略，避免输入草稿成为源码候选变化；工具不会自动新增忽略规则。

目标只能填写 `spec-approved`、`product-design-completed`、`backend-deliverable`、`frontend-accepted` 或 `business-accepted`。`intent_source` 保存原始用户指令来源，不填自报批准或完成状态。`plan-to-backend` 的永久职责只允许前三项；专职 Profile 的只读 `profile-terminal` 不能写入此 JSON。

### 3. 应用目标，再读取当前完成依据

成功 envelope 的 `result` 中：

| 字段 | 读法 |
|---|---|
| `progression.target`、`target_source`、`intent_source` | 本次目标及默认／显式来源 |
| `progression.status`、`reached`、`reason` | 当前证据核验结论及原因；`pending` 为待核验，`blocked` 为阻塞，`not-applicable` 必须有有效依据 |
| `progression.completion.milestone`、`.profile`、`.business` | 分别查看本次目标、本端职责和整体业务；不能用短目标达到替代整体业务完成 |
| `next_action` | 承接 Profile、治理根、工作单元及继续／等待／复验／目标已达原因 |

### 4. 从 Spec 继续设计，再继续业务交付

要继续整个功能时，同样把目标改为 `business-accepted`，重新规划、应用并复验。有效批准和稳定 Ticket ID 沿用原记录；真实资产或批准依据变化仍按现行规则使受影响证据失效。CLI 没有执行生命周期的推进引擎，修改目标不会自动写实现代码。业务验收完成后，提交、推送、合并与发布继续按各自实际授权处理。

### 5. 需要独立专职消费者时

默认本地主线直接消费批准资产，代码写入已登记实现仓，不创建另外三个治理工程或自导自入。用户明确选择独立工程时，在同一输入中替换 `consumers`，例如：

设置消费者不导出、导入或批准资产。产品设计在 Spec 内完成；独立 Backend 接收当前批准的战略基线，外部前端工具链按实际绑定消费适用后端交付。操作见 `yss handoff export --help`、`yss handoff import --help`、`yss handoff verify --help` ；交接步骤按[本地用户手册索引](用户手册索引.md)进入本端说明。版本失配、过期 Receipt、Context 冲突或缺适用证据不能汇总为业务完成。

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

## Context 校验与快照

合法 `template-source` 可只读执行 Context check/verify/query，不要求实例 metadata；项目实例仍须通过原有身份校验。缺二进制、快照能力、错误协议、实际非零退出或摘要漂移均阻断，需显式取得正确版本；不得回退旧校验入口。校验不创建批准或执行授权。

当前 Spec 模板在 Spec 中起草业务 Ticket，产品设计校准后完成业务正式化，再进入系统 / 数据架构与工程契约；无产品设计影响时从 Spec 直接进入业务正式化。工程契约和实现仓库准备闭合后，进入“实现切片拆分与合同准入”（`stage.ticket-formalization`），由生命周期批准当前 Slice 合同并复算就绪条件。业务 Ticket 不授予实现资格。

阶段名称和条件见[生命周期派生地图](../process/lifecycle-artifact-map.md)，工作单元依赖见[业务票协议](../process/business-tickets.md)。以下离线帮助消费 CLI 的固定 Bundle；新模板展示进入下一固定来源构建后，CLI 的来源摘要和阶段名称才相应更新。

<!-- YSS_CLI_HELP_START -->
<!-- Generated by go run ./tools/helpdocs; edit command metadata and fixed help views. -->
# YSS CLI 离线帮助与案例

终端默认中文摘要；管道和重定向保留原结果。`--human` 强制中文，`--json` 保持 outputVersion=1 / protocolVersion=1，二者互斥。`--json --diagnostics` 仅在失败时附加顶层诊断，不改变 `result`。帮助优先处理并始终为文本；它不读取项目、写入文件或访问网络。

诊断区分已确认原因、可能原因和待核验事项；处理命令标记只读、写入或联网。版本要求没有可核验记录时显示‘尚未登记’；远程确认使用 `yss upgrade --check`。

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
| `contract verify` | 执行当前领域规则和独立消费者绑定校验。 | `yss help examples contract verify` |
| `contract view` | 按当前 Slice 或唯一工作单元阅读；不验证批准、不授予执行权限。 | `yss help examples contract view` |
| `diff` | 查看当前文件相对固定模板的差异和同步计划。 | `yss help examples diff` |
| `doctor` | 检查项目身份、受管基线和冲突。 | `yss help examples doctor` |
| `evidence` | 校验 evidence 的结构或原生领域语义。 | `yss help examples evidence` |
| `evidence verify` | 执行当前领域规则和独立消费者绑定校验。 | `yss help examples evidence verify` |
| `handoff` | 校验 handoff 的结构或原生领域语义。 | `yss help examples handoff` |
| `handoff export` | 导出当前当前 Spec 基线及来源证据。 | `yss help examples handoff export` |
| `handoff import` | 按实际协议接入批准的交接基线。 | `yss help examples handoff import` |
| `handoff verify` | 执行当前领域规则和独立消费者绑定校验。 | `yss help examples handoff verify` |
| `init` | 创建固定模板来源的项目实例。 | `yss help examples init` |
| `lifecycle query` | 查询注册表中的稳定 ID。 | `yss help examples lifecycle query` |
| `lifecycle route` | 只读判定日常或正式交付路径。 | `yss help examples lifecycle route` |
| `lifecycle target` | 读取或事务设置 Spec 单功能的本次推进目标。 | `yss help examples lifecycle target` |
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
