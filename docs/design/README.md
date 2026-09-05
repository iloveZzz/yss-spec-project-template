# 产品设计资产

本目录保存产品页面、用户流、原型、交互说明和状态矩阵等设计资产。

设计系统基线：

- `DESIGN.md`：机器可读的视觉 token 与组件变体规范源，按 Google `design.md` alpha 格式维护。
- `docs/design/design-system-sync.yaml`：主模板与可独立分发的战略设计模板之间的共享章节版本与 SHA-256 同步摘要。
- `docs/design/design.md`：YSS 设计治理、双轨运行时、生命周期和验证说明；不与规范源重复定义 token。
- `docs/design/tokens/`：随仓库保存的主题、亮色 / 暗色 / 紧凑 token 和 CSS 变量快照，后续实现不得依赖本机 Downloads 目录或原始 Less。
- 默认工作界面密度：`theme.json` 的 seed 叠加一次 compact algorithm，计算结果以 `tokens.compact.json` 和根 `DESIGN.md` 组件变体为准；暗色紧凑模式组合 dark 与 compact algorithm，禁止重复压缩。

模板源维护工具（仅在 `template-source` 仓库执行）：

```bash
node .template-source/tooling/node/scripts/design-md.mjs lint DESIGN.md
node .template-source/tooling/node/scripts/design-md.mjs drift
```

Token 或组件视觉变体变更必须先修改 `DESIGN.md`，再更新派生快照；治理说明不得复制具体值。业务状态、API、权限和交互验收继续使用 Spec、交互说明及状态矩阵。

产品原型由 `yss-prototype-stage` 持有阶段合同：先评审低保真/状态矩阵，再选择 H1 视觉或 H2 流程，并按需调用 `product-design:index` focused workflow。YSS 生命周期负责校验档位选择、Prototype Evidence schema v4、Visual Baseline schema v1、统一 Design QA、用户确认和 Spec / OpenAPI 回填。原型阶段不得调用生产实现技能 `yss-ui`。

进入 Spec 初稿 / 需求基线流程后，必须先沉淀产品总体设计 / 功能架构，再进入页面 / 原型 / 交互设计、Spec 校准、API 影响分析 / 契约草案或实现。产品总体设计文档必须包含低保真原型 / 页面草图，用于验证页面结构、关键操作和主流程。无 UI 的功能也需要产品总体设计 / 功能架构来说明功能域、业务对象、模块边界、API / 数据影响和不适用的页面状态；只有不进入 Spec 生命周期的小改动可在影响面评估中记录不适用原因。

进入 API 影响分析 / 契约草案前，有用户界面的功能还必须沉淀：

- 页面清单和信息架构。
- 用户主路径和异常路径。
- 低保真线框图，或 Figma / 即时设计 / Axure 等原型工具链接。
- 流程图、泳道图、页面地图、状态流或架构辅助图。
- 表单、表格、弹窗、抽屉、步骤流等交互说明。
- loading、empty、error、readonly、disabled、no-permission、conflict 等状态矩阵。
- 页面字段、筛选条件、操作按钮和权限规则。
- 原型交付物默认路径为 `docs/.scratch/<feature>/design/prototypes/index.html`，也可为稳定 URL。H1 无 Node/AntD 依赖；H2 默认使用 Vue/Vite + Antdv Next，React/Vite + AntD 只作为显式兼容路线。真实 Vue 3 + YSS UI/AntDV 组件只在批准后的前端实现和实现还原验证中使用。产出后必须记录 Prototype Evidence schema v4、Visual Baseline schema v1、根 `DESIGN.md` digest 与 Token digest，并获得用户确认。

这些资产用于反推 API 影响、契约草案、OpenAPI 请求 / 响应字段、错误结构、分页筛选、权限状态和前端验收标准。

推荐模板：

- `docs/design/templates/product-overview-design-template.md`：Spec 初稿之后、页面 / 原型 / 交互设计之前，用于团队评审产品总体设计、功能架构、低保真原型、页面/API/数据影响和 Spec 回填项；它是后续交互设计输入，不替代详细交互说明。
- `docs/design/templates/interaction-spec-template.md`：页面、流程、交互、Spec 回填项和 OpenAPI 反推清单。
- `docs/design/templates/state-matrix-template.md`：loading、empty、error、readonly、no-permission、conflict 等状态。
- `docs/design/templates/prototype-review-checklist.md`：进入 Spec 校准 / API 影响分析 / 契约草案前的原型评审门禁。
- `docs/design/templates/prototype-confirmation-template.md`：原型交付物验证后的用户确认记录。
- `docs/design/templates/prototype-evidence-template.yaml`：Prototype Evidence schema v4 原型档位、浏览器、统一 Design QA、Visual Baseline 引用、条件组件事实、评审和确认的机器可读证据清单。
- `docs/design/templates/visual-baseline-template.yaml`：Visual Baseline schema v1 页面语义、视口、状态、图片、mask、来源和采集环境的可移植清单。

推荐技能：

- `yss-design-system`：项目设计系统与 Ant Design 企业级 UI 风格基线；页面设计、原型评审、UI 实现和主题 token 落地时默认先引用。Codex `$design-qa` 的 token / 字体对照读该技能的 `references/design-qa-theme.md`，以项目覆盖为准，不改上游 `design-qa` 插件。
- `yss-prototype-stage`：跨 Agent 的原型阶段主合同，固定资产、证据、设计优先级与生命周期回流；其 `references/product-design-adapter.md` 把 Codex `product-design:index` 通用产出接入 YSS 双轨版本、项目主题和证据合同。
- `product-design:index`：Codex 产品原型产出的主路由；根据输入是否有 URL、截图、Figma、代码目标或视觉方向，进入 `$get-context`、`$ideate`、`$prototype`、`$image-to-code`、`$url-to-code`、`$share` 或 `$design-qa` 等 focused skill。
- Product Design focused skills：按 H1/H2 的问题边界产出视觉或流程设计资产；ideation 只在新/不确定视觉方向时强制。
- `yss-antdv-next-design`：用于默认 H2 Vue/Antdv Next 原型的精确版本事实；不替换生产 `yss-ui` 路线。
- `yss-antd-design`：仅用于显式 H2 React/AntD 兼容原型的版本事实或 fact pack 增量更新；H1 不适用。
- `prototype-review`：原型阶段评审门禁；未通过则不要进入 Spec 校准 / API 影响分析 / 契约草案。
- 兼容入口：`product-design-prototype`、`high-fidelity-html-prototype` 只读迁移；新资产统一使用 `artifact.prototype-deliverable`、`yss-prototype-stage`、Prototype Evidence schema v4 与 Visual Baseline schema v1。

推荐目录：

```text
docs/.scratch/<feature>/design/diagrams/
docs/.scratch/<feature>/design/prototypes/
docs/.scratch/<feature>/architecture/diagrams/
docs/.scratch/<feature>/discovery/diagrams/
```
