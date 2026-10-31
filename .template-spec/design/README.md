# 产品设计资产

本目录保存产品页面、用户流、原型、交互说明和状态矩阵等设计资产。

设计系统基线：

- `DESIGN.md`：机器可读的视觉 token 与组件变体规范源，按 Google `design.md` alpha 格式维护。
- `.template-source/design/design-system-sync.yaml`：主模板与可独立分发的战略设计模板之间的共享章节版本与 SHA-256 同步摘要。
- `.template-spec/design/design.md`：YSS 设计治理、生命周期和验证说明；不与规范源重复定义 token。
- `.template-spec/design/tokens/`：随仓库保存的主题、亮色 / 暗色 / 紧凑 token 和 CSS 变量快照，后续实现不得依赖本机 Downloads 目录或原始 Less。
- 新原型可按根 `DESIGN.md` 的命名变体选择桌面、窄屏与 comfortable；生产主题由目标项目的设计规范和组件库确定。暗色仅保留历史快照入口，未完成当前规范验证。
- `.template-source/design/preview.html`：模板维护仓内的主题与组件状态展示（不随产品实例分发），支持密度切换和本地演示；原型技能另提供可运行组件展示及五类页面模式。

Token 或组件视觉变体变更必须先修改 `DESIGN.md`，再更新派生快照；治理说明不得复制具体值。业务状态、API、权限和交互验收继续使用 Spec、交互说明及状态矩阵。

已核验 `matt-spec-v1` 的新 Spec 由 `yss-product-lifecycle` 按未解决的问题选择表达，必要时调用 `yss-prototype-stage` 和 `yss-design-system`；不因存在 UI 强制低保真、H1/H2 或完整原型。检查按实际产物和风险裁剪，技术与 API 交给下游。

以下资产、步骤和证据要求适用于采用对应历史产品设计合同的工作；已有合同继续按原政策核验，不作为新 Spec 的通用前提。历史原型由 `yss-prototype-stage` 持有阶段合同：先评审低保真/状态矩阵，再选择 H1 视觉或 H2 流程，并按需调用可用的 `product-design:index` focused workflow。YSS 生命周期负责校验档位选择、Prototype Evidence schema v4、Visual Baseline schema v1、统一 Design QA、用户确认和 Spec / OpenAPI 回填。原型阶段不得调用生产组件库；前端实现由独立的前端规格与 CLI 维护。

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

技能导航：

- `yss-design-system`：需要视觉一致性时读取项目基线；按 `references/design-review.md` 选择适用评议，可用且适用时用 Codex `$design-qa` 辅助，以项目覆盖为准。
- `yss-prototype-stage`：新 Spec 按问题选择必要的设计表达与检查；历史合同的原型适配、资产与证据见其 `references/product-design-adapter.md`。
- `product-design:index` 与其 focused skills：可用且满足当前交付边界时按需使用；历史合同中的 H1/H2、ideation 和检查要求继续按原政策执行。不可用时使用 `yss-prototype-stage` 的适用方法并记录未验证项；关键问题无法验证时明确阻断，历史合同要求的工具或证据缺失时保留缺口。
- `prototype-review`：按实际产物复核；历史合同要求的原型阶段评审继续适用。
- 历史兼容入口：`product-design-prototype`、`high-fidelity-html-prototype` 只读迁移；原合同资产使用 `artifact.prototype-deliverable`、Prototype Evidence schema v4 与 Visual Baseline schema v1。历史 Provider 证据保持只读。

推荐目录：

```text
.work/<feature>/design/diagrams/
.work/<feature>/design/prototypes/
.work/<feature>/architecture/diagrams/
.work/<feature>/plan/diagrams/
```

## 企业工作区原型

新企业页面使用原型技能的 `references/enterprise-workspace.md`；五类 Vue 模式、统一多页工作区和组件状态页由 export-vue-patterns.mjs 导出。密度与应用壳尺寸以根 DESIGN 为准。构建、模型单测与浏览器/人工离线验收分别记录，不能相互替代。
