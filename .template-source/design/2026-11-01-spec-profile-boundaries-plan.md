# Spec 与 Backend 职责边界 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Spec 请求只产生业务规格、适用原型及交互说明，明确拆票时只生成业务票；Backend 独立承担技术设计与实现切片。

**Architecture:** 沿用相同技能 ID 和 Backend 文件覆盖层，拆开两侧 `to-tickets` 正文与模板依赖。Spec 的项目安装改用专用入口，完整交付规则贯通规格、原型和复核说明。用现有 Bundle 工具核对有效覆盖及四种安装组合，不增加运行时分支或 CLI 接口。

**Tech Stack:** Markdown、YAML、JSON、现有技能投影；安装验证使用现有 Go Bundle 工具和 CLI。当前 CLI 源 `go.mod` 要求 Go 1.27.1，不新增依赖、脚本或测试套件。

**Spec:** [已批准设计](2026-11-01-spec-profile-boundaries-design.md)。用户已批准设计与执行；四项任务已实施并完成本地安装验证，独立审阅未发现阻碍交付的问题。

## Global Constraints

- 完整 Spec 的交付内容只有业务规格、高保真交互原型及交互说明；三类内容不要求拆成三个文件。
- 业务票仅在明确要求拆票时输出，是业务规格的组织形式，不是第四类必交付物。
- 保留现有免阶段审批的原则；免审批不扩大任务范围，也不取消产品与研发的职责区别。
- 保留技能 ID，不增加模式参数、新技能、生命周期路由器或执行门禁。Spec 默认的 16 个技能入口保持不变。
- 无 UI 的需求沿用业务逻辑或状态原型，不虚构页面。核心 UI 操作可模拟操作，纯展示可用高保真静态稿，低保真草稿不单独算完整交付。
- 用户明确要求研发工作时按授权承接；不强制换仓、安装 profile 或新增审批，不让业务拆票技能兼任技术设计。
- 既有技术事实可以注明来源后引用，业务概念、唯一性规则和原型模拟不因含技术词而删除。
- 不修改 `yss-cli` 源码，不清理用户实例或既有业务产物，不提交、推送、发行、部署或向外部发送内容。
- 各任务同步其修改的现有宿主副本，保留原始来源与调用政策；检查按本次风险执行，不形成长期门禁。

## Review Focus

1. Spec 中的“拆 tickets”被理解为研发切片；应只拆业务票，普通规格交付不自动拆票。由任务 1 的业务场景核对覆盖。
2. Spec 工作区收到明确研发请求，被 profile 限制拒绝；应按研发任务承接，同时保留真实技术事实与未决项。由任务 2 的授权反例核对覆盖。
3. 原型需要模拟数据或业务唯一性约束，被错误禁止，或被升级为生产契约；应保留业务表达与模拟用途。由任务 2 的原型场景核对覆盖。
4. 同名覆盖层、共享入口或新增技能路径引用污染另一 profile，隐式增加 Spec 默认技能；由任务 1 的依赖检查、任务 3 的入口检查及任务 4 的实际安装断言覆盖。
5. 源码或旧二进制检查通过，被宣称实例与宿主行为已修复；由任务 4 的来源、四种安装和未验证范围核对覆盖。

## 文件与责任

所有业务修改在当前模板仓完成。以下 `S` 表示 `.agents/skills`，`B` 表示 `profiles/backend`，`E` 表示 `.template-source/distribution/entries`，`D` 表示 `.template-spec`；相对路径均基于本计划执行时的模板工作树。

| 任务 | 独立交付 | 依赖 |
|---|---|---|
| 1 | 两侧拆票技能、模板引用与宿主副本一致 | 已批准设计 |
| 2 | Spec 完整交付及研发承接边界一致 | 任务 1 的业务票职责 |
| 3 | 安装入口、父票模板退场及现役说明一致 | 任务 1、2 的规则 |
| 4 | 有效内容与四种实际安装的核对结果 | 任务 1—3 最终内容 |

本次建议由同一执行者顺序完成：多个任务共同修改分发配置与说明，并行写入容易互相覆盖。无需先创建用户产品资产或跨仓实现任务。

### Task 1：分开业务票与实现切片

