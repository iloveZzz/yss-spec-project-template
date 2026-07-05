---
name: yss-design-system
description: YSS 产品设计系统与 Ant Design 企业级 UI 风格基线。涉及页面设计、原型评审、UI 实现、组件选型、主题 token、颜色排版间距、响应式验收、Ant Design/YSS UI 风格一致性、docs/design/design.md 更新或从外部设计系统引入规范时必须使用。
---

# YSS Design System

本技能用于把项目 UI 统一到一套可执行的设计系统基线：Ant Design 企业后台风格、YSS 页面工程习惯、设计 token、组件语义、交互状态和响应式验收。

## 权威资料

- 项目设计系统文档：`docs/design/design.md`，作为团队可读的唯一规范来源。
- 项目 token 快照：`docs/design/tokens/theme.json`、`docs/design/tokens/tokens.default.json`、`docs/design/tokens/tokens.dark.json`、`docs/design/tokens/tokens.compact.json`、`docs/design/tokens/variables.css`、`docs/design/tokens/variables.dark.css`。
- 本技能执行清单：`references/design-system.md`，用于 Agent 执行和评审，不替代 `docs/design/design.md`。
- 历史输入包：`/Users/zhudaoming/Downloads/Product-Design-System`，只用于追溯首次引入来源，不作为后续工程依赖。

如果只需要快速判断，先读本文件。若要写 UI 规范、实现页面、评审设计或调整 token，必须读项目内 `docs/design/design.md`；若要执行评审或实现检查，再读 `references/design-system.md`。

## 使用流程

1. 先判断任务阶段：设计系统引入 / 产品设计 / 原型评审 / 前端实现 / UI 改造 / 主题 token 落地。
2. 读取已有资产：`docs/design/design.md`、相关 PRD、交互说明、状态矩阵、OpenAPI Draft、现有页面代码。
3. 按设计系统基线约束输出或修改产物：颜色、排版、间距、圆角、动效、组件、状态、响应式。
4. 若是产品设计阶段，配合 `product-design-prototype` 产出页面、流程、状态矩阵和 OpenAPI 反推清单。
5. 若是前端实现阶段，配合 `yss-ui`、`yss-components`、`yss-formily`、`yss-page-module-development`，但本技能负责风格与体验一致性门禁。
6. 若发现现有设计系统文档不足，先更新 `docs/design/design.md`，再让实现或评审引用该文档。

## 核心基线

- UI 定位：中后台、数据密集、表单密集、流程密集、可扫描、低装饰。
- 主色：`#1677ff`，用于主操作、链接、焦点、选中态和激活导航。
- 默认字号：14px；主要字重：400 / 600。
- 默认控件高度：32px。
- 间距：4px 网格，优先使用 token，不写任意 magic number。
- 表面层级：页面背景、内容容器、浮层三层模型。
- 组件语言：优先 Ant Design / YSS UI 语义，不自造同类控件。
- 状态完整性：loading、empty、error、readonly、disabled、no-permission、conflict、success 必须在设计或实现中可解释。

## 强制规则

- 不把该系统改造成营销落地页风格；业务应用首屏应直接进入可用工作界面。
- 不用大面积渐变、装饰插画、夸张 hero、过度卡片化或单色系视觉堆叠替代信息结构。
- 不在同一决策区域放两个 primary 按钮。
- 不硬编码表面色、边框色、状态色；优先使用 token 或主题变量。
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
- 是否保持 32px 默认控件高度、14px 默认正文、4px 间距网格。
- 是否使用 YSS UI / Ant Design 的语义组件，而不是自造同类组件。
- 是否保留 hover、focus、active、disabled、loading、error、empty 状态。
- 是否在核心视口无横向溢出；表格横向滚动必须被限定在表格容器内。

## 与其他技能的关系

| 场景 | 配合技能 |
| --- | --- |
| PRD 后做页面 / 原型 / 交互说明 | `product-design-prototype` |
| 低保真原型进入高保真前评审 | `prototype-review` |
| 低保真评审通过后的高保真 HTML 原型 | `high-fidelity-html-prototype` |
| 低保真线框或流程图 | `wireframe-prototype` / `excalidraw-diagram-generator` |
| 前端页面实现 | `yss-ui` / `yss-page-module-development` |
| 表单 schema | `yss-formily` |
| YTable / YTree / 高度自适应 | `yss-components` / `yss-use-table-height` / `yss-use-tree-height` |
| Ant Design v6 组件 / token / demo 查询 | 官方 `@ant-design/cli` / `https://ant.design/docs/react/for-agents` |
| API 契约 / 接入 | `api-integration` / `yss-openapi` |

## 更新设计系统

当用户要求“引入设计系统”“形成项目规范”“更新设计系统 skill”时：

1. 分析来源设计系统，不原样堆拷贝。
2. 将稳定规范落到 `docs/design/design.md`。
3. 将 Agent 执行入口落到 `.codex/skills/yss-design-system/SKILL.md`。
4. 将 Agent 执行检查清单更新到 `.codex/skills/yss-design-system/references/design-system.md`。
5. 更新 `docs/design/README.md` 和必要的 `AGENTS.md` 入口规则。
6. 运行 `.codex/skills/yss-design-system/scripts/validate-frontmatter.py` 和 markdown/diff 基础检查；若当前环境安装了 `PyYAML`，再运行 skill-creator 的 `quick_validate.py`。
