# 产品全生命周期使用手册

本文面向一个人同时承担产品、全栈开发、设计和实施工作的场景。目标是说明：当你用这个模板新建一个工程时，如何把想法、需求、API、设计、开发、验证、发布、实施和复盘串成一条可持续的轻量流程。

本模板现在默认使用 Matt Pocock Engineering Skills + YSS + OpenAPI：

- Matt skills 负责澄清、PRD、Issue 拆分、实现、TDD、诊断、审查和架构治理。
- YSS skills 负责 DDD、UI、OpenAPI、Repository、Controller、DTO、组件和编码规范。
- OpenAPI 3.1 负责前后端契约，Draft 仅用于评审，Freeze 后才作为实现输入。
- OpenSpec-style Spec Delta 只在中高风险行为变化时记录行为差异、验收场景和测试映射，不恢复 OpenSpec 工具链。

## 1. 这套模板的定位

这个模板不是运行时框架，而是产品和研发过程的工作台。

它负责保存四类资产：

| 资产 | 位置 | 用途 |
|---|---|---|
| 领域语言 | `CONTEXT.md` | 统一产品、开发、设计、实施和 AI 的业务词汇 |
| 需求与验收 | `docs/requirements/` | 保存 PRD、用户故事、验收条件和边界规则 |
| API 契约 | `docs/api/specs/` | 用 OpenAPI 3.1 约束前后端协作 |
| 行为差异 | `docs/specs/` | 用轻量 Spec Delta 记录中高风险变化的 ADDED / MODIFIED / REMOVED 行为和测试映射 |
| 架构资产 | `docs/architecture/`、`docs/adr/` | 保存业务架构、功能架构、系统总体架构、数据架构和关键 ADR |
| 交付过程 | Issue tracker、`docs/requirements/issues/`、`docs/testing/` | 跟踪垂直切片、实现路由、验证记录和审查结论 |

推荐把真实工程代码放在独立实现仓库。本仓库默认作为 Harness / 研发管理仓库，保存产品、契约和过程资产。如果用户明确选择把代码放入本仓库，才按需新增：

```text
apps/backend/
apps/frontend/
docs/releases/
docs/implementation/
```

不得由 Agent 自行新建任意顶层业务代码目录。实现仓库接入和跨仓库切片绑定见 `docs/process/implementation-repo-integration.md`。

## 2. 工具分工

| 工具 | 负责什么 | 你应该什么时候用 |
|---|---|---|
| `yss-product-lifecycle` | 判断生命周期阶段、缺失资产、最近可信阶段和最小 skill 集合 | 不确定当前应补 PRD、设计、OpenAPI、架构、Issue 还是实现时 |
| `competitive-intelligence` | 竞品、替代方案、定价、定位、用户口碑和市场事实研究 | 进入 Discovery / PRD 前需要外部事实支撑时 |
| Matt Engineering Skills | 澄清、PRD、Issue、实现、TDD、诊断、审查、架构治理 | 大部分通用工程流程 |
| YSS skills | DDD、UI、OpenAPI、Repository、Controller、DTO、组件规范 | 进入具体前后端实现或专项审查时 |
| OpenAPI 3.1 | 前后端 API 契约 | 任何接口路径、schema、错误、分页、权限或并发语义变化时 |
| OpenSpec-style Spec Delta | 行为差异、验收场景和测试映射 | API、权限、状态机、数据模型、跨端、新模块或高风险行为变化时 |
| Issue tracker | 状态同步和切片追踪 | 每个阶段结束、垂直切片创建、验证或阻塞更新时 |

一句话：

