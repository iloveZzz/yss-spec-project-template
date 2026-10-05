---
name: yss-product-lifecycle
description: 编排 YSS 研发全生命周期；当阶段、产物、门禁或 Skill 路由不清晰时使用。
---

# YSS Product Lifecycle

合同阅读与更新：`scripts/contract view|render|check-views`；见 `.template-spec/process/contract-reading.md`。

五类机器资产默认 JSON；读写、迁移及恢复须遵循 `.template-spec/process/structured-assets.md`。

文档/进度按 `document_writing` 调用 `i-have-adhd`，遵循 `.template-spec/process/document-writing.md`。

## 事实源

先读 `yss-project.yaml`、`AGENTS.md`、`CONTEXT.md` 和当前任务视图，按需读合同：

| 事实 | 权威来源 |
|---|---|
| 阶段、门禁、产物、工作单元、证据及 ID | `.template-spec/process/lifecycle-registry.yaml` |
| 执行、流转和授权合同 | `references/orchestration-contract.yaml` |
| Skill 身份、能力、依赖和路由 | `.template-spec/agents/yss-skill-registry.yaml` |
| 数字人角色、运行时和会签策略 | `.template-spec/agents/digital-human-roles.yaml` |
| 影响面、裁剪与维护强度 | `.template-spec/process/harness-process-tailoring.md`、`.template-source/process/maintenance-intensity.yaml` |

```bash
scripts/query-lifecycle-context --work-unit work-unit.plan-requirements --check-skills
```

`--include` 限合同顶层键。调用前按 [来源与补装](references/matt-yss-adapter.md) 预检，在既有授权内补装并重验。

按 `execution_efficiency` 复用入口、合并查询和未变资料，核验资产与门禁；见项目 `.template-spec/process/script-execution.md`。

## 入口与模式

1. 严格解析 `yss-project.yaml`，不得按目录、Git remote 或占位符猜仓库身份。
2. 判定影响面及最近可信阶段；完成须有内容、审查、新鲜上游和可读证据，文件存在不代表通过。
3. 按 `request_triage` 选 `route`、`orchestrate`、`resume`、`audit`；行动请求无需模式关键字，意图不明只读 `route`。模式、门禁及授权边界仍适用。
4. `project-instance` 按生命周期注册表推进；`template-source` 只走模板维护流程。

Plan 入口读 `.template-spec/plan/README.md`、`.template-spec/process/plan-migration.md`，核验战略输入与退出条件。关键未决项阻断 Spec；其余记责任人、时点和接收方。仅认 Plan，不解析旧阶段或自动沿用历史批准。

必须确认的未决项按 `planning.clarification_policy` 主动调用 `grilling`，见 [澄清](references/plan-requirements.md)。

分诊见 [协议](references/request-triage.md) 与 `--include request_triage`；先查证据，再问必要缺口。

## 不可越过的边界

### 仓库身份

`template-source` 不得生成产品 Spec、原型、OpenAPI 或垂直切片 Ticket；命中产品流程返回 `blocked: template-source-product-artifact-forbidden`。维护用 `maintaining-skills`。验证按根 `AGENTS.md` 的 profile；合并展示不裁剪检查。

### 流转与实现

不得越过命中的阶段、门禁、实现仓库准备或 Ticket 正式化。实现只接收绑定垂直切片、已批准且持久化、版本当前并通过完整 `ready-for-agent` 计算的合同；父 Ticket、`ready-for-human` 切片、`stale`、`drift`、`new_impacts`、`violation` 或缺失证据均阻断。实现仓库、脚手架、UI 还原、review input 和发布条件从对应合同子树查询，不在入口重复定义。

审查按 `gate_consolidation`、`review_input.rereview`；Plan 执行 `planning.review_control`，周期由 checkpoint `plan_review_control` 持有；工具和派发、消费、恢复、入口校验见 `.template-spec/plan/entry-review.md`。

职责及后端终点见 `execution_scopes`，恢复、编译、派发须复验。保留产品设计门禁，后端交付不等于业务完成或发布。

### 用户决定

