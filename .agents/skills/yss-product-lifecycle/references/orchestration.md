# 编排执行协议

## 有界推进循环

1. 按 `orchestration-contract.yaml.request_triage` 理解请求并选择模式，再识别仓库身份、任务规模和影响面；问题理解与澄清细节见 [请求分诊协议](request-triage.md)。
2. `setup readiness`：每个任务只执行一次，核对 tracker、五态标签和领域文档布局，并在本轮缓存结果；仅在 tracker、主远端、真实标签或配置变化时重查。
3. 加载父 Ticket/checkpoint 与真实资产，计算最近可信阶段。
4. 评估资产、门禁和 `stale`，选择第一个未阻塞工作单元。进入 `work-unit.slice-implementation` 前，必须先通过 `scripts/lib/lifecycle-transition.mjs` 的 Ticket 正式化、垂直切片绑定和合法 `next_route` 校验；父 Ticket、缺少垂直切片或 `ready-for-human` 的切片一律 `blocked`。
5. 执行最小生命周期工作单元：主控先按 `docs/process/schemas/digital-human-task-package.schema.json` 编译并校验任务包，再只实际调用允许的 model-invoked skill；原生工作单元可直接持有正式资产，Matt 兼容 user-invoked skill 仅作为 workflow reference，仍由用户显式启动。将结果归一化为 `Workflow Execution Result`，验收输出并回写状态与证据。任务包的 `contract.kind` 按工作单元选择；只有实现子任务使用 `slice-implementation` 并消费 Slice Implementation Contract，其他阶段不伪造该合同。
6. 若仍在授权和自动推进边界内，回到第 3 步；否则暂停。

不要仅输出下一个提示词后结束 `orchestrate`/`resume`。不要因进入业务代码阶段而退出主控；应把实现交给专项 skill，并在返回后继续核验。

连续阶段自动推进时累积 Ticket 同步和 Git 判断证据，在人工暂停、handoff、进入实现、合并或发布边界集中 checkpoint。发生阻塞、责任人变化或资产需要单独批准时立即落 checkpoint，不因合并记录而丢失阶段因果关系。

## 执行成本

执行策略以 `orchestration-contract.yaml.execution_efficiency` 为准，通过同一次 `query-lifecycle-context` 查询取得。Plan → Spec → Ticket 的耗时应分清脚本执行、Agent 读取与编排、人工等待；没有计时记录时不把总时长归因于摘要计算。

同一工作单元把 mode、stage、work-unit 和必要 include 放进一次查询。查询已给出的内容不再整份读取；已读资料在当前任务内未变化时复用，变化、新影响或恢复时重新加载。只问当前阶段尚缺且会影响判断的问题，独立问题可合并；依赖尚未形成资产的后续批准仍按用户决定协议逐边界取得。

资产写入稳定后、批准或流转前执行当前合同要求的验证。同一边界内，只有输入字节、上游、验证器/schema、参数和仓库根均已确认未变化且实际结果可读时，才引用已执行结果；不确定就重跑。每个工作单元仍生成并校验自己的 context reconciliation；恢复、交接、实现、合并和发布边界重新执行适用验证。`verify-*-scenarios` 与模板全量核验用于模板维护或明确的回归任务，不因产品阶段切换而重复执行；实例合同显式要求的检查仍须执行。

脚本命令、实际退出码和 duration_ms 记入已有 checkpoint 的验证证据；Agent 编排和人工等待仅在有计时来源时记录，否则标为 unknown。无需为耗时再建一套阶段产物。

## 阶段边界

Matt phase boundary 是工作阶段之间的上下文决策，不是新的生命周期状态。按以下顺序判断，第一项适用即停止判断：

1. **Continue**：下一阶段需要当前会话作为 primary source，或当前上下文仍在 smart zone 内。
2. **`/clear`**：当前探索、死路和决策对下一阶段完全无关。
3. **`/handoff`**：内容必须跨新 harness、新目录、同事或中途分叉的 side task 携带。
4. **Subagent**：工作单元边界清晰，可以在无人值守时完成并返回报告。
5. **`/compact`**：同一 harness、同一目录且上下文仍相关，但需要压缩后继续；它是最后选项。

在 checkpoint 记录 `phase_boundary.decision`；使用 `handoff`、subagent 或 `compact` 时同时记录契约要求的引用。phase boundary 不得改变生命周期阶段、门禁或 Ticket 五态。

## 原型到后端脚手架的接力

阶段 5 在技术分析后固定进入 `work-unit.implementation-repository-preparation`。编排器按 backend / frontend 影响逐项目展示已有或新建工程、Agent 推荐、仓库 scope、目标路径、Git 初始化、验证命令和风险，取得真实用户确认后再执行。已有工程调用 `implementation-repo-onboarding`；新后端按已确认架构调用对应生成器；新前端调用 `yss-frontend-scaffold-generator`。默认 `external-repository`，`harness-apps` / `git-submodule`、`git init` 和远端仓库创建均须显式选择或授权。

