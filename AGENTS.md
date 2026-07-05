# AGENTS.md — AI 开发指令

> **本文档是 AI Harness 的核心载体。所有 AI Agent 启动时必须读取本文档。**

---

## 项目概述

- **项目名称：** [填写]
- **业务领域：** [填写]
- **团队规模：** [填写]

---

## 测试要求

| 层级 | 覆盖率要求 |
|------|-----------|
| Domain / Application 层 | >= 90% |
| API 层 | >= 80% |
| 前端组件 | >= 75% |
| 关键流程 | 100% (E2E) |

---

## 安全红线（AI 绝对不可触碰）

| 场景 | AI 权限 |
|------|---------|
| 支付相关逻辑 | 仅生成草案 |
| 数据库迁移脚本 | 仅生成模板 |
| 认证/授权中间件 | 仅生成草案 |
| 加密算法实现 | **禁止生成** |
| SQL 原生查询 | 仅生成草案 |
| 公共基础库 API 变更 | 仅生成草案 |

触碰安全红线时，必须标记 `ready-for-human` 或 `TODO-HUMAN-REVIEW`，Agent 只能生成草案或模板，不得直接交付生产实现。

---

## 研发协作体系：Matt Engineering Skills × YSS × OpenAPI

| 层级 | 组件 | 职责 |
|------|------|------|
| 规格驱动层 | PRD / OpenAPI 3.1 / OpenSpec-style Spec Delta / Vertical Slice Issue | 固化需求、接口契约、条件行为差异、验收标准和端到端任务边界 |
| 领域与工程基线层 | `CONTEXT.md` / ADR / YSS DDD skills / Gateway / Repository | 统一领域语言、模块边界、依赖方向和业务行为 |
| 方法论层 | Matt Pocock Engineering Skills | 提供需求澄清、PRD、Issue 拆分、TDD、Bug 诊断、代码审查和架构治理流程 |
| 可视化辅助层 | Excalidraw diagrams / prototypes / architecture diagrams | 将流程、架构、状态、依赖和切片关系可视化，辅助共识和审查 |
| 执行与追踪层 | Issue tracker / CI / review / Git checkpoint | 追踪阶段状态、验证证据、阻塞项、人审点和发布记录 |

一句话：

```text
PRD 定义要做什么，OpenAPI 定义前后端契约，YSS 定义工程边界；Matt skills 让澄清、拆分、实现、审查和验证保持轻量可追溯。
```

---

## Agent skills

本仓库已内置 Matt Pocock Engineering Skills，Codex、Claude、Hermes、Pi、Trae 等项目 Agent 目录均可读取。固定来源为 `mattpocock/skills` 的 `skills/engineering`，快照提交 `272f99b22574f50e4266791c86b9302682970e23`。竞品分析额外内置 `competitive-intelligence`，来源为 `anthropics/knowledge-work-plugins` 的 `sales/skills/competitive-intelligence`。

能力说明见 `docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md`。常用链路：

```text
yss-product-lifecycle
-> competitive-intelligence (需要竞品 / 市场事实时)
-> grill-with-docs
-> to-prd
-> OpenAPI Draft
-> OpenSpec-style Spec Delta (中高风险行为变化时)
-> OpenAPI Freeze
-> to-issues
-> implement / tdd
-> code-review
-> fresh verification
```

### Issue tracker

Issues、PRD 和 triage 不得写死到单一平台；必须按用户明确选择或当前仓库主远端在 GitLab Issues / GitHub Issues 间路由。详见 `docs/agents/issue-tracker.md`。

流程状态必须同步到选定 issue tracker：PRD、需求冻结、OpenAPI Freeze、垂直切片、阶段完成、验证结果、阻塞项和安全人审点都必须更新到对应 Issue / 里程碑 / 评论中，不得只停留在本地文档。

### Triage labels

使用标准五态标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

使用单上下文领域文档布局：根目录 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。

### Documentation language

面向业务用户、产品、架构、YSS lifecycle、Issue、Review、Release、Implementation 和 Retro 的持久化文档默认使用中文落地。保留英文专有名词、代码标识、API 路径、schema 名称、类名、方法名、文件名、枚举值、错误码和命令，不强行翻译。若外部工具模板或协议要求英文 frontmatter / key / metadata，仅 metadata 使用英文，正文仍使用中文。用户明确要求英文或目标读者为英文团队时除外。

