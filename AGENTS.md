# AGENTS.md — AI 开发入口规则

> 按任务范围选择入口，只加载当前分支需要的规则；保留硬门禁和授权边界。

## 1. 首先识别仓库身份

先读根 `yss-project.yaml`：`template-source` 走模板维护；`project-instance` 走产品生命周期。

- `template-source` 不生成产品 Spec、原型、OpenAPI 或垂直切片 Ticket。
- 文件缺失、schema 不支持或模式非法时停止并迁移检查；不得按目录、Git remote 或占位符猜身份。
- 只读问答、状态查询和问题定位：读取根 `CONTEXT.md` 与相关来源后回答或调查；只有准备写正式资产、申请批准或流转时才进入对应工作单元。只读诊断不创建 Ticket / checkpoint，不改批准与状态，也不启动回归套件。
- 已明确的行动请求：在已授权范围内推进当前可执行工作；先复用已有阶段资产、登记和证据，再补本轮缺项。按当前任务和实际影响加载下文引用，不逐节执行整份入口。

## 2. 单一事实来源

| 事实 | 权威资产 |
|---|---|
| 词汇 | `CONTEXT.md` |
| Agent 入口红线 | `AGENTS.md` |
| 阶段、门禁、产物、工作单元、证据、稳定 ID | `.template-spec/process/lifecycle-registry.yaml`；`.template-spec/process/lifecycle-artifact-map.md` 仅为派生阅读视图 |
| 影响面、`not-applicable`、模板维护强度 | `.template-spec/process/harness-process-tailoring.md`、`.template-source/process/maintenance-intensity.yaml` |
| Skill 来源、版本、投影、路由 | `skills-lock.json`、`.template-spec/agents/yss-skill-registry.yaml` |
| 数字人角色、运行时与会签 | `.template-spec/agents/digital-human-roles.yaml` |
| 视觉规范 | `DESIGN.md`；治理见 `.template-spec/design/design.md` |

其他文档和派生视图只引用，不重复定义。
读取注册表的名称、输入、产出和完成条件时优先消费对应 `public_*` 公开说明；稳定 ID 的历史字段保持兼容，当前执行策略仍按所引用的合同核验。

## 3. 标准文档语言与规范语汇

- 生命周期文档用简体中文；英文专名、代码 / API 标识、schema、命令、文件名和 metadata 原样保留。新流程统一用 Spec、Ticket、`to-spec`、`to-tickets`。
- 规划至实现全程消费根 `CONTEXT.md` 及文首合同；不可读即 `blocked`。稳定术语先登记，再以 `<ContextId>/<EnglishIdentifier>` 引用；跨上下文用 `Global/<EnglishIdentifier>`。
- 每仓只允许根目录一个大小写精确的 `CONTEXT.md`；禁止嵌套、`CONTEXT-MAP.md`、跨仓路径和伪锚点。
- `project-instance` 每个正式工作单元批准或流转前完成 `context_reconciliation`；缺失、冲突或摘要漂移即 `blocked`。`template-source` 校验模板合同并记录带原因的 `not-applicable`。

## 4. `template-source` 模板维护路由

在用户已授权的模板维护范围内，继续完成受影响 Skill、投影、锁文件和分发快照的同步与适用验证；按当前影响面读取文档。首次编辑完成不等于交付完成。只有新增决定、缺失必要输入或命中既有审批边界时才暂停；提交、推送、发布仍按本仓授权规则执行。

- 按“影响面 → 事实源 → 投影 / 派生 → 分级证据”维护；改 Skill 必须用 `maintaining-skills`，并按 `.template-spec/process/harness-process-tailoring.md` 判定 L1 / L2 / L3。
- `.agents/skills` 是共享 Skill 权威目录；其他 Agent root 下的同名 Skill 是生成投影，不得手改或与 canonical 并列维护。
- 日常维护交付默认执行本轮改动及其直接 / 传递依赖的定向检查，补齐 L1/L2/L3 适用证据后交付 `implementation-ready`。不因交付措辞、L3、当前分支为 main 或缺少发布 baseline 自动运行全量检查，也不把 fast → candidate → release 当作固定顺序。
- 使用 `scripts/verify-template-fast` 前先看 `--plan`；计划若扩大到全量，日常交付改为执行上述定向检查，记录范围、实际命令、退出码及未覆盖风险。发现本轮缺陷或新增影响时，只补受影响检查；影响无法确定时先调查，不用全量检查代替影响分析。日常维护不强制独立审查或候选冻结。
- PR 候选使用 `scripts/verify-template-candidate --base <完整 SHA>`；main 集成验证及正式发布任务使用 `scripts/verify-template`。这些任务的检查集合、覆盖台账、baseline、资格及 `legacy-full` 回退由 `.template-source/process/template-verification-profiles.yaml` 定义，不能用日常定向检查冒充通过。所有适用风险继续阻断；外部固定版本 CLI 集成未闭合不得称可发布。CI 边界见 `.template-source/process/github-workflows.md`。

