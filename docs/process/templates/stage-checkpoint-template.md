---
status: template
owner: ai
---

# 阶段 Checkpoint 记录模板

> 用于每个生命周期阶段结束时，复制到 Issue 评论、MR / PR 描述或阶段文档。目标是固定产物、验证、风险、Issue 同步和 Git checkpoint 判断，避免阶段结论只停留在本地上下文。

## 基本信息

| 字段 | 内容 |
|---|---|
| Feature / Change |  |
| 当前阶段 |  |
| 对应门禁 |  |
| 记录日期 |  |
| 记录人 / Agent |  |
| 主控 Agent |  |
| Issue / MR / PR |  |

## 阶段产物

| 产物 | 路径 / 链接 | 状态 | 备注 |
|---|---|---|---|
|  |  | `done` / `draft` / `not-applicable` |  |

## Issue 同步状态

| 项目 | 内容 |
|---|---|
| Issue tracker | GitLab / GitHub / 本地文档 |
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
| 不可委派门禁确认 | 生命周期阶段判定 / PRD baseline / requirement freeze / Prototype 用户确认 / OpenAPI Freeze / Architecture Review 放行 / 风险 / 回滚约束 / Issue 状态 / Git checkpoint / 完成结论均由主控 Agent 收口 |

| task_id | subagent 角色 | 任务类型 | 输入资产 | 输出产物 | 写范围 | 主控采纳结论 |
|---|---|---|---|---|---|---|
|  | Explorer / Drafter / Worker / Reviewer / Verifier | explore / draft / work / review / verify |  |  | 只读 / 指定路径 | 采纳 / 部分采纳 / 不采纳 / 需返工 |

| 冲突 / 分歧 | 裁决依据 | 回填资产 | 是否阻断 |
|---|---|---|---|
|  | PRD / OpenAPI / ADR / Issue / 测试 / CONTEXT / 风险 / 回滚约束 / 用户指令 |  | 是 / 否 |

| 独立审查项 | 结论 | 证据 |
|---|---|---|
| Reviewer 独立于 Worker / Drafter | 是 / 否 / 不适用 |  |
| Verifier 独立执行 fresh verification | 是 / 否 / 不适用 |  |

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
| 本阶段应纳入提交的路径 |  |
| 明确排除的无关脏文件 |  |
| 建议动作 | commit / 暂缓 / 需要人工确认 |
| 暂缓原因 |  |
| 推送建议 | push / 暂缓 / 不适用 |

## 下一步

- 下一阶段：
- 进入条件：
- 负责人：
- 预计补齐项：
