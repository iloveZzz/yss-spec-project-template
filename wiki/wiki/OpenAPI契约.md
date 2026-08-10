# OpenAPI Draft 与 Freeze

API 契约变更先形成 OpenAPI 3.1 Draft——review-only 的契约草案，Freeze 前不得作为前后端稳定实现契约。Draft 需经过必要的工程基线、系统 / 数据架构和设计审查后进入 OpenAPI Freeze。

OpenAPI Freeze 指已通过评审、可作为前后端实现和契约测试输入的 OpenAPI 3.1 契约。Freeze 后变更必须回到 API 影响分析和设计审查，形成新的 Draft 循环。OpenAPI 契约的评审要点包括 P0 需求覆盖、页面动作到端点映射、YSS 响应包装、错误、权限、分页、乐观锁、安全红线与契约测试 seam。

OpenAPI 契约文件存放于 `docs/api/specs/`，评审检查清单与 Freeze 记录模板见 `docs/api/templates/`。OpenAPI Freeze 或无 API 影响记录完成后，使用 `to-tickets` 拆分成窄垂直切片（见 [[垂直切片Ticket]]）。OpenAPI Draft 属于待冻结资产，使用 `ready-for-human`；只有 Freeze 后的契约才支撑 `ready-for-agent` 的切片。

YSS 的 OpenAPI 契约在实现后通过 `yss-openapi` 技能生成 OpenAPI JSON 并刷新前端 Orval API 客户端（见 [[YSS工程技能体系]]）。
