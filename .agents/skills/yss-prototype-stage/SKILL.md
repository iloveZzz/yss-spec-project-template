---
name: yss-prototype-stage
description: Use when a YSS feature has product-design impact on a primary flow, navigation, state, recovery, permission experience, or UI-driven API contract and needs prototype assets before implementation readiness.
---

# YSS Prototype Stage

把产品设计影响收敛为跨 Agent 一致的产物、证据和生命周期回流合同。它不替代 `yss-product-lifecycle` 的门禁裁决，也不把原型当作生产前端代码。

## 进入条件与主入口

- 先由 `yss-product-lifecycle` 判断产品设计影响；无行为变化的孤立视觉修复记录 `not-applicable`，不创建空资产。
- Codex 的产出主入口是 `product-design:index`；其他 Agent 使用等价的产品设计能力，但必须产出本技能规定的相同资产和证据。能力或证据不能等价时，暂停并回到人工确认。
- `product-design-prototype`、`high-fidelity-html-prototype` 仅为兼容入口；从它们进入时立即回到本合同。已退休的原型技能不得继续路由。

## 资产与门禁顺序

1. 以 Spec、产品总体设计和 `docs/design/design.md` 形成交互说明、低保真页面/流程与状态矩阵。
2. 用 `prototype-review` 形成独立评审结论；未通过不得生成高保真或进入需求冻结。
3. 通过 `product-design:index` 产出 `docs/.scratch/<feature>/design/prototypes/index.html`。
4. 写入 `docs/.scratch/<feature>/verification/prototype-evidence.yaml`，完成 AntD CLI 与浏览器验证。
5. 用户确认后，才可校准 Spec、分析 API 影响或进入 Router readiness。

## 设计与 AntD 依据

优先级固定为：官方 `design.md` 的上游默认 → `docs/design/design.md` 与项目 token 的 `project_design` 项目覆盖 → 当前功能的语义组件映射。不得用上游默认覆盖项目 token。

使用官方 `antd` skill / CLI 查询事实，始终用 `--format json`，并记录实际 `antd`、CLI 和目标组件版本。至少保存 `antd design.md`、已选组件的 `info`/`demo`/`token`/`semantic` 查询和 `antd lint` 结果；目标版本存在时，将同一 `<target_antd_version>` 传给版本敏感查询，禁止在模板中固化某个 CLI 或组件版本。

## 验证与回流

`browser_verification` 至少覆盖非空渲染、主流程、一个失败/权限/冲突状态、桌面与窄屏视口和控制台错误；优先使用 Browser 或可执行浏览器自动化，Computer Use 只作人工交互补充。把路径、命令、版本、视口、结果和阻塞项写入证据清单。

`gate.prototype-reviewed` 的证据是评审记录；`gate.prototype-verified` 的证据是 AntD CLI 与浏览器验证；`gate.user-confirmation` 的证据是确认记录。三者均不是实现授权。

## 常见错误

- 仅有截图或 HTML，却没有可复现的 CLI、浏览器和确认记录。
- 把 `product-design:index` 或某个旧技能当作生命周期批准者。
- 直接复制官方默认颜色、圆角或间距，忽略项目覆盖。
