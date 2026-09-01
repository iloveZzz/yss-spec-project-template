# AGENTS.md — AI 开发入口规则

> 本文件只保存 Agent 必须首先遵守的仓库身份路由、硬门禁和禁止事项。完整生命周期、流程裁剪和 YSS 实现细则以下文引用的权威资产为准。

## 1. 首先识别仓库身份

每个任务开始时先读取根目录 `yss-project.yaml`：

- `repository_mode: template-source`：使用“模板维护流程”，不默认生成具体产品的 Spec、原型、OpenAPI 或垂直切片 Ticket。
- `repository_mode: project-instance`：按产品研发生命周期分诊任务。
- 文件缺失、schema 版本不支持或模式值非法时，停止路由并执行迁移检查；不根据目录、Git 远程或占位符猜测身份。

仓库身份契约由根目录 `yss-project.yaml` 和本文件共同声明。

## 2. 单一事实来源

| 事实类型                    | 权威资产                                        |
| ----------------------- | ------------------------------------------- |
| 领域与流程词汇                 | `CONTEXT.md`                                |
| Agent 入口、硬门禁、禁止事项       | `AGENTS.md`                                 |
| 主阶段、门禁、产物、工作单元、证据和稳定 ID | `docs/process/lifecycle-registry.yaml`；`docs/process/lifecycle-artifact-map.md` 为派生阅读视图 |
| 影响面触发与 `not-applicable` | `docs/process/harness-process-tailoring.md` |
| 模板维护强度触发与最低等级 | `docs/process/maintenance-intensity.yaml` |
| 技能清单、来源、版本、哈希和投影目标      | `skills-lock.json`                          |
| 技能分层、别名、默认可发现性和运行时入口 | `docs/agents/yss-skill-registry.yaml`（当前 `status: active`；Router / 生命周期必须消费） |
| 数字人角色、阶段协作组、运行时绑定与生命周期会签 | `docs/agents/digital-human-roles.yaml`；`docs/agents/digital-human-roles.md` 为操作说明 |

README、用户指南、根目录 `CLAUDE.md` 和其他说明文档只引用或解释上述事实，不重复定义同一规则。`CLAUDE.md` 是 Claude Code 入口指针，不是第二套 Agent 规则。

## 3. 标准文档语言与规范语汇

- 所有面向业务、产品、架构、实施、审查、发布和复盘的落地文档，正文统一使用简体中文。
- 英文专有名词、代码标识、API 路径、schema、类名、方法名、枚举值、错误码、命令、文件名和协议 metadata 保持原样。
- 新流程统一使用 Spec、Ticket、`to-spec`、`to-tickets`。过时术语和技能名只能出现在迁移指南或明确标注的旧项目上下文。
- `CONTEXT.md` 是 Spec 构建及其落地工具链的统一语言输入，也是所有会创建或修改稳定业务、产品、架构、实施、审查、发布和复盘资产的强制前置上下文。`yss-product-lifecycle`、其原生 work unit，以及 `grill-with-docs`、`to-spec`、`to-tickets`、`implement` 等显式兼容入口，在规划、起草、评审、拆 Ticket 或实现前都必须读取并持续消费它；工具无法读取或消费时必须暂停并返回 `blocked`，不得凭临场翻译、同义词或局部上下文继续。
- 稳定业务术语必须先在 `CONTEXT.md` 中登记 PascalCase `英文标识`，再进入 Spec、原型、契约、Ticket、代码或验证资产；代码类型 / 字段与契约 property 使用该词干按 `CONTEXT.md` 文首规则变形。改中文术语或英文标识都先回写 `CONTEXT.md`，并重新检查受影响资产；与词汇或 ADR 冲突时立即指出并先解决冲突。

## 4. `template-source` 模板维护路由

按“影响面 → 单一事实来源 → 投影 / 派生资产 → 分级证据”维护。强度分级、最低证据和 checkpoint 合同见 `docs/process/harness-process-tailoring.md`。

- 创建、修改或退役 skill 时使用 `maintaining-skills`，并先按 `docs/process/harness-process-tailoring.md` 判定 L1 / L2 / L3；L3 日常记录维护者自检与 fresh verification，正式发布前执行完整模板门禁。
- `.agents/skills` 是跨 Agent 共享技能的权威内容；`.claude/skills`、`.codex/skills`、`.cursor/skills`、`.hermes/skills`、`.pi/skills`、`.qoder/skills`、`.trae/skills` 中的共享技能是生成投影，禁止分别手工修改。Cursor 的契约运行时入口是 `.cursor/skills`；不得把 canonical `.agents/skills` 与某个平台投影当作同权双入口。
- 模板维护默认以 `scripts/verify-template-fast` 完成 `implementation-ready`；显式晋级审查时用 `scripts/verify-template-candidate`，首次冻结前和最终发布前仍必须执行完整 `scripts/verify-template`。后者是不可裁剪的模板发布阻断门禁。模板与外部 `create-yss-spec` 的跨仓库契约未完成集成验证时，不得声称可发布。

