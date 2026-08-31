---
status: template
owner: ai
---

# Digital Human Task Package：<task_id>

> Canonical contract: `docs/process/schemas/digital-human-task-package.schema.json`。本文件路径保留为兼容入口。

> 用于主控 Agent 派发 subagent 前固定输入、输出、写范围和验收标准。没有任务包边界时，不得派发 subagent。

## 1. 基本信息

| 字段 | 内容 |
|---|---|
| schema_version | `1` |
| task_id |  |
| work_unit_id | 对应生命周期注册表的 `work_units[].id`；实现子任务对应 Slice Contract 的 `work_units[].id` |
| actor_id | 当前运行时实例标识；Reviewer 必须与实现者不同 |
| Feature / Change |  |
| 生命周期阶段 |  |
| 对应门禁 |  |
| Ticket / MR / PR |  |
| 主控 Agent |  |
| 数字人角色 | `role.` 见 `docs/agents/digital-human-roles.yaml` |
| runtime_id | `runtime.generic` / `runtime.skill-projection` / `runtime.grok` |
| core_skills | 从角色表复制，禁止手写 |
| forbidden_skills | 从角色表复制，禁止手写 |
| subagent 角色 | Explorer / Drafter / Worker / Reviewer / Verifier |
| 任务类型 | explore / draft / work / review / verify |
| execution_state | 与 subagent 角色一致；由主控派发 |
| workflow_status | not-started / active / paused / resolved / failed |

## 2. 输入资产

| 输入 | 路径 / 链接 | 用途 |
|---|---|---|
| Spec / Discovery |  |  |
| Product / Interaction Design |  |  |
| OpenAPI Draft / Freeze |  |  |
| Architecture / ADR / CONTEXT |  |  |
| Ticket / Slice / Checklist |  |  |
| 代码 / 命令 / 其他 |  |  |

## 2.1 合同与技能来源

| 字段 | 内容 |
|---|---|
| contract_id |  |
| contract_version |  |
| contract_kind | `lifecycle-work-unit` / `slice-implementation` / `template-maintenance` |
| contract_status | `issued` / `stale` / `blocked`；不替代生命周期门禁批准 |
| contract_ref |  |
| lifecycle_ref | 生命周期工作单元使用 |
| Slice Implementation Contract | 仅 `slice-implementation` 填写 |
| maintenance_ref | 仅 `template-maintenance` 填写维护 checkpoint |
| 技能注册表 | `docs/agents/digital-human-roles.yaml` |
| 技能默认值 | `taskPackageDefaults(<role_id>)` |

## 3. 输出要求

| 输出 | 路径 / 链接 | 完成标准 |
|---|---|---|
|  |  |  |
| expected_evidence_files |  |  |

## 3.1 下游与汇合

| 字段 | 内容 |
|---|---|
| downstream_consumers |  |
| parent_work_unit | `<work-unit.id>` |
| convergence_ref |  |
| conflict_escalation |  |

## 4. 写范围

| 范围 | 允许 / 禁止 | 说明 |
|---|---|---|
| 允许修改的文件 / 模块 |  |  |
| 只读路径 |  |  |
| 明确禁止修改 |  |  |

## 5. 禁止事项

- [ ] 不得执行 Spec baseline / requirement freeze。
- [ ] 不得执行 OpenAPI Freeze。
- [ ] 不得给出 Architecture Review 最终放行结论。
- [ ] 不得替代风险 / 回滚约束人工确认。
- [ ] 不得替代 Git checkpoint 范围裁决。
- [ ] 不得宣布“完成 / 可合并 / 可发布”。
- [ ] 不得 revert 或覆盖其他 Agent / 用户的改动。

## 6. 验收标准

- [ ] 输出与输入资产逐项对应。
- [ ] 结论区分事实、推断和建议。
- [ ] 写入类任务只修改授权范围。
- [ ] 审查类任务列出 blocker / non-blocker / residual risk。
- [ ] 验证类任务记录命令、时间、结果和残余风险。
- [ ] 需要人工确认的事项记录范围、责任人和结论。

## 7. 汇合方式

| 项目 | 内容 |
|---|---|
| 结果回填位置 |  |
| 冲突上报方式 |  |
| 主控 Agent 合并动作 | 采纳 / 部分采纳 / 不采纳 / 需返工 |
| 未采纳原因 |  |

## 7.1 实际验证结果

| 命令 | exit_code | executed_at | evidence_ref |
|---|---:|---|---|
|  |  |  |  |

## 8. 子代理最终回复格式

```markdown
### 结果摘要
- <完成了什么>

### 证据
- <文件 / 命令 / 链接>

### 变更路径
- <如无写入，填“无，只读任务”>

### 风险与阻塞
- <blocker / residual risk / 人工确认项>

### 需要主控 Agent 裁决
- <Freeze / 安全 / 范围 / 发布等事项>
```
