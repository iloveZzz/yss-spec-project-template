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

`skills-lock.json` 是技能清单、来源、上游哈希和投影目标的权威记录；本地技能的当前内容哈希不再提交，验证与打包时现算：

- `upstreamHash`：能够追溯时记录未经项目适配的上游内容哈希。
- `effectiveHash`：当前实际生效的完整 skill 目录树哈希。模板源的锁不记录它（architecture-iteration-v1 FR-005），避免每次改技能正文都改锁；打包器按分发的技能树重算并写进实例里的锁，格式与旧版一致。
- `targets`：权威内容应投影到的 Agent roots。

项目允许按 YSS 流程适配上游 skill，但必须保留可追溯的上游信息（`upstreamHash` 与 `adaptationRef`）；相对上游是否有改动，由现算的有效哈希与 `upstreamHash` 比较得出。

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

   fast 默认逐项选择输入及消费者，计划理由包含命中文件、变化行为和能发现的具体错误；未知路径、缺映射或非法依赖先补映射再执行。普通 Skill 文本仅执行相关一致性检查；脚本、研究证据或写作合同变化按各自输入加入已有行为场景。已有检查覆盖时不新增测试或启动环境，必要检查通过即结束；只在相关修改、失败或具体遗漏后追加。记录实际命令、退出码、`limited` 范围及未覆盖边界，无需逐项填写完整清单的跳过理由。维护等级、main 分支不自动触发日常全量。自检由 `maintaining-skills` 承接，独立审查与候选冻结按实际条件执行。

   PR 使用 `scripts/verify-template-fast --base <完整 SHA>`；main 集成验证和正式发布任务使用 `scripts/verify-template`，执行当前完整适用集合并核验已提交来源。两档属于不同任务边界，不自动追加为每次日常交付的固定检查。

   模板源维护引入或更新分发到实例的 Node 工具时，维护侧依赖、构建和 vendor 校验只在模板源治理区及 CI 中执行；实例门禁不得安装依赖或重建 vendor。实例只消费已提交的 `scripts/lib/*.mjs` 与 `scripts/vendor/*.mjs`，具体维护侧命令和治理决策不属于项目实例文档。

6. 需要重新加载技能的客户端在变更落地后重启或刷新项目。

## 专职 Profile 覆盖层

design、backend 专职 Profile 不再是独立仓库，也没有同步脚本、共享工具锁或「有意定制」登记。Profile 的内容分三层，后面的覆盖前面的：内核（本仓的 `.agents/skills`、`scripts`、`.template-spec/process`、`.template-spec/templates`）、`profiles/_specialist/`（各专职 Profile 共有的覆盖）、`profiles/<profile>/`（该 Profile 自己的覆盖，含它的分发清单 `.template-source/distribution/bundle-profile.json`）。yss-cli 在构建 Bundle 时按来源锁里的 `overlayPaths` 把三层组合起来；内核里不属于某个 Profile 的文件，写进它分发清单的 `excludePaths`。

- 改内核文件，所有 Profile 的下一版 Bundle 同时带上；只想让某个 Profile 不同，就在它的覆盖层里放同一路径的文件。
- 需要「整棵 Profile 目录」的测试和夹具用 `scripts/lib/profile-tree.mjs` 的 `composeProfileTree(profile)`，规则与 yss-cli 一致。
- 覆盖层里的 `.codex/skills/<name>` 等链接是旧运行时投影，随旧模板线的 Profile 一起保留，下一步清理；覆盖层目录里不要带会忽略覆盖层自己内容的 `.gitignore`。
- `scripts/verify-profile-distribution` 检查每个 Profile 是否排除了仅模板源脚本、已删除的同步机制是否复活。

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

已退休、personal 或由 YSS 有意排除的条目不再进入 `.agents/skills`、注册表 `projection_roots` 登记的投影根（[`yss-skill-registry.yaml`](../../.template-spec/agents/yss-skill-registry.yaml)）或 `skills-lock.json`。退役 ID、日期和替代路径只在 [`skill-migrations.md`](./skill-migrations.md) 持久化，其他活跃文档不得重复维护清单或创建兼容目录。其中 `wizard` 是最新上游仍存在但 YSS 当前有意排除的人工步骤技能，不应描述为上游已退休。

## 外部工作流工具

维护者可按需使用本机的 `gitlab-workflow`、`glab`、`gh` 或 `scripts/gitworks`。这些工具不是共享技能投影的一部分；平台选择与发布规则见 `.template-spec/agents/issue-tracker.md`。
