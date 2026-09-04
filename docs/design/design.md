# 设计系统治理与生命周期适配

> 规范源：仓库根目录 [`DESIGN.md`](../../DESIGN.md)。其中的 YAML frontmatter 和组件变体是视觉令牌的唯一事实来源；本文件只记录 YSS 的中文治理说明、运行时双轨、产品生命周期衔接和验证要求。

## 与 DESIGN.md 的职责边界

- `DESIGN.md`：机器可读的颜色、排版、圆角、间距和组件视觉变体规范；使用 Google `design.md` alpha 格式。
- `docs/design/tokens/*`：由规范源投影的运行时快照，禁止直接修改后作为规范依据；使用 `scripts/design-md` 执行漂移检查。
- 本文件：解释 YSS UI / Ant Design 双轨、页面设计约束、原型证据和生命周期门禁，不重新定义规范 token 的具体值。
- Spec、交互说明和状态矩阵：继续承载业务状态、API、权限、并发、失败恢复和页面验收，不写入 `DESIGN.md`。

## 规范校验

模板源维护者在修改设计令牌后执行（项目实例不包含 `.template-source` 工具目录）：

```bash
node .template-source/tooling/node/scripts/design-md.mjs lint DESIGN.md
node .template-source/tooling/node/scripts/design-md.mjs drift
```

`lint` 固定调用 `@google/design.md@0.4.0`，同时执行本地 frontmatter、章节、组件属性和引用校验；`drift` 检查规范源与全部 token/CSS 派生产物的哈希。任何漂移都必须回写规范源并重新生成投影。

## 来源与定位

本文件基于本地设计系统包首次分析整理，并在后续用项目 Ant Design 5 Less / `:root` CSS 变量覆盖默认亮色主题。紧凑密度、间距和容器规格同时参考既有 YSS 实现。视觉 token 的规范源改为根目录 `DESIGN.md`；本文件和 `docs/design/tokens/*` 是治理说明与派生视图。外部目录只作为历史输入或实现样本，不作为后续工程依赖，也不作为实现语言。

关键来源：

| 来源 | 作用 | 采用结论 |
| --- | --- | --- |
| 历史 `Product-Design-System` 包 | 首次引入 Ant Design 企业级语义、状态矩阵和验收习惯 | 保留原则、组件规则和审查清单 |
| 项目 Ant Design 5 Less / `:root` 变量 | 默认亮色主题、运行时切换别名、色板与布局 token | **默认主题权威**；冲突时以 `:root` 为准 |
| `yss-meta` 的 `packages/src/styles` | 已落地的紧凑间距、Card 圆角、CSS 变量桥接和客户主题案例 | 只提取稳定语义；utility class、客户覆盖和兼容补丁不进入默认规范 |
| `docs/design/tokens/tokens.default.json` | 默认亮色主题派生 token | 作为实现 token 基线 |
| `docs/design/tokens/tokens.dark.json` | 暗色主题派生 token | 暗色仍走 `darkAlgorithm`；本轮未按新 seed 重派生完整暗色色板 |
| `docs/design/tokens/tokens.compact.json` | 紧凑密度主题派生 token | 共享亮色 seed，紧凑高度算法保持现状 |
| `docs/design/tokens/variables.css` | `--brand-*` 与运行时别名 | 前端实现时优先转换为项目 token |
| `docs/design/tokens/theme.json` | Ant Design `ConfigProvider` theme 配置 | React + Ant Design 项目可直接参考 |

同份 Less 输入存在两套互相覆盖的默认值。项目裁定如下，并已写入 token 快照：

| 项 | 采用 | 丢弃 |
| --- | --- | --- |
| 主色 | `#3371ff`（`--primary-color`） | `#3177ff` fallback、历史 `#1677ff` |
| 信息色 | `#3371ff` | 历史 `#1677ff` |
| 错误色 | `#f5222d` | 历史 `#ff4d4f` |
| 页面背景 | `#f0f2f5` | 历史 `#f5f5f5` |
| 主文本 / 次文本 | `rgba(0, 0, 0, 0.88)` / `rgba(0, 0, 0, 0.65)` | `#2e2e2e` / `#646464` |
| 边框 / 分割线 | `#d9d9d9` / `#f0f0f0` | `#dbdbdb` / `#f1f1f1` |
| 默认圆角 | `6px` | Less 前半 `4px`、历史品牌 `8px` |
| 字体栈 | 系统栈 | 强制 `Inter` |
| hover / active | `#4096ff` / `#0958d9`（`:root` 显式值） | 由新主色算法重算 |