## 5. `project-instance` 产品研发路由

生命周期导航：分诊 → Plan → Spec / 功能架构 → 产品设计 → 工程契约 → Ticket → 切片 → 验证 / 发布 / 复盘。实际入口与终点由当前任务、影响面和最近可信阶段决定。

- 发生变更时先按 `.template-spec/process/harness-process-tailoring.md` 判定影响面：小改动从分诊处理，中等变更从最近可信的 Spec / 架构恢复，新功能或较大变更进入 Plan，高风险变更复核冻结基线。再由 `yss-product-lifecycle` 执行当前工作单元及命中依赖；阅读导航见 `.template-spec/process/lifecycle-artifact-map.md`。
- 只校验当前资产、触发合同和直接 / 传递依赖；未变化的可信上游资产先核验复用，未来阶段尚未要求的产物不作为当前任务缺项。产品实例不运行模板投影、生成器回归或模板发布检查，除非本轮另有明确的模板维护 / 回归任务。
- 命中门禁必须完成；本工作单元裁剪项按事实源记录带原因的 `not-applicable`，不生成空文档。安全 / 权限仅在行为实际改变时复用普通影响面，不因技术载体新增专项门禁或逐项登记无关风险。
- `to-spec`、`to-tickets`、`implement` 仅为用户显式兼容入口。API 变更先形成 OpenAPI 3.1 Draft，审查后 Freeze，再实现。
- Spec 综合同时起草业务 Ticket 集，Design 校准同一组 ID；业务正式化后战略交接或技术分析，协议见 `.template-spec/process/business-tickets.md`。业务票不授予实现资格。Spec Delta 只记冻结基线的高风险行为差异。OpenAPI Freeze 或无 API 影响记录后拆窄垂直切片，禁止仅按技术层横拆。
- `seam-deferred` 必须记录风险、责任人、后续 Ticket、验证计划和目标版本或发布日期。

## 6. Ticket 与状态

- Plan / Spec / Design 按 `.template-spec/process/stage-tracking.md` 从阶段入口登记工作、按需拆分并在恢复 / 流转时验证；工作项进度不替代 Ticket 五态和阶段批准。

- 功能研发先建立或复用父 Ticket，汇总阶段资产、审查、阻塞和证据；小改动复用主 tracker 中的当前记录，按触发条件拆分，只读查询不新建 Ticket。
- Spec、设计、原型、OpenAPI Draft 和待冻结资产使用 `ready-for-human`；只有门禁通过、阻塞清除且可直接实现的垂直切片才能使用 `ready-for-agent`。
- 按 `.template-spec/agents/issue-tracker.md` 持久化主 tracker，不从 Git remote 推断；平台不可用时生成待发布草案。五态见 `.template-spec/agents/triage-labels.md`。

## 7. 实现与 YSS 路由硬门禁

- 进入工程接入或正式切片实现时，按 `.template-spec/process/implementation-repo-integration.md` 核验仓库、项目根、分支、CI、验证命令、回滚点；已有登记当前且适用时复用，缺项先补齐。正式切片再用 `yss-implementation-contract-compiler` 编译最小 Skill 集和当前合同；只读任务和未触发切片的小改动按裁剪路线处理。
- 无工程先确认外部仓库或输出目录。Backend `scaffold_status=required` 时，由生命周期推荐 `domain-driven` / `layered-mvc`，用户逐项目确认后路由；Frontend 用 `yss-frontend-scaffold-generator`。缺目录不改路由。
- 脚手架仅在 `scaffold-architecture-decisions.yaml` 已确认且当前、Project Scaffold Contract schema v4 已持久化并获批准后无交互运行，只生成机械骨架。既有工程不得重选或覆盖；架构转换单独立项。
- 正式切片只消费已批准、已持久化且当前的 Slice Implementation Contract；现有合同当前且覆盖本轮范围时核验复用，缺失、漂移或新增影响再回编译器。流程裁剪不授予越过合同及允许写范围的业务实现资格；编译器只起草，不批准、不设置 `ready-for-agent`、不宣布完成。
- UI 切片在 `ready-for-agent` 前须有已校验的 `frontend_implementation_plan`，实现后补 `frontend_implementation_verification`，覆盖截图 / 视觉回归、状态交互、console warning、实际 `pnpm` 退出码。
- 前端验证优先 `pnpm`，后端优先根 `./mvnw`；缺少时记录受控例外和实际命令。
- 路径越界、必要证据缺失或验证未执行时停止受影响实现，先修复边界或补齐证据。`violation` 修复后定向复验；`drift` / `new_impacts` 先调查，更新影响面并使受影响合同 `stale`，回编译器后再推进。无依赖的已授权工作可继续。

## 8. 专项任务的强制入口

