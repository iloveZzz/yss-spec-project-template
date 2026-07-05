# ADR-001: 使用 product-design:index 作为产品原型主入口

## 状态

已接受

## 日期

2026-07-06

## 背景

YSS Harness 需要把有 UI 功能的产品原型产出收敛到一个稳定入口，同时保留需求质询、设计系统、Ant Design v6 事实校验、原型评审和用户确认门禁。原有 `product-design-prototype`、`wireframe-prototype`、`high-fidelity-html-prototype` 容易被理解为并列主入口，导致 Agent 在不同阶段选择不同原型工具，难以保证高保真 HTML 原型、AntD v6 校验证据和用户确认记录一致落地。

## 决策

产品原型产出统一以 `product-design:index` 为主入口。该 skill 只负责路由，实际按 Product Design plugin 规则进入 `$get-context`、`$ideate`、`$prototype`、`$image-to-code`、`$url-to-code`、`$design-qa` 或 `$share` 等 focused skill。

`grill-with-docs` 保留为前置需求质询和领域边界澄清工具，不承担 HTML 原型产出。`antd` skill / `antd` CLI 作为 Ant Design v6 组件、demo、token、semantic 和 design.md 的事实来源。YSS 生命周期继续负责 `prototype-review`、用户确认、PRD 回填和 OpenAPI Draft 门禁。

## 考虑的替代方案

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| 继续使用多个原型技能并列入口 | 对旧流程改动少 | Agent 路由不稳定，难以统一 AntD v6 高保真 HTML 原型和确认记录 | 放弃 |
| 只保留 `high-fidelity-html-prototype` | 产物目标直接 | 缺少 Product Design plugin 的上下文、视觉探索、URL / 图片 / 代码来源路由能力 | 放弃 |
| 以 `product-design:index` 为主入口，旧技能保留兼容 | 路由统一，可复用 focused skills，迁移风险低 | 需要在文档中明确 legacy 边界 | 采纳 |

## 后果

### 正面影响

- 有 UI 的产品原型产出入口统一。
- 高保真 HTML 原型、AntD CLI 校验证据和用户确认记录成为固定门禁。
- Figma / Axure / Excalidraw / 截图 / URL 可作为输入来源，而不是主交付格式。

### 负面影响

- 需要维护完整 `.codex/skills/product-design/` 插件目录，不能只复制 `index/SKILL.md`。
- 旧原型技能在过渡期仍会存在，需要通过流程文档限制使用语境。

### 风险

- 如果 Agent 未读取 Product Design focused skill，可能误把 `product-design:index` 当作直接产出技能。
- 如果跳过 `antd` CLI 查询，原型可能偏离 Ant Design v6 组件 API 或 token。
- 如果缺少用户确认记录，下游 PRD 校准和 OpenAPI Draft 会失去体验冻结依据。

## 相关

- `AGENTS.md`
- `docs/process/product-prototype-workflow.md`
- `docs/process/lifecycle-artifact-map.md`
- `docs/design/README.md`
- `docs/design/templates/prototype-confirmation-template.md`