### Skill artifact language

Matt skills 与 YSS skills 产物正文默认使用中文，包括澄清记录、PRD、Issue、设计说明、实施说明、审查报告、验证记录和复盘说明。英文名称、接口名、路径、字段名、命令和其他必要 metadata 仍按原样保留。

---

## Recommended flow

默认日常执行使用 8 个主阶段，21 个门禁 / 职责点只用于审查和补齐缺失资产，不作为每次需求都必须逐项执行的主流程。

```text
入口分诊
-> 机会与 Discovery
-> 业务 / PRD / 功能架构
-> 产品设计与需求冻结
-> 系统 / 数据架构与工程契约设计审查
-> 契约冻结与 Issue formalization
-> 垂直切片与 TDD 实现
-> 验证发布与复盘
```

阶段、产物、模板和 21 个门禁 / 职责点的权威映射见 `docs/process/lifecycle-artifact-map.md`。流程裁剪规则见 `docs/process/harness-process-tailoring.md`。

---

## Mandatory skill rules

- 新产品、新模块或较大变更必须先判断生命周期阶段、缺失资产和下一步；可用 `yss-product-lifecycle`，已有等价记录时可复用。
- 小需求变更或迭代不从头重跑完整链路；必须先做影响面评估，找到最近可信阶段，只补齐受影响阶段及其下游资产。
- 任务开始前必须先参考 `docs/process/harness-process-tailoring.md` 判断小改动 / 中等变更 / 新模块或高风险变更；裁剪只能减少不相关产物，不能裁剪安全人审、Issue 追踪、Git checkpoint 和 fresh verification。
- 新功能或较大改动必须先用 `grill-with-docs` 澄清需求，再用 `to-prd` 形成 PRD，并在 PRD、实施计划或 Issue 中引用澄清记录。
- PRD 基线阶段必须同步明确功能架构：功能域、模块边界、优先级、MVP / 非目标范围和模块依赖；不清晰时不得进入 PRD 校准。
- 涉及页面设计、原型评审、UI 实现、组件选型、主题 token、颜色排版间距或 Ant Design / YSS UI 风格一致性的任务，必须先用 `yss-design-system` 作为设计系统基线；详细规范引用 `docs/design/design-system.md`。
- 有用户界面的功能在 PRD 初稿后必须先引用 `yss-design-system`，再用 `product-design-prototype` 产出页面、原型、交互状态、PRD 回填项和 OpenAPI 反推清单，并通过 `prototype-review` 后才能进入 PRD 校准 / 需求冻结和 UI 驱动的 OpenAPI Draft。
- 任何 API 契约变更必须先在 `docs/api/specs/*.yaml` 形成 Draft；有 UI 的功能不得只基于 PRD 反推 OpenAPI，必须结合产品总体设计、页面/原型/交互说明、状态矩阵和 `prototype-review` 结论，经工程基线（如适用）、系统 / 数据架构和设计审查后 Freeze，再实现前后端和测试。
- API、权限、状态机、数据模型、跨端、新模块或高风险行为变化，应在 Design Review / OpenAPI Freeze 前补充 OpenSpec-style Spec Delta，落点为 `docs/specs/<feature>-spec-delta.md`；小文案、局部样式、配置微调和低风险 Bug 默认不需要。Spec Delta 只记录行为差异、验收场景和测试映射，不恢复 OpenSpec CLI、额外变更目录或状态机。
- OpenAPI Freeze 后进入 `to-issues`，将冻结范围拆成端到端垂直切片 Issue；不得要求额外状态机或变更目录作为交付前置。
- 涉及服务边界、部署、集成、性能、安全、可靠性或运维的变更，必须在设计审查前产出系统总体架构或等价设计记录。
- 涉及持久化、Repository、元数据、版本、血缘、搜索或查询策略的变更，必须在开发前产出数据架构；数据模型、元数据管理、ER 设计、版本管理或血缘分析类产品必须在 Design Review 和 OpenAPI Freeze 前完成数据架构。
- 进入实现前，必须先判断当前需求涉及的前端 / 后端运行时代码工程是否已存在且可复用；若不存在、不可复用或目录约定缺失，必须先在 implementation routing 中记录原因，并路由到 `yss-ddd-scaffold-generator` 或 `yss-frontend-scaffold-generator` 初始化对应脚手架后再进入业务实现。
- 进入实现前，必须把系统架构、数据架构、ADR、工程基线、OpenAPI Freeze 结论和安全红线转译为当前切片的 `Build Architecture Checklist`。
- 每个垂直切片完成时必须回勾 `Build Architecture Checklist`：已落实项给出代码、测试或文档证据；延期项说明原因、风险、补齐切片和是否允许继续；漂移项必须触发 Architecture Re-check；违反项必须停止实现并回到设计审查或架构修正。
- 涉及 Repository / Gateway / 持久化边界、权限 / 认证 / 授权、审计日志、SQL / DDL / 迁移、文件上传下载 / 临时 URL、版本快照 / 元数据 / 血缘 / 查询索引、跨模块接口、部署、回滚或运维约束时，必须在当前切片的实现记录中写明架构对齐状态和 `TODO-HUMAN-REVIEW` 补齐落点。
- 当需求、架构、流程、状态机、数据流或垂直切片关系仅靠文字难以说明时，可用 `excalidraw-diagram-generator` 生成 `.excalidraw` 图作为辅助材料；图不能替代 PRD、OpenAPI、ADR 或测试。
- 任何 Bug、测试失败或性能回退必须先用 `diagnosing-bugs` 建立可复现反馈命令，再修复。
- 业务行为实现默认使用 `tdd`：先写一个会失败的行为测试并确认失败，再写最小实现；生成代码、配置或一次性原型如不适用 TDD，必须明确例外原因和验证方式。
- 架构治理、难测模块、深模块设计必须使用 `improve-codebase-architecture` / `codebase-design` 的 module、interface、seam、adapter 术语。
- `to-issues` 产出的任务必须是端到端垂直切片，不允许只按 Adapter / Application / Domain / Infrastructure 横向拆分。
- 每个生命周期阶段完成后必须执行 Git checkpoint 判断：列出阶段产物、Issue 同步状态、排除无关脏文件，并在用户已授权时按范围提交和推送。
- 任何“完成 / 可合并 / 可发布”结论必须有 fresh verification 证据；不得只凭实现者自述通过。
- 发布后或阶段性完成后必须做复盘判断；若发生架构返工、verify 返工、IMPORTANT / CRITICAL review findings 或 `TODO-HUMAN-REVIEW` 延期，必须落中文复盘记录，并把流程修订回写到 `AGENTS.md`、`docs/process/lifecycle-artifact-map.md`、ADR 或模板中。

