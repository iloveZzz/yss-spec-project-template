---
design_id: harness-hardening-v1
version: 0.3.0
status: proposed
content_profile: plan-spec-v1
repository_mode: template-source
intensity: L2
owner: maintainer
updated_at: 2026-10-10
execution_plan: harness-hardening-v1-plan.md
---

# 模板加固规格：执行点下沉与表面积削减

## 文档状态与范围

本文是 `template-source` 的维护合同，状态为 `proposed`，未经维护者确认前不授权任何写入。它定义一轮加固的可观察结果；执行顺序、写范围和验证命令见 [执行计划](harness-hardening-v1-plan.md)。本文不是产品 Spec，不触发产品 Spec、OpenAPI、原型或 `context_reconciliation`，这些项记为 `not-applicable：模板源治理与工具链维护`。

本轮遵循一条总约束：**加固本身不得增加常驻上下文和流程概念**。新增的每一项机制都必须替代一段文字规则，或者删除一处重复。

## 问题陈述

模板已经写好大量确定性检查，但这些检查没有执行点：CI 已移除，agent hook 为空，规则靠人或 agent 自觉触发。同时，常驻上下文、技能数量和文档事实的重复陈述持续增长，已经出现可见漂移。另有一项实例分发配置会关闭 Codex 的沙箱与审批，与模板自身“工具权限确认不等于批准”的治理原则直接冲突。

## 现状证据

以下数据于 2026-10-10 在当前工作树（HEAD `922219d7`，含未提交改动）实测或读取。

| 编号 | 事实 | 位置 |
|---|---|---|
| 证据 1 | `.codex/config.toml` 写有 `sandbox_mode = "danger-full-access"`、`approval_policy = "never"`，已纳入版本管理；`bundle-profile.json` 的 `allowRootEntries` 含 `.codex`，`excludePaths` 不含该文件，因此进入新实例。三个 Profile 子模块含同样配置 | `.codex/config.toml`；`.template-source/distribution/bundle-profile.json` |
| 证据 2 | `.github/workflows/` 为空；合同写明“根 `.github/workflows` 已移除……不再自动运行这些模板检查”；`.github/actions/setup-template/action.yml` 仍保留 | `.template-source/process/github-workflows.md` |
| 证据 3 | `.codex/hooks.json` 为 `{"hooks": {}}`；仓库无 `.claude/` 目录、无根 `CLAUDE.md` | `.codex/hooks.json` |
| 证据 4 | 选择性 gate policy 仍为 `activation: legacy-full`、`qualification_ref: null` | `.template-source/process/template-verification-profiles.yaml` |
| 证据 5 | 常驻读取（工作树，含未提交改动）：`AGENTS.md` 4,816 B、`CONTEXT.md` 24,801 B（98 行表格）、`yss-product-lifecycle/SKILL.md` 15,076 B，合计 44,693 B；已提交的 HEAD `26b9be5f` 为 43,741 B | 根目录；`.agents/skills/yss-product-lifecycle/` |
| 证据 6 | 共享技能 79 个，description 合计 6,403 字符（`harness-metrics` 口径，不含引号），其中仅 8 个声明 `disable-model-invocation: true`，可隐式触发的 71 个技能合计 5,707 字符；Backend/Frontend/Design Profile 在工作树物化后为 62/57/25 个技能（隐式 description 4,320/4,279/1,834 字符），但已提交的子模块提交里 Backend/Frontend 只有 4 个技能，其余在初始化时生成 | `.agents/skills/*/SKILL.md`；`submodules/*/.agents/skills` |
| 证据 7 | `.codex/skills` 80 项：48 个符号链接、31 个与 `.agents/skills` 逐字节相同的完整副本、1 个 Codex 独有（`product-design`）；另有 `.cursor/skills`、`.pi/skills` 两个投影根 | `.codex/skills`；`yss-skill-registry.yaml` `instance_distribution.projection_roots` |
| 证据 8 | 文档漂移：团队指南写“21 个门禁”和“机会与 Discovery”阶段（注册表为 8 个门禁，`stage.discovery` 已弃用）；README 固定 Matt skills `6acc160e…`，lock 为 `0ab1b63a…`；技能维护文档写“六个共享投影根”（实际 3 个）；角色文档标题为“四条正交轴” | `docs/process/yss-product-lifecycle-team-guide.md`；`README.md`；`skills-lock.json`；`.template-source/agents/skills-maintenance.md`；`.template-spec/agents/digital-human-roles.md` |
| 证据 9 | `package.json` 无 `engines`；运行时存储依赖 `node:sqlite`，验证合同要求 Node 24 运行器、Node 22 工具兼容 | `package.json`；`.nvmrc` |
| 证据 10 | `skill-migrations.md` 在 2026-09-19 至 10-08 间记录 4 次硬退役或更名 | `.template-spec/agents/skill-migrations.md` |
| 证据 11 | Spec Delta 模板定义 ADDED/MODIFIED/REMOVED，未见 Delta 批准后合并为新基线版本的流程 | `.template-spec/templates/spec-delta-template.md`；`lifecycle-registry.yaml` `artifact.spec-delta`；`CONTEXT.md` Spec Delta 条目（`spec-baseline.md` 处理的是跨实例 Spec 交接，不是 Delta 合并） |
| 证据 12 | 全部仓库位于个人账号 `iloveZzz`；统一 CLI 正式发行仅 `darwin/arm64` | `.gitmodules`；`submodules/yss-cli/README.md` |

