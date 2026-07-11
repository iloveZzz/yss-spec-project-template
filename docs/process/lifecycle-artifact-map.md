---
status: active
owner: ai
---

# 产品研发生命周期产物映射表

本文是本仓库产品研发流程的权威索引。日常执行使用 8 个主阶段；21 个门禁 / 职责点用于审查、路由和补齐缺失资产。小需求、Bug、局部样式或配置调整不重跑完整流程，只从最早受影响资产开始补齐下游门禁。

本仓库的默认流程已迁移为 Matt Pocock Engineering Skills + YSS + OpenAPI：用 Matt skills 做需求澄清、Spec、Ticket 拆分、实现、TDD、诊断、审查和架构治理；用 YSS skills 做业务工程规范；用 OpenAPI 3.1 做前后端契约。中高风险变更可用 OpenSpec-style Spec Delta 补充行为差异、验收场景和测试映射，但不恢复 OpenSpec CLI 或额外变更状态机。

补充执行资产：

- 13 个对外工作单元与本表的映射见 `docs/process/harness-work-unit-map.md`。
- 小改动 / 中等变更 / 新模块的流程裁剪和最近可信阶段判定见 `docs/process/harness-process-tailoring.md`。
- subagent 协同边界、任务包规则和不可委派门禁见 `docs/process/subagent-collaboration.md`，任务包模板见 `docs/templates/subagent-task-package-template.md`。
- 外部前端 / 后端实现仓库的接入和跨仓库切片绑定见 `docs/process/implementation-repo-integration.md`。
- 阶段结束的 Issue 同步与 Git checkpoint 记录可使用 `docs/process/templates/stage-checkpoint-template.md`。

## 8 个主阶段

| 主阶段 | 目标 | 必须产物 | 条件产物 | 下一门禁 |
|---|---|---|---|---|
| 1. 入口分诊 | 判断任务类型、风险等级、最近可信阶段和最小技能集 | 分诊结论或 issue 备注 | `yss-product-lifecycle` 路由结果、Git checkpoint 判断 | 是否需要 Discovery / Spec / API / 架构 / Ticket |
| 2. 机会与 Discovery | 收敛用户、痛点、为什么现在做、MVP、非目标、成功标准、产品功能指引和下游影响信号 | `docs/discovery/<feature>-discovery.md` 或等价说明 | `competitive-intelligence` 竞品情报、`research` 技术 / 标准 / API 一手资料记录、竞品矩阵、机会说明、产品功能指引、下游影响清单、市场分析、用户痛点文档 | 是否足以进入业务架构和 Spec |
| 3. 业务 / Spec / 功能架构 | 明确产品边界、用户旅程、功能域、模块边界、优先级、低保真原型和验收标准 | `docs/requirements/<feature>-spec.md`（兼容 legacy `docs/requirements/<feature>-prd.md`）；`docs/design/<feature>-product-overview-design.md` | `grill-with-docs` 澄清记录、`prototype` 一次性验证结论、业务架构、CONTEXT 术语回填；不进入 Spec 生命周期的小改动可记录不适用原因 | Spec Review / 产品总体设计评审 / 产品设计准备度 |
| 4. 产品设计与需求冻结 | 基于 Spec 初稿和产品总体设计，对 UI、页面流、状态矩阵、异常路径、高保真体验和 Spec 回填做闭环 | 有 UI 时：交互说明、低保真原型评审结论、Ant Design v6 高保真 HTML 原型（可由系统 / Agent 在低保真评审通过后自动产出）、AntD CLI 校验证据和用户确认记录；无 UI 时：需求冻结记录 | 状态矩阵、页面地图、原型链接 | Spec 校准 / 工程契约与架构设计准备度 |
| 5. 系统 / 数据架构与工程契约设计审查 | 合并 API 影响分析、契约草案、工程基线、系统架构、数据架构和 Design Review；Draft 仅用于评审，Freeze 前不得作为实现或生成客户端契约 | 系统概要设计或等价架构记录；Design Review 结论；有 API 时：API 影响记录和契约草案 / review-only OpenAPI Draft；有后端结构影响时：工程基线审查 | OpenAPI Draft Review、OpenSpec-style Spec Delta、工程基线审查、无 API 影响记录、数据架构、ADR、架构图 | OpenAPI Freeze 准备度 |
| 6. 契约冻结与 Ticket formalization | 冻结契约并把交付范围转成可执行 Ticket，并明确受影响前后端工程是否已存在 | OpenAPI Freeze 记录或无 API 影响记录；垂直切片 Ticket 入口 | `to-tickets` 输出、实施路由记录、实现仓库 / 脚手架判定、外部脚手架目标确认、Issue tracker 同步 | 垂直切片准备度 |
| 7. 垂直切片与 TDD 实现 | 将冻结范围拆成端到端切片并按 TDD 实现 | 垂直切片 Ticket、实施计划、Build Architecture Checklist、测试 / 验证记录 | YSS skill routing、前后端脚手架初始化记录、DDL / SQL / 数据库迁移、权限接入和审计日志人工确认结论、`handoff` / 跨仓库交接记录、`implement` / `tdd` 证据、`code-review` 报告、`resolving-merge-conflicts` 记录、清理简化记录、Architecture Re-check | Fresh verification / Release Review |
| 8. 验证发布与复盘 | 保留发布、实施、验证和经验沉淀证据 | fresh verification、发布说明、复盘记录 | 实施记录、用户手册、`writing-skills` 压力场景 / 流程修订验证、AGENTS / CONTEXT / ADR 更新 | 下一轮规划 |

