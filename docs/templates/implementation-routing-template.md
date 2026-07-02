---
pipeline: <feature-id>
stage: implementation-routing
status: draft
owner: ai
---

# <功能名称>实现路由记录

> 适用场景：OpenAPI Freeze、Design Review 和 OpenSpec / Comet change 已就绪后，进入垂直切片实现前。
> 本文记录 active change、Comet phase、YSS skill 最小集合、测试策略和回滚点，不替代垂直切片 Issue 或实施计划。

## 1. 输入材料

| 资产 | 路径 / 链接 | 状态 | 备注 |
|------|-------------|------|------|
| 垂直切片 Issue |  |  |  |
| OpenAPI Freeze / 无 API 影响记录 |  |  |  |
| Design Review |  |  |  |
| OpenSpec / Comet change |  |  |  |
| `.comet.yaml` |  |  |  |

## 2. Comet / OpenSpec 状态

| 检查项 | 结果 | 备注 |
|--------|------|------|
| active change |  |  |
| `proposal.md` | 存在 / 缺失 |  |
| `design.md` | 存在 / 缺失 |  |
| `tasks.md` | 存在 / 缺失 |  |
| `specs/**/spec.md` | 存在 / 缺失 |  |
| `.comet.yaml` phase | open / design / build / verify / archive |  |
| build-ready | 是 / 否 |  |

## 3. YSS skill 最小集合

| 领域 | skill | 使用原因 | 是否必需 |
|------|-------|----------|----------|
| 前端 |  |  | 是 / 否 |
| 后端 |  |  | 是 / 否 |
| API / 契约 |  |  | 是 / 否 |
| 测试 / 验证 |  |  | 是 / 否 |

## 4. TDD 与验证策略

| 层级 | 先失败测试 / 验证命令 | 通过标准 |
|------|------------------------|----------|
| Domain / Application |  |  |
| API / 契约 |  |  |
| 前端组件 |  |  |
| E2E / 关键路径 |  |  |

## 5. 回滚点与风险

| 风险 | 回滚点 | 观察信号 | 负责人 |
|------|--------|----------|--------|
|  |  |  |  |

## 6. 完成标准

- [ ] active Comet / OpenSpec change 完整，且 phase 可进入 build。
- [ ] YSS skills 已最小化选择，没有绕过 Comet。
- [ ] 每个切片包含测试命令、验证方式和回滚点。
- [ ] 触碰安全红线的项已标记 `TODO-HUMAN-REVIEW`。

## 7. 下一步门禁

- 结论：Approved / Blocked
- 下一步：TDD 实现 / 回到 Comet design / 回到垂直切片
- 阻断项：
