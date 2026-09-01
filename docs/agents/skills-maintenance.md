# Skills 维护说明

本文说明项目级 skills 的权威目录、投影方式、锁文件语义和升级验证。Agent 实际加载的入口仍是各目录中的 `SKILL.md`。

## 权威内容与投影

- `.agents/skills` 是跨 Agent 共享技能的唯一权威内容。
- `.claude/skills`、`.codex/skills`、`.cursor/skills`、`.hermes/skills`、`.pi/skills`、`.qoder/skills`、`.trae/skills` 中的同名共享技能是生成投影，不得分别手工修改。
- Cursor 的契约运行时入口是 `.cursor/skills`。若客户端同时枚举 `.claude/skills`，仍以 `.cursor/skills` 为 Cursor 投影契约，不得把两套同名 skill 解释为两个来源。
- 分层、别名和默认可发现性以 `docs/agents/yss-skill-registry.yaml` 为准；当前 registry 为 `active`，Router、生命周期编排器和实例发现面必须消费通过校验的 canonical 技能及其 alias 解析结果。
- 只属于某个平台的 skill 继续保留在对应 root，并由 `skills-lock.json` 的 `platform` 分组记录。
- 共享技能投影可以是指向权威目录的符号链接，也可以是完整同步副本；`scripts/sync-skills --check` 会检查链接目标或完整目录哈希。

## 来源与锁定

| 来源 | 固定版本 / 路径 | 用途 |
|---|---|---|
| `mattpocock/skills` | `0ab1b63a410a03d3627979a109c8695de27af954` / `skills/engineering` 及锁文件记录的关联路径 | 通用工程流程及关联 skills |
| `anthropics/knowledge-work-plugins` | `sales/skills/competitive-intelligence` | 竞品与市场事实研究 |
| `tt-a1i/archify` | `199360cc6687a7857b54dd188d4922b09e466a4b` / `archify` | 条件式、可验证的技术架构图；YSS 适配见 `docs/agents/archify-integration.md` |
| 项目本地 | `.agents/skills` 或平台专属 root | YSS 适配与项目治理 skills |

`skills-lock.json` 是技能清单、来源、上游哈希、当前有效内容哈希和投影目标的权威记录：

- `upstreamHash`：能够追溯时记录未经项目适配的上游内容哈希。
- `effectiveHash`：当前实际生效的完整 skill 目录树哈希。
- `targets`：权威内容应投影到的 Agent roots。

项目允许按 YSS 流程适配上游 skill，但必须同时保留可追溯的上游信息和适配后的有效哈希。

当前 Matt 快照为 `0ab1b63a410a03d3627979a109c8695de27af954`。`ask-matt` 的关联入口包括 `to-questionnaire`、`wait-what`、`writing-for-agents` 和 `PHASE-BOUNDARIES.md`；这些支持文件随共享 skill 目录一起计算 `effectiveHash`，不得单独投影或维护。

本轮升级还将生命周期适配固定为：阶段边界只写可选 `phase_boundary` 证据；`to-questionnaire` 使用 `external-input-required` 暂停并在答案回流后重新分类影响面；Matt `prototype` 使用 `prototype/<name>` 分支和单文件 HTML，YSS 高保真原型继续执行 Prototype Review、AntD CLI 校验和用户确认。人工 checkpoint 与 `diagnosing-bugs` 的输出必须脱敏，`wait-what` 不改变生命周期状态。

## 维护流程

1. 在临时目录读取或下载锁定来源，不直接覆盖工作区。
2. 只在 `.agents/skills/<skill-name>/` 修改共享技能；平台专属技能只在所属 root 修改。
3. 创建、修改或退役 skill 时使用 `maintaining-skills`，并先按 `docs/process/harness-process-tailoring.md` 判定验证与审查强度：L1 执行相关检查，L2 记录最小反例和 fresh verification，L3 记录完整 RED 基线、压力场景、GREEN 结果和 REFACTOR 检查。未定义分级的外部仓库按实际风险执行结构校验和针对性行为验证，不强制为每次普通修改构造失败基线。
4. 生成共享投影并更新锁文件：

   ```bash
   scripts/sync-skills
   scripts/update-skill-lock
   ```

   若来源来自可访问的 Matt checkout，还应显式校验锁定 revision 与每个上游目录哈希：

   ```bash
   scripts/verify-upstream-skill-source --source-root <matt-skills-checkout>
   ```

   新增共享 skill 时先显式登记：`scripts/update-skill-lock --add=<skill-name>`；新增平台专属 skill 使用 `scripts/update-skill-lock --add-platform=<root>:<skill-name>`。脚本不会把工作区中偶然出现的未跟踪目录自动纳入发布清单。

