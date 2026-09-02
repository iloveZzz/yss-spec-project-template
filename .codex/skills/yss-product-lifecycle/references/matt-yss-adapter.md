# Matt / YSS 工作流适配

Matt skills 决定如何工作；YSS 生命周期决定是否允许推进；YSS 专项 skills 决定如何符合工程规范。

生命周期默认使用 `work_unit_routes.*.native`；下表中的 Matt flow 是 `work_unit_routes.*.compatibility` 显式兼容输入。兼容入口的正式资产由用户创建并回交生命周期验收，原生工作单元的正式资产由生命周期编排器创建。

## 入口与仓库身份裁决

- 所有入口先读取 `yss-project.yaml`。缺失、解析失败、schema 不支持或 `repository_mode` 非法时，停止路由并进入 migration-check。
- **直接调用 `ask-matt`** 时，它只能提供通用 Matt flow 导航，不得写生命周期资产、改变门禁或 Ticket 状态；有效 YSS 仓库必须在任何写入前把最终阶段、影响面、门禁和状态裁决交回 `yss-product-lifecycle`。
- **直接调用生命周期管理的 Matt user-invoked skill**（`setup-matt-pocock-skills`、`grill-with-docs`、`to-spec`、`to-tickets`、`implement`）时，用户仍是正式资产的创建者；生命周期先校验前置条件，再接受结果并重新计算阶段、门禁和状态。它们不适用 `ask-matt` 的 `navigate-only` 限制。其他 user-invoked skill 同样不得由生命周期自动调用；只有在其专属适配合同存在时才进入 YSS 流程。
- **直接调用 `yss-product-lifecycle`** 时，不机械嵌套调用任何 Matt user-invoked skill；编排器直接使用原生工作单元和允许的 model-invoked 原语。Matt user-invoked skill 保持显式兼容入口，生命周期负责准备、校验并验收其结果。
- `template-source` 只允许进入模板维护流程。命中 `to-spec`、`to-tickets`、`implement`、Release 或 Retrospective 时返回 `blocked`，原因是 `template-source-product-artifact-forbidden`；`ask-matt` 和 `setup-matt-pocock-skills` 都不得为具体产品生成 Spec、prototype、OpenAPI 或垂直切片 Ticket。
- `project-instance` 才允许进入产品 Discovery → Spec → 设计 → 契约 → Ticket → 实现 → Release / Retrospective 链路。

| 情形 | Matt flow | 生命周期验收 |
|---|---|---|
| 首次启用或配置缺失 | `setup-matt-pocock-skills`（用户显式） | `needs-human`，说明缺失项；用户完成 setup 后重新计算 readiness |
| 通用入口 | `ask-matt` | 检测到 YSS 后由本编排器最终裁决 |
| 需求澄清 | `grill-with-docs`（用户显式）或 `grilling`、`domain-modeling`（生命周期原语） | 按退出判定检查未决项和回流 |
| 信息在其他人手中 | `to-questionnaire` | 使用 `external-input-required` 暂停；答案回流后记录 response、重新分类影响面，再进入 `grill-with-docs` 或 `to-spec` |
| 大型模糊工作 | `wayfinder`（可选） | 仅在跨会话 / 跨 Agent 或 frontier 不清晰时启用；map 真正完成后 `handoff → to-spec` |
| 技术事实 | `research` | 一手资料回填 Spec/OpenAPI/架构/ADR |
| runnable 问题 | `prototype` | 生成单文件可分享 HTML，保留 `prototype/<name>` 分支作为主来源；必须 source/return handoff 和结论回填，不得替代阶段 4 的低保真评审、Ant Design v6 高保真 HTML、AntD CLI 证据和用户确认 |
| Spec 综合 | 原生 `work-unit.spec-synthesis`；`to-spec`（用户显式兼容） | 初稿进入 `ready-for-human`，不得直接实现 |
| 切片 | 原生 `work-unit.ticket-decomposition`；`to-tickets`（用户显式兼容） | 仅在冻结/无影响记录后拆垂直切片，初始 Ticket 状态为 `ready-for-human` |
| 实现 | 原生 `work-unit.slice-implementation`；`implement`（用户显式兼容） | 当前合同批准并持久化后执行；内部使用 `tdd`，结果回交后再次核验 |
| Bug | `diagnosing-bugs`、`tdd` | 先建立红色反馈；高风险影响升级上游门禁 |
| 审查 | `code-review` | 唯一默认代码审查入口；审查者独立且不得写实现；Standards 消费 Spec、仓库治理规则、Slice `required_skills` 和 YSS / Alibaba 专项检查输入；finding 按合同分流修复或 stale 回 Router |
| 跨上下文 | `handoff` | 保存来源、阶段、未决项、命令和下一责任人 |
| 阶段边界 | `PHASE-BOUNDARIES.md` | 按 `Continue → /clear → /handoff → subagent → /compact` 选择上下文动作；只记录证据，不扩展生命周期状态 |
| 解释未落地 | `wait-what` | 只重新解释当前结论，不改变阶段、门禁、Ticket 或 `ready-for-agent` |
| 人工步骤 | 人工 checkpoint | 记录 Agent 无法替代的点击、审批、凭据和迁移步骤；秘密值必须隐藏并脱敏 |
| 编写 Agent 文档 | `writing-for-agents`；维护 skill 时使用 `maintaining-skills` | 共享 skill 只改 `.agents/skills`；流程文档保持简体中文 |

