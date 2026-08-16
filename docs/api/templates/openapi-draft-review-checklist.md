# OpenAPI Draft 契约评审清单

> 用于 API 影响分析 / 契约草案 / OpenAPI Draft 进入 Engineering Baseline / YSS DDD Review 之前。
> OpenAPI Draft 在 OpenAPI Freeze 前仅用于评审和架构反审，不得作为前后端实现或生成客户端的稳定契约。`<feature>.yaml` 必须是唯一权威的单一 OAS 3.1 YAML document；JSON 只能在 Freeze 后由受锁定工具派生。
> 评审采用阻断项闭环：阻断项未关闭前，不进入架构 / 系统 / 数据架构设计。

## 输入资产

| 资产 | 路径 | 状态 |
|---|---|---|
| API 影响记录 / 契约草案 | issue note / design note / `docs/.scratch/<feature>/api/<feature>.yaml` |  |
| OpenAPI Draft | `docs/.scratch/<feature>/api/<feature>.yaml` |  |
| Spec / 需求冻结 |  |  |
| 产品总体设计 / 功能架构 |  |  |
| 交互说明 / 页面清单 | `docs/.scratch/<feature>/design/<feature>-interaction-spec.md` |  |
| 原型 / 线框图 |  |  |
| 状态矩阵 | `docs/.scratch/<feature>/design/<feature>-state-matrix.md` |  |
| 原型评审结论 | `docs/.scratch/<feature>/design/<feature>-prototype-review.md` |  |
| 高保真 HTML 原型 | `docs/.scratch/<feature>/design/prototypes/index.html` | 有 UI 时必需；必须使用 Ant Design v6，并通过 `product-design:index` 路由产出或记录例外原因 |
| AntD CLI 校验证据 | `docs/.scratch/<feature>/design/<feature>-prototype-confirmation.md` 或评审记录 | 有 UI 时必需；记录 design.md / info / demo / token / semantic 查询 |
| 用户确认记录 | `docs/.scratch/<feature>/design/<feature>-prototype-confirmation.md` | 有 UI 时必需；未确认前不得进入 OpenAPI Draft 评审 |
| YSS 工程基线 | `.codex/skills/yss-ddd-scaffold-generator/references/yss-backend-scaffold-parent/SKILL.md` |  |

## P0 追踪矩阵

| P0 需求 / 页面动作 | Endpoint / Non-goal | Request | Response | Error | actionKey / 显式认证授权行为 | Concurrency / Idempotency | Contract Test | 结论 |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

## 门禁检查

| Gate | Pass 条件 | 结论 | 备注 |
|---|---|---|---|
| Draft 成熟度 | 明确当前仅为 review-only；实现、生成 client、契约测试固化均等待 OpenAPI Freeze |  |  |
| OpenAPI 语法 | YAML、`$ref`、path 参数、lint 通过 |  |  |
| YAML 权威性 | 单一 OAS 3.1 document；未混入生命周期 frontmatter / 根字段；`operationId` 稳定 |  |  |
| P0 覆盖 | 每个 P0 需求有 endpoint/schema/error/test 或明确非目标 |  |  |
| 产品总体设计完整 | Draft 已依据 Spec 和产品总体设计 / 功能架构；缺产品总体设计时返回上游补齐 |  |  |
| 交互输入完整 | 有 UI 时，Draft 已同时依据交互说明、原型/线框、状态矩阵、prototype-review、Ant Design v6 高保真 HTML 原型、AntD CLI 校验证据和用户确认记录；无 UI 时需说明页面 / 交互资产不适用原因 |  |  |
| DDD 契约边界 | Endpoint/schema 归属的限界上下文清楚；术语与 `CONTEXT.md` 和功能架构一致；契约不直接暴露内部聚合、Repository 或持久化表结构 |  |  |
| 页面动作覆盖 | 每个按钮 / 抽屉 / 弹窗动作有 endpoint/non-goal、`actionKey` 和错误码；Spec 明确认认证 / 授权变化时同时映射该行为 |  |  |
| 对象生命周期 | manage/maintain/configure/create/update/archive/retry/cancel/publish/export/create-draft 语义闭环 |  |  |
| YSS 响应包装 | 单对象 `SingleResult<T>`；列表 `MultiResult<T>`；分页 `PageResult<T>` |  |  |
| 显式认证 / 授权行为 | 仅当 Spec 明确改变相关行为时，`401` / `403`、资源过滤和错误语义有契约表示 |  | 未明确改变时不适用且无需额外记录 |
| 错误结构 | 模型级、字段级、行级错误可定位；关键 422 有 examples |  |  |
| 乐观锁 / 幂等 | 草稿写入有 draftVersion；关键命令有幂等键 |  |  |
| 风险 / 人工确认项 | 仅记录 Spec 或既有高风险分类已经明确的事项，不因 SQL / DDL、上传 / 下载或一般字段自动新增安全项 |  |  |
| 契约测试 | 导入、覆盖率、检查、评审、发布、导出和冲突场景可测；显式认证 / 授权行为按需加入 |  |  |
| JSON 派生准备 | 明确仅在 Freeze 后用锁定 Redocly CLI 生成 JSON；输出记录、SHA 和下游既有输入路径已定义 |  |  |

## 结论

| 结论 | 勾选 |
|---|---|
| Approved for Engineering Baseline / Architecture Design |  |
| Blocked, return to contract draft / OpenAPI Draft |  |

## 阻断项

| ID | 问题 | 依据 | 修正要求 | Owner |
|---|---|---|---|---|
|  |  |  |  |  |
