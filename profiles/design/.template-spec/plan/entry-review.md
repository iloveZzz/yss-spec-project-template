# Plan → Spec 入口审阅

正式 Spec 起草之前必须通过 `node scripts/verify-plan-spec-entry <state.yaml>`；显式 `to-spec`、恢复、任务包派发和下一路由均不得绕过。Plan 不通过时可继续无依赖调研，不创建正式 Spec 草稿。此检查复用 `gate.plan-approved` 用户决定，不新增批准阶段，也不授权实现。

检查 ID 与条件门禁取自 `.template-spec/process/lifecycle-registry.yaml` 的 `stage.plan.spec_entry`。查询 Plan 或相关工作单元自动加载 `planning`、`grill_exit` 和全量检查，初始均为 `pending`。自动加载不代表勾选通过。

Plan 未决项的主动触发、事实 / 实验 / 专业问题分流、依赖分轮与纠正重开，统一执行原生主控 `orchestration-contract.yaml` 的 `planning.clarification_policy`。必须解决的需求、业务规则、范围或取舍决策直接调用 `grilling`，无需用户再次点名；调查、实际验证和专业审查以证据关闭，无依赖工作继续。

包内 `checks.grill_exit=passed` 表示澄清材料与前置条件就绪，包括逐项决策回复、问题解决证据和待最终确认的共同理解。它不代表最终共同理解已确认或 Plan 已批准；完整 `grill_exit` 由入口结合当前真实 `gate.plan-approved` 用户决定判定。关键问题不能凭口头同意关闭，`open` 项和未回流 runnable blocker 仍阻断。

## 有界专业审查

新执行使用原生主控 `orchestration-contract.yaml` 的 `planning.review_control`，checkpoint `plan_review_control` 持有 `bounded-plan-review-v1` 周期。轮次、无进展诊断、稳定问题和异常关闭只读取该事实源；角色表 `review-bundle.plan` 提供组合能力。业务边界先通过，决策包再核验承接，Plan 聚合门禁复用逐项专业结论，不另派第三项专业任务。七项入口核验批量执行，澄清、机器检查、只读诊断和外部强制审批各自留证。

主控先初始化当前 checkpoint 控制记录，再使用 `prepare-review-package --review-phase initial|rereview|exception` 预留尝试，`--dry-run` 只读。任务 `review_context.plan_review_binding` 与 review-bundle v2 的 `plan_review_binding` 关联同一周期、尝试、范围与检查；派发、结果、恢复和 Plan → Spec 共同核验。相同输入返回原任务，中断沿用原尝试，换任务、候选或摘要不重置额度。

固定业务候选及依据，进度、运行日志和原始回复另存。必要的专业会签状态回写先形成最终字节候选并在同一任务核验；业务边界 → 决策包 → bundle → Plan 审阅包 → 用户回复及聚合批准保持有向，任务或 bundle 不绑定消费它们的审阅包摘要。稳定问题缺解决证据时转主控诊断，真实缺陷继续阻断，用尽预算不批准或默认重新询问用户。

存量 `bundled-plan-review-v1` 与旧单项记录保留只读兼容；升级关联历史证据而不改写批准，未知历史次数不能按零重新开始，超限周期转诊断。新执行须当前协议，旧消费者提示升级。回退工具及策略时保留控制记录、历史证据和读取能力，并重新核验当前批准。

`plan-review-control init|adopt|dispatch|complete|diagnose` 使用同一 `--checkpoint <项目内.json>`；初始化和接入绑定快照或分类证据，实际派发传 `--task`，结果和诊断传 `--input`。`status`、`check` 和 `--dry-run` 只读。既有准备参数后增加 `prepare-review-package --review-phase initial --dry-run` 先检查，正式预留去掉 `--dry-run`；`rereview|exception --review-input <当前输入.json>` 仅接收 `target_finding_ids` 与 `resolution_evidence: [{ref,digest}]`。原始结果的 `check_results` 覆盖本轮范围，未受影响项复用原结果和当前依据，不补造尝试。两项内部检查均未命中时仍保留控制及当前 N/A 依据，核验完整 Plan、Context 和真实回复，不制造空 bundle。

## 持久化合同

