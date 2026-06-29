# OpenSpec Skills 使用手册

本文面向还不了解 OpenSpec 的开发者、产品/架构协作者和 AI Agent 操作者。OpenSpec Skills 不是业务框架，也不是代码库依赖，而是一套围绕“需求变更”的 AI 协作流程。

它的目标是让一次改动从想法、设计、规格、任务、实现到归档都有清晰记录，避免 AI 直接根据一句话改代码后难以追溯、难以验证、难以交接。

## 1. OpenSpec 是什么

在本模板中，可以把 OpenSpec 理解为“变更管理骨架”。一次需求、功能或修复会被包装成一个 change：

```text
想法 / 问题
   ↓
Explore：先聊清楚
   ↓
Propose：生成变更包
   ├─ proposal.md  这次要改什么，为什么改
   ├─ design.md    技术方案、边界、风险
   ├─ specs/...    行为规格，系统应该满足什么
   └─ tasks.md     可执行任务清单
   ↓
Apply：按 tasks 实现代码
   ↓
Sync Specs：把 delta spec 合并回主规格
   ↓
Archive：归档这个 change
```

推荐记忆方式：

```text
Explore = 想清楚
Propose = 写清楚
Apply = 做出来
Sync = 沉淀规格
Archive = 收尾归档
```

## 2. 五个 OpenSpec Skill 的定位

### 2.1 openspec-explore

`openspec-explore` 用于探索、澄清和讨论。它是思考模式，不是实现模式。

适合场景：

- 只有一个模糊想法，还没有形成需求。
- 不确定技术路线，需要比较方案。
- 想让 AI 先阅读现有代码，分析影响范围。
- 复杂问题需要先拆解边界、风险和未知点。
- 实现过程中发现原方案不清晰，需要暂停并重新思考。

可以做的事：

- 追问需求背景和约束。
- 分析现有代码结构。
- 画流程图、状态图或数据流图。
- 比较多种方案的取舍。
- 识别风险、前置条件和人工确认点。

不应该做的事：

- 不直接实现业务代码。
- 不绕过需求澄清直接进入开发。

示例：

```text
使用 openspec-explore，帮我分析要做“用户审批流”会影响哪些模块。
```

```text
先 explore 一下：如果我要给这个项目加 OpenAPI 契约驱动开发，应该怎么落地？
```

### 2.2 openspec-propose

`openspec-propose` 用于把需求正式变成一个 OpenSpec change。

它通常会生成：

```text
openspec/changes/<change-name>/
  proposal.md
  design.md
  tasks.md
  specs/<capability>/spec.md
```

适合场景：

- 已经知道大概要做什么，希望进入开发前先形成方案。
- 新功能、较大改动或跨模块改动。
- API 契约变化。
- 需要多人或多个 Agent 协作。
- 希望以后能追溯这次变更的原因、范围和验收标准。

示例：

```text
使用 openspec-propose，为“新增客户风险评级管理”创建一个 change。
```

```text
propose 一个 change：给系统增加文件导入任务，支持上传 Excel、校验数据、生成导入结果。
```

主要产物：

| 文件 | 作用 |
|------|------|
| `proposal.md` | 说明这次变更要做什么、为什么做、范围是什么 |
| `design.md` | 说明技术方案、模块边界、风险和取舍 |
| `specs/.../spec.md` | 说明系统应满足的行为规格 |
| `tasks.md` | 将变更拆成可执行、可验证的任务 |

### 2.3 openspec-apply-change

`openspec-apply-change` 用于按某个 change 的任务清单开始实现。

它会：

- 找到指定 change。
- 读取 proposal、design、specs 和 tasks。
- 识别哪些任务已经完成、哪些还未完成。
- 按任务逐项实现。
- 每完成一项，把 `tasks.md` 中的 `- [ ]` 改成 `- [x]`。
- 在实现中保持代码、任务和规格对齐。

适合场景：

- 已经有 OpenSpec change，现在要开始写代码。
- 中途停过，现在继续实现。
- 希望 AI 严格按任务清单推进。
- 希望避免实现过程跑偏。

示例：

```text
使用 openspec-apply-change 实现 add-import-task。
```

```text
继续 apply 当前 change。
```

如果任务不清晰、实现中发现设计问题，或者触碰安全红线，应该暂停并更新相关 artifact，而不是硬写代码。

### 2.4 openspec-sync-specs

`openspec-sync-specs` 用于把 change 中的 delta spec 合并回主规格。

delta spec 表示“这次变更新增、修改、删除或重命名了哪些需求”。例如：

```markdown
## ADDED Requirements

### Requirement: Import Excel File
The system SHALL allow users to upload Excel files.

## MODIFIED Requirements

### Requirement: Import Validation
#### Scenario: Invalid row
- **WHEN** a row has invalid data
- **THEN** the system SHALL report the row number and error reason
```

同步后的长期规格通常位于：

```text
openspec/specs/<capability>/spec.md
```

适合场景：

- 实现已经完成或基本稳定。
- 这次变更的规格需要沉淀为长期主规格。
- 暂时不想归档 change，但希望主 specs 先更新。
- 多个 change 需要共享最新规格上下文。

示例：

```text
使用 openspec-sync-specs，把 add-import-task 的 delta specs 合并到主 specs。
```

这个步骤的核心价值是防止“代码改了，但主规格还是旧的”。后续人类或 Agent 再理解项目时，可以基于最新规格工作。

