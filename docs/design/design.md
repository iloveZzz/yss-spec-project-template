# 设计系统引入说明

## 来源与定位

本文件基于本地设计系统包 `/Users/zhudaoming/Downloads/Product-Design-System` 首次分析整理。自本文件落地后，项目内设计系统的权威来源为 `docs/design/design.md` 与 `docs/design/tokens/*`，外部 Downloads 目录仅作为历史输入记录，不作为后续执行依赖。

本次分析的关键来源：

| 来源文件 | 作用 | 采用结论 |
| --- | --- | --- |
| `assets/design.md` | 完整 Ant Design 设计系统说明，包含颜色、排版、布局、组件、动效和定制规则 | 作为主要设计系统语义来源 |
| `docs/design/tokens/tokens.default.json` | 默认亮色主题派生 token | 作为实现 token 基线 |
| `docs/design/tokens/tokens.dark.json` | 暗色主题派生 token | 作为后续暗色模式扩展来源 |
| `docs/design/tokens/tokens.compact.json` | 紧凑密度主题派生 token | 作为后台密集表格 / 表单场景扩展来源 |
| `docs/design/tokens/variables.css` | `--brand-*` CSS 变量 | 前端实现时优先转换为项目 token |
| `docs/design/tokens/theme.json` | Ant Design `ConfigProvider` theme 配置 | React + Ant Design 项目可直接参考 |
| `DESIGN-HANDOFF.md` | 设计交付约束、响应式验证矩阵和实现顺序 | 作为 UI 实现验收补充 |
| `DESIGN.md` | 品牌生成器输出的简要索引 | 仅作品牌包索引，不作为完整规范 |

结论：这不是营销型视觉系统，而是面向中后台、数据密集、表单密集、流程密集产品的 Ant Design 风格企业级设计系统。项目内 UI 默认应以“清晰、确定、低装饰、可扫描、高一致性”为目标。

## 设计原则

本项目采用该设计系统时，优先遵循四个原则：

| 原则 | 项目解释 |
| --- | --- |
| Natural | 使用用户熟悉的中后台交互模式，不为了新奇牺牲效率 |
| Certain | 页面状态、操作反馈、校验错误、加载和权限状态必须明确 |
| Meaningful | 视觉强调只服务于任务、状态和主操作，避免无信息量装饰 |
| Growing | 支撑从简单表单到复杂表格、详情页、审批流和运营控制台的扩展 |

## Token 基线

### 颜色

| Token | 值 | 用途 |
| --- | --- | --- |
| `colorPrimary` | `#1677ff` | 主按钮、链接、焦点、选中态、激活导航 |
| `colorPrimaryHover` | `#4096ff` | 主色 hover |
| `colorPrimaryActive` | `#0958d9` | 主色 active |
| `colorSuccess` | `#52c41a` | 成功状态 |
| `colorWarning` | `#faad14` | 警告状态 |
| `colorError` | `#ff4d4f` | 错误状态 |
| `colorInfo` | `#1677ff` | 信息提示 |
| `colorBgLayout` | `#f5f5f5` | 页面背景 |
| `colorBgContainer` | `#ffffff` | 卡片、表格、表单、面板容器 |
| `colorBgElevated` | `#ffffff` | 弹窗、下拉、浮层 |
| `colorText` | `#2e2e2e` | 主文本 |
| `colorTextSecondary` | `#646464` | 次级文本 |
| `colorTextTertiary` | `#949494` | 说明 / 弱提示 |
| `colorTextQuaternary` | `#c4c4c4` | placeholder / disabled |
| `colorBorder` | `#dbdbdb` | 主边框 |
| `colorBorderSecondary` | `#f1f1f1` | 次级分割线 |

颜色使用规则：

- 主色只表达全局主操作、链接、选中态和焦点态，不作为大面积背景装饰。
- `success`、`warning`、`error`、`info` 只用于功能状态，不与品牌强调混用。
- 预设色板如 `blue`、`purple`、`cyan`、`green`、`magenta`、`red`、`orange`、`yellow`、`volcano`、`geekblue`、`gold`、`lime` 主要用于 Tag、图表和分类可视化。
- 产品代码中不要硬编码 `#ffffff`、`#fafafa` 等表面色，应引用语义 token。

### 排版

