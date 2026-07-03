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
| Domain / Application 层 | ≥ 90% |
| API 层 | ≥ 80% |
| 前端组件 | ≥ 75% |
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

---

## 研发协作体系：OpenSpec × Superpowers × YSS

| 层级 | 组件 | 职责 |
|------|------|------|
| **规格驱动层 (SDD)** | PRD / OpenAPI 3.1 / OpenSpec / Comet / Vertical Slice Issue | 将需求、接口、行为规格和任务拆分固化为可追溯资产 |
| **领域与工程基线层 (DDD)** | CONTEXT.md / YSS DDD skills / ADR / Gateway / Repository | 统一领域语言、后端模块边界、依赖方向和业务行为 |
| **方法论层** | Superpowers (grill / plan / tdd / debug / review / verify) | 提供澄清、计划、TDD、诊断、审查和完成前验证方法 |
| **可视化辅助层** | Excalidraw diagrams / prototypes / architecture diagrams | 将流程、架构、状态、依赖和切片关系可视化，辅助共识和审查 |
| **编排层** | OpenSpec / Comet / 项目自选 harness / CI / webhook | 自动化或半自动推进生命周期 |

一句话：

```text
SDD 定义要做什么，DDD 定义业务边界在哪里，TDD 证明实现真的满足规格；三者通过 OpenSpec / Comet / Superpowers / YSS skills 落地。
```

---

## Agent skills

本仓库已集成 Matt Pocock Engineering Skills，Codex 与 Hermes 均可调用。能力说明见 `docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md`。

### Issue tracker

Issues、PRD 和 triage 不得写死到单一平台；必须按用户明确选择或当前仓库主远端在 GitLab Issues / GitHub Issues 间路由。详见 `docs/agents/issue-tracker.md`。

规格流程状态必须同步到选定 issue tracker：用户指定 GitLab 就同步 GitLab，用户指定 GitHub 就同步 GitHub；用户未指定时按当前仓库主远端推断。PRD、需求冻结、OpenAPI Freeze、OpenSpec / Comet change、垂直切片、阶段完成、验证结果、阻塞项和安全人审点都必须更新到对应 Issue / 里程碑 / 评论中，不得只停留在本地文档。

### Triage labels

使用标准五态标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

使用单上下文领域文档布局：根目录 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。

### Documentation language

面向业务用户、产品、架构、OpenSpec / Comet、Superpowers、YSS lifecycle、Issue、Review、Release、Implementation 和 Retro 的持久化文档默认使用中文落地。保留英文专有名词、代码标识、API 路径、schema 名称、类名、方法名、文件名、枚举值、错误码和命令，不强行翻译。若外部工具模板或协议要求英文 frontmatter / key / metadata，仅 metadata 使用英文，正文仍使用中文。用户明确要求英文或目标读者为英文团队时除外。

### Skill artifact language

以下技能链路产物正文默认必须使用中文：

- `openspec` / `OpenSpec`
- `comet`
- `superpowers`
- `grill-with-docs`

这里的“产物”包括但不限于 proposal、design、tasks、spec、handoff、brainstorm summary、PRD、澄清记录、设计说明、实施说明和复盘说明。英文名称、接口名、路径、字段名、命令和其他必要 metadata 仍按原样保留。

### Recommended flow

默认日常执行使用 8 个主阶段，21 个门禁 / 职责点只用于审查和补齐缺失资产，不作为每次需求都必须逐项执行的主流程。

```text
入口分诊
-> 机会与 Discovery
-> 业务 / PRD / 功能架构
-> 产品设计与需求冻结
-> 系统 / 数据架构与工程契约设计审查
-> 契约冻结与 OpenSpec / Comet
-> 垂直切片与 TDD 实现
-> 验证发布与复盘
```

阶段、产物、模板和 21 个门禁 / 职责点的权威映射见 `docs/process/lifecycle-artifact-map.md`。

13 个工作单元是 Harness 工程的对外沟通和试点说明表达层，不替代 8 个主阶段 / 21 个门禁。执行、审查、追踪和裁剪仍以 `docs/process/lifecycle-artifact-map.md` 为权威；13 个工作单元到执行体系的映射见 `docs/process/harness-work-unit-map.md`。

### Mandatory skill rules

