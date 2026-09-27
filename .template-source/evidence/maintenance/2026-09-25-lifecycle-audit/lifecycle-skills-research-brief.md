# 研发规格流程主控、阶段模板与同类技能审计

研究日期：2026-09-25。状态：`template-source` 维护研究；本报告不修改生命周期合同、不批准路线或发布。证据台账见相邻的 `lifecycle-skills-evidence.yaml`。

## Research Scope

- Profile：`strategy-evidence`；Mode：`evidence-audited`。竞品事实由 `competitive-intelligence` 路由，`yss-research` 汇总本地合同与外部事实。
- 决策：现行主控 Skill、Plan/Spec/Design/工程/Ticket 模板是否适合继续使用，以及下轮模板维护先验证什么。
- 读者和期限：模板维护者；未来 1–2 个维护迭代。
- 纳入：本仓权威 YAML、Skill、模板与实际校验脚本；截至访问日可读取的同类产品官方文档、源码或发行说明。先复核本仓 [2026-09-11 调研](../2026-09-11-oss-landscape/oss-landscape-research-brief.md)，再用当前来源刷新与本题相关的机制。
- 排除：搜索摘要、营销排名、无法追溯的二手比较、竞品功能的未实测性能排序。未安装竞品做同题实验，未访谈使用者；主分支文档可能领先稳定发行版。

## Executive Read

**结论：流程骨架合理，近期更值得修合同漂移与降低可见操作成本。** 当前设计有单一主控、注册表事实源、条件门禁、批准版本绑定、阶段工作追踪及独立审查边界；`Plan → Spec → Design → 工程契约 → Ticket` 的顺序与多仓职责相符。结构校验与定向场景检查通过。这是静态合同和脚本证据，不等于产品实例端到端成功。`claim-local-structure`

发现五个具体维护点：原型产物触发语句引用已废弃门禁 ID；原型路由仍指定 Evidence schema v3，而专项 Skill 与模板已经是 v4；模板维护 L3 的完成文字仍要求旧的完整 RED/GREEN/REFACTOR 与正式独立审查；切片 Ticket 的后端规则把 DDD 假设写入了同样可用于 `layered-mvc` 的模板；阶段决策 Skill 有一处不存在的用户决定协议路径。`claim-dead-ids`、`claim-prototype-version`、`claim-intensity-drift`、`claim-mvc-leak`、`claim-decision-path`

同类产品已经提供阶段状态、恢复、快速规格、跨仓规划和技能整合。YSS 可验证的机会是：在保持当前批准和证据边界的前提下，把“当前阻塞、依据版本、责任人、下一动作”变成容易执行的入口，并以真实跨仓切片测量价值。不能据文档声称 YSS 独有这些能力或效率更高。`claim-recovery-competition`、`claim-lightweight-competition`、`claim-crossrepo-competition`、`claim-priority`

## Findings

### 1. 本地合同与模板

