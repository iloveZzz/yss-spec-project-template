# YSS 设计系统执行规范

本文件是 YSS 设计系统的 skill 侧执行清单，面向 Agent 执行、设计评审和前端实现，不单独承载新的 Token 决策或具体值。

权威资料：

- 规范源：根 `DESIGN.md`（项目视觉 Token 与组件视觉变体）
- 治理说明：`docs/design/design.md`（生命周期、组件路线、状态与验收）
- 派生快照：`docs/design/tokens/*`（实现映射，不得反向覆盖规范源）
- Skill 入口：`.agents/skills/yss-design-system/SKILL.md`

## 设计定位

本项目 UI 默认采用 Ant Design 企业级中后台风格，而不是营销站、品牌官网或概念展示风格。

关键词：

- 数据密集
- 表单密集
- 流程密集
- 可扫描
- 状态确定
- 低装饰
- 组件一致

页面首屏应优先呈现实际业务界面。除非需求明确要求 Landing Page，不要创建营销式 hero、过度装饰、全屏宣传页或卡片堆叠式介绍页。

## 设计原则

| 原则 | 执行要求 |
| --- | --- |
| Natural | 使用熟悉的中后台模式，如筛选区、表格、详情抽屉、Modal、Tabs、左树右表 |
| Certain | 每个操作都有明确状态反馈，加载、错误、权限、只读、冲突不靠猜 |
| Meaningful | 视觉强调只服务于主操作、状态和层级，不做无意义装饰 |
| Growing | 支持从简单表单扩展到复杂表格、审批流、控制台和多模块页面 |

## Token 基线

### 颜色

| 角色 | 规范源 | 运行时映射 |
| --- | --- | --- |
| 品牌 seed | `colors.primary` | `colorPrimary` / `--brand-color-primary` |
| 高对比主控件 | `components.button-primary*` | `--yss-color-primary-control*` 或组件 Token |
| 页面 / 容器 / 浮层 | `colors.canvas-layout` / `surface` / `surface-elevated` | 对应 `colorBg*` / `--brand-color-bg-*` |
| 主次文本 | `colors.text*` | 对应 `colorText*` / `--brand-color-text*` |
| 功能状态 | `colors.success*` / `warning*` / `error*` / `info-bg` | 对应状态 semantic Token |
| 边框 | `colors.border-secondary` | 对应边框 semantic Token |

颜色规则：

- 主色只用于主操作、链接、焦点、选中态和激活导航。
- `success`、`warning`、`error`、`info` 只表达功能状态。
- 预设色板只用于 Tag、图表、分类可视化，不用于重新定义主操作。
- 不硬编码白色、灰色、状态色；优先引用 token、CSS variables 或 Ant Design theme。
- semantic token 优先于色值：页面先声明背景、容器、浮层、文本、边框、状态等角色，再映射到具体 token。
- 运行时短名 `--primary-color`、`--text-color`、`--bg-color` 必须指向 `--brand-*`，不要再维护第二套色值。
- 上游预设色板与项目品牌 seed 是不同角色；色板预设 ≠ 品牌主色。
- accessibility contrast 不足时，通过 `ConfigProvider` 的 seed token 或组件 token 调整；不要为单个页面制造不可复用的深浅色例外。
- Codex `$design-qa` 的 token / 字体对照读 `references/design-qa-theme.md`。

### 排版

| 角色 | 规范源 | 用途 |
| --- | --- | --- |
| 正文 | `typography.body` | 默认正文、控件、表格 |
| 强调正文 | `typography.body-strong` | 表头与必要强调 |
| 大 / 中标题 | `typography.heading-lg` / `heading-md` | 页面与分区层级 |
| 辅助文本 | `typography.caption` | 说明、Tag 与次级信息 |
| 按钮 | `typography.button` | 控件文字 |

排版规则：

- 正文、标题、辅助文本和按钮的字号、字重、行高均从 `DESIGN.md` 对应角色读取。
- 字体栈使用系统字体，不强制 `Inter`。
- 不用 700+ 粗体表达选中或激活状态。
- 选中状态优先使用颜色、边框、下划线、背景表达。

### 间距、尺寸、圆角

| 类型 | 规范源 |
| --- | --- |
| 间距 | `spacing.*` 与组件变体的 `padding` |
| 控件高度 | `components.button-*` / `input-*` 的 `height`；算法 seed 见治理说明 |
| 控件 / 容器圆角 | `rounded.*` 与组件变体的 `rounded` |
| 页面 / Card 内边距 | `components.page-shell` / `card-compact` |

执行规则：

- 间距只使用 `spacing.*`，不要补写未登记的中间值。
- 默认工作界面叠加一次 compact algorithm；seed 与计算结果从规范源和派生快照读取，不得二次 compact。
- 表单、筛选区、工具栏、表格、详情页使用密集但有节奏的布局。
- 控件圆角不得明显大于容器圆角。
- 不使用任意 magic number；确需新增尺寸时，先说明为什么 token 不够。

### 动效

动效只服务于状态反馈、层级变化和空间关系。使用目标 Provider 的 semantic motion Token，不在页面或本执行清单中自造 duration/easing；项目需要稳定覆盖时先登记到根 `DESIGN.md`。

## 组件规则