- 新产品、新模块或较大变更必须先判断生命周期阶段、缺失资产和下一步；可用 `yss-product-lifecycle`，已有等价记录时可复用。
- 小需求变更或迭代不从头重跑完整链路；必须先做影响面评估，找到“最近可信阶段”（如 PRD、产品总体设计、交互设计、OpenAPI Draft、系统概要设计、垂直切片或实现），只补齐受影响阶段及其下游资产。
- 任务开始前必须先参考 `docs/process/harness-process-tailoring.md` 判断小改动 / 中等变更 / 新模块或高风险变更，并定位最近可信阶段；裁剪只能减少不相关产物，不能裁剪安全人审、Issue 追踪、Git checkpoint 和 fresh verification。
- 生命周期、OpenSpec / Comet、Superpowers 和 YSS skills 产出的持久化文档默认用中文正文；如 skill 模板含英文标题，应在项目内落地时转换为中文标题和中文说明，只保留必要英文 metadata / identifier。
- 涉及页面设计、原型评审、UI 实现、组件选型、主题 token、颜色排版间距或 Ant Design / YSS UI 风格一致性的任务，必须先用 `yss-design-system` 作为设计系统基线；详细规范引用 `docs/design/design-system.md`。
- 新产品或新业务域必须在 PRD 基线前明确业务架构：目标用户、用户旅程、价值流、业务能力地图、角色/组织模型和外部系统边界；已有等价材料时可引用。
- 新功能或较大改动必须先用 `grill-with-docs` 澄清需求，再用 `to-prd` / `to-issues` 形成 PRD 和垂直切片 Issue；若复用已有澄清记录，必须在 PRD、OpenSpec / Comet design 或实施计划中引用该记录，并说明未重新 grilling 的原因。
- PRD 基线阶段必须同步明确功能架构：功能域、模块边界、优先级、MVP / 非目标范围和模块依赖；不清晰时不得进入 PRD 校准。
- 有用户界面的功能在 PRD 初稿后必须先引用 `yss-design-system`，再用 `product-design-prototype` 产出页面、原型、交互状态、PRD 回填项和 OpenAPI 反推清单，并通过 `prototype-review` 后才能进入 PRD 校准 / 需求冻结和 UI 驱动的 OpenAPI Draft。
- 任何 API 契约变更必须先在 `docs/api/specs/*.yaml` 形成 Draft；有 UI 的功能不得只基于 PRD 反推 OpenAPI，必须结合产品总体设计、页面/原型/交互说明、状态矩阵和 `prototype-review` 结论，经工程基线（如适用）、架构/OpenSpec/Comet design 和设计审查后 Freeze，再实现前后端和测试。
- OpenAPI Freeze 后、正式进入 `to-issues` 前，必须先创建或选择匹配的 active OpenSpec / Comet change；若 `openspec list --json` 无匹配 active change，或 `openspec/changes/<change>/` 缺 `proposal.md`、`design.md`、`tasks.md`、至少一个 `specs/**/spec.md` 或 `.comet.yaml`，则不得进入正式垂直切片，必须先路由到 `comet` 或 `openspec-new-change`。
- 存在匹配 active Comet change 时，不得绕过 Comet 直接调用 Superpowers 或 YSS 实现技能；必须先检查 `.comet.yaml` 的 `phase`、`design_doc`、`plan`、`build_mode`、`tdd_mode` 和 `review_mode`。若 phase 仍在 `open` / `design` / 未就绪 `build`，先继续 `comet` / `comet-build`；`yss-router` 的输出作为 Comet build 或等价实现交接输入。
- Comet 管理的正式 change 必须留下显性 Superpowers 证据：design 阶段记录 `brainstorming` / `grill-with-docs` 或等价质询，build entry 记录 Superpowers plan 和 TDD / review 策略，build 阶段记录 RED / GREEN，verify 阶段记录 `verification-before-completion` 和独立 review。不得只生成最终代码和测试而缺少方法论证据。
- 涉及服务边界、部署、集成、性能、安全、可靠性或运维的变更，必须在设计审查前产出系统总体架构或等价设计记录。
- 涉及持久化、Repository、元数据、版本、血缘、搜索或查询策略的变更，必须在开发前产出数据架构；数据模型、元数据管理、ER 设计、版本管理或血缘分析类产品必须在 Design Review 和 OpenAPI Freeze 前完成数据架构。
- 进入 Comet build 前，必须把系统架构、数据架构、ADR、工程基线、OpenAPI Freeze 结论和安全红线转译为当前 change 的 `Build Architecture Checklist`，并记录到实施计划、build entry review 或 `.comet/subagent-progress.md`。架构文档若仍处于 `draft-for-design-review`、缺少 Design Review 结论，或 `Build Architecture Checklist` 未建立，不得进入正式业务实现，只能进入架构对齐、设计复审或 build entry review。
- 每个垂直切片完成时必须回勾 `Build Architecture Checklist`：已落实项给出代码、测试或文档证据；seam / 延期项说明原因、风险、补齐切片和是否允许继续；漂移项必须触发 Architecture Re-check；违反项必须停止 build 并回到设计审查或架构修正。不得只用零散 `TODO` 代替架构对齐结论。
- 涉及 Repository / Gateway / 持久化边界、权限 / 认证 / 授权、审计日志、SQL / DDL / 迁移、文件上传下载 / 临时 URL、版本快照 / 元数据 / 血缘 / 查询索引、跨模块接口、部署、回滚或运维约束时，必须在当前切片的实现记录中写明架构对齐状态和 `TODO-HUMAN-REVIEW` 补齐落点。
- 当需求、架构、流程、状态机、数据流或垂直切片关系仅靠文字难以说明时，可用 `excalidraw-diagram-generator` 生成 `.excalidraw` 图作为辅助材料；图不能替代 PRD、OpenAPI、ADR、Comet design 或测试。
- 从零创建后端服务时，必须优先使用 `yss-ddd-scaffold-generator` 产出骨架；现有服务功能或重构先用 `yss-backend-scaffold-parent` 和对应层级 skill 检查 YSS DDD 工程基线。
- 任何 Bug、测试失败或性能回退必须先用 `diagnosing-bugs` 建立可复现反馈命令，再修复。
- 业务行为实现默认使用 `tdd`：先写一个会失败的行为测试并确认失败，再写最小实现；生成代码、配置或一次性原型如不适用 TDD，必须明确例外原因和验证方式。
- 安全 / 契约收口切片必须建立跨切片命令矩阵；所有 mutating command 至少检查缺少 `X-Idempotency-Key`、同 key 同 payload replay、同 key 不同 payload conflict、result reference 可重新定位、统一错误结构和审计 seam。
- 架构治理、难测模块、深模块设计必须使用 `improve-codebase-architecture` / `codebase-design` 的 module、interface、seam、adapter 术语。
- `to-issues` 产出的任务必须是端到端垂直切片，不允许只按 Adapter / Application / Domain / Infrastructure 横向拆分。
- 触碰安全红线时，必须标记 `ready-for-human` 或 `TODO-HUMAN-REVIEW`，Agent 只能生成草案。
- 每个生命周期阶段完成后必须执行 Git checkpoint 判断：列出阶段产物、Issue 同步状态、排除无关脏文件，并在用户已授权时按范围提交和推送；不得连续推进多个阶段却让 PRD、设计、OpenAPI、架构、评审或 Issue 产物长期只停留在本地工作区或未同步到选定 issue tracker。阶段结束记录可使用 `docs/process/templates/stage-checkpoint-template.md`，至少记录阶段产物、验证证据、阻塞项、安全人审点、排除的脏文件和下一步。
- 任何“完成 / 可合并 / 可发布”结论必须有 fresh verification 证据；不得只凭实现者自述通过。
- 归档或发布后必须做复盘判断。若过程中发生架构返工、Architecture Re-check、verify 返 build、IMPORTANT / CRITICAL review findings、Superpowers 证据缺失或 `TODO-HUMAN-REVIEW` 延期，必须落中文复盘记录，并把流程修订回写到 `AGENTS.md`、`docs/process/lifecycle-artifact-map.md`、ADR 或模板中。

