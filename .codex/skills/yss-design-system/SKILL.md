---
name: yss-design-system
description: Use when YSS 产品设计系统与 Ant Design 企业级 UI 风格基线。涉及页面设计、原型评审、UI 实现、组件选型、主题 token、颜色排版间距、响应式验收、Ant Design/YSS UI 风格一致性、docs/design/design.md 更新或从外部设计系统引入规范时必须使用。
---

# YSS Design System

本技能用于把项目 UI 统一到一套可执行的设计系统基线：Ant Design 企业后台风格、YSS 页面工程习惯、设计 token、组件语义、交互状态和响应式验收。

## 权威资料

- 项目设计系统文档：`docs/design/design.md`，作为团队可读的唯一规范来源。
- 项目 token 快照：`docs/design/tokens/theme.json`、`docs/design/tokens/tokens.default.json`、`docs/design/tokens/tokens.dark.json`、`docs/design/tokens/tokens.compact.json`、`docs/design/tokens/variables.css`、`docs/design/tokens/variables.dark.css`。
- 本技能执行清单：`references/design-system.md`，用于 Agent 执行和评审，不替代 `docs/design/design.md`。
- 历史输入包：`/Users/zhudaoming/Downloads/Product-Design-System`，只用于追溯首次引入来源，不作为后续工程依赖。
- 默认亮色覆盖：项目 Ant Design 5 Less / `:root` 变量已裁定进 `docs/design/design.md` 与 token 快照；原始 Less 不是实现语言。
- Codex `$design-qa` 项目对照：`references/design-qa-theme.md`，不替代官方 `design-qa` 流程，也不改上游插件正文。
- 原型阶段合同：`yss-prototype-stage`，用于统一跨 Agent 的原型资产和浏览器验证证据。AntD 事实由 `yss-antd-design` 提供，且只用于原型设计构建。

如果只需要快速判断，先读本文件。若要写 UI 规范、实现页面、评审设计或调整 token，必须读项目内 `docs/design/design.md`；若要执行评审或实现检查，再读 `references/design-system.md`。

## 使用流程

1. 先判断任务阶段：设计系统引入 / 产品设计 / 原型评审 / 前端实现 / UI 改造 / 主题 token 落地。
2. 读取已有资产：`docs/design/design.md`、相关 Spec、交互说明、状态矩阵、OpenAPI Draft、现有页面代码。
3. 按设计系统基线约束输出或修改产物：颜色、排版、间距、圆角、动效、组件、状态、响应式。
4. 若是产品设计阶段，先使用 `yss-prototype-stage`；Codex 以 `product-design:index` 为主入口，其他 Agent 必须交付等价合同资产和证据。
5. 若是前端实现阶段，配合 `yss-ui`、`yss-ui-business-page-generation`、`yss-components`、`yss-formily`；生命周期编排和旧触发词兼容再使用 `yss-page-module-development`，但本技能负责风格与体验一致性门禁。
6. 若发现现有设计系统文档不足，先更新 `docs/design/design.md`，再让实现或评审引用该文档。

## 核心基线

- UI 定位：中后台、数据密集、表单密集、流程密集、可扫描、低装饰。
- 主色：`#3371ff`（`--primary-color` / `--brand-color-primary`），用于主操作、链接、焦点、选中态和激活导航。
- 默认字号：14px；主要字重：400 / 600；字体栈为系统字体，不强制 `Inter`。
- 默认控件高度：32px；默认圆角 6px。
- 间距：4px 网格，优先使用 token，不写任意 magic number。
- 运行时换肤：短名 CSS 变量必须指向 `--brand-*`，不要再维护第二套色值。
- 表面层级：页面背景、内容容器、浮层三层模型。
- 组件语言：优先 Ant Design / YSS UI 语义，不自造同类控件。
- 状态完整性：loading、empty、error、readonly、disabled、no-permission、conflict、success 必须在设计或实现中可解释。
- Ant Design v6 原型基线：先用语义 token 定义角色，再用组件 token 或 CSS variables 落地；不以局部硬编码替代主题层。
- 双轨版本：主题/视觉标准为 React Ant Design v6；生产 API 为 Vue 3 + YSS UI + 实现仓 lockfile 的 Ant Design Vue 4.x。只迁移语义、Token、状态与验收行为。

## 强制规则

