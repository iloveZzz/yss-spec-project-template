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

Issues 和 PRD 默认发布到 GitHub Issues；外部 PR 暂不作为 triage 请求入口。详见 `docs/agents/issue-tracker.md`。

### Triage labels

使用标准五态标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

使用单上下文领域文档布局：根目录 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。

### Recommended flow

默认完整需求交付链路：`lifecycle stage check -> opportunity exploration / discovery -> business architecture -> grill-with-docs -> PRD baseline / functional architecture -> product-design-prototype / prototype-review when UI exists -> PRD calibration / requirement freeze -> OpenAPI Draft -> Engineering Baseline / DDD Review -> system architecture / data architecture / OpenSpec / Comet design -> Design Review -> OpenAPI Freeze -> OpenSpec / Comet change formalization -> to-issues -> implement with tdd -> independent review -> fresh verification/archive`。

### Mandatory skill rules

- 新产品、新模块或较大变更必须先判断生命周期阶段、缺失资产和下一步；可用 `yss-product-lifecycle`，已有等价记录时可复用。
- 新产品或新业务域必须在 PRD 基线前明确业务架构：目标用户、用户旅程、价值流、业务能力地图、角色/组织模型和外部系统边界；已有等价材料时可引用。
- 新功能或较大改动必须先用 `grill-with-docs` 澄清需求，再用 `to-prd` / `to-issues` 形成 PRD 和垂直切片 Issue。
- PRD 基线阶段必须同步明确功能架构：功能域、模块边界、优先级、MVP / 非目标范围和模块依赖；不清晰时不得进入 PRD 校准。
- 有用户界面的功能在 PRD 初稿后必须先用 `product-design-prototype` 产出页面、原型、交互状态、PRD 回填项和 OpenAPI 反推清单，并通过 `prototype-review` 后才能进入 PRD 校准 / 需求冻结和 UI 驱动的 OpenAPI Draft。
- 任何 API 契约变更必须先在 `docs/api/specs/*.yaml` 形成 Draft，经工程基线（如适用）、架构/OpenSpec/Comet design 和设计审查后 Freeze，再实现前后端和测试。
- OpenAPI Freeze 后、正式进入 `to-issues` 前，必须先创建或选择匹配的 active OpenSpec / Comet change；若 `openspec list --json` 无匹配 active change，或 `openspec/changes/<change>/` 缺 `proposal.md`、`design.md`、`tasks.md`、至少一个 `specs/**/spec.md` 或 `.comet.yaml`，则不得进入正式垂直切片，必须先路由到 `comet` 或 `openspec-new-change`。
- 涉及服务边界、部署、集成、性能、安全、可靠性或运维的变更，必须在设计审查前产出系统总体架构或等价设计记录。
- 涉及持久化、Repository、元数据、版本、血缘、搜索或查询策略的变更，必须在开发前产出数据架构；数据模型、元数据管理、ER 设计、版本管理或血缘分析类产品必须在 Design Review 和 OpenAPI Freeze 前完成数据架构。
- 当需求、架构、流程、状态机、数据流或垂直切片关系仅靠文字难以说明时，可用 `excalidraw-diagram-generator` 生成 `.excalidraw` 图作为辅助材料；图不能替代 PRD、OpenAPI、ADR、Comet design 或测试。
- 从零创建后端服务时，必须优先使用 `yss-ddd-scaffold-generator` 产出骨架；现有服务功能或重构先用 `yss-backend-scaffold-parent` 和对应层级 skill 检查 YSS DDD 工程基线。
- 任何 Bug、测试失败或性能回退必须先用 `diagnosing-bugs` 建立可复现反馈命令，再修复。
- 业务行为实现默认使用 `tdd`：先写一个会失败的行为测试并确认失败，再写最小实现；生成代码、配置或一次性原型如不适用 TDD，必须明确例外原因和验证方式。
- 架构治理、难测模块、深模块设计必须使用 `improve-codebase-architecture` / `codebase-design` 的 module、interface、seam、adapter 术语。
- `to-issues` 产出的任务必须是端到端垂直切片，不允许只按 Adapter / Application / Domain / Infrastructure 横向拆分。
- 触碰安全红线时，必须标记 `ready-for-human` 或 `TODO-HUMAN-REVIEW`，Agent 只能生成草案。
- 每个生命周期阶段完成后必须执行 Git checkpoint 判断：列出阶段产物、排除无关脏文件，并在用户已授权时按范围提交和推送；不得连续推进多个阶段却让 PRD、设计、OpenAPI、架构、评审或 Issue 产物长期只停留在本地工作区。
- 任何“完成 / 可合并 / 可发布”结论必须有 fresh verification 证据；不得只凭实现者自述通过。