`.m-1` / `.flex-*` 等 utility class、`::-webkit-scrollbar` 定制和原始 `.less` 文件不纳入规范正文，只可作为可选实现备注。

结论：这不是营销型视觉系统，而是面向中后台、数据密集、表单密集、流程密集产品的 Ant Design 风格企业级设计系统。项目内 UI 默认应以“清晰、确定、低装饰、可扫描、高一致性”为目标。

## 原型设计依据的优先级

原型使用 Ant Design 时，`https://ant.design/design.md` 与官方 `antd` CLI 提供的是**上游默认**和组件事实；项目的 `docs/design/design.md`、`docs/design/tokens/*` 是经过确认的**项目覆盖**。当前功能只能在这两层之下完成语义组件映射。若上游默认与项目 token 不同，以项目覆盖为准，并在 `prototype-evidence.yaml` 中记录差异；不得把上游默认直接写回项目实现。

当前项目覆盖与官方默认的主要差异：主色 `#3371ff` ≠ 官方 `#1677ff`，错误色 `#f5222d` ≠ 官方 `#ff4d4f`，页面背景 `#f0f2f5`，文本使用 Ant Design 透明度阶，默认圆角 `6px`。`blue` 等预设色板仍可保留官方蓝谱；**色板预设 ≠ 品牌主色**。

Codex `$design-qa` 的 Colors/tokens 与 Fonts/typography 对照必须以本文件和 `docs/design/tokens/*` 为 source visual truth，而不是官方默认或历史 `#1677ff` / `Inter` / `8px` 品牌圆角。执行清单见 `.agents/skills/yss-design-system/references/design-qa-theme.md`。

版本边界按原型档位处理：H1 直接消费项目 Token；H2 仅在采用 React AntD 时以 Ant Design v6 的 `design.md`、semantic token 和标准组件事实为补充。原型阶段不得调用 `yss-ui`；生产实现进入批准切片后才从目标实现仓 lockfile 中读取 Vue 3、YSS UI 与 Ant Design Vue 的真实 API。原型到生产只迁移视觉角色、项目 Token、状态和验收行为，禁止把 React hook、props、JSX、静态 API 或事件模型当作 Vue 合同。

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
| `colorPrimary` | `#3371ff` | 主按钮、链接、焦点、选中态、激活导航 |
| `colorPrimaryHover` | `#4096ff` | 主色 hover |
| `colorPrimaryActive` | `#0958d9` | 主色 active |
| `colorSuccess` | `#52c41a` | 成功状态 |
| `colorWarning` | `#faad14` | 警告状态 |
| `colorError` | `#f5222d` | 错误状态 |
| `colorInfo` | `#3371ff` | 信息提示 |
| `colorBgLayout` | `#f0f2f5` | 页面背景 |
| `colorBgContainer` | `#ffffff` | 卡片、表格、表单、面板容器 |
| `colorBgElevated` | `#ffffff` | 弹窗、下拉、浮层 |
| `colorText` | `rgba(0, 0, 0, 0.88)` | 主文本 |
| `colorTextSecondary` | `rgba(0, 0, 0, 0.65)` | 次级文本 |
| `colorTextTertiary` | `#8c8c8c` | 说明 / 弱提示 |
| `colorTextQuaternary` | `#bfbfbf` | placeholder / disabled |
| `colorBorder` | `#d9d9d9` | 主边框 |
| `colorBorderSecondary` | `#f0f0f0` | 次级分割线 |

颜色使用规则：

- 主色只表达全局主操作、链接、选中态和焦点态，不作为大面积背景装饰。
- `success`、`warning`、`error`、`info` 只用于功能状态，不与品牌强调混用。
- 预设色板如 `blue`、`purple`、`cyan`、`green`、`magenta`、`red`、`orange`、`yellow`、`volcano`、`geekblue`、`gold`、`lime` 主要用于 Tag、图表和分类可视化；其中 `blue-6` 仍可能是官方 `#1677ff`，不得当作品牌主色。
- 产品代码中不要硬编码 `#ffffff`、`#fafafa` 等表面色，应引用语义 token。
- 主色浅阶 `primary-1` 使用 `color-mix(in srgb, var(--primary-color) 10%, transparent)`，不要对 CSS 变量调用 Less `fade()`。

