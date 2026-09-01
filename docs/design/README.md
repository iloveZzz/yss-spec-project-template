# 产品设计资产

本目录保存产品页面、用户流、原型、交互说明和状态矩阵等设计资产。

设计系统基线：

- `docs/design/design.md`：项目设计系统说明。默认亮色覆盖来自项目 Ant Design 5 `:root` / Less 裁定（主色 `#3371ff`、系统字体、6px 圆角），不再只沿用历史 `Product-Design-System` 包；官方 `design.md` 是上游默认，项目 token 是项目覆盖，优先级以该文件为准。
- `docs/design/tokens/`：随仓库保存的主题、亮色 / 暗色 / 紧凑 token 和 CSS 变量快照，后续实现不得依赖本机 Downloads 目录或原始 Less。

产品原型产出默认以 `product-design:index` 为主入口。该 skill 只负责路由，实际按 Product Design plugin 规则进入 `$get-context`、`$ideate`、`$prototype`、`$image-to-code`、`$url-to-code`、`$share` 或 `$design-qa` 等 focused skill；YSS 生命周期仍负责校验低保真评审、高保真 HTML 原型、AntD CLI 校验证据、用户确认和 Spec / OpenAPI 回填。

进入 Spec 初稿 / 需求基线流程后，必须先沉淀产品总体设计 / 功能架构，再进入页面 / 原型 / 交互设计、Spec 校准、API 影响分析 / 契约草案或实现。产品总体设计文档必须包含低保真原型 / 页面草图，用于验证页面结构、关键操作和主流程。无 UI 的功能也需要产品总体设计 / 功能架构来说明功能域、业务对象、模块边界、API / 数据影响和不适用的页面状态；只有不进入 Spec 生命周期的小改动可在影响面评估中记录不适用原因。

进入 API 影响分析 / 契约草案前，有用户界面的功能还必须沉淀：

- 页面清单和信息架构。
- 用户主路径和异常路径。
- 低保真线框图，或 Figma / 即时设计 / Axure 等原型工具链接。
- 流程图、泳道图、页面地图、状态流或架构辅助图。
- 表单、表格、弹窗、抽屉、步骤流等交互说明。
- loading、empty、error、readonly、disabled、no-permission、conflict 等状态矩阵。
- 页面字段、筛选条件、操作按钮和权限规则。
- 低保真原型评审通过后的 Ant Design v6 主题/视觉标准高保真可交互 HTML 原型，默认路径为 `docs/.scratch/<feature>/design/prototypes/index.html`；标准 React 原型组件精确锁定与 CLI 一致的 `antd@6.x`，通过 YSS Product Design adapter 消费项目 token、pnpm、同视口 QA 和无障碍证据。生产组件/API 仍是 Vue 3 + YSS UI + 实现仓 lockfile 的 Ant Design Vue 4.x。产出后必须记录 schema v2 原型证据并获得用户确认。

这些资产用于反推 API 影响、契约草案、OpenAPI 请求 / 响应字段、错误结构、分页筛选、权限状态和前端验收标准。

推荐模板：

- `docs/design/templates/product-overview-design-template.md`：Spec 初稿之后、页面 / 原型 / 交互设计之前，用于团队评审产品总体设计、功能架构、低保真原型、页面/API/数据影响和 Spec 回填项；它是后续交互设计输入，不替代详细交互说明。
- `docs/design/templates/interaction-spec-template.md`：页面、流程、交互、Spec 回填项和 OpenAPI 反推清单。
- `docs/design/templates/state-matrix-template.md`：loading、empty、error、readonly、no-permission、conflict 等状态。
- `docs/design/templates/prototype-review-checklist.md`：进入 Spec 校准 / API 影响分析 / 契约草案前的原型评审门禁。
- `docs/design/templates/prototype-confirmation-template.md`：高保真 HTML 原型产出后的用户确认记录。
- `docs/design/templates/prototype-evidence-template.yaml`：原型阶段的 AntD CLI、浏览器验证、评审和确认的机器可读证据清单。

推荐技能：

- `yss-design-system`：项目设计系统与 Ant Design 企业级 UI 风格基线；页面设计、原型评审、UI 实现和主题 token 落地时默认先引用。Codex `$design-qa` 的 token / 字体对照读该技能的 `references/design-qa-theme.md`，以项目覆盖为准，不改上游 `design-qa` 插件。
- `yss-prototype-stage`：跨 Agent 的原型阶段主合同，固定资产、证据、设计优先级与生命周期回流；其 `references/product-design-adapter.md` 把 Codex `product-design:index` 通用产出接入 YSS 双轨版本、项目主题和证据合同。
- `product-design:index`：Codex 产品原型产出的主路由；根据输入是否有 URL、截图、Figma、代码目标或视觉方向，进入 `$get-context`、`$ideate`、`$prototype`、`$image-to-code`、`$url-to-code`、`$share` 或 `$design-qa` 等 focused skill。
- Product Design focused skills：基于 Spec 初稿和产品总体设计 / 功能架构，产出低保真 / 高保真页面、原型、交互设计资产和可分享原型；高保真 HTML 原型默认由该路由链路产出。
- `yss-antd-design`：仅用于原型设计构建的 Ant Design v6 事实技能；生成或修改高保真 HTML 原型前后必须留下 CLI 校验证据。前端代码落地改用 `yss-ui`。
- `prototype-review`：原型阶段评审门禁；未通过则不要进入 Spec 校准 / API 影响分析 / 契约草案。
- 兼容入口：`product-design-prototype`、`high-fidelity-html-prototype` 仅作为历史兼容或产物门禁名称保留；新的产品原型产出默认使用 `product-design:index`，已退休技能不再提供兼容路由。

推荐目录：

```text
docs/.scratch/<feature>/design/diagrams/
docs/.scratch/<feature>/design/prototypes/
docs/.scratch/<feature>/architecture/diagrams/
docs/.scratch/<feature>/discovery/diagrams/
```