---

## 工程基线与编码入口

`AGENTS.md` 只保存 Agent 必须先遵守的入口级规则，不承载完整编码手册。后端脚手架、DDD 分层、命名、Repository、MapStruct、统一响应等细则以 YSS skills 为准。

### 实现工作区目录约定

本仓库默认作为研发管理仓库，管理 PRD、OpenAPI、OpenSpec / Comet、架构、垂直切片、验证、发布和复盘；前端 / 后端代码默认位于独立实现仓库。Comet open / design / build 或任何脚手架生成步骤，在写入业务代码、生成后端 / 前端工程骨架或创建实现目录前，必须先检查并记录实现仓库或实现位置；如果已有 proposal、design、build entry review 或实施计划已经记录过实现位置，后续阶段复用该记录，不重复询问。

默认推荐：外部实现仓库。

- 后端、前端或其他运行时代码优先落在各自 Git 仓库，并在当前 change 的 proposal、design、build entry review、实施计划或实现路由记录中登记 repo URL、分支、MR / PR、CI、测试命令和验证证据。
- 已有工程目录不得被强制搬迁；继续使用时必须记录为当前 change 的实现位置，并说明是否计划后续迁移。
- 实现仓库接入、跨仓库切片绑定和验证回流见 `docs/process/implementation-repo-integration.md`。

