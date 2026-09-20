# Skills 维护说明

本文说明项目级 skills 的权威目录、投影方式、锁文件语义和升级验证。Agent 实际加载的入口仍是各目录中的 `SKILL.md`。

## 权威内容与投影

- `.agents/skills` 是跨 Agent 共享技能的唯一权威内容。
- `.codex/skills`、`.cursor/skills`、`.pi/skills` 中的同名共享技能是生成投影，不得分别手工修改。
- Cursor 的契约运行时入口是 `.cursor/skills`，不得把 canonical `.agents/skills` 与平台投影解释为两个来源。
- 分层、别名和默认可发现性以 `docs/agents/yss-skill-registry.yaml` 为准；当前 registry 为 `active`，实现合同编译器、生命周期编排器和实例发现面必须消费通过校验的 canonical 技能及其 alias 解析结果。
- 只属于某个平台的 skill 继续保留在对应 root，并由 `skills-lock.json` 的 `platform` 分组记录。
- 共享技能投影可以是指向权威目录的符号链接，也可以是完整同步副本；`scripts/sync-skills --check` 会检查链接目标或完整目录哈希。

## 来源与锁定

| 来源 | 固定版本 / 路径 | 用途 |
|---|---|---|
| `mattpocock/skills` | `0ab1b63a410a03d3627979a109c8695de27af954` / `skills/engineering` 及锁文件记录的关联路径 | 通用工程流程及关联 skills |
| `anthropics/knowledge-work-plugins` | `sales/skills/competitive-intelligence` | 竞品与市场事实研究 |
| `tt-a1i/archify` | `199360cc6687a7857b54dd188d4922b09e466a4b` / `archify` | 条件式、可验证的技术架构图；YSS 适配见 `docs/agents/archify-integration.md` |
| `iloveZzz/yss-ui` | `.agents/skills/.yss-skills-manifest.json` 锁定的 revision / `packages/skills` | 22 个 `categories.app` 业务前端 skills；排除组件库内部 `categories.library` 和后端提交 skill，适配见 `docs/agents/yss-ui-skills-integration.md` |
| 项目本地 | `.agents/skills` 或平台专属 root | YSS 适配与项目治理 skills |

`skills-lock.json` 是技能清单、来源、上游哈希、当前有效内容哈希和投影目标的权威记录：

- `upstreamHash`：能够追溯时记录未经项目适配的上游内容哈希。
- `effectiveHash`：当前实际生效的完整 skill 目录树哈希。
- `targets`：权威内容应投影到的 Agent roots。

项目允许按 YSS 流程适配上游 skill，但必须同时保留可追溯的上游信息和适配后的有效哈希。

当前 Matt 快照为 `0ab1b63a410a03d3627979a109c8695de27af954`。模板按 YSS capability 白名单收录上游 Skill；已退役的通用路由、个人工作流、教学、练习、写作实验和专项迁移 Skill 不再随 project-instance 分发。

本轮升级还将生命周期适配固定为：阶段边界只写可选 `phase_boundary` 证据；`to-questionnaire` 使用 `external-input-required` 暂停并在答案回流后重新分类影响面；Matt `prototype` 的单文件 HTML 只作为回流输入，YSS 原型仍须完成低保真评审、H1/H2 档位路由、Prototype Evidence schema v4、Visual Baseline schema v1 验证和用户确认。人工 checkpoint 与 `diagnosing-bugs` 的输出必须脱敏，`wait-what` 不改变生命周期状态。

## 维护流程

1. 在临时目录读取或下载锁定来源，不直接覆盖工作区。
2. 只在 `.agents/skills/<skill-name>/` 修改共享技能；平台专属技能只在所属 root 修改。
3. 创建、修改或退役 skill 时使用 `maintaining-skills`，并按 `docs/process/harness-process-tailoring.md` 与 `maintenance-intensity.yaml` 判定验证强度；独立审查按需，不由 L2 自动触发。发现描述或提示结构调整时读取该 Skill 的 `references/authoring.md`，保留具体业务约束和跨运行时兼容性。
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

5. 日常修改先执行影响面快速核验，默认完成到 `implementation-ready`：

   ```bash
   scripts/verify-template-fast
   ```

   PR 使用 `scripts/verify-template-candidate`；main 与发布前使用 `scripts/verify-template`。是否冻结候选或做独立审查按权威策略判定，candidate 命令本身不要求冻结：

   ```bash
   scripts/verify-template-candidate
   scripts/verify-template
   ```

   模板源维护引入或更新分发到实例的 Node 工具时，维护侧依赖、构建和 vendor 校验只在模板源治理区及 CI 中执行；实例门禁不得安装依赖或重建 vendor。实例只消费已提交的 `scripts/lib/*.mjs` 与 `scripts/vendor/*.mjs`，具体维护侧命令和治理决策不属于项目实例文档。

6. 需要重新加载技能的客户端在变更落地后重启或刷新项目。

## 专职 Profile 同步

战略设计、后端和前端 Agent 子项目通过 `.template-source/profile-skill-sync.json` 声明跨仓消费关系。每个实际 Skill 入口都必须分类为原样同步、带适配同步、子项目独有、排除、退役或上游；`excluded` 只允许目标中不存在的技能，不能隐藏活跃副本。战略设计的四个公共 Skill 由战略源仓向本模板薄适配集成，其余登记项由本模板向消费 Profile 同步。

维护者先预览，再显式应用；CI 只检查漂移：

```bash
scripts/sync-profile-skills --dry-run --profile=all
scripts/sync-profile-skills --apply --profile=design,backend,frontend
scripts/sync-profile-skills --check --profile=all
```

Profile 同步只维护登记的内容，不代替子项目的派生更新。应用后，在每个受影响子项目运行 `scripts/sync-skills`、`scripts/update-skill-lock`，再分别以 `--check` 验证，最后重建其 CLI 快照。正文的 `effectiveHash` 变化必须在同批锁文件中体现；不能靠改来源 revision 掩盖过期摘要。验证和打包期间不要重建同一 CLI 的快照，以免测试前后读到不同输入。

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

前者检查所有共享投影是否指向或匹配权威内容，后者检查 `skills-lock.json` 是否与当前完整目录树一致。过时技能不会保留兼容别名；旧 skill 名称和入口按 [`docs/agents/skill-migrations.md`](./skill-migrations.md) 一次性迁移，项目文件升级由 `create-yss-spec attach` / `sync` 处理。

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

维护者可按需使用本机的 `gitlab-workflow`、`glab`、`gh` 或 `scripts/gitworks`。这些工具不是共享技能投影的一部分；平台选择与发布规则见 `docs/agents/issue-tracker.md`。
