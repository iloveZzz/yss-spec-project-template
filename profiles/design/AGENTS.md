# AGENTS.md — 战略设计 Harness 入口

> 本文件只保存常驻路由、硬门禁和禁止事项。生命周期 ID 以 `.template-spec/process/lifecycle-registry.yaml` 为准；本仓边界以 `.template-spec/process/harness-profile.yaml` 为准；影响面裁剪见 `.template-spec/process/harness-process-tailoring.md`。

**项目名称：** [填写]
**业务领域：** [填写]
**团队规模：** [填写]

## 1. 仓库身份

路径相对当前治理仓根；本地身份、Profile 和工具由本入口解释。进入独立实现仓后消费其入口；共同授权、用户工作保护与允许写范围继续有效。每个任务先读根目录 `yss-project.yaml`：

- `template-source` 只维护模板，不生成具体产品的 Plan、Spec、原型、业务级 Ticket 或交接包。
- `project-instance` 使用 `harness.business-ddd-strategy-handoff`；本地终点为 `work-unit.strategic-design-handoff`。
- 文件缺失、schema 不支持或模式非法时停止路由并执行迁移检查；不得根据目录、Git 远程或占位符猜测身份。
- 只读问答、状态查询和问题定位：读取根 `CONTEXT.md` 与相关来源后回答或调查；只有写正式资产、申请批准或流转时才进入工作单元。只读诊断不创建 Ticket / checkpoint，不改批准与状态，也不启动回归套件。
- 行动请求先复用当前资产和登记，再补本轮缺项；按当前任务和实际影响加载下文引用，不逐节执行整份入口。
- 新实例使用 `yss init --profile design --root <新目录>`，元数据为 `.yss.json`；来源合同为 Harness Profile 的 `cli_package: yss`、`native_profile: design` 和 `metadata_file: .yss.json`。历史 `create-yss-harness-design` / `.yss-harness-design.json` 只作旧身份识别；旧实例必须通过显式 `yss migrate plan`，未完成旧事务先用匹配的固定旧执行器恢复。

## 2. 单一事实来源

| 事实 | 权威资产 |
|---|---|
| 业务词汇 | 根 `CONTEXT.md` |
| 本仓职责与允许 / 禁止工作单元 | `.template-spec/process/harness-profile.yaml` |
| 生命周期 ID 与条件门禁 | `.template-spec/process/lifecycle-registry.yaml`；`.template-spec/process/lifecycle-artifact-map.md` 仅为派生视图 |
| 影响面 | `.template-spec/process/harness-process-tailoring.md` |
| 技能身份与路由 | `.template-spec/agents/yss-skill-registry.yaml`（`status: active`；由生命周期消费，Router 不消费）；来源与投影见 `skills-lock.json` |
| 数字人角色与会签 | `.template-spec/agents/digital-human-roles.yaml` |
| 视觉规范 | 根 `DESIGN.md`；治理见 `.template-spec/design/design.md`，Token 快照为派生视图 |
| 实例分发 | `.template-spec/process/instance-distribution-manifest.yaml`；CLI `template.manifest.json` 是投影 |

README、用户指南和 `CLAUDE.md` 只解释或指向上述事实，不定义第二套规则。
读取注册表的名称、输入、产出和完成条件时优先消费对应 `public_*` 公开说明；稳定 ID 的历史字段保持兼容，当前执行策略仍按所引用的合同核验。

## 3. 语言与 Context Contract

- 业务、产品、架构、审查、交接和复盘文档正文使用简体中文；代码标识、API、schema、命令、文件名和协议 metadata 保持原样。
- 创建或修改稳定业务、产品、架构资产前必须读取并持续消费根 `CONTEXT.md`；无法读取时返回 `blocked`。
- 稳定术语先在根 `CONTEXT.md` 登记 PascalCase 英文标识，再进入 Spec、原型、Ticket 或交接资产。每仓仅允许一个根 `CONTEXT.md`；术语引用使用 `<ContextId>/<EnglishIdentifier>`，真正共享的术语使用 `Global/<EnglishIdentifier>`。
- `project-instance` 每个正式工作单元流转或申请批准前完成 `context_reconciliation`：先回写稳定术语，再核对 `document_digest` 与 `referenced_terms_digest`；缺失、冲突或漂移即 `blocked`。模板源只校验该合同并记录有理由的 `not-applicable`。