例外：只有用户明确选择本仓库承载实现代码时，才按需创建轻量 monorepo 目录：

```text
apps/backend/
apps/frontend/
docs/releases/
docs/implementation/
```

- 发布说明进入 `docs/releases/`，实施方案、上线记录和回滚方案进入 `docs/implementation/`。
- 不得由 Agent 自行理解并新建任意顶层业务代码目录；如果目录约定缺失或与现状冲突，先停在工程基线 / build entry review，补齐决策后再进入实现。

### YSS 实现规范加载门禁

`yss-ddd-scaffold-generator` 只用于生成后端工程骨架和工程基线输入，不代表后续业务代码天然符合 YSS 规范。Comet open / design / build、垂直切片实现、代码生成或重构只要涉及 YSS 后端 / 前端实现，必须先完成以下门禁：

1. 先使用 `yss-router` 判断最小 YSS skill 集合，并把路由结果记录到 design、build entry review、实施计划或切片 issue 中。
2. 从零后端骨架生成后，必须用 `yss-backend-scaffold-parent` 做工程基线检查；不得把脚手架 sample 代码当作业务实现交付。
3. 每个垂直切片在写业务代码前，按影响面加载专项规范：
   - 领域建模 / 聚合 / 状态流：`yss-domain-modeling`，落代码时接 `yss-domain` / `yss-backend-scaffold-domain`。
   - Repository / PO / Convertor / GatewayImpl：`yss-repository`，需要 MyBatis 细节时接 `yss-mybatis` / `yss-backend-scaffold-infrastructure`。
   - Controller / DTO / VO / Web Convertor：`yss-web-controller`、`yss-dto`、`yss-backend-scaffold-web`。
   - 前端页面、组件、API 接入、YSS UI：按 `yss-router` 选择 `yss-page-module-development`、`yss-components`、`api-integration` 等最小集合。
4. Java 后端实现和审查必须同时遵守 `alibaba-java-code-style`；命名、异常、日志、集合、单元测试、ORM/MyBatis、Maven 和安全相关强制项作为 review blocker 处理。
5. 实现计划和 review 记录必须列出本切片实际使用的 YSS / Alibaba 规范输入、验证命令和未覆盖原因；不得用“符合 YSS”笼统替代具体 skill 证据。

### 规范来源

| 场景 | 规范来源 | 产出阶段 | 主责 |
|------|----------|----------|------|
| 从零创建后端服务 | `yss-ddd-scaffold-generator` | 项目初始化 / 工程基线 | Scaffold / Architecture Agent |
| 检查后端工程基线 | `yss-backend-scaffold-parent` | 方案设计、开发、审查 | Architecture / Code / Review Agent |
| 领域建模和状态规则 | `yss-domain` / `yss-backend-scaffold-domain` | 方案设计、开发 | Domain Agent |
| Repository / MyBatis | `yss-repository` / `yss-mybatis` | 开发实现 | Backend Agent |
| Controller / DTO / VO | `yss-web-controller` / `yss-dto` | API Freeze 后开发 | Backend Agent |
| Java 编码与审查 | `alibaba-java-code-style` | 开发、审查、验证 | Backend / Review Agent |

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
- 契约变更必须先形成 Draft，经工程基线（如适用）、架构 / OpenSpec / Comet design 和设计审查后 Freeze，再分别实现前后端和测试。

---

## AI Agent 协作规范

这些阶段不是死流程。Agent 必须先判断任务类型，再选择最小必要流程；明确 Bug、小调整和探索任务不应被强行套入完整新功能链路。

13 个工作单元可用于向业务方解释端到端链路；Agent 实际执行时必须回到 8 个主阶段 / 21 个门禁、流程裁剪指南和对应模板。

### 任务入口分流

