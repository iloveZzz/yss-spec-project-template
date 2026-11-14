# Spec / Home Repo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本仓规则优先：不引入统一门禁或常驻测试套件，提交与发行使用对应动作授权。

**Goal:** 让用户从产品 Spec / Home 的默认入口连续完成产品工作和授权工程任务，并准确定位、使用和汇总多个独立仓库。

**Architecture:** 保留 `spec` Profile，以项目维护的 Markdown 仓库地图提供稳定关系，Agent 核实本机 checkout、工作树和目标规则。Spec 默认加入已有 `implement`，由工程技能承担实际研发；复用现有 CLI Bundle、安装与同步保护。

**Tech Stack:** Markdown、YAML、JSON；既有 YSS Skills 与平台副本；Rust YSS CLI 的现有 Bundle 构建/安装接口；临时 Git 仓与 Codex 场景验证。无新增生产依赖。

**Spec:** [已确认设计](2026-11-14-spec-home-repo-design.md)。先读设计及其引用的[结论报告](2026-11-14-spec-home-repo-conclusion.md)。设计已获用户确认，用户随后明确批准执行；当前进度与观察见文末。

## Global Constraints

- 保留 `spec` Profile；两种 Spec 默认加入共享 `implement` 并支持明确研发请求的隐式选择；沿用目标仓有效工程规则；项目地图由项目维护；不新增 CLI/schema/中央状态；不扩大用户授权或引入统一流程门禁。
- Spec 两种安装的默认数量变为 **17**；Backend、Frontend 默认集合保持原状。
- `.agents/skills` 是共享源，Backend 保留专有覆盖，Frontend 保留白名单；不整包覆盖不同 Profile 的同名技能。
- 模板仓不新增常驻脚本或测试套件，采用当前 CLI 能力、临时目录与可核对的场景结果。
- 地图默认根 `REPOSITORIES.md`；已有等价地图继续使用，CLI sync 不新建、覆盖或删除它。
- 不修改真实产品仓、已安装 CLI 或用户级配置。首轮实施不提交、推送或发行；用户随后明确要求复审、完整 Demo 与回归后提交，本轮据此提交模板和独立 Demo 的本地成果，仍不推送或发行。
- 技能修改执行现有维护规则；仅有文件复制证据时不宣称宿主已加载或完成跨仓执行。

## Review Focus

1. **R1：同仓多个 worktree、错误 remote、缺失路径。** 写入前应消歧，不按目录名或 main 自动选位置；由任务 2 方法与任务 5 场景验证。
2. **R2：目标仓同名技能或局部规则不同。** 实际读取目标有效版本及引用资源，命令在正确 cwd 执行；由任务 2、3 与任务 5 验证。
3. **R3：旧安装与用户定制。** 默认能力补齐且用户地图/README 保留，受管双边修改整次拒绝；由任务 1、3 与任务 4 验证。
4. **R4：上游含未提交材料或执行中变更。** 输入可复核，受影响实现更新，未受影响工作保留；由任务 2 与任务 5 验证。
5. **R5：只读请求、只读关联仓或局部完成。** 不扩大写入权限，不把 mock/构建/单仓成功报告为整体完成；由任务 2、3 与任务 5 验证。

---

## 执行组织与文件边界

模板根为 `/Users/zhudaoming/Projects/yss-spec-project-template`，本计划文件路径均相对该根。CLI 仅作为验证工具源，路径为 `/Users/zhudaoming/Projects/yss-cli`；不在其日常工作树修改或构建。

执行时先查看当前分支、worktree 和差异，保护其他会话工作。确需隔离时按既有 worktree 方法创建 `codex/` 分支；当前设计/计划若仍未提交，只把这两份已核实文档带入隔离目录，不带入无关差异，不借此自动提交原工作树。

顺序为：任务 1 和任务 2 可独立推进 → 任务 3 集成默认入口 → 任务 4 验证分发 → 任务 5 验证宿主行为。副本、来源说明和锁文件由一个集成者维护，避免多人同时编辑同一索引。任务是工作划分，不新增项目生命周期状态。