按角色表 `user_decision_policy` 与 `references/user-decisions.md` 展示资产、范围、风险、后续动作，再取得提问者或指定生物人的原始回复。数字人、超时、默认项不得代答。先验 `continuation_ref`；未知先调查，实质变化或缺强制审批时重新决定。缺陷/缺证据阻断，建议记待办；合同、验证、外部授权仍适用。

### 外部副作用与 Git

生命周期批准、实现授权、泛泛意向不构成 Git 授权。按 `references/user-decisions.md` 整理明确动作与范围的真实回复，无需重填字段。commit、push、其他外部动作分别核验；来源不可读、撤回、越界则不执行。`git-submodule` 逐仓授权、非 detached HEAD、先子仓后父仓 gitlink。

## 有界编排循环

1. 从真实资产重建状态，查询 mode、stage、work-unit 及必要合同子树。
2. 核验影响面、上游新鲜度、门禁和阻塞，选择首个未阻塞单元；`not-applicable` 不作豁免。
3. 主控持有原生正式资产；专项按结构化任务包派发，只调用合同允许的 model-invoked skill。
4. 兼容入口 `to-spec`、`to-tickets`、`implement` 仅由用户显式调用。主控预检输入、路径、门禁；入口按 `matt_invocation_boundary` 写产物并回交验收，不批准或改变 Ticket 就绪状态。原生资产归主控。
5. 先逐项验收用户目标、遗漏、错误假设和未决问题，再验收 `Workflow Execution Result`：工作单元、合同、允许写路径、`context_reconciliation`、证据、实际验证、延期 seam、漂移和下一路由必须可核验。实现派发额外绑定当前 Slice Implementation Contract v3；其他阶段不得伪造该合同。
6. 按 `blocking_disposition` 自主处理阻塞；缺真实决定或新授权才展示资产后询问。独立工作继续，完成结论不新增暂停。

`project-instance` 批准或流转前按根 `AGENTS.md` 完成术语回写与 `context_reconciliation`；候选术语、错误路径、摘要漂移或冲突阻断。质量标准由 `engineering-baseline` 唯一定义，高风险反证按裁剪合同。

## 面向业务角色

澄清目标、流程、责任、规则、范围和验收例子。业务总览引用权威资产，展示状态、未决项、责任人和下一步，不复制正文或新增门禁。

Plan → Spec 写入前按 `.template-spec/plan/entry-review.md` 持久化审阅包，执行 `node scripts/verify-plan-spec-entry <state.yaml>`；缺项、过期或无真实回复阻断，独立调研继续。

`checks.grill_exit=passed` 仅准备就绪；共同理解与当前 Plan 合并真实确认后，入口判定完整退出。

## 结果与暂停

每轮返回/暂停按 `user_progress_report` 说明阶段及依据、结果、下一阶段/单元及条件、问题/阻塞、责任方、解除与复验、主控动作、用户决定。未知写“待核验”，负责人缺失写“未登记”；目标不代表批准，已授权修复继续。

按 `workflow_execution_result` 与 `references/state-model.md` 记录状态、证据新鲜度、阻塞、动作、路由、Ticket / Git checkpoint。

发送前核对状态、证据新鲜度、阻塞与结构化结果；见 [结果提示](references/orchestration.md#结果与友好提示)。会签保留门禁、角色/运行时、文件、推荐答案、恢复动作。恢复先验证；完成/合并/发布须同一候选通过适用审查和 fresh verification；发布须生物人决定。

Plan/Spec/Design 追踪见 `.template-spec/process/stage-tracking.md`。

澄清读 [对账](references/plan-requirements.md)，外部输入读 [问卷](references/external-input-questionnaire.md)。

Spec 起草业务票，Design 校准后正式化；无设计影响直接正式化，研发再细化 Slice。按 `.template-spec/process/business-tickets.md` 检查覆盖和批准；业务票不授予实现资格。

## 功能资产整理

资产整理及旧票迁移按 `.template-spec/process/feature-assets.md` 和显式计划保留状态、批准依据、原文，不推进阶段；被引用草稿按正式资产保留。

既有实例模板升级、旧布局迁移和升级恢复用 `yss-harness-upgrade`，遵循 `.template-spec/process/harness-upgrade.md`；不推进产品阶段或重写历史批准。
