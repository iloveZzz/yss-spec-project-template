# AGENTS.md — AI 开发入口规则

> 本文件只保存 Agent 必须首先遵守的仓库身份路由、硬门禁和禁止事项。完整生命周期、流程裁剪和 YSS 实现细则以下文引用的权威资产为准。

## 1. 首先识别仓库身份

每个任务开始时先读取根目录 `yss-project.yaml`：

- `repository_mode: template-source`：使用“模板维护流程”，不默认生成具体产品的 Spec、原型、OpenAPI 或垂直切片 Ticket。
- `repository_mode: project-instance`：按产品研发生命周期分诊任务。
- 文件缺失、schema 版本不支持或模式值非法时，停止路由并执行迁移检查；不根据目录、Git 远程或占位符猜测身份。

仓库身份契约见 `docs/adr/0002-yss-project-repository-mode.md`。

## 2. 单一事实来源

| 事实类型                    | 权威资产                                        |
| ----------------------- | ------------------------------------------- |
| 领域与流程词汇                 | `CONTEXT.md`                                |
| Agent 入口、硬门禁、禁止事项       | `AGENTS.md`                                 |
| 主阶段、门禁、产物、工作单元、证据和稳定 ID | `docs/process/lifecycle-registry.yaml`；`docs/process/lifecycle-artifact-map.md` 为派生阅读视图 |
| 影响面触发与 `not-applicable` | `docs/process/harness-process-tailoring.md` |
| 模板维护强度触发与最低等级 | `docs/process/maintenance-intensity.yaml` |
| 技能清单、来源、版本、哈希和投影目标      | `skills-lock.json`                          |
| 技能分层、别名、默认可发现性和运行时入口 | `docs/agents/yss-skill-registry.yaml`（当前 `status: shadow`，不作为 Router / 生命周期运行时入口） |

README、用户指南、根目录 `CLAUDE.md` 和其他说明文档只引用或解释上述事实，不重复定义同一规则。`CLAUDE.md` 是 Claude Code 入口指针，不是第二套 Agent 规则。

## 3. 标准文档语言与规范语汇

- 所有面向业务、产品、架构、实施、审查、发布和复盘的落地文档，正文统一使用简体中文。
- 英文专有名词、代码标识、API 路径、schema、类名、方法名、枚举值、错误码、命令、文件名和协议 metadata 保持原样。
- 新流程统一使用 Spec、Ticket、`to-spec`、`to-tickets`。过时术语和技能名只能出现在迁移指南或明确标注的旧项目上下文。
- 实施前读取 `CONTEXT.md`；与词汇或 ADR 冲突时立即指出并先解决冲突。

## 4. `template-source` 模板维护路由

按“影响面 → 单一事实来源 → 投影 / 派生资产 → 分级证据”维护。强度分级、最低证据和 checkpoint 合同见 `docs/process/harness-process-tailoring.md`。

- 创建、修改或退役 skill 时使用 `maintaining-skills`，并先按 `docs/process/harness-process-tailoring.md` 判定 L1 / L2 / L3；只有 L3 必须保留完整基线失败、压力场景、修订后验证和正式独立审查证据。
- `.agents/skills` 是跨 Agent 共享技能的权威内容；`.claude/skills`、`.codex/skills`、`.cursor/skills`、`.hermes/skills`、`.pi/skills`、`.qoder/skills`、`.trae/skills` 中的共享技能是生成投影，禁止分别手工修改。Cursor 的契约运行时入口是 `.cursor/skills`；不得把 canonical `.agents/skills` 与某个平台投影当作同权双入口。
- `scripts/verify-template` 是模板发布阻断门禁。模板与外部 `create-yss-spec` 的跨仓库契约未完成集成验证时，不得声称可发布。

## 5. `project-instance` 产品研发路由

先用 `docs/process/harness-process-tailoring.md` 判定变更类型、影响面和最近可信阶段，再按 `docs/process/lifecycle-registry.yaml` 执行命中的工作单元和条件门禁。

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
- 前端测试、type-check 与构建优先使用 `pnpm`；后端校验、测试与编译优先使用项目根 `./mvnw`。不要默认 `npm` / `yarn` 或裸 `mvn`。既有仓库确实没有 pnpm 或 Maven Wrapper 时，必须记录受控例外和实际命令。登记字段见 `docs/process/implementation-repo-integration.md`。
- 路径越界、证据缺失、未执行验证、`drift`、`violation` 或 `new_impacts` 时停止实现并重新路由。

实现细则由已批准合同、YSS skills 和实现接入文档定义；`AGENTS.md` 只保留入口与边界。

## 8. 专项任务的强制入口

