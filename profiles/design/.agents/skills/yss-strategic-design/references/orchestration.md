# 编排执行协议

## 有界推进循环

当任务使用 `harness.business-ddd-strategy-handoff` profile 时，先加载 `.template-spec/process/harness-profile.yaml`。只向产品、需求和商务角色派发 Plan、需求分析、DDD 战略设计、Spec、页面原型、业务级 Ticket 和 Strategic Design Handoff 工作；`work-unit.strategic-design-handoff` 完成并批准后，`next_route` 必须为 `null`，并将 `downstream_consumers` 指向 `downstream-rd-team` / `yss-technical-design`。不得把 profile 的 `null` 终点改写成技术分析、Tactical DDD、实现或发布路由。

1. 识别模式、仓库身份、任务规模和影响面。
2. `setup readiness`：每个任务只执行一次，核对 tracker、五态标签和领域文档布局，并在本轮缓存结果；仅在 tracker、主远端、真实标签或配置变化时重查。
3. 加载map.md、checkpoint 与真实资产，计算最近可信阶段。
4. 评估资产、门禁和 `stale`，只在 `profile_registry.allowed_local_work_units` 中选择第一个未阻塞工作单元。命中下游工作单元时返回 `blocked`，并把问题写入 Strategic Design Handoff。
5. 执行最小生命周期工作单元：主控先按 `.template-spec/process/schemas/digital-human-task-package.schema.json` 编译并校验任务包，再只实际调用允许的 model-invoked skill；原生工作单元可直接持有正式资产，Matt 兼容 user-invoked skill 仅作为 workflow reference，仍由用户显式启动。将结果归一化为 `Workflow Execution Result`，验收输出并回写状态与证据。本 profile 的任务包只允许 `lifecycle-work-unit` 或 `template-maintenance` 合同。
6. 若仍在授权和自动推进边界内，回到第 3 步；否则暂停。

不要仅输出下一个提示词后结束 `orchestrate`/`resume`。到达已批准的 Strategic Design Handoff 后终止本地路由；不得在同一 profile 内继续技术分析或实现。

连续阶段自动推进时累积 Ticket 同步和 Git 判断证据，在人工暂停或 handoff 边界集中 checkpoint。发生阻塞、责任人变化或资产需要单独批准时立即落 checkpoint，不因合并记录而丢失阶段因果关系。

## 阶段边界

Matt phase boundary 是工作阶段之间的上下文决策，不是新的生命周期状态。按以下顺序判断，第一项适用即停止判断：

1. **Continue**：下一阶段需要当前会话作为 primary source，或当前上下文仍在 smart zone 内。
2. **`/clear`**：当前探索、死路和决策对下一阶段完全无关。
3. **`/handoff`**：内容必须跨新 harness、新目录、同事或中途分叉的 side task 携带。
4. **Subagent**：工作单元边界清晰，可以在无人值守时完成并返回报告。
5. **`/compact`**：同一 harness、同一目录且上下文仍相关，但需要压缩后继续；它是最后选项。

在 checkpoint 记录 `phase_boundary.decision`；使用 `handoff`、subagent 或 `compact` 时同时记录契约要求的引用。phase boundary 不得改变生命周期阶段、门禁或 Ticket 五态。

## 原型到战略设计交付

`prototype_confirmation` 通过后，本 profile 只继续业务 Ticket 正式化与 Strategic Design Handoff；工程基线、脚手架、OpenAPI 和代码实现由下游研发 profile 接管。

下游研发 profile 负责脚手架、技术契约和实现合同；本 profile 的交付包只记录这些后续工作所需的战略输入、未决问题、责任人和版本边界。

## Setup readiness

Readiness 结果在同一任务内复用。只有 tracker、主远端、真实标签或配置发生变化，才重新执行检查；不得把 `setup-matt-pocock-skills` 当作每阶段或每工作单元的固定动作。

| 状态 | 判定 | 动作 |
|---|---|---|
| `ready` | tracker、Local `Status:` 或远程标签和领域布局兼容 | 继续 |
| `missing` | 必要配置缺失 | `needs-human`；说明缺失项并请用户显式运行 `setup-matt-pocock-skills`，随后回到 readiness |
| `conflict` | 多个持久配置或真实标签/Local 状态互相矛盾 | 暂停并提出迁移方案，不覆盖 |
| `degraded` | 已选择的 GitHub/GitLab 不可用 | 建 `.work/<feature>/` 待发布草案，不改投平台 |
| `not-applicable` | `template-source` | 只验证模板契约 |

远程 tracker 必须检查真实标签；Local Markdown 必须检查功能包目录和 Ticket 顶部的 `Status:`。仅有 `.template-spec/agents/triage-labels.md` 不代表远程标签存在，也不能替代 Local 文件状态检查。