外部参照（只用于判断方向，不作为本仓规则来源）：Claude Code 文档将 hook 定义为确定性执行点，`CLAUDE.md` 支持 `@` 导入；Codex 与 Cursor 原生读取 `.agents/skills`；社区多数方案采用单一权威技能目录加符号链接或插件分发。具体限额与 schema 在实施时按当期官方文档复核，见 Q-003、Q-004。

## 解决方案

分四层推进，前一层未完成不启动后一层的写入：

1. **止血**：撤销实例中的高危默认配置（FR-001）。
2. **执行点下沉**：一个平台无关的 `scripts/ci-gate` 加薄适配器，一个快速的 `scripts/agent-hook`，把已有检查接到 PR 和 agent 停止点（FR-002～FR-005）。
3. **表面积削减**：补 Claude Code 入口，修复漂移并消除漂移类别，控制隐式触发，收敛投影根，拆分 `CONTEXT.md`（FR-006～FR-012）。
4. **结构补齐（设计先行）**：Spec Delta 合并回基线、治理核心与 YSS 技术栈分层、维护者与平台矩阵（FR-013～FR-017）。本轮只交付设计文档和决策记录，实现另立合同。

全程用 `scripts/harness-metrics` 在每个阶段结束时记录同一组指标（FR-015），用数据决定是否进入下一层。

## 功能需求

