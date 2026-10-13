# Matt / YSS 工作流适配

Matt skills 决定如何工作；YSS Strategic Design 决定是否允许推进；YSS 专项 skills 决定如何符合产品与设计规范。

生命周期默认使用 `work_unit_routes.*.native`；下表中的 Matt flow 是 `work_unit_routes.*.compatibility` 显式兼容输入。兼容入口的正式资产由用户创建并回交生命周期验收，原生工作单元的正式资产由生命周期编排器创建。

## 入口与仓库身份裁决

- 所有入口先读取 `yss-project.yaml`。缺失、解析失败、schema 不支持或 `repository_mode` 非法时，停止路由并进入 migration-check。
- **直接调用 `ask-matt`** 时，它只能提供通用 Matt flow 导航，不得写生命周期资产、改变门禁或 Ticket 状态；有效 YSS 仓库必须在任何写入前把最终阶段、影响面、门禁和状态裁决交回 `yss-strategic-design`。
- **直接调用兼容入口**（`ask-matt`、`to-spec`、`to-tickets`、`triage`、`wayfinder`）时，用户仍是正式资产的创建者；战略编排器先校验前置条件，再接受结果并重新计算阶段、门禁和状态。它们不得自动调用，也不得越过 Strategic Design Handoff。
- **直接调用 `yss-strategic-design`** 时，不机械嵌套调用任何 Matt user-invoked skill；编排器直接使用原生工作单元和允许的 model-invoked 原语。
- `template-source` 只允许进入模板维护流程。命中 `to-spec`、`to-tickets`、Release 或 Retrospective 时返回 `blocked`，原因是 `template-source-product-artifact-forbidden`；所有兼容入口都不得为具体产品生成超出本 profile 的资产。
- `project-instance` 才允许进入 Plan → DDD 战略设计 → Spec → 产品设计 → 业务 Ticket → Strategic Design Handoff 链路。

| 情形 | Matt flow | 生命周期验收 |
|---|---|---|
| 首次启用或配置缺失 | `setup-matt-pocock-skills`（用户显式） | `needs-human`，说明缺失项；用户完成 setup 后重新计算 readiness |
| 通用入口 | `ask-matt` | 检测到 YSS 后由本编排器最终裁决 |
| 需求澄清 | 原生需求澄清按 `planning.clarification_policy` 主动调用 `grilling`；术语整理按需使用 `domain-modeling`（生命周期原语） | 分流事实、实验和专业问题；按退出判定检查未决项、真实回复和回流 |
| 信息在其他人手中 | 生命周期外部输入问卷 | 使用 `external-input-required` 暂停；答案回流后记录 response、重新分类影响面，再进入 原生需求澄清 或 `to-spec` |
| 大型模糊工作 | `wayfinder` | map 真正完成后 `handoff → to-spec` |
| 技术或战略事实 | `yss-research`（`research` 为 deprecated alias） | `technical-evidence` 核验一手技术资料；`strategy-evidence` 为领域战略和阶段决策提供可审计证据；研究包不得自行修改或批准下游资产 |
| runnable 问题 | `prototype` | 生成单文件可分享 HTML，保留 `prototype/<name>` 分支作为主来源；必须 source/return handoff 和结论回填，不得替代阶段 4 的低保真评审、Ant Design v6 高保真 HTML、AntD CLI 证据和用户确认 |
| Spec 综合 | 原生 `work-unit.spec-synthesis`；`to-spec`（用户显式兼容） | 初稿进入 `ready-for-human`，不得直接实现 |
| 业务级 Ticket | 原生 `work-unit.business-ticket-formalization`；`to-tickets`（用户显式兼容） | 形成业务能力/用户行为级 Ticket，初始状态为 `ready-for-human` |
| 实现 | 下游研发 profile 的 `work-unit.slice-implementation` | Strategic Design Handoff 后移交；当前分支不提供 `implement` |
| Bug / 失败诊断 | `diagnosing-bugs` | 先建立可复现反馈；若暴露战略资产漂移，则回到对应上游工作单元 |
| merge / rebase 冲突 | `resolving-merge-conflicts` | 只处理当前 Harness 的资产冲突；发现语义漂移时暂停并重算影响面 |
| 跨上下文 | `handoff` | 保存来源、阶段、未决项、命令和下一责任人 |
| 阶段边界 | `PHASE-BOUNDARIES.md` | 按 `Continue → /clear → /handoff → subagent → /compact` 选择上下文动作；只记录证据，不扩展生命周期状态 |
| 解释未落地 | 普通解释对话 | 只重新解释当前结论，不改变阶段、门禁、Ticket 或 `ready-for-agent` |
| 人工步骤 | 人工 checkpoint | 记录 Agent 无法替代的点击、审批、凭据和迁移步骤；秘密值必须隐藏并脱敏 |
| 编写 Agent 文档 | `writing-for-agents`；维护 skill 时使用 `maintaining-skills` | 共享 skill 只改 `.agents/skills`；流程文档保持简体中文 |