- 不把该系统改造成营销落地页风格；业务应用首屏应直接进入可用工作界面。
- 不用大面积渐变、装饰插画、夸张 hero、过度卡片化或单色系视觉堆叠替代信息结构。
- 不在同一决策区域放两个 primary 按钮。
- 每个页面或决策区域只保留一个 single primary action；其余动作降级为默认、链接或危险操作。
- 不硬编码表面色、边框色、状态色；优先使用 token 或主题变量。
- 交互原型中的每个可点击主动作都必须给出 interaction feedback：状态变化、禁用原因、成功或失败反馈至少覆盖其一。
- accessibility：品牌 Seed `#3371ff` 保持不变；实际文字/背景组合不满足 WCAG 2.2 AA 时，优先通过 `ConfigProvider` component token 调整，并验证 default/hover/active/disabled/focus、键盘焦点、200% zoom、reduced motion 与目标尺寸，不新增页面级特例色。
- React + Ant Design 的暗色或紧凑密度必须使用 theme algorithm，不手工反转颜色或逐控件压缩尺寸。
- 不用 Tag 表达关键错误、阻断或审批状态；关键状态必须有可读文本和语义反馈。
- 不让按钮、标签、表头、弹窗、卡片中的文字溢出或遮挡。
- 不在表格 / 筛选 / 批量操作密集页面使用松散营销式布局。

## 产出要求

设计类任务至少输出：

- 设计系统引用：明确引用 `docs/design/design.md`。
- 页面和模块：页面清单、布局结构、主路径、异常路径。
- 组件选择：YSS UI / Ant Design 组件映射。
- 状态矩阵：加载、空、错、禁用、只读、无权限、冲突、成功。
- API 反推：字段、筛选、分页、动作、错误码、权限、并发或幂等规则。
- 响应式要求：关键断点和窄屏替代形态。

实现类任务至少检查：

- 是否通过 `ConfigProvider`、CSS variables 或项目 token 消费主题。
- 是否将颜色、圆角、阴影和状态样式绑定到 semantic token，而不是复制表面色和交互色。
- 是否保持 32px 默认控件高度、14px 默认正文、4px 间距网格。
- 是否使用 YSS UI / Ant Design 的语义组件，而不是自造同类组件。
- 是否保留 hover、focus、active、disabled、loading、error、empty 状态。
- 是否为可提交、导出、保存、发布、审批等操作提供明确的 interaction feedback 与不可逆操作确认。
- 是否在核心视口无横向溢出；表格横向滚动必须被限定在表格容器内。

## 与其他技能的关系

| 场景 | 配合技能 |
| --- | --- |
| Spec 后做页面 / 原型 / 交互说明 | `yss-prototype-stage` → `product-design:index` |
| 低保真原型进入高保真前评审 | `prototype-review` |
| 低保真评审通过后的高保真 HTML 原型 | `yss-prototype-stage`；`high-fidelity-html-prototype` 仅兼容入口 |
| 低保真线框或流程图 | `product-design:index` |
| 前端页面实现 | `yss-ui` / `yss-ui-business-page-generation`；生命周期兼容使用 `yss-page-module-development` |
| 表单 schema | `yss-formily` |
| YTable / YTree / 高度自适应 | `yss-components` / `yss-use-table-height` / `yss-use-tree-height` |
| 原型阶段的 Ant Design v6 组件 / token / demo 查询 | `yss-antd-design`（只用于原型设计构建；前端落地改用 `yss-ui`） |
| Codex 原型交接前的视觉 QA | `design-qa`；token / 字体对照读 `references/design-qa-theme.md`，以项目覆盖为准 |
| Product Design 通用 starter 接入 YSS | `yss-prototype-stage/references/product-design-adapter.md`；锁定 antd@6、pnpm、主题 adapter、feature 级 QA 与证据 |
| API 契约 / 接入 | `yss-openapi-governance` / `yss-api-integration` |

## 更新设计系统

当用户要求“引入设计系统”“形成项目规范”“更新设计系统 skill”时：

1. 分析来源设计系统，不原样堆拷贝。
2. 将稳定规范落到 `docs/design/design.md`。
3. 将 Agent 执行入口落到 `.agents/skills/yss-design-system/SKILL.md`。
4. 将 Agent 执行检查清单更新到 `.agents/skills/yss-design-system/references/design-system.md`。
5. 更新 `docs/design/README.md` 和必要的 `AGENTS.md` 入口规则。
6. 运行 `node .agents/skills/yss-design-system/scripts/validate-frontmatter.mjs`、对应 `node --test` 和 markdown/diff 基础检查。