## 5. `project-instance` 产品研发路由

先用 `docs/process/harness-process-tailoring.md` 判定变更类型、影响面和最近可信阶段，再按 `docs/process/lifecycle-registry.yaml` 执行命中的工作单元和条件门禁。

下表是与 `yss-product-lifecycle` 对齐的阶段级导航索引；阶段、工作单元、技能和门禁不是同一层，条件细节以注册表及 lifecycle skill references 为准。

| 主阶段（registry） | 原生工作单元 | 技能入口（按影响面裁剪） | 关键产物 / 门禁 |
|---|---|---|---|
| 入口分诊 `stage.entry-triage` | `work-unit.entry-triage` | `yss-product-lifecycle` | 仓库身份、影响面、最近可信阶段；`gate.repository-identity-valid` |
| Discovery `stage.discovery` | `work-unit.discovery-opportunity`、`work-unit.discovery-requirements`、`work-unit.domain-strategy-design`、`work-unit.stage-decision` | `yss-product-lifecycle`；按事实 / 领域影响使用 `competitive-intelligence`、`research`、`grilling`、`domain-modeling`、`yss-stage-decision` | Discovery、用户/MVP/非目标/成功标准、测试 seam；必要时 DDD 战略设计与阶段决策包；`gate.domain-strategy-approved`、`gate.stage-decision-package-approved` |
| Spec / 功能架构 `stage.spec-architecture` | `work-unit.spec-synthesis` | `yss-product-lifecycle`；`to-spec` 仅为显式兼容入口 | Spec、产品总体设计、功能架构；必要时 Spec Delta；`gate.spec-baseline-approved` |
| 产品设计 `stage.product-design` | `work-unit.prototype-design` | `yss-prototype-stage` 为主合同，内部依次消费 `yss-design-system`、低保真、独立 `prototype-review`、`yss-antd-design` pre-build facts、Codex `product-design:index` focused workflow、post-build/浏览器/无障碍验证；前端落地改用 `yss-ui` | 交互说明、低 / 高保真原型、状态矩阵；`gate.prototype-reviewed`、`gate.prototype-verified`、`gate.user-confirmation` |
| 系统 / 数据架构与工程契约 `stage.system-data-engineering` | `work-unit.technical-analysis` | `yss-router`；按影响使用 `yss-openapi-governance`、`yss-openapi-draft-review`、`codebase-design`、`implementation-repo-onboarding`、`yss-tactical-design` | OpenAPI Draft / Freeze、数据架构、工程基线、架构审查；无 API 影响记录；必要时 Tactical DDD Check；`gate.openapi-draft-reviewed`、`gate.design-reviewed`、`gate.openapi-frozen`、`gate.engineering-baseline-accepted`、`gate.architecture-reviewed` |
| Ticket 正式化 `stage.ticket-formalization` | `work-unit.ticket-decomposition` | `yss-product-lifecycle` + `yss-router`；`to-tickets` 仅为显式兼容入口 | 功能父 Ticket、垂直切片、Slice Implementation Contract；切片初始 `ready-for-human`；`gate.slice-contract-approved`、`gate.slice-ready-for-agent` |
| 垂直切片实现 `stage.vertical-slice-implementation` | `work-unit.slice-implementation` | `yss-router` + `tdd`；UI 影响追加 `yss-ui`、`yss-page-module-development` 及条件专项 skill；`implement` 仅为显式兼容入口 | 前后端代码、TDD、YSS Skill Execution Result；仅允许 `ready-for-agent` 且合同当前 |
| 验证 / 发布 / 复盘 `stage.verification-release-retrospective` | `work-unit.frontend-implementation-verification`、`work-unit.code-review`、`work-unit.release-and-retrospective` | `code-review`（唯一入口，Standards 消费 YSS / Alibaba 专项检查输入）；UI 影响追加 `yss-ui` + `yss-design-system`；发布 / 复盘由 `yss-product-lifecycle` 持有 | 不可变候选快照、独立审查、findings 按合同分流、fresh verification、发布 / 回滚证据、复盘；UI 影响追加 `gate.frontend-implementation-verified`；`gate.release-ready` |