| ID | 需求 | 优先级 | 来源引用 | 验收引用 | 未决项 |
|---|---|---|---|---|---|
| FR-001 | 模板源、三个 Profile 子模块与新实例均不再分发会关闭沙箱或审批的 Codex 配置。删除被 Git 追踪的 `.codex/config.toml`（模板源与三个 Profile 子模块），并从实例分发中排除；之后任何被追踪的 Codex 配置都不得包含 `sandbox_mode = "danger-full-access"` 或 `approval_policy = "never"`。维护者本机的高权限模式改放用户级 `~/.codex/config.toml`（Q-002 已决）。已存在实例通过升级协议得到提示，不被静默改写 | P0 | .template-source/contracts/harness-hardening-v1.md :: heading:现状证据 | AC-001, AC-002 | 无 |
| FR-002 | 新增平台无关入口 `scripts/ci-gate`，按顺序执行：配置安全检查（FR-001）、`scripts/sync-skills --check`、`scripts/update-skill-lock --check`、`scripts/verify-lifecycle-registry`、`scripts/verify-skill-registry`、文档事实检查（FR-008），以及 PR 模式下的 `scripts/verify-template-candidate --base "$BASE_SHA"`（PR 目标分支的完整提交 SHA） 或推送模式下的 `scripts/verify-template-fast`。任一步失败即非零退出，并输出失败步骤、命令和日志路径；报告写入仓外目录 | P0 | .template-source/process/github-workflows.md :: heading:模板源 | AC-003, AC-004 | 无 |
| FR-003 | GitHub Actions 与 GitLab CI 各提供一个薄适配器调用 `scripts/ci-gate`（Q-001 已决：两者都要）：GitHub PR、GitLab MR 与主分支推送触发。环境准备抽到平台无关的 `scripts/ci-setup`，`.github/actions/setup-template` 改为调用它的薄封装。两个适配器都不得包含检查逻辑，同一提交在两个平台上执行相同步骤 | P0 | .template-source/process/github-workflows.md :: heading:模板源 | AC-005, AC-023 | 无 |
| FR-004 | 更新 `github-workflows.md`：删除“已移除、不再自动运行”的表述，登记 `ci-gate` 为 PR 必需检查，保留正式发布仍由 `verify-template` 与 `verify-template-release.mjs` 本地执行的边界 | P1 | .template-source/process/github-workflows.md :: heading:模板源 | AC-006 | 无 |
| FR-005 | 新增 `scripts/agent-hook`：读取本轮变更路径，只运行与路径相关的快速检查（技能目录或 lock 变化 → 投影与 lock 检查；生命周期注册表变化 → 注册表检查；批准记录变化 → `verify-approval-record`；`.codex/` 变化 → 配置安全检查）。无相关变化时立即成功。接入 Claude Code `Stop` hook 与 Codex hooks；违规时阻止结束并给出修复命令。不得调用 fast / candidate / 全量验证 | P1 | .template-source/contracts/harness-hardening-v1.md :: heading:现状证据 | AC-007, AC-008 | Q-003 |
| FR-006 | Claude Code 成为一级运行时：根目录 `CLAUDE.md` 只含 `@AGENTS.md` 及一行说明；`.claude/skills` 登记为投影根，由 `sync-skills` 生成并纳入 lock 校验；`bundle-profile.json` 与 Profile 子模块同步 | P1 | .template-source/contracts/harness-hardening-v1.md :: heading:现状证据 | AC-009 | Q-004 |
| FR-007 | 修复证据 8 列出的四处漂移，并统一 README 与团队指南的仓库定位表述 | P1 | .template-source/contracts/harness-hardening-v1.md :: heading:现状证据 | AC-010 | 无 |
| FR-008 | 消除“说明文档复述可计数事实”这一漂移类别：README、团队指南、维护文档不再硬编码门禁数、阶段名单、投影根数量和上游 revision，改为链接权威资产；`ci-gate` 增加文档事实检查，发现已登记的复述模式或 README revision 与 lock 不一致时失败 | P1 | .template-source/process/template-engineering-overview.md :: heading:9. 权威阅读地图 | AC-011 | 无 |
| FR-009 | `package.json` 声明 `engines.node`，与 `.nvmrc`、验证合同的受支持范围一致；`ci-gate` 校验三者一致 | P2 | .template-source/process/github-workflows.md :: heading:模板源 | AC-012 | 无 |
| FR-010 | 技能注册表为每个技能声明 `invocation: implicit / explicit`。分两批设为 `explicit`：第一批是有仓外副作用、只用于模板维护或必须由用户发起的技能；第二批是只经生命周期编排器路由的阶段技能，须先通过路由测试（AC-024）才能切换。分类见执行计划 WP-07（Q-005 已决）。投影时生成 `disable-model-invocation: true` 与 Codex `agents/openai.yaml` 的 `allow_implicit_invocation: false`。`sync-skills --check` 校验两者与注册表一致 | P1 | .template-spec/agents/yss-skill-registry.yaml :: id:instance_distribution | AC-013, AC-014, AC-024 | 无 |
| FR-011 | 投影根收敛：`.agents/skills` 保持唯一权威目录；对原生读取 `.agents/skills` 的运行时删除对应投影根，保留的投影根一律使用符号链接；Windows 实例由 `sync-skills --copy` 生成副本并由 `--check` 校验哈希。`.codex/skills/product-design` 迁入权威目录或以登记的运行时独有技能保留 | P2 | .template-source/agents/skills-maintenance.md :: heading:权威内容与投影 | AC-015, AC-016 | Q-004 |
| FR-012 | 拆分 `CONTEXT.md`：业务统一语言留在 `CONTEXT.md`；流程术语迁入按需读取的 `.template-spec/process/process-glossary.md`；Grok、群人数等运行时平台细节迁入运行时 profile 文档。`AGENTS.md` 只保留入口、硬门禁和阅读地图 | P2 | .template-source/process/template-engineering-overview.md :: heading:2. 首次进入时读取什么 | AC-017 | 无 |
| FR-013 | 产出 Spec Delta 合并回基线的设计：Delta 批准并交付后，生成新的基线版本，记录父版本、Delta 引用、`inspect-plan-spec diff` 报告与批准记录摘要；旧版本不可变。本轮只交付设计与决策记录 | P2 | .template-spec/process/lifecycle-registry.yaml :: id:artifact.spec-delta | AC-018 | Q-006 |
| FR-014 | 产出治理核心分层设计：把条件门禁、摘要绑定批准、起草者与会签人分离、不可变交接包划为与技术栈无关的核心层，YSS Java / Vue3 + AntDV 专项作为上层 profile；列出现有资产到两层的归属表。本轮只交付设计 | P3 | .template-source/contracts/harness-hardening-v1.md :: heading:解决方案 | AC-019 | 无 |
| FR-015 | 新增只读 `scripts/harness-metrics`，输出 JSON：常驻读取字节、各运行时可隐式触发技能数与 description 字符数、各 Profile 技能数、投影根数量与副本数、`.template-spec/process` 文件数、`ci-gate` 与 `agent-hook` 耗时。阶段开始与结束各运行一次，结果存入维护命名空间 | P0 | .template-source/contracts/harness-hardening-v1.md :: heading:现状证据 | AC-020 | 无 |
| FR-016 | 本轮执行期间冻结技能退役与更名：除执行计划登记的变更外，不新增 `skill-migrations.md` 硬退役条目；确需例外时由维护者在计划中登记理由 | P1 | .template-spec/agents/skill-migrations.md :: heading:技能迁移说明 | AC-021 | 无 |
| FR-017 | 记录维护连续性决策：仓库归属（个人账号或组织）、第二维护者、`CODEOWNERS`、CLI 发行平台矩阵（含 Windows 稳定条件）。本轮交付决策记录，不要求完成迁移 | P3 | .template-source/contracts/harness-hardening-v1.md :: heading:现状证据 | AC-022 | Q-007 |