## Subagent 协同映射

| 主阶段 | 可委派的 subagent 工作 | 不可委派的主控裁决 | 记录要求 |
|---|---|---|---|
| 1. 入口分诊 | Explorer 检查现有资产、Issue、git 状态 | 生命周期阶段判定、最近可信阶段选择 | 分诊记录或 checkpoint 说明是否使用 subagent |
| 2. 机会与 Discovery | 竞品、市场、用户流程、技术事实调研 | 是否进入 Spec、MVP / 非目标最终取舍 | Discovery 或 Ticket 中引用调研任务包 |
| 3. 业务 / Spec / 功能架构 | Spec 草案、功能架构草案、`grill-with-docs` 质询记录 | Spec baseline、Spec Review 最终结论 | Spec / 产品总体设计记录采纳与未采纳结论 |
| 4. 产品设计与需求冻结 | 页面流、状态矩阵、AntD / YSS 查询、高保真原型、Prototype Review findings | 用户确认、requirement freeze | 原型确认记录和 checkpoint 记录 subagent 产出 |
| 5. 系统 / 数据架构与工程契约设计审查 | API Draft、Draft Review、系统架构、数据架构、Spec Delta 草案 | OpenAPI Freeze、Architecture Review 最终放行、Spec Delta 必要性最终判断 | Design Review / OpenAPI Review 记录任务包和冲突裁决 |
| 6. 契约冻结与 Ticket formalization | 垂直切片草案、实现仓库 / 脚手架状态检查 | Ticket 范围最终裁剪、Issue tracker 状态同步 | Ticket 或 implementation routing 记录 subagent 分工 |
| 7. 垂直切片与 TDD 实现 | 前端、后端、测试、验证按文件 / 模块拆分；独立 code review | 风险 / 回滚约束裁决、Build Architecture Checklist 违反项处理、可合并结论 | implementation routing、review report、verification 记录写范围和独立审查 |
| 8. 验证发布与复盘 | fresh verification 执行、release note / retro 草案 | 发布、合并、完成结论和 Git checkpoint 范围 | stage checkpoint 记录验证证据和主控采纳结论 |

## 21 个门禁 / 职责点映射

