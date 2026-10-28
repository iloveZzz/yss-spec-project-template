# 关键决策的真实用户回复协议

本协议的阶段批准记录与授权延续适用于 `governed` 的既有决定。已合格普通任务使用原请求明确的范围和验收，不为日常实现另建阶段批准包；commit、push、运行时外部副作用及项目强制决定仍核验真实授权。普通路径不生成 `approved` 或把真实回复扩展到未知范围；见 [普通任务交付](daily-delivery.md)。

适用门禁、工作单元和条件事项由当前编排合同中的 `.template-spec/process/orchestration/domain/review.yaml#user_decision_policy` 定义。本协议解释执行和证据格式，不新增阶段、门禁或 Ticket 状态。专业审查记录与用户决定分别保存；关键决定缺少任一适用条件都不能放行。

## 六条执行规则

1. **先展示，再决定**：先完成可独立执行的检查和可审阅材料，展示资产链接、版本、关键变化、风险、推荐方案、批准范围和批准后的动作。优先使用 `renderDecisionRequest(request)` 生成完整展示文本；也接受原始消息已完整覆盖各项资产、版本、变化、风险、范围、推荐方案和后续动作的等价展示，不能因格式不同重复询问。不得请用户批准尚未形成的资产。
2. **绑定原始回复**：保存回复人、原始消息引用、回复时间、原文、决定、对应事项、范围及请求摘要。Agent 只能整理，不得生成、推测或补造用户同意。来源记录是可追溯证据，不是密码学身份认证。
3. **无回复就等待**：超时、默认选项、Agent同意、无反对意见和 Agent 自述均无效。依赖该决定的工作保持 `paused-human-gate` / `ready-for-human`；来源错误等使用 `blocked`。独立工作可以继续，不得借其完成清除未决决定。
4. **回复必须指向明确**：单项明确请求的“同意”有效。多项需要逐项指定、清楚的子集或“同意以上全部事项”；“继续”不算全部批准。拒绝、修改意见和撤回均保留为有效回复，但不放行。编排器结合原文判定语义；机器核验结构、明确性底线、来源和绑定，不能用自填 `approved` 覆盖相反原文。
5. **复用已有有效确认**：同一版本、范围和依据不重复询问，不按时间自动过期。当前资产字节变化先使旧验证过期；按下述授权延续协议核验差异，决定依据未变时更新专业审查和验证证据，不要求新回复。实质变化、范围扩大或撤回时展示差异后重新确认。无关文件变化不触发重新确认。回复按来源时间追加，禁止删除拒绝、修改或撤回记录来恢复旧批准。
6. **提问者和负责人分开**：默认回复人为提问者。其他业务、技术或发布负责人必须由提问者在原始消息中明确指定，包含对应事项和负责人；Agent不得自行代任。用户表达使用自然语言，内部 ID 和引用由 Agent 整理。

## 记录与来源

使用 `.template-spec/process/schemas/user-decision.schema.json` 和 `.template-spec/process/templates/user-decision-template.yaml`。存于 `.work/<feature>/decisions/<request-id>.yaml`；已展示的请求快照不改写，修改方案产生新请求并保留旧引用。请求中的 `subject` 指向可独立摘要的资产正文或冻结快照，批准记录另存，避免正文包含自己的批准摘要形成循环。`basis` 列出影响决定的额外冻结依据。

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

批准记录保留 `subject_ref`、`approval_scope` 和适用的 `user_decision_ref`；checkpoint 门禁同时声明 `subject_ref/approval_scope` 并与批准记录一致。新批准及组合审查使用 schema v3；专业记录绑定当前 `review_task_ref/digest`、实际 `check_ids`、`policy`、`review` 和 `basis`，检查与技能来源读取当前编排合同，不在本协议复制。恢复和门禁关闭执行 `scripts/verify-approval-record --require-approved --checkpoint <current checkpoint>`，当前期望来自消费者 checkpoint / 任务，禁止复制待验记录作为期望。缺当前上下文不能放行；只有 `--history` 仅检查历史记录结构，不构成批准。历史记录可读，不自动升级为当前专业审查或用户决定；旧消费者不支持新版本时先升级，不降级绕过。

Workflow Execution Result 使用 `user_decisions` 保存当前要求与证据引用。`user_decision_not_applicable` 仅对未命中的既有技术条件门禁记录 `boundary/reason`，不得跳过已经执行的业务决策。完成结果通过 `validateNextRoute(..., result)` 检查；两参数调用仅检查路由结构，不能证明可以实际流转。

checkpoint 的 `human_review` 保存 `user_decisions`、`required_decisions`、`not_applicable` 和需要时的 `external_input`。`stage_trace.completed_work_unit` 标识已完成单元；进入实施时 `human_review.implementation` 保存当前切片及持久化合同引用。等待态可以保存；恢复、流转和完成时重新核验。外部回复、新授权、风险接受均以同一决定记录作为恢复依据，不能以工具恢复或默认答案替代。

## 已批准范围内连续推进

普通任务复用当前明确请求，不为了执行再创建阶段批准。正式新功能先在已授权范围内连续准备 Plan、Spec、必要产品设计、AC、工程方案及具体实施范围，保留未批准状态与来源；把这些已经形成的版本、摘要、风险和后续动作集中展示一次，再取得真实回复。不得批准未来尚未形成的资产，也不在确认前宣布正式完成、`ready-for-agent` 或进入实现。

新 `delivery-authorization` 使用 schema2，`basis` 绑定原始冻结资产，`targets` 给出具体 `boundary/subject_ref/scope`。七项 `decision_basis`（business_scope、acceptance、contract_commitments、authorization、risk_acceptance、quality、external_commitments）是原已批准主体模型中实际存在的 JSON Pointer 选择器，值由原始内容决定，不能填写“无变化”等结论字符串。Markdown 模型分为 `/frontmatter/...` 与 `/body`。不得使用通配路径或把未来字段列为授权。

