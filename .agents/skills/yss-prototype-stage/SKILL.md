---
name: yss-prototype-stage
description: Use when a YSS feature has product-design impact on a primary flow, navigation, state, recovery, permission experience, or UI-driven API contract and needs prototype assets before implementation readiness.
---

# YSS Prototype Stage

把产品设计影响收敛为跨 Agent 一致的产物、证据和生命周期回流合同。它不替代 `yss-product-lifecycle` 的门禁裁决，也不把原型当作生产前端代码。

## 进入条件与主入口

- 先由 `yss-product-lifecycle` 判断产品设计影响；无行为变化的孤立视觉修复记录 `not-applicable`，不创建空资产。
- Codex 的产出主入口是 `product-design:index`；其他 Agent 使用等价的产品设计能力，但必须产出本技能规定的相同资产和证据。能力或证据不能等价时，暂停并回到人工确认。
- `high-fidelity-html-prototype` 仅为历史兼容入口；从它进入时立即回到本合同。已退休的原型技能（含 `product-design-prototype`）不得继续路由。

## 资产与门禁顺序

1. 以 Spec、产品总体设计、`yss-design-system` 和 `docs/design/design.md` 形成交互说明、低保真页面/流程与状态矩阵。
2. 用 `prototype-review` 形成独立评审结论；未通过不得生成高保真或进入需求冻结。
3. 用 `yss-antd-design` 固定目标 React `antd@6.x`，先查询 `design.md` 与本功能组件事实。
4. 通过 `product-design:index` 的 `get-context → ideate → 用户选择 → image-to-code → design-qa` 产出 feature 级 React/Vite 原型；必须套用 `references/product-design-adapter.md`，不能把通用 starter 视为已符合 YSS。
5. 完成 AntD post-build manifest/lint（按产物类型）、同视口 Design QA、浏览器与无障碍验证，写入 schema v2 `docs/.scratch/<feature>/verification/prototype-evidence.yaml`。
6. 用户确认后，才可校准 Spec、分析 API 影响或进入 Router readiness。

## 设计与 AntD 依据

优先级固定为：官方 `design.md` 的上游默认 → `docs/design/design.md` 与项目 token 的 `project_design` 项目覆盖 → 当前功能的语义组件映射。不得用上游默认覆盖项目 token。

Codex `$design-qa` 仍走官方对比流程；Colors/tokens 与 Fonts/typography 必须以项目覆盖为 source visual truth。对照清单见 `yss-design-system/references/design-qa-theme.md`。仍用官方 `#1677ff`、强制 `Inter` 或历史 8px 品牌圆角当默认主题，视为项目覆盖漂移。

主题与视觉标准固定为 `ant-design-v6`；生产运行时固定为 Vue 3 + YSS UI + `ant-design-vue-4.x`，精确生产版本来自实现仓 lockfile。版本号不同本身不是冲突。Ant Design v6 事实由 `yss-antd-design` 查询并回写证据，不要并列调用官方 `antd` skill，也不要在前端代码落地时继续使用它。进入实现后改走 `yss-ui`。

标准原型组件存在 Ant Design 实现时必须精确锁定与 CLI 目标一致的 `antd@6.x`，并通过 `ConfigProvider` 消费项目主题 adapter。执行与验证命令见 `references/product-design-adapter.md` 和 `scripts/prototype-contract.mjs`。

## 验证与回流

`browser_verification` 至少覆盖非空渲染、主流程、一个失败/权限/冲突状态、桌面与窄屏视口和控制台错误；`accessibility_verification` 至少覆盖对比度、键盘/焦点、语义标签与 Dialog、200% zoom、reduced motion、目标尺寸和自动化扫描。优先使用 Browser 或可执行浏览器自动化，Computer Use 只作人工交互补充。把路径、命令、版本、视口、结果和阻塞项写入证据清单。

`gate.prototype-reviewed` 的证据是评审记录；`gate.prototype-verified` 的证据是 AntD CLI 与浏览器验证；`gate.user-confirmation` 的证据是确认记录。三者均不是实现授权。

## 常见错误

- 仅有截图或 HTML，却没有可复现的 CLI、浏览器和确认记录。
- 把 `product-design:index` 或某个旧技能当作生命周期批准者。
- 直接复制官方默认颜色、圆角或间距，忽略项目覆盖。
- 只证明查询过 AntD v6，却没有 v6 semantic role → 项目 Token → YSS/AntDV4 的映射证据。
- 沿用 Product Design starter 的 npm、根目录 `design-qa.md` 或未安装 `antd` 的通用配置。