- 生命周期注册表中的条件门禁全部按影响面强制。命中触发条件时必须完成；未命中时只记录 `not-applicable` 及原因，不生成空文档；不得把产物、工作单元或证据统称为门禁。
- 安全 / 权限不设独立生命周期资料或专属门禁。日常功能不做额外登记、`not-applicable` 或推导校验；只有需求或冻结资产明确要求改变认证、授权、租户隔离、敏感数据或合规行为时，才把该行为写入普通 Spec、API、架构、验收和测试 seam，并仅按实际 UI、API、Backend、Data、High-risk 影响触发既有门禁。普通 action 注册、沿用既有认证中间件、未变化的 `401` / `403`、一般字段、SQL / DDL / 迁移和上传 / 下载本身不构成安全 / 权限专项。
- `seam-deferred` 只能显式记录风险、责任人、后续 Ticket、验证计划和目标版本或发布日期。
- 新功能或较大变更先进入 `yss-product-lifecycle` 的原生 Discovery / 需求分析工作单元；`grill-with-docs` 与 `to-spec` 仅作为用户显式兼容入口，Spec 基线和产品设计影响的完整判定以注册表和裁剪规则为准。
- API 契约变更先形成 OpenAPI 3.1 Draft，经必要的工程基线、系统 / 数据架构和设计审查后 Freeze，再进入实现。
- Spec Delta 只记录相对既有冻结 Spec 基线的高风险行为差异；全新产品、全新模块和低风险调整不生成 Spec Delta。
- OpenAPI Freeze 或无 API 影响记录完成后，由生命周期原生 Ticket 正式化工作单元拆成可独立验证的窄垂直切片；用户显式 `to-tickets` 仅作为兼容入口，禁止只按 Adapter / Application / Domain / Infrastructure 横向拆分。

## 6. Ticket 与状态

- 每个功能先建立功能父 Ticket，用于汇总 Spec、设计、审查、OpenAPI Freeze、阻塞项和阶段证据。
- Spec 初稿、产品设计、原型、OpenAPI Draft 和待冻结资产使用 `ready-for-human`。
- 只有通过必要门禁、阻塞边已清除并具备直接实现条件的垂直切片 Ticket，才能使用 `ready-for-agent`。
- Ticket、Spec 和阶段证据按 `docs/agents/issue-tracker.md` 选定的主 tracker 持久化；Git remote 不代表 tracker 选择，平台不可用时按该文档生成待发布草案。五态标签见 `docs/agents/triage-labels.md`。

## 7. 实现与 YSS 路由硬门禁

进入实现时先读 `docs/process/implementation-repo-integration.md`，登记实现仓库、项目根、分支、CI、验证命令和回滚点；再使用 `yss-router` 编译最小 skill 集合与当前实现合同。

- 无可复用工程时，先确认外部目标仓库或输出目录，再使用 `yss-ddd-scaffold-generator` / `yss-frontend-scaffold-generator`；当前仓库缺少 frontend / backend 目录不改变此路由。
- 脚手架只在 `scaffold_status=required` 且受控生成合同已持久化、获得生命周期批准后运行；它只产生机械骨架，业务行为回到 Router 并使用 `behavior-tdd`。
- 正式垂直切片必须消费已批准、已持久化且版本当前的 Slice Implementation Contract。Router 只生成草案，不批准合同、不设置 `ready-for-agent`、不宣布完成。合同 schema、Backend 子合同和证据字段以 `yss-router` references 为准。
- UI 影响切片必须在 `ready-for-agent` 前具备通过校验的 `frontend_implementation_plan`，实现完成后补齐 `frontend_implementation_verification`；截图 / 视觉回归、状态与交互、console warning 和实际 `pnpm` 退出码均须有证据，不能只做 type-check 或声称“已对齐”。
- 前端测试、type-check 与构建优先使用 `pnpm`；后端校验、测试与编译优先使用项目根 `./mvnw`。不要默认 `npm` / `yarn` 或裸 `mvn`。既有仓库确实没有 pnpm 或 Maven Wrapper 时，必须记录受控例外和实际命令。登记字段见 `docs/process/implementation-repo-integration.md`。
- 路径越界、证据缺失、未执行验证、`drift`、`violation` 或 `new_impacts` 时停止实现并重新路由。

实现细则由已批准合同、YSS skills 和实现接入文档定义；`AGENTS.md` 只保留入口与边界。

## 8. 专项任务的强制入口

本表补充跨阶段的触发型技能；主阶段对应的原生工作单元和条件技能以第 5 节、`yss-product-lifecycle` 及 `orchestration-contract.yaml` 为准。

