# 命令参考

本页以 Rust CLI `3.8.0` 与其内嵌 Template `5.8.0` 为操作基线。先运行 `yss version` 和 `yss --help`，核对实际版本、源码来源与 Bundle 摘要。模板源码可以继续更新，项目取得的模板和技能由当前程序内嵌 Bundle 决定。本轮工作台增强与新增查询参数随 CLI `3.11.0` 提供，采用前核对实际程序。

## 按场景选择命令

| 场景 | 命令 | 目标或结果 |
| --- | --- | --- |
| 新建方法项目或 Home | `init` | 不存在的目录或空目录 |
| 接入已有普通工程 | `attach` | 尚未接入 YSS 的已有目录 |
| 更新受管模板与技能 | `sync` | 已接入 YSS 的安装根 |
| 查看技能 | `skills list` | 当前 Profile 的可用技能和实际安装状态 |
| 补装技能 | `skills ensure <名称...>` | 所选技能、依赖与资源 |
| 查看生成配方 | `scaffold catalog` | Java 平台、版本、证据和 Frontend 环境声明 |
| 生成 Java 骨架 | `scaffold ddd` / `scaffold mvc` | 全新目标工程目录 |
| 生成 Vue 骨架 | `scaffold frontend` | 已有父目录中的全新目标工程目录 |
| 升级 CLI 程序 | `upgrade` | 独立工具目录 |
| 诊断项目或工具安装 | `doctor` | 安装来源、文件差异、冲突和事务状态 |
| 恢复未完成事务 | `recover` | 未完成写入的恢复或已提交事务的安全清理 |
| 打开个人 Spec 与工程工作台 | `workbench` | 本机浏览器、工程维护与隔离运行入口 |
| 登记或刷新主 Spec | `workbench register` | 主文件及其关联资源、问题 |
| 读取 Agent 续办要求 | `workbench request` | 已保存答复与材料上下文 |
| 保存真实答复或延期 | `workbench respond` | 答复记录和供回写使用的答复 ID |
| 查看个人状态与来源健康 | `workbench snapshot` | 只读快照 |
| 筛选 Spec 或已有任务 | `workbench query` | 只读查询结果 |
| 查看八阶段与历史 | `workbench lifecycle` | 指定 Spec 的阶段、任务和真实历史 |
| 保存目标、阶段证据与真实用户决定 | `workbench progress` | CLI 3.12.0 的目标版本、报告、确认及重新核对接口 |
| 核对程序与用法 | `version` / `help` | 实际版本、来源与帮助 |

写入命令默认直接执行。需要预览时，在同一条命令加 `--dry-run`，查看后再决定是否执行。init、attach、sync、skills ensure、scaffold 生成、upgrade 和 recover 支持预览。预览只读取和校验本次输入，在线升级预览仍访问发行信息。

## Profile 与安装范围

| 参数 | 值 | 用途 |
| --- | --- | --- |
| `--profile` | `spec` | 业务规格、产品设计与产品 Home 工程会话入口 |
| `--profile` | `backend` | Java 后端工程 |
| `--profile` | `frontend` | Vue 前端工程 |
| `--installation` | `project` | 技能、宿主入口及必要项目资料，新安装默认值 |
| `--installation` | `skills` | 项目内技能、宿主入口及必要引用资源 |

init 和 attach 必须指定 root 与 profile。sync 默认沿用原 Profile、安装范围和项目变量，显式 `--installation project|skills` 才切换安装范围。sync 的 `--profile` 用于校验原身份。一个安装根保持一个 Profile。

```text
yss init --root ./my-home --profile spec --installation project
yss attach --root ./existing-service --profile backend --installation skills
yss attach --root ./existing-web --profile frontend --installation skills
yss skills list --root ./my-home
yss skills ensure implement --root ./my-home
yss sync --root ./my-home --dry-run
yss sync --root ./my-home
```

以上示例按各自场景选择执行。init 要求目标不存在或为空，目标不存在时父目录须已存在。已有普通项目用 attach，已有受管项目用 sync。project 和 skills 都安装方法资源，应用源码由 scaffold 单独生成。skills 仍属于项目内安装，用户级独立技能沿原安装来源更新。