### 2.5 openspec-archive-change

`openspec-archive-change` 用于把完成的 change 归档。

它通常会检查：

- artifact 是否完成。
- tasks 是否完成。
- delta specs 是否需要同步。
- 是否存在未完成任务或未同步规格。

归档后，change 会从 active changes 移到 archive 目录，成为历史记录。

适合场景：

- 功能已经实现并验证。
- `tasks.md` 全部完成。
- specs 已同步，或确认无需同步。
- 希望清理 active changes。
- 希望保留一次变更的历史审计记录。

示例：

```text
使用 openspec-archive-change 归档 add-import-task。
```

## 3. 什么时候该用 OpenSpec

并不是所有改动都需要完整 OpenSpec 流程。可以按改动大小判断。

### 3.1 通常不需要

小改动可以直接处理：

- 修正文案。
- 修复明显 typo。
- 调整一个局部样式。
- 修改一个很小的配置项。
- 不影响契约、不影响架构、不需要长期规格沉淀的改动。

### 3.2 建议使用

中等改动建议至少使用 `propose -> apply`：

- 新增一个页面。
- 新增一个查询条件。
- 调整一个业务流程。
- 接入一个后端接口。
- 增加一个可独立验收的小功能。

### 3.3 强烈建议使用

大改动建议完整使用：

```text
explore -> propose -> apply -> sync-specs -> archive
```

典型场景：

- 新增业务模块。
- 调整领域模型。
- 修改 API 契约。
- 影响前后端联调。
- 涉及权限、数据、任务流、文件导入导出。
- 需要多人或多个 Agent 协作。
- 触碰安全红线，需要人工确认。

## 4. 与本模板协作规范的关系

本模板的推荐交付链路是：

```text
grill-with-docs
  -> to-prd
  -> OpenAPI Spec
  -> to-issues
  -> implement with tdd
  -> review / verify
```

OpenSpec 与这条链路并不冲突，而是承担“变更规格层”的职责：

| 本模板环节 | OpenSpec 对应能力 |
|------------|-------------------|
| 需求澄清 | `openspec-explore` |
| 形成变更方案 | `openspec-propose` |
| 生成可执行任务 | `tasks.md` |
| 按任务实现 | `openspec-apply-change` |
| 沉淀长期规格 | `openspec-sync-specs` |
| 完成后收尾 | `openspec-archive-change` |

对于 API 契约变更，仍然必须遵守本模板约定：

- 先更新 `docs/api/specs/*.yaml`。
- 再实现前后端。
- 再补充测试。

OpenSpec 的 `specs/.../spec.md` 更偏“行为规格”，OpenAPI YAML 更偏“接口契约”。两者可以互相引用，但职责不同。

## 5. 实际使用示例

假设要做“客户风险评级管理”。

第一步，探索问题：

```text
使用 openspec-explore，帮我分析客户风险评级管理需要哪些能力、数据模型和接口。
```

可能得到能力拆分：

```text
- 维护评级规则
- 执行评级计算
- 查看评级结果
- 人工调整评级
- 记录调整原因
```

第二步，创建变更：

```text
使用 openspec-propose，创建 change：add-customer-risk-rating。
```

第三步，实现：

```text
使用 openspec-apply-change 实现 add-customer-risk-rating。
```

任务可能类似：

```text
- [x] 定义风险评级领域模型
- [x] 新增查询接口
- [x] 新增保存接口
- [x] 增加前端列表页
- [x] 增加测试
```

第四步，沉淀规格：

```text
使用 openspec-sync-specs 同步 add-customer-risk-rating。
```

第五步，归档：

```text
使用 openspec-archive-change 归档 add-customer-risk-rating。
```

## 6. 使用收益

### 6.1 需求可追溯

每次变更都有 proposal、design、spec 和 tasks。后续可以知道某段代码为什么被加入，而不是只依赖聊天记录。

### 6.2 减少返工

先 Explore / Propose，可以提前发现边界、风险和遗漏场景，避免写完后才发现方向不对。

### 6.3 更适合多人和多 Agent 协作

前端 Agent、后端 Agent、Review Agent 和人工协作者都可以读取同一份变更上下文，减少口头转述造成的信息丢失。

### 6.4 规格不会丢

`openspec-sync-specs` 会把一次变更沉淀到主规格，后续继续开发时，AI 和人类都能基于最新项目认知工作。

### 6.5 实现更可控

`openspec-apply-change` 会按 `tasks.md` 推进，并同步更新完成状态。项目成员可以清楚知道做到哪里、还剩什么。

### 6.6 更符合安全和审查要求

当改动涉及安全红线、公共基础库 API、认证授权、数据库迁移或原生 SQL 时，OpenSpec artifact 可以明确标注人工确认点，避免 AI 越权实现。

## 7. 推荐口令

日常可以直接这样对 AI 说：

```text
使用 openspec-explore，先帮我把这个需求想清楚。
```

```text
使用 openspec-propose，为这个需求创建一个 change。
```

```text
使用 openspec-apply-change，实现这个 change。
```

```text
使用 openspec-sync-specs，把这个 change 的规格同步到主规格。
```

```text
使用 openspec-archive-change，归档这个已经完成的 change。
```

如果不确定该从哪里开始，优先从 `openspec-explore` 开始。探索清楚后，再进入 `openspec-propose`。
