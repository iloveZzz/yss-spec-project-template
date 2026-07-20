# <功能名称> 高保真原型确认记录

> 适用时机：Ant Design v6 高保真 HTML 原型产出后、Spec 校准 / 需求冻结 / UI 驱动 OpenAPI Draft 前。未确认前不得进入下游门禁。

## 1. 原型信息

| 项目 | 内容 |
|---|---|
| 功能名称 |  |
| Spec | `docs/requirements/<feature>-spec.md` |
| 产品总体设计 / 功能架构 | `docs/design/<feature>-product-overview-design.md` |
| 交互说明 | `docs/design/<feature>-interaction-spec.md` |
| 状态矩阵 | `docs/design/<feature>-state-matrix.md` |
| 原型评审 | `docs/design/<feature>-prototype-review.md` |
| 高保真 HTML 原型 | `docs/design/prototypes/<feature>/index.html` |
| Product Design 路由 | `product-design:index -> <focused skill>` |
| 产出方式 | 系统 / Agent 自动产出 / 人工补充 |
| Ant Design 版本 | v6 |

## 2. AntD CLI 校验证据

| 校验项 | 命令 / 记录路径 | 结论 |
|---|---|---|
| 设计语言 | `antd design.md --version 6.0.0 --format json` |  |
| 组件 API | `antd info <Component> --version 6.0.0 --format json` |  |
| 组件 demo | `antd demo <Component> <demo> --version 6.0.0 --format json` |  |
| 组件 token | `antd token <Component> --version 6.0.0 --format json` |  |
| semantic | `antd semantic <Component> --version 6.0.0 --format json` |  |
| lint / 替代校验 | `antd lint <prototype path> --format json` |  |

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