---

## 工程基线与编码入口

`AGENTS.md` 只保存 Agent 必须先遵守的入口级规则，不承载完整编码手册。后端脚手架、DDD 分层、命名、Repository、MapStruct、统一响应等细则以 YSS skills 为准。

### 实现工作区目录约定

本仓库默认作为研发管理仓库，管理 PRD、OpenAPI、架构、垂直切片、验证、发布和复盘；前端 / 后端代码默认位于独立实现仓库。任何脚手架生成步骤，在写入业务代码、生成后端 / 前端工程骨架或创建实现目录前，必须先检查并记录实现仓库或实现位置。

默认推荐：外部实现仓库。

- 后端、前端或其他运行时代码优先落在各自 Git 仓库，并在 PRD、实施计划、Issue 或实现路由记录中登记 repo URL、分支、MR / PR、CI、测试命令和验证证据。
- 已有工程目录不得被强制搬迁；继续使用时必须记录为当前需求的实现位置，并说明是否计划后续迁移。
- 进入实现前必须先判断受影响的 frontend / backend 工程是否已经存在、是否仍可复用、是否满足当前契约与技术基线；若任一受影响端不存在可用工程，必须先补实现仓库决策，再分别路由 `yss-ddd-scaffold-generator` 或 `yss-frontend-scaffold-generator` 初始化。
- 实现仓库接入、跨仓库切片绑定和验证回流见 `docs/process/implementation-repo-integration.md`。

例外：只有用户明确选择本仓库承载实现代码时，才按需创建轻量 monorepo 目录：

```text
apps/backend/
apps/frontend/
docs/releases/
docs/implementation/
```