主要内容修改只有两项现有技能、一份新增地图模板、Spec 入口与说明、默认集合/注册表。副本随源变更同步，不能作为独立于功能的遗漏项。

## Task 1：项目仓库地图与 Home 配置

**Files**

- Modify: `.agents/skills/setup-yss-harness/SKILL.md`
- Create: `.agents/skills/setup-yss-harness/references/repositories-template.md`
- Modify/Create 对应文件：`.workbuddy/skills/setup-yss-harness/SKILL.md`、`.workbuddy/skills/setup-yss-harness/references/repositories-template.md`
- Modify/Create 对应文件：`profiles/backend/.workbuddy/skills/setup-yss-harness/SKILL.md`、`profiles/backend/.workbuddy/skills/setup-yss-harness/references/repositories-template.md`
- Modify/Create 对应文件：`profiles/frontend/.workbuddy/skills/setup-yss-harness/SKILL.md`、`profiles/frontend/.workbuddy/skills/setup-yss-harness/references/repositories-template.md`
- 集成时更新：`profiles/backend/skills-lock.json` 中 setup-yss-harness 的既有 `effectiveHash`。
- Verify: 临时项目的 `REPOSITORIES.md` 和既有 README 地图，不在模板根创建真实产品地图。

**Interfaces**

- Consumes: 用户提供的关联仓、已有地图/README/交接材料、实际 Git 身份；未知内容保持未知。
- Produces: 可随 setup 整包分发的 `references/repositories-template.md`；项目自己维护的地图或其已有路径；Home 入口到地图的实际引用。

- [x] **Step 1：新增地图模板。** 给出仓库标识、职责、Git 身份、资料入口、关联、可选查找提示六类信息和空表；说明路径所属仓、未知情况、凭据排除及项目所有权。模板中不放真实产品地址、个人绝对路径、分支/进度字段或伪造样例关系。
- [x] **Step 2：在 setup 中增加 Home 配置行为。** 保留普通安装原语义；只有配置 Home 或当前初始化已包含产品协调目标时，复用现有地图，按已核实资料补齐关系和入口引用。单独 `init/attach` 只提供方法资产；`skills` 安装不自动建地图。无需先补齐所有关系才能执行明确任务。
- [x] **Step 3：补充迁移处理。** 新 Bundle 更新方法，项目事实由 Agent 依据授权维护；沿用原 Profile、README 所有权及 AGENTS 冲突保护；现有独立技能沿原来源更新。明确 `implement` 若未随 sync 补齐，可用实际支持的 ensure 补装，任务 4 后以真实结果收敛说明。
- [x] **Step 4：同步上述三个 WorkBuddy 消费位置。** 只同步本技能受影响文件；Claude 的共享链接检查目标可达，不另造副本或 Profile 内链接。Backend 锁字段在任务 3 集中重算。
- [x] **Step 5：核验 R3 的配置行为。** 在临时目录分别给出已有 README 地图、无地图但已知两仓关系、纯 skills 安装三种输入。预期分别为复用原地图、不重复造未知事实、只安装方法；项目地图不出现在 Bundle 所有权或安装收据中。完整 CLI 证据由任务 4 补齐。

**完成信号：** setup 方法与模板引用闭合，源/副本字节一致；Home 配置行为和普通安装行为区分明确。

## Task 2：跨仓工程上下文、输入版本与结果回收

**Files**

- Modify: `.agents/skills/implement/references/repository-scope.md`
- Modify: `.agents/skills/implement/SKILL.md` 中引用仓库范围方法的正文；调用元数据由任务 3 修改。
- Modify: `.workbuddy/skills/implement/references/repository-scope.md`、`.workbuddy/skills/implement/SKILL.md`
- Modify: `profiles/backend/.workbuddy/skills/implement/references/repository-scope.md`
- Backend 当前没有 repository-scope 覆盖源，保持继承，不在 `profiles/backend/.agents/skills/implement/references/` 新增第二主源。
- 集成时更新：`profiles/backend/skills-lock.json` 中 implement 的既有 `effectiveHash`。

**Interfaces**

