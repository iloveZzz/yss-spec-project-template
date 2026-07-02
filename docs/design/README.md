# 产品设计资产

本目录保存产品页面、用户流、原型、交互说明和状态矩阵等设计资产。

进入 OpenAPI Draft 前，有用户界面的功能建议先沉淀：

- 页面清单和信息架构。
- 用户主路径和异常路径。
- 低保真线框图，或 Figma / 即时设计 / Axure 等原型工具链接。
- Excalidraw 流程图、泳道图、页面地图、状态流或架构辅助图。
- 表单、表格、弹窗、抽屉、步骤流等交互说明。
- loading、empty、error、readonly、disabled、no-permission、conflict 等状态矩阵。
- 页面字段、筛选条件、操作按钮和权限规则。

这些资产用于反推 OpenAPI 请求 / 响应字段、错误结构、分页筛选、权限状态和前端验收标准。

推荐模板：

- `docs/design/templates/product-overview-design-template.md`：PRD 初稿之后、页面 / 原型 / 交互设计之前，用于团队评审产品总体设计、功能架构、页面/API/数据影响和 PRD 回填项；它是原型设计输入，不是交互说明本身。
- `docs/design/templates/interaction-spec-template.md`：页面、流程、交互、PRD 回填项和 OpenAPI 反推清单。
- `docs/design/templates/state-matrix-template.md`：loading、empty、error、readonly、no-permission、conflict 等状态。
- `docs/design/templates/prototype-review-checklist.md`：进入 PRD 校准 / OpenAPI Draft 前的原型评审门禁。

推荐技能：

- `product-design-prototype`：基于 PRD 初稿和产品总体设计 / 功能架构，产出页面 / 原型 / 交互设计资产。
- `wireframe-prototype`：低保真线框、Excalidraw、Figma、Penpot、tldraw、Axure 等原型链接沉淀。
- `component-story-prototype`：Storybook / Histoire 工程态状态原型。
- `mock-api-prototype`：MSW / mock fixtures 支撑未冻结 API 前的交互验证。
- `prototype-review`：原型阶段评审门禁；未通过则不要进入 PRD 校准 / OpenAPI Draft。
- `excalidraw-diagram-generator`：根据已形成的 Discovery、PRD、OpenAPI Draft、Architecture 或 Comet design 生成 `.excalidraw` 图；用于说明和审查，不替代文本规格。

推荐目录：

```text
docs/design/diagrams/
docs/architecture/diagrams/
docs/discovery/diagrams/
```