tracker 选择和冲突按 `.template-spec/agents/issue-tracker.md` 裁决：已持久化 tracker 配置优先，本模板默认 `local-markdown`，功能包根由 `tracker.root` 配置决定，新实例默认 `.work/`；用户在初始化/迁移时明确选择 GitHub/GitLab 后才切换，Git remote 只代表代码托管。Local 主 tracker 不要求远程 Ticket；只有已选择远程平台但凭据不可用时，才降级为 `.work/<feature>/` 待发布草案，不自动改投其他平台。发现根 `.scratch/` 或 `docs/requirements/tickets/` 旧资产时，保留 `migration_ref` 并暂停写入；新旧路径同时存在时返回 `conflict`。恢复前记录最终平台、真实五态标签或 Local `Status:` 检查结果和草案位置。

## Matt flow 进入条件

- `work-unit.technical-analysis` 是下游研发 profile 的接管工作单元；本 profile 仅在 Strategic Design Handoff 中记录待下游确认的技术问题，不生成 Tactical DDD 或 OpenAPI 资产。

- `work-unit.plan-requirements` 按 `planning.clarification_policy` 遇到必须解决的需求、业务规则、范围或取舍决策未决项主动调用 `grilling`，术语整理按需调用 `domain-modeling`；`work-unit.plan-opportunity` 按事实类型路由 `competitive-intelligence` 或 `yss-research`。`yss-research:quick` 只用于探索；外部证据进入领域战略、阶段决策或其他生命周期批准输入前必须升级为 `evidence-audited`。战略编排器原生负责 Spec、页面原型、业务 Ticket 和 Strategic Design Handoff；`ask-matt`、`to-spec`、`to-tickets`、`triage`、`wayfinder` 仅保留为显式兼容入口，结果必须回交战略编排器验收。
- `harness.business-ddd-strategy-handoff` profile 的 `work-unit.strategic-design-handoff` 是本地终点；它必须引用批准的 `domain-strategy`、`stage-decision-package`、Spec、页面原型或既有 UI 基线和业务级 Ticket 集，形成 Handoff v5，并在交接门禁批准后自动执行 `scripts/strategic-handoff finalize`。只有固定交付目录的 `delivery-record.json` 与 `verification.json` 已写入 checkpoint 且整包验证通过才完成；接收回执不阻断战略终点。目标仓必须先完成根 `CONTEXT.md` 对账和 `context_reconciliation`，再启动 `yss-technical-design`；profile 内不得生成或批准 `artifact.tactical-design`。
- `work-unit.business-ticket-formalization` 只生成业务能力/用户行为级 Ticket，保持 `ready-for-human`，不创建垂直切片、Slice Contract 或 `ready-for-agent`。
- `Workflow Execution Result.next_route` 必须通过生命周期转换校验；Spec → 原型 → 业务 Ticket → Strategic Design Handoff 是本 profile 的唯一主路径。
- `work-unit.slice-implementation`、脚手架和实现验证均由下游研发 profile 执行；本分支不存在 `implement` 入口，相关请求必须 blocked 并转交下游。
- `Workflow Execution Result` 缺少通过校验的 `context_reconciliation`，或出现 `drift`、`new_impacts`、`stale_candidates`、`violation`、`missing_evidence`、空 `evidence_refs` / 必需字段时暂停当前工作单元；旧结果只能先经只读兼容 adapter 归一化。

## 战略资产审查与验证

- 原型由独立 `prototype-review` 审查，评审者不承担原型起草；H1/H2 均以 Prototype Evidence schema v4、Visual Baseline schema v1、浏览器交付、Design QA 和用户确认关闭门禁。
- 领域战略、阶段决策包、Spec 与 Strategic Design Handoff 按 `.template-spec/agents/digital-human-roles.yaml` 会签，起草者不得自签。
- Tactical DDD、代码审查、实现验证和发布验证不属于本 profile；交付包只能提出下游验证目标。

## Git 授权

实现授权、`orchestrate`/`resume` 的有界写入、当前分支和 Git checkpoint 都不蕴含 commit 或 push 授权。执行 commit 前必须同时取得 `commit_authorized=true`、非空 `commit_scope` 和 `commit_authorization_ref`；执行 push 前必须同时取得 `push_authorized=true`、非空 `push_scope` 和 `push_authorization_ref`。任一缺失时只记录 checkpoint 判断并保持 Git 状态不变；负责人要求、时间压力、测试通过或“本地 commit 可逆”都不能补足用户授权。

`repository_scope: git-submodule` 时授权按仓分别计算：禁止在 detached HEAD 提交；commit / push 顺序必须先子仓、再父仓 gitlink（`superproject-gitlink-update`）；父仓 push 使用 `git push --recurse-submodules=check`。空 gitlink、detached HEAD、`--force` 覆盖挂载点不得当成普通目录脚手架，也不得把实现源码复制进 Harness。登记字段必须能与 `harness-apps` / `external-repository` 区分，并对照工作树 gitlink。

## 必须暂停