- Consumes: 当前授权目标、地图指针或明确工程路径、任务选定的上游资料和版本、目标仓入口/局部规则/有效技能。
- Produces: 每仓真实工作位置、允许范围、相关输入依据、依赖和负责者；实际变更/检查/剩余事项；指向原规则的反馈。它们记录在现有任务或会话，不新增机器数据结构。

- [x] **Step 1：扩充定位方法。** 按明确路径、任务链接、地图和已知工作区找候选；核实 Git 根、remote、分支、worktree、受影响路径状态。多个 checkout 未能按任务消歧时只暂停相关写入；允许明确目标没有地图直接继续。保留子模块、detached HEAD、符号链接和用户修改保护。
- [x] **Step 2：补充目标规则与技能选择。** 首次进入工程显式读取其入口、适用局部规则和必要资源；同名技能按目标仓有效版本辨别；明确 shell cwd 变化不证明宿主重载。必要补装遵循真实 Profile/安装来源，不手改收据或切 Profile。命令用实际工程 cwd。
- [x] **Step 3：补充执行和输入变化规则。** 原任务保存每仓范围、依赖、负责路径与输入；按需要并行隔离，API 依赖未就绪则先完成必要输入。固定提交与 dirty worktree 分别记录，异步执行所用未提交内容可复核；开始、交付前、来源变更时核对相关材料，不自动提交或冻结所有仓。
- [x] **Step 4：补充结果与反馈规则。** 逐仓回报真实修改、执行过的验证、未完成项和上游影响；新增业务取舍定点澄清，技术等义细化按授权继续；未授权上游写入时给差异，不改规格迁就实现。只读分析不实现，单仓完成不代表整体完成。
- [x] **Step 5：核对引用与继承。** 共享 implement 的正文覆盖从 Home 进入单个工程时需要读该参考的情形；Backend 已有多仓/根不明入口继续使用同一方法，保留其 spec-feedback、研发设计与并行专有内容。同步指定 WorkBuddy 文件，不用共享 SKILL 或 metadata 替换 Backend 覆盖。
- [x] **Step 6：按 R1/R2/R4/R5 做方法走查。** 使用设计中的多 worktree、同名技能、dirty 上游、只读仓及局部结果案例，逐项定位方法里的处理依据；缺项直接补源文件。实际 Agent 执行由任务 5 验证，走查不称运行通过。

**完成信号：** 一份仓库范围参考覆盖选址、上下文、版本、协作、保护和交付，Backend 能继承；没有另建总调度器或合同。

## Task 3：默认 Home 入口、技能政策与分发一致性

**Files**

- Modify: `.template-source/distribution/entries/spec-project-AGENTS.md`
- Modify: `.template-source/distribution/entries/spec-skills-AGENTS.md`
- Modify: `.template-source/distribution/entries/spec-project-README.md`
- Modify: `.agents/skills/implement/SKILL.md`、`.agents/skills/implement/agents/openai.yaml` 及 `.workbuddy/skills/implement/` 下同名两文件。
- Modify: `.template-source/distribution/bundle-profile.json`
- Modify: `.template-spec/agents/yss-skill-registry.yaml`
- Modify: `.template-spec/agents/profile-skills.md`、`profiles/backend/.template-spec/agents/profile-skills.md`、`profiles/frontend/.template-spec/agents/profile-skills.md`
- Modify: `.template-spec/user-guide/cli/tutorial-spec.md`
- Modify: `.template-spec/agents/matt-skills-adaptation.md`、`profiles/backend/.template-spec/agents/matt-skills-adaptation.md`、`profiles/frontend/.template-spec/agents/matt-skills-adaptation.md`
- Modify: `profiles/backend/skills-lock.json`，仅重算任务 1、2 涉及的既有有效哈希。

**Interfaces**

- Consumes: 任务 1 的 setup/地图模板、任务 2 的工程上下文方法、现有 Profile 选择与所有权配置。
- Produces: Spec project/skills 同一组 17 项默认能力；共享 implement 可按明确研发请求选用；默认入口所引用资源全部可达；可被现有 CLI 构建的模板源。

