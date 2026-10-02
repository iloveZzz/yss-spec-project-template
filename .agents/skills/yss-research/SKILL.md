---
name: yss-research
description: "研究 YSS 技术与产品策略事实，统一发起竞品调研并组织证据、功能矩阵和深度报告；用于标准、第三方行为、业务约束和 research 兼容入口。"
---

# YSS Research

调查 YSS 决定所依赖的事实，输出可追溯证据和有边界的结论；不作出或批准下游产品、领域、架构或发布决定。

`research` 是已弃用的兼容别名，新资产和路由使用 `yss-research`。

文档输出时按 `lifecycle-document-output` 条件调用 `i-have-adhd`，先读 `.template-spec/process/document-writing.md` 的共用写法和研究指引；作用域仅限当前产物，派发时传递条件及引用。保持原证据结构、来源限定和校验要求。

## Profiles

- `technical-evidence`：标准、官方文档、源码、第三方 API、框架行为、协议和实现约束。决定性 Claim 必须追溯到一手来源。
- `strategy-evidence`：用户问题、业务约束、MVP / 非目标、成功标准、领域边界、核心业务规则和方案决策输入。允许直接经验与近一手证据，须写明限制。

竞品、定价、品类和市场定位研究由本技能统一接收，路由 `competitive-intelligence` 执行，本技能持有模式、研究证据包和结果汇总。竞品策略使用 `strategy-evidence`；其中技术能力和协议事实仍须按 `technical-evidence` 的一手来源要求审计。产品 UI 与流程摩擦扫描在平台技能可用时路由 `product-design:research`。本技能可以综合专项结果，不替代专项合同。

## Modes 与输出选择

- `quick`：普通探索的默认模式，返回聊天简报；竞品探索同时提供精简功能矩阵，除非用户明确只要报告或矩阵。用户未要求落盘时不创建文件。
- `evidence-audited`：深度、严格、可复现、可审计研究，以及直接用于持久化 Spec、领域策略、方案决策、OpenAPI、架构或其它生命周期批准输入的研究。竞品深度研究默认输出完整矩阵、深度报告和现有研究双文件。

开始检索前说明 profile、模式和输出选择。不要仅为提高严谨性把普通探索升级。用户明确只要矩阵或报告时遵从输出选择；选择阅读材料不免除审计模式的证据包。探索材料标明未审计，作为批准输入前须升级并完成审计。

竞品调研读取 [竞品分析合同](references/competitive-analysis.md)，复用 `.template-spec/plan/templates/competitive-matrix-template.md` 和 `.template-spec/plan/templates/competitive-analysis-template.md`。不新增 profile、模式、生命周期阶段或批准门禁。

## 来源政策

1. 从要支持的决定、读者、时间范围、边界和研究问题开始。
2. 先检索用户提供或已登记的材料，对内部与外部材料采用相同纳入 / 排除标准，记录排除和访问失败。
3. 技术 Claim 追溯到拥有该事实的官方规范、官方文档、源码或第一方 API。
4. 策略来源分类为 `primary`、`direct-experience`、`near-primary`、`secondary`、`lead-only`；访谈、Ticket、支持记录、带日期的评论、调查和可信行业报告须说明抽样与访问限制。
5. 无法追溯的转载、聚合摘要和 AI 生成总结只作线索，不支持发布结论。
6. 主动寻找反向信号和冲突证据，来源数量不代表频率或置信度。

## 委派

运行时支持后台 Agent 且资料可独立阅读时可以委派；否则在当前 Agent 研究。委派用于优化执行，不构成可信度证明。

只读分诊使用 task-package schema v2、`contract.kind: read-only-intake`、`Explorer`、已登记分诊工作单元和空写范围；使用 `scripts/prepare-read-only-intake`、`scripts/run-read-only-intake`，执行证据留在仓库外。无已执行命令时写 `verification_status: not-executed`。正式落盘前由所有者分析影响并派发正式任务包，详见 `.template-spec/process/subagent-collaboration.md`。

只读分诊的独立运行包继续作为证据来源，并由运行存储保护。使用 `scripts/runtime-store inspect` 定位运行，`export` 导出可独立核验的文件包；留存与恢复按 `.template-spec/process/runtime-storage.md` 执行。

生命周期派发遵守结构化任务包、写隔离、角色绑定与交接合同；接收所有者仍负责核验实质 Claim。

## 审计工作流

按 [证据合同](references/evidence-contract.md) 执行：

1. 预声明范围、来源类别、纳入 / 排除标准及已知访问限制。
2. 保存可复现 Search Log 和可独立定位的 Evidence Ledger。
3. 区分观察、推断、假设和决定。
4. 对每项决定性 Claim 审计来源与反向信号。
5. 缩窄部分支持的措辞；无支持的 Claim 标记 `needs-deeper-research`。
6. 保存相邻的 `<slug>-research-brief.md` 与 `<slug>-evidence.yaml` 并执行校验。

策略研究中决定用户问题、MVP / 非目标、领域边界、核心规则、成功标准、重要业务约束或方案决策基础的 Claim 全部审计；只可对明确标记为非决定性的背景抽样。

## 所有权与交付

研究结果是证据。候选术语交给 `domain-modeling`，产品机会、MVP 和方案建议交给 Plan / `yss-stage-decision` 所有者；生命周期编排器和指定 Reviewer 持有门禁状态。未经另一项已授权所有者工作单元，不修改 `CONTEXT.md`、Spec、领域策略、OpenAPI、架构、Ticket 状态或批准记录。

聊天简报包括范围、发现、来源、推断、置信度、反向信号、缺口及下一项决定。审计包从 [研究简报模板](assets/research-brief-template.md) 和 [证据模板](assets/evidence-template.yaml) 起草。竞品附属报告不能替代研究双文件。从仓库根运行：

```bash
node .agents/skills/yss-research/scripts/validate-research-package.mjs <slug>-research-brief.md <slug>-evidence.yaml
```

`template-source` 的可复用维护研究存于 `.template-source/evidence/maintenance/`；`project-instance` 沿项目研究 / 证据约定，并由消费生命周期资产绑定决定性输出。模板正式研究使用 `work-unit.maintenance-research`，按 `.template-spec/process/research-completion.md` 记录当前验证并收尾；只回传结论的分诊继续用 read-only-intake v2。

来源不可用或冲突时说明限制。普通缺口降低置信度；决定性 Claim 的来源缺失或不匹配时不能视为已确立。研究完成不授予维护或产品批准。
