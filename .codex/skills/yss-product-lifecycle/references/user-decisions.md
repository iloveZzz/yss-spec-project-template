# 关键决策的真实用户回复协议

适用门禁、工作单元和条件事项只由 `docs/agents/digital-human-roles.yaml.user_decision_policy` 定义。本协议解释执行和证据格式，不新增阶段、门禁或 Ticket 状态。专业审查记录与用户决定分别保存；关键决定缺少任一适用条件都不能放行。

## 六条执行规则

1. **先展示，再决定**：先完成可独立执行的检查和可审阅材料，展示资产链接、版本、关键变化、风险、推荐方案、批准范围和批准后的动作。优先使用 `renderDecisionRequest(request)` 生成完整展示文本；也接受原始消息已完整覆盖各项资产、版本、变化、风险、范围、推荐方案和后续动作的等价展示，不能因格式不同重复询问。不得请用户批准尚未形成的资产。
2. **绑定原始回复**：保存回复人、原始消息引用、回复时间、原文、决定、对应事项、范围及请求摘要。Agent 只能整理，不得生成、推测或补造用户同意。来源记录是可追溯证据，不是密码学身份认证。
3. **无回复就等待**：超时、默认选项、数字人同意、无反对意见和 Agent 自述均无效。依赖该决定的工作保持 `paused-human-gate` / `ready-for-human`；来源错误等使用 `blocked`。独立工作可以继续，不得借其完成清除未决决定。
4. **回复必须指向明确**：单项明确请求的“同意”有效。多项需要逐项指定、清楚的子集或“同意以上全部事项”；“继续”不算全部批准。拒绝、修改意见和撤回均保留为有效回复，但不放行。编排器结合原文判定语义；机器核验结构、明确性底线、来源和绑定，不能用自填 `approved` 覆盖相反原文。
5. **复用已有有效确认**：同一版本、范围和依据不重复询问，不按时间自动过期。当前资产字节变化先使旧验证过期；按下述授权延续协议核验差异，决定依据未变时更新专业审查和验证证据，不要求新回复。实质变化、范围扩大或撤回时展示差异后重新确认。无关文件变化不触发重新确认。回复按来源时间追加，禁止删除拒绝、修改或撤回记录来恢复旧批准。
6. **提问者和负责人分开**：默认回复人为提问者。其他业务、技术或发布负责人必须由提问者在原始消息中明确指定，包含对应事项和负责人；数字人不得自行代任。用户表达使用自然语言，内部 ID 和引用由 Agent 整理。

## 记录与来源

使用 `docs/process/schemas/user-decision.schema.json` 和 `docs/process/templates/user-decision-template.yaml`。存于 `docs/.scratch/<feature>/decisions/<request-id>.yaml`；已展示的请求快照不改写，修改方案产生新请求并保留旧引用。请求中的 `subject` 指向可独立摘要的资产正文或冻结快照，批准记录另存，避免正文包含自己的批准摘要形成循环。`basis` 列出影响决定的额外冻结依据。

原始消息可由运行时直接读取，或保存为原始会话导出 / 用户提供的确认文件。跨平台统一捕获封装如下；字段必须来自原始来源，保留原始引用和完整原文，不能把 Agent 编写的摘要包装成来源：

```yaml
source_kind: session-export # platform-message | session-export | user-confirmation-file
messages:
  - id: <原始消息 ID>
    original_ref: <平台消息链接或用户文件原始位置>
    principal_ref: <原始作者标识>
    actor_kind: biological-human # 展示请求的 Agent 消息使用 digital-human
    sent_at: <原始时间，ISO 8601>
    text: <完整原文>
    reply_to: <回复关联的原始请求展示消息引用> # 回复必需；用户确认文件也可携带 request_digest
```

决定记录中的 `source` 绑定 `kind/ref/digest/message_id`。`ref` 必须可读；平台引用可经运行时的只读解析器提供，CLI 默认读取本地原始捕获封装。不能读取消息时使用原始导出或用户确认文件，不能仅填 URL 假定读取成功。文件摘要只能证明捕获内容一致，不证明作者身份；可信作者与消息内容由运行时或用户提供来源建立。