---

## 工程基线与编码入口

`AGENTS.md` 只保存 Agent 必须先遵守的入口级规则，不承载完整编码手册。后端脚手架、DDD 分层、命名、Repository、MapStruct、统一响应等细则以 YSS skills 为准。

### 规范来源

| 场景 | 规范来源 | 产出阶段 | 主责 |
|------|----------|----------|------|
| 从零创建后端服务 | `yss-ddd-scaffold-generator` | 项目初始化 / 工程基线 | Scaffold / Architecture Agent |
| 检查后端工程基线 | `yss-backend-scaffold-parent` | 方案设计、开发、审查 | Architecture / Code / Review Agent |
| 领域建模和状态规则 | `yss-domain` / `yss-backend-scaffold-domain` | 方案设计、开发 | Domain Agent |
| Repository / MyBatis | `yss-repository` / `yss-mybatis` | 开发实现 | Backend Agent |
| Controller / DTO / VO | `yss-web-controller` / `yss-dto` | API Freeze 后开发 | Backend Agent |

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

### 任务入口分流

| 任务类型 | 推荐路径 | 关键门禁 |
|------|------|------|
| 模糊想法 / 产品机会 | 机会探索环 → 需求澄清 | 进入 PRD 前必须收敛用户、痛点、MVP 和非目标范围 |
| 已有竞品 / 用户 / 行业材料 | Discovery → 机会构想 → `grill-with-docs` → PRD | 事实输入必须转化为 MVP 边界和验收标准 |
| 新模块 / API / 跨端改动 | 阶段判断 → 业务架构（新业务域）→ `grill-with-docs` → PRD 初稿 / 功能架构 → 页面/原型/交互设计与 `prototype-review`（有 UI 时）→ PRD 校准 / 需求冻结 → OpenAPI Draft → 工程基线 → 系统/数据架构 / OpenSpec / Comet design → 设计审查 → OpenAPI Freeze → OpenSpec / Comet change formalization → 垂直切片 → TDD | 契约变更先冻结 `docs/api/specs/*.yaml`；Freeze 后必须有匹配 active change 和 proposal/spec/design/tasks/.comet.yaml 才能正式 to-issues；数据/元数据类产品必须先完成数据架构；有 UI 时不得从 PRD 初稿直接跳 OpenAPI |
| 明确 Bug / 测试失败 / 性能回退 | diagnosing-bugs → tdd → verify | 先建立可复现反馈命令，再修复 |
| 小文案 / 局部样式 / 配置调整 | comet-tweak 或直接最小改动 → verify | 扩散到 API、状态、权限或多模块时升级完整流程 |
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

### 阶段、Agent 与职责