`implementation-scope` target 同时给出按 Ticket 列明的 `implementation_limits`，明确 repositories 与 allowed_write_paths；当前合同、基线、写范围仍单独核验。可延续的技术细节/证据容器，必须在首次已展示的授权中用 `continuation_paths` 列出实际已存在且不覆盖上述保护维度的路径；缺省不推定授权新增容器。

同一 Agent 可比较原始已批准快照与当前完整内容，核验实际差异、受影响检查及当前验证，使用 schema2 / `approved-scope-continuation-v2`。`source` 只指向原始真实决定，不允许引用上一份 continuation 形成链式扩权。`comparison.before` 是可读且与原授权摘要精确相同的冻结副本，`after` 是当前主体；`differences` 逐项绑定真实差异文件及分类和理由，不能只声称“摘要已更新”。格式、技术细节及补证的可延续性由 Go 对实际内容、原选择器与范围重算。AC、权限、风险接受、仓库或写范围扩大、未知实质性、撤回，停止依赖动作并展示具体差异取得对应决定。

差异由现有只读原生接口取得：`compareContinuationAssets(before, after, {root})`（`scripts/lib/native-user-decision.mjs`）运输 `yss contract verify --kind continuation-comparison`。将返回的 `difference_json` **原样按 UTF-8** 写入既有 `differences.ref` 并计算原始字节 SHA-256。不能对 parsed `difference` 再 JSON.stringify，数值会丢失精度；缺少精确字符串是工具/来源缺口，不降级为 Node 差异引擎。实际差异文件形状为 `{schema_version:1, changes:[{path,before:{present,value?},after:{present,value?}}]}`；Go 最终验证全量差异覆盖，数组整体比较，缺失不同于 null。

`review` 绑定真实 provenance、当前候选与范围；默认真实自检，不要求独立角色。原始明确独立复核要求作为条件性的 `review-requirement` 来源绑定在现有 inputs/basis 中，不能由 `review.mode` 自行选择最低要求。当前首版仅支持原消息完整匹配 `请独立复核 <scope 用顿号连接>`（可带句号）或 `Please independently review <scope joined by , >`（可带英文句号），只去除外部空白。保留实际原话；其他说法、引用、否定或不支持格式是该动作的明确来源缺口，不能改写成支持的假消息、忽略后自检或另造一次确认。普通任务没有已知要求时不创建此来源表单。

`external_rules` 只绑定当前消费动作/目标实际适用的已知要求：none-known 无额外问卷或配置；known-verifiable 需要可读来源、当前范围和实际满足证据；known-unverifiable 保存 rule_ref/scope/reason 并停止对应动作。不得为获得 none-known 删除已知适用要求，也不把无关未来发布规则绑定到所有草稿。规则自带有效期时核验，不发明有效期。没有发布平台要求的本地草稿仍可继续；已知平台强制真人批准未取得时不能发布。相同账号的不同真实上下文可满足独立复核，同一上下文换角色/运行时名称不算。

通过 `scripts/verify-user-decision --continuation <requirement.yaml>` 核验，不产生新用户回复或执行资格。相邻适用技术检查可共用一个 approval3/review-bundle3，保留逐项结论并复用已完成的实际技术上下文；Plan 聚合不另派第三个审查任务。全部内部专业检查有据不适用时不制造空任务，但仍核验实际准备产出的真实自检和当前真人决定。失败、未执行、开放违规/缺证据/重要风险不被总体通过掩盖；建议保留待办。修复只重验受影响结论及依赖，旧报告保持原字节。

历史 authorization1/continuation1/approval1–2 只在原身份和政策下读取核验，不重写摘要、不补造当前来源，也不能据此写新任务或阶段。未知代际或缺原政策快照明确报不支持；迁移保留原记录和可核验来源。

## 实施范围与架构选择

首次实施批准的主体为功能级 `implementation-scope` 清单，`slices` 每行包含：`ticket_ref`、`contract`（ref/version/digest）、`repositories`、`allowed_write_paths`、`baselines`（ref/version/digest）。仓库与写路径必须对应当前合同的实施范围（历史 v2 的 common、新 v4 的 scope 及各仓工作单元，通过统一读取器核验）；基线包含合同引用的工程基线。`scope` 使用批准的切片引用集合。合同、范围或基线变化时先调查差异，复核当前合同、定向审查和授权延续；实质决定变化或超出原批准边界时展示差异后确认，未查明时不沿用。已覆盖的后续切片复用原记录。

实施就绪和派发必须同时提供 `user_decisions`、`slice_contract_ref` 与 `vertical_slice_ticket_ref`。Worker 任务包通过 `user_decisions` 传递记录，不能只声明 `ready_for_agent=true`。

脚手架 `user_confirmation` 使用 `gate.backend-architecture-platform-approved`，`user_decision_ref/decision_subject_ref` 的主体为分支设计前的决策输入快照；当前范围至少包含项目 ID、确认的架构、平台 Profile、精确 Spring Boot 补丁版本、Java 版本和 `decision_inputs_digest`。先获得真实回复，门禁通过后才能进入 DDD 战术设计或 MVC 技术设计，再由生命周期批准生成合同；不能回到设计 skill 或生成器内提问。既有工程核验并复用当前登记值，该门禁记录为 `not-applicable`；升级或架构转换不得冒充复用。

Git commit/push、外部动作仍分别检查已有授权和其范围。用户对一个具体动作的明确自然语言授权可整理成结构化记录，不必再次要求填写内部字段；生命周期批准不隐含其他动作授权。