尽量不修改 Matt skill 以复制 YSS 规则。只有它违反模板硬门禁时才做最小兼容修改。

任何下游 Router / 实现合同结果都不是本 profile 的本地输入。`new_impacts`、`drift`、`violation`、越界路径或缺失实际验证会暂停当前工作单元，并由本编排器决定增量重路由、完整重路由或回到更早生命周期阶段。

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
  - .template-spec/process/strategic-design-orchestrator-validation.md
changed_artifacts: []
new_impacts: []
stale_candidates: []
next_route: <next-work-unit-or-null>
blocking_signals: []
```

存在 `drift`、`new_impacts`、`violation`、`missing_evidence` 或 `stale_candidates`，以及证据缺失时，不得返回 `completed`；由编排器调查实际变化和依赖，修复、补证据或更新受影响合同后定向复审并重新绑定当前候选；未知影响先调查，禁止默认或兜底全轴复审。

Router 状态映射为：`draft → completed`、`blocked → blocked`、`ready-for-lifecycle-review → needs-human`。这里的 `completed` 只表示 Matt 工作单元已产出可验收结果，不表示生命周期完成或可发布。

`completed` 的 `evidence_refs` 至少包含一条可读取或可解析的证据引用；只有字段存在但为空，不能证明工作单元完成。兼容入口下的正式 Spec 或业务 Ticket 仍只能由对应显式用户入口创建；原生工作单元由生命周期编排器创建并持有状态。

## Matt flow 前置条件

| Matt flow | 进入条件 | 生命周期结果 |
|---|---|---|
| `to-spec`（用户显式） | Plan work unit 或 原生需求澄清 已满足退出条件，且不存在未回流 runnable blocker；用户问题、MVP/非目标、成功标准、测试 seam 和术语审查均有证据 | 生命周期只准备/验收；Spec 初稿为 `ready-for-human`，不等于批准 |
| `to-tickets`（用户显式） | 必要门禁、业务范围、验收标准、依赖和风险均已明确 | 生命周期只准备/验收；只能生成业务级 Ticket，初始统一为 `ready-for-human` |
| `implement`（已移除） | 不适用 | 直接返回 `blocked`，转交下游研发 profile |

`grill_exit` 不是“已经聊过”的自然语言声明。主动调用、问题分流、依赖分轮和纠正重开以 `planning.clarification_policy` 为唯一执行策略；完整退出仍须证明 frontier 为空、事实已解决或分别路由到 `yss-research` / prototype / external input、用户决策已确认、双方共同理解已确认，并且没有未回流的 runnable blocker。路由尚未回流的事实不能冒充已解决的关键项。

审阅包内 `checks.grill_exit=passed` 仅表示澄清材料与前置条件就绪。主控固定完整包后，展示共同理解、解决证据、延期项、范围、风险和进入 Spec 的动作，合并取得最终共同理解与 `gate.plan-approved` 的一次真实回复。外部 `plan_user_decision_ref` 绑定当前包，不写回包内 `basis`；完整退出由入口结合当前决定判断。没有最终回复时仍等待，澄清结束不能自行批准 Plan 或绕过入口验证。

## 战略资产审查与 Git 授权

本 profile 只审查领域战略、阶段决策包、Spec、H1/H2 原型、业务 Ticket 和 Strategic Design Handoff。原型必须由独立 `prototype-review` 审查，其余稳定资产按数字人会签合同验收；代码候选、Slice Contract 与实现审查输入属于下游研发 profile。

Matt flow 的通用提交指令不构成 YSS Git 授权。执行 commit 必须同时具备 `commit_authorized=true`、非空 `commit_scope` 和 `commit_authorization_ref`；执行 push 必须同时具备 `push_authorized=true`、非空 `push_scope` 和 `push_authorization_ref`。commit 与 push 分别检查，commit 授权不包含 push。`git-submodule` 还必须按仓授权、禁止 detached HEAD 提交，并先推子仓再更新父仓 gitlink。

编排器可以从具体 Git 动作、仓库和改动范围明确的真实用户回复整理成上述三字段，保留可读原始来源，不要求用户再填写内部字段；原始回复和会签证据仍按本 profile 现有协议核验。结合可读原始上下文，指向明确范围的“做完提交”可整理为 commit 授权；泛泛的“继续”、`orchestrate`、当前分支或测试通过不能补足动作和范围。字段缺失、来源不可读、授权撤回或动作超出范围时不执行对应 Git 动作，只记录 checkpoint 判断；不得补造同意或扩大原回复范围。

## Setup readiness

编排器先做幂等 readiness 检查。`missing` 时不得调用 `setup-matt-pocock-skills`，而是结构化暂停并请用户显式运行它。检查结果只能是：

`ready`、`missing`、`conflict`、`degraded`、`not-applicable`。

该检查每个任务只执行一次并缓存；只有 tracker、主远端、真实标签或配置变化时重查。

证据必须覆盖实际 platform、五态 `label_check` 或 Local `Status:` 检查、`domain_layout`、`artifact_root` 和 `migration_ref`。已持久化 tracker 配置优先于主远端；配置之间或真实标签/Local 状态之间冲突时不覆盖。Local 主 tracker 使用 `.work/<feature>/` 完整功能包，不要求远程 Ticket；根 `.scratch/` 与 `docs/requirements/tickets/` 只可作为旧路径迁移来源。仅发现旧路径资产时返回迁移所需结果并暂停写入；新旧路径同时存在时返回 `conflict`。已选择的 GitHub/GitLab 暂不可用时才保留“待发布平台”草案，并在 map.md 保留目标平台、`publication: pending` 和 `pending_publication_to`。`template-source` 只执行 validate-only，不初始化具体产品 tracker。

当 YSS 生命周期处于 active 状态时，Matt `to-spec` 中独立运行时的 `ready-for-agent` 发布提示由本适配层覆盖为 `ready-for-human`。本 profile 永不提升为 `ready-for-agent`；是否创建可实现切片由下游研发 profile 重新裁决。这只约束 YSS 编排下的状态写入，不修改 Matt skill 单独运行时的核心行为。

`setup-matt-pocock-skills` 仅由用户显式启动。readiness=`missing` 时返回 `needs-human`、`requested_skill=setup-matt-pocock-skills` 和 `resume_route=setup-readiness`；仅发现旧路径资产仍进入 migration-check 并暂停写入。`ready` 直接继续，`conflict` 进入迁移裁决，`degraded` 保留待发布草案，`not-applicable` 仅验证模板契约。通用 setup 文案与 YSS tracker 合同冲突时，以 `.template-spec/agents/issue-tracker.md` 和本编排契约为准。

### Local Markdown 兼容映射

当 `.template-spec/agents/issue-tracker.md` 的 `platform` 为 `local-markdown` 时，Matt flow 的本地输出归一化为以下 YSS 载体：

| Matt 产物 | Local 载体 |
|---|---|
| Plan | `.work/<feature>/plan/` |
| Spec | `.work/<feature>/spec.md` |
| Wayfinder map | `.work/<feature>/map.md` |
| 产品设计与原型 | `.work/<feature>/design/` |
| 业务级 Ticket | `.work/<feature>/issues/NN-<slug>.md` |
| Strategic Design Handoff | `.work/<feature>/strategic-design-handoff.yaml` |
| 门禁 / 验证 / checkpoint | `.work/<feature>/gates/`、`verification/` |

Local Ticket 的文件路径是稳定身份，顶部 `Status:` 保存 Matt 五态；远程 URL 只作为显式镜像引用。本 profile 的业务 Ticket 固定停在 `ready-for-human`。

## Phase boundary 优先级

Matt 的上下文建议不能覆盖 YSS 的 phase-boundary 契约。固定按 `Continue → /clear → /handoff → subagent → /compact` 判断，`/clear` 不是每个 Ticket 的强制动作；任何选择都不得改变生命周期阶段、门禁或 Ticket 五态。

## 下游边界

Release、Retrospective、Tactical DDD、OpenAPI、技术 Ticket、实现和代码审查都由下游研发 profile 持有。`ask-matt` 的默认 `idea → ship` 流程不得在当前 Harness 内跨过 Strategic Design Handoff。
