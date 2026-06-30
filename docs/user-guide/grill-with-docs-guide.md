# grill-with-docs 使用手册

本文面向使用本模板的产品、全栈开发、设计和实施人员。`grill-with-docs` 是一个需求和设计阶段的强访谈入口：它通过连续追问把模糊想法压实，同时用 `domain-modeling` 把稳定术语写入 `CONTEXT.md`，把少数关键取舍沉淀为 ADR。

一句话：

```text
grill-with-docs = 追问清楚 + 同步沉淀领域语言和关键决策
```

## 1. 它解决什么问题

没有 grill 时，需求经常会这样失真：

- “模型发布”到底是按钮、流程、版本冻结，还是对外生效机制，没有说清。
- “管理员”“实施人员”“建模人员”混用，权限边界不清。
- AI 直接写 PRD，但关键边界来自猜测。
- 重要取舍只留在聊天里，后续实现和复盘找不到依据。

`grill-with-docs` 的价值是先把这些问题问透，再进入 PRD、OpenAPI、OpenSpec/Comet 或开发。

## 2. 什么时候使用

适合使用：

| 场景 | 典型信号 | 下一步产物 |
|---|---|---|
| 新产品 / 新模块 | “我要新建工程”“做数据中台模型管理” | discovery、PRD、`CONTEXT.md` |
| 模糊需求 | “支持模型发布”“加个审批” | 明确范围、非目标、验收标准 |
| 领域术语混乱 | 同一个概念有多个叫法 | 更新 `CONTEXT.md` |
| 关键取舍出现 | 版本能否回滚、发布是否可撤销 | 必要时写 ADR |
| 进入 PRD 前 | 已有想法但边界不稳 | `to-prd` 输入 |
| 进入 OpenSpec / Comet 前 | change 目标还不够清晰 | proposal / design 输入 |

不适合使用：

- 只是 typo、文案或局部样式调整。
- 已有清晰 PRD、OpenAPI 和任务，只需要执行。
- Bug 已经可复现，应先用 `systematic-debugging`。
- 单纯整理已有会议纪要，不需要追问或改变领域模型。

## 3. 输入和输出

### 3.1 输入

最少给出：

- 业务想法或问题。
- 当前用户角色。
- 你认为的成功结果。
- 已有材料路径，例如 discovery、PRD、竞品分析、OpenAPI、现有页面。

更好的输入：

```text
使用 grill-with-docs，帮我澄清“模型发布与版本冻结”。
背景：数据中台模型管理中，建模人员可以编辑草稿模型，发布后供下游引用。
我不确定：发布后是否允许回滚、字段是否还能改、失败如何提示。
请边追问边沉淀 CONTEXT.md 和必要 ADR。
```

### 3.2 输出

一次好的 grill 会输出：

- 被澄清的问题列表。
- 已确认的用户、场景、范围和非目标。
- 稳定术语更新到 `CONTEXT.md`。
- 确有必要时，新增或建议 ADR。
- 下一步建议：继续 discovery、生成 PRD、更新 OpenAPI、创建 OpenSpec/Comet change，或进入实现路由。

## 4. 推荐流程

```text
已有想法 / 竞品分析 / discovery 草稿
-> grill-with-docs
-> 更新 CONTEXT.md
-> 必要时新增 ADR
-> to-prd 或 PRD 文档
-> OpenAPI 影响判断
-> OpenSpec / Comet
-> writing-plans / yss-router / YSS skills
```

### Step 1: 说明问题

```text
使用 grill-with-docs，帮我澄清“<feature>”。
请重点追问用户角色、业务闭环、范围、非目标、异常场景、验收标准和术语。
```

### Step 2: 逐轮回答

grill 的重点是“被问住”。遇到不确定的问题，不要让 AI 替你决定，可以明确说：

```text
这个点暂不确定，请记录为待确认，不要写入 CONTEXT.md。
```

或者：

```text
这个术语已经确定，请更新到 CONTEXT.md。
```

### Step 3: 收敛为资产

当问题被问清楚后，让 AI 输出收敛结果：

```text
请总结本轮 grill 结果：
1. 已确认范围
2. 非目标范围
3. 已更新术语
4. 需要人工确认的问题
5. 下一步建议进入 PRD、OpenAPI 还是 OpenSpec/Comet
```

## 5. 与 CONTEXT.md 的关系

`CONTEXT.md` 只记录稳定业务语言，不记录实现细节。

应该写入：

- 业务对象：模型、字段、草稿版本、发布版本。
- 状态含义：冻结、发布、撤销、失效。
- 角色和责任：建模人员、实施顾问、平台管理员。
- 避免用语：同义词、容易混淆的叫法。

不应该写入：

- Java 类名、Vue 组件名、表名、接口路径。
- 临时计划。
- 未确认猜测。
- 具体实现方案。

示例：

```text
模型发布：
将草稿版本冻结为可被下游引用的发布版本。
_Avoid_: 上线、提交、保存
```

## 6. 与 ADR 的关系

不是每个讨论结论都要写 ADR。只有同时满足三点时才写：

1. 难以回滚。
2. 没有上下文时会让未来读者困惑。
3. 经过真实取舍。

适合写 ADR：

- 发布版本是否永久不可变。
- 模型版本是否允许回滚。
- 模型发布采用审批流还是直接发布。
- 多租户模型隔离策略。

不适合写 ADR：

- 页面按钮放左边还是右边。
- 常规 CRUD 字段。
- 临时实验结论。

## 7. 与其它技能的关系

| 阶段 | 先用 | 后接 |
|---|---|---|
| 竞品后发现 | `grill-with-docs` | discovery / PRD |
| PRD 前 | `grill-with-docs` | `to-prd` |
| OpenSpec 前 | `grill-with-docs` | `openspec-explore` / `comet` |
| 设计前 | `grill-with-docs` | `brainstorming` |
| 实现前 | `grill-with-docs` 只在需求不清时使用 | `writing-plans` / `yss-router` |
| Bug | 通常不用 | `systematic-debugging` |

推荐组合：

```text
yss-product-lifecycle
-> grill-with-docs
-> to-prd
-> OpenAPI
-> OpenSpec / Comet
-> Superpowers / YSS skills
```

## 8. 常用提示词

```text
使用 grill-with-docs，帮我澄清“数据中台模型管理”的 MVP 边界。
请边追问边判断哪些术语可以写入 CONTEXT.md。
```

```text
使用 grill-with-docs，围绕“模型发布与版本冻结”做需求拷问。
重点追问发布后可变性、回滚、权限、失败提示、下游引用影响。
```

```text
使用 grill-with-docs，检查这份 PRD 还有哪些边界没问清。
如果发现稳定术语，更新 CONTEXT.md；如果出现重大取舍，建议是否需要 ADR。
```

```text
使用 grill-with-docs，帮我把这个功能进入 OpenSpec 前的问题问完。
输出：已确认范围、未确认问题、术语变更、ADR 建议、下一步 prompt。
```

## 9. 最小闭环

如果只记一条：

```text
先让 AI 追问到你说清楚，再让 AI 写 PRD 或代码。
```

对应资产：

```text
CONTEXT.md
docs/adr/
docs/discovery/
docs/requirements/
openspec/changes/
```
