# 设计系统治理与生命周期适配

> 规范源：仓库根目录 [`DESIGN.md`](../../DESIGN.md)。其中的 YAML frontmatter 和组件变体是视觉令牌的唯一事实来源；本文件只记录 YSS 的中文治理说明、运行时双轨、产品生命周期衔接和验证要求。

## 与 DESIGN.md 的职责边界

- `DESIGN.md`：机器可读的颜色、排版、圆角、间距和组件视觉变体规范；使用 Google `design.md` alpha 格式。
- `.template-spec/design/tokens/*`：由规范源投影的运行时快照，禁止直接修改后作为规范依据；使用 `scripts/design-md` 执行漂移检查。
- 本文件：解释 YSS UI / Ant Design 双轨、页面设计约束、原型证据和生命周期门禁，不重新定义规范 token 的具体值。
- Spec、交互说明和状态矩阵：继续承载业务状态、API、权限、并发、失败恢复和页面验收，不写入 `DESIGN.md`。

## 来源与定位

本文件基于本地设计系统包首次分析整理，并在后续用项目 Ant Design 5 Less / `:root` CSS 变量覆盖默认亮色主题。紧凑密度、间距和容器规格同时参考既有 YSS 实现。视觉 token 的规范源改为根目录 `DESIGN.md`；本文件和 `.template-spec/design/tokens/*` 是治理说明与派生视图。外部目录只作为历史输入或实现样本，不作为后续工程依赖，也不作为实现语言。

关键来源：

| 来源 | 作用 | 采用结论 |
| --- | --- | --- |
| Ant Design v6 官方主题与迁移文档 | semantic token、CSS variables、theme algorithm 组合与 DOM 兼容边界 | **上游机制权威**；项目覆盖不得改变其算法语义 |
| 历史 `Product-Design-System` 包 | 首次引入 Ant Design 企业级语义、状态矩阵和验收习惯 | 仅保留原则、组件规则和审查清单 |
| 项目 Ant Design 5 Less / `:root` 变量 | 品牌主色、运行时切换别名、色板与布局 token 的历史项目覆盖 | 保留经批准的品牌覆盖；不作为 v6 / Antdv Next API 事实 |
| `yss-meta` 的 `packages/src/styles` | 已落地的紧凑间距、Card 圆角、CSS 变量桥接和客户主题案例 | 只提取稳定语义；utility class、客户覆盖和兼容补丁不进入默认规范 |
| `.template-spec/design/tokens/tokens.default.json` | 默认亮色主题派生 token | 作为实现 token 基线 |
| `.template-spec/design/tokens/tokens.dark.json` | 暗色主题派生 token | 暗色仍走 `darkAlgorithm`；本轮未按新 seed 重派生完整暗色色板 |
| `.template-spec/design/tokens/tokens.compact.json` | 紧凑密度主题派生 token | 共享亮色 seed，紧凑高度算法保持现状 |
| `.template-spec/design/tokens/variables.css` | `--brand-*` 与运行时别名 | 前端实现时优先转换为项目 token |
| `.template-spec/design/tokens/theme.json` | Ant Design `ConfigProvider` theme 配置 | React + Ant Design 项目可直接参考 |

历史 Less 输入曾存在互相覆盖的默认值；裁定结果已迁入根 `DESIGN.md`。本文件不保留第二份值表。历史值、上游默认或客户覆盖只能作为追溯输入，不能反向覆盖 `DESIGN.md`；需要改变裁定时先改规范源，再重新生成 Token/CSS 投影并更新同步摘要。

`.m-1` / `.flex-*` 等 utility class、`::-webkit-scrollbar` 定制和原始 `.less` 文件不纳入规范正文，只可作为可选实现备注。

结论：这不是营销型视觉系统，而是面向中后台、数据密集、表单密集、流程密集产品的 Ant Design 风格企业级设计系统。项目内 UI 默认应以“清晰、确定、低装饰、可扫描、高一致性”为目标。

## 原型设计依据的优先级