| 原职责点 | 归属主阶段 | 产物要求 | 是否必需 |
|---|---|---|---|
| 0. 入口分诊 | 1. 入口分诊 | 分诊结论、最小技能集、最近可信阶段 | 必需 |
| 1. 机会探索 | 2. 机会与 Discovery | 机会输入、MVP 边界、非目标范围 | 新产品 / 新模块必需 |
| 2. 业务架构 | 3. 业务 / Spec / 功能架构 | 业务架构或 Spec 中等价章节 | 新产品 / 新业务域必需 |
| 3. 需求澄清 | 3. 业务 / Spec / 功能架构 | `grill-with-docs` 结论或等价澄清记录 | 新功能 / 较大改动必需 |
| 4. 需求基线 / 功能架构 | 3. 业务 / Spec / 功能架构 | Spec；产品总体设计 / 功能架构资产；功能域、模块边界、低保真原型、验收标准 | 进入 Spec 初稿 / 需求基线流程时必需 |
| 5. 页面 / 原型 / 交互设计 | 4. 产品设计与需求冻结 | 基于 Spec 初稿和产品总体设计 / 功能架构产出的交互说明、页面清单、状态矩阵 | 有 UI 时必需；缺产品总体设计时阻断 |
| 6. 原型评审 | 4. 产品设计与需求冻结 | Prototype Review 结论；通过后必须产出 Ant Design v6 高保真 HTML 原型，可由系统 / Agent 自动生成；必须记录 AntD CLI 校验证据；产出后必须获得用户确认 | 有 UI 时必需 |
| 7. Spec 校准 / 需求冻结 | 4. 产品设计与需求冻结 | 需求冻结记录或校准后的 Spec | 必需；无 UI 可轻量化 |
| 8. API 影响分析 / 契约草案 | 5. 系统 / 数据架构与工程契约设计审查 | API 影响记录、契约草案 / OpenAPI Draft 或无 API 影响记录；Draft 在 Freeze 前仅可评审；中高风险变更补 OpenSpec-style Spec Delta | 有 API 影响时必需；Spec Delta 条件必需 |
| 9. 工程基线 | 5. 系统 / 数据架构与工程契约设计审查 | 工程基线 / YSS DDD Review | 新服务 / 新模块 / 后端结构变化时必需 |
| 10. 系统总体架构 / 方案设计 | 5. 系统 / 数据架构与工程契约设计审查 | 系统概要设计、ADR 候选 | 服务边界、集成、NFR、运维变化时必需 |
| 11. 数据架构 / 元模型设计 | 5. 系统 / 数据架构与工程契约设计审查 | 数据架构 | 持久化、元数据、版本、血缘、查询 / 搜索变化时必需 |
| 12. 设计审查 | 5. 系统 / 数据架构与工程契约设计审查 | Design Review 结论 | 进入 Freeze 前必需 |
| 13. 契约冻结 | 6. 契约冻结与 Ticket formalization | OpenAPI Freeze 记录或无 API 影响记录 | 有 API 影响时必需；无 API 时记录结论 |
| 14. Ticket formalization | 6. 契约冻结与 Ticket formalization | 垂直切片 Ticket、`to-tickets` 输出或等价任务记录，并记录受影响前后端工程存在性判定、`scaffold_status` 与外部脚手架目标确认 | 正式垂直切片前必需 |
| 15. 实施计划 | 7. 垂直切片与 TDD 实现 | 垂直切片 Ticket、实施计划、Build Architecture Checklist、回滚点，以及缺失前后端工程时的脚手架初始化记录；涉及 DDL / SQL / 数据库迁移、权限接入或审计日志时记录人工确认结论 | 正式开发前必需 |
| 16. 开发实现 | 7. 垂直切片与 TDD 实现 | TDD 证据、代码实现、契约对齐、架构约束回勾 | 代码变更时必需 |
| 17. 独立审查 | 7. 垂直切片与 TDD 实现 | Review Report、`code-review` 结论或 MR / PR 评论；发生 merge / rebase 冲突时补 `resolving-merge-conflicts` 记录 | 合并 / 发布前必需 |
| 18. 清理简化 | 7. 垂直切片与 TDD 实现 | 清理项记录或 review 建议 | 有复用 / 可读性 / 性能问题时执行 |
| 19. 验证发布 | 8. 验证发布与复盘 | fresh verification、发布说明、实施 / 回滚说明 | 发布 / 可合并结论前必需 |
| 20. 复盘沉淀 | 8. 验证发布与复盘 | 复盘、CONTEXT / AGENTS / ADR 更新 | 发布后或阶段性复盘时必需 |

## 模板索引

