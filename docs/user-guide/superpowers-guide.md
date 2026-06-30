# Superpowers 使用手册

本文面向使用本模板的产品、全栈开发、设计和实施人员。Superpowers 不是业务框架，也不是代码依赖，而是一组让 AI Agent 按可靠工程流程工作的技能。

在本模板中，可以把 Superpowers 理解为“方法论层”：

```text
OpenAPI / OpenSpec 管规格
Comet 管阶段流转
Superpowers 管工作方法
YSS skills 管前后端专项落地
Codex 管本地执行
```

## 1. Superpowers 解决什么问题

没有 Superpowers 时，AI 很容易直接从一句话跳到代码。短期看快，长期会出现这些问题：

- 需求没想清楚，代码已经写完。
- Bug 没找到根因，只是修了表面症状。
- 测试后补，无法证明测试真的抓住问题。
- 实现完成后没有 fresh verification，却声称已完成。
- Review 只在最后做，问题叠到一起才暴露。

Superpowers 的价值是把这些动作变成显式流程：

| 场景 | 推荐 skill | 产物 |
|---|---|---|
| 想法、需求、功能设计 | `brainstorming` | 设计说明，默认落到 `docs/superpowers/specs/` |
| 已有规格，需要落成计划 | `writing-plans` | 实施计划，默认落到 `docs/superpowers/plans/` |
| 按计划执行 | `executing-plans` 或 `subagent-driven-development` | 逐项实现、验证、提交 |
| 新功能、Bug、重构 | `test-driven-development` | 红绿重构记录和测试 |
| Bug、测试失败、异常行为 | `systematic-debugging` | 根因、复现、假设、修复和回归测试 |
| 完成前验证 | `verification-before-completion` | fresh verification 命令和结果 |
| 请求代码审查 | `requesting-code-review` | 独立 review 反馈 |
| 接收 review 反馈 | `receiving-code-review` | 逐项核验、修复或技术性反驳 |
| 收尾分支 | `finishing-a-development-branch` | merge、PR、保留或丢弃的明确选择 |

## 2. 推荐使用顺序

### 2.1 新功能或新模块

适用于“模型管理”“模型发布与版本冻结”“新增一个 YSS 页面”等需求。

```text
yss-product-lifecycle
-> 机会探索环
-> grill-with-docs
-> PRD / to-prd
-> OpenAPI Draft
-> Superpowers brainstorming 设计
-> OpenSpec / Comet
-> OpenAPI Freeze
-> writing-plans
-> yss-router
-> YSS specialist skills
-> test-driven-development
-> requesting-code-review
-> verification-before-completion
-> finishing-a-development-branch
```

推荐提示词：

```text
使用 yss-product-lifecycle 和 Superpowers，帮我推进“模型发布与版本冻结”。
先判断当前生命周期阶段，再决定是否需要 brainstorming、OpenSpec/Comet 或 YSS skills。
```

如果需求还很模糊：

```text
使用 grill-with-docs，先帮我把“数据中台模型管理”的用户、范围、非目标和稳定术语问清楚。
然后再使用 brainstorming 形成方案设计。
```

如果已经有 PRD 或设计：

```text
使用 writing-plans，基于 docs/requirements/model-management-prd.md 生成可执行实施计划。
```

### 2.2 已有计划，开始实现

如果有 `docs/superpowers/plans/<feature>.md`：

```text
使用 executing-plans，按 docs/superpowers/plans/<feature>.md 执行。
```

如果当前平台支持 subagents，并且任务可拆分：

```text
使用 subagent-driven-development，按 docs/superpowers/plans/<feature>.md 逐任务执行，并在每个任务后做 review。
```

执行代码任务前仍要遵守本模板规则：

- API 变更先在 `docs/api/specs/*.yaml` 形成 Draft，并在实现前 Freeze。
- 新功能和 Bug 修复默认先写失败测试。
- 跨前后端或 YSS 多领域任务先走 `yss-router`。
- 安全红线只生成草案或标记 `TODO-HUMAN-REVIEW`。