<!-- YSS_TEMPLATE_SOURCE_ONLY_START -->
## 4. `template-source` 维护

在用户已授权的模板维护范围内，继续完成受影响 Skill、投影、锁文件和分发快照的同步与适用验证；按当前影响面读取文档。首次编辑完成不等于交付完成。只有新增决定、缺失必要输入或命中既有审批边界时才暂停；提交、推送、发布仍按本仓授权规则执行。

- 创建、修改或退役 skill 时使用 `maintaining-skills`，按 `.template-source/process/maintenance-intensity.yaml` 判定 L1/L2；日常验证与交付按本节执行，正式发布按发布合同执行。
- `.agents/skills` 是共享技能权威内容；`.codex/skills`、`.cursor/skills`、`.pi/skills` 是生成投影，不得分别手改。
- 日常维护交付默认执行本轮改动及其直接 / 传递依赖的定向检查，补齐 L1/L2 适用证据后交付 `implementation-ready`。不因交付措辞、维护等级、当前分支为 main 或缺少发布 baseline 自动运行全量检查，也不把 fast → candidate → release 当作固定顺序。
- 使用 `scripts/verify-template-fast` 前先看 `--plan`；未知路径、缺输入映射或非法依赖先修正计划，不自动回退全量；每项检查说明受影响行为、消费者和可检测的具体错误，适用强制检查注明合同依据。记录 limited 范围、实际命令、退出码及未覆盖风险。发现本轮缺陷或新增影响时，只补受影响检查；影响无法确定时先调查，不用全量检查代替影响分析。日常维护不强制独立审查或候选冻结。
- PR 候选使用 `scripts/verify-template-candidate`；main 集成验证及正式发布任务使用 `scripts/verify-template`，适用检查与回退由验证 profile 和发布合同定义，不能用日常定向检查冒充通过。未完成 `yss` 的 `design` 固定 Bundle 及生成实例验证，不得宣称可发布；不得把 `spec` Profile 作为本仓业务方案入口。

<!-- YSS_TEMPLATE_SOURCE_ONLY_END -->

## 5. `project-instance` 战略设计路由

先消费 `.agents/skills/yss-strategic-design/references/orchestration-contract.yaml` 的 `request_triage.delivery_path`；Design 未启用日常实现，不因“小改动”自行获得实现权限。再读 `.template-spec/process/harness-profile.yaml`，按影响面和最近可信阶段裁剪；注册表可保留下游兼容 ID，本地只执行 profile 的 `allowed_work_units`。

- 生命周期导航：入口分诊 → 机会与目标 → 业务故事 → 业务边界与规则 → 阶段决策 → Spec → 页面验证 → 业务级 Ticket → Strategic Design Handoff。只推进本轮触发的工作单元及其依赖，不把导航当作每次任务的固定执行顺序。
- 小改动从分诊处理，中等变更从最近可信的 Spec / 架构恢复，高风险变更复核冻结基线；只校验当前资产、触发合同及直接 / 传递依赖。未变化的可信上游资产先核验复用，未来阶段尚未要求的产物不作为当前缺项。
- 新功能或较大变更进入 `yss-strategic-design`；`ask-matt`、`to-spec`、`to-tickets`、`triage`、`wayfinder` 仅为显式兼容入口，完成后回交编排器验收。
- 命中的条件门禁必须完成；未命中只记录有理由的 `not-applicable`，不生成空文档。`seam-deferred` 必须记录风险、责任人、后续 Ticket、验证计划和目标版本或日期。
- 本地不生成 Tactical Design、OpenAPI、父 / 垂直切片 Ticket、Slice Implementation Contract 或运行时代码；`implement` 必须 `blocked` 并转交下游研发 profile。
- 完成 `work-unit.strategic-design-handoff` 后 `next_route` 必须为 `null`，本仓不继续推进下游生命周期。

## 6. Ticket 与状态

- Plan / Spec / Design 按 `.template-spec/process/stage-tracking.md` 从阶段入口登记工作、按需拆分并在恢复 / 流转时验证；工作项进度不替代 Ticket 五态和阶段批准。

- checkpoint 是唯一机器状态源，map.md 展示并引用，`ticket_sync.status/refs` 关联索引和业务任务；旧 parent_ticket 只读兼容。
- 本地只产出 `artifact.business-ticket-set`：按范围、优先级、验收、依赖和业务风险组织，并保持 `ready-for-human`。
- 本地不得创建功能父 Ticket、垂直切片 Ticket 或设置 `ready-for-agent`。Tracker 按 `.template-spec/agents/issue-tracker.md` 选择，不得从 Git remote 推断；平台不可用时生成待发布草案。

