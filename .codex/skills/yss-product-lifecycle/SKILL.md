---
name: yss-product-lifecycle
description: 编排 YSS 产品或模块从机会调研到 Spec、原型、技术契约、垂直切片实现、审查、发布和复盘；当阶段、产物、门禁或 YSS skill 不清晰时使用。
---

# YSS Product Lifecycle

生命周期单一主控：识别请求、仓库身份和最近可信阶段，计算可执行 frontier，派发并验收工作单元；业务设计、实现和独立审查交给专项 skill。

## 事实源与按需加载

先读 `yss-project.yaml`、`CONTEXT.md`、相关 ADR、父 Ticket/checkpoint 和当前资产，按需加载合同子树：

| 事实 | 权威来源 |
|---|---|
| 阶段、聚合门禁、内部检查、产物、工作单元、证据和稳定 ID | `docs/process/lifecycle-registry.yaml` |
| 执行模式、流转、readiness、暂停、结果和授权语义 | `references/orchestration-contract.yaml` |
| Skill 身份、capability、依赖和路由 | `docs/agents/yss-skill-registry.yaml` |
| 数字人角色、运行时和会签策略 | `docs/agents/digital-human-roles.yaml` |
| 影响面、裁剪和模板维护强度 | `docs/process/harness-process-tailoring.md`、`docs/process/maintenance-intensity.yaml` |

使用 `scripts/query-lifecycle-context` 获取确定性 JSON 投影，不要为普通路由整份读取编排合同：

```bash
scripts/query-lifecycle-context --mode route --stage stage.plan --work-unit work-unit.plan-requirements --include execution_efficiency
```

`--include` 接受编排合同的顶层键；非法模式、ID 或合同键必须失败。查询结果只是带摘要的权威事实投影，不成为新的事实源。解释性细节按需读取 `references/orchestration.md`、`references/state-model.md`、`references/artifact-dependencies.md`、`references/user-decisions.md` 和 `references/matt-yss-adapter.md`，达到最小充分证据后停止扩展上下文。

按 `execution_efficiency` 合并查询、复用未变资料并验证当前资产；产品流转不重跑模板套件。词汇对账、恢复核验及门禁不变，执行细节见 `references/orchestration.md`。

## 入口与模式

1. 严格解析 `yss-project.yaml`，不得按目录、Git remote 或占位符猜仓库身份。
2. 判定影响面和最近可信阶段；阶段完成必须同时满足内容、审查结论、上游新鲜度和可读证据，文件存在不代表通过。
3. 按合同 `request_triage` 选择 `route`、`orchestrate`、`resume`、`audit`；明确行动请求无需模式关键字，意图不明时只读 `route`。`modes`、门禁及授权边界仍适用。
4. `project-instance` 按生命周期注册表推进；`template-source` 只走模板维护流程。

Plan 入口读取 `docs/plan/README.md` 和 `docs/process/plan-migration.md`，按注册表的退出条件核查战略输入。关键未决项阻断进入 Spec；非关键细节须有责任人、解决时点和下游接收方。只使用 Plan 标识；旧阶段不提供兼容解析，历史批准不自动成为 Plan 批准。

理解、澄清与纠错见 [请求分诊协议](references/request-triage.md)；用 `scripts/query-lifecycle-context --include request_triage` 查询合同。先查上下文和证据，只问影响下一动作的缺口，不按问题长度追问。

## 不可越过的边界

### 仓库身份

`template-source` 不得生成产品 Spec、原型、OpenAPI 或垂直切片 Ticket；命中产品流程时返回 `blocked: template-source-product-artifact-forbidden`。模板维护使用 `maintaining-skills`，按 L1/L2/L3 留下对应证据。

### 流转与实现

不得越过命中的阶段、门禁、实现仓库准备或 Ticket 正式化。实现只接收绑定垂直切片、已批准且持久化、版本当前并通过完整 `ready-for-agent` 计算的合同；父 Ticket、`ready-for-human` 切片、`stale`、`drift`、`new_impacts`、`violation` 或缺失证据均阻断。实现仓库、脚手架、UI 还原、review input 和发布条件从对应合同子树查询，不在入口重复定义。

