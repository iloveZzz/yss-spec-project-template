# AGENTS.md — 后端专职 Harness 入口

> 本文件只保存常驻路由、硬门禁和禁止事项。本仓职责以 `.template-spec/process/harness-profile.yaml` 为准；生命周期 ID 以 `.template-spec/process/lifecycle-registry.yaml` 为准；影响面裁剪见 `.template-spec/process/harness-process-tailoring.md`。

## 1. 仓库身份

路径相对当前治理仓根；本地身份、Profile 和工具由本入口解释。进入独立实现仓后消费其入口；共同授权、用户工作保护与允许写范围继续有效。每个任务先读取当前仓库根的 `yss-project.yaml`：

- `template-source` 使用模板维护流程，不生成具体产品的 Spec、原型、OpenAPI 或垂直切片 Ticket。
- `project-instance` 使用 `harness.backend-delivery`，可以从原始业务需求分析本端 Plan/Spec，也可以消费当前批准的 Spec 或 Strategic Design Handoff；按唯一政策选择日常或正式路线。
- 文件缺失、schema 不支持或模式非法时停止路由并执行迁移检查；不得根据目录、Git 远程或占位符猜测身份，父目录或兄弟仓的产品身份不能替代本仓身份。
- 只读问答、状态查询和问题定位：读取根 `CONTEXT.md` 与相关来源后回答或调查；只有写正式资产、申请批准或流转时才进入工作单元。只读诊断不创建 Ticket / checkpoint，不改批准与状态，也不启动回归套件。
- 行动请求先复用当前资产和登记，再补本轮缺项；按当前任务和实际影响加载下文引用，不逐节执行整份入口。
- 新实例使用 `yss init --profile backend --root <新目录>`，元数据为 `.yss.json`；来源合同为 Harness Profile 的 `cli_package: yss`、`native_profile: backend` 和 `metadata_file: .yss.json`。历史 `create-yss-harness-backend` / `.yss-harness-backend.json` 只作旧身份识别；旧实例必须通过显式 `yss migrate plan`，未完成旧事务先用匹配的固定旧执行器恢复。

## 2. 单一事实来源

| 事实 | 权威资产 |
|---|---|
| 业务词汇 | 根 `CONTEXT.md` |
| 本仓职责与允许 / 禁止工作单元 | `.template-spec/process/harness-profile.yaml` |
| 生命周期 ID 与条件门禁 | `.template-spec/process/lifecycle-registry.yaml`；`.template-spec/process/lifecycle-artifact-map.md` 仅为派生视图 |
| 影响面 | `.template-spec/process/harness-process-tailoring.md` |
| 技能身份与路由 | `.template-spec/agents/yss-skill-registry.yaml`（`status: active`；由 Harness 编排器消费）；来源与投影见 `skills-lock.json` |
| 数字人角色与会签 | `.template-spec/agents/digital-human-roles.yaml` |
| 实现仓登记与边界 | `.template-spec/process/implementation-repo-integration.md` |

README、用户指南和 `CLAUDE.md` 只解释或指向上述事实，不定义第二套规则。
读取注册表的名称、输入、产出和完成条件时优先消费对应 `public_*` 公开说明；稳定 ID 的历史字段保持兼容，当前执行策略仍按所引用的合同核验。

## 3. 语言与 Context Contract

- 业务、产品、架构、实现、审查和验证文档正文使用简体中文；代码标识、API、schema、命令、文件名和协议 metadata 保持原样。
- 创建或修改稳定资产前必须读取并持续消费根 `CONTEXT.md`；无法读取时返回 `blocked`。
- 稳定术语先在根 `CONTEXT.md` 登记 PascalCase 英文标识，再进入契约、Ticket、代码或证据。每仓仅允许一个根 `CONTEXT.md`；术语引用使用 `<ContextId>/<EnglishIdentifier>`，真正共享的术语使用 `Global/<EnglishIdentifier>`。
- `project-instance` 每个正式工作单元流转或申请批准前完成 `context_reconciliation`：先回写稳定术语，再核对 `document_digest` 与 `referenced_terms_digest`；缺失、冲突或漂移即 `blocked`。模板源只校验该合同并记录有理由的 `not-applicable`。
- 正式本地需求按注册表完成适用 Plan、业务规则与 Spec；当前本端正式交付使用 `harness-entry`、`technical-design`、`slice-contract`、`slice-implementation`、`verification`；退役入口以 `.template-spec/agents/skill-migrations.md` 为准，不参与当前路由。

