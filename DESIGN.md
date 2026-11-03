---
version: alpha
name: YSS Standard Light
description: YSS 企业后台标准亮色主题。定义视觉角色、组件尺寸与适配规则；业务规则、权限及状态流转由 Spec 和交互说明承载。

colors:
  primary: "#0d6be9"
  primary-control: "#0d6be9"
  primary-control-hover: "#0b60d2"
  primary-control-active: "#0955bb"
  primary-hover: "#0b60d2"
  primary-active: "#0955bb"
  primary-disabled: "#9ec4f6"
  primary-bg: "#e7f0fd"
  on-primary: "#ffffff"
  text-title: "#001949"
  text: "#2c4068"
  text-secondary: "#62728c"
  text-tertiary: "#62728c"
  decorative-muted: "#707e98"
  text-disabled: "#c7ccd7"
  canvas-layout: "#eeeff3"
  surface: "#ffffff"
  surface-elevated: "#ffffff"
  surface-subtle: "#f8f8f9"
  surface-nav: "#f6f9fe"
  surface-hover: "#f4f6fa"
  surface-editing: "#e6f5ff"
  stage-new: "#0d6be9"
  stage-won: "#00ae83"
  stage-lost: "#ff6b6b"
  overlay: "rgba(0, 0, 0, 0.45)"
  border: "#d9dde4"
  border-control: "#7d8aa0"
  border-secondary: "#eaecf0"
  success: "#51cc14"
  success-hover: "#85db5b"
  success-active: "#40a110"
  success-disabled: "#b9eba1"
  success-bg: "#eefae7"
  success-text: "#2d7a10"
  warning: "#ffb319"
  warning-hover: "#ffb319"
  warning-active: "#c98d14"
  warning-disabled: "#ffe1a3"
  warning-bg: "#fff7e8"
  warning-text: "#805500"
  error: "#f23030"
  error-hover: "#f66e6e"
  error-active: "#bf2626"
  error-disabled: "#faacac"
  error-bg: "#feeaea"
  error-text: "#bf2626"
  info-bg: "#e7f0fd"
  chart-primary-1: "#e7f0fd"
  chart-primary-2: "#c3dafa"
  chart-primary-3: "#9ec4f6"
  chart-primary-4: "#7aaef3"
  chart-primary-5: "#5697f0"
  chart-primary-6: "#3181ec"
  chart-primary-7: "#0d6be9"
  chart-primary-8: "#0c60d2"
  chart-primary-9: "#0a55b8"
  chart-primary-10: "#09489c"
  chart-primary-11: "#073a7e"
  chart-primary-12: "#052b5d"
  chart-primary-13: "#031b3a"

typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4285714285714286
  body-strong:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4285714285714286
  heading-lg:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.5
  heading-md:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4285714285714286

  code:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5

  table-heading:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5714285714285714
  toolbar-heading:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4285714285714286
  overlay-title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.375

rounded:
  none: 0px
  sm: 4px
  md: 4px
  lg: 4px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  card: 20px
  lg: 24px
  xl: 32px
  xxl: 48px