**Files:**
- Modify: `S/to-tickets/{SKILL.md,agents/openai.yaml}`、`B/S/to-tickets/{SKILL.md,agents/openai.yaml}`，其中 `B/S` 展开为 `profiles/backend/.agents/skills`。
- Modify: `D/templates/business-ticket-template.md`、`B/D/templates/vertical-slice-ticket-template.md`。
- Delete: `D/templates/vertical-slice-ticket-template.md`；Backend 副本保留为现役来源。
- Modify: `.template-source/distribution/bundle-profile.json`、`B/.template-source/distribution/bundle-profile.json`。
- Modify: `D/agents/matt-skills-adaptation.md`、`B/D/agents/matt-skills-adaptation.md`、`B/skills-lock.json`。
- Sync: `.workbuddy/skills/to-tickets/`、`B/.workbuddy/skills/to-tickets/`；核对 `.claude/skills/to-tickets` 现有链接，不创建 Backend 中不存在的 Claude 投影。

**Interfaces:** 消费既有 Spec、FR/AC、稳定 ID、工程与设计事实；Spec 输出 `business-ticket`，Backend 输出 `vertical-slice-ticket`。两侧的 `installations.project.skillReferences["to-tickets"]` 与 `installations.skills.skillReferences["to-tickets"]` 分别指向各自模板和共同适配说明。

- [x] **Step 1：记录当前基线。** 读取工作树差异与本任务文件；保存两侧默认技能集合及调用元数据用于前后比较。当前 Spec 两种安装各 16 项，Backend 各 41 项；不覆盖其他人的修改。
- [x] **Step 2：收窄 Spec 拆票。** 发现描述、正文和模板只描述业务价值、可观察行为、业务范围、FR/AC、业务依赖及未决项；删去 Slice 选择、DDD/MVC 实现分层及机械重构方法。明确普通交付不自动建票、引用事实不等于创建生产设计。保留真实 tracker ID、分页、写入授权和结果说明。`disable-model-invocation: true` 与 `policy.allow_implicit_invocation: false` 保持不变。
- [x] **Step 3：收窄 Backend 拆票。** 移除产品业务票输出分支，保留对已有业务票和直接需求的消费；需要技术决策时读取真实工程与设计，缺依据列明影响，不虚构已确认 DDL/接口。引用适用研发方法但不恢复冻结门禁。保留窄垂直切片、仓库范围与原有安全约束；`allow_implicit_invocation: true` 和注册表 `invocation_mode: both` 保持不变。
- [x] **Step 4：调整模板归属和引用。** 删除共享 Slice 模板。Spec 两种安装的 `to-tickets` 引用精确为 `D/templates/business-ticket-template.md`、`D/agents/matt-skills-adaptation.md`；Backend 精确为 `D/templates/vertical-slice-ticket-template.md`、同一路径的适配说明。上述缩写在 JSON 中使用真实 `.template-spec/...` 路径。Backend 读已有业务票不需要安装其模板。
- [x] **Step 5：同步来源与副本。** 适配说明明确两侧职责，保留上游身份；共享 WorkBuddy 与共享源逐字节一致，Backend WorkBuddy 按共享文件加专有覆盖形成有效树。更新 `B/skills-lock.json` 中 `skills.shared["to-tickets"].effectiveHash`；按维护规则对有效树相对路径用 Node `localeCompare` 排序，依次哈希路径、NUL、内容、NUL，文本 CRLF 归一化并忽略规定的临时文件。不改 `upstreamHash`，不向根锁补加不存在的 hash 字段。
- [x] **Step 6：核对输出与依赖。** 用“审批人退回申请，申请人修改后重提”的原规则与 AC 核对 Spec 只形成业务票；用同一输入加明确 Backend 实现请求，核对只形成 Slice、未知技术信息不被补造。用现有解析器确认两份 JSON/YAML 有效，所有新引用可解析，默认技能 ID 与调用政策未变。文本核对不计为实际宿主调用通过。

### Task 2：统一 Spec 完成标准与研发承接规则

**Files:**
- Modify: `S/yss-product-lifecycle/SKILL.md`、`S/yss-product-lifecycle/references/{spec-workflow.md,daily-delivery.md}`、`S/to-spec/SKILL.md`。
- Modify: `S/yss-design-system/{SKILL.md,agents/openai.yaml}`、`S/yss-design-system/references/{spec-design.md,product-prototype.md}`。
- Modify: `S/prototype-review/references/review-method.md`、`D/templates/spec-template.md`、`D/process/harness-profile.yaml` 的 `purpose` 说明。
- Sync: 上述四个技能在 `.workbuddy/skills/` 的受影响文件；核对 `.claude/skills/` 现有链接。Backend 的 `to-spec` 有自有正文，保留其覆盖，不能用共享版覆盖。