当前原型以项目根 `DESIGN.md` 为视觉规范源，`.template-spec/design/design.md` 解释治理规则，`.template-spec/design/tokens/*` 是派生实现视图。需要真实 AntD 控件辅助评审时，上游资料只提供组件事实，不覆盖项目规范；在 `prototype-evidence.yaml` 中记录根规范与 Token digest，不把上游默认直接写回项目实现。

项目覆盖与官方默认的差异直接读取根 `DESIGN.md` 并用 `design-md diff` 核验；本文件不复制差异值。上游预设色板可以保留其自身颜色谱，但**色板预设 ≠ 品牌 seed**。

Codex `$design-qa` 的 Colors/tokens 与 Fonts/typography 对照必须以根 `DESIGN.md` 为 source visual truth，并用 `.template-spec/design/tokens/*` 复核实际投影；不得回退到上游默认或历史品牌值。执行清单见 `.agents/skills/yss-design-system/references/design-qa-theme.md`。

原型 H1/H2 默认使用 `html-css-js`，以本地 Token CSS 保留 YSS 企业后台视觉语言；复杂交互影响评审结论时可按集成说明选用 `react-antd-prebuilt`。生产实现只在目标工程按 lockfile 核验组件 API；原型阶段不调用 `yss-ui`。已有项目中冻结的组件库原型及其事实证据保持只读；模板不再预置 Antdv Next fact pack，也不生成新的 Provider 事实包。

### HTML 与生产主题的映射

HTML 直接使用 DESIGN.md 当前默认尺寸与主题 CSS，不要求 ConfigProvider 或组件库算法。生产库若使用 `defaultAlgorithm`、`darkAlgorithm`、`compactAlgorithm`，仍按其版本合同执行，避免把 compact 结果当 seed 再压缩。暗色能力只在派生 Token 和浏览器状态均核验后声明。

## 设计原则

本项目采用该设计系统时，优先遵循四个原则：

| 原则 | 项目解释 |
| --- | --- |
| Natural | 使用用户熟悉的中后台交互模式，不为了新奇牺牲效率 |
| Certain | 页面状态、操作反馈、校验错误、加载和权限状态必须明确 |
| Meaningful | 视觉强调只服务于任务、状态和主操作，避免无信息量装饰 |
| Growing | 支撑从简单表单到复杂表格、详情页、审批流和运营控制台的扩展 |

## Token 基线

本文件不再抄写视觉 Token 的具体值。规范值只从根 `DESIGN.md` 读取，运行时名称和值只从 `.template-spec/design/tokens/*` 派生快照读取；两者不一致时视为 drift，不在本文件中重新裁定。

### 颜色角色映射

| YSS 角色 | 规范源 | 运行时映射 |
| --- | --- | --- |
| 品牌 seed | `colors.primary` | `colorPrimary` / `--brand-color-primary` |
| 高对比主控件 | `components.button-primary*` | `--yss-color-primary-control*` 或组件 Token |
| 页面 / 容器 / 浮层 | `colors.canvas-layout` / `surface` / `surface-elevated` | 对应 `colorBg*` / `--brand-color-bg-*` |
| 主次文本 | `colors.text*` | 对应 `colorText*` / `--brand-color-text*` |
| 功能状态 | `colors.success*` / `warning*` / `error*` / `info-bg` | 对应状态 semantic Token |
| 边框 | `colors.border-secondary` | 对应边框 semantic Token |

颜色使用规则：

- 主色只表达全局主操作、链接、选中态和焦点态，不作为大面积背景装饰。
- `success`、`warning`、`error`、`info` 只用于功能状态，不与品牌强调混用。
- 预设色板主要用于 Tag、图表和分类可视化，不得当作项目品牌 seed。
- 产品代码中不要硬编码表面色，应引用语义 Token。
- 主色浅阶使用已投影的运行时变量，不要对 CSS 变量调用 Less `fade()`。

### 运行时主题变量

默认亮色支持运行时切换。`:root` 中的短名别名必须指向 `--brand-*`，不要再维护第二套色值。