| 任务类型 | 推荐路径 | 关键门禁 |
|------|------|------|
| 模糊想法 / 产品机会 | 机会探索环 → 需求澄清 | 进入 PRD 前必须收敛用户、痛点、MVP 和非目标范围 |
| 已有竞品 / 用户 / 行业材料 | Discovery → 机会构想 → `grill-with-docs` → PRD | 事实输入必须转化为 MVP 边界和验收标准 |
| 新模块 / API / 跨端改动 | 入口分诊 → 机会与 Discovery → 业务 / PRD / 功能架构 → 产品设计与需求冻结（有 UI 时）→ 系统 / 数据架构与工程契约设计审查 → 契约冻结与 OpenSpec / Comet → 垂直切片与 TDD 实现 | 契约变更先形成 API 影响记录和契约草案 / review-only OpenAPI Draft，经工程基线、系统 / 数据架构和 Design Review 后再 Freeze；Freeze 后必须有匹配 active change 和 proposal/spec/design/tasks/.comet.yaml 才能正式 to-issues；数据/元数据类产品必须先完成数据架构；有 UI 时不得从 PRD 初稿直接跳 OpenAPI |
| 小需求变更 / 已有功能迭代 | 影响面评估 → 选择最近可信阶段 → 更新受影响资产 → 必要评审 → TDD / verify | 不重跑机会探索和全量 PRD；若影响 API、状态机、权限、数据模型、跨端协作或安全红线，则从对应阶段延伸并补齐下游门禁 |
| 明确 Bug / 测试失败 / 性能回退 | diagnosing-bugs → tdd → verify | 先建立可复现反馈命令，再修复 |
| 小文案 / 局部样式 / 配置调整 | comet-tweak 或直接最小改动 → verify | 扩散到 API、状态、权限或多模块时，升级到最早受影响阶段并补齐下游门禁 |
| 架构治理 / 难测模块 | improve-codebase-architecture / codebase-design → ADR / Issue | 使用 module、interface、seam、adapter 术语 |

### 机会探索环

机会探索不是固定的“头脑风暴 → 发现”单向流程，而是三类输入之间的循环：

```text
市场 / 竞品 / 用户事实 <-> 机会构想假设 <-> MVP 边界
```

进入 PRD 前必须收敛为：

- 用户是谁。
- 痛点是什么。
- 为什么现在做。
- 第一版做什么。
- 明确不做什么。
- 成功标准是什么。

说明：

- 如果只有一个模糊想法，可以先由 Ideation Agent 发散假设，再由 Discovery Agent 验证。
- 如果已经有行业、竞品或用户材料，应先由 Discovery Agent 整理事实，再由 Ideation Agent 生成候选方案。
- Ideation Agent 的“机会构想”不等同于 Superpowers `brainstorming`。前者回答“可能做什么、是否值得探索”，后者用于某个已选方向进入正式变更后的技术方案澄清、方案比较、风险识别和设计说明。

### 8 个主阶段与 21 个门禁 / 职责点

日常推进只使用 8 个主阶段；21 个原阶段降级为门禁 / 职责点，用来检查是否漏产物、漏评审或误跳流程。详细产物、模板和必需 / 条件必需规则见 `docs/process/lifecycle-artifact-map.md`。

| 主阶段 | Agent | 职责 |
|------|-------|------|
| 1. 入口分诊 | Intake / Lifecycle Agent | 判断任务类型、风险等级、最近可信阶段和最小技能集；选择 OpenSpec / Comet / Superpowers / YSS 路径 |
| 2. 机会与 Discovery | Discovery + Ideation Agent | 收敛用户、痛点、为什么现在做、MVP、非目标和成功标准；必要时产出竞品 / 市场事实 |
| 3. 业务 / PRD / 功能架构 | Business / Product / Functional Architecture Agent | 明确用户旅程、价值流、业务能力、PRD、功能域、模块边界、优先级和验收标准 |
| 4. 产品设计与需求冻结 | Product Design / UX / Product Agent | 有 UI 时完成页面、原型、交互状态、原型评审和 PRD 回填；无 UI 时形成轻量需求冻结结论 |
| 5. 系统 / 数据架构与工程契约设计审查 | API Contract / Scaffold / Architecture / Data Architecture / Review Agent | 合并 API 影响分析、契约草案、工程基线、系统概要设计、数据架构和 Design Review；Draft 仅用于评审，Freeze 前不得作为实现或生成客户端契约 |
| 6. 契约冻结与 OpenSpec / Comet | API / OpenSpec / Comet Agent | 冻结 OpenAPI 或记录无 API 影响；创建或选择 active change 并确认 proposal/spec/design/tasks/.comet.yaml |
| 7. 垂直切片与 TDD 实现 | Planning / Code / Review Agent | 拆端到端垂直切片，检查 Comet build-ready，按 TDD 实现并完成独立审查和必要清理 |
| 8. 验证发布与复盘 | Verify / Release / Retro Agent | fresh verification、发布说明、实施步骤、回滚方案、用户手册和复盘沉淀 |