**Interfaces:** 共享规格方法为 Spec 完整交付的权威规则；调用者引用相同规则，不自动调用显式技能。原型仍使用现有 Vue/shadcn-vue 资产，不修改组件、主题、锁文件或运行代码。

- [x] **Step 1：明确三类内容与适用范围。** lifecycle、共享方法、to-spec、日常交付说明及 Spec 模板对齐：完整有 UI 交付需高保真，核心交互可操作，纯展示可静态，无 UI 用逻辑/状态原型；查询与局部修订不扩成完整交付。说明与规格可共用文件，不加第四类包。
- [x] **Step 2：明确请求含义。** “确认 Spec”“继续完善规格”“准备交研发”不自动拆票或技术设计；明确拆票按任务 1 的业务票处理；明确要求生产 API、数据库或开发时识别为研发任务，按授权和可用能力承接。Spec 规则只定义当前任务边界，不能拒绝用户明确扩大的范围。
- [x] **Step 3：写清允许与禁止的决策。** 引入设计 §3 的语义边界：概念关系、唯一性、值域、既有技术事实及原型模拟可以表达；新物理设计、生产契约、分层实现与切片不由 Spec 请求推导。不要在 Spec 技能中新增 `.agents/skills/implement/SKILL.md` 等研发技能硬引用；现有 Bundle 会扫描技能路径形成依赖，可能扩大默认安装集合。
- [x] **Step 4：对齐原型与复核声明。** 高保真作为完整有 UI 交付要求；“按风险选择”限定覆盖范围与适用状态，不允许只交线框便宣布完整。保留低保真探索、纯展示、无 UI、模拟范围和未验证交互的声明。更新发现描述中的相关表述；`harness-profile.yaml` 只改 `purpose`，不改 schema、profile 身份或 `product_design: risk-based` 等机器值。
- [x] **Step 5：同步并核对反例。** 同步本任务宿主副本；分别核对“仅改一条规则”“已有第三方 API 约束”“金额与编号唯一性”“原型模拟错误响应”“明确设计生产 API”“无 UI 状态规则”“仅展示页面”。前五项不得变成物理设计推导或无条件禁止；后两项采用适用原型。原型资产摘要应与基线一致，Backend 专有 `to-spec` 正文不变。

### Task 3：分开项目入口并清除分发中的误导

**Files:**
- Create: `E/spec-project-AGENTS.md`。
- Modify: `AGENTS.md`、`B/AGENTS.md`、`E/{project-AGENTS.md,spec-skills-AGENTS.md,spec-project-README.md,backend-skills-AGENTS.md}`。
- Modify: `.template-source/distribution/bundle-profile.json` 的 Spec 项目入口及 files；核对 Backend 配置继续指向原项目入口。
- Delete: `D/templates/local-parent-ticket-template.md`。
- Modify: `D/agents/issue-tracker.md`、`B/D/agents/issue-tracker.md`、`D/process/agent-entry-policy.md`、`B/D/process/agent-entry-policy.md`。
- Modify: `D/user-guide/用户手册.md`、`D/user-guide/cli/{tutorial-spec.md,tutorial-backend.md}`、`profiles/_specialist/D/user-guide/cli/{tutorial-spec.md,tutorial-backend.md}`；最后两项中的 `D` 同样展开为 `.template-spec`。

**Interfaces:** Spec `project` 的 `entries["AGENTS.md"]` 改为 `.template-source/distribution/entries/spec-project-AGENTS.md`；Spec `skills` 继续使用 `spec-skills-AGENTS.md`。Backend `project`/`skills` 分别继续使用 `project-AGENTS.md`/`backend-skills-AGENTS.md`。

