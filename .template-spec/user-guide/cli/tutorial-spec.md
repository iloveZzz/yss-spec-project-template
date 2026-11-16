# Spec / Home 项目

Spec 仓承载产品定义、业务规格、原型和交互说明，也是该产品及关联工程的默认会话入口。可以在这里连续提出产品和研发目标。技术方案、源码、构建与验证保存在各实现仓，Agent 在当前会话整合结果。

本教程以 Rust CLI `3.8.0` 与内嵌 Template `5.8.0` 为操作基线。先运行 `yss version` 和 `yss --help`，核对实际程序与 Bundle 来源。模板源码继续更新时，项目取得的内容仍由所用程序的内嵌 Bundle 决定。

## 创建或接入 Home

以下命令分别用于新 Home 和已有普通规格仓，按目录现状选择一项。新目录的父目录须已存在，init 也接受已有空目录。

```text
yss init --root ./my-home --profile spec --installation project
yss attach --root ./existing-spec --profile spec --installation project
```

已有受管仓沿原 Profile 和安装范围同步。

```text
yss sync --root ./existing-spec --dry-run
yss sync --root ./existing-spec
yss skills list --root ./existing-spec
```

需要只在当前仓安装 Spec 方法时显式选择 `--installation skills`。CLI 提供安装入口、技能与地图模板，由 Agent 在任务授权内核实和填写真实 Home 关系。

新安装仍默认 project。spec/skills 只按当前仓库职责安装方法，不自动改成 Home。安装成功报告中的 nextSteps 是待核实的后续建议，不能作为 Home 关系已配置的证明。预览不表示安装完成。

## 从 Home 开展工作

向 Agent 提供目标、现有需求、业务词汇和允许修改的工程。Agent 先读相关材料，复用有效成果，缺少关键业务决定时询问。无需登记阶段、编制批准包或通过 CLI 资格门禁才开始。

工程关系沿用已有 README 索引或仓库地图。明确要求配置 Home 时，Agent 使用 setup 中的模板按真实资料补齐，独立地图默认命名为 `REPOSITORIES.md`。地图由项目维护，记录稳定身份、职责与资料入口，个人路径、当前分支及进度不写入共享地图。CLI 安装只提供方法和模板，不会自动填充真实关系。`skills` 安装不要求创建地图或改变项目定位。已有明确工程位置时可以直接工作。

例如，“把桌面端保存按钮改成提交”直接进入对应前端工程。“按这份规格调整联系人展示名，完成 API 和 Web 两侧修改”会核查实际调用关系、分工并逐仓验证。“实现移动端的查询功能”但找不到移动端 checkout 时，Agent 先查已知资料，仍缺位置才询问，不猜目录或自动检出所有仓库。只要求分析影响、确认 Spec 或准备交接时保持原范围。

进入工程时会核对 Git 身份与本次工作树，读取目标入口、局部规则及有效技能。多个 checkout 无法按已有任务消歧时，只暂停相关写入。切换 shell 目录不代表目标规则已经自动加载。上游包含未提交修改时明确采用的内容。来源变化只影响对应工作，结果按仓库说明实际修改、检查与剩余事项。

一个产品可以有 Home、客户后端、订单后端、Web、Mobile 和共享 UI。可以是并列独立仓，也可以是同仓的 `spec/`、`services/customer-api/`、`services/order-api/`、`apps/web/` 等不重叠安装根。每个安装根使用一个 Profile，不能在同一收据里叠加 Backend 和 Frontend。父子安装根没有共享锁，不能据此并发修改重叠文件。

例如增加客户查询条件时，Home 先读选定业务规则，再核对客户 API 与实际客户端调用。订单后端不因列在地图里就改动。契约明确后相关前后端可并行，共享契约指定一人维护。API 的权威内容留在后端或契约仓，Home 记录引用。中途规则变化时保留原版本结果，只调整受影响部分。续办从已有任务记录恢复输入、工程和剩余依赖，重新核实工作树及服务来源。mock、客户端构建、真实联调分别报告，端口或服务属于其他任务时使用独立资源。

旧项目需先使用包含这些方法的 Bundle，再沿原 Profile 与安装范围 `sync`。查看 `skills list` 和实际文件确认 `implement` 已补齐，同步成功或确认无需同步且缺少时，按实际帮助使用 `skills ensure implement --root <Home目录>`。sync 已报冲突时先处理差异，不用 ensure 绕过。源模板更新不自动改写项目地图或已有 README 事实。入口定制按实际安装记录处理冲突，不强制覆盖，保留已有地图位置及有效授权。