| 层级 | 字号 | 字重 | 行高 | 用途 |
| --- | --- | --- | --- | --- |
| `fontSizeHeading1` | 38 | 600 | 1.25 | 大标题，慎用 |
| `fontSizeHeading2` | 32 | 600 | 1.25 | 页面级标题 |
| `fontSizeHeading3` | 26 | 600 | 1.25 | 重要分区标题 |
| `fontSizeHeading4` | 22 | 600 | 1.25 | 分区标题 |
| `fontSizeHeading5` | 18 | 600 | 1.25 | 卡片 / 面板标题 |
| `fontSizeLG` | 18 | 400/600 | 1.571 | 强调正文 |
| `fontSize` | 14 | 400 | 1.571 | 默认正文、控件、表格 |
| `fontSizeSM` | 12 | 400 | 1.571 | 辅助信息、Tag |

字体栈：

```text
Inter, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif
```

排版规则：

- 中后台产品默认正文使用 14px，以保证信息密度和可扫描性。
- UI 字重优先使用 400 和 600，不使用 700+ 的重粗字作为状态强调。
- 选中 / 激活状态优先通过颜色、边框、下划线和背景表达，不通过突然加粗制造跳动。

### 间距与尺寸

| Token | 值 | 用途 |
| --- | --- | --- |
| `sizeXXS` | 4 | 极小间距 |
| `sizeXS` | 8 | 控件内小间距 |
| `sizeSM` | 12 | 紧凑间距 |
| `size` | 16 | 默认模块间距 |
| `sizeMD` | 20 | 中等间距 |
| `sizeLG` | 24 | 卡片内边距 / 分区间距 |
| `sizeXL` | 32 | 页面大分区间距 |
| `sizeXXL` | 48 | 大版块间距 |
| `controlHeight` | 32 | 默认按钮、输入框、选择器高度 |
| `controlHeightLG` | 40 | 大号控件 |
| `controlHeightSM` | 24 | 小号控件 |

布局规则：

- 间距整体落在 4px 网格上。
- 表单、筛选区、工具栏、表格和详情页应优先使用密集但有节奏的布局。
- 不使用任意 magic number；如确需新增尺寸，应先判断是否要扩展 token。

### 圆角

| Token | 值 | 用途 |
| --- | --- | --- |
| `borderRadiusXS` | 3 | 极小元素 |
| `borderRadiusSM` | 5 | 小标签、小控件 |
| `borderRadius` | 8 | 当前品牌包默认圆角 |
| `borderRadiusLG` | 10 | 大容器 / 浮层 |

注意：`assets/design.md` 中 Ant Design 语义说明以 6px 控件圆角、8px 容器圆角为基准；当前品牌 token 派生结果将 `borderRadius` 设为 8px、`borderRadiusLG` 设为 10px。项目实现时以 `system/tokens.default.json` 为准，但应保持“控件圆角小于或等于容器圆角”的层级关系。

### 动效

| Token | 值 | 用途 |
| --- | --- | --- |
| `motionDurationFast` | `0.1s` | hover、focus、press |
| `motionDurationMid` | `0.2s` | 折叠、淡入淡出、控件内部状态 |
| `motionDurationSlow` | `0.3s` | Modal、Drawer 等表层变化 |
| `motionEaseInOut` | `cubic-bezier(0.645, 0.045, 0.355, 1)` | 默认进出场 |
| `motionEaseOut` | `cubic-bezier(0.215, 0.61, 0.355, 1)` | 出场 / 展开 |

动效规则：

- 动效只服务于状态反馈、层级变化和空间关系，不做装饰性动效。
- 不随意新增 cubic-bezier；优先使用既有 motion token。

## 组件采用规则

| 组件 | 基准规则 |
| --- | --- |
| Button Primary | 每个决策区域只保留一个主按钮，表达最重要动作 |
| Button Default | 次级动作默认使用描边 / 默认按钮，不与主操作争夺注意力 |
| Input / Select | 默认高度 32px，focus 使用主色边框和可见焦点反馈 |
| Card | 用作真实内容容器，默认白底，容器间距清晰；避免卡片套卡片 |
| Modal | 用于阻断式决策或关键表单，不承载复杂多页流程 |
| Menu | 选中态使用淡蓝背景 + 主色文本，保证导航位置明确 |
| Tabs | 激活态使用主色文本 + 2px 下划线，不使用背景填充 |
| Table | 表头使用浅表面色和 600 字重；默认不做斑马纹，hover 再强调行 |
| Tag | 用于分类标签，不用于关键状态或错误提示 |
| Alert | 用于语义反馈，状态由图标、浅色背景和文案共同表达 |
| Badge | 可表达紧凑状态点，但不能替代可读文本 |
| Tooltip | 用于补充解释，黑色反相浮层，位置交给框架处理 |
| Dropdown | hover 使用浅表面色，不单独改变文本颜色 |

