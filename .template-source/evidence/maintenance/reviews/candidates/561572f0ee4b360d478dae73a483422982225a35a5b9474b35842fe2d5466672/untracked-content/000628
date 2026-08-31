# AGENTS.md — AI 开发入口规则

> 本文件只保存 Agent 必须首先遵守的仓库身份路由、硬门禁和禁止事项。生命周期对象 ID 以 `docs/process/lifecycle-registry.yaml` 为准；本仓本地执行边界以 `docs/process/harness-profile.yaml` 为准。完整流程裁剪见 `docs/process/harness-process-tailoring.md`。

**项目名称：** [填写]
**业务领域：** [填写]
**团队规模：** [填写]

## 1. 首先识别仓库身份

每个任务开始时先读取根目录 `yss-project.yaml`：

- `repository_mode: template-source`：使用模板维护流程，不生成具体产品的 Discovery、Spec、原型、业务级 Ticket 或 Strategic Design Handoff。
- `repository_mode: project-instance`：按 `harness.business-ddd-strategy-handoff` 分诊；本地生命周期在 `work-unit.strategic-design-handoff` 结束。
- 文件缺失、schema 版本不支持或模式值非法时，停止路由并执行迁移检查；不根据目录、Git 远程或占位符猜测身份。

仓库身份契约由根目录 `yss-project.yaml` 和本文件共同声明。

## 2. 单一事实来源

| 事实类型 | 权威资产 |
| --- | --- |
| 领域与流程词汇 | `CONTEXT.md` |
| Agent 入口、硬门禁、禁止事项 | `AGENTS.md` |
| 本仓本地职责边界 | `docs/process/harness-profile.yaml`（`harness.business-ddd-strategy-handoff`） |
| 主阶段、门禁、产物、工作单元、证据和稳定 ID | `docs/process/lifecycle-registry.yaml`；`docs/process/lifecycle-artifact-map.md` 为派生阅读视图。注册表可保留下游兼容 ID；本地只执行 profile 的 `allowed_work_units` |
| 影响面触发与 `not-applicable` | `docs/process/harness-process-tailoring.md` |
| 模板维护强度触发与最低等级 | `docs/process/maintenance-intensity.yaml` |
| 技能清单、来源、版本、哈希和投影目标 | `skills-lock.json` |
| 技能分层、别名、默认可发现性和运行时入口 | `docs/agents/yss-skill-registry.yaml`（当前 `status: active`，生命周期消费，Router 不消费） |
| 实例分发清单 | `docs/process/instance-distribution-manifest.yaml`；CLI `template.manifest.json` 是其投影 |
| 数字人角色、阶段协作组、运行时绑定与生命周期会签 | `docs/agents/digital-human-roles.yaml`；`docs/agents/digital-human-roles.md` 为操作说明 |

README、用户指南、根目录 `CLAUDE.md` 和其他说明文档只引用或解释上述事实，不重复定义同一规则。`CLAUDE.md` 是 Claude Code 入口指针，不是第二套 Agent 规则。

## 3. 标准文档语言与规范语汇

- 所有面向业务、产品、架构、实施、审查、发布和复盘的落地文档，正文统一使用简体中文。
- 英文专有名词、代码标识、API 路径、schema、类名、方法名、枚举值、错误码、命令、文件名和协议 metadata 保持原样。
- 新流程统一使用 Spec、Ticket、`to-spec`、`to-tickets`。过时术语和技能名只能出现在迁移指南或明确标注的旧项目上下文。
- `CONTEXT.md` 是 Spec 构建及其落地工具链的统一语言输入，也是所有会创建或修改稳定业务、产品、架构资产的强制前置上下文。`yss-strategic-design`、其原生 work unit，以及 `ask-matt`、`grill-me`、`grill-with-docs`、`to-spec`、`to-tickets`、`triage`、`wayfinder` 等显式兼容入口，在规划、起草、评审或拆业务 Ticket 前都必须读取并持续消费它；工具无法读取或消费时必须暂停并返回 `blocked`，不得凭临场翻译、同义词或局部上下文继续。
- 稳定业务术语必须先在 `CONTEXT.md` 中登记 PascalCase `英文标识`，再进入 Spec、原型、Ticket 或其他资产。改中文术语或英文标识都先回写 `CONTEXT.md`，并重新检查受影响资产；与词汇或 ADR 冲突时立即指出并先解决冲突。