所有命中项目必须达到 `existing-and-onboarded` 或 `initialized-and-verified`，未命中的交付面必须有带原因的 `not-applicable`。聚合结果、Manifest、验证和 onboarding 证据必须可读且当前；否则 `check.implementation-repositories-ready` 阻断 Ticket 正式化。旧实例恢复时保留已有 Ticket，但将相关 Ticket / Slice Contract 标为 `blocked` / `stale` 并返回本工作单元。

`prototype_confirmation` 通过后，先判断实现仓库登记中的 backend `scaffold_status`。当状态为 `required` 时，在工程基线中先完成脚手架架构选择：Agent 按领域复杂度给出 `domain-driven` / `layered-mvc` 推荐和依据，本体选择作为子项目预填默认值，用户通过批量表确认全部项目或逐项覆盖。选择写入 `scaffold-architecture-decisions.yaml`；处于 `undecided`、`recommended`、`awaiting-user-decision` 或 `stale` 时必须阻断，不得默认 DDD，也不得在生成器内交互。

选择达到 `lifecycle-approved` 且 digest 当前后，由 `yss-implementation-contract-compiler` 编译脚手架 schema v3 `controlled-generation` 工作单元合同，生命周期批准并持久化后才能运行对应生成器。顺序为：工程基线与架构推荐 → 用户确认与选择持久化 → 实现合同编译器脚手架合同 draft → 生命周期批准/持久化 → `domain-driven` 使用 `yss-ddd-scaffold-generator` 或 `layered-mvc` 使用 `yss-layered-mvc-scaffold-generator` → 对应基线/Manifest v3 校验 → 实现合同编译器业务合同重编译。`existing` / `initialized` 不重复生成；架构转换必须单独立项。

脚手架工作单元必须使用结构化 schema v3 合同 JSON，至少记录 `contract_id`、`contract_version`、`scaffold_request_id`、`architecture_family`、`generator_skill`、`decision_ref/id/digest`、Profile、能力模块闭包、实现合同编译器 draft 引用、生命周期批准引用、持久化引用、当前版本、允许写路径、预期证据文件和验证命令；不得使用 `slice_id` 伪造工程基线身份。生成器必须读取合同和决策文件并校验状态、digest、版本、skill、工作模式与固定命令。三条 Wrapper 命令必须由受控工作单元真实执行，逐条留存 `exit_code`、`duration_ms`、stdout/stderr 引用和执行时间；生成器打印的下一步命令不构成证据。非空目标、`--force`、旧项目迁移和模板升级均阻断。脚手架不得生成业务规则、状态机、权限、事务、复杂查询、错误映射、用户可见行为或示例业务 API；`validate` 通过、输出目录存在或生成器成功都不是生命周期批准、架构放行或 `ready-for-agent`。

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

- `work-unit.technical-analysis` 由 `yss-technical-design` 组织后端技术设计，先按项目确认架构，再调用 DDD `yss-tactical-design` 或传统 MVC `yss-mvc-design`。状态、规则、一致性、持久化影响本身不意味着选择 DDD。无后端技术设计影响记录带原因的 `not-applicable`，其他 API / 前端技术分析继续各自路由。新合同使用 `artifact.technical-design`，通过 `evidence.technical-design-review` 回交现有架构审查；旧 DDD 稳定 ID 只读兼容。批准仍由生命周期维护，编译器消费批准且当前的设计起草实现合同；`stale`、`drift` 或 `new_impacts` 时不得继续 Ticket 正式化。

