# 编排执行协议

## 有界推进循环

当任务使用 `harness.business-ddd-strategy-handoff` profile 时，先加载 `docs/process/harness-profile.yaml`。只向产品、需求和商务角色派发 Discovery、需求分析、DDD 战略设计、Spec、页面原型、业务级 Ticket 和 Strategic Design Handoff 工作；`work-unit.strategic-design-handoff` 完成并批准后，`next_route` 必须为 `null`，并将 `downstream_consumers` 指向 `downstream-rd-team` / `yss-tactical-design`。不得把 profile 的 `null` 终点改写成技术分析、Tactical DDD、实现或发布路由。

1. 识别模式、仓库身份、任务规模和影响面。
2. `setup readiness`：每个任务只执行一次，核对 tracker、五态标签和领域文档布局，并在本轮缓存结果；仅在 tracker、主远端、真实标签或配置变化时重查。
3. 加载父 Ticket/checkpoint 与真实资产，计算最近可信阶段。
4. 评估资产、门禁和 `stale`，选择第一个未阻塞工作单元。进入 `work-unit.slice-implementation` 前，必须先通过 `scripts/lib/lifecycle-transition.mjs` 的 Ticket 正式化、垂直切片绑定和合法 `next_route` 校验；父 Ticket、缺少垂直切片或 `ready-for-human` 的切片一律 `blocked`。
5. 执行最小生命周期工作单元：主控先按 `docs/process/schemas/digital-human-task-package.schema.json` 编译并校验任务包，再只实际调用允许的 model-invoked skill；原生工作单元可直接持有正式资产，Matt 兼容 user-invoked skill 仅作为 workflow reference，仍由用户显式启动。将结果归一化为 `Workflow Execution Result`，验收输出并回写状态与证据。任务包的 `contract.kind` 按工作单元选择；只有实现子任务使用 `slice-implementation` 并消费 Slice Implementation Contract，其他阶段不伪造该合同。
6. 若仍在授权和自动推进边界内，回到第 3 步；否则暂停。

不要仅输出下一个提示词后结束 `orchestrate`/`resume`。不要因进入业务代码阶段而退出主控；应把实现交给专项 skill，并在返回后继续核验。

连续阶段自动推进时累积 Ticket 同步和 Git 判断证据，在人工暂停、handoff、进入实现、合并或发布边界集中 checkpoint。发生阻塞、责任人变化或资产需要单独批准时立即落 checkpoint，不因合并记录而丢失阶段因果关系。

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
| `degraded` | 已选择的 GitHub/GitLab 不可用 | 建 `docs/.scratch/<feature>/` 待发布草案，不改投平台 |
| `not-applicable` | `template-source` | 只验证模板契约 |

远程 tracker 必须检查真实标签；Local Markdown 必须检查功能包目录和 Ticket 顶部的 `Status:`。仅有 `docs/agents/triage-labels.md` 不代表远程标签存在，也不能替代 Local 文件状态检查。

tracker 选择和冲突按 `docs/agents/issue-tracker.md` 裁决：已持久化 tracker 配置优先，本模板默认 `local-markdown`，Local root 为 `docs/.scratch/`；用户在初始化/迁移时明确选择 GitHub/GitLab 后才切换，Git remote 只代表代码托管。Local 主 tracker 不要求远程 Ticket；只有已选择远程平台但凭据不可用时，才降级为 `docs/.scratch/<feature>/` 待发布草案，不自动改投其他平台。发现根 `.scratch/` 或 `docs/requirements/tickets/` 旧资产时，保留 `migration_ref` 并暂停写入；新旧路径同时存在时返回 `conflict`。恢复前记录最终平台、真实五态标签或 Local `Status:` 检查结果和草案位置。

## Matt flow 进入条件

- `work-unit.technical-analysis` 是下游研发 profile 的接管工作单元；本 profile 仅在 Strategic Design Handoff 中记录待下游确认的技术问题，不生成 Tactical DDD 或 OpenAPI 资产。

- `work-unit.discovery-requirements` 实际调用 `grilling` 和 `domain-modeling`；`work-unit.discovery-opportunity` 按事实类型路由 `competitive-intelligence` 或 `research`。战略编排器原生负责 Spec、页面原型、业务 Ticket 和 Strategic Design Handoff；`ask-matt`、`grill-me`、`grill-with-docs`、`to-spec`、`to-tickets`、`triage`、`wayfinder` 仅保留为显式兼容入口，结果必须回交战略编排器验收。
- `harness.business-ddd-strategy-handoff` profile 的 `work-unit.strategic-design-handoff` 是本地终点；它必须引用批准的 `domain-strategy`、`stage-decision-package`、Spec、页面原型和业务级 Ticket 集，并把 Tactical DDD 问题交给下游研发团队。profile 内不得生成或批准 `artifact.tactical-design`。
- `work-unit.business-ticket-formalization` 只生成业务能力/用户行为级 Ticket，保持 `ready-for-human`，不创建垂直切片、Slice Contract 或 `ready-for-agent`。
- `Workflow Execution Result.next_route` 必须通过生命周期转换校验；Spec → 原型 → 业务 Ticket → Strategic Design Handoff 是本 profile 的唯一主路径。
- `work-unit.slice-implementation`、脚手架和实现验证均由下游研发 profile 执行；本分支不存在 `implement` 入口，相关请求必须 blocked 并转交下游。
- `Workflow Execution Result` 出现 `drift`、`new_impacts`、`stale_candidates`、`violation`、`missing_evidence`、空 `evidence_refs` 或缺少必需字段时暂停当前工作单元；旧结果只能先经只读兼容 adapter 归一化。