CLI `3.13.0` 内嵌 Template `5.13.0`，默认加入 `yss-help` 并采用新版技能名称。已有工程先升级 CLI，再预览和执行 `sync`，随后用 `skills list` 与目标宿主菜单核对实际入口。曾手动补装旧名时，仍需该能力且新名尚未安装的，可用 `skills ensure <新ID> --root <安装根>` 补装；旧名的 `retired` 诊断与新名安装状态分别核对。新旧名称、职责及提示词见[技能改名](../../agents/profile-skills.md#技能改名)。

CLI `3.6.0` 起在 init、attach 和 scaffold 成功后返回 `nextSteps`。Spec project 的指引要求 Agent 核实 Home 工程关系，真实地图由项目维护。scaffold 的指引可包含 attach skills 命令。`command.args` 是独立参数数组，Agent 沿用本次已核验的程序绝对路径执行。dry-run、sync 和 skills ensure 的 nextSteps 为 `[]`。Home 配置示例见 [Spec / Home 教程](tutorial-spec.md)。

## 生成源码

```text
yss scaffold catalog --json
yss scaffold mvc --project-name sample-api --base-package com.example.sample --output-dir . --group-id com.example --project-version 1.0.0-SNAPSHOT --dry-run
yss scaffold frontend --project-name sample-web --output-dir . --dry-run
```

Java 默认配方为 YSS `4.0.0-SNAPSHOT`、Spring Boot `4.1.2`、Java `17`。工程名、基础包、输出父目录、groupId 与工程版本五项必填，技术参数按 catalog 约束补齐。catalog 中的验证状态和范围限定配方证据，生成后按目标工程验证构建与运行。Vue 所需 Node/pnpm 从 catalog.frontend 和生成的 package.json 读取。目标工程必须不存在，包括已有空目录。实际生成时父目录须已存在，Frontend 预览也要求父目录存在。完整操作见 [Backend](tutorial-backend.md) 和 [Frontend](tutorial-frontend.md)。

## 升级、诊断与恢复

```text
yss upgrade --to <正式版本> --tool-root <工具目录> --dry-run
yss upgrade --artifact <归档绝对路径> --sha256 <实测SHA-256> --tool-root <工具目录> --dry-run
yss doctor --root <项目或工具目录> --json
yss recover --root <项目或工具目录> --dry-run
```

在线升级默认从 GitHub `iloveZzz/yss-cli` 读取正式 Release，可用 `--source gitlab` 显式选择固定 GitLab 来源。GitLab 需要 `YSS_GITLAB_CA_FILE` 和有读取权限的 `YSS_GITLAB_TOKEN`。来源失败后保留错误并由用户或 Agent 处理，离线归档与 `--source` 分开使用。首次安装、摘要校验与工具目录要求见 [安装与升级](install-and-verify.md)，文件冲突及事务处理见 [维护与恢复](tutorial-maintenance.md)。

## 输出与帮助

```text
yss help sync
yss workbench query --help
yss version --json
```

`--json` 返回 `format: "yss.output"`、`formatVersion: 1` 的单对象信封。成功时 status 为 ok，业务结果在 result，error 为 null。失败时 status 为 error，result 为 null，error 提供错误码、中文消息及可用上下文。普通成功报告同样是 JSON 业务对象。帮助支持 `-h` 与 `--help`，程序版本支持 `version` 与单独运行的 `--version`。旧 plan/apply、合同、门禁和插件执行接口已退役。

## 工作台查询与续办

```text
yss workbench
yss workbench --no-open --port 0
yss workbench snapshot --json
yss workbench query --entity spec --status doing --status blocked --json
yss workbench query --entity spec --activity all --include-closed --json
yss workbench query --entity task --stage verification --json
yss workbench query --entity spec --content-status draft --reminder writeback --json
yss workbench query --entity spec --needs-reconfirmation --json
yss workbench lifecycle --spec <SpecID> --json
yss workbench register --root <项目绝对路径> --source <主Spec项目相对路径> --json
yss workbench request --spec-id <SpecID> --json
```

工作台默认监听 127.0.0.1。关闭浏览器后服务和活动作业继续运行，按 Ctrl-C 或退出 CLI 会停止服务并中断作业。持续服务使用普通输出，读取快照使用 snapshot --json。snapshot、query、lifecycle 和 request 为只读命令，register 与 respond 写入个人数据。CLI `3.11.0` 的浏览器还提供工程维护、隔离 Codex 运行及按文件接收成果，操作使用所选目标与实际授权。已有任务与历史可通过 CLI 查询。

query 的 project、spec、stage、status 可重复，同一条件内为 OR，条件间为 AND。默认只看启用记录并隐藏终态，显式选择 done/canceled 时会包括相应终态。`--activity active|inactive|all` 选择启用范围，`--include-closed` 包括终态，`--source-problems` 仅看来源异常，`--q` 搜索文字，`--sort updatedDesc|titleAsc` 选择排序。本轮源码新增可重复的 `--content-status unmarked|draft|ready|confirmed`、`--reminder decision|research|overdue|writeback|ready` 及 `--needs-reconfirmation`，用于 Spec 内容状态、提醒和确认后产物变化筛选。lifecycle 展示调研、分析、规格、原型、交接、实施、验证、交付八阶段，当前关注阶段、Spec 状态与阶段进度分别维护。

个人数据保存在项目和 Git 工作树之外的独立目录，自定义 data-dir 使用真实绝对路径。当前使用 workbench.sqlite3。旧 JSON v1/v2/v3 的只读查询继续读取原文件，首次启动新版工作台或写入时先备份并迁入 SQLite。迁移后的 state.json 保存存储标记。CLI `3.11.0` 的设置页可在线生成一致备份并恢复到新的或空的个人数据目录。纯 CLI 或旧版可退出服务后复制完整目录，维护说明列出适用范围及恢复步骤。[维护与恢复](tutorial-maintenance.md)

register 从主文件的 `yss-spec` JSON 元数据读取范围、关联资源和问题。更新时复用同一登记。登记失败时保留源文件，修复具体错误后重试同一主文件。登记、答复保存、内容就绪和用户确认分别记录。

CLI `3.12.0` 提供 `workbench progress set-goal`、`report`、`confirm` 与 `reconcile`。工作台作业、日常研发和 PR/MR 跟进沿用同一 `dataDir`、`specId`、目标版本与真实工程版本上报；用户确认关联实际答复与展示证据，材料变化后重新核对适用性。先核对各子命令帮助，JSON 字段与保存顺序见[生命周期进度上报](../../agents/workbench-progress.md)。

### 浏览器操作顺序

1. 工程详情或“设置 → 工程维护”先查看执行内容，核对后执行，在“执行记录”观察或停止作业。根、Bundle、参数或文件变化后重新预览。
2. “项目 → 产品 Home”导入现有地图，核对字段并绑定本机工程。非标准表头填写字段映射，存在歧义时采用人工核对条目，关系继续在原地图维护。
3. 原 Spec 详情“运行 Codex”选择参与工程和需带入的未提交文件，在隔离 worktree 工作。执行详情答复输入、停止或续接，结束后核对冻结差异并逐文件接收，再刷新原 Spec。
4. Spec 信息、答复和阶段表单恢复已保存的本机草稿，并发变化逐字段合并。内容区比较确认版本，新确认保存实际快照，旧记录缺少正文时显示相应提示。
5. “设置 → 备份与恢复”在线生成一致归档，恢复到新的或空的个人数据目录后，按返回命令打开并核对路径及记录。

Git、支持 app-server 的 Codex 及 gh/glab 按本机实际可用环境使用。研发关联通过对应平台 CLI 的已有认证执行 GET，可指定 GitHub/GitLab 自建实例协议和端口，失败时保留上次成功状态与时间。

### 主文件、附件与答复兼容规则

刷新或再次 `register` 已登记的主 Spec 时，保留用户设置的启用／停用状态（`active`）。新需求无约定时使用固定创建日期与具体英文主题组成 key，主文件为 `docs/spec/<key>/<key>-spec.md`。支持新命名识别的 CLI 只归并同目录同 key、无自身元数据且被主文档 resources 明确本地引用的 `<key>-interaction.md`（kind=interaction）或 `<key>-design.md`（kind=supplement/other）。旧 `spec.md + interaction.md` 的无元数据推断保留。旧主文件有元数据时须明确本地引用交互说明，兼容原 kind。自身有效元数据保持独立，其他参考文件不因引用而停用。个人资源和正文链接不代表新附件归属，资源模型没有 owner。主文件 register/refresh 才停用符合条件的旧附件记录，单独刷新附件不合并。发现错误会告警并跳过候选。上述兼容性须用实际程序核验，模板更新和同名命令帮助不会使旧二进制获得新行为。

已有路径继续维护，不自动迁移。明确改名时，先核实原数据目录、Spec ID 和新路径是否被启用/停用记录占用。安全改名并更新正文链接、来源与个人资源后，先编辑原 Spec 的“主规格相对路径”，再 register 新路径并核对仍为原 ID。不能先新建登记再合并，停用不释放路径。改路径指向已归属附件会被拒绝。答复与历史保留，但路径参与摘要，纯改名后仍须重新核对确认。中途失败修复同一记录，不覆盖并发改动或创建补偿 Spec。

先从已有启动信息或续办文本核实工作台数据目录。使用自定义目录时，所有命令均以 `workbench --data-dir <已核实的绝对路径> ...` 执行，只有确认使用默认目录时才省略，不能在默认库另建登记。当前 web 资源会阻塞确认，需将相应资源项替换为已核验的项目内本地快照（`targetType: "local"`）。原链接可保留在正文来源中，同时保留 web 资源项仍会阻塞。

先查 `workbench respond --help`。支持时，答复使用 `respond --spec-id <ID> --question-id <原问题ID> --question-digest <当前摘要> --kind answer --answer <实际答复> --json`。延期使用 `--kind defer --reason <原因> --impact <影响> --excluded-scope <排除范围>`，并提供 `--review-at YYYY-MM-DD --review-utc-offset-minutes <当地UTC偏移分钟>`（中国为 `480`）或 `--review-when <复查条件>`。`request` 的 `result.text` 中问题 JSON 数组通过每项的 `question.id` 识别原问题，当前摘要和已保存答复 ID 分别在该项的 `digest`、`response.id`。实际答复 ID 也由 `respond` 的 `result.responseId` 返回。不要猜测 ID 或把旧答复应用到已变化问题。延期回写须在原问题同时写入 `status: "deferred"`、说明延期依据的非空 `resolution` 和本次真实延期答复 ID 对应的 `appliedDecisionId`。缺一仍为待回写，不能改成 resolved。用户原文须安全传参，保存答复不会自动回写规格或解决问题。