| 环节 | 已核实的设计 | 审计判断 |
|---|---|---|
| 主控与事实源 | `yss-product-lifecycle` 是路由入口；注册表有 8 阶段、7 个聚合门禁、14 个内部检查、23 个工作单元；编排合同记录 Skill 路由和恢复规则 | 责任分离清楚；不宜再加一套生命周期状态。`claim-local-structure` |
| Plan → Spec | Plan 模板用引用组织战略资产；入口审阅绑定 Plan、词汇、检查、摘要和真实用户决定；定向场景通过 | 严格的失败关闭有依据。现有说明和脚本提供校验，没有面向维护者的审阅包准备命令；手填大量摘要与证据字段的操作成本需实测，不能从字段数推断实际耗时。`claim-plan-entry-cost` |
| Product Design | 产物触发文字仍为 `gate.prototype-reviewed`、`gate.user-confirmation`，两者已列入 `deprecated_ids`；当前正式边界是 `gate.product-design-approved`，内部检查是 `check.prototype-reviewed`、`check.prototype-verified` | 阅读视图也继承该文字；`verify-lifecycle-registry` 当前通过，因为校验器只解析结构化引用，不扫描自然语言触发项。`claim-dead-ids` |
| 原型证据 | 编排合同的 `work-unit.prototype-design.evidence_schema_version` 为 3；`yss-prototype-stage`、Design README 和证据模板指定 v4 | 主控路由与专项产物版本不一致，恢复或派发时可能给出错误合同版本；尚未用项目实例复现实际拒收。`claim-prototype-version` |
| 模板维护 | 注册表工作单元写 L3 完整 RED/GREEN/REFACTOR、正式独立审查；现行裁剪合同明确 L3 日常只需维护者自检和 Fresh Verification，正式发布另跑完整套件 | 权威文字冲突会误导主控。注册表语义摘要锁定已发布 ID，不能把修订当普通文本改动；需选择版本化迁移或受控语义勘误。`claim-intensity-drift` |
| Ticket → 实现 | 切片 Ticket 默认保留冻结版本及合同引用，有利于防止执行状态污染需求基线 | “后端阻断规则”强制 Domain、GatewayImpl、MapStruct 等，和 `layered-mvc` 技术设计明确“不要求 DDD Gateway”冲突。应改为按已批准架构分支填充或引用对应 Skill 合同。`claim-mvc-leak` |
| 阶段决策 Skill | `yss-stage-decision` 写到 `.template-spec/process/lifecycle/references/user-decisions.md` | 本仓不存在该路径；当前协议在 `.agents/skills/yss-product-lifecycle/references/user-decisions.md`。这是可直接修复的阅读入口错误。`claim-decision-path` |

### 2. 同类产品与技能机制