## 7. 下游交接边界

- 交接批准后，下游先把 `source_context_snapshot` 与 `context_delta` 对账到目标仓根 `CONTEXT.md`，形成目标侧 `context_reconciliation`，再接管 Tactical Design、OpenAPI、Slice Contract、脚手架、实现和验证。
- 覆盖率、实现仓和发布规则不是本仓本地门禁；需要继续推进时切换下游研发 profile，不得越过 `work-unit.strategic-design-handoff`。

## 8. 专项入口

- 技术事实或外部证据影响决策时使用 `yss-research`；竞品、市场或用户口碑事实使用 `competitive-intelligence`。
- UI / 原型影响使用 `yss-design-system` → `yss-prototype-stage` → 独立 `prototype-review`；H1/H2 默认使用根 `DESIGN.md` 驱动的离线 HTML/CSS/JavaScript，采用其中的 Data Quality 默认浅色主题；暗色或紧凑模式仅在明确选择时启用。分别验证视觉与流程，证据绑定当前规范与所选 Token 摘要。生产前端转交下游，原型阶段不调用 `yss-ui`。
- 数字人协同先读 `.template-spec/agents/digital-human-roles.yaml`；角色实例不另起生命周期，不批准下游 Slice 合同、不设置 `ready-for-agent`、不宣布产品可发布。
- 模板脚本或校验故障使用 `diagnosing-bugs`；其它技能按 `.template-spec/agents/yss-skill-registry.yaml` 的触发条件按需加载。

## 9. 工作区边界

本仓不承载产品运行时代码；`apps/**` 和独立实现仓属于下游。空 gitlink、detached HEAD 或 `--force` 覆盖挂载点不得当作普通目录。

## 10. 审查、验证与 Git

- 命中的产品专业审查由独立 Reviewer 执行，实施者不自审；模板日常维护的 self-check 按第 4 节执行。默认一个推进负责人和一个独立审查者，候选角色不要求逐个签字；相邻检查可组合并逐项留结论。
- Fresh Verification 指当前任务范围、资产与触发合同的真实验证，不等于全仓 / 全套检查。记录实际命令、退出码与未覆盖项，区分局部任务完成、阶段批准和战略交接；本仓不宣布实现可合并或产品可发布。
- 同一边界且资产 / 上游字节、校验器 / schema、命令参数及仓库根均未变时，可复用已执行检查；输入变化只重验受影响依赖。恢复、handoff 及正式流转时重验当前边界，当前性不明即重跑适用检查。首轮覆盖适用审查项，修复后按差异和依赖定向复审，复用结论绑定当前候选。
- 命中会签时按 `.template-spec/agents/digital-human-roles.yaml`，运行 `scripts/verify-approval-record --require-approved --checkpoint <current checkpoint>`。关键决定先核验当前有效的原始真实回复与批准；仅缺失、失效或实质变化时展示资产后询问负责人。历史读取不放行；发布、商务承诺和运行时外部副作用仍须生物人。
- 专业审查等待由主控按角色表自主派发并等待，无依赖的已授权工作继续；非阻断建议进入待办，必要证据和真实缺陷仍阻断，仅缺真实决定或无法自主取得的必要输入时询问用户。
- 在暂停、handoff 和业务方案交接边界同步范围、证据、风险、会签点、Ticket 状态和下一步。
- 决定和授权消费 [.agents/skills/yss-strategic-design/references/user-decisions.md](.agents/skills/yss-strategic-design/references/user-decisions.md)，复用有效范围授权；提交、推送、发布分别消费用户授权。
- Git checkpoint 只含本轮范围；获得用户授权后才提交或推送。返工或 IMPORTANT / CRITICAL finding 触发简体中文复盘并修订权威资产。

## 11. Subagent 协同

使用 subagent 前读取 `.template-spec/process/subagent-collaboration.md`，定义任务包、数字人角色、运行时、执行态和不重叠写入范围；共享工作区不是沙箱。实施者不得兼任独立 Reviewer，仓库身份、Ticket 状态、Git checkpoint 和完成结论仍由主控裁决；主控也不得批准下游 Slice 合同或设置 `ready-for-agent`。
