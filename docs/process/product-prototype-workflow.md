# 产品原型工作流

本文定义 YSS Harness 中有 UI 功能的最小产品原型链路。目标是用 `grill-with-docs` 问清需求，用 `product-design:index` 统一原型产出入口，用 `antd` CLI 固化 Ant Design v6 事实校验，并由 YSS 生命周期负责评审、用户确认和 PRD / OpenAPI 回填。

## 适用范围

- 新产品、新模块或较大 UI 功能。
- 影响主流程、权限状态、异常状态、页面导航或 OpenAPI 反推清单的 UI 变更。
- 已进入 PRD 初稿 / 需求基线流程，且存在用户界面的功能。

小文案、局部样式、配置微调或不进入 PRD 生命周期的低风险变更，可在影响面评估中说明不适用。

## 标准链路

```text
grill-with-docs
-> PRD / 产品总体设计
-> yss-design-system
-> product-design:index
-> Product Design focused skills
-> antd CLI 校验
-> prototype-review
-> 用户确认
-> PRD 校准 / OpenAPI Draft
```

## 职责边界

| 环节 | 主入口 | 职责 |
|---|---|---|
| 需求质询 | `grill-with-docs` | 澄清用户、痛点、边界、反例、验收标准和领域术语 |
| 设计系统基线 | `yss-design-system` | 固定 YSS / Ant Design 企业级设计风格、token 和组件使用约束 |
| 原型路由 | `product-design:index` | 根据输入路由到 Product Design focused skill；不直接承担产出 |
| 原型产出 | `$get-context` / `$ideate` / `$prototype` / `$image-to-code` / `$url-to-code` | 产出低保真 / 高保真页面、交互说明、可演示原型和可分享资产 |
| AntD 事实校验 | `antd` CLI | 查询 Ant Design v6 设计语言、组件 API、demo、token 和 semantic 信息 |
| 阶段评审 | `prototype-review` | Fail-closed 评审页面流、状态矩阵、权限、异常、OpenAPI 反推和验收标准 |
| 用户确认 | `docs/design/templates/prototype-confirmation-template.md` | 记录高保真 HTML 原型是否被用户确认，并决定能否进入 PRD 校准 / OpenAPI Draft |

## 产物要求

有 UI 的功能至少沉淀：

- PRD 初稿：`docs/requirements/<feature>-prd.md`
- 产品总体设计 / 功能架构：`docs/design/<feature>-product-overview-design.md`
- 交互说明：`docs/design/<feature>-interaction-spec.md`
- 状态矩阵：`docs/design/<feature>-state-matrix.md`
- 原型评审：`docs/design/<feature>-prototype-review.md`
- 高保真 HTML 原型：`docs/design/prototypes/<feature>/index.html`
- 用户确认记录：`docs/design/<feature>-prototype-confirmation.md`

高保真 HTML 原型必须使用 Ant Design v6。系统 / Agent 可以自动产出，但产出后必须获得用户确认并记录确认结果；未确认前不得进入 PRD 校准、需求冻结或 UI 驱动 OpenAPI Draft。

## AntD CLI 门禁

原型产出前，必须按涉及组件查询 Ant Design v6 事实，不得凭记忆写组件 API：

```bash
antd design.md --version 6.0.0 --format json
antd info <Component> --version 6.0.0 --format json
antd demo <Component> <demo> --version 6.0.0 --format json
antd token <Component> --version 6.0.0 --format json
antd semantic <Component> --version 6.0.0 --format json
```

原型产出后，必须记录：

- 查询过的组件和命令。
- 采用的 demo / token / semantic 结论。
- `antd lint <prototype path> --format json` 的结果；若原型目录不支持 lint，记录不适用原因和替代人工校验。

## 回退规则

- 需求边界不清：回到 `grill-with-docs`。
- 缺产品总体设计 / 功能架构：回到 `docs/design/<feature>-product-overview-design.md`。
- 没有视觉目标且需要新 UI：按 Product Design 规则先走 `$get-context`，再走 `$ideate`，展示 3 个视觉方向并等待用户选择。
- 原型评审阻断：回到 Product Design focused skill 补齐页面流、状态矩阵、权限或异常路径。
- 用户未确认：不得进入 PRD 校准 / OpenAPI Draft。
- 存在高风险变更：记录人工确认项，不得省略验证证据。

## 兼容策略

`product-design-prototype`、`wireframe-prototype`、`high-fidelity-html-prototype` 暂不物理删除，只作为历史兼容入口或产物门禁名称保留。新的产品原型产出默认使用 `product-design:index`。跑通 2 到 3 个真实 UI 功能后，再评估是否删除 legacy 技能。