- [x] **Step 1：新增 Spec 项目入口并改变映射。** 复用现有共同文件保护、命令及授权要求，加入任务 1、2 的产品职责与完成边界。将 Spec `project` 映射切换到新文件，不改 CLI schema 或 Backend 映射。
- [x] **Step 2：明确源工作区和 Backend 职责。** 两个源工作区 AGENTS 补充免审批不扩大任务范围、产品/研发/模板维护分别处理；原 `project-AGENTS.md` 和 Backend skills 入口明确研发承接，不能套用 Spec 的禁止生成技术设计规则。Spec skills 入口和项目 README 与新入口一致。
- [x] **Step 3：移除旧父票模板。** 再确认其现役消费者仍仅为 Spec 的 `installations.project.files`，移除该项并删除模板源，不替换成新的父票流程。若执行时出现新现役消费者，先在本范围内消除错误依赖再删除；历史设计文字和用户已有父票不改。
- [x] **Step 4：对齐现役说明与覆盖层。** tracker 说明按本侧职责区分票据，不变更配置 frontmatter 和对外动作授权。更新两侧入口政策、用户指南与技术教程的相关段落；`profiles/_specialist` 中两个教程会覆盖 Backend 的共享文件，须同步相关职责说明，不能机械复制 Spec 项目入口给 Backend。
- [x] **Step 5：核对入口选择和引用。** 对照两份配置逐一定位四种安装入口；确认新增文件未被 Git 忽略、删除路径不再出现在现役 files/skillReferences/技能调用路径。历史文档中的旧路径不计为现役引用，也不全仓替换。检查根及 Backend 默认技能集合、可选库与公开导出 ID 未变。

### Task 4：核对有效树并验证实际安装

**Files:** 复核任务 1—3 所有改动；临时目录中生成 CLI 源快照、Bundle、验证二进制和四种安装根。不修改 CLI 原仓、系统 CLI 或用户项目，不保存新测试脚本。

**Interfaces:** 使用现有 `tools/bundle --source-root --out`、`cmd/yss` 和 `init/skills list`。已核实当前 CLI 3.0.5 的 `init` 不接受本地模板源参数，不能直接用系统二进制证明本次模板改动。

- [x] **Step 1：核对最终有效内容。** 按“共享 → profiles/_specialist → profiles/backend”的实际覆盖顺序核对 Backend，不能把共享树整目录复制覆盖专有内容。检查修改过的 JSON、YAML、frontmatter、引用目标、WorkBuddy 字节和 Claude 链接。仅更新有效内容真正改变的既有 Backend hash；本次预期主要是 `to-tickets`，不创造不存在的 lock 项或 manifest 文件。
- [x] **Step 2：准备隔离构建材料。** 用 `mktemp -d` 创建任务临时根，定义任务专用变量 `SPEC_BOUNDARY_VERIFY_DIR`、`SPEC_BOUNDARY_TEMPLATE_ROOT`、`SPEC_BOUNDARY_CLI_ROOT`。从 `/Users/zhudaoming/Projects/yss-cli` 的真实已提交 HEAD 用 `git archive` 导出到临时 `cli` 目录，记录 SHA；不复制未跟踪文件、凭据、子模块内容或 `.git`。当前只读核对的 SHA 为 `8c5e1a90ff83ac83a0640a64b8c8109c3fc5a5e6`，原仓存在无关未跟踪 `docs/plans/`，必须保留。执行时重新核对工具入口与 Go 版本；不修改原仓或安装系统工具。
- [x] **Step 3：从最终模板生成并构建。** 在临时 `cli` 目录使用下面的现有命令；模板根指向本次实际编辑的 Git 工作树，来源须如实记录为 working-tree。构建失败不能用旧归档或系统 CLI 冒充结果。

```sh
go run -tags yss_nobundle ./tools/bundle --source-root "$SPEC_BOUNDARY_TEMPLATE_ROOT" --out internal/bundle/assets
CGO_ENABLED=0 go build -trimpath -o "$SPEC_BOUNDARY_VERIFY_DIR/yss" ./cmd/yss
"$SPEC_BOUNDARY_VERIFY_DIR/yss" version
"$SPEC_BOUNDARY_VERIFY_DIR/yss" init --help
```

- [x] **Step 4：实际安装四种组合。** 对 `spec/backend × project/skills` 各使用临时根内不存在的新目标，依次执行下列命令模式，将 `profile`、`mode` 设为当前组合。`--dry-run` 后目标仍不存在；实际安装后读取安装根和 `skills list`，不能只看退出码。

```sh
"$SPEC_BOUNDARY_VERIFY_DIR/yss" init --root "$SPEC_BOUNDARY_VERIFY_DIR/$profile-$mode" --profile "$profile" --installation "$mode" --dry-run --json
"$SPEC_BOUNDARY_VERIFY_DIR/yss" init --root "$SPEC_BOUNDARY_VERIFY_DIR/$profile-$mode" --profile "$profile" --installation "$mode" --json
"$SPEC_BOUNDARY_VERIFY_DIR/yss" skills list --root "$SPEC_BOUNDARY_VERIFY_DIR/$profile-$mode" --json
```