## 维护同一需求的主 Spec

同一需求使用一个主 Spec，交互说明、原型和补充资料从该 Spec 进入。草稿保存后就能查看。生成或更新时，Agent 会在当前聊天澄清关键业务选择，说明影响和建议。能自行查明的事实由 Agent 调查。未决项只阻塞依赖它的范围，其他工作继续，不把一串文末问题当作已经完成。

新需求没有指定位置或已有约定时，文件位置采用首次创建日期、具体需求主题和文档类型。以下以用户批量导入为例。

```text
docs/spec/2026-11-14-user-batch-import/
  2026-11-14-user-batch-import-spec.md
  2026-11-14-user-batch-import-interaction.md
prototypes/2026-11-14-user-batch-import/
```

主题使用具体英文 kebab-case，标题使用中文。确有独立设计说明才新增同前缀 `-design.md`。交互已写入 Spec 时不强拆，已有共享原型继续维护。同需求后续修改沿用日期、文件及编号。独立新范围另建具体主题并关联原规格。同日重名先读内容，不覆盖、不自动加随机后缀。状态和修订留在正文、元数据及 Git，不加 v2/final/已确认后缀。

已有 `docs/spec/user-management/spec.md` 与 `interaction.md` 继续使用，局部修订不会自动改名。确需迁移已登记文件时，先核实原数据目录和 Spec ID、新路径未被启用或停用记录占用。改名并更新正文链接、资源及受影响原型入口后，先编辑原 Spec 的“主规格相对路径”，再登记新路径并核对仍为原 ID。不能先新建登记再合并，停用也不释放路径。答复与历史保留，路径变化会改变版本摘要，须重新核对确认。中途失败修复同一记录，不覆盖并发改动或创建补偿 Spec。

新命名默认值不代表已安装 CLI 具有对应的附件发现/归并能力。未实际验证时只显式登记主路径，通过 `resources` 关联现有产物，并说明兼容性尚未核实。不由帮助中存在同名命令推断其实现版本。

## 在工作台查看、答复与确认

保存主 Spec 后，登记其项目绝对路径和项目相对路径，再打开工作台。以下路径需要替换为本次实际文件。

```text
yss workbench register --root <Home绝对路径> --source docs/spec/2026-11-14-user-batch-import/2026-11-14-user-batch-import-spec.md --json
yss workbench
```

在浏览器中查看主 Spec、关联交互文档和已构建的原型，草稿也可阅读。个人状态、当前关注阶段和阶段进度分别维护。八阶段为调研、分析、规格、原型、交接、实施、验证、交付，可并行、回退或重开，受阻与跳过填写说明。实际研发验收、部署和发行结果由相应工程记录。

按登记结果中的实际 ID 查询快照与生命周期。

```text
yss workbench snapshot --json
yss workbench query --entity spec --status doing --status blocked --json
yss workbench query --entity spec --activity all --include-closed --json
yss workbench lifecycle --spec <SpecID> --json
yss workbench request --spec-id <SpecID> --json
```

自定义个人目录时，每条命令都在 workbench 后加 `--data-dir <已核实的绝对路径>`。数据目录和 SQLite 备份恢复见 [维护与恢复](tutorial-maintenance.md)。

已经接入工作台时，你可以答复、补充或延期。答复保存后是“待回写”，Agent 会据此更新同一份规格、AC、交互说明和相关原型，核对一致后才解决问题。延期需要说明原因、影响、排除范围以及复查日期或条件。它不等于解决，本次范围的必经路径仍有缺口时不能确认。提醒只在当前聊天或工作台打开/刷新时出现，不提供后台通知。

关键问题已回写解决、必需产物与检查齐备时，内容才可确认。只有你明确确认展示的本次范围和版本才显示已确认。正文、交互或原型的任何版本字节变化都会重新要求确认，排版与路径变化也计入摘要，旧确认保留历史。保存、登记和内容就绪都不代替你的确认，也不代表授权研发或逐阶段审批。旧文件没有真实状态和确认记录时保留未知。

Agent 使用工作台前先核对 `yss workbench --help`。实际版本支持且你没有明确选择不使用工作台时，Agent 保存/更新后自动执行 `yss workbench register --root <项目绝对路径> --source <主Spec相对路径> --json`，复用该主文件的登记。附属文件通过主 Spec 元数据的 `resources` 关联。续办使用 `yss workbench request --spec-id <登记返回的ID> --json` 读取材料和既有答复。聊天里已经明确回答的内容由 Agent 使用实际支持的 `workbench respond` 记录并关联，无需重复回答，再完成回写。该命令不会自动启动 Agent。登记失败时文件仍在，Agent 应说明位置、错误和修复后重试动作，不能另建同名 Spec 或称已登记。旧 CLI 缺少命令时先交付可读文件并说明未登记，不因模板更新声称旧程序支持新接口。

