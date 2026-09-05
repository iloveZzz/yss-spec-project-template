# <功能名称> 原型评审清单

> 适用时机：配合 `prototype-review` 使用。低保真与状态矩阵有阻断项时回产品设计；通过后先提取风险，再按确定性规则选择 H1/H2 原型交付物。产出后仍须用户确认，确认前不能进入 Spec 校准或 API 影响分析。

## 评审输入

| 输入 | 路径 / 链接 | 是否具备 |
|---|---|---|
| Spec | `docs/.scratch/<feature>/spec.md` |  |
| 交互说明 | `docs/.scratch/<feature>/design/<feature>-interaction-spec.md` |  |
| 原型 / 线框图 | `<链接或导出图片路径>` |  |
| 状态矩阵 | `docs/.scratch/<feature>/design/<feature>-state-matrix.md` |  |
| 原型阶段合同 / Product Design 路由记录 | `yss-prototype-stage -> product-design:index -> <focused skill>` |  |
| 原型验证清单 | `docs/.scratch/<feature>/verification/prototype-evidence.yaml` | 档位确定后补齐 schema v4 共同与档位证据，并引用 Visual Baseline Bundle v1 |
| 现有 API 草案 | `docs/.scratch/<feature>/api/<feature>.yaml` | 可选 |

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
| 已列出原型需要回答的决定、风险触发及 H1/H2 推荐档位；无充分证据时回退 H2 |  |  |
| 状态矩阵中的每个状态均有事件、转换、guard、动作和退出路径 |  |  |
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
- yss-prototype-stage 计算档位并进入对应适配器 / 回到产品设计补齐状态与风险 / 进入原型交付物构建
```
