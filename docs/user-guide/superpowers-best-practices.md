# Superpowers 最佳实践

本文补充 [Superpowers 使用手册](./superpowers-guide.md)，用于约束长期使用 Superpowers 时的工作习惯、门禁和常见反模式。

## 1. 核心原则

### 1.1 Skill 先于行动

当任务可能匹配某个 Superpowers skill 时，先使用 skill，再行动。

错误习惯：

```text
先看几眼代码，感觉清楚了再决定要不要用 skill。
```

推荐习惯：

```text
先判断该不该用 brainstorming / debugging / TDD / review，再按 skill 流程推进。
```

这条尤其适用于：

- 新功能。
- 行为变化。
- Bug 或测试失败。
- 准备说“完成了”。
- 准备提交、推送、合并。

### 1.2 设计要有批准点

`brainstorming` 的价值不是多写一份文档，而是在实现前把方向冻结到可讨论状态。

进入开发前至少确认：

- 用户和场景是否明确。
- MVP 和非目标范围是否明确。
- API 影响是否明确。
- 前后端和 YSS skills 边界是否明确。
- 安全红线是否已标记。

推荐落点：

```text
docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
```

如果功能已经有 PRD 或 OpenSpec design，可以不重复写长文档，但要明确引用来源。

### 1.3 计划要小到能执行

`writing-plans` 产出的计划不是路线图，而是执行说明。

一个好计划应该包含：

- 精确文件路径。
- 每一步要改什么。
- 每一步怎么验证。
- 预期失败和预期通过结果。
- 提交粒度。

不好的计划：

```text
实现接口、补测试、优化页面。
```

好的计划：

```text
Task 1: 新增模型发布失败测试
Task 2: 实现版本冻结领域规则
Task 3: 补 Repository 查询
Task 4: 接 Controller 和 OpenAPI
Task 5: 接前端发布按钮和状态反馈
```

### 1.4 TDD 不是“补测试”

`test-driven-development` 的核心是先证明测试会失败，再写实现。

最低要求：

- 新功能先写一个行为测试。
- Bug 先写一个能复现原始问题的回归测试。
- 测试失败原因必须是功能缺失或 Bug 存在，不是语法错误。
- 实现只写让当前测试通过的最小代码。

如果项目暂时没有测试框架，也要先建立可复现命令、脚本或人工验证清单，并把测试补齐作为技术债记录。

### 1.5 Debug 要先找根因

`systematic-debugging` 不允许先猜一个修复。

推荐顺序：

```text
读错误
-> 稳定复现
-> 看最近变更
-> 分层收集证据
-> 形成单一假设
-> 最小验证
-> 写回归测试
-> 修复
```

如果连续 3 次修复失败，要停下来讨论架构或假设，而不是继续叠补丁。

### 1.6 完成声明必须有证据

`verification-before-completion` 要求 fresh verification。

可以说：

```text
已运行 python3 .../quick_validate.py，输出 Skill is valid!
```

不要说：

```text
应该没问题。
看起来可以。
我觉得已经完成。
```

本模板推荐至少做：

- `git diff --check`
- 与改动相关的单元测试或构建命令
- 文档类改动的链接和路径检查
- Skill 类改动的 `quick_validate.py`

## 2. 场景化实践

### 2.1 新建业务工程

适用于“数据中台模型管理”这类从 0 到 1 的项目。

推荐链路：

```text
yss-product-lifecycle
-> 竞品分析
-> discovery
-> grill-with-docs
-> PRD / to-prd
-> OpenAPI 影响
-> brainstorming
-> OpenSpec / Comet
-> writing-plans
-> yss-router
-> TDD 实现
-> review / verify
```

关键门禁：

- 没有竞品分析，不直接写 PRD。
- OpenAPI 影响不清楚，不直接写前后端。
- 没有垂直切片，不拆 Controller / Service / Repository 横向任务。
- 没有 fresh verification，不说完成。

### 2.2 小改动

适用于文案、局部样式、小配置。

推荐链路：

```text
判断是否真的小
-> 必要时 comet-tweak
-> 最小测试或验证
-> verification-before-completion
```

如果改动扩散到 API、数据库、权限、流程状态或多个模块，升级为完整功能流程。

### 2.3 Bug 修复

推荐链路：