- [x] **Step 1：统一调用政策。** 共享 implement description 明确开发、修复和按规格实现，明确只读分析不转实现；移除 `disable-model-invocation: true`，`agents/openai.yaml` 设 `allow_implicit_invocation: true`。Backend 专有 SKILL 和 metadata 保留自身政策，Frontend 不增加 implement。
- [x] **Step 2：修改默认集合与登记。** 根 bundle 的 `installations.project.skills`、`installations.skills.skills` 各加一次 `implement`，结果均为 17；根注册表 `instance_distribution.initial_skills` 同步；`skills` 内 implement 记录设 `layer: core`、`instance_default_discoverable: true`；`invocation_contract.overrides.implement` 设 `invocation_mode: both` 并写明研发触发条件。已有引用与依赖闭包沿用，地图模板靠 setup 整包进入，不增加生成身份字段或新 schema。
- [x] **Step 3：更新两个 Spec 入口及新项目 README。** 开头表达产品上游与研发默认入口；按需查已有地图，研发落到真实工程和有效方法，成果各归所属仓。区分 skills 接入与明确 Home 配置；明确只读、规格确认和准备交接不自动研发。普通任务无需读取全套资料。
- [x] **Step 4：更新技能地图和教程。** Spec 改为默认 17，implement 从可选移入默认；code-review 保持可选。说明产品/工程路径、同名技能与目标仓资源、CLI 不自动认定仓库关系。给一个单端请求、一个跨端请求和一个缺失位置例子；不虚构 CLI 新参数。同步两个 Profile 的技能地图。
- [x] **Step 5：更新来源说明和有效内容。** 在 Matt 适配文档新增本次本地 Home 适配，保留历史 16 项、旧显式策略等观察记录的日期和真实性；说明新政策覆盖当前共享 implement，不改原始引入提交、`sourceRevision` 或 `upstreamHash`。按有效树重算 Backend 的 implement/setup 两项 `effectiveHash`，不为根锁或 Frontend 锁新增该字段，不改其他技能哈希。
- [x] **Step 6：做静态一致性核验。** JSON 能解析；两安装集合相同且恰为 17，implement 只出现一次；注册表与 SKILL/OpenAI policy 一致；所有本次必读链接存在；共享源及 WorkBuddy 逐文件相同，Backend 按覆盖后的有效树比较；公开技能清单无新增技能 ID，不因新增参考修改导出范围。确认没有把根 `REPOSITORIES.md` 纳入受管文件。

**完成信号：** 默认入口、调用政策、集合、资源和用户说明互相一致；源码层修改可交给实际 Bundle 验证。保持源码根 AGENTS 与真实产品内容不变。

## Task 4：隔离构建、安装与同步保护验证

**Files**

- Read only: CLI 的 `docs/build-install.md`、`src/bin/yss-bundle.rs`、`src/bundle/manifest.rs`、`src/project/plan.rs` 与实际帮助。
- Temporary only: 临时 CLI checkout、Bundle、两模式新/旧项目和冲突夹具。
- Fix if needed: 任务 1–3 的本次模板源及副本；不顺带改 CLI Rust 代码。

**Interfaces**

- Consumes: 任务 3 的完整模板工作树；构建时固定的已提交 CLI；更新前实际安装程序作为旧 Bundle 基线。
- Produces: 包含候选模板的开发 CLI、安装/同步/保护观察、任务 5 的真实安装夹具。报告区分程序源码、模板快照与 Bundle 摘要。

- [x] **Step 1：固定构建输入。** 再看模板与 CLI 状态，选定本次模板 worktree；CLI 计划基线为已核实提交 `ba3c4aa31e0a7323d38ddd3451221047763fb5e6`。执行时核实提交存在且所需构建命令仍适用；不把 CLI 日常目录的未提交改动带入。记录旧 `yss version --json`，其默认集合必须能代表本次变更前的安装。
- [x] **Step 2：在解析后的真实临时路径构建。** macOS `/tmp` 等路径可能含链接，先取得 realpath；只使用临时程序的绝对路径，不安装、不改 PATH、不制作发行归档。以下命令从模板工作树执行：

