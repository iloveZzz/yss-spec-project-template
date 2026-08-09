---
status: template
owner: ai
---

# 阶段 Checkpoint 记录模板

> 用于人工暂停、handoff、进入实现、合并或发布边界，复制到 Ticket 评论、MR / PR 描述或阶段文档。连续自动推进可覆盖多个阶段，但必须保留各阶段产物和因果关系。

## 基本信息

| 字段 | 内容 |
|---|---|
| Feature / Change |  |
| 当前阶段 |  |
| 本次覆盖阶段 |  |
| 对应门禁 |  |
| 记录日期 |  |
| 记录人 / Agent |  |
| 主控 Agent |  |
| Ticket / MR / PR |  |

## 生命周期状态块

> 平台可用时以功能父 Ticket 中的同版本状态块为主；本地块用于降级和审计。它只保存索引、状态与因果关系，不能替代真实资产。

```yaml
lifecycle:
  schema_version: 1
  mode: route # route / orchestrate / resume / audit
  stage: intake
  status: routing # routing / running / paused-human-gate / blocked / completed
  updated_at: <ISO-8601>
workflow:
  matt_flow: main
  active_skill: null
  status: not-started # not-started / active / paused / resolved / failed
  next_skill: null
  wayfinder_map: null
artifacts: {}
gates: {}
stage_trace:
  - stage: <stage>
    upstream_refs: []
    artifact_refs: []
    gate_decisions: []
    downstream_impacts: []
tracker:
  platform: null
  parent_ticket: null
  role: ready-for-human
pause:
  reason_code: null
  gate_ref: null
  owner_or_authority: null
  resume_condition: null
  next_work_unit: null
phase_boundary: null # optional; continue / clear / handoff / subagent / compact
# When phase_boundary is used, record decision + reason. Handoff needs source_ref /
# destination_ref, subagent needs task_package_ref / convergence_ref, compact needs next_phase.
```

## 阶段因果与产物

| 阶段 | 上游输入 | 产物路径 / 链接 | 门禁 / 状态 | 下游影响 | 备注 |
|---|---|---|---|---|---|
|  |  |  | `missing` / `draft` / `ready-for-human` / `approved` / `stale` / `not-applicable` |  |  |

## Ticket 同步状态

| 项目 | 内容 |
|---|---|
| Ticket tracker | GitLab / GitHub / 本地文档 |
| 已同步内容 |  |
| 未同步原因 |  |
| 下一次同步点 |  |

## 验证证据

| 验证项 | 命令 / 方式 | 结果 | 证据 |
|---|---|---|---|
|  |  | `pass` / `fail` / `not-run` |  |

## Subagent 协同记录

| 项目 | 内容 |
|---|---|
| 是否使用 subagent | 是 / 否 |
| 使用原因 |  |
| 任务包位置 |  |
| 不可委派门禁确认 | 生命周期阶段判定 / Spec baseline / requirement freeze / Prototype 用户确认 / OpenAPI Freeze / Architecture Review 放行 / 风险 / 回滚约束 / Ticket 状态 / Git checkpoint / 完成结论均由主控 Agent 收口 |

| task_id | subagent 角色 | 任务类型 | 输入资产 | 输出产物 | 写范围 | 主控采纳结论 |
|---|---|---|---|---|---|---|
|  | Explorer / Drafter / Worker / Reviewer / Verifier | explore / draft / work / review / verify |  |  | 只读 / 指定路径 | 采纳 / 部分采纳 / 不采纳 / 需返工 |

| 冲突 / 分歧 | 裁决依据 | 回填资产 | 是否阻断 |
|---|---|---|---|
|  | Spec / OpenAPI / ADR / Ticket / 测试 / CONTEXT / 风险 / 回滚约束 / 用户指令 |  | 是 / 否 |

| 独立审查项 | 结论 | 证据 |
|---|---|---|
| Review / Verification 执行者独立于实现者 | 是 / 否 / 不适用 |  |
| 是否由同一独立执行者合并完成 | 是 / 否 / 不适用 | 小改动 / 中等变更可合并；新模块、高风险、职责冲突或双人控制要求时拆分 |

## 阻塞项与人工审查

| 类型 | 描述 | 处理方式 | 是否阻断 |
|---|---|---|---|
| 阻塞项 |  |  | 是 / 否 |
| 高风险变更 / 人工确认项 |  | 需确认 / 不适用 | 是 / 否 |
| 架构漂移 |  | Architecture Re-check / 不适用 | 是 / 否 |

| 人审项 | 是否涉及 | 结论 | 证据 / 链接 |
|---|---|---|---|
| DDL / SQL / 数据库迁移 | 是 / 否 | 通过 / 草案 / 阻断 / 不适用 |  |
| 权限接入 / 认证 / 授权 | 是 / 否 | 通过 / 草案 / 阻断 / 不适用 |  |
| 审计日志 | 是 / 否 | 通过 / 草案 / 阻断 / 不适用 |  |

## 实现仓库 / 脚手架状态

| repo_role | repo / output_dir | scaffold_status | scaffold_skill | 目标是否确认 |
|---|---|---|---|---|
| backend |  | existing / required / initialized / not-applicable | `yss-ddd-scaffold-generator` / none | 是 / 否 / 不适用 |
| frontend |  | existing / required / initialized / not-applicable | `yss-frontend-scaffold-generator` / none | 是 / 否 / 不适用 |

## Git Checkpoint 判断

| 项目 | 内容 |
|---|---|
| 本轮覆盖阶段应纳入提交的路径 |  |
| 明确排除的无关脏文件 |  |
| 建议动作 | commit / 暂缓 / 需要人工确认 |
| 暂缓原因 |  |
| 推送建议 | push / 暂缓 / 不适用 |

## 下一步

- 下一阶段：
- 进入条件：
- 负责人：
- 预计补齐项：