<!-- YSS_TEMPLATE_SOURCE_ONLY_START -->
## 4. `template-source` 维护

在用户已授权的模板维护范围内，继续完成受影响 Skill、投影、锁文件和分发快照的同步与适用验证；按当前影响面读取文档。首次编辑完成不等于交付完成。只有新增决定、缺失必要输入或命中既有审批边界时才暂停；提交、推送、发布仍按本仓授权规则执行。

- 创建、修改或退役 skill 时使用 `maintaining-skills`，按 `.template-source/process/maintenance-intensity.yaml` 判定 L1/L2；日常验证与交付按本节执行，正式发布按发布合同执行。
- 本模板的共享技能由 Spec 固定来源生成，只有本端专有技能在 `.agents/skills` 维护。单独克隆后先执行 `node scripts/prepare-skills --source <固定Spec源码目录> --apply`，随后 `node scripts/prepare-skills --check` 可离线核验。共享内容与投影不分别手改；来源锁只能经 Spec 的显式维护更新。
- 日常维护交付默认执行本轮改动及其直接 / 传递依赖的定向检查，补齐 L1/L2 适用证据后交付 `implementation-ready`。不因交付措辞、维护等级、当前分支为 main 或缺少发布 baseline 自动运行全量检查，也不把 fast → candidate → release 当作固定顺序。
- 使用 `scripts/verify-template-fast` 前先看 `--plan`；未知路径、缺输入映射或非法依赖先修正计划，不自动回退全量；每项检查说明受影响行为、消费者和可检测的具体错误，适用强制检查注明合同依据。记录 limited 范围、实际命令、退出码及未覆盖风险。发现本轮缺陷或新增影响时，只补受影响检查；影响无法确定时先调查，不用全量检查代替影响分析。日常维护不强制独立审查或候选冻结。
- PR 候选使用 `scripts/verify-template-candidate`；main 集成验证及正式发布任务使用 `scripts/verify-template`，适用检查与回退由验证 profile 和发布合同定义，不能用日常定向检查冒充通过。未完成 `yss` 的 `backend` 固定 Bundle 及生成实例验证，不得宣称可发布。

<!-- YSS_TEMPLATE_SOURCE_ONLY_END -->

## 5. `project-instance` 后端交付路由

先消费 `.agents/skills/harness-orchestrator/references/orchestration-contract.yaml` 的 `request_triage.delivery_path`，用支持该能力的 `yss lifecycle route` 核验任务、实现仓和完整基线 SHA。政策、能力或资格未证明时，不自行启用日常路径。

### 日常交付（daily）

需求与验收 → 适用 YSS 技术技能 → 本端实现 → 实际测试 → 独立 `code-review`。只维护同一 Ticket/PR，记录范围、验收、工程/基线、Skills、实际测试、独立审查和回滚；跨会话更新同一记录。无需阶段 checkpoint、正式 Slice 合同或多级批准。用 `yss lifecycle verify-daily` 核验当前差异与证据；失败、缺独立审查或阻断未关闭不得宣布完成。

已有正式绑定任务不得降级；无关正式资产不阻断日常任务。新风险命中排除条件时保留修改和证据，停止受影响工作，从最近可信阶段恢复 governed。API 兼容范围按同一政策与 `yss-openapi-governance` 核验，其余 API 变化进入正式 Draft、审查和 Freeze。

### 正式交付（governed）

原始需求可在本项目完成适用 Plan、业务边界与规则、Spec，无需先建独立 Spec/Design 工程；已有上游批准输入先核验复用，冲突回交权威方，不静默改写。以下阶段导航、Slice、Ticket 五态及正式门禁只用于 governed：

先读 `.template-spec/process/harness-profile.yaml` 和裁剪文档，从最近可信阶段恢复。本仓生命周期导航如下，终点为 `work-unit.verification`；只推进本轮触发的工作单元及其依赖：

`work-unit.harness-entry` → `work-unit.technical-design` → `work-unit.implementation-repository-preparation` → `work-unit.slice-contract` → `work-unit.slice-implementation` → `work-unit.verification`