```sh
home_template_source="$(git rev-parse --show-toplevel)"
home_check_dir="$(python3 -c 'import pathlib,tempfile; print(pathlib.Path(tempfile.mkdtemp(prefix="yss-home-check-")).resolve())')"
home_cli_repo="/Users/zhudaoming/Projects/yss-cli"
home_cli_commit="ba3c4aa31e0a7323d38ddd3451221047763fb5e6"
cp "$(command -v yss)" "$home_check_dir/yss-before"
git clone --local --no-hardlinks "$home_cli_repo" "$home_check_dir/cli"
git -C "$home_check_dir/cli" checkout --detach "$home_cli_commit"
pnpm --dir "$home_check_dir/cli/ui" install --frozen-lockfile
pnpm --dir "$home_check_dir/cli/ui" build
cd "$home_check_dir/cli"
cargo run --locked --bin yss-bundle -- --help
cargo run --locked --bin yss-bundle -- --source-root "$home_template_source" --out assets/bundle.tar.gz
cargo build --locked --bin yss
home_cli="$home_check_dir/cli/target/debug/yss"
"$home_cli" version --json
"$home_cli" init --help
"$home_cli" sync --help
```

预期 Bundle 构建校验通过，开发程序记录实际来源。构建输入变化导致拒绝时先固定输入，不关闭校验；缺网络或工具时如实保留未验证项。

- [x] **Step 3：验证两种 Spec 安装和旧版同步。** 分别用新程序 init 新项目、旧程序 init 旧项目，再由新程序 sync 两次。命令模板如下，执行后逐文件核对，不只看退出码：

```sh
for home_mode in project skills
do
  "$home_cli" init --root "$home_check_dir/new-$home_mode" --profile spec --installation "$home_mode" --json
  "$home_check_dir/yss-before" init --root "$home_check_dir/old-$home_mode" --profile spec --installation "$home_mode" --json
  "$home_cli" sync --root "$home_check_dir/old-$home_mode" --json
  "$home_cli" sync --root "$home_check_dir/old-$home_mode" --json
  "$home_cli" skills list --root "$home_check_dir/new-$home_mode" --json
  "$home_cli" doctor --root "$home_check_dir/new-$home_mode" --json
done
```

预期新装默认均为 17，implement metadata/参考与地图模板实际存在，收据保持 spec；两次同步中第二次 `result.status` 为 `unchanged`。检查旧项目是否真正获得 implement；若缺失，用 `skills ensure implement --root <旧夹具> --json` 验证补装并更新教程为该路径。skills 安装不得出现项目地图；project 直接 init 也只提供地图模板。

- [x] **Step 4：验证 R3 的两个独立保护场景。** 用户文件场景：旧项目写入唯一标记的 `REPOSITORIES.md`，sync 前后字节相同且其他方法正常更新。README 入口实际为 managed-customizable，另验证旧 README 双边修改安全冲突，以及候选新装后定制 README 在源未变化时保留。冲突场景：另一旧项目修改本次也更新的 AGENTS，记录文件内容、模式和收据，sync 应返回 `CONFLICT` 且整次不部分写入。另验证来源未变化的受管本地修改仍保留，不能通过清空目录或强制覆盖使测试“通过”。
- [x] **Step 5：验证选择与覆盖没有回归。** 在独立 Spec 夹具运行 `skills ensure yss-application yss-frontend-application`，核对资源闭包；在 Backend/Frontend 的 project/skills 临时安装检查默认集合仍为执行基线 42/13、setup 模板存在、Backend implement 专有入口和共享范围参考都完整，Frontend 不多装 implement。doctor 无非预期差异或未完成事务。
- [x] **Step 6：记录真实结果。** 保留各检查的版本、命令与观察，修正实际发现的模板缺口后仅重跑受影响检查。若需 CLI 修复才能继续，说明具体缺陷和当前能交付范围，不能把未做修复或未验证路径写成成功。

**完成信号：** 候选 Bundle 可安装，两种 Spec 模式及迁移可用，用户文件和冲突保护得到实测，其他 Profile 内容未被错误替换。

## Task 5：从 Home 发起真实宿主场景并收尾

**Files**