| 产品 | 官方资料中的机制 | 对 YSS 的启发与边界 |
|---|---|---|
| [Spec Kit 工作流](https://github.github.com/spec-kit/reference/workflows.html) | gate、`state.json`/`inputs.json`/`log.jsonl`、失败或暂停后精确恢复；另有 [Analyze/Converge](https://github.github.com/spec-kit/reference/agentic-sdd.html) 回查规格与实现 | 状态与恢复已是竞争基线。其 shell 无能力沙箱，非空默认 verdict 能自动决定 gate；YSS 的原始用户回复边界仍需保留。`claim-recovery-competition` |
| [OpenSpec Stores beta](https://github.com/Fission-AI/OpenSpec/blob/main/docs/stores-beta/user-guide.md) | 独立规划仓与代码仓只读 references；各仓保留自己的 change/任务/审查 | 共享规划已有直接供给。Stores 不自动同步 Git，也不按仓分派共享任务；YSS 应验证接收版本与联合验收，而非声称“首个跨仓规格”。`claim-crossrepo-competition` |
| [Kiro Specs](https://kiro.dev/docs/specs/) | 标准 Requirements/Design/Tasks 审阅流程；[Quick Spec](https://kiro.dev/docs/specs/quick-spec/)以相同工件格式跳过阶段审批 | 条件化流程深度值得比较。Quick Spec 的跳过方式不能直接用于 YSS 已触发门禁。`claim-lightweight-competition` |
| [BMAD v6.11.0/6.12.0](https://github.com/bmad-code-org/BMAD-METHOD/releases) | 将研究/审查技能并为带模式的能力，旧 ID 通过 shim 兼容；实现链收敛，v6.12.0 按调查结果决定流程深度 | 有证据支持清理重复 Skill 入口和保留迁移桥；不能仅凭 Skill 数量判断好坏。主分支 workflow map 与发行说明有漂移，采用前需固定版本。`claim-lightweight-competition` |
| [AWS AI-DLC](https://github.com/awslabs/aidlc-workflows/blob/main/docs/harness-engineering/00-overview.md) | 薄 SKILL.md 转发；确定性引擎与编译图决定 next；[状态/审计](https://github.com/awslabs/aidlc-workflows/blob/main/docs/guide/10-state-and-audit.md)包含等待审批、修订和跳过 | YSS 的“Skill 薄入口＋查询合同”方向合理；诊断和恢复体验需实测，不能据文档认定竞品的安全性或成功率。`claim-recovery-competition` |
| [GitHub Agentic Workflows SpecOps](https://github.github.com/gh-aw/patterns/spec-ops/) | 规格 PR 合并后触发消费者仓操作；[safe outputs](https://github.github.com/gh-aw/reference/safe-outputs/)隔离写权限 | 可借鉴规格先审、消费者后传播和执行权限边界；仓库写入许可不等于业务批准或跨团队接收。`claim-crossrepo-competition` |
| [OpenSpec Verify](https://github.com/Fission-AI/OpenSpec/blob/main/docs/workflows.md) | 检查完整性、正确性和一致性，但不阻止 archive，未完成任务只警告 | YSS 当前失败关闭是明确取舍，需在试点中度量其价值与额外人工时间。`claim-gate-boundary` |

### 3. 改进顺序（建议，未经批准）

1. **P0：修合同漂移。** 先修不存在的协议路径；对齐原型证据 v4，补派发/恢复场景；列出废弃 ID 正文引用和模板维护规则冲突，按稳定 ID 策略设计受控迁移；给 `artifact.trigger` 中的 `gate.*` / `check.*` 添加静态引用核验。为 DDD/MVC 两条 Ticket 内容设条件或改成权威 Skill 引用。用负例证明新检查能抓到这些错误。`claim-priority`
2. **P1：降低操作成本。** 为 Plan → Spec 审阅包提供只读 `check`、预填候选的 `prepare`/`diff`，仍由用户决定、仍核验原字节与当前上下文；用“有阻塞的正常功能”和“恢复后上游变化”两种场景测试。此项收益只是待验证假设。`claim-plan-entry-cost`、`claim-priority`
3. **P1：跨仓接收试点。** 用一个真实 Java API + Vue 页面切片注入旧 Spec、错包、漏验收和旧批准，记录拒收准确性、恢复步骤、人工分钟和端到端耗时；和最小流程基线对比。既有 2026-09-11 调研同样推荐此方向，本轮没有新的客户需求频率或收益数字。`claim-crossrepo-competition`、`claim-priority`

## Counter-Signals

- 注册表校验和六类生命周期场景均通过，因此当前发现主要是权威文字/模板适配缺口；不能写成“流程整体不可用”。结构校验通过也不能证明文字引用正确。`claim-dead-ids`
- YSS 已有影响面裁剪、条件门禁和阶段追踪；竞品 Quick 路线不是无条件新增 YSS 快速模式的证据。`claim-lightweight-competition`
- BMAD、AI-DLC、Spec Kit 都有恢复或角色/Skill 治理；“YSS 独有状态机/多 Agent”没有证据。`claim-recovery-competition`
- OpenSpec 已做跨仓共享，GitHub SpecOps 已做跨仓传播；机会只在具体接收责任、批准版本及实测价值。`claim-crossrepo-competition`

## Source Map

本地一手材料：生命周期注册表、编排合同、阶段模板、技术设计 Skill、维护裁剪合同、验证器源码及本轮定向命令。外部一手材料：Spec Kit、OpenSpec、Kiro、BMAD、AI-DLC、GitHub Agentic Workflows 官方文档/发行说明。每条证据的定位、日期、反证和限定写在相邻证据台账；2026-09-11 旧研究只用于筛选与比较，不替代当前来源。

## Decision Handoff

下游 owner：`yss-product-lifecycle` 与模板维护者；`decision_ref=null`。本报告不改 `CONTEXT.md`、注册表、Skill、模板、Ticket、批准记录或发布状态。当前仓库为 `template-source`，产品 Spec/原型/切片不适用。若进入实施，先按 `maintenance-intensity.yaml` 重新分级；前述 P0 触及生命周期语义，不能沿用本次只读审计的证据作为变更验收。

本轮实际验证：`scripts/verify-lifecycle-registry`、`scripts/verify-lifecycle-scenarios`、`scripts/verify-lifecycle-context-query-scenarios`、`node scripts/verify-plan-spec-entry-scenarios` 均退出 0。未运行完整 `scripts/verify-template`，未执行竞品安装/同题实测。

## Evidence Limitations

外部文档按 2026-09-25 访问，部分是可变主分支或 beta；发布包行为需按固定版本复核。没有客户访谈、真实采用统计、性能或成本基准。改进顺序是基于当前缺口与可试验性的推论，不能作为市场需求、效率收益或发布就绪证明。审计仅覆盖本题关键模板与路由，不等于全仓所有 Skill 的逐项语义审查。