新入口状态包含 `feature_id`、`plan_review_ref`、`plan_approval_ref`，当前 checkpoint 同时保存 `plan_review_control`；聚合批准引用也可由当前 `gates.gate.plan-approved.approval_ref` 提供。控制记录只由 checkpoint 持有，任务包和完成态 Workflow Execution Result 引用当前入口字段，不复制独立台账。使用当前 `plan_user_decision_ref` 或已核验有效的 `plan_continuation_ref` 证明既有批准延续，两种证明不得同时提供；不从历史阶段、路径或默认值推断。旧审阅包与独立审查记录继续可读；继续执行须受控接入历史并核验当前结论，不因格式升级要求重新确认。

`plan_review_ref` 指向 YAML / JSON：

- `schema_version: 1`、`kind: plan-entry-review`、`gate_id: gate.plan-approved`、与入口一致的 `feature_id`。
- 新审阅包登记 `review_protocol: bounded-plan-review-v1`；旧记录保留原字节，接入新执行前完成受控历史登记。
- `plan_ref`：本次 Plan 正文；`context_reconciliation_ref`：本次已通过的 Context 调和记录。
- `basis`：非空 `{ref, digest}` 列表，digest 为实际文件字节的 `sha256:` 摘要。必须包含 Plan 正文、根 `CONTEXT.md`、生命周期注册表、Context 调和记录及各检查和门禁引用的文件。远程事实先保存可追溯证据快照。
- `checks`：注册表要求的全部检查 ID，每项包含 `status: pending | passed` 和非空 `evidence_refs`，引用 `basis`。必需检查不接受 `not-applicable`。缺项、未知项、pending 均阻断。
- `open_items`：显式数组，空数组代表无未决项。每项有 `id`、`critical`、`runnable_blocker`、`status` 和 `evidence_refs`。影响业务边界、关键规则或 MVP 的问题属于 critical。`resolved` 须有解决证据；仅非关键、非可执行阻塞项可 `deferred`，并填写 `noncritical_reason`、`owner`、`resolution_point`、`downstream_recipient`。延期内容随整个审阅包展示并取得用户确认。
- `impacts`：显式评估 `domain_strategy`（领域边界、词汇、协作或核心规则影响）和 `stage_decision`（需要稳定阶段决策合同）。证据和判断必须呈现给用户；缺值不解释为 false。
- `internal_checks`：注册表 `check_impacts` 内部专业审查全部逐项记录。命中项须 `status: approved`、`approval_ref`、`subject_ref`、`approval_scope`、`evidence_refs`，会签记录及对应资产均加入 `basis`；未命中项须 `status: not-applicable`、`reason`、`evidence_refs`。首轮命中项共用一个 `kind: review-bundle` 文件；定向复审只包含本轮受影响检查，其他项继续引用原轮已登记且当前的结论。每个 bundle 绑定该轮唯一任务、session 和独立实例；阶段决策检查的上游依赖必须批准，不能用 N/A 跳过。

`plan_approval_ref` 指向独立的 `gate.plan-approved` 聚合批准记录，绑定最终审阅包字节、当前范围、依据、真实用户回复和独立身份。存在命中检查时，`review_bundle_ref` 引用最终有效轮次的 bundle，角色、运行时、实例和 session 完全一致，并沿用最终组合任务，不创建新尝试或第三项专业审查；未受影响项同时保留原批准引用及当前依据。两项检查均不命中时不得制造空 bundle。聚合记录复用专业结论并核验真实回复，不消耗新专业轮次。

先固定完整审阅包及依据，展示目标、MVP、非目标、关键规则、验收例子、逐项未决结论和解决证据、剩余不确定性、范围、风险、延期、N/A 理由和进入 Spec 的动作，再合并取得最终共同理解与 Plan 批准的一次真实用户回复。中间各轮仍保留原始决策回复，已有且未变化的确认直接复用；最终回复前不得宣布共同理解已确认或 Plan 已批准。

`plan_user_decision_ref` 采用 `.template-spec/process/schemas/user-decision.schema.json`：边界为 `gate.plan-approved`，subject 为当前 `plan_review_ref`，scope 包含当前 `feature_id`。回复与批准记录单独保存，不回写审阅包或其 `basis`，也不在取得回复后回写 Plan 中的批准状态，避免改变被批准摘要或形成摘要循环。不得将旧“继续”、数字人会签或合成测试回复当作本次批准。

审阅包、注册表、Plan、词汇、依据或批准来源变化均要求重新校验；优先核验既有确认及批准延续，未知影响先调查，实质决定变化或现有证明失效时重新展示并取得当前确认。摘要漂移不能直接沿用旧包批准。检查器保证结构、引用、摘要和回复绑定，不证明业务事实或身份来源绝对真实；主控仍须按证据核查影响面，不能为了放行而填 false 或空问题列表。
