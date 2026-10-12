# <功能名称> 原型评审清单

> 适用时机：配合 `prototype-review` 使用。评审采用 记录阻塞原因：有阻断项时必须回到产品设计阶段；产品原型产出以 `product-design:index` 路由到 Product Design focused skill 为主；低保真评审通过后必须产出高保真 HTML 原型，可由系统 / Agent 自动产出；产出后必须获得用户确认，确认前不能直接进入 Spec 校准或 API 影响分析 / 契约草案。

## 评审输入

| 输入 | 路径 / 链接 | 是否具备 |
|---|---|---|
| Spec | `.work/<feature>/spec.md` |  |
| 交互说明 | `.work/<feature>/design/<feature>-interaction-spec.md` |  |
| 原型 / 线框图 | `<链接或导出图片路径>` |  |
| 状态矩阵 | `.work/<feature>/design/<feature>-state-matrix.md` |  |
| 视觉规范与主题快照 | 根 `DESIGN.md`、`.template-spec/design/design.md`、实际消费的 Token 快照 | 默认 Data Quality 浅色；显式暗色 / 紧凑模式注明选择依据 |
| 原型阶段合同 / Product Design 路由记录 | `yss-prototype-stage`；规范直出或条件独立视觉稿路线 |  |
| 原型验证清单 | `.work/<feature>/verification/prototype-evidence.yaml` | 高保真完成后补齐 CLI 与浏览器验证 |
| 现有 API 草案 | `.work/<feature>/api/<feature>.yaml` | 可选 |

## 门禁清单

| 门禁项 | 是否通过 | 发现的问题 |
|---|---|---|
| 页面地图覆盖所有入口、出口和主要页面 |  |  |
| 主流程从开始到完成是清楚的 |  |  |
| 异常流程覆盖取消、重试、校验失败、权限失败和并发冲突 |  |  |
| 状态矩阵覆盖 loading、empty、error、no-permission、readonly、disabled、conflict、dirty-form |  |  |
| 可见字段、筛选、排序、分页、表单、抽屉、弹窗和操作按钮已列出 |  |  |
| 权限行为能区分隐藏、禁用和调用后拒绝 |  |  |
| 校验错误能区分模型级和字段级展示位置 |  |  |
| 能从界面需求反推出 API 影响和契约草案 |  |  |
| 高保真 HTML 原型已按 `yss-prototype-stage` 通过 `product-design:index` 路由产出，或记录等价 Agent 适配及例外原因 |  |  |
| 高保真证据的 `design_baseline` 绑定当前规范与 Token 摘要，视觉基线的 `cases[].theme` 与实际截图一致 |  |  |
| 前端验收、组件状态和数据依赖已明确 |  |  |
| 风险 / 回滚约束和人工确认项已记录 |  |  |

## Spec 校准就绪度

| 范围 | 是否就绪 | 说明 |
|---|---|---|
| 原型新增的验收标准 |  |  |
| 流程 / 状态设计发现的需求缺口 |  |  |
| 原型证明需要排除的非目标 |  |  |
| 待确认决策已排除在冻结范围外 |  |  |
| Spec 中已补充设计资产链接 |  |  |

## API 影响分析 / 契约草案就绪度

| 范围 | 是否就绪 | 说明 |
|---|---|---|
| 路径 / 操作 |  |  |
| 请求字段 |  |  |
| 响应字段 |  |  |
| 分页 / 筛选 / 排序 |  |  |
| 错误包装 |  |  |
| 字段级校验错误 |  |  |
| 权限 / 能力标识 |  |  |
| 冲突 / 版本 token |  |  |

## 评审结论

```text
结论：通过 / 阻断
生命周期门禁：`gate.prototype-reviewed` 通过 / 不通过
阻断项：
- 
非阻断建议：
- 
下一步：
- product-design:index 路由高保真 HTML 原型产出 / 回到 Product Design focused skill 补齐原型 / 进入用户确认
```

## 条件比较与内容复核

- 必需内容能定位到区域，优先级有用户任务依据；检查长中文、空值和主动作结果。来源/权限/actionKey 仍引用交互说明及状态矩阵。
- 信息架构或交互不确定时，候选比较在本次评审之前完成：同输入、同保真、实质差异轴、事前标准、选择代价与落选理由均可定位。未命中时核验不适用理由。
- 分别记录行为缺陷、视觉观察和非阻断偏好；后续视觉候选改变行为时重审受影响部分，不自动沿用结论。