### 2.3 Bug 或测试失败

不要直接说“修一下”。先让 AI 建立反馈闭环：

```text
使用 systematic-debugging，分析这个测试失败。先读错误、复现、定位根因，再提出修复。
```

修复阶段再接 TDD：

```text
基于刚才确认的根因，使用 test-driven-development 添加回归测试并修复。
```

Bug 修完后：

```text
使用 verification-before-completion，运行能证明这个 Bug 已修复的命令，并报告结果。
```

### 2.4 Review 和收尾

完成一个重要任务后：

```text
使用 requesting-code-review，对当前分支相对 origin/main 的改动做独立 review。
```

收到 review 后：

```text
使用 receiving-code-review，逐条核验这些反馈。正确的修复，不适合本项目的给出技术理由。
```

准备合并、推送或保留分支：

```text
使用 finishing-a-development-branch，完成当前开发分支收尾。
```

## 3. 与 OpenSpec / Comet 的关系

Superpowers 不替代 OpenSpec 或 Comet。

| 问题 | 用什么 |
|---|---|
| 这次变更要不要正式记录 | `yss-product-lifecycle` / `openspec-explore` |
| 变更 proposal、design、spec、tasks | OpenSpec skills 或 Comet |
| 怎么把已选方向变成设计 | `brainstorming` |
| 怎么把设计变成可执行计划 | `writing-plans` |
| 怎么按计划可靠实现 | `executing-plans` / `subagent-driven-development` |
| 怎么写代码不跑偏 | `test-driven-development` |
| 怎么确认完成 | `verification-before-completion` |

一个完整功能可以这样串：

```text
机会探索环
-> grill-with-docs 澄清边界和术语
-> PRD
-> OpenAPI Draft
-> Superpowers brainstorming 设计
-> OpenSpec / Comet change
-> OpenAPI Freeze
-> writing-plans 计划
-> YSS skills 实现
-> TDD / Review / Verify
-> Sync Specs / Archive
-> Release / Implementation / Retro
```

## 4. 与 YSS skills 的关系

Superpowers 管“如何做”，YSS skills 管“按 YSS 规范怎么写”。

| 落地任务 | Superpowers 负责 | YSS skills 负责 |
|---|---|---|
| 新建完整页面 | 先设计、计划、TDD、验证 | `yss-router`、`yss-page-module-development`、`yss-ui` |
| 后端领域建模 | 计划切片、测试策略、review | `yss-domain`、`yss-backend-scaffold-domain` |
| Repository / MyBatis | 计划、TDD、验证 | `yss-repository`、`yss-mybatis` |
| Controller / OpenAPI | 契约优先、验收和测试 | `yss-web-controller`、`yss-openapi` |

推荐提示词：

```text
使用 yss-product-lifecycle 判断当前阶段。
如果进入实现，请先用 yss-router 选择最小 YSS skills，再用 Superpowers 的 TDD、review 和 verification 约束执行。
```

## 5. 常用口令

```text
使用 brainstorming，先帮我把这个需求想清楚，不要直接写代码。
```

```text
使用 writing-plans，把这个设计拆成可执行、可验证、可提交的任务。
```

```text
使用 systematic-debugging，先找根因，再决定修复方案。
```

```text
使用 test-driven-development，先写失败测试，再实现最小代码。
```

```text
使用 verification-before-completion，运行 fresh verification 后再判断是否完成。
```

```text
使用 requesting-code-review，对本次改动做独立审查。
```

## 6. 最小闭环

如果只记一条，记这条：

```text
想清楚 -> 写计划 -> 先测后写 -> 独立审查 -> fresh verification -> 再说完成
```

对应到模板资产：

```text
docs/superpowers/specs/
docs/superpowers/plans/
docs/requirements/
docs/api/specs/
openspec/changes/
docs/releases/
docs/implementation/
```
