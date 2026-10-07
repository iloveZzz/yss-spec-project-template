# 产品设计资产

本目录保存产品页面、用户流、原型、交互说明和状态矩阵等设计资产。

设计系统基线：

- `DESIGN.md`：机器可读的视觉 token 与组件变体规范源，按 Google `design.md` alpha 格式维护。
- `.template-source/design/design-system-sync.yaml`：主模板与可独立分发的战略设计模板之间的共享章节版本与 SHA-256 同步摘要。
- `.template-spec/design/design.md`：YSS 设计治理、双轨运行时、生命周期和验证说明；不与规范源重复定义 token。
- `.template-spec/design/tokens/`：随仓库保存的主题、亮色 / 暗色 / 紧凑 token 和 CSS 变量快照，后续实现不得依赖本机 Downloads 目录或原始 Less。
- 新原型默认浅色 compact，按根 `DESIGN.md` 的命名变体选择桌面、窄屏与 comfortable；生产默认主题及可选 compact 算法与原型密度分别管理。暗色仅保留历史快照入口，未完成当前规范验证。
- `.template-source/design/preview.html`：模板维护仓内的主题与组件状态展示（不随产品实例分发），支持密度切换和本地演示；原型技能另提供可运行组件展示及五类页面模式。

Token 或组件视觉变体变更必须先修改 `DESIGN.md`，再更新派生快照；治理说明不得复制具体值。业务状态、API、权限和交互验收继续使用 Spec、交互说明及状态矩阵。

产品原型由 `yss-prototype-stage` 持有阶段合同：先评审低保真/状态矩阵，再选择 H1 视觉或 H2 流程，并按需调用 `product-design:index` focused workflow。YSS 生命周期负责校验档位选择、Prototype Evidence schema v4、Visual Baseline schema v1、统一 Design QA、用户确认和 Spec / OpenAPI 回填。原型阶段不得调用生产实现技能 `yss-ui`。

进入 Spec 初稿 / 需求基线流程后，先沉淀产品总体设计 / 功能架构，再进入页面 / 原型 / 交互设计、Spec 校准、API 影响分析 / 契约草案或实现。有 UI 影响时，产品总体设计记录早期页面 / 流程草图与待验证问题；正式低保真原型属于产品设计阶段。无 UI 的功能仍需说明功能域、业务对象、模块边界及 API / 数据影响，并记录页面草图不适用的依据；不生成空原型。

进入 API 影响分析 / 契约草案前，有用户界面的功能还必须沉淀：

- 页面清单和信息架构。
- 用户主路径和异常路径。
- 低保真线框图，或 Figma / 即时设计 / Axure 等原型工具链接。
- 流程图、泳道图、页面地图、状态流或架构辅助图。
- 表单、表格、弹窗、抽屉、步骤流等交互说明。
- loading、empty、error、readonly、disabled、no-permission、conflict 等状态矩阵。
- 页面字段、筛选条件、操作按钮和权限规则。
- 原型交付物默认路径为 `.work/<feature>/design/prototypes/index.html`，交付为离线资源包。高保真 H1/H2 优先采用 shadcn-vue + Vue 3 预构建，React 作者库已移除，旧包仅历史只读，轻量局部修改可用原生 HTML，接收者无需 Node。React AntD 原型生成路线已退役，历史证据只读。真实 Vue 3 + YSS UI/AntDV 组件只在批准后的前端实现和实现还原验证中使用。产出后必须记录 Prototype Evidence schema v4、Visual Baseline schema v1、根 `DESIGN.md` digest 与 Token digest，并获得用户确认。

这些资产用于反推 API 影响、契约草案、OpenAPI 请求 / 响应字段、错误结构、分页筛选、权限状态和前端验收标准。

推荐模板：

- `.template-spec/design/templates/product-overview-design-template.md`：Spec 初稿之后、产品设计之前，用于评审功能架构、早期页面 / 流程草图、影响面和 Spec 回填项；正式低保真原型在产品设计阶段完成。
- `.template-spec/design/templates/interaction-spec-template.md`：页面、流程、交互、Spec 回填项和 OpenAPI 反推清单。
- `.template-spec/design/templates/state-matrix-template.md`：loading、empty、error、readonly、no-permission、conflict 等状态。
- `.template-spec/design/templates/examples/`：已填示例仅说明填写方式，不构成项目需求或批准结论。
- `.template-spec/design/templates/prototype-review-checklist.md`：进入 Spec 校准 / API 影响分析 / 契约草案前的原型评审门禁。
- `.template-spec/design/templates/prototype-confirmation-template.md`：原型交付物验证后的用户确认记录。
- `.template-spec/design/templates/prototype-evidence-template.yaml`：Prototype Evidence schema v4 原型档位、浏览器、统一 Design QA、Visual Baseline 引用、条件组件事实、评审和确认的机器可读证据清单。
- `.template-spec/design/templates/visual-baseline-template.yaml`：Visual Baseline schema v1 页面语义、视口、状态、图片、mask、来源和采集环境的可移植清单。

推荐技能：

- `yss-design-system`：项目设计系统与 Ant Design 企业级 UI 风格基线；页面设计、原型评审、UI 实现和主题 token 落地时默认先引用。Codex `$design-qa` 的 token / 字体对照读该技能的 `references/design-qa-theme.md`，以项目覆盖为准，不改上游 `design-qa` 插件。
- `yss-prototype-stage`：跨 Agent 的原型阶段主合同，固定资产、证据、设计优先级与生命周期回流；其 `references/product-design-adapter.md` 把 Codex `product-design:index` 通用产出接入 YSS 双轨版本、项目主题和证据合同。
- `product-design:index`：Codex 产品原型产出的主路由；根据输入是否有 URL、截图、Figma、代码目标或视觉方向，进入 `$get-context`、`$ideate`、`$prototype`、`$image-to-code`、`$url-to-code`、`$share` 或 `$design-qa` 等 focused skill。
- Product Design focused skills：按 H1/H2 的问题边界产出视觉或流程设计资产；ideation 只在新/不确定视觉方向时强制。
当前原型使用 `yss-prototype-stage` 的离线 HTML 适配器；历史 Provider 证据保持只读。
- `prototype-review`：原型阶段评审门禁；未通过则不要进入 Spec 校准 / API 影响分析 / 契约草案。
- 兼容入口：`product-design-prototype`、`high-fidelity-html-prototype` 只读迁移；新资产统一使用 `artifact.prototype-deliverable`、`yss-prototype-stage`、Prototype Evidence schema v4 与 Visual Baseline schema v1。

推荐目录：

```text
.work/<feature>/design/diagrams/
.work/<feature>/design/prototypes/
.work/<feature>/architecture/diagrams/
.work/<feature>/plan/diagrams/
```

## 企业工作区原型

新企业页面使用原型技能的 `references/enterprise-workspace.md`；五类 Vue 模式、统一多页工作区和组件状态页由 export-vue-patterns.mjs 导出。密度与应用壳尺寸以根 DESIGN 为准。构建、模型单测与浏览器/人工离线验收分别记录，不能相互替代。