5. 日常修改先执行影响面快速核验，默认完成到 `implementation-ready`：

   ```bash
   scripts/verify-template-fast
   ```

   显式准备独立审查时执行 `scripts/verify-template-candidate`，首次冻结前和最终发布前才执行完整发布阻断校验：

   ```bash
   scripts/verify-template-candidate
   scripts/verify-template
   ```

   模板源维护引入或更新分发到实例的 Node 工具时，维护侧依赖、构建和 vendor 校验只在模板源治理区及 CI 中执行；实例门禁不得安装依赖或重建 vendor。实例只消费已提交的 `scripts/lib/*.mjs` 与 `scripts/vendor/*.mjs`，具体维护侧命令和治理决策不属于项目实例文档。

6. 需要重新加载技能的客户端在变更落地后重启或刷新项目。

## 单独检查

```bash
scripts/sync-skills --check
scripts/update-skill-lock --check
# 可选：对照锁文件中的 mattpocock/skills revision 与上游目录哈希
scripts/verify-upstream-skill-source --source-root <matt-skills-checkout>
```

前者检查所有共享投影是否指向或匹配权威内容，后者检查 `skills-lock.json` 是否与当前完整目录树一致。过时技能不会保留兼容别名；旧版项目按 `docs/user-guide/规格与任务迁移指南.md` 一次性迁移。

## skills.sh 公开发布

YSS 技能的公开发布仓库为 `iloveZzz/yss-spec-dev-skills`，它是本模板 `.agents/skills` 的单向发布投影，不是新的权威来源。

- `yss-public-skills.json` 冻结允许公开的 YSS 技能清单；新增技能必须显式加入该清单。
- `scripts/export-yss-skills --output <目录>` 从 canonical skills 生成公开目录；`--check --output <目录>` 只验证已有导出，不写入文件。
- 公开仓库只包含 `skills/`、README、许可证、`skills.sh.json` 和发布校验；不得复制 `AGENTS.md`、`CONTEXT.md`、`skills-lock.json` 或各 Agent 投影目录。
- 导出器会将本机绝对路径、Agent root 和模板内部路径转换为公开可移植形式，并阻断重复 skill 名、疑似凭据、符号链接和失效仓库内链接。
- 发布顺序为：同步 canonical projections → 更新 lock → `scripts/verify-template` → 导出并检查 → 独立审查 → 在 `yss-spec-dev-skills` 提交人工 PR。不得从目标仓库反向覆盖 `.agents/skills`。
- skills.sh 通过 `npx skills add iloveZzz/yss-spec-dev-skills` 的安装遥测自动发现技能，不需要手工注册；遥测可用 `DISABLE_TELEMETRY=1` 或 `DO_NOT_TRACK` 关闭。

已退休、personal 或由 YSS 有意排除的条目（`design-an-interface`、`qa`、`request-refactor-plan`、`ubiquitous-language`、`edit-article`、`obsidian-vault`、`writing-great-skills`、`web-design-engineer`、`web-video-presentation`、`wireframe-prototype`、`wizard`、`git-guardrails-claude-code`、`claude-handoff`、`batch-grill-me`）不再进入 `.agents/skills`、六个共享投影根或 `skills-lock.json`。其中 `wizard` 是最新上游仍存在但 YSS 当前有意排除的人工步骤技能，不应描述为上游已退休。迁移时使用 `codebase-design`、`triage + to-tickets`、`to-spec + improve-codebase-architecture`、`domain-modeling`、`product-design:index`、普通人工 checkpoint 或 `handoff` 等现行路由，不创建兼容目录。

## 外部工作流工具

维护者可按需使用本机的 `gitlab-workflow`、`glab`、`gh` 或 `scripts/gitworks`。这些工具不是共享技能投影的一部分；平台选择与发布规则见 `docs/agents/issue-tracker.md`。