| 运行时别名 | 指向 |
| --- | --- |
| `--primary-color` / hover / active | 对应 `--brand-color-primary*` |
| `--success-color` / warning / error / info | 对应 `--brand-color-*` 状态变量 |
| `--text-color*` | 对应 `--brand-color-text*` |
| `--border-color*` | 对应 `--brand-color-border*` |
| `--bg-color*` | 对应 `--brand-color-bg-*` |
| `--yss-color-primary-control*` | 对应根 `DESIGN.md` 主控件变体 |

切换主题时只改 `--brand-*` 或同步改短名别名；不要在页面里另写一套 Less 变量。

### 排版角色映射

| 角色 | 规范源 | 用途 |
| --- | --- | --- |
| 正文 | `typography.body` | 默认正文、控件、表格 |
| 强调正文 | `typography.body-strong` | 表头与必要强调 |
| 大 / 中标题 | `typography.heading-lg` / `heading-md` | 页面与分区层级 |
| 辅助文本 | `typography.caption` | 说明、Tag 与次级信息 |
| 按钮 | `typography.button` | 控件文字 |

排版规则：

- 字号、字重、行高和字体栈只从 `DESIGN.md` 对应排版角色读取。
- 不使用额外重粗字作为状态强调。
- 选中 / 激活状态优先通过颜色、边框、下划线和背景表达，不通过突然加粗制造跳动。
- 不把 `Inter` 或其他品牌字体写成强制默认栈；项目若要引入品牌字体，必须先更新本文件和 token 快照。

### 间距、尺寸与圆角映射

| 角色 | 规范源 |
| --- | --- |
| 间距阶梯 | `spacing.*` |
| 控件高度 | `components.button-*` / `input-*` 的 `height` |
| 页面 / Card 内边距 | `components.page-shell` / `card-compact` |
| 控件 / 容器圆角 | `rounded.*` 与组件变体的 `rounded` |

布局规则：

- 间距只使用 `spacing.*`；不要补写未登记的中间值。
- 表单、筛选区、工具栏、表格和详情页应优先使用密集但有节奏的布局。
- 不使用任意 magic number；如确需新增尺寸，应先判断是否要扩展 token。

### 默认密度与可选紧凑密度

原型和前端工程默认采用 Data Quality 全局主题：浅色、14px 正文、32px 控件、20px Card 内距，不默认开启 compact。下表仅用于明确选择紧凑模式的页面；紧凑模式消费 `tokens.compact.json`，不得再次压缩。

| 场景 | Padding | Margin / Gap | 说明 |
| --- | --- | --- | --- |
| 页面内容区 | `components.page-shell.padding`；窄屏 `spacing.sm` | 一级区域 `spacing.md` | 页面外缘由布局容器统一提供，子模块不得重复增加外边距 |
| Card | `components.card-compact.padding`；密集 Card 可用 `spacing.sm` | Card 之间 `spacing.sm` | Card header 与 body 使用同一水平 padding；禁止 Card 套 Card 制造层级 |
| 筛选区 / 工具栏 | 垂直 `spacing.xs`、水平 `spacing.sm` | 控件间 `spacing.xs`；与主体 `spacing.sm` | 优先单行排列，空间不足时按字段组换行，不压缩到不可读 |
| 表单 | 区块 `spacing.md` | 表单项与同行字段 `spacing.sm` | label 与控件的局部间距由组件 Token 负责，不在页面重复覆盖 |
| 表格 / 列表 | 容器 `0` 或 `spacing.sm` | 工具栏与表格 `spacing.xs` | 表格内部 cell padding 使用组件紧凑规格，不用页面 CSS 逐列覆盖 |
| Modal / Drawer | `spacing.md` | 内容区块 `spacing.sm`；操作区 `spacing.xs` | 复杂多步流程不塞入 Modal，改用独立页面或 Drawer 分区 |

