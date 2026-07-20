# 产品设计资产

本目录保存产品页面、用户流、原型、交互说明和状态矩阵等设计资产。

设计系统基线：

- `docs/design/design.md`：从本地 `Product-Design-System` 引入并整理的 Ant Design 企业级设计系统说明，后续页面设计、交互说明、原型评审和前端实现默认引用该文件。
- `docs/design/tokens/`：随仓库保存的主题、亮色 / 暗色 / 紧凑 token 和 CSS 变量快照，后续实现不得依赖本机 Downloads 目录。

产品原型产出默认以 `product-design:index` 为主入口。该 skill 只负责路由，实际按 Product Design plugin 规则进入 `$get-context`、`$ideate`、`$prototype`、`$image-to-code`、`$url-to-code`、`$share` 或 `$design-qa` 等 focused skill；YSS 生命周期仍负责校验低保真评审、高保真 HTML 原型、AntD CLI 校验证据、用户确认和 Spec / OpenAPI 回填。

进入 Spec 初稿 / 需求基线流程后，必须先沉淀产品总体设计 / 功能架构，再进入页面 / 原型 / 交互设计、Spec 校准、API 影响分析 / 契约草案或实现。产品总体设计文档必须包含低保真原型 / 页面草图，用于验证页面结构、关键操作和主流程。无 UI 的功能也需要产品总体设计 / 功能架构来说明功能域、业务对象、模块边界、API / 数据影响和不适用的页面状态；只有不进入 Spec 生命周期的小改动可在影响面评估中记录不适用原因。

进入 API 影响分析 / 契约草案前，有用户界面的功能还必须沉淀：

- 页面清单和信息架构。
- 用户主路径和异常路径。
- 低保真线框图，或 Figma / 即时设计 / Axure 等原型工具链接。
- Excalidraw 流程图、泳道图、页面地图、状态流或架构辅助图。
- 表单、表格、弹窗、抽屉、步骤流等交互说明。
- loading、empty、error、readonly、disabled、no-permission、conflict 等状态矩阵。
- 页面字段、筛选条件、操作按钮和权限规则。
- 低保真原型评审通过后的 Ant Design v6 高保真可交互 HTML 原型，默认路径为 `docs/design/prototypes/<feature>/index.html`；该产物可由系统 / Agent 自动生成，不要求用户手工提供，产出前必须使用 `antd` CLI 查询设计语言、组件 API、demo、token 和 semantic 信息，产出后必须记录 AntD v6 校验证据并获得用户确认。

这些资产用于反推 API 影响、契约草案、OpenAPI 请求 / 响应字段、错误结构、分页筛选、权限状态和前端验收标准。

推荐模板：

- `docs/design/templates/product-overview-design-template.md`：Spec 初稿之后、页面 / 原型 / 交互设计之前，用于团队评审产品总体设计、功能架构、低保真原型、页面/API/数据影响和 Spec 回填项；它是后续交互设计输入，不替代详细交互说明。
- `docs/design/templates/interaction-spec-template.md`：页面、流程、交互、Spec 回填项和 OpenAPI 反推清单。
- `docs/design/templates/state-matrix-template.md`：loading、empty、error、readonly、no-permission、conflict 等状态。
- `docs/design/templates/prototype-review-checklist.md`：进入 Spec 校准 / API 影响分析 / 契约草案前的原型评审门禁。
- `docs/design/templates/prototype-confirmation-template.md`：高保真 HTML 原型产出后的用户确认记录。

推荐技能：

- `yss-design-system`：项目设计系统与 Ant Design 企业级 UI 风格基线；页面设计、原型评审、UI 实现和主题 token 落地时默认先引用。
- `product-design:index`：产品原型产出的主路由；根据输入是否有 URL、截图、Figma、代码目标或视觉方向，进入 `$get-context`、`$ideate`、`$prototype`、`$image-to-code`、`$url-to-code`、`$share` 或 `$design-qa` 等 focused skill。
- Product Design focused skills：基于 Spec 初稿和产品总体设计 / 功能架构，产出低保真 / 高保真页面、原型、交互设计资产和可分享原型；高保真 HTML 原型默认由该路由链路产出。
- `antd`：Ant Design v6 组件、demo、token、semantic 和 design.md 查询工具；生成或修改高保真 HTML 原型前后必须留下 CLI 校验证据。
- `prototype-review`：原型阶段评审门禁；未通过则不要进入 Spec 校准 / API 影响分析 / 契约草案。
- 兼容入口：`product-design-prototype`、`wireframe-prototype`、`high-fidelity-html-prototype` 仅作为历史兼容或产物门禁名称保留；新的产品原型产出默认使用 `product-design:index`。
- `excalidraw-diagram-generator`：根据已形成的 Discovery、Spec、OpenAPI Draft、Architecture 或 系统 / 数据架构设计 生成 `.excalidraw` 图；用于说明和审查，不替代文本规格。

推荐目录：

```text
docs/design/diagrams/
docs/design/prototypes/
docs/architecture/diagrams/
docs/discovery/diagrams/
```