components:
  workspace-header:
    height: 52px
    backgroundColor: "{colors.surface}"
    typography: "{typography.body}"
  workspace-sidebar:
    width: 240px
    backgroundColor: "{colors.surface-nav}"
  workspace-sidebar-collapsed:
    width: 64px
  workspace-tabs:
    height: 32px
    backgroundColor: "{colors.surface}"
  workspace-detail:
    width: 384px
    backgroundColor: "{colors.surface}"
  workspace-title:
    typography: "{typography.heading-lg}"
  separator:
    backgroundColor: "{colors.border}"
    height: 1px
  button-primary:
    backgroundColor: "{colors.primary-control}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "5px 15px"
    height: 32px
  button-primary-hover:
    backgroundColor: "{colors.primary-control-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "5px 15px"
    height: 32px
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "5px 15px"
    height: 32px
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "5px 15px"
    height: 32px
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "5px 10px"
    height: 32px
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "5px 10px"
    height: 32px
  table-header:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.table-heading}"
    padding: "12px 10px"
    height: 48px
  table-row:
    textColor: "{colors.text-secondary}"
    typography: "{typography.body}"
    padding: "7px 10px"
    height: 36px
  table-row-selected:
    backgroundColor: "{colors.primary-bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "7px 10px"
  modal-default:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  button-primary-active:
    backgroundColor: "{colors.primary-control-active}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "5px 15px"
    height: 32px
  page-shell:
    backgroundColor: "{colors.canvas-layout}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "{spacing.md}"
  alert-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  alert-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  alert-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  alert-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  badge-processing-solid:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.xs}"
  badge-success-solid:
    backgroundColor: "{colors.success}"
    textColor: "#000000"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.xs}"
  badge-warning-solid:
    backgroundColor: "{colors.warning}"
    textColor: "#000000"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.xs}"
  badge-error-solid:
    backgroundColor: "{colors.error}"
    textColor: "#000000"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.xs}"
  secondary-copy:
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  button-compact:
    height: 28px
  button-small:
    height: 24px
  button-large:
    height: 40px
  button-touch:
    height: 44px
  card-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  application-rail:
    width: 60px
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  module-navigation:
    width: 104px
    backgroundColor: "{colors.surface-nav}"
  saved-view-sidebar:
    width: 130px
    backgroundColor: "{colors.surface}"
  list-surface:
    backgroundColor: "{colors.surface}"
    padding: "12px 20px"
    rounded: "{rounded.sm}"
  page-tab:
    height: 32px
    typography: "{typography.body}"
    textColor: "{colors.text}"
  page-tab-active:
    textColor: "{colors.primary-control}"
  select-option:
    height: 32px
    padding: "5px 10px"
    typography: "{typography.table-heading}"
  select-option-selected:
    textColor: "{colors.primary-control}"
    typography: "{typography.body-strong}"
  select-option-highlighted:
    backgroundColor: "{colors.surface-hover}"
  view-switch:
    height: 32px
    rounded: "{rounded.sm}"
  drawer-default:
    width: 520px
    padding: "16px 20px"
    backgroundColor: "{colors.surface-elevated}"
    rounded: "{rounded.none}"
  date-range-popup:
    width: 662px
    rounded: "{rounded.sm}"
    backgroundColor: "{colors.surface-elevated}"
  team-picker-popup:
    width: 680px
    rounded: "{rounded.sm}"
    backgroundColor: "{colors.surface-elevated}"
  team-picker-body:
    height: 320px
  calendar-cell:
    size: 36px
  calendar-date:
    size: 24px
    rounded: "{rounded.pill}"
  stage-column:
    width: 290px
    rounded: "{rounded.none}"
    backgroundColor: "{colors.surface}"
  stage-heading:
    height: 40px
    padding: "0 8px"
    typography: "{typography.body}"
  stage-marker:
    height: 3px
  stage-empty:
    height: 200px

---

# YSS 标准亮色主题

本文件是模板的视觉规范源，适用于数据、表单和流程密集的企业后台。没有项目设计基线时，`yss-design-system` 默认采用此主题；已有项目沿用其实际 `DESIGN.md`、品牌和组件约定，明确要求迁移时才替换。默认只承诺亮色，不自动启用历史暗色或生产 compact 算法。

YAML 保持 [Google design.md alpha 格式](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)：`colors`、`typography`、`rounded`、`spacing` 和 `components` 存机器可读值，正文说明使用规则。当前 schema 未覆盖的断点、阴影、动效写在正文，不伪造顶层字段。业务规则、权限、数据格式和状态流转留在 Spec 与交互说明。原型框架使用 Vue + shadcn-vue，不据此决定生产组件库。

## 颜色与语义

- `primary` 与 `primary-control` 统一为 #0d6be9，主按钮、链接和选中标记共用此蓝；Hover / Active 分别使用 #0b60d2 / #0955bb。浅色选中背景配可读文字及标记，不仅依赖颜色。
- `text-title` 用于标题，`text` 用于正文，`text-secondary/tertiary` 用于辅助说明及 placeholder。`decorative-muted` 只用于非必要装饰，`text-disabled` 只用于真正不可操作的控件；禁用原因仍使用可读文字。只读内容不降低对比度。
- `border`、`border-secondary` 用于容器与分隔。需要靠边界识别的输入框、复选框使用 `border-control`；错误边界与错误文字使用 `error-text`。
- success / warning / error / processing 分别表达成功、警告、错误、处理中；processing 复用主色系。状态背景配正文或对应 `*-text`，不把明亮状态色直接用于小字。涨跌色由市场和业务规则另定，不将股票涨跌绑定 success / error。
- 以实际相邻颜色校验：普通文字至少 4.5:1，大号文字及必要非文本识别线索至少 3:1；禁用控件的标准例外不适用于 placeholder、只读内容或解释。标题 20px/600 仍按普通文字核验。