## 4. `template-source` 模板维护路由

按“影响面 → 单一事实来源 → 投影 / 派生资产 → 分级证据”维护。强度分级、最低证据和 checkpoint 合同见 `docs/process/harness-process-tailoring.md`。

- 创建、修改或退役 skill 时使用 `maintaining-skills`，并先按 `docs/process/harness-process-tailoring.md` 判定 L1 / L2 / L3；只有 L3 必须保留完整基线失败、压力场景、修订后验证和正式独立审查证据。
- `.agents/skills` 是跨 Agent 共享技能的权威内容；`.claude/skills`、`.codex/skills`、`.cursor/skills`、`.hermes/skills`、`.pi/skills`、`.qoder/skills`、`.trae/skills` 中的共享技能是生成投影，禁止分别手工修改。Cursor 的契约运行时入口是 `.cursor/skills`；不得把 canonical `.agents/skills` 与某个平台投影当作同权双入口。
- `scripts/verify-template` 是模板发布阻断门禁。模板与外部 `create-yss-harness-design` 的跨仓库契约未完成集成验证时，不得声称可发布。不得把本仓发布绑定到 `create-yss-spec`。

## 5. `project-instance` 战略设计路由

先读 `docs/process/harness-profile.yaml`，再用 `docs/process/harness-process-tailoring.md` 判定变更类型、影响面和最近可信阶段。生命周期注册表提供全链 ID；本地只执行 profile 的 `allowed_work_units`，终点是 `work-unit.strategic-design-handoff`，完成后 `next_route` 必须为 `null`。

- 本地主链：入口分诊 → 机会调研 / 需求分析 → DDD 战略设计 → 阶段决策包 → Spec → 页面原型 → 业务级 Ticket → Strategic Design Handoff。
- 条件门禁仍按影响面强制。命中则必须完成；未命中只记录 `not-applicable` 及原因，不生成空文档。不得把产物、工作单元或证据统称为门禁。
- 新功能或较大变更先进入 `yss-strategic-design` 的原生 Discovery / 需求分析工作单元；兼容入口 `ask-matt`、`grill-me`、`grill-with-docs`、`to-spec`、`to-tickets`、`triage`、`wayfinder` 只能显式启动并回交编排器验收。`implement` 不属于本分支入口，必须 `blocked` 并转交下游研发 profile。
- 本地不得生成 OpenAPI、Tactical DDD、Slice Implementation Contract、垂直切片 Ticket 或运行时代码。`forbidden_work_units` 与 `forbidden_artifacts` 以 profile 为准。
- Spec Delta 只记录相对既有冻结 Spec 基线的高风险行为差异；全新产品、全新模块和低风险调整不生成 Spec Delta。
- 安全 / 权限不设独立生命周期资料或专属门禁。日常功能不做额外登记；只有需求或冻结资产明确要求改变认证、授权、租户隔离、敏感数据或合规行为时，才写入普通 Spec、验收和测试 seam。
- `seam-deferred` 只能显式记录风险、责任人、后续 Ticket、验证计划和目标版本或发布日期。

## 6. Ticket 与状态

- 本 profile 使用业务级 Ticket 集（`artifact.business-ticket-set`），按范围、优先级、验收、依赖和业务风险组织，保持 `ready-for-human`。
- Spec 初稿、产品设计、原型、业务级 Ticket 和 Strategic Design Handoff 草案使用 `ready-for-human`。
- 不得在本地创建功能父 Ticket 或垂直切片 Ticket，也不得将本地 Ticket 设为 `ready-for-agent`。该状态与垂直切片实现同属下游研发 profile。
- Ticket、Spec 和阶段证据按 `docs/agents/issue-tracker.md` 选定的主 tracker 持久化；Git remote 不代表 tracker 选择，平台不可用时按该文档生成待发布草案。五态标签见 `docs/agents/triage-labels.md`。

## 7. 下游研发边界

