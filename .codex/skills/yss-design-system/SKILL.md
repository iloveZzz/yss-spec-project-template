---
name: yss-design-system
description: Use when YSS 产品设计系统与 Ant Design 企业级 UI 风格基线。涉及页面设计、原型评审、UI 实现、组件选型、主题 token、颜色排版间距、响应式验收、Ant Design/YSS UI 风格一致性、docs/design/design.md 更新或从外部设计系统引入规范时必须使用。
---

# YSS Design System

本技能用于把项目 UI 统一到一套可执行的设计系统基线：Ant Design 企业后台风格、YSS 页面工程习惯、设计 token、组件语义、交互状态和响应式验收。

## 权威资料

- 规范源：根 `DESIGN.md`，是项目视觉 Token 与组件视觉变体的唯一事实来源，使用 Google `design.md` alpha canonical H2 章节。
- 团队治理说明：`docs/design/design.md`，解释 YSS 生命周期、组件路线、状态与验收，不重新定义 `DESIGN.md` 中的具体值。
- 项目 Token 快照：`docs/design/tokens/theme.json`、`docs/design/tokens/tokens.default.json`、`docs/design/tokens/tokens.dark.json`、`docs/design/tokens/tokens.compact.json`、`docs/design/tokens/variables.css`、`docs/design/tokens/variables.dark.css`；它们是派生实现视图，不得反向覆盖规范源。
- 本技能执行清单：`references/design-system.md`，用于 Agent 执行和评审，不替代 `docs/design/design.md`。
- 历史输入包：`/Users/zhudaoming/Downloads/Product-Design-System`，只用于追溯首次引入来源，不作为后续工程依赖。
- 默认亮色覆盖：项目 Ant Design 5 Less / `:root` 变量已裁定进 `docs/design/design.md` 与 token 快照；原始 Less 不是实现语言。
- Codex `$design-qa` 项目对照：`references/design-qa-theme.md`，不替代官方 `design-qa` 流程，也不改上游插件正文。
- 原型阶段合同：`yss-prototype-stage`，用于统一 H1/H2 原型资产和浏览器验证证据。H2 默认由 `yss-antdv-next-design` 提供 Vue/Antdv Next 事实；显式 React 兼容路线由 `yss-antd-design` 提供事实。

如果只需要快速判断，先读本文件。若要写 UI 规范、实现页面、评审设计或调整 Token，必须按 `DESIGN.md` → `docs/design/design.md` → `docs/design/tokens/*` 顺序读取；若要执行评审或实现检查，再读 `references/design-system.md`。

## 使用流程

1. 先判断任务阶段：设计系统引入 / 产品设计 / 原型评审 / 前端实现 / UI 改造 / 主题 token 落地。
2. 读取已有资产：先读根 `DESIGN.md`，再读 `docs/design/design.md` 和 Token 派生快照，最后按任务读取相关 Spec、交互说明、状态矩阵、OpenAPI Draft、现有页面代码。
3. 按设计系统基线约束输出或修改产物：颜色、排版、间距、圆角、动效、组件、状态、响应式。
4. 若是产品设计阶段，先使用 `yss-prototype-stage`；Codex 以 `product-design:index` 为主入口，其他 Agent 必须交付等价合同资产和证据。
5. 若是前端实现阶段，配合 `yss-ui`、`yss-ui-business-page-generation`、`yss-components`、`yss-formily`，但本技能负责风格与体验一致性门禁。
6. 若发现视觉 Token 或组件变体不足，先更新根 `DESIGN.md` 并重新生成投影；只有治理、流程或验收说明不足时才更新 `docs/design/design.md`。

## 核心基线

- UI 定位：中后台、数据密集、表单密集、流程密集、可扫描、低装饰。
- 颜色：使用 `DESIGN.md` 的 `colors.*`；品牌 seed 与高对比主控件变体是不同角色，不得用 seed 绕过 `components.button-primary*`。
- 排版：使用 `DESIGN.md` 的 `typography.*`，状态不能只靠字重表达。
- 密度：使用 `DESIGN.md` 的组件高度与 `spacing.*`；默认工作界面只应用一次 compact algorithm，不手工二次压缩。
- 圆角：使用 `rounded.*`，控件、容器和 pill 角色不得用页面级 magic number 替代。
- 运行时换肤：短名 CSS 变量必须指向 `--brand-*`，不要再维护第二套色值。
- 表面层级：页面背景、内容容器、浮层三层模型。
- 组件语言：优先 Ant Design / YSS UI 语义，不自造同类控件。
- 状态完整性：loading、empty、error、readonly、disabled、no-permission、conflict、success 必须在设计或实现中可解释。
- 原型基线：先用项目语义 token 定义角色，再用组件 token 或 CSS variables 落地；不以局部硬编码替代主题层。H2 默认 Vue/Antdv Next 只消费精确版本且 digest 新鲜的 fact pack；React AntD 只用于显式兼容路线。
- 档位版本边界：H1 只依赖项目 Token；H2 Vue/Antdv Next 默认路线与 React AntD 兼容路线分别精确锁版本。两条原型路线都不改变生产实现边界；生产 API 只在实现阶段从目标仓 lockfile 读取 Vue 3 + YSS UI + AntDV 事实。