## 非功能需求

| ID | 需求 | 适用条件/负载 | 指标及单位 | 目标 | 确认状态 | 验证方法 | 来源引用 | 验收引用 | 未决项 |
|---|---|---|---|---|---|---|---|---|---|
| NFR-001 | `agent-hook` 不拖慢交互 | 单轮变更，含技能或注册表改动 | p95 墙钟秒 | ≤ 10 s | 候选 | 测试：`harness-metrics` 记录 20 次运行 | .template-source/contracts/harness-hardening-v1.md :: heading:解决方案 | AC-007 | Q-003 |
| NFR-002 | `ci-gate` 在托管 runner 上可用 | PR / MR 模式，典型单技能改动；GitHub 与 GitLab 分别统计 | 墙钟分钟 | 未知，基线测得后确认 | 候选 | 测试：每个平台连续 5 个 PR / MR 的耗时 | .template-source/process/github-workflows.md :: heading:模板源 | AC-004 | Q-008 |
| NFR-003 | 常驻上下文减少 | 模板源仓首次进入 | `AGENTS.md`+`CONTEXT.md`+`yss-product-lifecycle/SKILL.md` 字节 | 由 44,693 B 降至 ≤ 25,000 B | 候选 | 检查：`harness-metrics` | .template-source/contracts/harness-hardening-v1.md :: heading:现状证据 | AC-017 | 无 |
| NFR-004 | 隐式技能清单缩小 | 模板源仓与各 Profile | 可隐式触发技能的 description 字符数 | 模板源由 5,707 降至 ≤ 4,000；各 Profile 不高于基线的 70% | 候选 | 检查：`harness-metrics` | .template-source/contracts/harness-hardening-v1.md :: heading:现状证据 | AC-014 | 无 |
| NFR-005 | 加固不增加流程表面积 | 本轮全部变更 | `.template-spec/process` 文件数；新增流程术语数 | 文件数净增 ≤ 1（`process-glossary.md`）；`CONTEXT.md` 不新增流程术语 | 已确认 | 检查：阶段前后 `harness-metrics` 对比 | .template-source/contracts/harness-hardening-v1.md :: heading:文档状态与范围 | AC-020 | 无 |
| NFR-006 | 已有实例兼容 | 已按旧版本初始化的实例 | 升级失败数 | 0；变化经 `harness-upgrade` 计划展示 | 已确认 | 测试：现有升级场景测试与新增配置迁移场景 | .template-spec/process/harness-upgrade.md :: heading:计划、冲突与保护 | AC-002 | 无 |