| 组件 | 规则 |
| --- | --- |
| Button Primary | 每个决策区域只保留一个主按钮 |
| Button Default | 次级动作默认使用默认按钮或描边按钮 |
| Input / Select | 使用 `components.input-*` 高度和圆角，focus 可见；不得以算法 seed 冒充 compact 结果 |
| Card | 只用于真实内容容器，不做卡片套卡片 |
| Modal | 用于阻断式决策和关键表单 |
| Drawer | 用于详情、编辑、辅助流程，不打断主列表上下文 |
| Menu | 选中态使用淡蓝背景和主色文本 |
| Tabs | 激活态使用主色文本和下划线，不加背景块 |
| Table | 表头浅表面色 + 600 字重；hover 再强调行 |
| Tag | 表达分类，不表达关键阻断状态 |
| Alert | 表达成功、警告、错误、信息等语义反馈 |
| Badge | 只做紧凑状态提示，不能替代文本 |
| Tooltip | 只提供补充解释，不承载关键业务信息 |

交互规则：

- 每个决策区域只保留一个 single primary action；危险操作和次级动作必须在视觉层级上降级。
- 保存、提交、审批、发布、导出等可点击动作必须产生 interaction feedback，包括结果消息、行内状态变化、禁用原因或确认弹窗。
- 风险或不可逆动作使用 Modal 二次确认；禁止将“已发布”误表示为“已执行数据库变更”。

## 页面规则

- 后台页面优先使用：Header / 查询区 / 工具栏 / 表格 / 详情抽屉 / 弹窗。
- 主从关系优先使用：左树右表、列表 + 详情、Tabs + 分区。
- 表格密集场景优先保证列可读、操作稳定、横向滚动受控。
- 筛选区要支持重置、提交、默认值和窄屏重排。
- 空态要说明下一步，不只显示“暂无数据”。
- 无权限态要说明权限缺失，不假装是空数据。

## 状态矩阵

设计、原型或实现至少考虑：

- loading
- empty
- error
- readonly
- disabled
- no-permission
- conflict
- dirty / unsaved
- success

关键业务流还要补充：

- optimistic update
- idempotency
- concurrent modification
- partial success
- retryable failure
- audit-visible action

## 响应式验收

核心视口：

| 名称 | 尺寸 |
| --- | --- |
| mobile compact | 360 × 800 |
| mobile standard | 390 × 844 |
| mobile large | 430 × 932 |
| foldable / small tablet | 600 × 960 |
| tablet portrait | 820 × 1180 |
| tablet landscape | 1024 × 768 |
| laptop | 1366 × 768 |
| desktop | 1440 × 900 |
| wide desktop | 1920 × 1080 |

验收规则：

- 页面整体不出现意外横向滚动。
- 表格横向滚动必须限定在表格容器内。
- 工具栏、筛选区、批量操作区在窄屏下重排或折叠。
- 长文本、按钮、标签、表头、弹窗内容不得溢出。
- 移动端表格需要说明替代形态，如卡片列表、关键列优先或详情抽屉。

## 前端落地

React + Ant Design：

- 使用 `ConfigProvider` 注入主题。
- 默认工作界面使用 `theme.compactAlgorithm`；暗色紧凑模式组合 `theme.darkAlgorithm` 与 `theme.compactAlgorithm`，不手工反转色值或逐组件压缩。
- seed 与 compact 计算值以 `DESIGN.md` / `tokens.compact.json` 为准；不要重复 compact。
- 优先通过 token、component token、CSS variables、theme algorithm 实现样式。
- 静态反馈 API 使用 `App`、hook API 或 context holder，避免主题上下文丢失。
- 暗色模式使用 `darkAlgorithm` 或 `variables.dark.css`。
- 紧凑模式使用 `compactAlgorithm` 或 `tokens.compact.json`。

实验 Vue + Antdv Next：

- H2 默认先使用 `yss-antdv-next-design` 校验精确版本 fact pack、组件集合与项目 baseline digest。
- 共享本规范的 semantic token、紧凑密度和验收语义；props、events、slots 与主题 API 只从 Antdv Next fact pack 读取。
- `yss-antd-design` 只保留为显式 React/AntD 兼容路线；默认 Provider 与兼容 Provider 都不替换生产 `yss-ui` 路线。

YSS UI / Vue：

- 业务页面实现与生命周期编排统一走 `yss-ui` 和 `yss-ui-business-page-generation`。
- 新业务表单使用 `YFormily` schema；`YssFormily` 仅用于历史兼容。
- 表格使用 `YTable`，列定义使用项目约定字段。
- 高度自适应使用 `useTableHeight` / `useTreeHeight`。
- 请求、分页、筛选参数下沉到 Hook。

## 评审清单

设计评审时检查：

- 是否引用 `docs/design/design.md`。
- 是否符合中后台定位。
- 页面清单、主路径、异常路径是否清楚。
- 状态矩阵是否完整。
- 组件选择是否复用 YSS UI / Ant Design。
- API 反推字段、筛选、分页、动作、错误、权限是否完整。
- 主操作是否唯一，次级操作是否降级。
- 响应式断点和窄屏替代形态是否清楚。

实现评审时检查：

- 是否消费 token，而不是硬编码颜色和尺寸。
- 是否以 semantic token 表达颜色、圆角、阴影和状态层级。
- 是否使用当前 `DESIGN.md` 与 `tokens.compact.json` 的排版、控件和间距值，且没有重复 compact。
- 是否保留 hover、focus、active、disabled、loading、empty、error 状态。
- 是否只保留一个 single primary action，并让每个关键操作提供 interaction feedback。
- 是否在目标字号和背景下复核 accessibility contrast。
- 是否存在卡片套卡片、营销式 hero、装饰性渐变或无意义插画。
- 是否存在横向溢出、文本遮挡或按钮文字溢出。