```text
PRD 管用户价值，OpenAPI 管接口契约，Spec Delta 管行为差异，Issue 管交付切片，YSS 管工程规范，Matt skills 管工作方法。
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

这一步会直接影响后续 AI 生成 PRD、API、代码和测试的质量。可用 `domain-modeling` 持续维护领域语言和 ADR。

### Step 3: 确认实现仓库和产物目录

当前仓库默认作为研发管理仓库，前后端源码默认保留在独立实现仓库。每个需求进入实现前，必须记录后端 / 前端实现仓库、分支、MR / PR、CI、测试命令和验证证据。

发布和实施产物保存在：

```text
docs/releases/
docs/implementation/
```

## 4. 生命周期主流程

日常推荐使用 8 个主阶段推进，21 个门禁 / 职责点只用于检查和补齐缺失资产，不要求每个需求逐项跑完。阶段、产物、模板和必需 / 条件必需规则的权威索引见：

```text
docs/process/lifecycle-artifact-map.md
```

推荐主线：

```text
1. 入口分诊
2. 机会与 Discovery
3. 业务 / PRD / 功能架构
4. 产品设计与需求冻结
5. 系统 / 数据架构与工程契约设计审查
6. 契约冻结与 Issue formalization
7. 垂直切片与 TDD 实现
8. 验证发布与复盘
```

常见入口：

- 只有一个模糊想法：先机会探索，再用 `grill-with-docs` 收敛用户、痛点、MVP、非目标和成功标准。
- 已有行业、竞品或用户材料：先用 `competitive-intelligence` 做 Discovery 事实整理，再生成 PRD。
- 明确 Bug 或小调整：不走完整机会探索环，直接用 `diagnosing-bugs` 或最小改动加验证。
- 已有功能的小需求变更：先做影响面评估，选择最近可信阶段，只更新受影响资产和下游门禁。
- 新模块、API 或跨端改动：必须按 8 个主阶段推进；有 UI 时必须经过产品设计、原型评审和需求冻结；有 API 时必须完成 API 影响分析 / 契约草案、必要的 Spec Delta、工程基线、系统 / 数据架构、Design Review、OpenAPI Freeze，再进入 `to-issues`、垂直切片和 TDD。

## 5. `yss-product-lifecycle` 使用入口

当你不知道当前应该补 Discovery、PRD、OpenAPI、工程基线、垂直切片还是 YSS 实现技能时，先使用 `yss-product-lifecycle`。

它的职责是阶段判断和路由，不替代 Matt skills、`yss-router` 或具体 YSS 专项技能。

推荐使用场景：

- 新产品、新模块或跨端/API 改动：先判断生命周期阶段和缺失资产。
- 小需求变更或迭代：判断现有 PRD、产品总体设计、交互设计、OpenAPI、架构、垂直切片中哪一层最早受影响。
- 已有 PRD 或设计材料：检查是否可以进入产品总体设计、API 影响分析 / 契约草案、工程基线、Issue 或垂直切片。
- 实现前：确认 PRD、OpenAPI Freeze、工程基线、设计审查和垂直切片是否齐备。

推荐提示词：

```text
使用 yss-product-lifecycle，检查当前需求处于哪个生命周期阶段，
列出已有资产、缺失资产、是否阻塞，以及下一步应该调用的最小 skill 集合。
```

## 6. 从需求到实现的标准链路

### 6.1 澄清需求

使用 `grill-with-docs`，把想法问到可以进入 PRD：

```text
使用 grill-with-docs，围绕“<功能名>”澄清用户、痛点、MVP、非目标、成功标准、边界条件和安全人审点。
请同步检查 CONTEXT.md 中是否需要补充领域术语，必要时提出 ADR 候选。
```

### 6.2 生成 PRD

已有足够上下文后使用 `to-prd`：

```text
使用 to-prd，把当前讨论整理为 PRD。
正文使用中文，包含用户故事、验收标准、非目标范围、OpenAPI 影响、测试决策、AI/人工审查点和安全红线。
```

### 6.3 设计产品和契约

有 UI 时先走设计系统、`product-design:index` 路由的产品设计、低保真原型评审、Ant Design v6 高保真 HTML 原型、AntD CLI 校验证据和用户确认记录。涉及 API 时，先生成 review-only OpenAPI Draft：

```text
基于 PRD 和产品设计，生成 OpenAPI 3.1 Draft。
Draft 仅用于评审，不得作为实现或生成客户端的稳定契约。
请检查 YSS response wrappers、错误结构、分页、权限、并发和契约测试 seam。
如涉及 API、权限、状态机、数据模型、跨端、新模块或高风险行为变化，请同步生成 OpenSpec-style Spec Delta，记录 ADDED / MODIFIED / REMOVED、验收场景和测试映射。
```

Draft 经工程基线、系统 / 数据架构和 Design Review 通过后，记录 OpenAPI Freeze。

### 6.4 拆分垂直切片

OpenAPI Freeze 或无 API 影响记录完成后使用 `to-issues`：

```text
使用 to-issues，基于 PRD、OpenAPI Freeze 和架构设计，把功能拆成可独立验证的垂直切片 Issue。
每个 Issue 必须包含用户价值、验收标准、测试命令、依赖、回滚点、YSS skill routing 和 TODO-HUMAN-REVIEW。
```

### 6.5 实现与审查

实现前先用 `yss-router` 选最小 YSS skill 集合。业务行为默认用 `tdd`，Bug 默认从 `diagnosing-bugs` 开始，完成后用 `code-review` 或独立 review 检查。

```text
使用 yss-router 为 <slice> 选择最小 YSS skill 集合。
然后使用 implement / tdd 完成该垂直切片。
请记录 RED / GREEN 证据、验证命令、架构清单回勾和人审点。
```

## 7. OpenAPI 契约规则

- Draft 阶段允许调整接口，但不能被当成稳定实现契约。
- Freeze 后的契约变更必须回到 API 影响分析、架构 / 数据设计和 Design Review，不能边写代码边悄悄改接口。
- OpenAPI 不得只基于 PRD 反推：必须结合产品总体设计 / 功能架构；有 UI 时还必须结合页面 / 原型 / 交互说明、状态矩阵、低保真原型评审、Ant Design v6 高保真 HTML 原型、AntD CLI 校验证据和用户确认记录。
- OpenAPI Freeze 后进入 `to-issues`，再进入前后端实现和契约测试。

## 8. 验证、发布和复盘

任何“完成 / 可合并 / 可发布”结论必须有 fresh verification 证据。最少记录：

- 运行的命令。
- 运行时间或当前提交。
- 结果摘要。
- 失败项或未覆盖风险。
- 是否触碰安全红线。

发布前补齐发布说明、实施步骤和回滚方案。发生架构返工、重要 review finding、verify 返工或 `TODO-HUMAN-REVIEW` 延期时，必须写复盘，并把流程修订回写到 `AGENTS.md`、生命周期文档、ADR 或模板中。