## 验收标准

| ID | 需求引用 | 前提 | 触发 | 可观察结果 | 场景类型 | 未决项 |
|---|---|---|---|---|---|---|
| AC-001 | FR-001 | 模板源与三个 Profile 子模块为加固后版本 | 用 `yss init` 新建 spec / backend / frontend / design 实例 | 实例中不存在含 `danger-full-access` 或 `approval_policy = "never"` 的 `.codex/config.toml`；`ci-gate` 对模板源和子模块的配置安全检查通过 | 成功 | 无 |
| AC-002 | FR-001, NFR-006 | 存在按旧版本初始化、带高危配置的实例 | 执行 `yss` 升级计划 | 计划列出该配置为“建议移除”的受管变化并要求用户确认；用户拒绝时保留原文件且升级不失败 | 状态变化 | 无 |
| AC-003 | FR-002 | 某 PR 修改技能正文但未运行 `sync-skills` | 以 PR 目标分支完整提交 SHA 运行 `scripts/ci-gate --mode pr --base "$BASE_SHA"` | 在投影检查步骤失败，非零退出，输出步骤名、命令与修复命令 `scripts/sync-skills` | 拒绝 | 无 |
| AC-004 | FR-002, NFR-002 | 干净的主分支 | 运行 `scripts/ci-gate --mode push` | 全部步骤通过，零退出；报告写在仓外维护目录，仓内无新增文件 | 成功 | 无 |
| AC-005 | FR-003 | 两个平台的适配器已合入 | 在 GitHub 开 PR、在 GitLab 开 MR | 两边都出现名为 `template-gate` 的检查，日志显示只调用了 `scripts/ci-setup` 与 `scripts/ci-gate`；故意制造 AC-003 的错误时两边都失败 | 成功 / 拒绝 | 无 |
| AC-006 | FR-004 | FR-002、FR-003 已合入 | 阅读 `github-workflows.md` | 文中不再出现“已移除”“不再自动运行”；`template-gate` 登记为 PR 必需检查；发布流程描述保持不变 | 状态变化 | 无 |
| AC-007 | FR-005, NFR-001 | Claude Code 或 Codex 会话修改了 `skills-lock.json` 但未同步 | agent 尝试结束本轮 | hook 阻止结束，提示运行的命令；修复后再次结束成功；20 次测量 p95 不超过 NFR-001 目标 | 拒绝 / 恢复 | Q-003 |
| AC-008 | FR-005 | 本轮只修改了 `docs/` 下普通文档 | agent 结束本轮 | hook 在 1 秒内成功，不运行任何检查脚本 | 边界 | 无 |
| AC-009 | FR-006 | 加固后的模板源 | 在 Claude Code 中打开仓库并列出可用技能 | `CLAUDE.md` 导入 `AGENTS.md`；`.claude/skills` 下技能与 `.agents/skills` 一致；`sync-skills --check` 覆盖该根 | 成功 | Q-004 |
| AC-010 | FR-007 | 加固后的文档 | 检索四处漂移文本 | 团队指南不再出现“21 个门禁”和“机会与 Discovery”；README 不含硬编码 revision；“六个共享投影根”“四条正交轴”已与实际一致 | 成功 | 无 |
| AC-011 | FR-008 | 有人在 README 写入与 lock 不同的 revision，或在说明文档写入已登记的复述模式 | 运行 `ci-gate` | 文档事实检查失败，指出文件、行号和应链接的权威资产 | 拒绝 | 无 |
| AC-012 | FR-009 | `package.json` 的 `engines.node` 与 `.nvmrc` 不一致 | 运行 `ci-gate` | 失败并指出不一致的两处 | 拒绝 | 无 |
| AC-013 | FR-010 | 注册表把某技能标为 `explicit`，但投影中缺 `disable-model-invocation: true` | 运行 `sync-skills --check` | 检查失败并指出技能名 | 拒绝 | 无 |
| AC-014 | FR-010, NFR-004 | 完成 `invocation` 分类 | 运行 `harness-metrics` | 模板源与各 Profile 的隐式 description 字符数达到 NFR-004 目标；未达标时记录差距和原因，不得调高目标后宣称完成 | 成功 / 边界 | 无 |
| AC-015 | FR-011 | 收敛后的投影根 | 运行 `sync-skills --check` 与 `harness-metrics` | 完整副本数为 0（Windows 副本模式除外）；被删除的投影根不再出现在注册表、lock 与 bundle 中 | 成功 | Q-004 |
| AC-016 | FR-011 | Windows 环境实例 | 运行 `sync-skills --copy` 后再运行 `--check` | 生成副本并校验哈希通过；修改任一副本后 `--check` 失败 | 恢复 / 拒绝 | 无 |
| AC-017 | FR-012, NFR-003 | 拆分完成 | 运行 `harness-metrics` 并检索 `CONTEXT.md` | 常驻字节达到 NFR-003 目标；`CONTEXT.md` 不含流程术语和运行时平台细节；原术语在 `process-glossary.md` 中可找到，且原有链接无断链 | 成功 | 无 |
| AC-018 | FR-013 | 阶段 2 出口已通过，WP-10 设计文档已提交 | 维护者审阅设计文档 | 文档给出合并规则、版本血缘字段、冲突与回退处理，以及与 `spec-baseline.md` 现有不可变规则的关系；维护者签署决策记录 | 成功 | Q-006 |
| AC-019 | FR-014 | 阶段 2 出口已通过，WP-11 设计文档已提交 | 维护者审阅设计文档 | 归属表覆盖 `lifecycle-registry.yaml`、批准记录 schema、交接包、技能注册表和 YSS 专项技能；每项标明核心层或 profile 层 | 成功 | 无 |
| AC-020 | FR-015, NFR-005 | 每个阶段开始与结束 | 运行 `harness-metrics` | 产出同一 schema 的 JSON，存入 `maintenance:` 命名空间并绑定摘要；阶段对比显示 `.template-spec/process` 文件数净增不超过 1 | 成功 | 无 |
| AC-021 | FR-016 | 执行期间 | 检查 `skill-migrations.md` 的新增条目 | 每条新增条目都能对应执行计划中的工作包编号或登记的例外 | 边界 | 无 |
| AC-023 | FR-003 | 同一提交同时推送到 GitHub 与 GitLab | 两个平台各运行一次 `template-gate` | 两份报告的步骤名单、各步命令与退出码一致；GitLab runner 无法拉取所需子模块时检查失败并说明原因，不得跳过该步骤后报告通过 | 成功 / 拒绝 | 无 |
| AC-024 | FR-010 | 第二批阶段技能已在注册表标为 `explicit`，但尚未切换投影 | 在 Claude Code 与 Codex 中各走一次需要路由到这些技能的生命周期场景 | 编排器能加载被路由的技能；任一运行时加载失败时，该技能保持 `implicit`，并在 WP-07 记录原因 | 成功 / 拒绝 | 无 |
| AC-022 | FR-017 | WP-11 已提交决策草案 | 维护者完成决策 | 决策记录写明仓库归属、第二维护者、`CODEOWNERS` 范围与 CLI 平台矩阵；未决定的项保留为未决项并有时点 | 成功 | Q-007 |