不得由 Agent 自行理解并新建任意顶层业务代码目录；如果目录约定缺失或与现状冲突，先停在工程基线 / implementation routing，补齐决策后再进入实现。

### YSS 实现规范加载门禁

`yss-ddd-scaffold-generator` 只用于生成后端工程骨架和工程基线输入，不代表后续业务代码天然符合 YSS 规范。垂直切片实现、代码生成或重构只要涉及 YSS 后端 / 前端实现，必须先完成以下门禁：

1. 先判断当前切片受影响的 frontend / backend 运行时代码工程是否已存在且可复用，并把结论记录到实施计划或切片 issue 中。
2. 若受影响的后端工程不存在或不能复用，先用 `yss-ddd-scaffold-generator` 初始化；若受影响的前端工程不存在或不能复用，先用 `yss-frontend-scaffold-generator` 初始化。缺失实现仓库决策时，不得跳过该步骤直接写业务代码。
3. 从零后端骨架生成后，必须用 `yss-backend-scaffold-parent` 做工程基线检查；不得把脚手架 sample 代码当作业务实现交付。
4. 先使用 `yss-router` 判断最小 YSS skill 集合，并把路由结果记录到实施计划或切片 issue 中。
5. 每个垂直切片在写业务代码前，按影响面加载专项规范：
   - 领域建模 / 聚合 / 状态流：`yss-domain-modeling`，落代码时接 `yss-domain` / `yss-backend-scaffold-domain`。
   - Repository / PO / Convertor / GatewayImpl：`yss-repository`，需要 MyBatis 细节时接 `yss-mybatis` / `yss-backend-scaffold-infrastructure`。
   - Controller / DTO / VO / Web Convertor：`yss-web-controller`、`yss-dto`、`yss-backend-scaffold-web`。
   - 前端页面、组件、API 接入、YSS UI：按 `yss-router` 选择 `yss-page-module-development`、`yss-components`、`api-integration` 等最小集合。
6. Java 后端实现和审查必须同时遵守 `alibaba-java-code-style`；命名、异常、日志、集合、单元测试、ORM/MyBatis、Maven 和安全相关强制项作为 review blocker 处理。
7. 实现计划和 review 记录必须列出本切片实际使用的 YSS / Alibaba 规范输入、验证命令和未覆盖原因；不得用“符合 YSS”笼统替代具体 skill 证据。

### YSS DDD 分层红线

后端服务默认采用 YSS DDD 多模块架构，不再以传统 `Controller -> Service -> Repository` 三层作为唯一模型。

```text
Adapter -> Application -> Domain
Infrastructure -> Domain Gateway / Repository Interface
Bootstrap -> 组装启动、配置和依赖
```

调用方向：

```text
Web Adapter
-> Application Use Case / Command Handler
-> Domain Model / Domain Service
-> Domain Gateway
-> Infrastructure GatewayImpl / Repository
-> Database / External System
```

红线：

- Domain 层不得依赖 Adapter、Infrastructure、Mapper、Controller 或 Web DTO。
- Gateway 接口定义在 Domain，GatewayImpl / Repository 实现在 Infrastructure。
- Controller 只做协议适配、参数校验和响应包装，不穿透 Repository。
- 对象转换优先使用 MapStruct，不手写大段重复 mapping。
- PO、VO、CMD、Query 命名沿用 YSS 约定；分页 Query 继承项目约定的分页基类。

### API 与前后端契约

- API 路径默认版本化：`/api/v1/`。
- 后端返回统一响应包装：`SingleResult<T>`、`MultiResult<T>`、`PageResult<T>`。
- 以 OpenAPI 3.1 Spec 作为 API 契约。
- 契约变更必须先形成 Draft，经工程基线、系统 / 数据架构和设计审查后 Freeze，再分别实现前后端和测试。

---

## AI Agent 协作规范

这些阶段不是死流程。Agent 必须先判断任务类型，再选择最小必要流程；明确 Bug、小调整和探索任务不应被强行套入完整新功能链路。

### 任务入口分流