尽量不修改 Matt skill 以复制 YSS 规则。只有它违反模板硬门禁时才做最小兼容修改。

Router 只能返回 `draft`、`blocked` 或 `ready-for-lifecycle-review`，不得自行批准合同、设置 `ready-for-agent` 或宣布完成。`new_impacts`、`drift`、`violation`、越界路径或缺失实际验证会暂停当前工作单元，并由本编排器决定增量重路由、完整重路由或回到更早生命周期阶段。

## Workflow Execution Result

生命周期工作单元必须输出 `Workflow Execution Result`，再由编排器验收。旧 `Matt Skill Result` 仅可通过只读 compatibility adapter 归一化，且不得影响路由或作为行为基线；workflow reference 不表示调用了对应 Matt user-invoked skill。结果至少包含：

```yaml
result_schema: workflow-execution-result-v1
work_unit: work-unit.spec-synthesis
workflow_reference:
  source: mattpocock/skills
  skill: to-spec
  invocation_mode: reference
result: completed # completed / blocked / needs-human / failed
evidence_refs:
  - docs/process/yss-product-lifecycle-orchestrator-validation.md
changed_artifacts: []
new_impacts: []
stale_candidates: []
next_route: <next-work-unit-or-null>
blocking_signals: []
```

存在 `drift`、`new_impacts`、`violation`、`missing_evidence` 或 `stale_candidates`，以及证据缺失时，不得返回 `completed`；必须暂停并由编排器决定增量重路由、完整重路由或回到更早阶段。

Router 状态映射为：`draft → completed`、`blocked → blocked`、`ready-for-lifecycle-review → needs-human`。这里的 `completed` 只表示 Matt 工作单元已产出可验收结果，不表示生命周期完成或可发布。

`completed` 的 `evidence_refs` 至少包含一条可读取或可解析的证据引用；只有字段存在但为空，不能证明工作单元完成。兼容入口下的正式 Spec、Ticket 或实现资产仍只能由对应显式用户入口创建；原生工作单元由生命周期编排器创建并持有状态。

## Matt flow 前置条件

