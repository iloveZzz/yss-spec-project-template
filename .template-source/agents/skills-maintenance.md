# Skills 维护说明

本文说明项目级 skills 的权威目录、投影方式、锁文件语义和升级验证。Agent 实际加载的入口仍是各目录中的 `SKILL.md`。

## 权威内容与投影

- `.agents/skills` 是跨 Agent 共享技能的唯一权威内容。
- `.codex/skills`、`.cursor/skills`、`.pi/skills` 中的同名共享技能是生成投影，不得分别手工修改。
- Cursor 的契约运行时入口是 `.cursor/skills`，不得把 canonical `.agents/skills` 与平台投影解释为两个来源。
- 分层、别名和默认可发现性以 `.template-spec/agents/yss-skill-registry.yaml` 为准；当前 registry 为 `active`，实现合同编译器、生命周期编排器和实例发现面必须消费通过校验的 canonical 技能及其 alias 解析结果。
- 只属于某个平台的 skill 继续保留在对应 root，并由 `skills-lock.json` 的 `platform` 分组记录。
- 共享技能投影可以是指向权威目录的符号链接，也可以是完整同步副本；`scripts/sync-skills --check` 会检查链接目标或完整目录哈希。

## 来源与锁定

| 来源 | 固定版本 / 路径 | 用途 |
|---|---|---|
| `mattpocock/skills` | `0ab1b63a410a03d3627979a109c8695de27af954` / `skills/engineering` 及锁文件记录的关联路径 | 通用工程流程及关联 skills |
| `anthropics/knowledge-work-plugins` | `sales/skills/competitive-intelligence` | 竞品与市场事实研究 |
| `tt-a1i/archify` | `199360cc6687a7857b54dd188d4922b09e466a4b` / `archify` | 条件式、可验证的技术架构图；YSS 适配见 `.template-source/agents/archify-integration.md` |
| `ayghri/i-have-adhd` | `839872f9d1cd634fed642b4589ce7226199cc15f` / `skills/i-have-adhd` | 当前文档任务的表达配套；中文规范和作用域适配见 `.agents/skills/i-have-adhd/references/yss-adaptation.md`，固定目录与先前基线字节相同 |
| `iloveZzz/yss-ui` | `.agents/skills/.yss-skills-manifest.json` 锁定的 revision / `packages/skills` | 13 个 `categories.app` 业务前端 skills；排除组件库内部 `categories.library` 和后端提交 skill，适配见 `.template-source/agents/yss-ui-skills-integration.md` |
| 项目本地 | `.agents/skills` 或平台专属 root | YSS 适配与项目治理 skills |

`skills-lock.json` 是技能清单、来源、上游哈希、当前有效内容哈希和投影目标的权威记录：

- `upstreamHash`：能够追溯时记录未经项目适配的上游内容哈希。
- `effectiveHash`：当前实际生效的完整 skill 目录树哈希。
- `targets`：权威内容应投影到的 Agent roots。

项目允许按 YSS 流程适配上游 skill，但必须同时保留可追溯的上游信息和适配后的有效哈希。

当前 Matt 快照为 `0ab1b63a410a03d3627979a109c8695de27af954`。模板按 YSS capability 白名单收录上游 Skill；已退役的通用路由、个人工作流、教学、练习、写作实验和专项迁移 Skill 不再随 project-instance 分发。

生命周期适配规则为：阶段边界只写可选 `phase_boundary` 证据；生命周期外部输入问卷 使用 `external-input-required` 暂停并在答案回流后重新分类影响面；Matt `prototype` 的单文件 HTML 只作为回流输入，YSS 原型仍须完成低保真评审、H1/H2 档位路由、Prototype Evidence schema v4、Visual Baseline schema v1 验证和用户确认。人工 checkpoint 与 `diagnosing-bugs` 的输出必须脱敏，重新解释当前结论只调整表达，不改变生命周期状态。

## 维护流程