## 强制规则

- 不把该系统改造成营销落地页风格；业务应用首屏应直接进入可用工作界面。
- 不用大面积渐变、装饰插画、夸张 hero、过度卡片化或单色系视觉堆叠替代信息结构。
- 不在同一决策区域放两个 primary 按钮。
- 每个页面或决策区域只保留一个 single primary action；其余动作降级为默认、链接或危险操作。
- 不硬编码表面色、边框色、状态色；优先使用 token 或主题变量。
- 交互原型中的每个可点击主动作都必须给出 interaction feedback：状态变化、禁用原因、成功或失败反馈至少覆盖其一。
- accessibility：品牌 Seed 保持 `colors.primary`；实际文字/背景组合不满足 WCAG 2.2 AA 时，优先使用 `components.*` 中的高对比变体或 `ConfigProvider` component token 调整，并验证 default/hover/active/disabled/focus、键盘焦点、200% zoom、reduced motion 与目标尺寸，不新增页面级特例色。
- Antdv Next 默认路线与 React Ant Design 兼容路线的暗色或紧凑密度必须使用各自精确版本支持的 theme algorithm；基础 seed 和 compact 结果均从规范源/派生快照读取，不手工反转颜色、逐控件压缩或重复 compact。
- 不依赖 Ant Design v6 / Antdv Next 的内部 DOM、生成类名或未记录 API；只使用公开 API、semantic token 与项目主题变量。
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
- 是否使用当前 `DESIGN.md` 和 compact 派生快照中的控件、排版与间距值，且没有重复 compact。
- 是否使用 YSS UI / Ant Design 的语义组件，而不是自造同类组件。
- 是否保留 hover、focus、active、disabled、loading、error、empty 状态。
- 是否为可提交、导出、保存、发布、审批等操作提供明确的 interaction feedback 与不可逆操作确认。
- 是否在核心视口无横向溢出；表格横向滚动必须被限定在表格容器内。

## 与其他技能的关系

| 场景 | 配合技能 |
| --- | --- |
| Spec 后做页面 / 原型 / 交互说明 | `yss-prototype-stage` → `product-design:index` |
| 低保真原型进入高保真前评审 | `prototype-review` |
| 低保真评审后的原型交付物 | `yss-prototype-stage` 选择 H1/H2；`high-fidelity-html-prototype` 仅只读迁移 |
| 低保真线框或流程图 | `product-design:index` |
| 前端页面实现 | `yss-ui` / `yss-ui-business-page-generation` |
| 表单 schema | `yss-formily` |
| YTable / YTree / 高度自适应 | `yss-components` / `yss-use-table-height` / `yss-use-tree-height` |
| H2 Vue/Antdv Next 默认原型的组件 / token / demo 查询 | `yss-antdv-next-design`（精确版本 fact pack，不用于 H1） |
| H2 React/AntD 显式兼容原型的组件 / token / demo 查询 | `yss-antd-design`（fact pack 优先，不用于 H1） |
| Codex 原型交接前的视觉 QA | `design-qa`；token / 字体对照读 `references/design-qa-theme.md`，以项目覆盖为准 |
| 原型渲染适配 | `yss-prototype-stage/references/product-design-adapter.md`；H1 静态、H2 可运行流程；不得调用 `yss-ui` |
| API 契约 / 接入 | `yss-openapi-governance` / `yss-api-integration` |

## 更新设计系统

当用户要求“引入设计系统”“形成项目规范”“更新设计系统 skill”时：

1. 分析来源设计系统，不原样堆拷贝。
2. 将稳定视觉 Token 与组件变体先落到根 `DESIGN.md`；治理、流程和验收说明再落到 `docs/design/design.md`。
3. 运行 `node .template-source/tooling/node/scripts/design-md.mjs export dtcg --write --write-manifest` 更新派生视图，并更新 `docs/design/design-system-sync.yaml` 的规范源摘要。
4. 将 Agent 执行入口落到 `.agents/skills/yss-design-system/SKILL.md`，执行清单落到 `references/design-system.md`；两者只引用 Token 名和角色，不复制具体值。
5. 更新 `docs/design/README.md` 和必要的 `AGENTS.md` 入口规则。
6. 运行 frontmatter、对应 `node --test`、`design-md lint/drift`、技能投影与 lock 校验。