| Matt flow | 进入条件 | 生命周期结果 |
|---|---|---|
| `to-spec`（用户显式） | Discovery work unit 或 `grill-with-docs` 已满足退出条件，且不存在未回流 runnable blocker；用户问题、MVP/非目标、成功标准、测试 seam 和术语审查均有证据 | 生命周期只准备/验收；Spec 初稿为 `ready-for-human`，不等于批准 |
| `to-tickets`（用户显式） | OpenAPI Freeze 或 `no-api-impact` 记录、必要门禁、垂直切片范围和阻塞边均已明确 | 生命周期只准备/验收；只能生成垂直切片 Ticket，初始统一为 `ready-for-human`；必须留下 `ticket_decomposition_result_ref` 和 `vertical_slice_ticket_ref` |
| `implement`（用户显式） | `ready-for-agent` 公式、Ticket 正式化结果、垂直切片引用/类型/状态、Contract 已批准/持久化/版本一致、Build Architecture Checklist、实现仓库/分支/CI/验证命令/回滚点，以及后端 Contract（适用时）均满足 | 生命周期只准备/验收；单会话实现同样适用，不得绕过门禁；父 Ticket、`ready-for-human` 切片或跳过 Ticket 正式化的 `next_route` 必须 `blocked` |

`grill_exit` 不是“已经聊过”的自然语言声明。它必须同时证明 frontier 为空、事实已解决或分别路由到 `research` / prototype / external input、用户决策已确认、双方共同理解已确认，并且没有未回流的 runnable blocker。

## Review 候选与 Git 授权

YSS 调用 `code-review` 前必须形成 review input，至少包含 `review_mode`、`review_base_ref`、`implementation_candidate_ref`、`candidate_snapshot_ref`、`candidate_digest`、`spec_ref`、`ticket_ref`、`slice_contract_ref`、`build_architecture_checklist_ref` 和 `yss_execution_result_refs`，并满足 `orchestration-contract.yaml.review_input.manifest_required_by_mode`。Standards 还必须编译 `review_standards_route`：合同 `required_skills`、影响面专项检查输入、报告模板与 `finding_disposition`；机器检查按 `run_if_present` 执行。质量标准只从 `engineering-baseline` 引用，禁止在 review input 或切片中另起一份。命中高风险影响时，review input 还要引用 Doubt-Driven 主张 / 反证记录；缺少反证或残余风险未处理时返回 `blocked`。`committed` 审查 merge-base 到不可变 `HEAD`；`worktree` 一次捕获 merge-base 到 working tree 的 committed、staged、unstaged 和 untracked 内容，使用 `yss-worktree-candidate-v1` 规定的 raw path、uint64 big-endian 长度、tracked/untracked record 和不支持条目阻断规则计算 SHA-256，让两个 Reviewer 消费同一不可变快照，并在返回和完成 checkpoint 复核摘要未变化。缺少输入、候选为空、专项覆盖缺失、未关闭 mandatory `violation`、适用行空白或摘要变化时返回 `blocked`，不能缩小审查范围、另起通用审查 skill、由审查者改实现，或合并不同候选的结论。`violation` 类 finding 交实现者在原合同路径修复后全轴复审；`drift` / `new_impacts` 使合同 `stale` 并回 Router。

Matt `implement` 的通用提交指令不构成 YSS Git 授权。只有用户明确给出 `commit_authorized` 为 `true`、非空 `commit_scope` 和 `commit_authorization_ref` 时才能 commit；只有明确给出 `push_authorized` 为 `true`、非空 `push_scope` 和 `push_authorization_ref` 时才能 push。缺少任一字段时保持工作区不变，只输出 checkpoint 判断；不得把 `orchestrate`、实现授权、当前分支、测试通过或负责人要求解释为隐含授权。`git-submodule` 还必须按仓授权、禁止 detached HEAD 提交，并先推子仓再更新父仓 gitlink。

“然后 commit”“做完提交”“可以帮我提交”等自然语言意向本身不是结构化授权。编排器必须取得上述三个 commit 字段；不能先把意向解释成授权，再在完成时补 scope 或引用。

## Setup readiness

编排器先做幂等 readiness 检查。`missing` 时不得调用 `setup-matt-pocock-skills`，而是结构化暂停并请用户显式运行它。检查结果只能是：

`ready`、`missing`、`conflict`、`degraded`、`not-applicable`。

