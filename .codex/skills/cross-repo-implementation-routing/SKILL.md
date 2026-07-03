---
name: cross-repo-implementation-routing
description: Use when a Harness change or vertical slice may require work across external frontend/backend implementation repositories. Produces backend/frontend/harness task routing, branch/MR tracking fields, verification commands, and cross-repo slice records without directly editing or pushing implementation repositories.
---

# Cross Repo Implementation Routing

用于从一个 Harness change 或垂直切片判断需要改哪些实现仓库，并把 Harness、后端、前端、契约和验证证据绑定起来。

## Inputs

- Harness change / OpenSpec / Comet change。
- 垂直切片 Issue 或实施计划。
- OpenAPI Freeze 或无 API 影响记录。
- 已登记的实现仓库记录；没有登记时先使用 `implementation-repo-onboarding`。

## Workflow

1. 读取 `docs/process/implementation-repo-integration.md` 和当前 change 资产。
2. 判断影响面：Harness-only、backend-only、frontend-only、backend+frontend、contract-only、release-only。
3. 确认每个受影响实现仓库已有登记记录；缺失则阻断并要求 onboarding。
4. 输出最小任务分配：Harness 文档 / OpenAPI / 后端 MR / 前端 MR / 验证 / 发布。
5. 按 `docs/templates/cross-repo-slice-template.md` 生成切片记录草案。
6. 给出 fresh verification 命令和阶段 checkpoint 回写字段。

## Routing Matrix

| 影响 | 必需记录 |
|---|---|
| Harness-only | change、文档路径、验证命令、checkpoint |
| backend-only | backend repo、branch、MR / PR、测试命令、CI、OpenAPI 是否受影响 |
| frontend-only | frontend repo、branch、MR / PR、lint / type-check / build、API client 是否受影响 |
| backend+frontend | OpenAPI Freeze、generated client、后端验证、前端验证、端到端验收 |
| contract-only | OpenAPI spec、Freeze 记录、前后端消费确认 |
| release-only | release note、rollout、rollback、观察信号 |

## Boundaries

- 不直接修改实现仓库代码。
- 不创建或推送分支，除非用户在执行任务中明确授权。
- 不允许前后端 MR / PR 信息只停留在实现仓库；必须回写 Harness 记录。
- 如果 API 契约变化但没有 Freeze，必须回到 API Draft / Freeze 阶段。

## Output

- 跨仓库实现路由结论。
- backend / frontend / harness 三方任务分配。
- cross-repo slice 草案。
- fresh verification 与 checkpoint 字段。
- 阻断项和人审点。