| 21 个门禁 / 职责点 | 归属主阶段 |
|------|------------|
| 0. 入口分诊 | 1. 入口分诊 |
| 1. 机会探索 | 2. 机会与 Discovery |
| 2. 业务架构 | 3. 业务 / PRD / 功能架构 |
| 3. 需求澄清 | 3. 业务 / PRD / 功能架构 |
| 4. 需求基线 / 功能架构 | 3. 业务 / PRD / 功能架构 |
| 5. 页面 / 原型 / 交互设计 | 4. 产品设计与需求冻结 |
| 6. 原型评审 | 4. 产品设计与需求冻结 |
| 7. PRD 校准 / 需求冻结 | 4. 产品设计与需求冻结 |
| 8. 契约草案 | 5. 系统 / 数据架构与工程契约设计审查 |
| 9. 工程基线 | 5. 系统 / 数据架构与工程契约设计审查 |
| 10. 系统总体架构 / 方案设计 | 5. 系统 / 数据架构与工程契约设计审查 |
| 11. 数据架构 / 元模型设计 | 5. 系统 / 数据架构与工程契约设计审查 |
| 12. 设计审查 | 5. 系统 / 数据架构与工程契约设计审查 |
| 13. 契约冻结 | 6. 契约冻结与 OpenSpec / Comet |
| 14. OpenSpec / Comet change formalization | 6. 契约冻结与 OpenSpec / Comet |
| 15. 实施计划 | 7. 垂直切片与 TDD 实现 |
| 16. 开发实现 | 7. 垂直切片与 TDD 实现 |
| 17. 独立审查 | 7. 垂直切片与 TDD 实现 |
| 18. 清理简化 | 7. 垂直切片与 TDD 实现 |
| 19. 验证发布 | 8. 验证发布与复盘 |
| 20. 复盘沉淀 | 8. 验证发布与复盘 |

### 四类架构产物

架构不是单一阶段一次性产出，而是随生命周期逐步细化：

| 架构产物 | 产出阶段 | 主责 | 最低完成标准 |
|------|------|------|------|
| 业务架构 | 机会探索 / Discovery / 产品定义 | Discovery + Business Architecture Agent | 用户旅程、价值流、业务能力地图、角色/组织模型、外部系统边界和 MVP 非目标范围清楚 |
| 功能架构 | PRD baseline / 产品设计 / PRD 校准 | PRD + Functional Architecture Agent | 功能域、模块边界、优先级、依赖、MVP / 非目标范围和 PRD 缺口清楚 |
| 系统总体架构 | 工程基线 / OpenSpec / Comet design | Architecture Agent | 服务/模块边界、部署、集成、权限、性能、可靠性、可观测性、发布回滚策略清楚 |
| 数据架构 | 详细设计 / 持久化开发前 | Data Architecture + Domain Agent | 概念/逻辑/物理模型、元模型、版本、血缘、查询/搜索、索引、存储和迁移约束清楚 |

数据模型、元数据管理、ER 设计、模型版本或血缘分析类产品中，数据架构是核心产品设计，不是普通实现细节；未完成数据架构不得进入 Repository / MyBatis / 持久化代码开发。

### Build Architecture Checklist

架构文档不能只作为 design 阶段资产存在。进入 Comet build 前，Architecture / Data Architecture / ADR / Engineering Baseline / Security Redlines 必须被转译成可执行检查表，并成为每个垂直切片的完成条件之一。

最低检查项：

- `source`: 回指系统架构、数据架构、ADR、OpenAPI Freeze、工程基线和安全红线来源。
- `constraint`: 架构约束，例如 DDD 分层、Gateway 边界、不可变快照、append-only audit、权限 fail-closed、DDL draft-only、迁移模板人审。
- `slice`: 绑定 DMW 或其他垂直切片编号。
- `status`: `implemented`、`seam-deferred`、`drift`、`violation`、`not-applicable`。
- `evidence`: 代码、测试、文档或人审证据路径。
- `follow-up`: seam / 延期 / 漂移 / 违反时的补齐落点和是否阻塞继续 build。