- `work-unit.plan-requirements` 实际调用 `grilling` 和 `domain-modeling`；`work-unit.plan-opportunity` 按事实类型路由 `competitive-intelligence` 或 `yss-research`。`yss-research:quick` 只用于探索；外部证据进入领域战略、阶段决策或其他生命周期批准输入前必须升级为 `evidence-audited`。生命周期原生工作单元默认负责 Spec、Ticket 和实现资产；`to-spec`、`to-tickets`、`implement` 仅保留为显式兼容入口，结果必须回交生命周期验收。
- 原生 `work-unit.ticket-decomposition` 只能在 OpenAPI Freeze 或无 API 影响记录后创建垂直切片，初始 Ticket 状态统一为 `ready-for-human`；生命周期复算完整公式后才能提升 `ready-for-agent`。该工作单元必须返回 `ticket_decomposition_result_ref` 和垂直切片引用，并作为实现的必经前置证据。
- 原生 `work-unit.slice-implementation` 必须在生命周期批准并持久化 Slice Implementation Contract 和 Build Architecture Checklist 后执行；用户显式 `implement` 仍走兼容入口，不得绕过生命周期。
- `Workflow Execution Result.next_route` 必须通过生命周期转换校验；Spec、原型和技术分析不得直接跳转到 Ticket 正式化或实现，必须先完成 `work-unit.implementation-repository-preparation`，再进入 `work-unit.ticket-decomposition`。
- `implement` 遇到 backend `scaffold_status=required` 时，还必须满足原型确认后的脚手架策略：脚手架 Execution Result、`yss-backend-scaffold-parent` 基线、Wrapper 验证和 实现合同编译器 合同重编译均已回写；否则停在工程基线，不得写业务代码。
- `Workflow Execution Result` 出现 `drift`、`new_impacts`、`stale_candidates`、`violation`、`missing_evidence`、空 `evidence_refs` 或缺少必需字段时暂停当前工作单元；旧结果只能先经只读兼容 adapter 归一化。

## 审查与验证

- 调用 `code-review` 前先固定 review input：`review_mode`、`review_base_ref`、`implementation_candidate_ref`、`candidate_snapshot_ref`、`candidate_digest`、Spec/Ticket、Slice Implementation Contract、Build Architecture Checklist 和 YSS Skill Execution Result 引用。`committed` 模式审查不可变 `HEAD`；`worktree` 模式一次捕获 committed、staged、unstaged 和 untracked 内容。必须按 `orchestration-contract.yaml.review_input` 的 manifest 按模式必填字段及 `yss-worktree-candidate-v1` 字节流（raw path、uint64 big-endian 长度、tracked/untracked record）计算 SHA-256，两个 Reviewer 必须消费同一不可变快照。返回后或完成 checkpoint 摘要变化时返回 `blocked`，由编排器决定重新审查。候选为空、漏项或 fixed point 不可解析时阻断。
- 小改动和中等变更可由同一独立执行者完成 `code-review` 与 fresh verification，并在同一报告中分别记录 findings、命令、结果和残余风险。
- 该执行者必须独立于实现者；新模块、高风险变更、职责冲突或需双人控制时，Reviewer 与 Verifier 分开。
- `code-review` 是唯一默认代码审查 skill。GitLab、CI、Sonar、Alibaba Java 与 YSS 前端 / 后端 skill 作为仓库规则或专项检查输入接入 Standards 轴，由 `review_standards_route` 按影响面编译；不再叠加第二个通用审查 skill。漏掉合同 `required_skills`、适用报告行空白、mandatory `violation` 未关闭或可机器检查规则既无工具结果也无原文引用时，不得 `completed`。
- 产品切片与模板维护共用同一 finding 闭环，强度分别绑定 Slice 合同与 L1 / L2 / L3。`violation`、机器检查失败、适用行空白由实现者在原合同路径修复，再重新捕获候选并全轴复审。`drift`、`new_impacts`、`required_skills` 与真实影响不一致时合同 `stale`，回 实现合同编译器 或更早阶段，禁止在旧合同上继续编码。审查者不得写实现。`not-applicable` 仅当影响面未命中；命中后 mandatory 不得豁免，只允许修复或完整 `seam-deferred`。禁止为日常 Alibaba / YSS 新增生物人豁免门禁。
- 独立 Reviewer 必须与实现者不同实例，并在能执行已登记 `pnpm` / `./mvnw` 的运行时中审查。模板源 `.cursor/environment.json` 只服务模板校验，不替代实现仓审查运行时。不为此再创建第二个 Cloud 审查环境或 `/code-review` skill。
- UI 影响切片将 `UI fidelity` 作为 `code-review` 的条件第三轴；任何修复都会使候选摘要失效，必须重新捕获候选并重跑 Standards、Spec、UI fidelity 和 fresh verification。

## Git 授权

实现授权、`orchestrate`/`resume` 的有界写入、当前分支和 Git checkpoint 都不蕴含 commit 或 push 授权。执行 commit 前必须同时取得 `commit_authorized=true`、非空 `commit_scope` 和 `commit_authorization_ref`；执行 push 前必须同时取得 `push_authorized=true`、非空 `push_scope` 和 `push_authorization_ref`。任一缺失时只记录 checkpoint 判断并保持 Git 状态不变；负责人要求、时间压力、测试通过或“本地 commit 可逆”都不能补足用户授权。

`repository_scope: git-submodule` 时授权按仓分别计算：禁止在 detached HEAD 提交；commit / push 顺序必须先子仓、再父仓 gitlink（`superproject-gitlink-update`）；父仓 push 使用 `git push --recurse-submodules=check`。空 gitlink、detached HEAD、`--force` 覆盖挂载点不得当成普通目录脚手架，也不得把实现源码复制进 Harness。登记字段必须能与 `harness-apps` / `external-repository` 区分，并对照工作树 gitlink。