| 触发情形 | 必须使用 |
|---|---|
| 技术事实、标准、第三方 API 或框架行为影响决策 | `research` 或等价的一手资料记录 |
| 竞品、市场或用户口碑事实 | `competitive-intelligence` |
| UI 设计、原型、组件或主题 | `yss-prototype-stage` 持有阶段合同：`yss-design-system` → 低保真 → 独立 `prototype-review` → `yss-antd-design` pre-build facts → Codex `product-design:index` focused workflow → post-build/浏览器/无障碍验证；其他 Agent 交付等价合同资产。前端代码落地改用 `yss-ui`，不要继续调用 `yss-antd-design` |
| Bug、测试失败或性能回退 | `diagnosing-bugs` 建立可复现反馈，再用 `tdd` |
| merge / rebase 冲突 | `resolving-merge-conflicts` |
| 架构治理、难测模块或深模块设计 | `codebase-design`；`improve-codebase-architecture` 仅作为用户显式兼容入口 |
| 跨线程、跨仓库、上下文过长或原型结论回流 | `handoff` 或等价交接记录 |
| 数字人角色、Agent 运行时协同或生命周期会签 | 先读 `docs/agents/digital-human-roles.yaml`。职称实例叠加在编排器上，不另起生命周期，不批准 Slice 合同、不设 `ready-for-agent`、不宣布可发布 |
| 本地知识库 init / refresh / rebuild，或要把研究结果落成持久 wiki | `llm-wiki`（落成持久 wiki 用 `ingest`；已映射 live 源变了用 `refresh`）。`template-source` 的 wiki-root 为 `.template-source/wiki`；`project-instance` 不附带源仓库编译树，需要时在仓库根 `wiki/` 执行 `init` |

业务行为默认按 `tdd` 的 `behavior-tdd` 模式使用已确认的公开 seam 逐切片实现。一次性生成、纯配置或流程文档不适用代码 TDD 时，必须记录例外理由和可执行验证方式。

## 9. 工作区与实现仓库边界

当前仓库默认是研发管理仓库，运行时代码优先位于已登记的独立实现仓库（`repository_scope: external-repository`）。只有用户明确选择当前仓库承载实现代码时，才使用同源的 `apps/backend/<project>/` 或 `apps/frontend/<project>/`（`harness-apps`），或以 Git submodule 把独立实现仓挂到同一 `apps/` 布局（`git-submodule`）。三种 scope 必须用登记字段、Git 身份和工作树 gitlink 区分；空 gitlink、detached HEAD 或 `--force` 覆盖挂载点不得当成普通目录。

`apps/backend/` 和 `apps/frontend/` 只是项目容器；`app/backend/`、`app/frontend/` 及其子路径禁止作为工程输出。`git-submodule` 不得登记为 `harness-apps`，也不得把实现源码复制进 Harness。完整登记字段、嵌套 Git 授权和跨仓约束见 `docs/process/implementation-repo-integration.md`。

## 10. 独立审查、验证和追踪

- 实现者不能承担命中的独立审查（含数字人）。模板维护的 L3 日常路径使用维护者自检；L2 仍按需使用聚焦独立审查，正式发布仍执行完整模板门禁。模板发布、代码切片和高风险变更仍必须满足各自独立审查要求。产品切片与模板维护共用同一 finding 闭环：`violation` 由实现者在原合同路径修复后重新捕获并全轴复审；`drift` / `new_impacts` 使合同 `stale` 并回 Router。审查者不得写实现。命中后的 mandatory 不得豁免；未命中才 `not-applicable`。
- 任何“完成 / 可合并 / 可发布”结论必须基于 fresh verification，不接受“之前跑过”或实现者自述。
- 会签门禁按 `docs/agents/digital-human-roles.yaml` 的 `gate_policy` 关闭，会签文件经 `scripts/verify-approval-record` 核验；`gate.release-ready`、对外商务承诺和运行时外部副作用仍须生物人。
- 在会签暂停、handoff、进入实现、合并或发布边界集中同步范围、验证证据、风险、会签点、Ticket 状态和下一步；阻塞、责任人变化或资产单独批准时立即同步。
- Git checkpoint 只包含本轮明确范围；获得用户授权后才提交或推送。
- 发布后或阶段性完成后做复盘判断；出现架构返工、验证返工、IMPORTANT / CRITICAL review finding 或人工确认延期时，落简体中文复盘并修订权威资产。

## 11. Subagent 协同

使用 subagent 或其它 Agent 运行时前按 `docs/process/subagent-collaboration.md` 定义任务包和不重叠的写入范围，并同时写明数字人角色、`runtime_id`、从角色表复制的 `core_skills` / `forbidden_skills` 与 Explorer / Drafter / Worker / Reviewer / Verifier 执行态。实现者不担任独立审查者；仓库身份、Ticket 最终状态、Git checkpoint、Slice 合同批准和完成结论仍由主控数字人按编排器规则决定。会签恢复前校验 `scripts/verify-approval-record`。写隔离靠任务包；共享工作区不是默认沙箱。

## 12. 测试质量基线

模板推荐值为 Domain / Application `>= 90%`、API `>= 80%`、前端组件 `>= 75%`、已明确的关键流程 `100% E2E`。只有项目实例在测试策略中明确采纳或覆盖后才构成 CI 门禁；未定义关键流程清单时，不声称其 E2E 覆盖率达到 100%。