该检查每个任务只执行一次并缓存；只有 tracker、主远端、真实标签或配置变化时重查。

证据必须覆盖实际 platform、五态 `label_check` 或 Local `Status:` 检查、`domain_layout`、`artifact_root` 和 `migration_ref`。已持久化 tracker 配置优先于主远端；配置之间或真实标签/Local 状态之间冲突时不覆盖。Local 主 tracker 使用 `docs/.scratch/<feature>/` 完整功能包，不要求远程 Ticket；根 `.scratch/` 与 `docs/requirements/tickets/` 只可作为旧路径迁移来源。仅发现旧路径资产时返回迁移所需结果并暂停写入；新旧路径同时存在时返回 `conflict`。已选择的 GitHub/GitLab 暂不可用时才保留“待发布平台”草案，并在父 Ticket 保留目标平台、`publication: pending` 和 `pending_publication_to`。`template-source` 只执行 validate-only，不初始化具体产品 tracker。

当 YSS 生命周期处于 active 状态时，Matt `to-spec` 中独立运行时的 `ready-for-agent` 发布提示由本适配层覆盖为 `ready-for-human`：Spec 必须先经过产品总体设计 / 功能架构、必要的设计与契约门禁，之后才由生命周期编排器决定垂直切片 Ticket 的 `ready-for-agent`。这只约束 YSS 编排下的状态写入，不修改 Matt skill 单独运行时的核心行为。

`setup-matt-pocock-skills` 仅由用户显式启动。readiness=`missing` 时返回 `needs-human`、`requested_skill=setup-matt-pocock-skills` 和 `resume_route=setup-readiness`；仅发现旧路径资产仍进入 migration-check 并暂停写入。`ready` 直接继续，`conflict` 进入迁移裁决，`degraded` 保留待发布草案，`not-applicable` 仅验证模板契约。通用 setup 文案与 YSS tracker 合同冲突时，以 `docs/agents/issue-tracker.md` 和本编排契约为准。

### Local Markdown 兼容映射

当 `docs/agents/issue-tracker.md` 的 `platform` 为 `local-markdown` 时，Matt flow 的本地输出归一化为以下 YSS 载体：

| Matt 产物 | Local 载体 |
|---|---|
| Discovery | `docs/.scratch/<feature>/discovery/` |
| Spec | `docs/.scratch/<feature>/spec.md` |
| Spec Delta | `docs/.scratch/<feature>/spec-delta/` |
| 功能父 Ticket | `docs/.scratch/<feature>/parent-ticket.md` |
| Wayfinder map | `docs/.scratch/<feature>/map.md` |
| 垂直切片 Ticket | `docs/.scratch/<feature>/issues/NN-<slug>.md` |
| 设计 / API / 架构草案 | `docs/.scratch/<feature>/design/`、`api/`、`architecture/` |
| 门禁 / 验证 / checkpoint | `docs/.scratch/<feature>/gates/`、`verification/` |

Local Ticket 的文件路径是稳定身份，顶部 `Status:` 保存 Matt 五态；远程 URL 只作为显式镜像引用。`ready-for-agent` 仍只能由生命周期编排器在所有必要门禁、阻塞边、实现上下文和 Slice Implementation Contract 满足后设置。

## Phase boundary 优先级

Matt 的上下文建议不能覆盖 YSS 的 phase-boundary 契约。固定按 `Continue → /clear → /handoff → subagent → /compact` 判断，`/clear` 不是每个 Ticket 的强制动作；任何选择都不得改变生命周期阶段、门禁或 Ticket 五态。

## Release / Retrospective

Release 和 Retrospective 是生命周期编排器拥有的工作单元，不由 `ask-matt` 的默认 `idea → ship` 流程隐式完成。进入发布或完成结论前必须重新取得 fresh verification、发布/回滚证据和独立审查结果；复盘同样必须有 fresh verification，再按模板治理规则回流 `AGENTS.md`、`CONTEXT.md`、ADR 或 Skill。
