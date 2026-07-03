---
status: template
owner: ai
---

# <功能 / change> Build Architecture Checklist

> 本模板用于 Comet build 前和每个垂直切片完成后，把系统架构、数据架构、ADR、工程基线、OpenAPI Freeze 结论和安全红线转译为可执行检查项。它不是替代架构文档，而是防止架构资产在 build 阶段失效。

## 1. 输入资产

| 资产 | 路径 | 状态 |
|---|---|---|
| 系统架构 |  |  |
| 数据架构 |  |  |
| ADR |  |  |
| 工程基线 |  |  |
| OpenAPI Freeze |  |  |
| OpenSpec / Comet design |  |  |
| 安全红线 | `AGENTS.md` |  |

## 2. 架构约束矩阵

| constraint | source | slice | status | evidence | follow-up |
|---|---|---|---|---|---|
| DDD 分层不得穿透：Domain 不依赖 Adapter、Infrastructure、Mapper、Controller 或 Web DTO | 系统架构 / YSS DDD 规范 / `AGENTS.md` |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  | 若发现穿透依赖，标记 `violation` 并停止 build，回到架构修正 |
| 安全红线：认证 / 授权、SQL / DDL、迁移、加密、公共基础库 API 变更必须 `TODO-HUMAN-REVIEW` | `AGENTS.md` |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  | 未有人审证据时不得发布或合并 |
|  |  |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  |  |

状态说明：

- `implemented`：已有代码、测试或文档证据证明满足约束。
- `seam-deferred`：允许临时 seam，但必须说明风险、补齐切片和 `TODO-HUMAN-REVIEW`；安全红线不得无限延期。
- `drift`：实现与架构意图不一致，必须先做 Architecture Re-check。
- `violation`：违反架构或安全红线，停止继续 build，回到设计审查或架构修正。
- `not-applicable`：当前切片不触碰该约束，并说明原因。

字段说明：

- `source`：回指系统架构、数据架构、ADR、OpenAPI Freeze、工程基线或安全红线来源。
- `constraint`：可检查的架构或治理约束。
- `slice`：绑定的垂直切片编号或名称。
- `status`：只能使用上方状态枚举。
- `evidence`：代码、测试、文档、Issue 评论或人审证据。
- `follow-up`：延期、漂移或违反时的补齐落点和是否阻断继续 build。

## 3. 当前切片回勾

| 切片 | 已落实 | seam / 延期 | 漂移 | 违反 | 是否允许继续 |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## 4. 人工审查点

| 红线 | 是否触碰 | TODO-HUMAN-REVIEW | 人审证据 | 阻断结论 |
|---|---|---|---|---|
| SQL / DDL |  |  |  |  |
| 数据库迁移 |  |  |  |  |
| 认证 / 授权 |  |  |  |  |
| 审计日志 |  |  |  |  |
| 文件上传下载 / 临时 URL |  |  |  |  |
| 加密算法 |  |  |  |  |

## 5. 结论

- 是否允许继续 build：
- 必须先修正：
- 可延期到后续切片：
- fresh verification 命令：
