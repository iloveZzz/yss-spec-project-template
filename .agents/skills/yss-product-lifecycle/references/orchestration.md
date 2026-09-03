# 编排执行协议

## 有界推进循环

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

## 原型到后端脚手架的接力

`prototype_confirmation` 通过后，先判断实现仓库登记中的 backend `scaffold_status`。当状态为 `required` 时，先完成工程基线，由 `yss-router` 编译脚手架 `controlled-generation` 工作单元合同，生命周期编排器批准并持久化后才能运行生成器；顺序为：工程基线 → Router 脚手架合同 draft → 生命周期批准/持久化 → 脚手架生成 → `yss-backend-scaffold-parent` 基线校验 → Router 合同重编译。`existing` / `initialized` 不重复全量生成，但不能跳过基线校验和 Router 重编译。

脚手架工作单元必须使用结构化合同 JSON 文件，至少记录 `contract_id`、`contract_version`、`slice_id`、Router draft 引用、生命周期批准引用、持久化引用、当前版本、允许写路径、预期证据文件和验证命令；批准记录至少含 `approval_ref`、`approver`、`persisted_ref`、`current_version`。生成器必须读取该合同文件并校验状态、版本、skill、工作模式和固定命令，不能只接受任意字符串参数。它还必须记录生成器输入、预期文件、目标目录、实际 `./mvnw validate` / `./mvnw test` / `./mvnw package` 结果和 YSS Skill Execution Result。三条命令必须由受控工作单元真实执行，逐条留存 `exit_code`、`duration_ms`、stdout/stderr 引用和执行时间；生成器打印的下一步命令不构成证据。生命周期生成关闭 `--with-example`；非空目标目录使用 `--force` 默认阻断，除非覆盖范围、备份、回滚点和批准引用已进入合同。脚手架不得把业务规则、状态机、权限、事务、复杂查询、错误映射或用户可见行为放进生成物；`validate` 通过、输出目录存在或生成器成功都不是生命周期批准、架构放行或 `ready-for-agent`。

脚手架完成后，所有后续生成的后端代码仍必须重新消费当前版本的批准 Slice Implementation Contract、YSS skill 依赖闭包、允许写路径、预期证据和 Execution Result。业务行为使用 `behavior-tdd`；只有机械结构、样板、配置和冻结客户端使用 `controlled-generation`。缺少合同、skill、证据或实际验证时立即阻断；生成范围从机械内容变成业务行为时触发完整重路由。

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

- `work-unit.technical-analysis` 命中聚合、状态机、不变量、一致性、Domain Event、Gateway 或持久化映射影响时，先调度 `yss-tactical-design` 完成 Tactical DDD Check；默认嵌入系统概要设计 / 数据架构，复杂场景才生成 `artifact.tactical-design`。无领域影响记录 `not-applicable`。该 skill 只返回设计合同和验证结果，批准仍由生命周期编排器维护，发现 `stale`、`drift` 或 `new_impacts` 时不得继续 Ticket 正式化。

- `work-unit.discovery-requirements` 实际调用 `grilling` 和 `domain-modeling`；`work-unit.discovery-opportunity` 按事实类型路由 `competitive-intelligence` 或 `research`。生命周期原生工作单元默认负责 Spec、Ticket 和实现资产；`to-spec`、`to-tickets`、`implement` 仅保留为显式兼容入口，结果必须回交生命周期验收。
- 原生 `work-unit.ticket-decomposition` 只能在 OpenAPI Freeze 或无 API 影响记录后创建垂直切片，初始 Ticket 状态统一为 `ready-for-human`；生命周期复算完整公式后才能提升 `ready-for-agent`。该工作单元必须返回 `ticket_decomposition_result_ref` 和垂直切片引用，并作为实现的必经前置证据。
- 原生 `work-unit.slice-implementation` 必须在生命周期批准并持久化 Slice Implementation Contract 和 Build Architecture Checklist 后执行；用户显式 `implement` 仍走兼容入口，不得绕过生命周期。
- `Workflow Execution Result.next_route` 必须通过生命周期转换校验；Spec、原型和技术分析不得直接跳转到 `work-unit.slice-implementation`，只能先进入 `work-unit.ticket-decomposition`。
- `implement` 遇到 backend `scaffold_status=required` 时，还必须满足原型确认后的脚手架策略：脚手架 Execution Result、`yss-backend-scaffold-parent` 基线、Wrapper 验证和 Router 合同重编译均已回写；否则停在工程基线，不得写业务代码。
- `Workflow Execution Result` 出现 `drift`、`new_impacts`、`stale_candidates`、`violation`、`missing_evidence`、空 `evidence_refs` 或缺少必需字段时暂停当前工作单元；旧结果只能先经只读兼容 adapter 归一化。

