---
name: yss-product-lifecycle
description: 编排 YSS 研发全生命周期；当阶段、产物、门禁或 Skill 路由不清晰时使用。
---

# YSS Product Lifecycle

先按 `references/orchestration-contract.yaml.request_triage.delivery_path` 选择交付路径；`daily` 操作见 [普通任务交付](references/daily-delivery.md)。路径不是阶段、Ticket 状态或批准。

## 事实源

先读 `yss-project.yaml`、`AGENTS.md`、`CONTEXT.md`、当前任务及交付路径政策。只在当前 Profile 的政策已启用且固定 `yss` CLI 已支持 `route` / `verify-daily` 时进入 `daily`；旧 CLI、Profile 未启用或能力不可核验时明确 `daily unsupported`，不得按文字承诺放行。`governed` 再按当前工作单元读取以下事实源：

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

上例用于 `governed` 工作单元。`--include` 限合同顶层键；调用前按 [来源与补装](references/matt-yss-adapter.md) 预检，在既有授权内补装并重验。`daily` 从当前任务影响选择并核验 YSS 技能，不能因省略正式合同漏掉技术约束。

选择技能、查询阅读视图或复用资料与验证证据时，先读[查询与证据复用](references/conditional-guidance.md#查询与证据复用)。

## 入口与模式

1. 严格解析 `yss-project.yaml`，不得按目录、Git remote 或占位符猜仓库身份。
2. 判定影响面及最近可信阶段；完成须有内容、审查、新鲜上游和可读证据，文件存在不代表通过。
3. 按 `request_triage` 选 `route`、`orchestrate`、`resume`、`audit`；行动请求无需模式关键字，意图不明只读 `route`。模式、门禁及授权边界仍适用。
4. `project-instance` 按生命周期注册表推进；`template-source` 只走模板维护流程。

进入正式工作单元前先判交付路径。已合格 `daily` 以一张普通 Ticket / PR 承接范围、验收、路径、技能、实际测试和独立审查；不创建阶段 checkpoint、正式 Slice 合同、多级批准或 `ready-for-agent`，也不调用正式实现准入器来豁免缺项。当前任务已绑定正式阶段、checkpoint 或 Slice 时恢复 `governed`；无关功能资产不阻断新普通任务。缺事实先调查，发现新风险时停止受影响动作、保留已有证据并从最近可信资产升级。

只读咨询、状态和定位不创建 Ticket、checkpoint 或审批，不运行实现回归。行动从当前可信阶段选择缺失工作，复用当前批准资产、登记及工作单元；主链是导航，未来阶段产物不计作当前缺项。按影响面完成当前工作及直接 / 传递依赖的适用验证；Fresh Verification、证据复用和边界重验按裁剪合同执行。

必须确认的未决项按 `planning.clarification_policy` 主动调用 `grilling`，见 [澄清](references/plan-requirements.md)。

进入 Plan、起草正式资产、准备审查或业务票时，先读[正式资产与 Plan 入口](references/conditional-guidance.md#正式资产与-plan-入口)。

分诊见 [协议](references/request-triage.md) 与 `--include request_triage`；先查证据，再问必要缺口。

## 不可越过的边界

### 仓库身份

`template-source` 不得生成产品 Spec、原型、OpenAPI 或垂直切片 Ticket；命中产品流程返回 `blocked: template-source-product-artifact-forbidden`。维护用 `maintaining-skills`。验证按根 `AGENTS.md` 的 profile；合并展示不裁剪检查。

### 流转与实现

`governed` 不得越过命中的阶段、门禁、实现仓库准备或 Ticket 正式化。正式切片只接收绑定垂直切片、已批准且持久化、版本当前并通过完整 `ready-for-agent` 计算的合同；父 Ticket、`ready-for-human` 切片、`stale`、`drift`、`new_impacts`、`violation` 或缺失证据均阻断。实现仓库、脚手架、UI 还原、review input 和发布条件从对应合同子树查询，不在入口重复定义。普通路径的资格、测试、独立审查与证据失败同样阻断完成，不把 `daily` 用作正式合同降级旗标。

职责及后端终点见 `execution_scopes`，恢复、编译、派发须复验。保留产品设计门禁，后端交付不等于业务完成或发布。

选择推进里程碑或登记本地后端终点时，先读[推进目标与后端终点](references/conditional-guidance.md#推进目标与后端终点)。

### 用户决定

`governed` 按角色表 `user_decision_policy` 与 `references/user-decisions.md` 展示资产、范围、风险、后续动作，再取得提问者或指定生物人的原始回复。数字人、超时、默认项不得代答。先验 `continuation_ref`；未知先调查，实质变化或缺强制审批时重新决定。`daily` 使用已明确的任务授权，不再为普通实现创建阶段批准；外部动作、风险接受和项目明确的强制制度仍按原授权处理。缺陷/缺证据阻断，建议记待办。

### 外部副作用与 Git

生命周期批准、实现授权、泛泛意向不构成 Git 授权。按 `references/user-decisions.md` 整理明确动作与范围的真实回复，无需重填字段。commit、push、其他外部动作分别核验；来源不可读、撤回、越界则不执行。`git-submodule` 逐仓授权、非 detached HEAD、先子仓后父仓 gitlink。

## 有界编排循环

以下循环只适用于 `governed` 和模板维护。`daily` 按 [普通任务交付](references/daily-delivery.md) 直接推进一张任务记录，不伪装成正式工作单元结果。

开始编排、派发专项或接收 `Workflow Execution Result` 前，先读[编排派发与验收](references/conditional-guidance.md#编排派发与验收)，逐项核验用户目标和结果。缺真实决定或新授权才询问；独立的已授权工作继续。

`governed` 项目实例批准或流转前按根 `AGENTS.md` 完成术语回写与 `context_reconciliation`；候选术语、错误路径、摘要漂移或冲突阻断。`daily` 消费当前词汇和工程基线，词汇冲突先解决，不机械生成对账文件。质量标准由 `engineering-baseline` 唯一定义，高风险反证按裁剪合同。

## 结果与暂停

每轮返回/暂停按 `user_progress_report` 说明阶段及依据、结果、下一阶段/单元及条件、问题/阻塞、责任方、解除与复验、主控动作、用户决定。未知写“待核验”，负责人缺失写“未登记”；目标不代表批准，已授权修复继续。

记录执行结果、当前 Profile 职责完成、状态查询、恢复或导入批准 Spec 时，先读[结果记录与下游交接](references/conditional-guidance.md#结果记录与下游交接)。建议不授予批准或执行。

发送前核对状态、证据新鲜度、阻塞与结构化结果；见 [结果提示](references/orchestration.md#结果与友好提示)。会签保留门禁、角色/运行时、文件、推荐答案、恢复动作。恢复先验证；完成/合并/发布须同一候选通过适用审查和 fresh verification；发布须生物人决定。

## 条件维护与接入

整理功能资产、迁移旧票、安装升级或接管治理工程、补装资源、恢复事务、处理专职工程或独立脚手架时，先读[资产整理与工程接入](references/conditional-guidance.md#资产整理与工程接入)；保持当前状态、批准依据和实现范围。