| 触发情形 | 必须使用 |
|---|---|
| 技术事实、标准、第三方 API 或框架行为影响决策 | `research` 或等价的一手资料记录 |
| 竞品、市场或用户口碑事实 | `competitive-intelligence` |
| UI 设计、原型、组件或主题 | `yss-design-system` 后使用 `yss-prototype-stage`；Codex 再路由 `product-design:index`，其他 Agent 交付等价合同资产；原型产出前后用 `yss-antd-design` 记录 Ant Design v6 事实与浏览器验证。前端代码落地改用 `yss-ui`，不要继续调用 `yss-antd-design` |
| Bug、测试失败或性能回退 | `diagnosing-bugs` 建立可复现反馈，再用 `tdd` |
| merge / rebase 冲突 | `resolving-merge-conflicts` |
| 架构治理、难测模块或深模块设计 | `improve-codebase-architecture` / `codebase-design` |
| 跨线程、跨仓库、上下文过长或原型结论回流 | `handoff` 或等价交接记录 |
| 本地知识库 init / refresh / rebuild，或要把研究结果落成持久 wiki | `llm-wiki`（落成持久 wiki 用 `ingest`；已映射 live 源变了用 `refresh`） |

业务行为默认按 `tdd` 使用已确认的公开 seam 逐切片实现。一次性生成、纯配置或流程文档不适用代码 TDD 时，必须记录例外理由和可执行验证方式。

## 9. 工作区与实现仓库边界

当前仓库默认是研发管理仓库，运行时代码优先位于已登记的独立实现仓库。只有用户明确选择当前仓库承载实现代码时，才使用唯一的 `apps/backend/<project>/` 或 `apps/frontend/<project>/` 项目根。

`apps/backend/` 和 `apps/frontend/` 只是项目容器；`app/backend/`、`app/frontend/` 及其子路径禁止作为工程输出。完整登记字段和跨仓约束见 `docs/process/implementation-repo-integration.md`。

## 10. 独立审查、验证和追踪

- 实现者不能承担命中的独立审查。模板维护按 L1 / L2 / L3 分别使用 self-check / 人工 checkpoint、聚焦独立审查、正式独立审查；模板发布、代码切片和高风险变更仍必须由其他 Agent 或人工独立审查。
- 任何“完成 / 可合并 / 可发布”结论必须基于 fresh verification，不接受“之前跑过”或实现者自述。
- 在人工暂停、handoff、进入实现、合并或发布边界集中同步范围、验证证据、风险、人工审查点、Ticket 状态和下一步；阻塞、责任人变化或资产单独批准时立即同步。
- Git checkpoint 只包含本轮明确范围；获得用户授权后才提交或推送。
- 发布后或阶段性完成后做复盘判断；出现架构返工、验证返工、IMPORTANT / CRITICAL review finding 或人工确认延期时，落简体中文复盘并修订权威资产。

## 11. Subagent 协同

使用 subagent 前按 `docs/process/subagent-collaboration.md` 定义任务包和不重叠的写入范围。实现者不担任独立审查者；仓库身份、需求 / 契约冻结、Ticket 最终状态、Git checkpoint 和完成结论仍由主控 Agent 或人工决定。

## 12. 测试质量基线

模板推荐值为 Domain / Application `>= 90%`、API `>= 80%`、前端组件 `>= 75%`、已明确的关键流程 `100% E2E`。只有项目实例在测试策略中明确采纳或覆盖后才构成 CI 门禁；未定义关键流程清单时，不声称其 E2E 覆盖率达到 100%。

## Cursor Cloud specific instructions

本仓库是 `template-source` Harness / 研发管理仓库，没有前端 / 后端运行时应用；可运行、可测试的表面只有 Node 工具链与治理校验脚本。

- 依赖与工具链：Node `>=22 <27`（`.nvmrc` 固定 22）；`pnpm` 通过 `packageManager` 字段由 corepack 自动切换到 `10.15.0`，无需手工切换。Node 依赖只装在 `.template-source/tooling/node`，仓库根没有 `package.json`。
- 测试：`pnpm --dir .template-source/tooling/node test`（`node --test`，共 15 个用例）。
- 构建 / lint：`pnpm --dir .template-source/tooling/node build:vendor` 与 `check:vendor` 维护 `scripts/vendor/*.mjs`；顶层 lint 是 `verify-template` 内对所有脚本执行的 `node --check`。
- 完整发布门禁（相当于"运行应用"）：`scripts/verify-template`，成功输出 `模板发布校验通过`。它串联证据索引、`pnpm test`、`check:vendor` 和全部 `scripts/verify-*` 场景校验。
- 非显然的坑：`scripts/verify-lifecycle-registry`（及其对应测试 `Node lifecycle registry verifier ...`）会 shell out 到 `python3` 并 `import jsonschema` 做 JSON Schema 校验。缺少该 Python 模块时测试会以 `ModuleNotFoundError: No module named 'jsonschema'` 失败，而不是代码问题；update script 已负责 `pip3 install jsonschema`。
- `pnpm install` 输出的 `Ignored build scripts: esbuild` 警告可忽略：esbuild 0.28.2 在本平台自带二进制，`build:vendor` / `check:vendor` 无需 `pnpm approve-builds`。
- 常用只读入口：`scripts/repository-mode`（返回仓库身份）、`scripts/generate-lifecycle-artifacts`（从 `docs/process/lifecycle-registry.yaml` 派生产物，输出应无 diff）、`scripts/export-yss-skills --output <dir>`（导出公开技能）。
