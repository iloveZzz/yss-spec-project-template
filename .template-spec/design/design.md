# 设计系统治理与生命周期适配

> 规范源：仓库根目录 [`DESIGN.md`](../../DESIGN.md)。其中的 YAML frontmatter 和组件变体是视觉令牌的唯一事实来源；本文件只记录 YSS 的中文治理说明、产品生命周期衔接和验证要求。

已核验 `matt-spec-v1` 的新 Spec 按 `yss-product-lifecycle` 与 `yss-prototype-stage` 根据当前问题和风险选择设计表达与检查。本文件的 H1/H2、六轴 QA、阶段资产及批准要求适用于采用相应历史合同的工作，不作为新 Spec 的通用前提；已有合同仍按原政策核验。

## 与 DESIGN.md 的职责边界

- `DESIGN.md`：机器可读的颜色、排版、圆角、间距和组件视觉变体规范；使用 Google `design.md` alpha 格式。
- Spec、交互说明和状态矩阵：继续承载业务状态、API、权限、并发、失败恢复和页面验收，不写入 `DESIGN.md`。

## 来源与定位

本文件基于本地设计系统包首次分析整理，并在后续用项目 Ant Design 5 Less / `:root` CSS 变量覆盖默认亮色主题。紧凑密度、间距和容器规格同时参考既有 YSS 实现。视觉 token 的规范源改为根目录 `DESIGN.md`；本文件和 `.template-spec/design/tokens/*` 是治理说明与派生视图。外部目录只作为历史输入或实现样本，不作为后续工程依赖，也不作为实现语言。

关键来源：

| 来源 | 作用 | 采用结论 |
| --- | --- | --- |
| 历史 `Product-Design-System` 包 | 首次引入 Ant Design 企业级语义、状态矩阵和验收习惯 | 仅保留原则、组件规则和审查清单 |
| 项目历史 Less / `:root` 变量 | 品牌主色、运行时切换别名、色板与布局 token 的历史项目覆盖 | 保留经批准的视觉覆盖；不作为新组件库 API 事实 |
| `yss-meta` 的 `packages/src/styles` | 已落地的紧凑间距、Card 圆角、CSS 变量桥接和客户主题案例 | 只提取稳定语义；utility class、客户覆盖和兼容补丁不进入默认规范 |
| `.template-spec/design/tokens/tokens.default.json` | 默认亮色主题派生 token | 作为实现 token 基线 |
| `.template-spec/design/tokens/tokens.dark.json` | 历史暗色主题快照 | 尚未按当前规范验证；启用前核验实际颜色与对比度 |
| `.template-spec/design/tokens/tokens.compact.json` | 历史紧凑主题快照 | 不作为新原型密度的默认依据 |
| `.template-spec/design/tokens/variables.css` | `--brand-*` 与运行时别名 | 前端实现时优先转换为项目 token |
| `.template-spec/design/tokens/theme.json` | 历史主题映射快照 | 只作为当前基线校验输入，不作为组件库接入指南 |

历史 Less 输入曾存在互相覆盖的默认值；裁定结果已迁入根 `DESIGN.md`。本文件不保留第二份值表。历史值、上游默认或客户覆盖只能作为追溯输入，不能反向覆盖 `DESIGN.md`；需要改变规范时先修改规范源，并按项目实际组件库维护投影和同步摘要。旧主题完整派生已退役，不以历史算法伪造新快照。

`.m-1` / `.flex-*` 等 utility class、`::-webkit-scrollbar` 定制和原始 `.less` 文件不纳入规范正文，只可作为可选实现备注。

项目现有视觉基线面向数据、表单和流程密集的业务界面；项目内 UI 应以“清晰、确定、可扫描和一致性”为目标。其他项目的风格由其自身规范和需求决定。

## 原型设计依据的优先级

当前原型以项目根 `DESIGN.md` 为视觉规范源，`.template-spec/design/design.md` 解释治理规则，`.template-spec/design/tokens/*` 是派生实现视图。使用 shadcn-vue 或 shadcn/ui 组件辅助评审时，上游资料只提供组件事实，不覆盖项目规范；在 `prototype-evidence.yaml` 中记录根规范与 Token digest，不把上游默认直接写回项目实现。

需要比较视觉规范时，读取根 `DESIGN.md` 与项目选择的参考，并可用 `design-md diff <before> <after>` 核验；本文件不复制差异值。上游预设色板不自动成为项目品牌色。

使用可用且适用的 Codex `$design-qa` 时，颜色、字体与排版对照以根 `DESIGN.md` 为视觉事实源，并用实际消费的 Token 复核投影。工具不可用时按实际产物核对根规范、相关投影及可观察的样式和状态，记录未运行的检查；适用历史合同的要求不能据此省略。通用评议见 `.agents/skills/yss-design-system/references/design-review.md`。

