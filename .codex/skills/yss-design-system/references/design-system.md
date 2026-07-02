# YSS 设计系统执行规范

本文件是 `docs/design/design.md` 的 skill 侧执行清单。项目文档面向团队阅读并作为唯一规范来源，本文件面向 Agent 执行、设计评审和前端实现，不单独承载新的 token 决策。

权威资料：

- 团队规范：`docs/design/design.md`
- Token 快照：`docs/design/tokens/*`
- Skill 入口：`.codex/skills/yss-design-system/SKILL.md`

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

| Token | 值 | 用途 |
| --- | --- | --- |
| `colorPrimary` | `#1677ff` | 主操作、链接、焦点、选中态 |
| `colorPrimaryHover` | `#4096ff` | 主色 hover |
| `colorPrimaryActive` | `#0958d9` | 主色 active |
| `colorSuccess` | `#52c41a` | 成功状态 |
| `colorWarning` | `#faad14` | 警告状态 |
| `colorError` | `#ff4d4f` | 错误状态 |
| `colorInfo` | `#1677ff` | 信息提示 |
| `colorBgLayout` | `#f5f5f5` | 页面背景 |
| `colorBgContainer` | `#ffffff` | 内容容器 |
| `colorBgElevated` | `#ffffff` | 浮层容器 |
| `colorText` | `#2e2e2e` | 主文本 |
| `colorTextSecondary` | `#646464` | 次级文本 |
| `colorTextTertiary` | `#949494` | 弱说明 |
| `colorTextQuaternary` | `#c4c4c4` | placeholder / disabled |
| `colorBorder` | `#dbdbdb` | 主边框 |
| `colorBorderSecondary` | `#f1f1f1` | 次级分割线 |

颜色规则：

- 主色只用于主操作、链接、焦点、选中态和激活导航。
- `success`、`warning`、`error`、`info` 只表达功能状态。
- 预设色板只用于 Tag、图表、分类可视化，不用于重新定义主操作。
- 不硬编码白色、灰色、状态色；优先引用 token、CSS variables 或 Ant Design theme。

### 排版

| 层级 | 字号 | 字重 | 用途 |
| --- | --- | --- | --- |
| Heading 1 | 38 | 600 | 大标题，慎用 |
| Heading 2 | 32 | 600 | 页面级标题 |
| Heading 3 | 26 | 600 | 重要分区 |
| Heading 4 | 22 | 600 | 分区标题 |
| Heading 5 | 18 | 600 | 卡片 / 面板标题 |
| Body | 14 | 400 | 默认正文、控件、表格 |
| Small | 12 | 400 | 辅助信息、Tag |

排版规则：

- UI 默认正文 14px。
- UI 字重优先 400 / 600。
- 不用 700+ 粗体表达选中或激活状态。
- 选中状态优先使用颜色、边框、下划线、背景表达。

### 间距、尺寸、圆角

| 类型 | 基线 |
| --- | --- |
| 间距网格 | 4px |
| 默认控件高度 | 32px |
| 小控件高度 | 24px |
| 大控件高度 | 40px |
| 默认字号 | 14px |
| 当前品牌默认圆角 | 8px |
| 大容器 / 浮层圆角 | 10px |

执行规则：

- 间距使用 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48。
- 表单、筛选区、工具栏、表格、详情页使用密集但有节奏的布局。
- 控件圆角不得明显大于容器圆角。
- 不使用任意 magic number；确需新增尺寸时，先说明为什么 token 不够。

### 动效

| Token | 值 | 用途 |
| --- | --- | --- |
| `motionDurationFast` | `0.1s` | hover、focus、press |
| `motionDurationMid` | `0.2s` | 折叠、淡入淡出、控件内部状态 |
| `motionDurationSlow` | `0.3s` | Modal、Drawer、页面级浮层 |

动效只服务于状态反馈、层级变化和空间关系。不自造 easing。

## 组件规则

| 组件 | 规则 |
| --- | --- |
| Button Primary | 每个决策区域只保留一个主按钮 |
| Button Default | 次级动作默认使用默认按钮或描边按钮 |
| Input / Select | 默认高度 32px，focus 可见 |
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
- 优先通过 token、component token、CSS variables、theme algorithm 实现样式。
- 静态反馈 API 使用 `App`、hook API 或 context holder，避免主题上下文丢失。
- 暗色模式使用 `darkAlgorithm` 或 `variables.dark.css`。
- 紧凑模式使用 `compactAlgorithm` 或 `tokens.compact.json`。

YSS UI / Vue：

- 业务页面优先走 `yss-ui` 和 `yss-page-module-development`。
- 表单使用 `YssFormily` schema。
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
- 是否保持默认 14px 正文、32px 控件、4px 间距网格。
- 是否保留 hover、focus、active、disabled、loading、empty、error 状态。
- 是否存在卡片套卡片、营销式 hero、装饰性渐变或无意义插画。
- 是否存在横向溢出、文本遮挡或按钮文字溢出。