- Temporary only: `$home_check_dir/scenarios/` 下的 Home、Web、API 与只读参考仓、worktree、必要最小测试及日志。
- Fix if needed: 本次实际暴露缺口的任务 1–3 内容与对应副本；修复后重新构建受影响候选。
- Result: 当前任务交付说明或已有实施记录；不建立新的强制测试报告体系。

**Interfaces**

- Consumes: 任务 4 真正安装出的内容；当前可用 Codex 宿主；具有明确预期的小型 Git 夹具。
- Produces: 入口实际选择、目标规则读取路径、修改范围、运行结果及限制的证据。使用自然请求，不在测试提示里点名应选技能或粘贴技能正文。

- [x] **Step 1：准备可观察的临时工程。** 用无真实业务数据的 Home/Web/API 和一个只读参考仓建立稳定 remote 身份及地图。目标仓设置可核对的局部规则、技术入口与验证命令。使用现有 Node 标准库或已装工具构建最小 HTTP 返回/消费案例，不新增模板依赖；将一次 `displayName` 字段变更同时影响 API 响应和 Web 消费作为跨仓场景。测试实际发送请求，分别断言 API 字段及消费结果，不能用两边字符串匹配代替接口行为。
- [x] **Step 2：核实宿主和发现范围。** 使用当前可用的 Codex 支持方式启动独立任务上下文，从真实安装后的 Home 作为起点，按实际支持方式开放夹具目录。先读帮助，不编造启动参数；记录宿主版本及全局技能干扰。无法隔离全局配置时明确限制，不称纯净环境。工具可见路径与最终差异共同作为证据，不只采信 Agent 自报。

计划编制时本机 `codex-cli 0.167.2` 的帮助支持如下调用；运行前再核对。`prompt.txt` 只包含自然任务、真实输入和授权范围，事件输出用于核对读取路径。只读场景使用 `--sandbox read-only`；只读参考仓不加入可写目录。缺失权限或运行能力时保留限制，不关闭沙箱使观察“通过”。

```sh
codex exec --cd "$home_check_dir/scenarios/home" \
  --sandbox workspace-write \
  --add-dir "$home_check_dir/scenarios/web" \
  --add-dir "$home_check_dir/scenarios/api" \
  --ephemeral --json \
  --output-last-message "$home_check_dir/scenarios/result.md" \
  - < "$home_check_dir/scenarios/prompt.txt" \
  > "$home_check_dir/scenarios/events.jsonl"
```
- [x] **Step 3：执行单仓和跨仓场景。** 单仓请求只改 Web 文案，预期只触及目标文件、读取目标约定并运行必要检查，没有先补产品流程；跨仓请求修改上述返回/消费行为，预期两仓共同完成、实际 HTTP 检查通过，结果说明每仓和联调范围。人为留一仓未完成时，结果必须保留整体缺口（R5）。
- [x] **Step 4：执行选址和权限场景。** 同一 remote 准备两个 worktree，未指定时不允许错误写入，明确目标后只改选中工作树；错误 remote 和缺失目录应被识别，另一布局下能按身份重新定位（R1）。只读参考仓及无关脏文件前后摘要不变；“只分析影响”请求所有业务文件不变（R5）。
- [x] **Step 5：执行工程规则与技能来源场景。** Home 与工程放置职责不同的同名技能及可观察的局部工程规则，任务需要其中一项工程行为。预期实际读取目标版本与相对资源，按目标规则执行并记录正确 cwd；不得把 Home 的业务拆票方法用于 Backend 实现切片（R2）。
- [x] **Step 6：执行版本变化和续办场景。** 上游先包含未提交改动和一份未跟踪交互说明，研发输入必须包含这两者；在一个子任务返回后修改相关规则，再要求继续，预期只调整受影响实现、保留无关工作，并说明最终版本依据（R4）。用新上下文接手，检查能从地图、资料及现有任务记录恢复，无需复制全部聊天。
- [x] **Step 7：完成必要修正与收尾。** 真实遗漏修到所属方法，并只重跑相关场景；保留首次失败与修正结果，单次成功不称稳定准确率。核对最终模板差异、源/副本/哈希及必读链接，只报告实际运行宿主的覆盖；清理本次临时服务和确认归属的临时目录，不清理用户工程或其他会话文件。