## 非目标范围

- 不重写生命周期注册表的阶段、门禁或工作单元结构；不新增阶段或门禁。
- 不改变批准记录 schema、交接包格式和数字人会签政策。
- 不在本轮实现 Spec Delta 合并回基线和治理核心拆包（FR-013、FR-014 只交付设计）。
- 不激活选择性 gate policy；`legacy-full` 资格工作按原合同继续，`ci-gate` 不依赖其激活。
- 不删除或合并 YSS 专项后端 / 前端技能；技能数量只通过 `invocation` 分类和投影收敛降低“可隐式触发”的规模。
- 不迁移仓库托管位置；FR-017 只做决策。

## 风险

| 风险 | 影响 | 应对 | 责任人 | 时点 |
|---|---|---|---|---|
| `verify-template-candidate` 在托管 runner 上耗时过长或依赖本机 CLI 二进制 | PR 等待过久，维护者绕过检查 | 先以 fast 子集作为必需检查，candidate 作为非阻断检查；按 NFR-002 基线再决定 | 维护者 | 阶段 1 结束 |
| hook 误阻断 | agent 无法结束会话，影响日常使用 | hook 只做路径相关的快速检查；提供 `YSS_AGENT_HOOK=off` 单次绕过并记录到报告 | 维护者 | 阶段 1 |
| 删除投影根影响已有实例 | 旧实例找不到技能 | 只在模板源与 Profile 生效；实例经升级计划变更，用户可拒绝 | 维护者 | 阶段 2 |
| 拆分 `CONTEXT.md` 造成断链 | agent 读不到术语 | 迁移时保留锚点映射，`ci-gate` 链接检查覆盖 | 维护者 | 阶段 2 |
| 工作树当前有 20 余个未提交改动 | 加固改动与进行中工作混合 | 每个工作包在独立 worktree / 分支执行，从干净的提交起步 | 维护者 | 启动前 |