### 运行时主题变量

默认亮色支持运行时切换。`:root` 中的短名别名必须指向 `--brand-*`，不要再维护第二套色值。

| 运行时别名 | 指向 | 默认值 |
| --- | --- | --- |
| `--primary-color` | `--brand-color-primary` | `#3371ff` |
| `--primary-color-hover` | `--brand-color-primary-hover` | `#4096ff` |
| `--primary-color-active` | `--brand-color-primary-active` | `#0958d9` |
| `--primary-1` | `color-mix(in srgb, var(--primary-color) 10%, transparent)` | 主色 10% 透明 |
| `--primary-7` | `--primary-color-active` | `#0958d9` |
| `--success-color` | `--brand-color-success` | `#52c41a` |
| `--warning-color` | `--brand-color-warning` | `#faad14` |
| `--error-color` | `--brand-color-error` | `#f5222d` |
| `--info-color` | `--brand-color-info` | `#3371ff` |
| `--text-color` | `--brand-color-text` | `rgba(0, 0, 0, 0.88)` |
| `--text-color-secondary` | `--brand-color-text-secondary` | `rgba(0, 0, 0, 0.65)` |
| `--border-color` | `--brand-color-border` | `#d9d9d9` |
| `--border-color-split` | `--brand-color-border-secondary` | `#f0f0f0` |
| `--bg-color` | `--brand-color-bg-layout` | `#f0f2f5` |
| `--bg-color-container` | `--brand-color-bg-container` | `#ffffff` |

切换主题时只改 `--brand-*` 或同步改短名别名；不要在页面里另写一套 Less 变量。

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
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"
```

排版规则：

- 中后台产品默认正文使用 14px，以保证信息密度和可扫描性。
- UI 字重优先使用 400 和 600，不使用 700+ 的重粗字作为状态强调。
- 选中 / 激活状态优先通过颜色、边框、下划线和背景表达，不通过突然加粗制造跳动。
- 不把 `Inter` 或其他品牌字体写成强制默认栈；项目若要引入品牌字体，必须先更新本文件和 token 快照。

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

### 紧凑密度（默认原型规格）

原型交付物和中后台数据密集页面默认使用紧凑密度。紧凑密度不是把所有间距机械缩小，而是使用 `docs/design/tokens/tokens.compact.json` 和下表控制页面节奏；没有明确的展示型或触屏场景时，不切回宽松密度。

| 场景 | Padding | Margin / Gap | 说明 |
| --- | --- | --- | --- |
| 页面内容区 | 桌面端 `16px`；窄屏 `12px` | 一级区域 `16px` | 页面外缘由布局容器统一提供，子模块不得重复增加外边距 |
| Card | 默认 `16px`；表格 / 筛选密集 Card 可用 `12px` | Card 之间 `12px` | Card header 与 body 使用同一水平 padding；禁止 Card 套 Card 制造层级 |
| 筛选区 / 工具栏 | 垂直 `8px`、水平 `12px` | 控件间 `8px`；与主体 `12px` | 优先单行排列，空间不足时按字段组换行，不压缩到不可读 |
| 表单 | 区块 `16px` | 表单项纵向 `12px`；同行字段 `12px` | label 与控件的局部间距由组件 token 负责，不在页面重复覆盖 |
| 表格 / 列表 | 容器 `0` 或 `12px`，由是否独立成 Card 决定 | 工具栏与表格 `8px` | 表格内部 cell padding 使用组件紧凑规格，不用页面 CSS 逐列覆盖 |
| Modal / Drawer | `16px` | 内容区块 `12px`；操作区 `8px` | 复杂多步流程不塞入 Modal，改用独立页面或 Drawer 分区 |

紧凑模式的基础 token 为：`sizeXXS=4`、`sizeXS=8`、`sizeSM=8`、`size=12`、`sizeMD=16`、`sizeLG=16`、`sizeXL=24`、`sizeXXL=32`；默认控件高度 `28px`，小号 `21px`，大号 `35px`。业务页面只消费这些语义层级，不复制外部样例中的 `.m-*` / `.p-*` utility class。

Margin 使用规则：组件自身默认不声明外部 margin，兄弟元素之间优先由父级 `gap` 管理；只有文档流语义或无法使用布局容器时才使用 margin，并仍限定在 `4/8/12/16/24/32px` 阶梯内。禁止用负 margin 修补布局。

### 布局 token

| Token | 值 | 用途 |
| --- | --- | --- |
| `layoutHeaderHeight` | `64px` | 顶栏高度 |
| `layoutSiderBackground` | `#001529` | 深色侧栏背景 |
| `layoutBodyBackground` | `#f0f2f5` | 与 `colorBgLayout` 对齐的页面背景 |
| `screenXS` | `480px` | 布局断点 |
| `screenSM` | `576px` | 布局断点 |
| `screenMD` | `768px` | 布局断点 |
| `screenLG` | `992px` | 布局断点 |
| `screenXL` | `1200px` | 布局断点 |
| `screenXXL` | `1600px` | 布局断点 |