**完成信号：** 至少一次 Codex 的完整 Home→多仓修改→必要验证→统一结果确实运行；R1–R5 有实际观察；尚未覆盖宿主、真实产品和效率收益明确列出。

## 最终交付与后续范围

实施完成应交付可审阅的模板/技能差异、分发与场景观察、迁移操作说明和实际未覆盖项。文档中的完成勾选只能依据对应执行结果。

推荐后续采用 **Native**：主 Agent 按任务顺序集成，独立任务可委派，完成后做一次整体审阅。原因是改动集中在相互引用的模板与技能，集中管理入口、索引和副本更容易保持一致。也可按用户选择采用逐任务子 Agent 执行；用户已批准执行，本轮按推荐的 Native 方式集成，独立验证由子 Agent 承担。

发布新 CLI/Bundle、公开技能导出、同步真实产品 Home、开展 SCRM 试用分别需要明确对应范围。它们不影响先完成可审阅候选。实际试用后再评价是否需要 CLI 仓库解析，不提前增加下一版机制。

计划自检覆盖：设计的入口/职责对应任务 3；地图与迁移对应任务 1/4；定位、技能、版本、协作、保护与结果对应任务 2/5；平台副本与默认集合对应任务 1–4。执行框仅按已取得的相应证据更新；静态核验与实际运行分别记录。

## 首轮实际执行记录

执行工作树为 `/Users/zhudaoming/.codex/worktrees/spec-home-repo/yss-spec-project-template`，分支 `codex/spec-home-repo`，基线 `60ba4c69e74437b6f222c4bc6929dd88f9dcaf88`。原项目中的三份研究/设计/计划文档保留，未移动或覆盖其他工作。

- 当前基线 Backend 已包含 42 项默认技能；遵循设计“保持原集合”保留 42，未按旧计划数字回退。
- CLI 入口映射使实际 README 收据为 managed-customizable；保持真实冲突保护，不修改 CLI 或收据来实现计划中误认的 user-owned。分别验证双边冲突和源未变时保留。
- 已完成共享内容、默认入口、注册表、平台副本与有效树哈希核验。Spec/Backend/Frontend 默认集合为 17/42/13，Backend 专有入口和 Frontend 白名单保持。安装同步实测与宿主场景均已完成，独立整体审阅未发现需修复事项。

### 安装与同步：14 组通过

使用固定 CLI 源码 `ba3c4aa31e0a7323d38ddd3451221047763fb5e6` 构建 macOS ARM64 的 3.4.1 开发程序；没有安装到用户工具目录。候选模板快照为 `c87c181e9142f13d4dc9d8a2cbabb9b20e1d3cb002a298755091ad4da48c46f7`，Bundle SHA-256 为 `ec20d7a901634bc2581dc9086fed9e06a2319770e0d462eb92cc56ec4bb5356a`。后续对设计/计划的进度记录不属于被测方法文件变更。

| 实际检查 | 结果 |
| --- | --- |
| Spec project/skills 新装及旧版同步 | 默认 17；旧版 16 自动补入 implement，无需额外 ensure；再次同步 unchanged |
| 两模式项目仓库地图 | 字节保留，不进收据；其他方法正常更新 |
| AGENTS 双边修改 | 两模式均 CONFLICT，整树内容、模式及收据未部分更新 |
| 来源未变的受管本地定制 | 两模式均保留 |
| Backend/Frontend 两种安装 | 默认 42/13 精确集合不变；Backend 专有覆盖与继承参考匹配；Frontend 没有 implement |
| README 保护 | 旧版双方修改 CONFLICT 且整树保留；候选新装后本地修改、源未变则 unchanged 并保留 |
| 工程技能 ensure | yss-application/yss-frontend-application 及声明资源闭包实装匹配 |

构建及 14 组检查均完成，结构化结果 `errors=[]`；doctor 没有未完成事务，故意定制的夹具仅有预期差异。源码与安装结果由主会话及独立审阅者核对，未执行无关 CLI 全套测试或 Windows 运行。

### Codex 实际演练与整体审阅