| 阶段 | Agent | 职责 |
|------|-------|------|
| 0. 入口分诊 | Intake / Lifecycle Agent | 判断任务类型、风险等级和最小技能集；选择 OpenSpec / Comet / Superpowers / YSS 路径 |
| 1. 机会探索 | Discovery + Ideation Agent | 市场、竞品、用户事实与机会构想假设循环验证；形成机会清单、MVP 边界和非目标范围 |
| 2. 业务架构 | Business Architecture Agent | 梳理用户旅程、价值流、业务能力地图、角色/组织模型、外部系统边界和产品生态位置 |
| 3. 需求澄清 | Product / Grill Agent | 使用 `grill-with-docs`、`domain-modeling` 澄清用户、场景、术语、验收标准；必要时更新 `CONTEXT.md` |
| 4. 需求基线 / 功能架构 | PRD / Functional Architecture Agent | 使用 `to-prd` 生成 PRD 初稿；明确功能域、模块边界、优先级、OpenAPI 影响、测试 seam、安全红线和 UI 影响 |
| 5. 页面/原型/交互设计 | Product Design / UX Agent | 使用 `product-design-prototype`、`wireframe-prototype`、`component-story-prototype`、`mock-api-prototype` 产出页面清单、用户流、原型、状态矩阵、PRD 回填项和 OpenAPI 反推清单 |
| 6. 原型评审 | Prototype Review Agent | 使用 `prototype-review` 审查页面/流程/状态/PRD 回填/API 反推是否足以进入 PRD 校准；阻断项回到产品设计阶段 |
| 7. PRD 校准 / 需求冻结 | PRD / Product Agent | 把交互设计暴露出来的需求缺口、异常路径、验收标准和非目标范围补回 PRD，冻结可进入 OpenAPI Draft 的范围 |
| 8. 契约草案 | API Contract Agent | 基于校准后的 PRD 和已评审交互设计产出 OpenAPI Draft；定义路径、请求/响应 schema、错误结构、分页、权限和契约测试草案 |
| 9. 工程基线 | Scaffold / Architecture Agent | 新服务先用 `yss-ddd-scaffold-generator` 生成骨架；用 `yss-backend-scaffold-parent` 确认技术栈、模块依赖、DDD 分层和编码基线 |
| 10. 系统总体架构 / 方案设计 | Architecture / OpenSpec Agent | 校验 API Draft 与交互设计、领域模型、状态流、模块边界、服务边界、部署、集成、NFR、行为规格和风险取舍是否一致；可通过 Comet design 阶段承载，必要时写 ADR |
| 11. 数据架构 / 元模型设计 | Data Architecture / Domain Agent | 在持久化开发前明确概念/逻辑/物理模型、元模型、版本策略、血缘、搜索/查询、索引和存储策略；数据模型类产品必须完成 |
| 12. 设计审查 | Design Review Agent | 独立审查 PRD、产品设计、OpenAPI Draft、业务/功能/系统/数据架构、DDD 分层、ADR、测试 seam 和安全红线；阻断项必须回到对应阶段修正 |
| 13. 契约冻结 | API + Frontend + Backend Agent | 冻结 `docs/api/specs/*.yaml`；确认前端可消费、后端可实现、契约测试可落地，再进入 OpenSpec / Comet change formalization |
| 14. OpenSpec / Comet change formalization | OpenSpec / Comet Agent | 创建或选择匹配 active change；确认 `proposal.md`、`design.md`、`tasks.md`、至少一个 `specs/**/spec.md` 和 `.comet.yaml` 存在并与 PRD / OpenAPI Freeze 对齐 |
| 15. 实施计划 | Planning Agent | 使用 `to-issues` / `writing-plans` 把冻结契约和设计拆成垂直切片；每步包含文件、测试、验证命令和回滚点 |
| 16. 开发实现 | Code Agent | 使用 `yss-router` 选择最小 YSS skills；按垂直切片 TDD 实现，前后端通过冻结 OpenAPI 对齐 |
| 17. 独立审查 | Review Agent | 实现者不得审查自己；重点审安全红线、契约一致性、YSS DDD 分层边界、测试缺口和回归风险 |
| 18. 清理简化 | Simplify Agent | 在功能已验证基础上处理复用、质量和效率问题；不做无关重构；如触碰行为或契约需回到审查 |
| 19. 验证发布 | Verify / Release Agent | fresh verification、契约测试、关键路径 E2E、发布说明、实施步骤和回滚方案 |
| 20. 复盘沉淀 | Retro / Knowledge Agent | 将术语、规则、踩坑、ADR、AGENTS.md 约定和用户手册更新回仓库 |

### 四类架构产物

架构不是单一阶段一次性产出，而是随生命周期逐步细化：

| 架构产物 | 产出阶段 | 主责 | 最低完成标准 |
|------|------|------|------|
| 业务架构 | 机会探索 / Discovery / 产品定义 | Discovery + Business Architecture Agent | 用户旅程、价值流、业务能力地图、角色/组织模型、外部系统边界和 MVP 非目标范围清楚 |
| 功能架构 | PRD baseline / 产品设计 / PRD 校准 | PRD + Functional Architecture Agent | 功能域、模块边界、优先级、依赖、MVP / 非目标范围和 PRD 缺口清楚 |
| 系统总体架构 | 工程基线 / OpenSpec / Comet design | Architecture Agent | 服务/模块边界、部署、集成、权限、性能、可靠性、可观测性、发布回滚策略清楚 |
| 数据架构 | 详细设计 / 持久化开发前 | Data Architecture + Domain Agent | 概念/逻辑/物理模型、元模型、版本、血缘、查询/搜索、索引、存储和迁移约束清楚 |

数据模型、元数据管理、ER 设计、模型版本或血缘分析类产品中，数据架构是核心产品设计，不是普通实现细节；未完成数据架构不得进入 Repository / MyBatis / 持久化代码开发。

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