这些断点用于栅格、隐藏工具类和布局折叠，不替换下方截图验收视口矩阵。

### 圆角

| Token | 值 | 用途 |
| --- | --- | --- |
| `borderRadiusXS` | 2 | 极小元素 |
| `borderRadiusSM` | 4 | 小标签、小控件 |
| `borderRadius` | 6 | 默认控件圆角 |
| `borderRadiusLG` | 8 | Card、大容器 / 浮层 |

保持“控件圆角小于或等于容器圆角”：默认控件 `6px`，小控件 `4px`，Card 与普通容器统一 `8px`。外部实现中的 `12px` panel 圆角属于局部产品扩展，不作为紧凑型默认值；确需使用时必须有明确层级语义，不能让同一页面的 Card 在 `8px`、`12px` 间任意混用。实现时以 `docs/design/tokens/tokens.compact.json` 为紧凑密度基线。

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
| Input / Select | 紧凑模式默认高度 28px，focus 使用主色边框和可见焦点反馈 |
| Card | 用作真实内容容器，默认白底、`8px` 圆角、`16px` 内边距和 `12px` 外部 gap；避免卡片套卡片 |
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

## 原型交付规格

原型交付物必须提供可在浏览器运行或复验的稳定入口，而不是只给截图、设计说明或生产前端代码。默认入口为 `docs/.scratch/<feature>/design/prototypes/index.html`；也可交付稳定 URL。关联资源保持相对路径可移植，不强制内联成单文件。

低保真与状态矩阵经独立 `prototype-review` 后，按风险选择满足当前决策的最低档位：

| 档位 | 用途 | 技术边界 | 最低验证 |
|---|---|---|---|
| H1 `visual-review` | 布局、密度、层级、文案和少量关键交互 | 语义 HTML/CSS/最小 JS 或设计工具导出；无需 Node、package、lockfile 或 AntD CLI | desktop/narrow 非空渲染、项目 Token、console、关键交互、基础键盘/焦点/对比度；zoom/reduced-motion 按影响 |
| H2 `flow-review` | 主流程、权限、失败恢复、复杂联动和冲突 | 浏览器可运行流程；React/Vite + AntD v6 是受支持默认而非强制 | H1 共同证据 + 主流程、关键异常、zoom/reduced-motion；视觉回归按风险 |

- H1 不得为了“显得完整”创建空 `package.json`、lockfile 或 AntD 证据。H2 不得声明真实目标组件已验证。
- 原型中识别出的生产组件假设与待验行为写入 `implementation_handoff`，由 `frontend_implementation_plan` 和 `frontend_implementation_verification` 承接；不得在原型阶段引入 `yss-ui`、目标 lockfile 或 Storybook。
- 新视觉方向、信息架构不确定或有多个合理方案时执行三方案 ideation；复用已批准视觉模式时记录 source visual 与 `not-applicable` 理由。
- 默认启用紧凑密度；页面 padding、gap、Card 圆角、Card padding 和控件高度必须在浏览器计算样式中可复核。
- Design QA、浏览器验证和视觉目标使用同一视口与同一状态；默认 desktop `1440×900`、narrow `390×844`。
- Design QA 统一覆盖 visual、layout、interaction、content、accessibility、cross-platform 六轴，不再复制第二份检查清单。
- AntD fact pack 仅在精确版本、组件集合、项目 Token baseline digest 相同且没有新 API 疑问时复用；否则做增量查询。`lint/doctor` 只在存在相关 React 源时执行。
- 原型源码默认 throwaway；项目 Token、组件语义映射、状态、测试场景和验收标准可以进入下游，源码复用仍需 实现合同编译器、Slice Contract 与 TDD。
- 用户确认只覆盖原型确认的决定、可操作范围、模拟/gap 与接受结论；HTML、story 或截图存在都不代表三个产品设计门禁已经通过。