Strategic Design Handoff 批准后，下游团队用 `yss-tactical-design` 接管 Tactical DDD、OpenAPI、Slice Implementation Contract、实现仓库、脚手架和代码验证。上述路径以及覆盖率 CI 阈值都不是本仓本地硬门禁；需要继续推进时必须切换到下游研发 profile，不得在本 profile 越过 `work-unit.strategic-design-handoff`。交接字段见 profile 的 `handoff`。

## 8. 专项任务的强制入口

| 触发情形 | 必须使用 |
|---|---|
| 技术事实、标准、第三方 API 或框架行为影响决策 | `research` 或等价的一手资料记录 |
| 竞品、市场或用户口碑事实 | `competitive-intelligence` |
| UI 设计、原型、组件或主题 | `yss-design-system` 后使用 `yss-prototype-stage`；Codex 再路由 `product-design:index`，其他 Agent 交付等价合同资产；原型产出前后用 `yss-antd-design` 记录 Ant Design v6 事实与浏览器验证。生产前端由下游研发 profile 落地。 |
| merge / rebase 冲突 | `resolving-merge-conflicts` |
| 跨线程、跨仓库、上下文过长或原型结论回流 | `handoff` 或等价交接记录 |
| 数字人角色、Agent 运行时协同或生命周期会签 | 先读 `docs/agents/digital-human-roles.yaml`。职称实例叠加在编排器上，不另起生命周期，不批准下游 Slice 合同、不设 `ready-for-agent`、不宣布可发布 |
| 本地知识库 init / refresh / rebuild，或要把研究结果落成持久 wiki | `llm-wiki`（落成持久 wiki 用 `ingest`；已映射 live 源变了用 `refresh`）。`template-source` 的 wiki-root 为 `.template-source/wiki`；`project-instance` 不附带源仓库编译树，需要时在仓库根 `wiki/` 执行 `init` |

模板维护中的脚本或校验故障使用 `diagnosing-bugs`。业务行为不在本仓按代码 TDD 实现。

## 9. 工作区边界

当前仓库是战略设计 / 研发管理仓库，不承载产品运行时代码。不要把 `apps/backend/`、`apps/frontend/` 或独立实现仓当作本 profile 的默认产出。实现仓库布局属于下游研发 profile。空 gitlink、detached HEAD 或 `--force` 覆盖挂载点不得当成普通目录。

## 10. 独立审查、验证和追踪

- 实现者不能承担命中的独立审查（含数字人）。模板维护按 L1 / L2 / L3 分别使用 self-check / 人工 checkpoint、聚焦独立审查、正式独立审查。
- 任何“完成”结论必须基于 fresh verification，不接受“之前跑过”或实现者自述。本仓不宣布可合并实现或可发布产品。
- 会签门禁按 `docs/agents/digital-human-roles.yaml` 的 `gate_policy` 关闭，会签文件经 `scripts/verify-approval-record` 核验；`gate.release-ready`、对外商务承诺和运行时外部副作用仍须生物人。
- 在会签暂停、handoff 或 Strategic Design Handoff 边界集中同步范围、验证证据、风险、会签点、Ticket 状态和下一步；阻塞、责任人变化或资产单独批准时立即同步。
- Git checkpoint 只包含本轮明确范围；获得用户授权后才提交或推送。
- 阶段性完成后做复盘判断；出现战略设计返工、验证返工、IMPORTANT / CRITICAL review finding 或人工确认延期时，落简体中文复盘并修订权威资产。

## 11. Subagent 协同

使用 subagent 或其它 Agent 运行时前按 `docs/process/subagent-collaboration.md` 定义任务包和不重叠的写入范围，并同时写明数字人角色、`runtime_id`、从角色表复制的 `core_skills` / `forbidden_skills` 与 Explorer / Drafter / Worker / Reviewer / Verifier 执行态。实现者不担任独立审查者；仓库身份、Ticket 最终状态、Git checkpoint 和完成结论仍由主控数字人按编排器规则决定。主控不批准下游 Slice 合同、不设 `ready-for-agent`。会签恢复前校验 `scripts/verify-approval-record`。写隔离靠任务包；共享工作区不是默认沙箱。