- [x] **Step 5：断言安装内容。** `result.installed` 中为真的 ID 集合须等于任务 1 记录的本侧基线，Spec 精确 16 项、Backend 41 项。Spec 两种安装应有业务票模板、无 Slice/旧父票模板，使用 Spec 正文与显式调用政策；Backend 两种安装应有 Slice 模板、无因 to-tickets 配发的业务票模板，使用 Backend 正文和原自动选择政策。四个 AGENTS 必须匹配任务 3 指定来源，正文不含源模板占位值；核对有效宿主副本、必读引用和真实 Bundle 来源。发现其他实际依赖带入模板时先定位所有者，不靠删除安装后的文件伪造通过。
- [x] **Step 6：核对行为声明与交付状态。** 按设计 §7 的代表请求逐项核对本次有效内容。只有实际宿主可加载本次技能且观察到请求处理时，才报告行为演练结果；人工附正文、静态审阅或另一个 Agent 的阅读不能证明自动发现。条件不具备时明确模型运行行为未验证，不新增测试服务或自行创建用户聊天。
- [x] **Step 7：完成范围检查。** 在模板根运行 `git diff --check`，检查新增文件的空白与路径引用，并对照计划检查差异和删除范围。确认 CLI 原仓及系统入口未变、原型资产未变、无新脚本/测试套件。更新本计划实际完成项，说明结构、安装、宿主行为各自结果；不提交或发布，临时材料只清理本任务创建且不再需要的内容。

## 计划自检与执行交接

设计 §1—4 对应任务 1、2；§5 对应任务 1、3；§6 对应各任务同步与任务 4；§7 的业务反例对应任务 1、2，安装和来源对应任务 4；§8 的实施范围及自由度由 Global Constraints 保留。Review Focus 五项均有归属步骤。

本计划只修改技能、入口、模板和分发说明，不编写新运行逻辑，因此不增加持久测试或套用 TDD。文中安装命令已对照实际帮助和 Go 工具入口，执行结果见下方实施记录。设计状态已记录用户批准，计划记录不能替代实际检查。

推荐在当前会话由同一执行者顺序实施（Native），因为任务共享分发配置、覆盖层和说明，当前变更不需要并行拆分。用户可选择逐任务子代理实施；确认计划和执行方式后，再使用对应执行技能，保留当前授权范围。

## 实施记录

- 已按用户执行授权在当前工作树建立 `codex/spec-profile-boundaries` 分支；保留设计与计划，未创建额外工作树、流程脚本或持久测试。以本计划勾选项记录进度，符合已批准的当前工作区实施范围。
- 任务 1—3 完成时已核对内容、副本、引用、默认集合、调用政策及 YAML/frontmatter，业务边界采用文本核对；后续实际安装和宿主验证范围见任务 4 记录。

- 任务 4：Go Bundle 生成与本机 CLI 构建成功；Spec project/skills 各 16 项、Backend project/skills 各 41 项，实际安装的入口、票据模板、调用政策、技能副本及必需资源均符合预期，四次 dry-run 均未写入目标。模板来源为真实 HEAD `624b7a7a` 与 `working-tree`，未伪称已提交。
- 临时 CLI 基于已记录的 CLI HEAD，版本输出为源码默认 `3.0.2`、CLI sourceState 为 unknown；这是验证构建，不是发行物。系统 CLI 3.0.5 和 CLI 原仓未被替换或修改。
- 首次预览因 macOS `/var` 是符号链接而被 CLI 路径保护拒绝，未写入目标；改用同一临时目录的真实 `/private/var` 路径后，四种组合通过，没有更改路径保护。
- 并行出现的 8 个原型 CSS/组件说明源文件及 WorkBuddy 副本改动不属于本次任务，已保留并从审阅差异排除；安装 Bundle 如实使用当时完整工作树，不能声称整个工作树的原型资产没有变化。
- 代表请求已按设计进行文本反例核对；未在真实宿主重新加载技能后执行自动发现/调用演练，不能把结构与安装通过视为模型行为保证。
- 最终独立审阅未发现 Critical/Important 问题。审阅指出设计/计划残留实施前状态，已随收尾更新，不改变原批准事实。审阅未判断真实宿主自动发现/调用和已有实例升级，这两项维持未验证；本次不增加安装实例迁移或模型运行保证。没有遗留待修复发现，未提交或发布。