状态规则：

- `implemented`：已有代码、测试或持久化文档证明满足约束。
- `seam-deferred`：允许临时 seam，但必须说明风险、补齐切片和 `TODO-HUMAN-REVIEW`；安全红线不得无限延期。
- `drift`：实现与架构意图不一致但尚未造成违反，必须先做 Architecture Re-check，再决定是否继续。
- `violation`：违反架构或安全红线，停止继续 build，回到设计审查或架构修正。
- `not-applicable`：说明为何当前切片不触碰该约束。

### 可视化辅助：Excalidraw

`excalidraw-diagram-generator` 是可视化说明与审查辅助 skill，不是主流程阶段。它用于把已经形成的 Discovery、PRD、OpenAPI Draft、架构设计、Comet design、垂直切片或复盘结论画成可评审的图。

适用场景：

- 机会探索 / Discovery：机会地图、用户旅程、竞品流程泳道图。
- 业务架构：用户旅程图、价值流、角色职责泳道图、业务能力地图、生态关系图。
- 功能架构 / PRD：功能模块图、模块依赖图、业务流程图、页面地图。
- OpenAPI Draft / 工程基线 / 系统架构：系统架构图、数据流图、序列图、部署图、DDD 边界图。
- 数据架构：ER 图、元模型 Class 图、血缘图、数据流图、查询路径图。
- OpenSpec / Comet design：状态流、调用链、领域边界、切片依赖图。
- 设计审查 / 垂直切片前：用图暴露边界不清、契约缺口和切片依赖。
- 复盘沉淀：最终流程图、架构演进图和知识沉淀图。

产物建议：

```text
docs/discovery/diagrams/
docs/design/diagrams/
docs/architecture/diagrams/
```

红线：

- 不得让图凭空发明需求；图必须回指 Discovery、PRD、OpenAPI Draft、Architecture、Comet design 或 Issue。
- 图中暴露的问题必须回写到对应文本资产，不能只停留在 `.excalidraw` 文件里。
- 简单文案、小样式、单点 bug 不强制画图。

### 反复审查闭环

审查不是最后一步，而是阶段门禁。任何阻断项都必须回到产生该问题的阶段修正，修正后重新审查。

| 审查点 | 触发时机 | 主审 | 阻断项 |
|------|----------|------|--------|
| PRD Review | PRD 完成后 | Product / Domain Review Agent | 用户、痛点、非目标范围、验收标准或安全红线不清 |
| Grilling Review | 新功能 / 较大改动 PRD 前、Architecture Review 前、Comet build entry 前 | Product / Domain / Architecture Agent with `grill-with-docs` | 用户价值、边界、状态、反例、架构约束、验收标准或安全红线经不起质询 |
| Prototype Review | 有 UI 的 PRD 初稿完成后、PRD 校准前 | Product Design / UX / Frontend / API Agent | 页面清单、原型/线框、用户流、状态矩阵、PRD 回填项、权限状态或 OpenAPI 反推清单不清 |
| API Review | OpenAPI Draft 后 | API + Frontend + Backend Agent | schema、错误结构、分页、权限、契约测试不可落地 |
| Architecture Review | 系统/数据架构与 Comet / OpenSpec design 后 | Architecture Review Agent | 业务/功能/系统/数据架构、DDD 分层、模块依赖、ADR、状态流或回滚策略不清 |
| Plan Review | 垂直切片生成后 | Planning / Test Agent | 切片横向拆层、缺测试命令、缺回滚点或范围过大 |
| Code Review | 每个 slice 完成后 | 独立 Review Agent | 实现者自审、契约不一致、分层穿透、测试不足 |
| Security Review | 触碰安全红线时 | Security / Human Review | 权限、认证、SQL、加密、迁移或公共 API 风险未人工确认 |
| Release Review | 发布前 | Verify / Release Agent | fresh verification 不足、发布说明、实施步骤或回滚方案缺失 |

### Agent 铁律
1. **实现者 ≠ 审查者** — 同一段代码不能由同一个 Agent 审查
2. **无测试不写代码** — 先写失败测试，再写实现
3. **Fail-Closed 审查** — 无法确认安全性 → 自动拒绝
4. **安全红线不可逾越** — 触碰红线 → 标记 TODO-HUMAN-REVIEW

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