1. 在临时目录读取或下载锁定来源，不直接覆盖工作区。
2. 只在 `.agents/skills/<skill-name>/` 修改共享技能；平台专属技能只在所属 root 修改。
3. 创建、修改或退役 skill 时使用 `maintaining-skills`，并按 `.template-spec/process/harness-process-tailoring.md` 与 `maintenance-intensity.yaml` 判定验证强度；独立审查按需，不由 L2 自动触发。发现描述或提示结构调整时读取该 Skill 的 `references/authoring.md`，保留具体业务约束和跨运行时兼容性。
4. 生成共享投影并更新锁文件：

   ```bash
   scripts/sync-skills
   scripts/update-skill-lock
   ```

   若来源来自可访问的上游 checkout，还应显式校验锁定 revision 与每个上游目录哈希：

   ```bash
   scripts/verify-upstream-skill-source --source=mattpocock/skills --source-root <matt-skills-checkout>
   scripts/verify-upstream-skill-source --source=iloveZzz/yss-ui --source-root <yss-ui-checkout>
   ```

   新增共享 skill 时先显式登记：`scripts/update-skill-lock --add=<skill-name>`；新增平台专属 skill 使用 `scripts/update-skill-lock --add-platform=<root>:<skill-name>`。脚本不会把工作区中偶然出现的未跟踪目录自动纳入发布清单。

5. 日常修改按本轮影响及直接 / 传递依赖做定向核验，默认完成到 `implementation-ready`。先读取影响计划：

   ```bash
   scripts/verify-template-fast --plan
   ```

   计划适用于本轮时执行 fast；若扩大到全量，按裁剪合同改做明确范围的定向检查，记录实际命令、退出码、选择依据与未覆盖项，不把定向结果写成完整 profile 通过。未知影响先调查；维护等级、main 分支或缺发布 baseline 不自动触发日常全量。自检由 `maintaining-skills` 承接，独立审查与候选冻结只按明确选择或既有强制条件执行。

   PR 候选使用 `scripts/verify-template-candidate --base <完整 SHA>`；main 集成验证和正式发布任务使用 `scripts/verify-template`，并遵守对应完整适用集合、资格与回退规则。三个入口属于不同任务边界，不依次作为每次日常交付的固定检查。

   模板源维护引入或更新分发到实例的 Node 工具时，维护侧依赖、构建和 vendor 校验只在模板源治理区及 CI 中执行；实例门禁不得安装依赖或重建 vendor。实例只消费已提交的 `scripts/lib/*.mjs` 与 `scripts/vendor/*.mjs`，具体维护侧命令和治理决策不属于项目实例文档。

6. 需要重新加载技能的客户端在变更落地后重启或刷新项目。

## Backend / Frontend 生成内容

两端的 `materialization: generated` 由 `.template-source/profile-skill-sync.json` 声明。共享技能完整目录与三个 Agent 投影只在本地生成；各端四个 `local_only` 技能、技能锁、注册表、来源锁和适配材料继续受 Git 管理。Design 保留原同步模式及四个上游技能的所有权。Frontend 的 Product Design 平台包按完整包生成。

独立克隆后，先把可信 Spec 源码 checkout 到本端 `.template-source/profile-skills-source.json` 的完整提交，再显式运行：

```sh
node scripts/prepare-skills --source <固定Spec源码目录> --check
node scripts/prepare-skills --source <固定Spec源码目录> --apply
node scripts/prepare-skills --check
```

前两条在 Backend 或 Frontend 根目录执行；不联网、不切换来源、不自动安装。缺来源、错误提交、源文件漂移、适配基线变化、链接越界、已修改生成文件或未知占用均拒绝覆盖。应用失败恢复已触及文件；相同输入重复执行不写入。最后一条只核验本地生成回执，准备后无需保持来源目录在线。维护入口先执行这一检查；`--plan` 仍可用于未准备仓的只读调查。