聚合批准见 `gate_consolidation`。

### 用户决定

命中 `docs/agents/digital-human-roles.yaml.user_decision_policy` 的关键决定，必须先展示当前资产、版本、变化、风险、推荐方案、批准范围和后续动作，再取得提问者或其明确指定生物人负责人的原始回复。数字人同意、超时、默认项或无反对意见不能代答；恢复前按 `references/user-decisions.md` 验证当前资产与原始回复绑定。

### 外部副作用与 Git

生命周期批准、实现授权和自然语言意向不构成结构化 Git 授权。commit、push、远端仓库创建、发布及其他运行时外部副作用分别检查明确动作、范围和可读授权引用；缺失时保持外部状态不变。`git-submodule` 还必须遵守逐仓授权、非 detached HEAD 和先子仓后父仓 gitlink 的顺序。

## 有界编排循环

1. 从真实资产重建当前状态，查询当前 mode、stage、work-unit 及必要合同子树。
2. 评估影响面、上游新鲜度、门禁和阻塞，选择第一个未阻塞工作单元；不把 `not-applicable` 当作豁免。
3. 原生工作单元由主控持有正式资产；专项工作通过结构化任务包派发，只调用编排合同允许的 model-invoked skill。
4. Matt 的 `grill-with-docs`、`to-spec`、`to-tickets`、`implement` 等仅为显式 user-invoked 兼容入口。主控不得自动调用它们或代替其创建正式资产；Matt 仅导航，不得写生命周期资产或改变门禁/Ticket 状态，任何写入前回交本编排器。
5. 先对照用户目标逐项验收，检查遗漏诉求、错误假设与尚未解决的问题，再验收 `Workflow Execution Result`：工作单元、合同、允许写路径、`context_reconciliation`、证据、实际验证、延期 seam、漂移和下一路由必须可核验。实现派发额外绑定当前 Slice Implementation Contract；其他阶段不得伪造该合同。
6. 在授权边界内继续下一工作单元；遇到人工决定、新授权、证据冲突、专项失败或合并/发布结论时暂停。暂停不得阻断无依赖的独立工作。

每个 `project-instance` 工作单元在申请批准或流转前，先把稳定术语回写到根目录唯一 `CONTEXT.md`，并生成通过校验的 `context_reconciliation`。候选术语、错误路径、摘要漂移或未决冲突必须阻断。质量标准只由 `engineering-baseline` 定义一次；高风险影响按裁剪合同补充反证和残余风险。

## 面向业务角色

默认使用业务语言推进：

`机会与目标 → 业务故事 → 责任与交接 → 规则、例子与疑问 → 可验收需求 → 页面验证 → 业务任务 → 交接研发`

按当前决策澄清目标、流程、责任、规则、最小范围和验收例子。可生成引用权威资产的“业务方案总览”，展示状态、未决项、责任人和下一步；不复制正文或新增门禁。

Plan → Spec（含正式草稿、恢复与显式 `to-spec`）写入前，按 `docs/plan/entry-review.md` 持久化审阅包并运行 `node scripts/verify-plan-spec-entry <state.yaml>`。检查默认 pending，缺项、过期或无真实回复即阻断；独立调研可继续。

## 结果与暂停

普通咨询直接回答，不创建流程产物；复杂请求简述目标与下一步。实际工作单元仍记录完整结果，按适用边界同步，对外仅展示当前决定所需信息。

工作单元结果至少包含：模式、仓库身份、当前阶段和工作单元、影响面、资产与门禁状态、证据、新鲜度、Ticket/垂直切片/合同状态、`ready-for-agent` 结论、阻塞项、本轮动作、下一工作单元、暂停或继续理由、Ticket 同步和 Git checkpoint 判断。

暂停会签时追加门禁 ID、`role_id`、`runtime_id`、会签文件路径、推荐答案和恢复动作；恢复前运行适用验证器。只有同一候选快照通过全部适用审查轴与 fresh verification，才能提出合并、发布或完成结论；发布仍须生物人决定。

专项合同加载索引见 `references/orchestration.md`。
