---
status: template
owner: ai
---

# Subagent Task Package：<task_id>

> 用于主控 Agent 派发 subagent 前固定输入、输出、写范围和验收标准。没有任务包边界时，不得派发 subagent。

## 1. 基本信息

| 字段 | 内容 |
|---|---|
| task_id |  |
| Feature / Change |  |
| 生命周期阶段 |  |
| 对应门禁 |  |
| Issue / MR / PR |  |
| 主控 Agent |  |
| subagent 角色 | Explorer / Drafter / Worker / Reviewer / Verifier |
| 任务类型 | explore / draft / work / review / verify |

## 2. 输入资产

| 输入 | 路径 / 链接 | 用途 |
|---|---|---|
| PRD / Discovery |  |  |
| Product / Interaction Design |  |  |
| OpenAPI Draft / Freeze |  |  |
| Architecture / ADR / CONTEXT |  |  |
| Issue / Slice / Checklist |  |  |
| 代码 / 命令 / 其他 |  |  |

## 3. 输出要求

| 输出 | 路径 / 链接 | 完成标准 |
|---|---|---|
|  |  |  |

## 4. 写范围

| 范围 | 允许 / 禁止 | 说明 |
|---|---|---|
| 允许修改的文件 / 模块 |  |  |
| 只读路径 |  |  |
| 明确禁止修改 |  |  |

## 5. 禁止事项

- [ ] 不得执行 PRD baseline / requirement freeze。
- [ ] 不得执行 OpenAPI Freeze。
- [ ] 不得给出 Architecture Review 最终放行结论。
- [ ] 不得替代安全红线人审。
- [ ] 不得替代 Git checkpoint 范围裁决。
- [ ] 不得宣布“完成 / 可合并 / 可发布”。
- [ ] 不得 revert 或覆盖其他 Agent / 用户的改动。

## 6. 验收标准

- [ ] 输出与输入资产逐项对应。
- [ ] 结论区分事实、推断和建议。
- [ ] 写入类任务只修改授权范围。
- [ ] 审查类任务列出 blocker / non-blocker / residual risk。
- [ ] 验证类任务记录命令、时间、结果和残余风险。
- [ ] 触碰安全红线时标记 `TODO-HUMAN-REVIEW`。

## 7. 汇合方式

| 项目 | 内容 |
|---|---|
| 结果回填位置 |  |
| 冲突上报方式 |  |
| 主控 Agent 合并动作 | 采纳 / 部分采纳 / 不采纳 / 需返工 |
| 未采纳原因 |  |

## 8. 子代理最终回复格式

```markdown
### 结果摘要
- <完成了什么>

### 证据
- <文件 / 命令 / 链接>

### 变更路径
- <如无写入，填“无，只读任务”>

### 风险与阻塞
- <blocker / residual risk / TODO-HUMAN-REVIEW>

### 需要主控 Agent 裁决
- <Freeze / 安全 / 范围 / 发布等事项>
```