高保真 H1/H2 优先使用 `vue-shadcn-prebuilt`，`react-shadcn-prebuilt` 仅历史只读，轻量局部修改可保留 `html-css-js`；二者以本地 Token CSS 保留 YSS 企业后台视觉语言。React AntD 原型生成路线已退役。生产实现只在目标工程按 lockfile 核验组件 API；原型阶段不调用生产组件库。已有项目中冻结的组件库原型及其事实证据保持只读；模板不再预置 Antdv Next fact pack，也不生成新的 Provider 事实包。

### HTML 与生产主题的映射

HTML 可使用 `DESIGN.md` 中已选择的组件变体与主题 CSS。新高保真原型可选择已有紧凑变体，窄屏使用普通控件；既有页面保持当前密度。共享主题与核验规则见 `.agents/skills/yss-design-system/references/prototype-default-theme.md`。暗色能力只在实际 Token 和浏览器状态均核验后声明。

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

### 原型默认密度与生产主题边界

新高保真原型可使用根 `DESIGN.md` 的命名紧凑控件和 Card 变体，窄屏使用普通控件与窄屏间距角色；正文始终使用 body。comfortable 保留普通变体。既有页面局部修改遵守保持项，生产主题按目标项目规范选择，不由原型密度推导。

| 场景 | Padding | Margin / Gap | 说明 |
| --- | --- | --- | --- |
| 页面内容区 | `components.page-shell.padding`；窄屏 `spacing.sm` | 一级区域 `spacing.md` | 页面外缘由布局容器统一提供，子模块不得重复增加外边距 |
| Card | `components.card-compact.padding`；密集 Card 可用 `spacing.sm` | Card 之间 `spacing.sm` | Card header 与 body 使用同一水平 padding；禁止 Card 套 Card 制造层级 |
| 筛选区 / 工具栏 | 垂直 `spacing.xs`、水平 `spacing.sm` | 控件间 `spacing.xs`；与主体 `spacing.sm` | 优先单行排列，空间不足时按字段组换行，不压缩到不可读 |
| 表单 | 区块 `spacing.md` | 表单项与同行字段 `spacing.sm` | label 与控件的局部间距由组件 Token 负责，不在页面重复覆盖 |
| 表格 / 列表 | 容器 `0` 或 `spacing.sm` | 工具栏与表格 `spacing.xs` | 表格内部 cell padding 使用组件紧凑规格，不用页面 CSS 逐列覆盖 |
| Modal / Drawer | `spacing.md` | 内容区块 `spacing.sm`；操作区 `spacing.xs` | 复杂多步流程不塞入 Modal，改用独立页面或 Drawer 分区 |

原型命名紧凑变体与历史 `tokens.compact.json` 快照分开使用；页面不照抄上游 utility 尺寸。

Margin 使用规则：组件自身默认不声明外部 margin，兄弟元素之间优先由父级 `gap` 管理；只有文档流语义或无法使用布局容器时才使用 margin，并仍限定在 `spacing.*` 阶梯内。禁止用负 margin 修补布局。

### 布局 token

| 角色 | 值来源 | 用途 |
| --- | --- | --- |
| 顶栏 / 侧栏 / 页面背景 | `DESIGN.md` 的 `colors.surface` / `colors.canvas-layout` | 应用壳布局 |
| Provider 断点 | 目标组件库精确版本的公开 Grid Token | 栅格和布局折叠 |
| 截图视口 | 本文件“响应式与多端验收”矩阵 | 浏览器验收，不反写为组件 Token |

这些断点用于栅格、隐藏工具类和布局折叠，不替换下方截图验收视口矩阵。

### 圆角

控件引用 `rounded.sm/md`，容器引用 `rounded.lg`；具体值仅在根 `DESIGN.md` 维护。

保持“控件圆角小于或等于容器圆角”：控件使用 `rounded.sm/md`，Card 与普通容器使用 `rounded.lg`。更大的 panel 圆角属于局部产品扩展，不作为紧凑型默认值；确需使用时必须先登记规范角色，不能让同一页面任意混用。实现时以根 `DESIGN.md` 与 `.template-spec/design/tokens/tokens.default.json` 为默认基线。

### 动效

消费现有派生 Token 的 `motionDurationFast/Mid/Slow` 与 `motionEaseInOut/Out` 角色，分别用于即时反馈、内部状态与浮层变化；不在治理文档复制数值。

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
| Tag | 用于分类或已打开页面导航；页面 Tag 激活与关闭动作分开，当前项使用主色浅底和描边。不用于关键状态或错误提示 |
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

原型交付物必须提供可在浏览器运行或复验的稳定入口，而不是只给截图、设计说明或生产前端代码。默认入口为 `.work/<feature>/design/prototypes/index.html`；也可交付稳定 URL。关联资源保持相对路径可移植，不强制内联成单文件。

低保真与状态矩阵经独立 `prototype-review` 后，按风险选择满足当前决策的最低档位：