| 任务类型 | 推荐路径 | 关键门禁 |
|------|------|------|
| 模糊想法 / 产品机会 | 机会探索环 -> `grill-with-docs` -> PRD | 进入 PRD 前必须收敛用户、痛点、MVP 和非目标范围 |
| 已有竞品 / 用户 / 行业材料 | `competitive-intelligence` -> Discovery -> 机会构想 -> `grill-with-docs` -> `to-prd` | 事实输入必须转化为 MVP 边界和验收标准 |
| 新模块 / API / 跨端改动 | 入口分诊 -> Discovery -> PRD / 功能架构 -> 产品设计与需求冻结（有 UI 时）-> 系统 / 数据架构与工程契约设计审查 -> OpenAPI Freeze -> `to-issues` -> `implement` / `tdd` -> `code-review` | 契约变更先形成 API 影响记录和契约草案 / review-only OpenAPI Draft，经工程基线、系统 / 数据架构和 Design Review 后再 Freeze |
| 小需求变更 / 已有功能迭代 | 影响面评估 -> 选择最近可信阶段 -> 更新受影响资产 -> 必要评审 -> TDD / verify | 不重跑机会探索和全量 PRD；若影响 API、状态机、权限、数据模型、跨端协作或安全红线，则从对应阶段延伸并补齐下游门禁 |
| 明确 Bug / 测试失败 / 性能回退 | `diagnosing-bugs` -> `tdd` -> verify | 先建立可复现反馈命令，再修复 |
| 小文案 / 局部样式 / 配置调整 | 直接最小改动 -> verify | 扩散到 API、状态、权限或多模块时，升级到最早受影响阶段并补齐下游门禁 |
| 架构治理 / 难测模块 | `improve-codebase-architecture` / `codebase-design` -> ADR / Issue | 使用 module、interface、seam、adapter 术语 |

### 审查闭环

审查不是最后一步，而是阶段门禁。任何阻断项都必须回到产生该问题的阶段修正，修正后重新审查。

| 审查点 | 触发时机 | 主审 | 阻断项 |
|------|----------|------|--------|
| PRD Review | PRD 完成后 | Product / Domain Review Agent | 用户、痛点、非目标范围、验收标准或安全红线不清 |
| Grilling Review | 新功能 / 较大改动 PRD 前、Architecture Review 前 | Product / Domain / Architecture Agent with `grill-with-docs` | 用户价值、边界、状态、反例、架构约束、验收标准或安全红线经不起质询 |
| Prototype Review | 有 UI 的 PRD 初稿完成后、PRD 校准前 | Product Design / UX / Frontend / API Agent | 页面清单、原型/线框、用户流、状态矩阵、PRD 回填项、权限状态或 OpenAPI 反推清单不清 |
| API Review | OpenAPI Draft 后 | API + Frontend + Backend Agent | schema、错误结构、分页、权限、契约测试不可落地 |
| Architecture Review | 系统/数据架构后 | Architecture Review Agent | 业务/功能/系统/数据架构、DDD 分层、模块依赖、ADR、状态流或回滚策略不清 |
| Plan Review | 垂直切片生成后 | Planning / Test Agent | 切片横向拆层、缺测试命令、缺回滚点或范围过大 |
| Code Review | 每个 slice 完成后 | 独立 Review Agent / `code-review` | 实现者自审、契约不一致、分层穿透、测试不足 |
| Security Review | 触碰安全红线时 | Security / Human Review | 权限、认证、SQL、加密、迁移或公共 API 风险未人工确认 |
| Release Review | 发布前 | Verify / Release Agent | fresh verification 不足、发布说明、实施步骤或回滚方案缺失 |

### Agent 铁律

1. **实现者 != 审查者** — 同一段代码不能由同一个 Agent 审查。
2. **无测试不写代码** — 业务行为默认先写失败测试，再写实现。
3. **Fail-Closed 审查** — 无法确认安全性时自动拒绝。
4. **安全红线不可逾越** — 触碰红线时标记 `TODO-HUMAN-REVIEW`。

---

## 项目专属约定

<!-- 随项目推进持续补充 -->
### 业务规则

- （待补充）

### 已知陷阱

- 生命周期阶段产物只在本地生成但未提交 / 推送，会导致过程决策、评审依据和后续实现输入不可追溯。阶段结束时必须主动提出或执行 Git checkpoint，并使用显式路径分组提交，避免把环境目录或无关用户改动混入提交。

### 性能基线

- （待补充）

---

## 版本历史

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| | v1.0 | 从 yss-spec-project-template 初始化 |