本次色值计算：白色与默认 / Hover / Active 主操作色约 4.89 / 5.80 / 6.93:1；辅助色 #62728c 在白底约 4.88:1，在表头底约 4.60:1。必要边框 #7d8aa0 在白底约 3.49:1，在页面底约 3.04:1。`decorative-muted` 在白底约 4.10:1，因此不承担普通字号必读说明。组合计算不等于整页通过无障碍检查。依据：[文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)、[非文本对比度](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。

## 字体、尺寸与密度

使用包含中文回退的系统 sans-serif 栈。正文 14px / 20px，页面标题 20px / 30px / 600，卡片与弹层标题 16px / 24px / 500，辅助文字 12px / 18px，表头 14px / 22px / 400，筛选区小标题 14px / 20px / 600，抽屉和确认弹窗标题 16px / 22px / 500。表单标签使用正文色和 400 字重，标签与控件间距 8px，字段组间距 16px，placeholder 使用同字号的可读辅助色，不代替 Label。

数字对比使用 `font-variant-numeric: tabular-nums`，数字列右对齐、单位和精度一致；这不要求整段文字使用等宽字体。代码使用 `typography.code`。DIN 或下载字体需核实实际授权和回退，不作为默认依赖。字体回退中的 Emoji 支持不授权用 Emoji 代替 UI 图标。

默认普通控件 32px，表头 48px，表格数据单行基础高度 36px（含分隔线，20px 行高、上下各 7px 内边距，剩余空间由单元格分配）。多行、标签及行内按钮允许自然增高，不能锁死并截断内容。表单整体、Textarea、Checkbox 的可见方框、Dialog 不是统一 32px。

`compact` 的 28px 只在明确选择高密度场景时使用；`comfortable` 保留 32px 控件和 20px Card 内边距。默认 Card 内边距 16px，窄屏 12px；页面边距 16px、窄屏 12px；布局使用 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48px 阶梯。组件间优先由父级 gap 管理，不缩小正文制造密度。

触摸或窄屏常用操作目标优先达到 44×44 CSS px（本主题选择）；键鼠目标按 [WCAG 2.2 目标尺寸](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) 至少 24×24 CSS px 或满足适用例外。小图标与复选框通过关联 Label 或留白提供点击区域，扩展区域不得互相遮盖。窄屏输入文字可用 16px，避免输入时过度放大；不能禁用浏览器缩放。

## 图标