| 档位 | 用途 | 技术边界 | 最低验证 |
|---|---|---|---|
| H1 `visual-review` | 布局、密度、层级、文案和少量关键交互 | shadcn-vue 离线预构建，或轻量原生 HTML/设计工具导出；接收者无需 Node、package、lockfile 或组件 CLI | desktop/narrow 非空渲染、项目 Token、console、关键交互、基础键盘/焦点/对比度；zoom/reduced-motion 按影响 |
| H2 `flow-review` | 主流程、权限、失败恢复、复杂联动和冲突 | 浏览器可运行流程；主要使用 shadcn-vue 预构建离线资源包，场景可重复触发和重置 | H1 共同证据 + 主流程、关键异常、zoom/reduced-motion；视觉回归按风险 |

- 原型中识别出的生产组件假设与待验行为写入 `implementation_handoff`，交给独立维护的前端规格与 CLI 承接；不得在原型阶段引入生产组件库、目标 lockfile 或 Storybook。
- 新视觉方向、信息架构不确定或有多个合理方案时执行三方案 ideation；复用已批准视觉模式时记录 source visual 与 `not-applicable` 理由。
- 新原型默认使用根 `DESIGN.md` 的 compact 命名变体，comfortable 可显式选择；页面 padding、gap、Card 圆角、Card padding 和控件高度必须在浏览器计算样式中可复核。
- Design QA、浏览器验证和视觉目标使用同一视口与同一状态；默认 desktop `1440×900`、narrow `390×844`。
- Design QA 统一覆盖 visual、layout、interaction、content、accessibility、cross-platform 六轴，不再复制第二份检查清单。
- 交付包包含所有实际使用的本地资源和 Token 副本，登记摘要；复制到独立目录后以 `file://` 无网络复验。模板结构检查不替代浏览器证据。

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

## 实现说明

React Ant Design 不再作为当前技术路线。目标项目选择组件库后，依据其实际版本和设计基线映射主题，不依赖已退役的完整主题派生。

H1/H2 原型使用 HTML/CSS/JavaScript：

- 使用根 `DESIGN.md` 派生的本地 Token CSS，保留来源摘要。
- 规范直出按 Token、状态矩阵和页面模式验收；已有批准视觉稿时按相同视口与状态比对。首版截图通过审查与用户确认后冻结，不能自我比较作为质量证明。
- 提供场景入口和重置，覆盖关键异常恢复、代表性业务内容、长文本与窄屏。复杂控件的生产能力假设进入既有 handoff。

适配目标组件库时：

- 先把 `.template-spec/design/tokens/tokens.default.json` 转为项目设计 token，再映射到目标 UI 库。
- 保留组件语义和状态语义，不要只复制颜色。
- 排版、间距和表面角色从根 `DESIGN.md` 读取，按目标库能力选择映射；历史紧凑快照不默认用于新项目。
- 运行时动态换肤使用 `--primary-color` 等短名别名，或直接改 `--brand-*`。

## 设计审查清单

进入 Spec 校准、API 影响分析 / 契约草案或前端实现前，带 UI 的需求应检查：

- 是否引用本文件作为设计系统基线。
- 页面清单、用户主路径、异常路径和权限状态是否明确。
- loading、empty、error、readonly、disabled、no-permission、conflict、success 状态是否齐全。
- 表单字段、筛选条件、表格列、批量操作、详情字段是否能反推 API schema。
- 主操作是否唯一且清楚，次级操作是否降级。
- 是否存在硬编码颜色、任意间距、重复自造控件或与系统冲突的交互。
- 是否覆盖关键响应式断点、实际点击区域及相邻间距；是否验证 Field 错误关联、InputGroup 内层样式、Sheet/Menu 焦点及分页选择一致性。
- 是否按项目覆盖对照主色、错误色、背景、文本、圆角和字体栈；Codex `$design-qa` 可用且适用时可辅助检查，未执行的检查需记录。

## 当前能力导航与待办

- H1/H2 已默认接入根 `DESIGN.md` 派生的本地 CSS、规范及资源摘要；见设计系统技能 `references/prototype-default-theme.md` 与原型技能 `references/shadcn-vue-integration.md`。
- 构建、来源摘要及浏览器计算样式检查已有工具；页面仍须执行适用六轴 QA，不能用工具存在代替结果。
- 主题与组件状态展示入口：`.template-source/design/preview.html`；不是可批准的产品原型。组件及页面配方见原型技能 `references/component-recipes.md`。
- 暗色快照保留历史参考入口，未完成当前规范验证。未来启用需按项目实际主题和当前规范核验，并补齐截图、对比度与交互验收；旧完整派生不可用。

## HTML 原型补充基线

参见 `.agents/skills/yss-prototype-stage/references/html-prototype-practices.md`。复用现有六轴 QA 与 Visual Baseline，新增能力只补充其执行方式，不另建交接文档。原生语义优先，弹窗与自定义控件的 ARIA 属性必须对应真实键盘/焦点行为。样式采用项目 Token，关键反馈保留可读文本，场景重置后再采集浏览器证据。

## shadcn-vue 主要路线

高保真按原型技能的 `references/shadcn-vue-integration.md` 优先使用 `vue-shadcn-prebuilt`，`react-shadcn-prebuilt` 仅历史只读；简单局部修改可保留原生 HTML。交付格式与视觉权威不变；Vue 作为随包浏览器运行时，作者依赖与构建工具不交付给接收者。