## 用户决定与恢复

关键决定使用 [真实用户回复协议](user-decisions.md)，消费角色注册表的 `user_decision_policy`。会签前先形成可审阅资产；恢复、阶段流转、实施派发和发布时校验原始回复及当前资产摘要。普通会签的数字人审查与用户决定分别保留，关键决定不得以数字人会签、无反对意见或超时放行。等待只阻断依赖事项；新的 `user_decisions` 引用通过 Workflow Execution Result、checkpoint 和任务包传递。

## 必须暂停

- 注册表中的聚合门禁等待会签裁决（数字人或生物人，以 `docs/agents/digital-human-roles.yaml` 的 `gate_policy` 为准）。暂停输出必须包含：门禁 ID、指定 `role_id`、`runtime_id`、会签文件路径。恢复前执行 `scripts/verify-approval-record --require-approved`；角色错误、起草者自签或生物人门禁被数字人关闭时返回 `blocked`，不得标 `approved`。
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

进入 `to-spec` 前必须区分已确认项与未决项，并确认用户、问题、MVP、非目标、成功标准、术语/ADR 候选和测试 seam。事实问题走 `yss-research`；需 runnable 反馈的问题走 `handoff → prototype → handoff`。存在未回流 blocker 时不得进入 Spec baseline。

Prototype 回流必须有可核验证据：来源 handoff、prototype 资产或运行记录、结论、被更新的 Spec/设计/ADR/Ticket 引用、剩余未决项和返回 handoff。仅在对话中声称“已验证”不算回流完成。

Matt `prototype` 的回流还必须注明 `prototype_branch`，并保留单文件 HTML 主来源；该结果只能作为 YSS 原型输入，仍须完成阶段 4 的低保真评审、H1/H2 档位路由、schema v3 验证和用户确认，不得用 throwaway prototype 替代。

`to-questionnaire` 未收到答案时使用 `external-input-required` 暂停，记录问卷、接收人、所需输出和恢复路由；收到答案后记录 response、重新分类影响面和更新后的权威资产，再回到 `grill-with-docs` 或 `to-spec`。

Release 与 Retrospective 属于生命周期编排器拥有的工作单元。发布和复盘前都必须重新取得 fresh verification；发布还需要发布/回滚证据和独立审查，复盘还需要复盘记录和治理回流判断，再回流权威资产。

## 聚合门禁和检查证据

`gates` 仅记录正式批准 / 验收；`checks` 记录内部专业审查、自动前置核验和就绪计算。检查职责读取角色表 `check_reviews` / `automatic_checks`，命中项失败仍阻断。Plan 内部审查使用入口审阅包的 `internal_checks`，统一以 `gate.plan-approved` 获取用户决定。工程契约审查通过并批准当前版本后同时冻结 OpenAPI，冻结准备不单独索取批准。

Checkpoint 中已批准门禁必须带 `basis: [{ref, digest}]` 和按 `evidence.*` 分类的 `evidence` 引用数组；此处 digest 是实际文件字节的 64 位十六进制 SHA-256。每个适用检查带 `applicable: true`、通过状态和同样的证据绑定；不适用项须 `applicable: false`、原因和影响面证据。内部专业审查还须 `approval_ref`、`subject_ref`、`approval_scope`，审查记录带 `subject_digest` 和不同于 `principal_ref` 的 `drafter_principal_ref`。

聚合门禁的 `subject_ref` 指向当前审阅包，包含 `gate_id` 和 `basis`，覆盖所有检查及其他验收依据；用户批准绑定此包，专业会签记录绑定其 `subject_digest`。检查证据、审阅包和会签记录均纳入 checkpoint 的摘要绑定，避免只改变检查结果却复用旧批准。`scripts/verify-lifecycle-checkpoint` 实际核验；旧 gate ID 只允许历史读取或按源策略校验外部冻结包，不能直接关闭当前门禁。

交付验收可由测试角色完成；实际合并、推送和发布分别执行已有外部动作授权检查。阶段完成不请求发布权限。没有相关资产、依据或范围变化时复用现有批准；相关变化仅失效受影响批准。

## 专项合同加载索引

专项加载提示：实现仓库与脚手架查询 `implementation_repository_preparation`、`backend_scaffold`；切片实现查询 `ticket_formalization`、`ready_for_agent`；UI 查询 `frontend_implementation_plan`、`frontend_implementation_verification`；审查查询 `review_input`；发布查询 `release_readiness`、`git_authorization`、`user_decision_evidence`；战略交接读取 `docs/process/strategic-handoff-package.md` 并按其中验证器执行。
