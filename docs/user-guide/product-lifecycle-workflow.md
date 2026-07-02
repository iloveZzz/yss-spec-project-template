# 产品全生命周期使用手册

本文面向一个人同时承担产品、全栈开发、设计和实施工作的场景。目标是说明：当你用这个模板新建一个工程时，如何把想法、需求、API、设计、开发、验证、发布、实施和复盘串成一条可持续的流程。

示例业务采用“数据中台模型管理”，但流程适用于多数 Java + Vue + Ant Design Vue 的业务系统。

## 1. 这套模板的定位

这个模板不是运行时框架，而是产品和研发过程的工作台。

它负责保存四类资产：

| 资产 | 位置 | 用途 |
|---|---|---|
| 领域语言 | `CONTEXT.md` | 统一产品、开发、设计、实施和 AI 的业务词汇 |
| 需求与验收 | `docs/requirements/` | 保存 PRD、用户故事、验收条件和边界规则 |
| API 契约 | `docs/api/specs/` | 用 OpenAPI 3.1 约束前后端协作 |
| 架构资产 | `docs/architecture/`、`docs/adr/` | 保存业务架构、功能架构、系统总体架构、数据架构和关键 ADR |
| 变更过程 | `openspec/changes/` | 用 OpenSpec / Comet 跟踪一次变更从想法到归档 |

推荐把真实工程代码放在同一个仓库下，例如：

```text
apps/
  backend/        # Java / Spring Boot
  frontend/       # Vue / Ant Design Vue
docs/
openspec/
AGENTS.md
CONTEXT.md
```

如果你暂时只想把本仓库作为流程模板，也可以让业务代码放在另一个仓库，本仓库只保存产品、规格和流程资产。

## 2. 工具分工

你已经集成了 OpenSpec、Comet、Superpowers 和 Codex skills。建议按下面的分工理解它们：