| 产物 | 推荐路径 | 模板 |
|---|---|---|
| Discovery 收敛 | `docs/discovery/<feature>-discovery.md` | `docs/discovery/templates/discovery-template.md` |
| 竞品情报简报 | `docs/discovery/reports/<feature>-competitive-intelligence.md` | `competitive-intelligence` 输出格式 |
| 竞品矩阵 | `docs/discovery/reports/<feature>-competitive-matrix.md` | `docs/discovery/templates/competitive-matrix-template.md` |
| 技术 / 标准 / API 调研 | `docs/discovery/reports/<feature>-research.md` 或 `docs/research/<feature>.md` | `research` 输出格式 |
| Spec | `docs/requirements/<feature>-spec.md`（兼容 legacy `<feature>-prd.md`） | `docs/templates/prd-template.md` |
| 业务架构 | `docs/architecture/<feature>-business-architecture.md` | `docs/architecture/templates/business-architecture-template.md` |
| 功能架构 | `docs/architecture/<feature>-functional-architecture.md` | `docs/architecture/templates/functional-architecture-template.md` |
| 产品总体设计 | `docs/design/<feature>-product-overview-design.md` | `docs/design/templates/product-overview-design-template.md` |
| 交互说明 | `docs/design/<feature>-interaction-spec.md` | `docs/design/templates/interaction-spec-template.md` |
| 状态矩阵 | `docs/design/<feature>-state-matrix.md` | `docs/design/templates/state-matrix-template.md` |
| 原型评审 | `docs/design/<feature>-prototype-review.md` | `docs/design/templates/prototype-review-checklist.md` |
| 高保真 HTML 原型 | `docs/design/prototypes/<feature>/index.html` | `product-design:index` 路由到 Product Design focused skill 产出 |
| 高保真原型确认记录 | `docs/design/<feature>-prototype-confirmation.md` | `docs/design/templates/prototype-confirmation-template.md` |
| 需求冻结 | `docs/requirements/<feature>-requirement-freeze.md` | `docs/templates/requirement-freeze-template.md` |
| API 影响分析 / 契约草案 / OpenAPI Draft | API 影响记录、issue note 或 `docs/api/specs/<feature>.yaml` | `docs/templates/openapi-spec-template.yaml` |
| OpenSpec-style Spec Delta | `docs/specs/<feature>-spec-delta.md` | `docs/templates/spec-delta-template.md` |
| OpenAPI Draft Review | `docs/api/<feature>-openapi-draft-review.md` | `docs/api/templates/openapi-draft-review-checklist.md` |
| 工程基线审查 | `docs/architecture/<feature>-engineering-baseline-review.md` | `docs/architecture/templates/engineering-baseline-review-template.md` |
| 系统概要设计 | `docs/architecture/<feature>-system-overview-design.md` | `docs/architecture/templates/system-overview-design-template.md` |
| 数据架构 | `docs/architecture/<feature>-data-architecture.md` | `docs/architecture/templates/data-architecture-template.md` |
| 架构 / 设计审查 | `docs/architecture/<feature>-architecture-review.md` | `docs/architecture/templates/architecture-review-checklist.md` |
| OpenAPI Freeze | `docs/api/<feature>-openapi-freeze.md` | `docs/api/templates/openapi-freeze-record-template.md` |
| 垂直切片 Ticket | GitLab / GitHub Issues、local `tickets.md`、`docs/requirements/tickets/<feature>-slice.md` 或 legacy `docs/requirements/issues/<feature>-slice.md` | `docs/templates/vertical-slice-issue-template.md` |
| 实现路由 | `docs/requirements/tickets/<feature>-implementation-routing.md`（兼容 legacy `docs/requirements/issues/<feature>-implementation-routing.md`） | `docs/templates/implementation-routing-template.md` |
| 跨阶段 / 跨仓库交接 | Ticket / MR / PR 评论或 `docs/implementation/<feature>-handoff.md` | `handoff` 或等价交接记录 |
| 实现仓库登记 | 实施计划 / Ticket / `docs/implementation/<feature>-repo-registry.md` | `docs/templates/implementation-repo-registry-template.md` |
| 跨仓库切片记录 | 垂直切片 Ticket / `docs/implementation/<feature>-cross-repo-slice.md` | `docs/templates/cross-repo-slice-template.md` |
| Build Architecture Checklist | `docs/implementation/<feature>-build-architecture-checklist.md` 或实施计划 / Ticket | `docs/templates/build-architecture-checklist-template.md` |
| 审查报告 | MR / PR 评论或 `docs/requirements/issues/<feature>-review.md` | `docs/templates/review-report-template.md` |
| Fresh verification | issue / MR / release note 或 `docs/testing/<feature>-verification.md` | `docs/templates/verification-record-template.md` |
| 发布说明 | `docs/releases/<version>-<feature>.md` | `docs/templates/release-note-template.md` |
| 实施记录 | `docs/implementation/<feature>-rollout.md` | `docs/templates/implementation-plan-template.md` |
| 用户手册 | `docs/user-guide/<feature>.md` | `docs/user-guide/templates/user-guide-template.md` |
| 复盘 | `docs/process/sprint-retros/<date>-<topic>.md` | `docs/templates/retro-report-template.md` |
| 流程 / Skill 修订验证 | `docs/process/<topic>-skill-validation.md` 或 PR / Ticket 评论 | `writing-skills` 压力场景与验证记录 |
| Subagent 协同规范 | `docs/process/subagent-collaboration.md` | 直接维护 |
| Subagent 任务包 | Ticket / 阶段文档或 `docs/requirements/issues/<feature>-subagent-task-package.md` | `docs/templates/subagent-task-package-template.md` |
| Subagent 协同验证 | `docs/process/subagent-collaboration-validation.md` | 直接维护 |
| Harness 工作单元映射 | `docs/process/harness-work-unit-map.md` | 直接维护 |
| Harness 流程裁剪 | `docs/process/harness-process-tailoring.md` | 直接维护 |
| 阶段 checkpoint | Ticket / MR / PR 评论或阶段文档 | `docs/process/templates/stage-checkpoint-template.md` |