紧凑模式的计算值以 `.template-spec/design/tokens/tokens.compact.json` 为准，它来自 `.template-spec/design/tokens/theme.json` 的 seed 叠加一次 compact algorithm。业务页面只消费计算后的语义层级，不复制外部样例中的 `.m-*` / `.p-*` utility class，也不再次缩放。

Margin 使用规则：组件自身默认不声明外部 margin，兄弟元素之间优先由父级 `gap` 管理；只有文档流语义或无法使用布局容器时才使用 margin，并仍限定在 `spacing.*` 阶梯内。禁止用负 margin 修补布局。

### 布局 token

| 角色 | 值来源 | 用途 |
| --- | --- | --- |
| 顶栏 / 侧栏 / 页面背景 | `DESIGN.md` 的 `colors.surface` / `colors.canvas-layout` | 应用壳布局 |
| Provider 断点 | 目标组件库精确版本的公开 Grid Token | 栅格和布局折叠 |
| 截图视口 | 本文件“响应式与多端验收”矩阵 | 浏览器验收，不反写为组件 Token |

这些断点用于栅格、隐藏工具类和布局折叠，不替换下方截图验收视口矩阵。

### 圆角

| Token | 值 | 用途 |
| --- | --- | --- |
| `borderRadiusXS` | 2 | 极小元素 |
| `borderRadiusSM` | 4 | 小标签、小控件 |
| `borderRadius` | 6 | 默认控件圆角 |
| `borderRadiusLG` | 8 | Card、大容器 / 浮层 |

保持“控件圆角小于或等于容器圆角”：控件使用 `rounded.sm/md`，Card 与普通容器使用 `rounded.lg`。更大的 panel 圆角属于局部产品扩展，不作为紧凑型默认值；确需使用时必须先登记规范角色，不能让同一页面任意混用。实现时以根 `DESIGN.md` 与 `.template-spec/design/tokens/tokens.default.json` 为默认基线。

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
| Input / Select | 使用 `components.input-*` 的高度与圆角；focus 使用主色边框和可见焦点反馈 |
| Card | 使用 `components.card-compact`；外部 gap 使用 `spacing.sm`，避免卡片套卡片 |
| Modal | 用于阻断式决策或关键表单，不承载复杂多页流程 |
| Menu | 选中态使用淡蓝背景 + 主色文本，保证导航位置明确 |
| Tabs | 激活态使用主色文本 + Provider semantic indicator，不使用背景填充 |
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
| H2 `flow-review` | 主流程、权限、失败恢复、复杂联动和冲突 | 浏览器可运行流程；默认 HTML/CSS/JavaScript 离线资源包，场景可重复触发和重置 | H1 共同证据 + 主流程、关键异常、zoom/reduced-motion；视觉回归按风险 |

- H1 不得为了“显得完整”创建空 `package.json`、lockfile 或 AntD 证据。H2 不得声明真实目标组件已验证。
- 原型中识别出的生产组件假设与待验行为写入 `implementation_handoff`，由 `frontend_implementation_plan` 和 `frontend_implementation_verification` 承接；不得在原型阶段引入 `yss-ui`、目标 lockfile 或 Storybook。
- 新视觉方向、信息架构不确定或有多个合理方案时执行三方案 ideation；复用已批准视觉模式时记录 source visual 与 `not-applicable` 理由。
- 默认使用 Data Quality 的32px控件与20px Card内距，紧凑模式显式选择；页面 padding、gap、Card 圆角、Card padding 和控件高度必须在浏览器计算样式中可复核。
- Design QA、浏览器验证和视觉目标使用同一视口与同一状态；默认 desktop `1440×900`、narrow `390×844`。
- Design QA 统一覆盖 visual、layout、interaction、content、accessibility、cross-platform 六轴，不再复制第二份检查清单。
- 交付包包含所有实际使用的本地资源和 Token 副本，登记摘要；复制到独立目录后以 `file://` 无网络复验。模板结构检查不替代浏览器证据。
- 原型源码默认 throwaway；项目 Token、组件语义映射、状态、测试场景和验收标准可以进入下游，源码复用仍需 实现合同编译器、Slice Contract 与 TDD。
- 用户确认只覆盖原型确认的决定、可操作范围、模拟/gap 与接受结论；HTML、story 或截图存在都不代表产品设计聚合门禁已经通过。