优先使用 [Lucide](https://lucide.dev/guide/) 的 SVG 图标，使用项目已锁定的 Vue 包（当前原型为 `@lucide/vue`），按需导入，不因换主题升级依赖。常规图标 16px，导航 20px，插图类 24px 起，统一描边风格。品牌标识采用有授权的原始 SVG；普通标点、数值单位和正文 Unicode 不在禁用范围。

正式操作、导航与状态不使用 Emoji / Unicode 字形代替图标。装饰图标从辅助技术隐藏；仅图标按钮必须提供可访问名称，必要时补充 Tooltip，不能只依赖 Hover 提供名称。图标尺寸与点击目标分别定义。

## 响应式与布局

断点按 CSS 视口宽度，采用连续区间，不按设备型号或物理像素判断。1920px 是常用设计画布，不是固定页面宽度。仅在内容需要改变结构时设断点，不为每个测试宽度复制一套布局。

| 宽度 | 默认布局 |
|---|---|
| `< 720px` | 导航 Sheet / Drawer、表单单列、工具栏换行或 More Menu；主动作与错误保持可达 |
| `720px ≤ w < 1200px` | 侧栏初始折叠，按可用空间重排 Grid、筛选和内容 |
| `1200px ≤ w < 1680px` | 侧栏初始展开，桌面紧凑布局；压缩间距和长字段，保留正文与提示 |
| `1680px ≤ w < 2160px` | 流式桌面，使用有效列宽和模块留白，不按比例放大 |
| `≥ 2160px` | 内容阅读区限宽居中，数据工作台按任务使用全宽；表单不无限拉长 |

960 / 1440 / 1920 是中间复核宽度，可按内容增加断点，不能误写为区间边界。桌面参考 1920×1080、常见工作宽度 1440×900、手机参考 390×844；本次影响的阈值两侧、320 CSS px 重排和真实浏览器缩放按需核对。原稿遗漏的 2160px 已包含，Tablet 上限统一为 1200px 之前。

应用壳可使用顶栏、分组侧栏、页面导航 Tag 与流式任务区；简单页面无需套全壳。页面 Tag 的激活与关闭分开；页内 Tabs 使用可辨识的激活指示，容器型 Tabs 可使用浅底。详情宽屏内嵌，空间不足转 Sheet；未选择数据不预留空详情列。

表格按阅读任务选择局部横向滚动、关键列 + 详情或摘要卡片；需要跨行列比较时保留表格，不能自动把所有表格卡片化。二维内容的滚动不能扩散到页面、筛选或分页。Dialog 按内容选择适配宽度或窄屏全屏，保留关闭、焦点返回与滚动可达性。不用隐藏溢出来掩盖丢失内容。参考 [WCAG Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)。

## 圆角、阴影与动效

输入、按钮、内嵌标签、Card、Dialog、Dropdown、表格外容器统一 4px，阶段看板列为 0；圆形头像用 50%，胶囊用 `rounded.pill`。不靠不断增加 Card 和阴影表达层级。

| CSS 角色 | 默认值 | 使用规则 |
|---|---|---|
| `--yss-shadow-popup` | `0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)` | 下拉、日期浮层与确认弹窗 |
| `--yss-shadow-card` | `none` | 普通卡片、按钮和看板不使用阴影 |
| `--yss-shadow-drawer` | `-6px 0 16px -8px rgba(0,0,0,.08), -9px 0 28px 0 rgba(0,0,0,.05), -12px 0 48px 16px rgba(0,0,0,.03)` | 右侧抽屉的定向阴影；其他方向镜像适配 |
| `--yss-focus-ring` | `none` | 兼容旧变量名；输入聚焦只改变 1px 边框，不添加光晕 |
| `--brand-motion-duration-fast/mid/slow` | `100ms / 200ms / 300ms` | 即时反馈、内部状态、浮层变化 |

Input、Textarea、Select 与 InputGroup 聚焦时使用 1px 实色主操作色边框，不添加光晕或双重外轮廓；InputGroup 仅由外容器表达焦点，内部输入不重复描边。保留错误边框，不让聚焦色覆盖校验错误。其他控件的键盘焦点保留 2px 实色轮廓；强制颜色模式下，输入类控件也恢复系统色轮廓，避免阴影消失后丢失焦点。遮罩使用 `colors.overlay`。固定栏、下拉、模态与模态内浮层按层级排列，优先复用组件库定位；焦点不能被固定栏遮挡。尊重 `prefers-reduced-motion`，关闭非必要动效。

Select、Combobox 与 DropdownMenu 的弹出选项不套用通用控件的粗焦点外框。选中项以蓝色文字、500 字重和勾选标记表达，不依赖底色；悬停及键盘当前项使用 `surface-hover`，键盘当前项另以左侧 2px 内嵌指示线定位，移动焦点不等于更改选中值。强制颜色模式改用 1px 系统色内轮廓。保留上下键移动、Enter 确认与 Escape 关闭。

## 列表、筛选与阶段看板

这套标准合并企业列表与销售机会两类页面的共性：蓝色操作、蓝灰文字、白色工作区、浅色导航和表头、细边框与紧凑排列。两个页面实测确认的 32px 控件、4px 圆角、48px 表头和 52px 顶栏用于默认值。文字、必要控件边框及 Hover / Active 色按可读性优化，图表蓝按主色重新派生；这些是主题设计值。参考页面均无数据，数据行仍沿用原有 36px 基线，不据此声称已验证实际数据行或机会卡片。

- **应用壳**：普通工作台保留 240px 侧栏。只有同时存在应用、模块和保存视图三层导航时，才分别采用 60 / 104 / 130px；三列不能无条件叠加到所有页面。小于 1200px 收起次要导航，小于 720px 由 Sheet 承载；详情与导航不挤压主任务。
- **列表面板**：可使用 `list-surface` 的 12px × 20px 内边距和 8px 外部沟槽。筛选行列间距 20px、行间距 10px；桌面标签与控件间距 10px，窄屏标签置上并采用表单 8px 间距。长标签可换行，必要信息不只显示省略号。分页位于结果后，零条数据不显示可执行的翻页。
- **页内 Tabs**：14/20 常规字重，标签间距 24px，选中蓝字 + 2px 底线，命中区域至少 32px 高。内容较多时只在页签区横向滚动；不可把视觉底线包成整块粗边框。
- **组合筛选**：相邻 Select / Input 共用 4px 外圆角、内部直角和单条 1px 分隔；只有当前操作的子控件变蓝。每个子控件有独立名称，组标签不能代替子控件的可访问名称；独立控件仍保留正常键盘顺序。
- **下拉**：32px 基础选项行、上下 4px 菜单留白、4px 浮层圆角，宽度至少等于触发器且不超出视口。当前项和选中值分开，禁用项不可确认，长项自然增高。下拉箭头、搜索与勾选统一使用 16px Lucide SVG。
- **日期区间**：32px 高的开始/结束输入与日历图标组成单一外边框；端点各自有名称，正在编辑的端点用 `surface-editing`。标准日期样例宽屏使用双月，浮层参考 662px（快捷项 102px + 双月各 280px）；窄屏实际只渲染单月、快捷项换行，不能让整个页面横向溢出。日期点击格 36px、可见圆形日期 24px，触摸目标优先采用 44px；极窄屏日历七列可按可用宽度均分，保证至少 24px，区间与端点分别表达。日期、时区、包含边界和清空行为由业务合同决定。
- **团队选择**：范围 Select 与员工选择触发器相连；弹层宽 680px、主体基准高 320px，左侧搜索及部门/员工，右侧已选清单与清空。部门支持半选，选择数量与标签可读；窄屏上下排列，底栏确认/取消可达。搜索、移除和清空先改草稿，确认才生效；候选隐藏不删除已选，显示全部不扩大数据权限。
- **视图切换**：卡片 / 列表使用 32px 分段控件，外圆角 4px、内部直角，激活蓝底白字、无阴影。只切换呈现，保留同一查询、排序和筛选；改变查询须由交互合同明确。不要直接复用带底线的页内 Tabs 外观。
- **阶段看板**：列最小宽 290px、列间距 12px、1px 装饰边框、无圆角及阴影；表头 40px、左右 8px，顶部 3px 短色条与阶段名称同时存在。`stage-new / won / lost` 为业务阶段色，不能替换 success / error 等反馈色。列宽随空间分配，横向滚动只发生在看板；空态块参考 200px 并允许内容增高。拖拽、阶段权限和卡片字段不由空数据截图推导。
- **覆盖层**：详情抽屉常用宽 520px，上限为视口宽；正文 16px × 20px，表头 16px × 20px，底栏 12px × 24px。确认弹窗按内容选宽，常用 416px、内边距 24px。两者保留关闭、焦点陷阱、Escape 与返回触发器；窄屏正文 12px、操作可换行。遮罩黑色 45%。

## 图表与交互

`chart-primary-1…13` 由本主题主色与白/黑混合派生，是有序量的连续蓝色阶，不是 13 个分类色。浅阶用于填充；线条、图例与文字分别核验对比度。分类系列需有可区分颜色及名称、线型或标记，不把相邻浅蓝当不同业务类别。明暗、零基线、单位、精度、缺失值和无数据表达由图表任务决定。

需要交互的图表使用实际 SVG / Canvas / 图表组件，支持 Hover Tooltip 及键盘或点击/触摸的等价读数入口；必要时提供数据表或文字摘要。静态展示图按用途提供摘要，不强制添加无意义 Hover。不用截图冒充可交互图表。

可操作交付中，Button、Tab、Dropdown、Input 必须实现其承诺行为；加载防重复提交，成功/失败可见，错误可恢复，禁用有原因，只读可复制。不得将所有按钮连接到 `alert()`、以 TODO 或“此处省略”交付核心行为。纯展示允许静态成果；页面结构用正常文档流、Flex / Grid，绝对定位仅用于合理浮层或局部装饰。还原已有稿时保持已指定结构；用户要求设计或优化时可以给出有依据的改动。

## 同步与适用范围

项目 `DESIGN.md` 定义当前项目规范；技能的 `assets/DESIGN.md` 是本模板默认规范的分发副本。模板维护时同步副本、亮色 `variables.css` 与相关角色映射，CSS `--yss-*` 为规范投影，`--brand-*` 为兼容桥接，页面不再维护独立值表。

`theme.json`、`tokens.default.json` 保留历史组件库键名供兼容参考，其未映射的预设色板与 Grid Token 不决定本主题。暗色、历史算法 compact 快照不参与当前亮色一致性声明。已安装 CLI 没有主题派生命令时直接维护本次明确映射并核对，不声称运行旧生成器。检查以当前修改风险为准，不要求额外审批、检查计划或证据包；未运行的浏览器、读屏或宿主安装检查如实说明。