本模板维护期间，`scripts/sync-profile-skills --apply --profile=backend,frontend --update-source-lock` 显式更新生成内容和来源锁；不带 `--update-source-lock` 不改变锁。仅原样生成或登记的完整适配树可进入生成模式，片段替换保留计数基线，补丁保留整树基线，权限差异通过 `file_modes` 登记。禁止直接编辑两端的生成目录。源码尚有相关改动时，锁标记为 `working-tree`，只用于本地维护检查；独立准备及正式组合构建只接受 `committed`。

CLI 的内部来源锁 v3 将两端固定提交与 `skillsSource` 的 Spec 提交、清单路径和摘要分别绑定。构建只读 Git 对象并重放适配，忽略本地生成目录和 dirty worktree；公开 Bundle 继续为 v3，组合来源、完整技能摘要位于 `manifest.skillComposition`，参与 manifest 和 Bundle 摘要校验。实例仍安装完整离线技能，不分发源码准备入口、来源回执或生成目录忽略规则。历史来源锁 v2、公开 Bundle 和实例读入及升级事务继续兼容。

固定来源按以下顺序交付：先提交共享源、清单和生成实现；用该完整提交更新两端来源锁并提交两端；随后固定 CLI 来源锁并构建完整资产；最后更新父仓 gitlink。共享来源不绑定未来父仓提交，避免循环引用。提交、推送与发布分别遵守既有授权边界。仓库当前没有 GitHub workflow；以后接入 CI 时显式准备再校验，不增加隐式网络准备。

## 专职 Profile 同步

战略设计、后端和前端 Agent 子项目通过 `.template-source/profile-skill-sync.json` 声明跨仓消费关系。每个实际 Skill 入口都必须分类为原样同步、带适配同步、子项目独有、排除、退役或上游；`excluded` 只允许目标中不存在的技能，不能隐藏活跃副本。战略设计的四个公共 Skill 由战略源仓向本模板薄适配集成，其余登记项由本模板向消费 Profile 同步。

维护者先预览，再显式应用；CI 只检查漂移：

```bash
scripts/sync-profile-skills --dry-run --profile=all
scripts/sync-profile-skills --apply --profile=design,backend,frontend
scripts/sync-profile-skills --check --profile=all
```

Profile 同步只维护登记的内容，不代替子项目的派生更新。应用后，在每个受影响子项目运行 `scripts/sync-skills`、`scripts/update-skill-lock`，再分别以 `--check` 验证。涉及 CLI 分发或正式发布时，再按固定来源合同重建其快照；普通 Skill 本地交付不自行升级 CLI 或扩大为发布任务。正文的 `effectiveHash` 变化必须在同批锁文件中体现；不能靠改来源 revision 掩盖过期摘要。验证和打包期间不要重建同一 CLI 的快照，以免测试前后读到不同输入。

默认行为等同 `--dry-run`。`--json` 输出机器可读报告。实际入口未分类时检查失败，包括内容相同的副本和子项目独有入口。简单适配使用已登记的片段替换与计数基线；复杂适配的文件级补丁位于 `.template-source/profile-skill-patches/`，并绑定上游 Skill 树 hash。目标含未提交且与期望结果不同的改动、引用缺失、路径越界、上游基线漂移或补丁无法重放时禁止写入。应用会在整批预检后逐文件更新，并在写入失败时恢复本次已改文件；工具不提交、不推送，也不更新 CLI 的固定版本快照。

平台专属包通过可选 `platform_roots` 与 `exact` / `adapted` 中的完整 `source`、`target` 包路径登记，继续使用 schema v1。主仓的 Product Design / Data Analytics 是这些仓内包的公共维护源；包内嵌套入口随整包同步，生成的共享投影不重复算作平台源。运行同步两次，第二次应无差异；保留角色技能的 `local_only` 和战略源的单向所有权。