| 工具 | 负责什么 | 你应该什么时候用 |
|---|---|---|
| [OpenSpec](https://github.com/Fission-AI/openspec) | 记录一次 change 的 proposal、design、specs、tasks 和归档 | 新功能、较大改动、API 变更、跨模块变更 |
| [Comet](https://github.com/rpamis/comet) | 把 OpenSpec 和 Superpowers 串成阶段化流程 | 想让 AI 按 open -> design -> build -> verify -> archive 推进 |
| [Superpowers](https://github.com/obra/superpowers) | 提供 brainstorming、plan、TDD、review、debug 等方法论技能 | 需求澄清、技术设计、测试驱动开发、代码审查、调试 |
| Codex skills | 在当前仓库执行读写、开发、验证和文档维护 | 具体落地任务、按仓库规范改代码或改文档 |

一句话：

```text
OpenSpec 管 WHAT，Superpowers 管 HOW，Comet 管阶段流转，Codex 管本地执行。
```

## 3. 新建工程的初始化流程

### Step 1: 填写产品身份

先把模板从“通用模板”改成“你的产品工程”。

建议更新：

```text
README.md
AGENTS.md
CONTEXT.md
```

最少要写清楚：

- 产品名称，例如“数据中台模型管理”。
- 主要用户，例如数据建模人员、实施顾问、平台管理员。
- 核心业务对象，例如模型、字段、版本、发布、血缘、数据源。
- 技术边界，例如是否包含数据同步、指标管理、权限审批、数据质量。

### Step 2: 建立领域词汇

在 `CONTEXT.md` 中只放稳定业务语言，不放实现细节。

示例：

| 术语 | 含义 | 备注 |
|---|---|---|
| 模型 | 对业务数据结构的抽象定义 | 不等同于数据库表 |
| 字段 | 模型中的属性定义 | 包含类型、长度、是否必填、默认值 |
| 草稿版本 | 可编辑但未发布的模型版本 | 不能被生产服务引用 |
| 发布版本 | 已冻结的可引用版本 | 原则上不可变 |
| 模型校验 | 发布前对字段、命名、关系和约束的检查 | 失败时需要字段级错误 |

这一步会直接影响后续 AI 生成 PRD、API、代码和测试的质量。

### Step 3: 初始化轻量目录

如果要把代码放入本仓库，可以新增：

```text
apps/backend/
apps/frontend/
docs/releases/
docs/implementation/
```

其中：

- `docs/releases/` 保存发布说明。
- `docs/implementation/` 保存实施方案、客户上线记录和回滚方案。

新增目录后运行：

```bash
scripts/verify-template
```

注意：`scripts/verify-template` 会检查整个模板仓库的 Markdown 链接。如果项目额外集成了第三方或本地生成的 skills，而这些 skills 自带未解析链接，校验可能因为既有技能资料失败。遇到这种情况，先确认失败路径是否来自本次新增内容；必要时对本次改动做定向 `git diff --check` 和 Markdown 链接检查，再单独修复技能资料断链。

## 4. 生命周期主流程

推荐主线：

```text
机会探索环
-> 业务架构
-> grill-with-docs 澄清
-> PRD 初稿 / 需求基线
-> 产品总体设计 / 功能架构设计
-> 产品设计 / 原型 / 交互评审（有 UI 时）
-> PRD 校准 / 需求冻结
-> OpenAPI Draft
-> OpenAPI Draft Review
-> 工程基线 / DDD 分层确认
-> 系统概要设计 / 数据架构 / OpenSpec / Comet proposal & design
-> 设计审查
-> OpenAPI Freeze
-> OpenSpec / Comet change
-> 垂直切片 Issue
-> TDD 开发
-> 独立审查
-> 验证与发布
-> 实施反馈
-> 复盘沉淀
```

机会探索环不是死流程，而是把三类输入循环校准：

```text
市场 / 竞品 / 用户事实 <-> 机会构想假设 <-> MVP 边界
```

常见入口：

- 只有一个模糊想法：先机会构想，再用 Discovery 验证。
- 已有行业、竞品或用户材料：先 Discovery，再生成候选方案。
- 明确 Bug 或小调整：不走完整机会探索环，直接走 hotfix / tweak。
- 已有功能的小需求变更：先做影响面评估，选择最近可信阶段，只更新受影响资产和下游门禁。
- 新模块、API 或跨端改动：必须进入 `grill-with-docs`、PRD、产品总体设计/功能架构、OpenAPI Draft、工程基线、系统概要设计/OpenSpec/Comet design、设计审查、OpenAPI Freeze、垂直切片和 TDD。

进入 PRD 前必须通过 `grill-with-docs` 收敛为：用户是谁、痛点是什么、为什么现在做、第一版做什么、明确不做什么、成功标准是什么。

### 4.0 yss-product-lifecycle 使用入口

当你不知道当前应该补 Discovery、PRD、OpenAPI、工程基线、Comet change、垂直切片还是 YSS 实现技能时，先使用 `yss-product-lifecycle`。

它的职责是阶段判断和路由，不替代 `comet`、OpenSpec skills、`yss-router` 或具体 YSS 专项技能。

推荐使用场景：

- 新产品、新模块或跨端/API 改动：先判断生命周期阶段和缺失资产。
- 小需求变更或迭代：判断现有 PRD、产品总体设计、交互设计、OpenAPI、架构、垂直切片中哪一层最早受影响。
- 已有 PRD 或设计材料：检查是否可以进入产品总体设计、OpenAPI Draft、工程基线、OpenSpec / Comet 或垂直切片。
- 已有 active Comet / OpenSpec change：判断是继续 change，还是缺少上游产物。
- 实现前：确认 PRD、OpenAPI Freeze、工程基线、设计审查和垂直切片是否齐备。

不需要使用的场景：

- 明确单点 UI 问题、单个 Repository/Convertor 修复，且领域和契约稳定。
- 用户明确要求继续某个已有 Comet change，且上游资产已经齐备。
- 明确 hotfix / tweak，且没有触发跨模块、API、架构或数据库变化。

推荐提示词：

```text
使用 yss-product-lifecycle，检查当前需求处于哪个生命周期阶段，
列出已有资产、缺失资产、是否阻塞，以及下一步应该调用的最小 skill 集合。
```

### 4.1 机会探索与竞品分析阶段

保存位置：

```text
docs/discovery/
docs/discovery/reports/
```

使用模板：

```text
docs/discovery/templates/competitive-matrix-template.md
```

竞品分析是机会探索环的重要事实输入，不是为了照抄功能，而是帮助你判断：

- 行业里已经形成共识的基础能力是什么？
- 哪些流程是用户已经习惯的？
- 哪些能力只是竞品堆料，第一版不需要做？
- 哪些痛点竞品没有解决，适合作为差异化机会？
- 哪些术语、页面结构或实施方式可以借鉴，哪些必须避开？

“数据中台模型管理”建议至少分析：

- 数据建模 / 元数据管理产品。
- 数据治理或数据目录产品。
- 低代码模型配置平台。
- 公司内部已有相似系统。

示例提示词：

```text
请作为产品经理和实施顾问，基于“数据中台模型管理”场景，
按照 docs/discovery/templates/competitive-matrix-template.md 输出竞品功能矩阵。
重点分析模型定义、字段配置、版本管理、发布流程、权限、血缘和实施复杂度。
```

竞品分析结束后，输出物应该能直接输入机会探索环：

```text
竞品功能矩阵
-> 差异化机会清单
-> 功能空白区
-> MVP 边界建议
```

### 4.2 发现与机会构想收敛阶段

保存位置：

```text
docs/discovery/
```

你要回答：

- 用户是谁？
- 现在的痛点是什么？
- 这个功能解决哪个业务闭环？
- 哪些场景不做？
- 成功标准是什么？

示例提示词：

```text
请作为产品顾问，帮我梳理“数据中台模型管理”的用户角色、核心场景、痛点、非目标范围和第一版 MVP。
参考 docs/discovery/reports/ 下已有竞品分析材料。
输出到 docs/discovery/model-management-discovery.md。
```

### 4.3 PRD 阶段

保存位置：

```text
docs/requirements/
```

使用模板：

```text
docs/templates/prd-template.md
```

PRD 必须包含：

- 问题陈述。
- 用户故事。
- 功能需求。
- 非功能需求。
- 验收标准。
- OpenAPI 影响。
- 测试决策。
- AI / 人工审查点。
- 功能架构入口：功能域、模块边界、优先级、模块依赖和非目标范围。

示例提示词：

```text
基于 docs/discovery/model-management-discovery.md，
使用 docs/templates/prd-template.md 生成“模型管理 MVP”的 PRD。
重点补充验收标准、非目标范围、OpenAPI 影响和测试决策。
```

### 4.3.1 四类架构产物的阶段关系

四类架构不是一次性全部做完，而是按风险逐步细化：

| 架构产物 | 产出阶段 | 解决的问题 | 推荐产物 | 可选图 |
|---|---|---|---|---|
| 业务架构 | 机会探索 / Discovery / 产品定义 | 产品为谁创造价值，在用户工作流和外部生态中处于什么位置 | 用户旅程、价值流、业务能力地图、角色/组织模型、外部系统边界 | 用户旅程图、泳道图、能力地图 |
| 功能架构 | PRD baseline / 产品设计 / PRD 校准 | 哪些功能模块支撑业务能力，MVP 做什么和不做什么 | 功能模块图、功能列表与优先级、模块依赖、PRD 回填项 | 功能模块图、依赖图、页面地图 |
| 系统总体架构 | 工程基线 / OpenSpec / Comet design | 技术上如何构建、部署、集成和运行 | 服务/模块边界、C4/容器视图、部署方案、关键接口、NFR 决策 | 系统架构图、部署图、序列图、DFD |
| 数据架构 | 详细设计 / 持久化开发前 | 元数据、版本、血缘、查询和存储如何建模 | 概念/逻辑/物理模型、元模型、版本策略、血缘/查询/索引策略 | ER 图、Class 图、血缘图、数据流图 |

对于数据模型、元数据管理、ER 设计、模型版本或血缘分析类产品，数据架构是核心产品能力，不是普通数据库实现细节。它必须在 Repository / MyBatis / 持久化代码开发前完成；如果 OpenAPI schema 依赖元模型，也必须在 OpenAPI Freeze 前完成。

推荐保存：

```text
docs/architecture/<feature>-business-architecture.md
docs/architecture/<feature>-functional-architecture.md
docs/architecture/<feature>-system-architecture.md
docs/architecture/<feature>-data-architecture.md
docs/architecture/diagrams/
```

### 4.4 API 契约阶段

保存位置：

```text
docs/api/specs/
```

API 契约采用 Draft -> Freeze 两段式：

| 状态 | 产出人 | 用途 | 进入条件 |
|---|---|---|---|
| OpenAPI Draft | API Contract Agent 主责，Product / Frontend / Backend 协作 | 把 PRD 中的接口影响转成可讨论的路径、schema、错误、分页、权限和契约测试草案 | PRD 已说明 OpenAPI 影响 |
| OpenAPI Freeze | API Contract Agent 主责，Architecture / Frontend / Backend 共同确认 | 作为垂直切片、TDD、前后端实现和契约测试的冻结输入 | 已通过工程基线、系统/数据架构（如适用）、OpenSpec / Comet 和设计审查 |

如果功能会影响前后端接口，先生成 OpenAPI Draft，再通过工程基线、系统/数据架构（如适用）、OpenSpec / Comet design 和设计审查冻结契约；冻结后再写 Java / Vue 代码。

OpenAPI YAML 和 OpenSpec delta spec 职责不同：

- OpenAPI YAML 位于 `docs/api/specs/`，描述接口契约：路径、请求、响应、错误、分页、字段约束。
- OpenSpec delta spec 位于 `openspec/changes/.../specs/`，描述系统行为：状态变化、业务规则、验收场景。
- 二者可以互相引用；当行为规格影响接口时，必须回写并重新冻结 OpenAPI。

“数据中台模型管理”的第一批端点可以是：

```text
GET    /api/v1/models
POST   /api/v1/models
GET    /api/v1/models/{id}
PUT    /api/v1/models/{id}
POST   /api/v1/models/{id}/validate
POST   /api/v1/models/{id}/publish
GET    /api/v1/models/{id}/versions
```

示例提示词：

```text
根据 docs/requirements/model-management-prd.md，
生成 OpenAPI 3.1 Draft 到 docs/api/specs/model-management.yaml。
要求包含错误响应、分页、字段级校验错误和模型发布接口。
随后结合工程基线、系统/数据架构、OpenSpec / Comet design 和设计审查校验领域状态、权限、错误结构和契约测试，确认后标记为 Freeze。
```

### 4.5 工程基线与架构设计阶段

保存位置：

```text
docs/architecture/
docs/adr/
```

本阶段不是只画技术架构图，而是把工程风险和产品模型风险收束为可审查的产物：

| 产物 | 典型内容 | 进入下一步前的判断 |
|---|---|---|
| 系统总体架构 | 服务/模块边界、部署形态、集成关系、权限链路、性能/可靠性/可观测性、发布回滚 | 足以支撑 Design Review 和 OpenAPI Freeze |
| 数据架构 | 概念/逻辑/物理模型、元模型、版本策略、血缘关系、查询/搜索、索引、存储和迁移约束 | 足以支撑 API schema、Repository、MyBatis 和测试设计 |
| ADR | 难回滚、有真实取舍、影响长期演进的关键决策 | 决策背景、选项、取舍和后果清楚 |
| 架构图 | C4/系统架构、DDD 边界、ER、Class、DFD、血缘、序列图 | 帮助审查，且引用到对应文字资产 |

编码规范不是每个需求临时产出的文档，而是项目初始化阶段形成的工程基线；功能设计阶段只补充本次变更需要遵守的局部约束。

后端工程基线：

| 场景 | 产出 | 主责 | 使用规范 |
|---|---|---|---|
| 从零创建后端服务 | DDD 多模块骨架、父 POM、Bootstrap、基础配置 | Scaffold / Architecture Agent | `yss-ddd-scaffold-generator` |
| 检查后端基线 | 技术栈、模块依赖、命名、统一响应、MapStruct、Repository 规则 | Architecture / Review Agent | `yss-backend-scaffold-parent` |
| 本功能领域设计 | 聚合、实体、值对象、状态流、Gateway 接口 | Domain Agent | `yss-domain` / `yss-backend-scaffold-domain` |
| 本功能持久化设计 | PO、Repository、GatewayImpl、Mapper、Convertor | Backend Agent | `yss-repository` / `yss-mybatis` |
| 本功能 Web 适配 | Controller、CMD、Query、VO、Web Convertor | Backend Agent | `yss-web-controller` / `yss-dto` |

YSS DDD 默认分层：

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

稳定规则写入 `AGENTS.md` 或 YSS skill，功能级取舍写入 `docs/architecture/` 或 ADR。不要把一次功能的临时实现细节沉淀为全局编码规范。

适合沉淀：

- 模块边界。
- 状态机。
- 版本策略。
- 权限边界。
- 发布和回滚策略。
- 与数据源、数据服务、指标平台的集成边界。

需要长期保留的关键取舍写 ADR，例如：

```text
docs/adr/0001-model-versioning-strategy.md
docs/adr/0002-model-publishing-state-machine.md
```

### 4.5.1 设计审查闭环

设计审查不是“最后看一眼”，而是进入 OpenAPI Freeze 和垂直切片前的阻断门禁。

| 审查点 | 主审 | 检查重点 | 不通过时回到 |
|---|---|---|---|
| PRD Review | Product / Domain Review Agent | 用户、痛点、非目标范围、验收标准、OpenAPI 影响、安全红线 | 需求澄清 / PRD |
| API Review | API + Frontend + Backend Agent | 路径、schema、错误结构、分页、权限、契约测试 | OpenAPI Draft |
| Architecture Review | Architecture Review Agent | 业务/功能/系统/数据架构、DDD 分层、模块依赖、Gateway 边界、状态流、ADR、回滚策略 | 工程基线 / 架构设计 |
| Plan Review | Planning / Test Agent | 是否垂直切片、是否有测试命令、验证方式和回滚点 | 垂直切片 |

只要审查发现阻断项，必须回到对应阶段修正，然后重新审查。非阻断建议可以进入任务清单，但不能混入本次范围造成无关重构。

### 4.5.2 可视化辅助图

当流程、架构、状态机、数据流、权限路径或垂直切片关系仅靠文字难以说明时，可以使用 `excalidraw-diagram-generator` 生成 `.excalidraw` 图。

它的定位是说明与审查辅助，不替代 PRD、OpenAPI、ADR、OpenSpec / Comet 或测试。图必须来源于已有资产，并把发现的问题回写到对应文档。

常见用途：

- 业务架构：用户旅程、价值流、角色职责泳道图、业务能力地图。
- 功能架构 / PRD：功能模块图、模块依赖图、业务流程图、页面地图。
- OpenAPI Draft：接口调用序列、数据流、错误流。
- 工程基线 / 系统架构：系统架构、DDD 边界、模块依赖、部署图、DFD。
- 数据架构：ER 图、元模型 Class 图、血缘图、查询路径图。
- Comet design：状态流、调用链、切片依赖。
- 设计审查：暴露边界不清、契约缺口和切片依赖。

推荐保存位置：

```text
docs/discovery/diagrams/
docs/design/diagrams/
docs/architecture/diagrams/
```

示例提示词：

```text
使用 excalidraw-diagram-generator，基于当前 PRD、OpenAPI Draft 和 Comet design，
生成模型发布与版本冻结的序列图和 DDD 边界图。
保存到 docs/architecture/diagrams/。
```

### 4.6 OpenSpec / Comet 变更阶段

当需求进入正式交付，用 Comet 或 OpenSpec 创建 change。涉及 API 的 change 应先带着 OpenAPI Draft 进入 open / design 阶段，用行为规格、领域状态、权限、错误场景和 YSS DDD 工程基线校验契约；进入 build 前必须完成设计审查和 OpenAPI Freeze。

Comet 中的 brainstorming 只负责正式变更的方案设计：技术选项、架构权衡、风险、测试 seam、契约影响和实施策略。它不重复 lifecycle 机会探索；如果 Discovery / PRD 已经说明用户、痛点、MVP、非目标和成功标准，Comet 直接引用这些产品事实。

普通功能推荐：

```text
/comet 新增数据中台模型管理 MVP
```

Comet 会按阶段推进：

```text
open -> design -> build -> verify -> archive
```

阶段产物大致对应：

| 阶段 | 主要产物 | 人类确认点 |
|---|---|---|
| open | proposal、design、tasks 初稿，必要时引用 OpenAPI Draft | 范围是否正确 |
| design | 深度设计、delta spec、工程基线检查、系统/数据架构校验、OpenAPI Draft 校验结论 | 方案是否可接受，OpenAPI 是否可 Freeze |
| build | 实施计划、代码、测试，基于冻结 OpenAPI | 是否采用 TDD、是否分支隔离 |
| verify | 测试结果、验证报告 | 是否通过或回到 build |
| archive | 主规格同步、change 归档 | 是否确认归档 |

如果直接使用原生 OpenSpec skills，常见顺序是先 `openspec-sync-specs` 再 `openspec-archive-change`。如果使用 Comet，archive 阶段会处理“同步主规格 + 归档 change”的确认流程，不需要手动重复执行同一件事。

小文案、配置值或局部文档调整可走 tweak。明确 bug 且范围小的修复可走 hotfix。只要触发跨模块、API、架构或数据库变化，就升级到最早受影响阶段并补齐下游门禁。

### 4.7 垂直切片阶段

保存位置可以是 GitHub Issues，也可以先放在：

```text
docs/requirements/issues/
```

使用模板：

```text
docs/templates/vertical-slice-issue-template.md
```

不要这样拆：

```text
Issue 1: 写所有 Adapter
Issue 2: 写所有 Application / Domain
Issue 3: 写所有 Infrastructure
Issue 4: 写所有前端页面
```

应该这样拆：

```text
Slice 1: 模型列表与查询
Slice 2: 创建模型草稿
Slice 3: 编辑模型字段
Slice 4: 模型校验
Slice 5: 模型发布
Slice 6: 查看模型版本
```

每个 slice 都要贯穿 API、后端、前端、测试和验收。

### 4.8 开发阶段

YSS 项目开发前先用 `yss-router` 判断最小技能集，避免一次性加载所有 YSS 规范。

前端页面必须按 `yss-ui` 约束落地：

```text
OpenAPI / Orval API client
-> views/PageName/index.vue
-> components/
-> hooks/useXxx.ts
-> schemas/*.ts
-> YTable / YTree / YssFormily
-> useTableHeight / useTreeHeight
```

后端新服务或新模块建议按 YSS DDD 顺序推进：

```text
yss-ddd-scaffold-generator
-> yss-domain / yss-backend-scaffold-domain
-> 数据架构确认（涉及持久化 / 元数据 / 版本 / 血缘时）
-> yss-repository
-> yss-mybatis
-> yss-web-controller
```

分层边界：

```text
Web Adapter -> Application Use Case -> Domain Service / Gateway -> Infrastructure Repository
```

开发顺序建议：

```text
1. 根据冻结 OpenAPI 写 API / 契约测试
2. 写 Domain / Application 行为测试
3. 实现 Java 后端
4. 生成或维护前端接口类型
5. 实现 Vue + AntDV 页面
6. 写组件测试或关键 E2E
7. 联调并更新任务状态
```

### 4.8.1 实现审查与清理审查

每个垂直切片完成后都要做独立代码审查，审查者不能是实现者。

| 审查 | 触发时机 | 检查重点 | 处理方式 |
|---|---|---|---|
| Code Review | slice 完成后 | OpenAPI 与实现一致、YSS DDD 分层、测试覆盖、安全红线 | 阻断项回到开发；建议项进入 backlog |
| Security Review | 触碰安全红线时 | 权限、认证、SQL、迁移、加密、公共 API | 必须人工确认或标记 `TODO-HUMAN-REVIEW` |
| Simplify Review | 功能验证通过后 | 复用、重复代码、可读性、性能风险 | 只做与本次目标相关的简化 |
| Release Review | 发布前 | fresh verification、发布说明、实施步骤、回滚方案 | 不足则回到 verify / release 准备 |

清理简化只能发生在功能行为已有测试保护之后。如果清理触碰契约、状态流、权限或数据库结构，必须回到设计审查。

### 4.9 验证、发布和实施阶段

建议新增并维护：

```text
docs/releases/
docs/implementation/
docs/user-guide/
```

每次发布至少留下：

- 发布说明。
- 升级步骤。
- 配置项说明。
- 回滚方案。
- 已知风险。
- 验收清单。
- 客户或现场实施反馈。

示例：

```text
docs/releases/v0.1.0-model-management.md
docs/implementation/customer-a-model-management-rollout.md
docs/user-guide/model-management.md
```

### 4.10 复盘沉淀阶段

保存位置：

```text
docs/process/sprint-retros/
CONTEXT.md
AGENTS.md
docs/adr/
```

每轮复盘问五个问题：

- 哪些需求理解反复变化？
- 哪些术语不统一？
- 哪些 API 设计让前端或实施痛苦？
- 哪些测试没有覆盖真实风险？
- 哪些经验应该写入 AGENTS.md，让 AI 下次自动遵守？

## 5. 数据中台模型管理的第一轮示例

### 5.1 MVP 范围

第一版只做“模型定义和发布闭环”：

- 模型列表。
- 创建模型草稿。
- 编辑模型字段。
- 校验模型。
- 发布模型。
- 查看模型版本。

暂不做：

- 数据同步。
- 指标口径管理。
- 复杂血缘分析。
- 跨租户权限审批。
- 自动生成物理表。

### 5.2 第一批文档

建议先生成：

```text
CONTEXT.md
docs/discovery/reports/model-management-competitive-matrix.md
docs/discovery/model-management-discovery.md
docs/requirements/model-management-prd.md
docs/architecture/model-management-business-architecture.md
docs/architecture/model-management-functional-architecture.md
docs/design/model-management-interaction-spec.md
docs/api/specs/model-management.yaml
docs/architecture/model-management-system-architecture.md
docs/architecture/model-management-data-architecture.md
docs/adr/0001-model-versioning-strategy.md
```

### 5.3 第一批垂直切片

```text
Slice 1: 模型列表与查询
Slice 2: 创建模型草稿
Slice 3: 编辑模型字段
Slice 4: 发布前校验
Slice 5: 模型发布与版本冻结
```

每个 slice 都要能演示。例如 Slice 2 完成后，应该可以在页面上创建模型草稿，并能通过 API 查询到它。

## 6. 每天如何使用

### 竞品分析

```text
请基于“模型版本管理”能力，按 docs/discovery/templates/competitive-matrix-template.md
补充竞品功能矩阵、功能空白区和 MVP 边界建议。
```

### 新想法

```text
帮我 explore 一下“模型发布后是否允许修改字段”的业务和技术影响。
请输出取舍、风险和建议决策。
```

### 正式需求

```text
使用 PRD 模板，为“模型发布与版本冻结”生成需求文档。
要求包含验收标准、异常场景、OpenAPI 影响和测试决策。
```

### 正式变更

```text
/comet 实现模型发布与版本冻结
进入 build 前请确认系统/数据架构、OpenAPI Freeze 和设计审查结论，再用 yss-router 判断最小 YSS 技能集。
```

### 继续未完成工作

```text
/comet
```

### 小改动

```text
/comet-tweak 调整模型列表的空状态文案
```

### 小范围 bug

```text
/comet-hotfix 修复模型发布失败后状态仍显示为已发布的问题
```

### 发布前

```text
请基于当前 change 的 tasks、测试结果和 OpenAPI 影响，生成发布说明和实施验收清单。
```

## 7. 最小可执行版本

如果你不想一开始就把流程做重，保留这八步即可：

```text
1. 机会探索明确用户、痛点、MVP、非目标和成功标准
2. CONTEXT.md 写清楚术语，业务架构写清楚用户旅程和产品边界
3. PRD 写清楚需求、验收和 API 影响，产品总体设计 / 功能架构写清楚流程、模块、页面/API/数据影响
4. 有 UI 时完成产品设计、原型评审和 PRD 校准
5. OpenAPI Draft 写清楚接口草案，并通过 Draft Review
6. 工程基线、系统概要/数据架构、OpenSpec / Comet design 校验并通过设计审查
7. 冻结 OpenAPI，创建 OpenSpec / Comet change，垂直切片拆清楚任务
8. TDD、独立审查、fresh verification，发布后复盘并更新 CONTEXT.md / AGENTS.md
```

这八步已经能让产品、研发、设计、实施和 AI 协作形成闭环。