回复人、时间、原文必须与来源一致。来源还须通过原始 `reply_to` 或用户确认文件中的 `request_digest` 指向当前展示，不能把其他对话中的“同意”嫁接到本次批准。平台没有显式 reply-to 时，可以使用同一原始会话导出中紧邻回复之前、原文和原始引用均匹配的请求消息建立关联；无法建立来源关联就保持等待，不由 Agent 虚构。多项映射使用 `single`、`explicit-items`、`explicit-all`；负责人不同的事项分别回复。`decision` 为 `approved/rejected/changes-requested/unclear/revoked`，只对回复列出的事项和范围生效。需要自然语言补充澄清时保持等待，不要求用户手填内部 schema。

`requestDigest` 对请求除 `presented_source` 外的字段按键排序摘要，避免展示来源循环；展示文本包含该摘要。历史有效回复可导入原始展示消息的完整记录；只要原始展示覆盖当前决定且来源、范围与摘要可核验，即可复用，不要求补发模板消息。不能伪造已展示的新格式。无法证明历史请求与当前资产等价时，重新展示并确认。

## 消费边界

`scripts/verify-user-decision --requirements <当前事项.json> <决定记录.yaml>` 校验当前消费者要求的 `boundary/subject_ref/scope`；未给 `--requirements` 时校验请求中全部事项。无回复的草案可以保存，但不能通过批准验证。局部批准只允许已明确批准的事项推进。

会签记录新增 `subject_ref`、`approval_scope` 和 `user_decision_ref`；checkpoint 门禁同时声明 `subject_ref/approval_scope` 并与会签记录一致。`verify-approval-record` 默认严格验证当前放行条件，`--require-approved` 是显式等价选项；只有 `--history` 仅检查历史记录结构，不构成批准。恢复和门禁关闭必须使用严格校验。旧数字人记录仍可读取和用于专业审查，不自动升级成用户决定。

Workflow Execution Result 使用 `user_decisions` 保存当前要求与证据引用。`user_decision_not_applicable` 仅对未命中的既有技术条件门禁记录 `boundary/reason`，不得跳过已经执行的业务决策。完成结果通过 `validateNextRoute(..., result)` 检查；两参数调用仅检查路由结构，不能证明可以实际流转。

checkpoint 的 `human_review` 保存 `user_decisions`、`required_decisions`、`not_applicable` 和需要时的 `external_input`。`stage_trace.completed_work_unit` 标识已完成单元；进入实施时 `human_review.implementation` 保存当前切片及持久化合同引用。等待态可以保存；恢复、流转和完成时重新核验。外部回复、新授权、风险接受均以同一决定记录作为恢复依据，不能以工具恢复或默认答案替代。

## 已批准范围内连续推进

优先使用已有回复；没有明确授权时先形成可审阅方案，再集中确认范围、验收标准和实施边界。Plan、Spec、产品设计和工程契约仍完成适用检查，但不重复询问同一决定。脚手架架构选择、运行时外部动作仍按各自授权边界执行；交付验收不授权 commit、push、发布或生产操作。

`delivery-scope` 用户决定的主体可使用 `delivery-authorization` 清单：`schema_version: 1`、`kind`、不可变且有 `ref/version/digest` 的 `basis` 原始快照、`external_policy` 和 `targets`。每个 target 明确 `boundary/subject_ref/scope/decision_basis`；scope 不能超过原回复覆盖范围。`decision_basis` 必须逐项列明非空的 `business_scope/acceptance/contract_commitments/authorization/risk_acceptance/quality/external_commitments` 字符串数组；不存在的承诺明确写“无新增承诺”，不能留空。边界和资产路径明确，禁止通配授权未来未知范围。外部制度文件有 `status: confirmed|unconfirmed` 和 `requirements`；每项制度列 `id/boundaries/principals`，无额外审批只能在已确认后显式使用空数组。

当前 requirement 保持 `boundary/subject_ref/scope`，用 `continuation_ref` 引用 `approved-scope-continuation-v1` 证据，替代直接 `user_decision_ref`。证据包含 `schema_version: 1`、`kind`、`boundary/scope`、当前 `subject`、实际验证 `basis`、原始 `source` requirement、独立 `review` 资产和适用的 `external_decisions`。资产描述均用 `ref/version/digest`，digest 为带 `sha256:` 前缀的原字节摘要。不允许链式延续或生成新的用户回复。

