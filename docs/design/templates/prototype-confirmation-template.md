# <功能名称> 原型交付物确认记录

> 适用时机：H1/H2 原型交付物验证后、Spec 校准 / 需求冻结 / UI 驱动 OpenAPI Draft 前。用户只确认设计决定、可操作范围与模拟/gap；未确认前不得进入下游门禁。

## 1. 原型信息

| 项目 | 内容 |
|---|---|
| 功能名称 |  |
| Spec | `docs/.scratch/<feature>/spec.md` |
| 产品总体设计 / 功能架构 | `docs/.scratch/<feature>/design/<feature>-product-overview-design.md` |
| 交互说明 | `docs/.scratch/<feature>/design/<feature>-interaction-spec.md` |
| 状态矩阵 | `docs/.scratch/<feature>/design/<feature>-state-matrix.md` |
| 原型评审 | `docs/.scratch/<feature>/design/<feature>-prototype-review.md` |
| 原型档位与交付物 | `<H1/H2>`；`docs/.scratch/<feature>/design/prototypes/index.html` 或稳定 URL |
| 机器可读验证清单 | `docs/.scratch/<feature>/verification/prototype-evidence.yaml` |
| 原型路由 | `yss-prototype-stage -> H1/H2 -> <adapter>` |
| 产出方式 | 系统 / Agent 自动产出 / 人工补充 |

## 2. 用户需要确认的范围

| 项目 | 内容 |
|---|---|---|
| 本原型确认的决定 |  |
| 可操作范围 |  |
| 模拟数据 / 模拟行为 |  |
| 未关闭 gap |  |
| 接受的差异或非目标 |  |

技术栈、CLI、lockfile、digest 和扫描结果由 `prototype-evidence.yaml` 自动或工程验证记录，不要求用户确认。

## 3. 用户确认

| 项目 | 内容 |
|---|---|
| 确认人 |  |
| 确认时间 |  |
| 确认方式 | 口头 / 评论 / Ticket / 会议纪要 / 其他 |
| 确认结论 | 通过 / 需调整 / 暂缓 |
| 是否允许进入 Spec 校准 | 是 / 否 |
| 是否允许进入 API 影响分析 / OpenAPI Draft | 是 / 否 |

## 4. 调整项

| 序号 | 调整内容 | 优先级 | 负责人 | 状态 |
|---|---|---|---|---|
| 1 |  | P0 / P1 / P2 |  |  |

## 5. 结论

```text
确认结论：
允许进入下一阶段：是 / 否
阻断原因：
- 
补充说明：
- 
```