以下命令保存用户已经给出的真实答复或延期。问题 ID、当前摘要和 Spec ID 来自 snapshot/request，参数中的说明替换为本次实际内容。

```text
yss workbench respond --spec-id <SpecID> --question-id <问题ID> --question-digest <当前摘要> --kind answer --answer "用户已明确给出的答复" --json
yss workbench respond --spec-id <SpecID> --question-id <问题ID> --question-digest <当前摘要> --kind defer --reason "实际原因" --impact "实际影响" --excluded-scope "排除范围" --review-at <YYYY-MM-DD> --review-utc-offset-minutes 480 --json
```

中国时区的 UTC 偏移分钟为 480，也可将复查日期及偏移替换为 `--review-when "实际复查条件"`。答复 ID 与回写字段的完整规则见 [命令参考](command-reference.md)。

Agent 会从已有启动信息或续办文本核实工作台数据目录。自定义目录时，登记、续办、答复统一使用 `yss workbench --data-dir <已核实的绝对路径> ...`，不改用默认库，也不重复询问已可查的事实。延期也须关联真实答复，在原问题写入 `status: "deferred"`、非空延期依据 `resolution` 和本次延期答复 ID 对应的 `appliedDecisionId`。外部链接无法锁定确认版本，确认前须把相应工作台资源项替换为已核验的项目内本地快照。原链接可保留在正文来源中，仍保留 web 资源项会继续阻塞确认。

## 交付与研发接续

完整产品需求交付业务规格、高保真交互原型及交互说明。核心操作和状态变化应可操作，纯展示可用高保真静态设计，无 UI 用业务逻辑或状态原型。低保真草稿不单独算完整交付。按风险选择覆盖范围与必要状态，说明查看方法、模拟范围、实际检查与未覆盖项。普通查询和局部修订只处理当前范围。

业务票仅按明确拆票请求组织，不是第四类必交付物。Spec 的 to-tickets 不生成 DDL/索引、生产 API 契约或实现切片。业务概念与有来源的技术约束可表达，原型模拟不构成生产承诺。明确技术设计或开发请求按研发任务承接，不强制切换 profile 或增加审批。

完整 Spec 交付（包括显式调用 `to-spec`）或准备交接时，Agent 会结合实际成果提供交接要点和可复制提示词。也可随时要求“为这份 Spec 生成 Backend 交接提示词”。缺少目标工程或链接时保留占位项，区分当前 Agent 的实际读取结果和接收方访问是否已验证。未指定研发动作时提示接收方先分析，不自动改生产代码。需要通过 PR/MR 以文件变更交付时，明确提出交付请求即可，`handoff` 的调用遵循宿主支持的入口。仅分享提示词或现有链接无需 PR/MR。交接提示不自动传递材料或授权研发、提交、推送和部署。

以下是 Backend 分析提示词示例，使用前替换占位项，并补充实际已知的版本、未决项和验证限制。

```text
请先阅读以下材料和目标工程，分析后端相关业务规则、权限、状态、异常、验收、实现影响及待决问题，暂不修改生产代码。
业务规格使用 [路径或链接及版本]
原型及交互说明使用 [路径或链接、查看方式及版本]
目标后端工程为 [路径或链接]
已知模拟范围、未决项和验证限制为 [实际情况，未知则注明]
原型模拟不视为生产 API 或数据库设计。材料不可访问时说明缺口。
```

## 默认技能

`project` 和 `skills` 默认都安装的 17 个入口包括 setup-yss-harness、yss-product-lifecycle、yss-research、yss-stage-decision、grilling、domain-modeling、wayfinder、to-spec、yss-design-system、prototype、prototype-review、to-tickets、triage、llm-wiki、i-have-adhd、handoff、implement。研究归 yss-research，产品设计与 UI 原型归 yss-design-system。implement 可按明确研发请求选用，code-review 和具体工程技能按需取得。默认协调方法不代表全部专业能力已经安装。

预装不自动执行显式入口或对外写入。没有 tracker 仍可完成授权草稿。只有截图或未运行原型时，如实说明交互尚未验证，不能宣称完整交付已完成。