- 技术事实、标准、第三方 API 或框架行为用 `yss-research`（`technical-evidence` / `strategy-evidence`）；竞品、市场、口碑用 `competitive-intelligence`。
- 产品设计由 `yss-prototype-stage` 持有合同并调用设计系统、独立评审、H1 / H2 适配器；原型禁用 `yss-ui`。真实组件事实只用于实现计划、已批准实现和还原验证。
- 数字人协同或会签先读 `.template-spec/agents/digital-human-roles.yaml`；角色不得另起生命周期、批准 Slice 合同、设置 `ready-for-agent` 或宣布可发布。
- 业务行为默认按 `tdd` 的 `behavior-tdd` 使用已确认公开 seam 逐切片实现；一次性生成、纯配置或流程文档不适用时，记录例外理由和可执行验证。

## 9. 工作区与实现仓库边界

- 运行时代码默认进入已登记的 `external-repository`；仅用户明确选择时使用 `apps/backend/<project>`、`apps/frontend/<project>` 的 `harness-apps`，或以真实 gitlink 使用 `git-submodule`。三种 scope 按实现接入文档登记。
- 禁止向 `app/backend/`、`app/frontend/` 输出；空 gitlink、detached HEAD、`--force` 挂载点不得视为普通目录；不得把 submodule 登记为 `harness-apps` 或复制源码冒充。

## 10. 独立审查、验证和追踪

- 产品实现的独立代码审查及命中的专业审查由 Reviewer 执行；实现者不自审，Reviewer 不写实现，代码审查统一用 `code-review`。模板日常维护的 self-check 按第 4 节执行；命中的 mandatory 审查不豁免。
- Fresh Verification 指当前任务范围、资产与触发合同的真实验证，不等于全仓 / 全套检查。按当前合同、工程基线和已采纳 CI 条件选择检查，记录实际命令、退出码与未覆盖项；局部任务完成、切片验收、可合并和可发布分别声明范围，局部通过不推导整体完成。
- 同一边界内，仅当资产 / 上游字节、校验器 / schema、命令参数及仓库根均未变时复用已执行检查；输入变化或新影响只重验受影响依赖。恢复、handoff、进入实现、合并和发布时重验当前边界；无法证明当前性即重跑适用检查。历史结果或自述不能作为当前通过证据。
- 命中会签时按角色表 `gate_policy`，运行 `scripts/verify-approval-record --require-approved --checkpoint <current checkpoint>`；期望上下文来自当前 checkpoint / 任务。命中 `user_decision_policy` 时先核验原始真实回复或有效范围授权延续；只有缺失、失效或决定实质变化时，展示资产后向提问者或其指定负责人询问。无回复保持等待，数字人不能代答；协议见生命周期 `references/user-decisions.md`。发布、商务承诺、运行时外部副作用仍须生物人。
- 普通功能默认一个推进负责人和一个独立审查者；候选角色列表不要求逐角色签字。相邻检查可组合审查、逐项留结论。已有范围授权按用户决定协议验证延续，未知影响先调查，确认实质决定变化后才重新决定；外部强制审批不得裁掉，缺陷和缺证据仍阻断，非阻断建议进入待办。
- 首轮覆盖全部适用审查项；修复后按差异、受影响结论 / 行为及依赖定向复审，并重新绑定当前候选。摘要变化、UI 影响或 `new_impacts` 不触发默认全轴复审；未知影响先调查。能力与补充只读技能从角色表编译，禁止用职称代替能力或独立身份。专业审查等待由主控自主派发并等待，验证失败修复或路由；仅缺真实决定或新授权时展示资产后询问，独立工作继续。
- 会签暂停、handoff、实现、合并、发布边界同步范围、证据、风险、会签点、Ticket 状态和下一步。Git checkpoint 只含本轮范围；提交 / 推送须用户授权。仅 `template-source` 的 `scripts/advance-maintenance-iteration` 入口可在**本地 `refs/checkpoints/<run-id>` 引用**上自动创建 checkpoint 提交（不推送、不改分支、不建 tag）；可用 `--root` 指定已登记的专职模板真实 gitlink，先核验身份、Context 与明确的本地分支。`project-instance` 不适用；写入 main、推送远端、打 tag、发布仍须用户授权。
- 发布或阶段完成时判断复盘；架构 / 验证返工、IMPORTANT / CRITICAL finding、人工确认延期时，落中文复盘并修订事实源。

## 11. Subagent 协同

- 使用 subagent 或其他运行时前读 `.template-spec/process/subagent-collaboration.md`，建立含角色、`runtime_id`、执行态、技能约束和不重叠写范围的任务包；共享工作区不是安全边界。
- 仓库身份、Ticket 最终状态、Git checkpoint、Slice 合同批准和完成结论由主控裁决；实现者不得兼任独立审查者或会签自己的资产。

## 12. 测试质量基线

模板推荐 Domain / Application `>= 90%`、API `>= 80%`、前端组件 `>= 75%`、关键流程 `100% E2E`；`project-instance` 明确采纳后才是 CI 门禁，未定义关键流程不得称 100% E2E。