- 输入可以是原始业务需求或当前批准的本地/上游业务资产；本地路线先分析和批准适用 Plan/Spec，上游路线保留来源批准与冲突回交。`to-spec`、`to-tickets` 只能作为用户显式兼容入口，并回交 `harness-orchestrator` 验收。
- 小改动从分诊处理，中等变更从最近可信的 Spec / 架构恢复，高风险变更复核冻结基线；已批准上游资产和既有工程先核验复用。未来阶段尚未要求的产物不作为当前任务缺项，不重走本仓职责以外的战略流程。
- 后端交付必须由 `role.architecture-agent` 使用 `yss-technical-design` 形成批准且当前的 Technical Design Contract；数据影响为真时完成数据架构，为假时形成可核验的不适用记录。Strategic Handoff v5 接收成功只表示输入可消费，固定进入技术设计且保持 `ready_for_agent:false`。
- API 影响先形成 OpenAPI 3.1 Draft，经必要审查后 Freeze；无 API 影响必须有当前记录。随后正式化为可独立验证的窄垂直切片，不得按技术层横向拆分。
- 架构、前端、后端和测试只在同一个当前 Slice Implementation Contract 下工作。命中的条件门禁必须完成；未命中才可记录 `not-applicable`，不生成空文档。
- `seam-deferred` 必须记录风险、责任人、后续 Ticket、验证计划和目标版本或日期。

## 6. 正式 Ticket 与状态

- Plan / Spec / Design 按 `.template-spec/process/stage-tracking.md` 从阶段入口登记工作、按需拆分并在恢复 / 流转时验证；工作项进度不替代 Ticket 五态和阶段批准。

- 功能父 Ticket 汇总批准资产、阻塞项和证据；Spec、Draft 和待冻结资产使用 `ready-for-human`。
- 只有合同已批准且当前、必要门禁通过、阻塞清除并可直接实现的窄垂直切片，才能设为 `ready-for-agent`。
- 现有 Slice 合同当前且覆盖本轮范围时核验复用，缺失、漂移或新增影响再回编译器；流程裁剪不授予越过合同及允许写范围的业务实现资格。
- Tracker 按 `.template-spec/agents/issue-tracker.md` 选择，不得从 Git remote 推断；平台不可用时生成待发布草案。

## 7. 实现边界与正式门禁

日常实施消费本节的工程接入、工具、写范围和真实验证边界；正式 Slice、脚手架与 ready-for-agent 条件仅在相应正式工作触发时消费。

- 进入工程接入或正式切片实现时，读取 `.template-spec/process/implementation-repo-integration.md`，核验目标仓、项目根、分支、CI、验证命令和回滚点；已有登记当前且适用时复用，缺项先补齐。正式切片由 `yss-implementation-contract-compiler` 编译最小技能集与合同草案；只读任务和未触发切片的小改动按裁剪路线处理。编译器不批准合同、不设置状态、不宣布完成。
- 无可复用后端工程时，`harness-orchestrator` 在技术设计前根据批准需求与工程约束给出 `domain-driven` / `layered-mvc` 推荐并由用户逐项目确认；确认后分别使用 `yss-ddd-scaffold-generator` / `yss-layered-mvc-scaffold-generator`。前端工程回交前端项目。
- 正式脚手架仅在 `scaffold_status=required`、架构决定已确认、Technical Design 与 Data Architecture Decision 当前、`gate.engineering-contract-approved` 真实批准且 schema v4 生成合同已持久化后运行；所有前置校验必须在创建输出目录前完成，生成器只产 POM、模块、配置、Wrapper、启动类和架构测试。历史 v3 只允许只读恢复审计；提前出现的业务代码保留并标记 `premature-implementation-detected`。Controller、Repository 实现、SQL 和领域行为必须等待批准的 Slice Implementation Contract。
- UI 影响及其 `frontend_implementation_plan` / `frontend_implementation_verification` 转交前端项目，回收当前切片的必要消费证据；本仓不执行前端生产实现。
- 后端验证优先项目根 `./mvnw`，按当前合同、工程基线和已采纳 CI 条件选择模块 / 用例。缺失 Wrapper 时记录受控例外和实际命令。
- 路径越界、必要证据缺失或验证未执行时停止受影响实现，先修复或补证据。`violation` 修复后定向复验；`drift` / `new_impacts` 先调查并更新影响面，使受影响合同 `stale` 后回编译器。无依赖的已授权工作可继续。

## 8. 专项入口

- 技术事实、标准或第三方行为影响决策时使用 `yss-research`；竞品、市场或用户口碑事实使用 `competitive-intelligence`。
- 原型原件由战略设计项目维护，生产前端由前端项目实现；本仓只读消费页面与接口需求，不加载前端或产品原型构建技能。`prototype` 仅用于后端逻辑、状态、算法和接口假设试验，不能替代合同及实现门禁。
- Bug、测试失败或性能回退先用 `diagnosing-bugs` 建立复现，再使用 `tdd`；业务行为默认按 `behavior-tdd` 逐切片实现，不适用时记录理由和可执行验证。
- 四个专业 Agent 不另起生命周期、不批准自己起草的合同，也不替实现者完成独立验证；协同边界见 `.template-spec/agents/digital-human-roles.yaml`。

