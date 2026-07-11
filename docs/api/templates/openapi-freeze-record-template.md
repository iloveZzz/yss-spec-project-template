---
pipeline: <feature-id>
stage: openapi-freeze
status: draft
owner: ai
---

# <功能名称>OpenAPI Freeze 记录

> 适用场景：OpenAPI Draft 通过产品、前端、后端、架构和设计审查后，冻结为实现输入。
> 本文记录冻结版本、评审证据和后续变更规则，不替代 OpenAPI YAML。

## 1. 输入材料

| 资产 | 路径 / 链接 | 状态 | 备注 |
|------|-------------|------|------|
| OpenAPI Draft |  |  |  |
| OpenAPI Draft Review |  |  |  |
| PRD / 需求冻结 |  |  |  |
| 产品设计 / 状态矩阵 |  |  |  |
| 工程基线 / 系统 / 数据架构 |  |  |  |
| Design Review |  |  |  |

## 2. 冻结范围

| 方法 | 路径 | schema | 状态 | 备注 |
|------|------|--------|------|------|
|  |  |  | frozen / deferred |  |

## 3. 契约检查

| 检查项 | 结论 | 备注 |
|--------|------|------|
| 页面动作到端点映射完整 | 通过 / 阻断 / 不适用 |  |
| 请求 / 响应 schema 明确 | 通过 / 阻断 |  |
| 错误结构和错误码明确 | 通过 / 阻断 |  |
| 分页 / 排序 / 过滤明确 | 通过 / 阻断 / 不适用 |  |
| 权限 / 并发 / 幂等明确 | 通过 / 阻断 / 不适用 |  |
| YSS 统一响应包装明确 | 通过 / 阻断 |  |
| 契约测试 seam 明确 | 通过 / 阻断 |  |
| 风险 / 人工确认项已处理 | 通过 / 阻断 / 不适用 |  |

## 4. 冻结后变更规则

- 冻结后如需改变路径、请求 / 响应 schema、错误结构、权限或分页规则，必须回到 OpenAPI Draft Review 和 Design Review。
- 行为规格变化影响接口时，必须同步回写 `docs/api/specs/<feature>.yaml` 和 OpenAPI Draft 或 PRD 验收场景。
- 前后端实现必须以本记录引用的冻结版本为准。

## 5. 完成标准

- [ ] OpenAPI Draft Review 无阻断项。
- [ ] Design Review 无阻断项。
- [ ] 前端、后端、API 契约测试均可消费冻结契约。
- [ ] Issue change formalization 可引用本冻结记录。

## 6. 下一步门禁

- 结论：Approved / Blocked
- 下一步：Issue change formalization
- 阻断项：