## 页面设计倾向

本项目若采用该设计系统，页面应优先呈现为工作台 / 控制台 / 业务操作界面：

- 首屏直接进入实际业务界面，不先做营销落地页。
- 页面布局应利于扫描、筛选、对比和连续操作。
- 表格、筛选区、批量操作、详情面板、抽屉、弹窗和状态提示应保持一致的控件语言。
- 避免大面积渐变、装饰插画、夸张 hero、过多卡片化包装和单色系视觉堆叠。
- 权限不足、只读、空数据、加载中、校验失败、冲突、提交成功等状态必须在设计阶段明确。

## 响应式验收矩阵

来源包要求实现时覆盖以下视口。后续 UI 原型、前端实现和截图验收应至少抽取这些尺寸中的核心断点：

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

- 不允许出现横向滚动，除非是明确设计的表格横向滚动容器。
- 工具栏、筛选区和批量操作区在窄屏下应重排或折叠。
- 表格密集场景应明确移动端替代形态，如卡片列表、关键列优先或详情抽屉。
- 文字不得溢出按钮、标签、表头、卡片和弹窗。

## 前端实现建议

如果前端使用 React + Ant Design：

- 使用 `ConfigProvider` 注入 `docs/design/tokens/theme.json` 中的 theme 配置。
- 组件样式优先通过 Ant Design token、component token、CSS variables 或主题算法表达。
- 消息、通知、Modal 静态方法应使用 `App`、hook API 或 context holder，避免主题上下文丢失。
- 暗色模式使用 `darkAlgorithm` 或 `docs/design/tokens/variables.dark.css`，不要手工反转颜色。
- 紧凑模式使用 `compactAlgorithm` 或 `docs/design/tokens/tokens.compact.json`，不要逐组件压缩高度。

如果前端不是 Ant Design：

- 先把 `docs/design/tokens/tokens.default.json` 转为项目设计 token，再映射到目标 UI 库。
- 保留组件语义和状态语义，不要只复制颜色。
- 尽量保持 32px 默认控件高度、14px 默认字号、4px 间距网格和三层表面模型。

## 设计审查清单

进入 PRD 校准、API 影响分析 / 契约草案或前端实现前，带 UI 的需求应检查：

- 是否引用本文件作为设计系统基线。
- 页面清单、用户主路径、异常路径和权限状态是否明确。
- loading、empty、error、readonly、disabled、no-permission、conflict、success 状态是否齐全。
- 表单字段、筛选条件、表格列、批量操作、详情字段是否能反推 API schema。
- 主操作是否唯一且清楚，次级操作是否降级。
- 是否存在硬编码颜色、任意间距、重复自造控件或与系统冲突的交互。
- 是否覆盖关键响应式断点。

## 后续落地 TODO

- 将 `docs/design/tokens/theme.json` 接入前端工程主题配置。
- 将 `docs/design/tokens/variables.css` 中的 `--brand-*` 变量纳入项目 token 管理。
- 如果项目启用暗色模式，补充 `docs/design/tokens/tokens.dark.json` 的使用规范和截图验收。
- 如果项目存在高密度表格 / 审批 / 运营台，补充 `docs/design/tokens/tokens.compact.json` 的适用边界。

## Ant Design v6 原型补充基线

本节根据 `antdv6-design.md` 的设计说明提炼，用于高保真原型和后续前端实现，不替代项目 token。

- 先按 `bg-layout`、`bg-container`、`bg-elevated`、文本、边框、状态、圆角和阴影等 semantic token 角色设计，再映射到 `ConfigProvider`、组件 token 或 CSS variables；不得用页面局部色值替代主题层。
- 默认亮色使用 `theme.defaultAlgorithm`；暗色和紧凑密度通过 theme algorithm 切换，禁止手工反色或逐控件压缩。
- 每个决策区域只保留一个 single primary action。保存、提交、审批、发布、导出和重试等动作必须提供 interaction feedback；不可逆或高风险动作使用确认弹窗。
- 对实际字号、图标和背景复核 accessibility contrast。默认 token 不足时，通过种子 token 或组件 token 调整，不引入单页特例色。