启用 `verify_entry_references` 后，检查器在计划应用后的文件集合中解析入口 Markdown 链接；新增参考文件可随同批变更通过，删除后失效的链接会阻断。`reference_roots` 登记平台包；代码围栏和行内代码中的示例不当作真实链接。Python 缓存不属于技能来源或同步差异。

## 真实 Agent 行为评测

模板维护侧使用 `.template-source/scripts/skills-agent-eval.py`，输入 JSON 场景、冻结的基线或候选目录、Codex 可执行文件、模型和推理配置。两侧使用相同提示、fixture、运行配置和断言，默认每场景串行两次。输出原始 JSONL 工具轨迹、命令替身记录、产物和自动检查结果；另行审阅实际行为，不能把模型自述或静态检查当作行为通过。

fixture 只允许隔离目录中的本地操作，Git、网络和包管理器使用替身，不接触用户真实状态。缺凭据、工具或运行时记为未完成。修正评测断言时保留原始结果、修正理由和两侧统一重评分；技能修复后只复跑受影响场景，并保留所有尝试。具体场景与交付记录留在对应维护证据目录，不分发到项目实例。

## 单独检查

```bash
scripts/sync-skills --check
scripts/update-skill-lock --check
# 可选：对照锁文件中的 source revision 与上游目录哈希
scripts/verify-upstream-skill-source --source=mattpocock/skills --source-root <matt-skills-checkout>
scripts/verify-upstream-skill-source --source=iloveZzz/yss-ui --source-root <yss-ui-checkout>
```

前者检查所有共享投影是否指向或匹配权威内容，后者检查 `skills-lock.json` 是否与当前完整目录树一致。过时技能不会保留兼容别名；旧 skill 名称和入口按 [`.template-spec/agents/skill-migrations.md`](./skill-migrations.md) 一次性迁移，项目文件升级由 `create-yss-spec attach` / `sync` 处理。

## skills.sh 公开发布

YSS 技能的公开发布仓库为 `iloveZzz/yss-spec-dev-skills`，它是本模板 `.agents/skills` 的单向发布投影，不是新的权威来源。

- `yss-public-skills.json` 冻结允许公开的 YSS 技能清单；新增技能必须显式加入该清单。
- `scripts/export-yss-skills --output <目录>` 从 canonical skills 生成公开目录；`--check --output <目录>` 只验证已有导出，不写入文件。
- 公开仓库只包含 `skills/`、README、许可证、`skills.sh.json` 和发布校验；不得复制 `AGENTS.md`、`CONTEXT.md`、`skills-lock.json` 或各 Agent 投影目录。
- 导出器会将本机绝对路径、Agent root 和模板内部路径转换为公开可移植形式，并阻断重复 skill 名、疑似凭据、符号链接和失效仓库内链接。
- 发布顺序为：同步 canonical projections → 更新 lock → `scripts/verify-template` → 导出并检查 → 独立审查 → 在 `yss-spec-dev-skills` 提交人工 PR。不得从目标仓库反向覆盖 `.agents/skills`。
- skills.sh 通过 `npx skills add iloveZzz/yss-spec-dev-skills` 的安装遥测自动发现技能，不需要手工注册；遥测可用 `DISABLE_TELEMETRY=1` 或 `DO_NOT_TRACK` 关闭。

已退休、personal 或由 YSS 有意排除的条目不再进入 `.agents/skills`、六个共享投影根或 `skills-lock.json`。退役 ID、日期和替代路径只在 [`skill-migrations.md`](./skill-migrations.md) 持久化，其他活跃文档不得重复维护清单或创建兼容目录。其中 `wizard` 是最新上游仍存在但 YSS 当前有意排除的人工步骤技能，不应描述为上游已退休。

## 外部工作流工具

维护者可按需使用本机的 `gitlab-workflow`、`glab`、`gh` 或 `scripts/gitworks`。这些工具不是共享技能投影的一部分；平台选择与发布规则见 `.template-spec/agents/issue-tracker.md`。
