# Plan → Spec 入口审阅

正式 Spec 起草之前必须通过 `node scripts/verify-plan-spec-entry <state.yaml>`；显式 `to-spec`、恢复、任务包派发和下一路由均不得绕过。Plan 不通过时可继续无依赖调研，不创建正式 Spec 草稿。此检查复用 `gate.plan-approved` 用户决定，不新增批准阶段，也不授权实现。

可先用 `scripts/plan-spec-entry prepare --root <项目> --feature <id> --plan <Plan引用> --context-reconciliation <调和记录引用>` 将可读输入及当前摘要组织为待审候选 JSON，或用 `scripts/plan-spec-entry diff --root <项目> --review <审阅包引用>` 比较原依据与当前字节。两条命令只写标准输出；所有检查初始为 `pending`，影响判断为未知，候选不构成会签或批准。缺输入时返回结构化阻断原因。

检查 ID 与条件门禁取自 `.template-spec/process/lifecycle-registry.yaml` 的 `stage.plan.spec_entry`。查询 Plan 或相关工作单元自动加载 `planning`、`grill_exit` 和全量检查，初始均为 `pending`。自动加载不代表勾选通过。

## 有界专业审查

Plan 的轮次、稳定问题、无进展诊断和异常关闭只由生命周期编排合同 `planning.review_control` 的 `bounded-plan-review-v1` 定义；组合能力只从角色表 `gate_policy.review_execution.review_bundles` 读取。业务边界先通过，阶段决策包再核验承接；`gate.plan-approved` 复用两项适用专业结论，关闭聚合门禁不另派第三项专业审查。七项入口核验批量执行，机器检查、澄清和诊断各自留证。

新执行先在当前 checkpoint 初始化 `plan_review_control`，保留功能、已确认范围与来源证据，再以 `prepare-review-package --review-phase initial|rereview|exception` 正式预留；`--dry-run` 不登记尝试。任务 `review_context.plan_review_binding` 与 review-bundle v2 的 `plan_review_binding` 绑定同一周期、尝试、候选依据及本轮检查范围。主控派发、结果消费、恢复和 Plan → Spec 入口均复核控制记录；相同输入复用原任务，技术中断恢复原尝试，任务名或摘要变化不重置周期。

问题沿稳定 ID 保存违反依据、场景、证据和关闭条件；修复按原条件关闭，建议进入待办。无进展及常规定向复审仍阻断时，由主控诊断、补证据或解决专业冲突；新的解决证据是异常关闭核验的前提。用尽预算继续保留真实阻断，不能据此批准，也不默认转用户重新批准。

固定业务候选及依据后准备审查，进度、运行日志与原始回复单独保存。必须回写的专业会签状态先形成最终字节候选并在同一任务核验；依据保持有向：业务边界 → 决策包 → 组合结论 → Plan 审阅包 → 用户决定及聚合批准。不得让审查任务或 bundle 的候选摘要反向包含消费它们的审阅包、回复或批准记录。

旧记录仍可只读核验。受控升级接入时关联历史专业审查及澄清、机器检查的分类证据，历史次数未知不按零处理，超限转诊断；旧批准和原始回复原字节保留。读取历史不授予新执行资格，新消费者要求当前协议，Spec、Design 和实现仍沿各自策略。

控制命令均使用同一 `--checkpoint <项目内.json>`，输入用 `--input <项目内.json>`：`plan-review-control init` 绑定初始化前的 checkpoint 快照；`adopt` 绑定历史分类、原始证据及可复用结论；`dispatch --task <已登记任务>` 登记实际派发；`complete --input <原始结果>` 校验绑定、逐项结果和原字节后消费；`diagnose` 登记解决证据。`status`、`check` 和 `--dry-run` 只读，不生成审查或批准事实。

在既有身份、checkpoint 和输出参数后使用 `prepare-review-package --review-phase initial --dry-run` 检查准备；正式预留去掉 `--dry-run`。定向复审或异常关闭增加 `--review-input <当前输入.json>`，该文件仅包含 `target_finding_ids` 与 `resolution_evidence: [{ref, digest}]`，引用已登记问题和实际解决证据；阶段使用 `rereview` 或 `exception`。原始结果的 `check_results` 必须覆盖本轮范围，未受影响项保留原结果及当前依据，不能为合并展示虚构新的审查尝试。两项内部检查均未命中时仍初始化控制、保留当前 N/A 依据并核验完整 Plan、Context 和真实回复，不制造空 bundle。

## 持久化合同

入口状态包含 `feature_id`、`plan_review_ref`、`plan_approval_ref`，当前 checkpoint 同时保存 `plan_review_control`；聚合批准引用也可由当前 `gates.gate.plan-approved.approval_ref` 提供。控制记录只由 checkpoint 持有，任务包和完成态 Workflow Execution Result 引用当前入口字段，不复制独立台账。按用户决定协议提供 `plan_user_decision_ref` 或 `plan_continuation_ref`；不从历史阶段、路径或默认值推断。两条证明路径均由现有用户决定校验器核验，不能混填或以延续记录伪造新回复。