## 未决项

| ID | 问题 | 判断依据 | 责任人 | 解决时点 | 接收方 / 解决证据 |
|---|---|---|---|---|---|
| Q-001 | CI 托管平台 | **已决（2026-10-10）**：GitHub 与 GitLab 都要 | 维护者 | 已解决 | FR-003、AC-005、AC-023；计划第 6 节 |
| Q-002 | 维护者本机的 Codex 高权限模式 | **已决（2026-10-10）**：仍需要，改放用户级配置；仓库内文件删除 | 维护者 | 已解决 | FR-001；计划第 6 节 |
| Q-003 | Codex hooks 当期支持的事件与阻断语义；Claude Code `Stop` hook 的阻断返回约定 | FR-005 接线方式；按实施当期官方文档核对 | 实施者 | WP-04 | WP-04 实施记录 |
| Q-004 | Codex、Cursor、Pi 当期是否都原生读取 `.agents/skills`、是否跟随符号链接；Claude Code 是否仍只读取 `.claude/skills` | FR-006、FR-011 中哪些投影根可删除 | 实施者 | WP-05 / WP-08 | 实施记录附官方文档链接与本机实测 |
| Q-005 | 哪些技能应为 `explicit` | **已决（2026-10-10）**：由实施者判断，分两批，第二批以路由测试为前提；分类见计划 WP-07 | 实施者 | 已解决 | FR-010、AC-024；计划 WP-07 |
| Q-006 | Spec Delta 合并是否在 `yss` CLI 中实现，还是作为脚本先行？ | 影响 FR-013 设计的落点与发布节奏 | 维护者 | WP-10 | 设计文档决策记录 |
| Q-007 | 是否迁入组织账号、谁是第二维护者、Windows 何时进入稳定发行 | 组织层决定，超出本仓范围 | 维护者 | WP-11 | 决策记录 |
| Q-008 | `ci-gate` 在 GitHub 与 GitLab runner 上的耗时目标 | 无基线前不承诺数值；WP-03 各平台记录 5 次耗时后确认目标并改为“已确认” | 维护者 | WP-03 完成时 | NFR-002 |