## 审查与验证

- 调用 `code-review` 前先固定 review input：`review_mode`、`review_base_ref`、`implementation_candidate_ref`、`candidate_snapshot_ref`、`candidate_digest`、Spec/Ticket、Slice Implementation Contract、Build Architecture Checklist 和 YSS Skill Execution Result 引用。`committed` 模式审查不可变 `HEAD`；`worktree` 模式一次捕获 committed、staged、unstaged 和 untracked 内容。必须按 `orchestration-contract.yaml.review_input` 的 manifest 按模式必填字段及 `yss-worktree-candidate-v1` 字节流（raw path、uint64 big-endian 长度、tracked/untracked record）计算 SHA-256，两个 Reviewer 必须消费同一不可变快照。返回后或完成 checkpoint 摘要变化时返回 `blocked`，由编排器决定重新审查。候选为空、漏项或 fixed point 不可解析时阻断。
- 小改动和中等变更可由同一独立执行者完成 `code-review` 与 fresh verification，并在同一报告中分别记录 findings、命令、结果和残余风险。
- 该执行者必须独立于实现者；新模块、高风险变更、职责冲突或需双人控制时，Reviewer 与 Verifier 分开。
- `code-review` 是唯一默认代码审查 skill。GitLab、CI、Sonar、Alibaba Java 与 YSS 前端 / 后端 skill 作为仓库规则或专项检查输入接入 Standards 轴，由 `review_standards_route` 按影响面编译；不再叠加第二个通用审查 skill。漏掉合同 `required_skills`、适用报告行空白、mandatory `violation` 未关闭或可机器检查规则既无工具结果也无原文引用时，不得 `completed`。
- 产品切片与模板维护共用同一 finding 闭环，强度分别绑定 Slice 合同与 L1 / L2 / L3。`violation`、机器检查失败、适用行空白由实现者在原合同路径修复，再重新捕获候选并全轴复审。`drift`、`new_impacts`、`required_skills` 与真实影响不一致时合同 `stale`，回 Router 或更早阶段，禁止在旧合同上继续编码。审查者不得写实现。`not-applicable` 仅当影响面未命中；命中后 mandatory 不得豁免，只允许修复或完整 `seam-deferred`。禁止为日常 Alibaba / YSS 新增生物人豁免门禁。
- 独立 Reviewer 必须与实现者不同实例，并在能执行已登记 `pnpm` / `./mvnw` 的运行时中审查。模板源 `.cursor/environment.json` 只服务模板校验，不替代实现仓审查运行时。不为此再创建第二个 Cloud 审查环境或 `/code-review` skill。
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

## Context Plan 与质量基线

实现合同先消费 `common.context_plan`：必需上下文只包含 `CONTEXT.md`、已批准 Spec、当前合同和适用 ADR / 工程基线；专项 references、实现仓库文件和历史证据按影响面按需加载。达到最小充分证据后停止扩展，缺失权威上下文只能 `blocked` 或 `reroute`。

质量标准由 `engineering-baseline` 以 `baseline_id` / `baseline_version` 定义一次，Slice Contract、YSS Skill Execution Result、`code-review` 和发布检查只引用它，并将约束结果写入 `constraint_results`。命中 API / 数据迁移、跨仓契约、发布回滚、实际安全行为或生命周期 / 生成语义时，必须在现有决策或审查记录中完成 Doubt-Driven 主张、反证、证据、残余风险和 Reviewer 引用；普通低风险变更不触发该流程。

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
