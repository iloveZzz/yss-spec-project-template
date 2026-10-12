# 产品设计资产

本目录保存产品页面、用户流、原型、交互说明和状态矩阵等设计资产。

设计系统基线：

- `.template-spec/design/design.md`：项目设计系统说明。默认亮色覆盖来自项目 Ant Design 5 `:root` / Less 裁定（主色 `#3371ff`、系统字体、6px 圆角），不再只沿用历史 `Product-Design-System` 包；官方 `design.md` 是上游默认，项目 token 是项目覆盖，优先级以该文件为准。
- `.template-spec/design/tokens/`：随仓库保存的主题、亮色 / 暗色 / 紧凑 token 和 CSS 变量快照，后续实现不得依赖本机 Downloads 目录或原始 Less。

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
原型由 `yss-prototype-stage` 统一生成离线 HTML；项目视觉规范是根 `DESIGN.md`，实际生产组件仍在实现阶段核验。

这些资产用于反推 API 影响、契约草案、OpenAPI 请求 / 响应字段、错误结构、分页筛选、权限状态和前端验收标准。

推荐模板：

- `.template-spec/design/templates/product-overview-design-template.md`：Spec 初稿之后、页面 / 原型 / 交互设计之前，用于团队评审产品总体设计、功能架构、低保真原型、页面/API/数据影响和 Spec 回填项；它是后续交互设计输入，不替代详细交互说明。
- `.template-spec/design/templates/interaction-spec-template.md`：页面、流程、交互、Spec 回填项和 OpenAPI 反推清单。
- `.template-spec/design/templates/state-matrix-template.md`：loading、empty、error、readonly、no-permission、conflict 等状态。
- `.template-spec/design/templates/prototype-review-checklist.md`：进入 Spec 校准 / API 影响分析 / 契约草案前的原型评审门禁。
- `.template-spec/design/templates/prototype-confirmation-template.md`：高保真 HTML 原型产出后的用户确认记录。
- `.template-spec/design/templates/prototype-evidence-template.yaml`：原型阶段的 AntD CLI、浏览器验证、评审和确认的机器可读证据清单。

推荐技能：

- `yss-design-system`：项目设计系统与 Ant Design 企业级 UI 风格基线；页面设计、原型评审、UI 实现和主题 token 落地时默认先引用。Codex `$design-qa` 的 token / 字体对照读该技能的 `references/design-qa-theme.md`，以项目覆盖为准，不改上游 `design-qa` 插件。
- `yss-prototype-stage`：跨 Agent 的原型阶段合同，固定资产、证据、设计优先级与生命周期回流；Codex 的主路由为 `product-design:index`。
- `product-design:index`：Codex 产品原型产出的主路由；根据输入是否有 URL、截图、Figma、代码目标或视觉方向，进入 `$get-context`、`$ideate`、`$prototype`、`$image-to-code`、`$url-to-code`、`$share` 或 `$design-qa` 等 focused skill。
- Product Design focused skills：基于 Spec 初稿和产品总体设计 / 功能架构，产出低保真 / 高保真页面、原型、交互设计资产和可分享原型；高保真 HTML 原型默认由该路由链路产出。
原型由 `yss-prototype-stage` 统一生成离线 HTML；项目视觉规范是根 `DESIGN.md`，实际生产组件仍在实现阶段核验。
- `prototype-review`：原型阶段评审门禁；未通过则不要进入 Spec 校准 / API 影响分析 / 契约草案。
- 兼容入口：`product-design-prototype`、`high-fidelity-html-prototype` 仅作为历史兼容或产物门禁名称保留；新的产品原型产出默认使用 `product-design:index`，已退休技能不再提供兼容路由。

推荐目录：

```text
.work/<feature>/design/diagrams/
.work/<feature>/design/prototypes/
.work/<feature>/architecture/diagrams/
.work/<feature>/discovery/diagrams/
```