使用 Codex CLI 0.167.2、真实候选 init 的 24 个临时项目，完成 8 组、14 个独立上下文；没有手工合成默认技能。方法选择依据可见读取事件，结果依据命令、文件差异和前后摘要，所有数据均为合成夹具。

| 场景 | 实际结果 |
| --- | --- |
| 单仓文案、跨仓 displayName | 读取 Home 方法与目标工程规则；只修改相应源码/测试，真实 HTTP 复核通过 |
| 同仓多个 worktree | 不明确时询问且没有写入尝试；明确后只改选中工作树，HTTP 通过 |
| 错 remote、缺路径、新布局 | 错误或缺失位置不写入；新上下文按 Git 身份找回新布局目标并完成 HTTP 检查 |
| 只读分析 | 14 条工具命令全部为只读查询，无越权写入尝试或权限拒绝，摘要不变 |
| 仅授权 Web | 只改 Web；真实 API 仍返回旧字段导致契约检查失败，替身成功也明确不能证明整体联调完成 |
| dirty 规格、未跟踪说明与来源变化 | 初次采用实际工作树内容；新上下文读取 TASK 与变化后的输入，只更新受影响实现，两仓 HTTP 通过并复核最终输入摘要 |
| 目标规则与同名技能 | 分别读取 Home 共享 implement、API 专有 implement 及相对资源和局部 AGENTS；未单独演练 to-tickets 混淆 |
| 已有索引与新地图 | 两次均读取本地 setup 和地图模板；已有 README 索引被复用，新地图只写已核实关系，无个人绝对路径/当前分支/工作树状态，收据不变 |

首轮单仓/跨仓的 HTTP 监听被默认网络沙箱拒绝，输出如实保留未联调状态，原 HTTP 测试没有改成 mock 掩盖失败。随后使用调用级 `--strict-config -c sandbox_workspace_write.network_access=true --sandbox workspace-write`，保留文件沙箱和全局配置，两次真实 HTTP 复核通过且没有新增文件变更。刻意保留 API 缺口的局部授权场景仍是整体未完成，不计作整体成功。

独立最终审阅覆盖完整工作树差异、新地图模板、源/副本、默认集合、原始安装 JSON 和宿主事件。结论为可交付候选，未发现 Critical、Important 或 Minor 缺陷。保持 Backend 42 项、README 的实际冲突保护属于基线纠正；无 CLI 解析/schema/常驻套件属于已确认范围；未单测 to-tickets 作为覆盖限制保留。

所有测试子进程已退出，HTTP 服务由测试关闭。清理本次 CLI 编译目录和旧程序临时副本；保留小型夹具与执行日志供复核，不删除未提交的隔离工作树。该保留只服务本次验证，不形成常驻测试套件。

临时证据根：`/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-home-check-irproy7k`；安装记录为 `build-install-check/RESULTS.md` 与 `verification-summary.json`，宿主记录为 `scenarios/RESULTS.md` 与 `scenarios/evidence/summary.json`。

首轮未提交、推送、发行、同步真实产品或修改已安装程序。未验证其他宿主、Windows、真实产品/设备，也未测稳定准确率或效率。用户级技能仍参与发现，因此本次不是纯净宿主对照实验；临时目录的只读行为观察不作为强权限隔离证明。

## 后续复审与完整 Demo

用户在首轮完成后明确要求“review 并修复，然后开始一个 demo 样例完成全流程的验证和测试，最终完成全流程和回归测试验证后提交”。本轮沿用同一模板候选，在独立目录建立合成产品的 Home、Web、API 三个 Git 仓，验证产品输出、真实工程实现、上游增量变更和新会话续办；完成验证后执行本地提交，不推送或发行。

本轮已完成，详细结论与限制见[复审及完整 Demo 验证报告](2026-11-15-spec-home-repo-validation.md)。重新构建和分发 14 组通过；Demo 独立复审的四项 P2 均修复，API 8 项、Web 5 项、原型 3 项及类型/构建/静态检查通过；最终浏览器完成原型 11 组、真实 Web/API 17 组和恢复缺陷定向 2 组。实际发现的一次全局/目标同名技能选用偏差及后补复核记录如实保留，不声称首次发现顺序全部正确。