## 审查与验证

- 调用 `code-review` 前先固定 review input：`review_mode`、`review_base_ref`、`implementation_candidate_ref`、`candidate_snapshot_ref`、`candidate_digest`、Spec/Ticket、Slice Implementation Contract、Build Architecture Checklist 和 YSS Skill Execution Result 引用。`committed` 模式审查不可变 `HEAD`；`worktree` 模式一次捕获 committed、staged、unstaged 和 untracked 内容。必须按 `orchestration-contract.yaml.review_input` 的 manifest 按模式必填字段及 `yss-worktree-candidate-v1` 字节流（raw path、uint64 big-endian 长度、tracked/untracked record）计算 SHA-256，两个 Reviewer 必须消费同一不可变快照。返回后或完成 checkpoint 摘要变化时返回 `blocked`，由编排器决定重新审查。候选为空、漏项或 fixed point 不可解析时阻断。
- 小改动和中等变更可由同一独立执行者完成 `code-review` 与 fresh verification，并在同一报告中分别记录 findings、命令、结果和残余风险。
- 该执行者必须独立于实现者；新模块、高风险变更、职责冲突或需双人控制时，Reviewer 与 Verifier 分开。
- `code-review` 是唯一默认代码审查 skill。GitLab、CI、Sonar、Alibaba Java 等治理事实作为仓库规则或专项检查输入，不再叠加第二个通用审查 skill。
- UI 影响切片将 `UI fidelity` 作为 `code-review` 的条件第三轴；任何修复都会使候选摘要失效，必须重新捕获候选并重跑 Standards、Spec、UI fidelity 和 fresh verification。

## Git 授权

实现授权、`orchestrate`/`resume` 的有界写入、当前分支和 Git checkpoint 都不蕴含 commit 或 push 授权。执行 commit 前必须同时取得 `commit_authorized=true`、非空 `commit_scope` 和 `commit_authorization_ref`；执行 push 前必须同时取得 `push_authorized=true`、非空 `push_scope` 和 `push_authorization_ref`。任一缺失时只记录 checkpoint 判断并保持 Git 状态不变；负责人要求、时间压力、测试通过或“本地 commit 可逆”都不能补足用户授权。

`repository_scope: git-submodule` 时授权按仓分别计算：禁止在 detached HEAD 提交；commit / push 顺序必须先子仓、再父仓 gitlink（`superproject-gitlink-update`）；父仓 push 使用 `git push --recurse-submodules=check`。空 gitlink、detached HEAD、`--force` 覆盖挂载点不得当成普通目录脚手架，也不得把实现源码复制进 Harness。登记字段必须能与 `harness-apps` / `external-repository` 区分，并对照工作树 gitlink。

## 必须暂停

- Spec baseline、需求冻结、原型确认、OpenAPI Freeze 或 Architecture Review 等普通门禁等待会签裁决（数字人或生物人，以 `docs/agents/digital-human-roles.yaml` 的 `gate_policy` 为准）。暂停输出必须包含：门禁 ID、指定 `role_id`、`runtime_id`、会签文件路径。恢复前执行 `scripts/verify-approval-record`；角色错误、起草者自签或生物人门禁被数字人关闭时返回 `blocked`，不得标 `approved`。
- 需要目标仓库、外部凭据、发布窗口或其他新授权。
- 状态与证据冲突且无法可靠重建。
- 专项 skill 失败或返回不可验收结果。
- 即将作出可合并、可发布或完成结论。

暂停输出：门禁、指定会签 `role_id`、`runtime_id`、会签文件路径、证据、推荐答案、一个问题、恢复动作。

## Wayfinder 完成判定

“无 frontier”不等于完成。只有以下条件同时成立，才能 `wayfinder → handoff → to-spec`：

- open child tickets 为 0；
- 不存在 open blocked 或 open claimed child ticket；
- `Not yet specified` 无剩余 fog；
- destination 已清晰。

Decision ticket 产生决策，不是实现切片，不得标记 `ready-for-agent`。

## `grill-with-docs` 退出判定

进入 `to-spec` 前必须区分已确认项与未决项，并确认用户、问题、MVP、非目标、成功标准、术语/ADR 候选和测试 seam。事实问题走 `research`；需 runnable 反馈的问题走 `handoff → prototype → handoff`。存在未回流 blocker 时不得进入 Spec baseline。

Prototype 回流必须有可核验证据：来源 handoff、prototype 资产或运行记录、结论、被更新的 Spec/设计/ADR/Ticket 引用、剩余未决项和返回 handoff。仅在对话中声称“已验证”不算回流完成。

Matt `prototype` 的回流还必须注明 `prototype_branch`，并保留单文件 HTML 主来源；YSS 高保真 HTML 原型另走阶段 4 的评审、AntD CLI 校验和用户确认，不得用 throwaway prototype 替代。

`to-questionnaire` 未收到答案时使用 `external-input-required` 暂停，记录问卷、接收人、所需输出和恢复路由；收到答案后记录 response、重新分类影响面和更新后的权威资产，再回到 `grill-with-docs` 或 `to-spec`。

Release 与 Retrospective 属于生命周期编排器拥有的工作单元。发布和复盘前都必须重新取得 fresh verification；发布还需要发布/回滚证据和独立审查，复盘还需要复盘记录和治理回流判断，再回流权威资产。
