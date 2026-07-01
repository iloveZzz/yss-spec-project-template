# OpenAPI Draft 契约评审清单

> 用于 OpenAPI Draft 进入 Engineering Baseline / YSS DDD Review 之前。评审采用 fail-closed：阻断项未关闭前，不进入架构 / OpenSpec / Comet design。

## 输入资产

| 资产 | 路径 | 状态 |
|---|---|---|
| OpenAPI Draft | `docs/api/specs/<feature>.yaml` |  |
| PRD / 需求冻结 |  |  |
| 交互说明 / 原型评审 |  |  |
| YSS 工程基线 | `.codex/skills/yss-ddd-scaffold-generator/references/yss-backend-scaffold-parent/SKILL.md` |  |

## P0 追踪矩阵

| P0 需求 / 页面动作 | Endpoint / Non-goal | Request | Response | Error | Permission / actionKey | Concurrency / Idempotency | Contract Test | 结论 |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

## 门禁检查

| Gate | Pass 条件 | 结论 | 备注 |
|---|---|---|---|
| OpenAPI 语法 | YAML、`$ref`、path 参数、lint 通过 |  |  |
| P0 覆盖 | 每个 P0 需求有 endpoint/schema/error/test 或明确非目标 |  |  |
| 页面动作覆盖 | 每个按钮 / 抽屉 / 弹窗动作有 endpoint/non-goal、`actionKey`、权限和错误码 |  |  |
| 对象生命周期 | manage/maintain/configure/create/update/archive/retry/cancel/publish/export/create-draft 语义闭环 |  |  |
| YSS 响应包装 | 单对象 `SingleResult<T>`；列表 `MultiResult<T>`；分页 `PageResult<T>` |  |  |
| 权限 | 无权不泄露数据；禁用动作返回 disabledReason；越权调用 403 |  |  |
| 错误结构 | 模型级、字段级、行级错误可定位；关键 422 有 examples |  |  |
| 乐观锁 / 幂等 | 草稿写入有 draftVersion；关键命令有幂等键 |  |  |
| 安全红线 | 认证授权、SQL/DDL 草案、下载 URL、审计日志、敏感字段有人工审查项 |  |  |
| 契约测试 | 导入、覆盖率、检查、评审、发布、导出、权限、冲突场景可测 |  |  |

## 结论

| 结论 | 勾选 |
|---|---|
| Approved for Engineering Baseline / Architecture Design |  |
| Blocked, return to OpenAPI Draft |  |

## 阻断项

| ID | 问题 | 依据 | 修正要求 | Owner |
|---|---|---|---|---|
|  |  |  |  |  |