- Spec baseline、领域战略、阶段决策、原型确认或 Strategic Design Handoff 等本地门禁等待会签裁决（数字人或生物人，以 `.template-spec/agents/digital-human-roles.yaml` 的 `gate_policy` 为准）。暂停输出必须包含：门禁 ID、指定 `role_id`、`runtime_id`、会签文件路径。专业等待先自主派发独立审查；真实用户决定缺失时才询问。恢复前执行 `scripts/verify-approval-record --checkpoint <当前检查点> --require-approved <批准文件>`；角色错误或起草者自签时返回 `blocked`，不得标 `approved`。
- 需要目标仓库、外部凭据、发布窗口或其他新授权。
- 状态与证据冲突且无法可靠重建。
- 专项 skill 失败或返回不可验收结果。
- 发布等实际外部动作缺少新的动作授权。

暂停输出：门禁、指定会签 `role_id`、`runtime_id`、会签文件路径、证据、推荐动作、实际缺失信息及恢复动作；专业等待由主控派发，不把它默认变成用户问题。

## Wayfinder 完成判定

“无 frontier”不等于完成。只有以下条件同时成立，才能 `wayfinder → handoff → to-spec`：

- open child tickets 为 0；
- 不存在 open blocked 或 open claimed child ticket；
- `Not yet specified` 无剩余 fog；
- destination 已清晰。

Decision ticket 产生决策，不是实现切片，不得标记 `ready-for-agent`。

## 原生需求澄清 退出判定

进入正式 Spec（含显式 `to-spec`）前，按 `planning.clarification_policy` 和 [需求澄清与对账](plan-requirements.md) 分流未决项、按依赖分轮并保留真实回复；只重开用户纠正所影响的问题和结论。事实问题走 `yss-research`，需 runnable 反馈的问题走 `handoff → prototype → handoff` 或实际验证，专业问题由主控安排独立审查、修复与补证，无依赖工作继续。存在关键未决项或未回流 blocker 时不得起草正式 Spec。

收敛后固定包含共同理解、解决证据、延期项、范围、风险和下一动作的完整 Plan 审阅包。包内 `checks.grill_exit=passed` 是材料就绪，最终共同理解与 Plan 批准合并一次真实用户确认；当前外部 `plan_user_decision_ref` 和入口检查通过后才满足完整 `grill_exit`。最终回复前不宣布共同理解确认或批准，不把回复写回包内依据而改变被批准摘要。

Prototype 回流必须有可核验证据：来源 handoff、prototype 资产或运行记录、结论、被更新的 Spec/设计/ADR/Ticket 引用、剩余未决项和返回 handoff。仅在对话中声称“已验证”不算回流完成。

Matt `prototype` 的回流还必须注明 `prototype_branch`，并保留单文件 HTML 主来源；YSS 产品原型另走 H1/H2 档位、独立评审、条件 AntD 事实、Design QA 和用户确认，不得用 throwaway prototype 替代。

生命周期外部输入问卷 未收到答案时使用 `external-input-required` 暂停，记录问卷、接收人、所需输出和恢复路由；收到答案后记录 response、重新分类影响面和更新后的权威资产，再回到 原生需求澄清 或 `to-spec`。

Release 与 Retrospective 属于下游研发 profile。本 profile 只在 Strategic Design Handoff 中记录商务窗口、已知风险与下游责任人，不作可发布结论。

Spec、原型和交接的完成结果携带 `user_decisions`（boundary、subject_ref、scope 与 user_decision_ref，交接可引用 decision_reuse_ref）。`validateNextRoute` 对战略 profile 不回退完整研发路由，并核验当前关键决定。尚待真实回复时返回 needs-human，不把可审阅草稿标成可流转的 completed；任务包 schema 只增加可选决定引用，不改变原始回复协议。

## 当前专业审查与继续推进

专业审查资格按 `.template-spec/agents/digital-human-roles.yaml` 的能力覆盖和独立实例校验，角色名仅用于导航和历史兼容。正式 v1 审查任务按权威表编译 `review_context` / `review_skills`；核心与禁止技能、端范围及主控批准权不变。相邻检查可由一个能力完整的审查者组合完成，逐项记录主体、范围、依据和结论；缺少能力才增加专家。`scripts/prepare-review-package` 只生成任务、差异、覆盖和 pending 批准草案。恢复时以 `scripts/verify-approval-record --checkpoint <当前检查点> --require-approved <批准文件>` 校验；完整 v2 正式任务绑定可独立消费，历史只读不授予当前资格。

首轮覆盖全部适用项。修复后比较差异，只复审受影响的结论、行为和依赖，再绑定当前候选；未受影响项须有比较依据才能复用。摘要变化、UI 或 `new_impacts` 不触发全轴默认或兜底，未知影响先调查并阻断依赖事项。专业等待由主控自主派发和等待，继续独立工作；实际验证失败先修复。只有缺少真实用户决定、必要外部输入或动作授权时才展示具体资产并询问；待结论自身不要求暂停，问题数量按缺失信息确定。mandatory、外部强制审批、Fresh Verification 和旧两轮协议的显式 needs-human 保留。
