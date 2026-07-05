# OpenAPI Draft 契约评审清单

> 用于 API 影响分析 / 契约草案 / OpenAPI Draft 进入 Engineering Baseline / YSS DDD Review 之前。
> OpenAPI Draft 在 OpenAPI Freeze 前仅用于评审和架构反审，不得作为前后端实现或生成客户端的稳定契约。
> 评审采用 fail-closed：阻断项未关闭前，不进入架构 / 系统 / 数据架构设计。

## 输入资产

| 资产 | 路径 | 状态 |
|---|---|---|
| API 影响记录 / 契约草案 | issue note / design note / `docs/api/specs/<feature>.yaml` |  |
| OpenAPI Draft | `docs/api/specs/<feature>.yaml` |  |
| PRD / 需求冻结 |  |  |
| 产品总体设计 / 功能架构 |  |  |
| 交互说明 / 页面清单 | `docs/design/<feature>-interaction-spec.md` |  |
| 原型 / 线框图 |  |  |
| 状态矩阵 | `docs/design/<feature>-state-matrix.md` |  |
| 原型评审结论 | `docs/design/<feature>-prototype-review.md` |  |
| YSS 工程基线 | `.codex/skills/yss-ddd-scaffold-generator/references/yss-backend-scaffold-parent/SKILL.md` |  |

## P0 追踪矩阵

| P0 需求 / 页面动作 | Endpoint / Non-goal | Request | Response | Error | Permission / actionKey | Concurrency / Idempotency | Contract Test | 结论 |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

## 门禁检查

| Gate | Pass 条件 | 结论 | 备注 |
|---|---|---|---|
| Draft 成熟度 | 明确当前仅为 review-only；实现、生成 client、契约测试固化均等待 OpenAPI Freeze |  |  |
| OpenAPI 语法 | YAML、`$ref`、path 参数、lint 通过 |  |  |
| P0 覆盖 | 每个 P0 需求有 endpoint/schema/error/test 或明确非目标 |  |  |
| 交互输入完整 | Draft 已同时依据 PRD、产品总体设计、交互说明、原型/线框、状态矩阵和 prototype-review；缺任一项需说明无 UI 影响或返回上游补齐 |  |  |
| DDD 契约边界 | Endpoint/schema 归属的限界上下文清楚；术语与 `CONTEXT.md` 和功能架构一致；契约不直接暴露内部聚合、Repository 或持久化表结构 |  |  |
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
| Blocked, return to contract draft / OpenAPI Draft |  |

## 阻断项

| ID | 问题 | 依据 | 修正要求 | Owner |
|---|---|---|---|---|
|  |  |  |  |  |