### 无障碍覆盖

品牌 Seed `colors.primary` 保持项目身份，不等于每个组件状态都必须直接使用该填充。普通文本或控件状态不满足 WCAG 2.2 AA 时，优先使用 `components.*` 的高对比变体或通过组件 Token 调整，并同时验证 default、hover、active、disabled 与 focus；不得用单页特例色绕过主题层。

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

- 使用 `ConfigProvider` 注入 `.template-spec/design/tokens/theme.json` 中的 theme 配置。
- 默认采用 Data Quality 浅色与 32px 控件；仅显式紧凑模式使用 `compactAlgorithm`；暗色工作界面组合 `darkAlgorithm` 与 `compactAlgorithm`。seed 与计算结果分别从 `theme.json`、`tokens.compact.json` 读取。
- 组件样式优先通过 Ant Design token、component token、CSS variables 或主题算法表达。
- 消息、通知、Modal 静态方法应使用 `App`、hook API 或 context holder，避免主题上下文丢失。
- 暗色模式使用 `darkAlgorithm` 或 `.template-spec/design/tokens/variables.dark.css`，不要手工反转颜色。本轮只同步了暗色的字体栈和圆角 seed；完整暗色色板仍是历史算法结果，启用暗色前应再派生一次。
- 紧凑模式默认使用 `compactAlgorithm` 或 `.template-spec/design/tokens/tokens.compact.json`，不要逐组件压缩高度；选择紧凑模式的原型交付物按紧凑 token 验收实际 padding、gap、Card 圆角和控件高度。

H1/H2 原型使用 HTML/CSS/JavaScript：

- 使用根 `DESIGN.md` 派生的本地 Token CSS，保留来源摘要。
- 规范直出按 Token、状态矩阵和页面模式验收；已有批准视觉稿时按相同视口与状态比对。首版截图通过审查与用户确认后冻结，不能自我比较作为质量证明。
- 提供场景入口和重置，覆盖关键异常恢复、代表性业务内容、长文本与窄屏。复杂控件的生产能力假设进入既有 handoff。

如果前端不是 Ant Design：

- 先把 `.template-spec/design/tokens/tokens.default.json` 转为项目设计 token，再映射到目标 UI 库。
- 保留组件语义和状态语义，不要只复制颜色。
- 保持 `theme.json` 的基础 seed，并映射 `tokens.compact.json` 的计算结果；排版、间距和表面角色从根 `DESIGN.md` 读取。
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

- 将 `.template-spec/design/tokens/theme.json` 作为 Data Quality 默认主题接入原型主题配置。
- 将 `.template-spec/design/tokens/variables.css` 中的 `--brand-*` 与运行时别名纳入项目 token 管理。
- 如果项目启用暗色模式，用 `darkAlgorithm` 按新 seed 重派生 `.template-spec/design/tokens/tokens.dark.json`，并补充截图验收。
- 让 H1/H2 原型适配器默认接入项目 Token，并在浏览器证据中记录实际计算后的 padding、gap、Card 圆角和控件高度。

## HTML 原型补充基线

参见 `.agents/skills/yss-prototype-stage/references/html-prototype-practices.md`。复用现有六轴 QA 与 Visual Baseline，新增能力只补充其执行方式，不另建交接文档。原生语义优先，弹窗与自定义控件的 ARIA 属性必须对应真实键盘/焦点行为。样式采用项目 Token，关键反馈保留可读文本，场景重置后再采集浏览器证据。

## AntD 条件预构建

高保真默认原生 HTML；简化模拟影响关键评审结论时，按原型技能的 `references/antd-integration.md` 条件使用 `react-antd-prebuilt`。交付格式与视觉权威不变；React 仅作为随包浏览器运行时，作者依赖与构建工具不交付给接收者。
