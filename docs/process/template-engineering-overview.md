# YSS 模板工程说明

## 1. 工程定位

YSS 模板工程是一套可版本化的研发治理系统。它用仓库身份、生命周期、条件门禁、工程契约、Agent skills 和可读证据，把产品研发从需求澄清连接到实现、审查、发布与复盘。

本仓默认是研发管理仓库，不是前端或后端运行时工程。它维护可复用的流程规则、文档模板、技能、验证脚本和分发契约；运行时代码默认位于已登记的独立实现仓库。

## 2. 首次进入时读取什么

按以下顺序建立上下文：

1. 读取根目录 `yss-project.yaml`，确认 `repository_mode`。
2. 读取 `AGENTS.md`，取得当前仓库的入口规则、硬门禁和禁止事项。
3. 读取 `CONTEXT.md`，统一领域与流程语言。
4. 按任务读取生命周期注册表、裁剪规则、技能注册表和数字人角色注册表。

完成标准：仓库身份合法，任务属于模板维护还是产品研发已经明确，影响面和下一工作单元可以由权威资产解释。

## 3. 两种仓库身份

| 身份 | 用途 | 允许的主要工作 | 边界 |
|---|---|---|---|
| `template-source` | 维护通用模板与治理规则 | 更新单一事实来源、同步技能投影、构建 CLI 快照、验证与审查 | 不生成具体产品的 Spec、原型、OpenAPI 或垂直切片 Ticket |
| `project-instance` | 承载具体产品或模块的研发管理资产 | 执行 Discovery、Spec、设计、工程契约、Ticket、实现、验证和发布流程 | 不反向成为通用模板的权威来源 |

身份只由 `yss-project.yaml` 声明。目录结构、Git remote 和占位符都不能替代该清单。

## 4. Harness 产品线

模板工程按研发责任边界拆成三个互不混用的 Harness 产品：

| 产品线 | 模板源 | 实例化 CLI | 生命周期边界 |
|---|---|---|---|
| 全产品生命周期 | `yss-spec-project-template` | `create-yss-spec` | 从 Discovery 到发布与复盘 |
| DDD 战略设计交接 | `yss-harness-design-agent` | `create-yss-harness-design` | 从机会、需求和战略设计到 Strategic Design Handoff |
| 开发落地 | `yss-harness-dev-agent` | `create-yss-harness-dev` | 从已批准 Spec 或战略设计交接包到 Tactical Design、Slice Contract、实现与验证 |

每条产品线使用独立的 profile、metadata 和固定模板 commit。CLI 之间遇到其他产品线的 metadata 时必须 fail closed，不能自动接管。

## 5. 控制平面

### 5.1 生命周期

`docs/process/lifecycle-registry.yaml` 是阶段、门禁、产物、工作单元、证据和稳定 ID 的结构事实源。`docs/process/harness-process-tailoring.md` 决定任务从哪个可信阶段进入，以及哪些条件门禁可以记录为 `not-applicable`。

生命周期编排器只推进第一个未阻塞工作单元。文件存在不等于产物已批准；完成结论必须同时具备内容、审查结论、上游新鲜度和可读取证据。

### 5.2 技能供应链

`.agents/skills` 是跨 Agent 共享技能的权威内容。`.claude/skills`、`.codex/skills`、`.cursor/skills`、`.pi/skills`、`.qoder/skills` 和 `.trae/skills` 是生成投影。

`docs/agents/yss-skill-registry.yaml` 管理技能分层、成熟度、别名和运行时发现；`skills-lock.json` 管理来源、版本、hash 与投影完整性。修改共享技能后必须同步投影并更新 lock，不能分别编辑平台副本。

### 5.3 数字人协作

`docs/agents/digital-human-roles.yaml` 定义数字人角色、运行时绑定、阶段协作组和会签策略。角色叠加在生命周期编排器上，不形成第二套生命周期；实现者与独立审查者必须是不同实例。

正式派发使用结构化任务包，任务包声明角色、运行时、合同、允许写路径、预期证据和汇合条件。共享工作区不替代写入边界。

## 6. 模板源与实例分发边界

模板实例分发面包含根规则、`CONTEXT.md`、共享 skills、`docs/` 中的实例流程资产和共享验证脚本。CLI 从固定模板 commit 构建 bundled snapshot，并在 metadata 中保存模板身份和版本。

`.template-source/` 是模板源治理区，保存维护证据、研究记录、源仓 ADR、跨仓契约、发布路线和模板源 Wiki。该目录不进入 `project-instance`，避免把模板维护历史误当成产品研发资产。

## 7. 模板维护工作流

1. **分级**：根据 `docs/process/maintenance-intensity.yaml` 计算 L1、L2 或 L3；未知 trigger 先更新策略。
2. **更新权威资产**：修改对应的单一事实来源，避免在说明文档中复制规则。
3. **生成投影**：涉及 skills 时同步 Agent roots 和 `skills-lock.json`；涉及生命周期结构时同步派生视图；涉及实例分发时构建固定 commit 的 CLI 快照。
4. **Fresh verification**：实现内循环执行 `scripts/verify-template-fast` 并默认停在 `implementation-ready`；准备审查时执行 candidate 核验和首次完整 `scripts/verify-template`，跨仓 CLI 还要执行固定 commit 的集成测试和打包校验。
5. **审查与发布**：L2 按需使用聚焦独立审查；L3 日常记录维护者自检，不冻结候选、不派发正式独立审查。正式发布前仍执行一次完整 `scripts/verify-template`。
6. **发布与回滚**：先发布或提交子仓，再更新父仓 gitlink；跨仓版本、验证命令、发布顺序和回滚点必须可以重建。

完成标准：当前强度要求的自检 / 审查证据通过，跨仓固定引用闭合，正式发布前完整 `scripts/verify-template` 通过，并且不存在未处理的 `violation`、`drift` 或 `new_impacts`。

## 8. 常用入口

| 目标 | 入口 |
|---|---|
| 判断仓库身份和下一阶段 | `yss-product-lifecycle` |
| 修改或退役共享 skill | `maintaining-skills` |
| 模板实现内循环 | `scripts/verify-template-fast` |
| 准备模板审查候选 | `scripts/verify-template-candidate`、`scripts/prepare-maintenance-review` |
| 校验根模板发布候选 | `scripts/verify-template` |
| 同步共享 skill 投影 | `scripts/sync-skills` |
| 校验 skills lock | `scripts/update-skill-lock --check` |
| 校验生命周期注册表 | `scripts/verify-lifecycle-registry` |
| 校验维护 checkpoint | `scripts/verify-maintenance-checkpoint <file>` |

## 9. 权威阅读地图

| 问题 | 权威资产 |
|---|---|
| 仓库是什么 | `yss-project.yaml`、`AGENTS.md` |
| 统一语言是什么 | `CONTEXT.md` |
| 阶段、门禁和工作单元是什么 | `docs/process/lifecycle-registry.yaml` |
| 如何裁剪流程和判定维护强度 | `docs/process/harness-process-tailoring.md`、`docs/process/maintenance-intensity.yaml` |
| skills 如何发现与校验 | `docs/agents/yss-skill-registry.yaml`、`skills-lock.json` |
| 数字人如何协作和会签 | `docs/agents/digital-human-roles.yaml` |
| 实现仓库如何接入 | `docs/process/implementation-repo-integration.md` |

说明文档负责导航和解释；当说明与权威资产冲突时，以表中权威资产为准，并修复说明文档的漂移。