```text
systematic-debugging
-> test-driven-development
-> verification-before-completion
-> requesting-code-review
```

Bug 文档至少记录：

- 原始症状。
- 复现方式。
- 根因。
- 回归测试。
- 验证命令。

### 2.4 多 Agent 协作

适用于多个独立切片或多个无共享状态的问题。

推荐使用：

```text
dispatching-parallel-agents
或 subagent-driven-development
```

适合并行：

- 前端页面和后端领域模型已经通过 OpenAPI 对齐。
- 多个独立测试文件失败，根因互不相关。
- 多个垂直切片彼此独立。

不适合并行：

- 同一批文件会被多个 Agent 同时修改。
- 问题根因可能相同。
- 还没明确接口契约。
- 还在探索需求阶段。

### 2.5 分支和工作区

执行较大计划前，优先使用隔离工作区。

```text
using-git-worktrees
-> baseline verification
-> execute plan
-> finish branch
```

在本仓库中，如果当前工具已经提供隔离 worktree，就不要再手动创建嵌套 worktree。先检测当前 Git 状态，再决定是否创建。

## 3. 与本模板门禁对齐

| 门禁 | Superpowers 支撑 |
|---|---|
| 新功能先澄清 | `yss-product-lifecycle` / `grill-with-docs` / `brainstorming` |
| PRD 变成可执行任务 | `writing-plans` |
| 代码先测后写 | `test-driven-development` |
| Bug 先找根因 | `systematic-debugging` |
| 多任务可并行 | `dispatching-parallel-agents` / `subagent-driven-development` |
| 完成前必须验证 | `verification-before-completion` |
| 合并前独立审查 | `requesting-code-review` |
| Review 反馈不盲从 | `receiving-code-review` |
| 分支收尾 | `finishing-a-development-branch` |

与 `AGENTS.md` 的安全红线结合：

- 数据库迁移脚本：只能生成模板或草案。
- 认证/授权中间件：只能生成草案。
- 加密算法实现：禁止生成。
- 原生 SQL：只能生成草案。
- 公共基础库 API 变更：只能生成草案。

触碰这些内容时，Superpowers 的计划和 review 必须显式标记人工确认点。

## 4. 常见反模式

| 反模式 | 风险 | 改法 |
|---|---|---|
| 一句话直接让 AI 写代码 | 需求和边界丢失 | 先 `yss-product-lifecycle`、`grill-with-docs` 或 `brainstorming` |
| 计划只有大标题 | 执行时继续猜 | 用 `writing-plans` 写到文件和命令级 |
| 测试后补 | 不知道测试是否有效 | 先红后绿 |
| Bug 先改再看 | 修症状不修根因 | 先 `systematic-debugging` |
| Review 只在最后做 | 问题累积 | 每个任务或自然 checkpoint 后 review |
| Agent 说成功就相信 | 容易漏测、漏改 | 主 Agent 自己验证 diff 和命令输出 |
| 外部 review 说什么都照做 | 可能破坏项目约定 | 用 `receiving-code-review` 核验后处理 |
| 完成前不跑命令 | 交付不可证 | 用 fresh verification 支撑结论 |

## 5. 推荐检查清单

### 需求进入开发前

- [ ] 已明确生命周期阶段。
- [ ] 已有 PRD 或明确无需 PRD。
- [ ] OpenAPI 影响明确。
- [ ] 架构和安全红线已判断。
- [ ] 已决定是否需要 OpenSpec / Comet change。
- [ ] 已有可执行计划或垂直切片。

### 实现过程中

- [ ] 每个行为先有失败测试或可复现验证。
- [ ] 每个任务完成后运行对应验证。
- [ ] 跨 YSS 专项前先用 `yss-router`。
- [ ] 涉及 API 时先更新 `docs/api/specs/*.yaml`。
- [ ] 重要节点请求 review。

### 完成前

- [ ] 运行 fresh verification。
- [ ] 读取完整输出和 exit code。
- [ ] 检查 `git diff --check`。
- [ ] 更新文档、OpenSpec、release 或 implementation 资产。
- [ ] 明确哪些没有验证、为什么没有验证。

## 6. 一句话原则

```text
Superpowers 不是让 AI 更“会写”，而是让 AI 更“守流程”：先想清楚，先测后写，先验证再宣布完成。
```