## 9. 工作区与实现仓边界

后端运行时代码优先位于已登记的 `external-repository`。只有用户明确选择当前仓承载后端代码时，才使用 `apps/backend/<project>/`（`harness-apps`）或登记的 `git-submodule`；前端实现回交前端项目。

实现位置按已登记的项目根和批准写范围核验；submodule 不得登记成 `harness-apps` 或复制源码冒充挂载。空 gitlink、detached HEAD 和 `--force` 覆盖不得当普通目录。

## 10. 审查、验证与 Git

- 产品实现的独立代码审查及命中的专业审查由 Reviewer 执行，实施者不自审，Reviewer 不写实现，代码审查使用 `code-review`；模板日常维护的 self-check 按第 4 节执行。默认一个推进负责人和一个独立审查者，候选角色不要求逐个签字；相邻检查可组合并逐项留结论。
- Fresh Verification 指当前任务范围、资产与触发合同的真实验证，不等于全仓 / 全套检查。只执行当前切片及直接 / 传递依赖的适用检查，记录实际命令、退出码与未覆盖项；区分局部任务完成、后端可交接、可合并和整体业务完成。产品实例不运行模板投影、生成器回归或模板发布检查，除非另有明确的模板维护 / 回归任务。
- 同一边界且资产 / 上游字节、校验器 / schema、命令参数及仓库根均未变时，可复用已执行检查；输入变化只重验受影响依赖。恢复、handoff、进入实现、合并和发布时重验当前边界，当前性不明即重跑适用检查。首轮覆盖适用审查项，修复后按差异和依赖定向复审，复用结论绑定当前候选。
- 命中会签时按 `.template-spec/agents/digital-human-roles.yaml`，运行 `scripts/verify-approval-record --require-approved --checkpoint <current checkpoint>`；期望上下文来自当前 checkpoint / 任务。高风险架构、OpenAPI Freeze、合并命中本仓生物人政策时先核验当前有效的原始真实回复与批准，只有缺失、失效或实质变化时展示资产后询问。商务承诺和运行时外部副作用仍须生物人。
- 专业审查等待由主控按角色表自主派发并等待，无依赖的已授权工作继续；非阻断建议进入待办，必要证据和真实缺陷仍阻断，仅缺真实决定或无法自主取得的必要输入时询问用户。
- 在暂停、handoff、进入实现和验证边界同步范围、证据、风险、会签点、Ticket 状态和下一步。
- 决定和授权消费 [.agents/skills/harness-orchestrator/references/user-decisions.md](.agents/skills/harness-orchestrator/references/user-decisions.md)，复用有效范围授权；提交、推送、发布分别消费用户授权。
- Git checkpoint 只含本轮范围；获得用户授权后才提交或推送。返工或 IMPORTANT / CRITICAL finding 触发简体中文复盘并修订权威资产。

## 11. Subagent 协同

使用 subagent 前读取 `.template-spec/process/subagent-collaboration.md`，定义任务包、数字人角色、运行时、执行态和不重叠写入范围；共享工作区不是沙箱。实现者不得兼任独立 Reviewer，仓库身份、Ticket 状态、Git checkpoint、Slice 合同批准和完成结论仍由 `harness-orchestrator` 裁决。

## 12. 测试质量基线

推荐 Domain / Application `>= 90%`、API `>= 80%`、前端组件 `>= 75%`、已定义关键流程 `100% E2E`；只有项目测试策略明确采纳后才成为 CI 门禁，未定义关键流程不得声称 100% E2E。

## 13. 专职交付边界

后端仅负责当前业务切片的真实接口交付。战略原件在上游维护；Freeze 前收集前端消费需求。交付使用 `scripts/backend-delivery`，合同见 `.template-spec/process/frontend-backend-delivery.md`。本仓正式 verification 或日常本端验证通过只代表后端可交接，整体完成须统一管理方核验前端及端到端证据。

分析角色不授予另一端代码写入；本端完成不等于跨端业务验收。纯 UI 的后端不适用须有当前依据；真实 API、数据与跨仓依赖必须对齐。独立脚手架只生成机械结构，不授予业务实施。