### 无障碍覆盖

品牌 Seed `#3371ff` 保持项目身份，不等于每个组件状态都必须直接使用该填充。普通文本或控件状态不满足 WCAG 2.2 AA 时，优先通过组件 Token 调整实际填充色或文字色，并同时验证 default、hover、active、disabled 与 focus；不得用单页特例色绕过主题层。

原型证据按档位覆盖无障碍：所有档位至少检查对比度、键盘导航、焦点顺序与可见焦点；H2 追加语义标签/Dialog、200% zoom、`prefers-reduced-motion`、目标尺寸及适用扫描。组件库默认能力不能替代对真实页面 DOM 与交互的验证。

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

布局 CSS 断点补充：`480 / 576 / 768 / 992 / 1200 / 1600`。它们用于栅格和显示/隐藏，不替代上表截图验收尺寸。

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
- 暗色模式使用 `darkAlgorithm` 或 `docs/design/tokens/variables.dark.css`，不要手工反转颜色。本轮只同步了暗色的字体栈和圆角 seed；完整暗色色板仍是历史算法结果，启用暗色前应再派生一次。
- 紧凑模式默认使用 `compactAlgorithm` 或 `docs/design/tokens/tokens.compact.json`，不要逐组件压缩高度；原型交付物必须按紧凑 token 验收实际 padding、gap、Card 圆角和控件高度。

如果前端不是 Ant Design：

- 先把 `docs/design/tokens/tokens.default.json` 转为项目设计 token，再映射到目标 UI 库。
- 保留组件语义和状态语义，不要只复制颜色。
- 尽量保持 32px 默认控件高度、14px 默认字号、4px 间距网格和三层表面模型。
- 运行时动态换肤使用 `--primary-color` 等短名别名，或直接改 `--brand-*`。

## 设计审查清单

进入 Spec 校准、API 影响分析 / 契约草案或前端实现前，带 UI 的需求应检查：

- 是否引用本文件作为设计系统基线。
- 页面清单、用户主路径、异常路径和权限状态是否明确。
- loading、empty、error、readonly、disabled、no-permission、conflict、success 状态是否齐全。
- 表单字段、筛选条件、表格列、批量操作、详情字段是否能反推 API schema。
- 主操作是否唯一且清楚，次级操作是否降级。
- 是否存在硬编码颜色、任意间距、重复自造控件或与系统冲突的交互。
- 是否覆盖关键响应式断点。
- Codex `$design-qa` 是否按项目覆盖对照主色、错误色、背景、文本、圆角和字体栈。

## 后续落地 TODO

- 将 `docs/design/tokens/theme.json` 接入前端工程主题配置。
- 将 `docs/design/tokens/variables.css` 中的 `--brand-*` 与运行时别名纳入项目 token 管理。
- 如果项目启用暗色模式，用 `darkAlgorithm` 按新 seed 重派生 `docs/design/tokens/tokens.dark.json`，并补充截图验收。
- 让三档原型适配器默认接入项目 Token，并在浏览器证据中记录实际计算后的 padding、gap、Card 圆角和控件高度。

## Ant Design v6 原型补充基线

本节根据官方 `https://ant.design/design.md` 与目标版本的 `antd design.md --format json` 提炼，仅用于采用 React AntD 的 H2 和语义映射，不替代项目 token，也不提供 Ant Design Vue API。

- 先按 `bg-layout`、`bg-container`、`bg-elevated`、文本、边框、状态、圆角和阴影等 semantic token 角色设计，再映射到 `ConfigProvider`、组件 token 或 CSS variables；不得用页面局部色值替代主题层。
- 默认亮色使用 `theme.defaultAlgorithm`；相关 H2 默认叠加紧凑密度 algorithm，暗色和紧凑密度均通过 theme algorithm 切换，禁止手工反色或逐控件压缩。
- 每个决策区域只保留一个 single primary action。保存、提交、审批、发布、导出和重试等动作必须提供 interaction feedback；不可逆或高风险动作使用确认弹窗。
- 对实际字号、图标和背景复核 accessibility contrast。默认 token 不足时，通过种子 token 或组件 token 调整，不引入单页特例色。