`plan_review_ref` 指向 YAML / JSON：

- `schema_version: 1`、`kind: plan-entry-review`、`gate_id: gate.plan-approved`、与入口一致的 `feature_id`。
- 新审阅包登记 `review_protocol: bounded-plan-review-v1`；旧记录保留原字节，接入新执行前完成受控历史登记。
- `plan_ref`：本次 Plan 正文；`context_reconciliation_ref`：本次已通过的 Context 调和记录。
- `basis`：非空 `{ref, digest}` 列表，digest 为实际文件字节的 `sha256:` 摘要。必须包含 Plan 正文、根 `CONTEXT.md`、生命周期注册表、Context 调和记录及各检查和门禁引用的文件。远程事实先保存可追溯证据快照。
- `checks`：注册表要求的全部检查 ID，每项包含 `status: pending | passed` 和非空 `evidence_refs`，引用 `basis`。必需检查不接受 `not-applicable`。缺项、未知项、pending 均阻断。
- `checks.grill_exit=passed` 表示澄清材料及前置条件就绪：当前必要决策已逐项确认、问题依赖已收敛、事实和验证证据已回流、关键与可执行阻塞已关闭，并已整理共同理解总述。它不单独证明最终共同理解或 Plan 批准；完整 `grill_exit` 由入口联合上述准备检查与当前 `gate.plan-approved` 用户决定判定。
- `open_items`：显式数组，空数组代表无未决项。每项有 `id`、`critical`、`runnable_blocker`、`status` 和 `evidence_refs`。影响业务边界、关键规则或 MVP 的问题属于 critical。`resolved` 须有解决证据；仅非关键、非可执行阻塞项可 `deferred`，并填写 `noncritical_reason`、`owner`、`resolution_point`、`downstream_recipient`。延期内容随整个审阅包展示并取得用户确认。
- `impacts`：显式评估 `domain_strategy`（领域边界、词汇、协作或核心规则影响）和 `stage_decision`（需要稳定阶段决策合同）。证据和判断必须呈现给用户；缺值不解释为 false。
- `internal_checks`：注册表 `check_impacts` 内部专业审查全部逐项记录。命中项须 `status: approved`、`approval_ref`、`subject_ref`、`approval_scope`、`evidence_refs`，会签记录及对应资产均加入 `basis`；未命中项须 `status: not-applicable`、`reason`、`evidence_refs`，并由用户确认影响面判断。阶段决策检查的上游依赖必须批准，不能用 N/A 跳过。

首轮适用内部检查使用同一组合 bundle；定向复审只更新本轮检查，未受影响项保留原批准引用及当前依据。聚合批准绑定最终审阅包字节、范围、依据和独立身份，并沿用最终组合任务与会话，不生成第三项专业审查。真实用户回复在候选固定后单独保存。

按主控 `planning.clarification_policy` 完成分轮澄清，先固定审阅包及依据，再一次展示共同理解总述、当前内容、范围、风险、延期、N/A 理由和进入 Spec 的动作。用户同一真实回复可同时确认共同理解并批准当前 Plan；展示或回复范围不完整时继续阻断。`plan_user_decision_ref` 采用 `.template-spec/process/schemas/user-decision.schema.json`：边界为 `gate.plan-approved`，subject 为当前 `plan_review_ref`，scope 包含当前 `feature_id`。回复独立保存于该记录，不写回审阅包或 `basis`，避免改变其摘要；收取最终回复前不宣布共同理解已确认或 Plan 已批准。不得将旧“继续”、数字人会签或合成测试回复当作本次批准。

审阅包、注册表、Plan、词汇、依据或批准来源变化均要求重新校验；摘要漂移时先展示差异并按用户决定协议重验：排版、措辞或派生内容变化，经独立等价审查证明决定依据与授权范围未变，且原始决定和适用外部审批仍有效时，可用 `plan_continuation_ref` 延续；范围、关键规则、验收、契约承诺、授权或风险接受发生实质变化时重新取得决定。未知影响先补分析，不能视为等价。检查器保证结构、引用、摘要和回复绑定，不证明业务事实或身份来源绝对真实；主控仍须按证据核查影响面，不能为了放行而填 false 或空问题列表。

批准延续使用 `yss-product-lifecycle/references/user-decisions.md` 的 `approved-scope-continuation-v1`：绑定当前审阅包、原始真实决定、实际差异与独立审查；禁止链式延续、修改旧回复或跳过检查。`scripts/plan-spec-entry prepare` 只起草候选，`diff` 只报告原始字节变化；两者均不判定等价或批准。
