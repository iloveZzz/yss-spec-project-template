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
竞品分析
-> 发现
-> PRD
-> OpenAPI 契约
-> 架构设计
-> OpenSpec / Comet change
-> 垂直切片 Issue
-> TDD 开发
-> 验证与发布
-> 实施反馈
-> 复盘沉淀
```

### 4.1 竞品分析阶段

保存位置：

```text
docs/discovery/
docs/discovery/reports/
```

使用模板：

```text
docs/discovery/templates/competitive-matrix-template.md
```

竞品分析不是为了照抄功能，而是帮助你判断：

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

竞品分析结束后，输出物应该能直接输入发现阶段：

```text
竞品功能矩阵
-> 差异化机会清单
-> 功能空白区
-> MVP 边界建议
```

### 4.2 发现阶段

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

示例提示词：

```text
基于 docs/discovery/model-management-discovery.md，
使用 docs/templates/prd-template.md 生成“模型管理 MVP”的 PRD。
重点补充验收标准、非目标范围、OpenAPI 影响和测试决策。
```

### 4.4 API 契约阶段

保存位置：

```text
docs/api/specs/
```

如果功能会影响前后端接口，先更新 OpenAPI 3.1，再写 Java / Vue 代码。

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
生成 OpenAPI 3.1 契约到 docs/api/specs/model-management.yaml。
要求包含错误响应、分页、字段级校验错误和模型发布接口。
```

### 4.5 架构设计阶段

保存位置：

```text
docs/architecture/
docs/adr/
```

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

### 4.6 OpenSpec / Comet 变更阶段

当需求进入正式交付，用 Comet 或 OpenSpec 创建 change。

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
| open | proposal、design、tasks 初稿 | 范围是否正确 |
| design | 深度设计、delta spec | 方案是否可接受 |
| build | 实施计划、代码、测试 | 是否采用 TDD、是否分支隔离 |
| verify | 测试结果、验证报告 | 是否通过或回到 build |
| archive | 主规格同步、change 归档 | 是否确认归档 |

如果直接使用原生 OpenSpec skills，常见顺序是先 `openspec-sync-specs` 再 `openspec-archive-change`。如果使用 Comet，archive 阶段会处理“同步主规格 + 归档 change”的确认流程，不需要手动重复执行同一件事。

小文案、配置值或局部文档调整可走 tweak。明确 bug 且范围小的修复可走 hotfix。只要触发跨模块、API、架构或数据库变化，就升级为完整流程。

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
Issue 1: 写 Controller
Issue 2: 写 Service
Issue 3: 写前端页面
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
-> yss-repository
-> yss-mybatis
-> yss-web-controller
```

分层边界：

```text
Web Adapter -> Domain Service / Gateway -> Infrastructure Repository
```

开发顺序建议：

```text
1. 根据 OpenAPI 写 API / 契约测试
2. 写 Service 行为测试
3. 实现 Java 后端
4. 生成或维护前端接口类型
5. 实现 Vue + AntDV 页面
6. 写组件测试或关键 E2E
7. 联调并更新任务状态
```

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
docs/api/specs/model-management.yaml
docs/architecture/model-management-architecture.md
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
进入 build 前请用 yss-router 判断最小 YSS 技能集。
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

如果你不想一开始就把流程做重，保留这七步即可：

```text
1. 竞品矩阵明确基础能力和差异化机会
2. CONTEXT.md 写清楚术语
3. PRD 写清楚需求和验收
4. OpenAPI 写清楚接口
5. 垂直切片拆清楚任务
6. TDD 或至少关键路径测试
7. 发布后复盘并更新 CONTEXT.md / AGENTS.md
```

这七步已经能让产品、研发、设计、实施和 AI 协作形成闭环。