`implementation-scope` target 还必须包含 `implementation_limits`，按切片 Ticket 引用登记 `repositories/allowed_write_paths`。校验器将当前实施清单逐项与原授权边界精确比较；即使重算当前摘要并声明“无语义变化”，也不能扩大仓库或写路径。

独立 review 包含：`decision: approved`、`role_id/runtime_id/principal_ref/drafter_principal_ref`、`classification`（`within-approved-scope/presentation-only/implementation-detail`）、`material_changes: []`、`findings`、当前 `boundary/scope/subject/basis`、与原授权一致的 `decision_basis`、`reason`、`comparison.before/after`。before 必须是原授权 basis 内不可变快照，after 必须绑定当前 subject。审查者按原快照与当前完整资产比较语义，不能只比较自填摘要或声称“无变化”；机器验证来源、摘要、身份分离、范围和声明的一致性，不替代专业语义判断。

finding 分为 `requirement-violation/missing-evidence/important-risk/suggestion`，带 `id/reason`。前三类未 `resolved` 则阻断；suggestion 必须有 `follow_up` 待办，不因个人偏好加门禁。重要风险须重新取得用户风险接受决定，不能改分类绕过。

外部制度有要求时，`external_decisions` 每项含 `obligation_id/principal_ref/requirement`，逐一验证当前资产、范围和指定真人原始回复；制度未确认不能自动延续。制度文件或原授权决定依据变化需要重新评估和确认，不能清空要求。

使用 `scripts/verify-user-decision --continuation <requirement.yaml>` 核验。会签记录可携带同一 `continuation_ref`；工作单元和任务包沿用 `user_decisions`，Plan 入口使用 `plan_continuation_ref`。实施仍校验当前 scope 清单、切片合同、仓库、允许写路径和工程基线，不因延续省略合同校验。旧记录维持严格读取；未登记该 capability 的接收端必须拒绝延续并升级，不能静默当普通批准。

相邻专业检查可共用一个 `schema_version: 1, kind: review-bundle, reviews: [...]` 文件。每行都是已有会签记录形状，有唯一 gate/check ID、当前 subject/digest/scope、独立身份和明确结论；失败项不能被总体通过掩盖。`verify-approval-record` 检查所有行，聚合门禁按检查 ID 读取各自行。组合审查不增加用户确认次数，也不省略检查覆盖。

## 实施范围与架构选择

首次实施批准的主体为功能级 `implementation-scope` 清单，`slices` 每行包含：`ticket_ref`、`contract`（ref/version/digest）、`repositories`、`allowed_write_paths`、`baselines`（ref/version/digest）。仓库与写路径必须对应当前合同的实施范围（v2 `common.project_roots/allowed_write_paths`，v3 `scope.project_roots/allowed_write_paths`，通过统一读取器核验）；基线包含合同引用的工程基线。`scope` 使用批准的切片引用集合。合同、范围或基线变化时回到确认；已覆盖的后续切片复用原记录。

实施就绪和派发必须同时提供 `user_decisions`、`slice_contract_ref` 与 `vertical_slice_ticket_ref`。Worker 任务包通过 `user_decisions` 传递记录，不能只声明 `ready_for_agent=true`。

脚手架 `user_confirmation` 使用 `gate.backend-architecture-platform-approved`，`user_decision_ref/decision_subject_ref` 的主体为分支设计前的决策输入快照；当前范围至少包含项目 ID、确认的架构、平台 Profile、精确 Spring Boot 补丁版本、Java 版本和 `decision_inputs_digest`。先获得真实回复，门禁通过后才能进入 DDD 战术设计或 MVC 技术设计，再由生命周期批准生成合同；不能回到设计 skill 或生成器内提问。既有工程核验并复用当前登记值，该门禁记录为 `not-applicable`；升级或架构转换不得冒充复用。

Git commit/push、外部动作仍分别检查已有授权和其范围。用户对一个具体动作的明确自然语言授权可整理成结构化记录，不必再次要求填写内部字段；生命周期批准不隐含其他动作授权。