## 执行规则

- 每次开始前先判断任务类型和最近可信阶段；不要把小文案、局部样式、单点 Bug 套进完整新功能流程。
- 判断流程裁剪时先引用 `docs/process/harness-process-tailoring.md`；该指南只能减少不相关产物，不能裁剪关键追踪关系、人工审查或 fresh verification。
- 使用 subagent 前必须引用 `docs/process/subagent-collaboration.md` 或等价规则，明确主控 Agent、任务包、写范围、不可委派门禁和汇合方式；阶段 checkpoint 必须记录 subagent 使用、冲突处理和主控采纳结论。
- Discovery 可以通过 `competitive-intelligence` 形成竞品情报、竞品矩阵、机会说明、产品功能指引和下游影响清单，但这些只是 Spec、功能架构、产品设计、API 和架构阶段的输入，不冻结后续设计。
- 技术事实、框架行为、标准、第三方 API 或协议依据需要可追溯时，使用 `research` 或等价一手资料调研记录；其结论是 Spec、OpenAPI、架构或 ADR 的输入，不替代这些阶段资产。
- 状态机、复杂业务规则或 UI 方向难以文字定稿时，可用 `prototype` 做一次性验证；必须把结论回填到 Spec、设计、ADR 或 Ticket，且不得把 throwaway prototype 当作生产实现或高保真 AntD HTML 原型。
- API 相关阶段必须区分“契约草案 / OpenAPI Draft”和“OpenAPI Freeze”：Draft 仅可用于评审和架构反审，Freeze 前不得作为前后端实现或生成客户端的稳定契约。
- OpenSpec-style Spec Delta 只用于表达行为差异、验收场景和测试映射；它不替代 Spec、OpenAPI、Design Review 或垂直切片 Ticket，也不要求创建额外变更目录。
- API、权限、状态机、数据模型、跨端、新模块或高风险变更应在 Design Review / OpenAPI Freeze 前补充 Spec Delta；小文案、局部样式、配置微调和低风险 Bug 默认跳过。
- OpenAPI Freeze 后直接进入 `to-tickets` 或等价垂直切片拆分，不再要求额外变更目录或状态文件。
- 进入实现前，必须先判断当前切片受影响的 frontend / backend 运行时代码工程是否已经存在且可复用；若不存在、不可复用或目录约定缺失，必须先登记 `scaffold_status=required`，补实现仓库登记或确认外部脚手架目标，再路由 `yss-ddd-scaffold-generator` 或 `yss-frontend-scaffold-generator` 初始化后进入业务实现。
- 进入垂直切片实现前，必须将系统架构、数据架构、ADR、工程基线、OpenAPI Freeze 结论和风险 / 回滚约束转译成 `Build Architecture Checklist`。
- 跨线程、跨仓库、上下文过长或原型结论回流时，必须留下 `handoff` 或等价交接记录，至少包含来源资产、当前阶段、未决问题、验证命令和下一步责任人。
- 每个垂直切片完成时必须回勾 `Build Architecture Checklist`，用 `implemented`、`seam-deferred`、`drift`、`violation` 或 `not-applicable` 标记状态，并提供证据或补齐落点。`drift` 触发 Architecture Re-check；`violation` 阻断继续 build。
- Repository / Gateway / 持久化、权限 / 授权、审计、SQL / DDL / 迁移、文件上传下载、版本快照 / 元数据 / 血缘 / 查询索引、部署 / 回滚 / 运维约束，必须在 checklist 中逐项绑定切片和人工确认要求。
- 每个主阶段结束都要做 issue tracker 同步：按用户明确选择或当前仓库主远端路由到 GitLab / GitHub，更新对应 Spec、垂直切片 Ticket、里程碑或评论，记录阶段状态、完成范围、验证证据、阻塞项、下一步和人工审查点。
- 每个主阶段结束都要做 Git checkpoint 判断：列出变更产物、Ticket 同步状态、排除无关脏文件，并说明提交 / 推送 / 暂缓原因。
- 存在需要人工确认的风险时，模板中必须记录范围、责任人和结论或待补齐事项。
- 任何“完成 / 可合并 / 可发布”结论必须有 fresh verification 证据。
- 发生 merge / rebase 冲突时，必须按 `resolving-merge-conflicts` 或等价流程记录双方意图、取舍和重新验证结果。
- 修改 AGENTS、流程模板或技能说明时，必须按 `writing-skills` 思路补充压力场景或验证说明，避免流程规则只停留在不可执行文字。
