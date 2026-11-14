---
version: alpha
name: YSS Tesla Light
description: YSS 企业后台标准亮色主题。定义视觉角色、组件尺寸与适配规则；业务规则、权限及状态流转由 Spec 和交互说明承载。

colors:
  primary: "#3e6ae1"
  primary-control: "#3e6ae1"
  primary-control-hover: "#345bcc"
  primary-control-active: "#2b4ec5"
  primary-hover: "#345bcc"
  primary-active: "#2b4ec5"
  primary-disabled: "#b2c3f3"
  primary-bg: "#e2e9fb"
  on-primary: "#ffffff"
  text-title: "#171a20"
  text: "#171a20"
  text-secondary: "#5c5e62"
  text-tertiary: "#5c5e62"
  decorative-muted: "#72757b"
  text-disabled: "#a2a4a8"
  canvas-layout: "#f4f4f4"
  surface: "#ffffff"
  surface-elevated: "#ffffff"
  surface-subtle: "#fafafa"
  surface-nav: "#ffffff"
  surface-hover: "#f4f4f4"
  surface-editing: "#f2f5fd"
  stage-new: "#3e6ae1"
  stage-won: "#00ae83"
  stage-lost: "#ff6b6b"
  overlay: "rgba(0, 0, 0, 0.45)"
  border: "#e4e4e7"
  border-control: "#86888d"
  border-secondary: "#ececef"
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
  info-bg: "#e2e9fb"
  chart-primary-1: "#e2e9fb"
  chart-primary-2: "#cfdafa"
  chart-primary-3: "#b2c3f3"
  chart-primary-4: "#a8baf2"
  chart-primary-5: "#8ba4ec"
  chart-primary-6: "#6588e7"
  chart-primary-7: "#3e6ae1"
  chart-primary-8: "#385fcb"
  chart-primary-9: "#3255b4"
  chart-primary-10: "#2a4899"
  chart-primary-11: "#223a7c"
  chart-primary-12: "#192a5a"
  chart-primary-13: "#101b38"

typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5714285714285714
  body-strong:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5714285714285714
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
    lineHeight: 1.5714285714285714

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
  table-body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5714285714285714
  toolbar-heading:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.5714285714285714
  overlay-title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.375

rounded:
  none: 0px
  sm: 8px
  md: 8px
  lg: 12px
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
    height: 56px
    backgroundColor: "{colors.surface}"
    typography: "{typography.body}"
  workspace-sidebar:
    width: 224px
    backgroundColor: "{colors.surface-nav}"
  workspace-sidebar-collapsed:
    width: 64px
  workspace-tabs:
    height: 40px
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
    padding: 2px 12px
    height: 28px
  button-primary-hover:
    backgroundColor: "{colors.primary-control-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 2px 12px
    height: 28px
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 2px 12px
    height: 28px
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 2px 12px
    height: 28px
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 2px 10px
    height: 28px
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 2px 10px
    height: 28px
  table-header:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.table-heading}"
    padding: 4px 10px
    height: 40px
  table-row:
    textColor: "{colors.text}"
    typography: "{typography.table-body}"
    padding: 4px 10px
    height: 40px
  table-row-selected:
    backgroundColor: "{colors.primary-bg}"
    textColor: "{colors.text}"
    typography: "{typography.table-body}"
    padding: 4px 10px
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
    padding: 2px 12px
    height: 28px
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
    textColor: "#171a20"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.xs}"
  badge-warning-solid:
    backgroundColor: "{colors.warning}"
    textColor: "#171a20"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.xs}"
  badge-error-solid:
    backgroundColor: "{colors.error}"
    textColor: "#171a20"
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
    height: 28px
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
    width: 64px
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  module-navigation:
    width: 224px
    backgroundColor: "{colors.surface-nav}"
  saved-view-sidebar:
    width: 130px
    backgroundColor: "{colors.surface}"
  list-surface:
    backgroundColor: "{colors.surface}"
    padding: 12px 20px
    rounded: "{rounded.lg}"
  list-toolbar:
    height: 46px
  list-filter-label:
    width: 70px
  page-tab:
    height: 28px
    typography: "{typography.body}"
    textColor: "{colors.text}"
  page-tab-active:
    textColor: "{colors.primary-control}"
  select-option:
    height: 28px
    padding: 2px 12px
    typography: "{typography.table-heading}"
  select-option-selected:
    textColor: "{colors.primary-control}"
    typography: "{typography.body-strong}"
  select-option-highlighted:
    backgroundColor: "{colors.surface-hover}"
  view-switch:
    height: 28px
    rounded: "{rounded.sm}"
  drawer-default:
    width: 520px
    padding: 16px 20px
    backgroundColor: "{colors.surface-elevated}"
    rounded: "{rounded.none}"
  date-range-popup:
    width: 662px
    rounded: "{rounded.lg}"
    backgroundColor: "{colors.surface-elevated}"
  team-picker-popup:
    width: 680px
    rounded: "{rounded.lg}"
    backgroundColor: "{colors.surface-elevated}"
  team-picker-body:
    height: 320px
  calendar-cell:
    size: 28px
  calendar-date:
    size: 24px
    rounded: "{rounded.pill}"
  stage-column:
    width: 290px
    rounded: "{rounded.none}"
    backgroundColor: "{colors.surface}"
  stage-heading:
    height: 40px
    padding: 0 8px
    typography: "{typography.body}"
  stage-marker:
    height: 3px
  stage-empty:
    height: 200px

---

# YSS Tesla Light 亮色主题

本文件是模板的视觉规范源，适用于数据、表单和流程密集的企业后台。没有项目设计基线时，`yss-design-system` 默认采用此主题；已有项目沿用其实际 `DESIGN.md`、品牌和组件约定，明确要求迁移时才替换。默认只承诺亮色，不自动启用历史暗色或生产 compact 算法。

YAML 保持 [Google design.md alpha 格式](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)：`colors`、`typography`、`rounded`、`spacing` 和 `components` 存机器可读值，正文说明使用规则。当前 schema 未覆盖的断点、阴影、动效写在正文，不伪造顶层字段。业务规则、权限、数据格式和状态流转留在 Spec 与交互说明。原型框架使用 Vue + shadcn-vue，不据此决定生产组件库。

## 颜色与语义

- `primary` 与 `primary-control` 统一为 #3e6ae1，主按钮、链接和选中标记共用此蓝；Hover / Active 分别使用 #345bcc / #2b4ec5。浅色选中背景 #E2E9FB 是主蓝以 15% 混合白色的 accent-soft；其上小字使用 primary-active #2B4EC5 或正文色，配合勾选或指示线表达选中。
- `text-title` 用于标题，`text` 用于正文，`text-secondary/tertiary` 用于辅助说明及 placeholder。`decorative-muted` 只用于非必要装饰，`text-disabled` 只用于真正不可操作的控件；禁用原因仍使用可读文字。只读内容不降低对比度。
- `border`、`border-secondary` 用于容器与分隔。需要靠边界识别的输入框、复选框使用 `border-control`；错误边界与错误文字使用 `error-text`。
- success / warning / error / processing 分别表达成功、警告、错误、处理中；processing 复用主色系。状态背景配正文或对应 `*-text`，不把明亮状态色直接用于小字。涨跌色由市场和业务规则另定，不将股票涨跌绑定 success / error。
- 以实际相邻颜色校验：普通文字至少 4.5:1，大号文字及必要非文本识别线索至少 3:1；禁用控件的标准例外不适用于 placeholder、只读内容或解释。标题 20px/600 仍按普通文字核验。

对比度按实际相邻颜色计算：主操作使用白字，正文与辅助说明保持可读；#E4E4E7 仅作容器装饰边框，必须依赖边界识别的表单控件使用 #86888D。不能用增强对比度偏好补救默认状态的必要信息。组合计算不等于整页通过无障碍检查。依据：[文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)、[非文本对比度](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。

## 字体、尺寸与密度

使用包含中文回退的系统 sans-serif 栈。Universal Sans 未提供已授权字体资产，使用现有系统中文回退；不加载远程品牌字体。Universal Sans 未提供已授权字体资产，使用现有系统中文回退；不加载远程品牌字体。正文 14px / 22px，页面标题 20px / 30px / 600，卡片与弹层标题 16px / 24px / 500，辅助文字 12px / 18px，表头 14px / 22px / 400，筛选区小标题 14px / 22px / 600，抽屉和确认弹窗标题 16px / 22px / 500。表单标签使用正文色和 400 字重，标签与控件间距 8px，字段组间距 16px，placeholder 使用同字号的可读辅助色，不代替 Label。

数字对比使用 `font-variant-numeric: tabular-nums`，数字列右对齐、单位和精度一致；这不要求整段文字使用等宽字体。代码使用 `typography.code`。DIN 或下载字体需核实实际授权和回退，不作为默认依赖。字体回退中的 Emoji 支持不授权用 Emoji 代替 UI 图标。

默认采用 small 紧凑尺寸，桌面按钮和单行输入高 28px，按钮内边距 2px × 12px，输入内边距 2px × 10px。表头与数据行基础高 40px，单元格内边距 4px × 10px，正文 14px / 22px。多行、标签及行内按钮允许自然增高。Textarea、Checkbox、Dialog 按各自内容尺寸呈现，触屏常用操作目标采用 44px。

默认 small 与 `compact` 均使用 28px 控件，显式 medium / `comfortable` 使用 36px 控件和 20px Card 内边距。默认 Card 内边距 16px，窄屏 12px；页面边距 16px、窄屏 12px；布局使用 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48px 阶梯。组件间优先由父级 gap 管理，不缩小正文制造密度。

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

默认应用壳的顶部一级模块菜单与左侧二级业务菜单联动，业务菜单可分组并展开子项。内容顶部跨模块保留已开页面，激活页签同步顶部模块和左侧当前项。工作台固定保留，其余页签分别提供独立关闭按钮。关闭非当前页保留当前页面，关闭含未提交修改的页签经过草稿守护，取消保留页签和输入，确认后关闭并在需要时切换到相邻页，至少保留工作台。

桌面页面标签栏高 40px，窄屏或粗指针使用 44px 标签与关闭按钮命中区域并允许栏高自然增高。长标签在容器内横向滚动，键盘焦点保留完整内嵌轮廓。简单页面按任务采用必要布局，页内 Tabs 使用可辨识的激活指示。详情宽屏内嵌，空间不足转 Sheet，未选择数据时不预留详情列。

表格按阅读任务选择局部横向滚动、关键列 + 详情或摘要卡片；需要跨行列比较时保留表格，不能自动把所有表格卡片化。二维内容的滚动不能扩散到页面、筛选或分页。Dialog 按内容选择适配宽度或窄屏全屏，保留关闭、焦点返回与滚动可达性。不用隐藏溢出来掩盖丢失内容。参考 [WCAG Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)。

## 圆角、阴影与动效

Checkbox 可见方框使用 3px 专用圆角，保持多选方框的形状；普通输入与按钮使用 8px 圆角。

输入与按钮 8px，Card、Dialog、Dropdown 和表格外容器 12px，内嵌标签 8px，阶段看板列为 0；圆形头像用 50%，胶囊用 `rounded.pill`。不靠不断增加 Card 和阴影表达层级。

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

默认采用白色全宽顶导、白色业务侧栏、已开页面标签栏和浅灰画布上的白色内容面板。顶部品牌位于左侧，主模块居中，账号与工具位于右侧；当前模块的业务菜单由侧栏承载。Tesla preset 提供 #3E6AE1 主色与中性表面方向，HeroUI CRM / Dashboard 提供克制层次、细边框与柔和圆角参考；实现仍使用 Vue + shadcn-vue，不引入 React 组件库。

顶部一级菜单当前项使用透明背景、蓝色文字与 2px 底线。左侧二级菜单当前项使用浅蓝背景、蓝色图标文字与 500 字重，展开和折叠状态均去除装饰侧边条。

- **应用壳**：顶栏 56px、业务侧栏 224px、折叠侧栏 64px、已开页面标签栏 40px。小于 1200px 侧栏初始收起，小于 720px 使用 Sheet；顶部模块在自身区域换行或收纳，不能让页面横向溢出。仅业务需要时增加保存视图栏；历史 application-rail / module-navigation 角色是兼容角色，不恢复蓝色竖向应用轨道。
- **列表面板**：可使用 `list-surface` 的 12px × 20px 内边距和 8px 外部沟槽。筛选行列间距 20px、行间距 10px；桌面标签与控件间距 10px，窄屏标签置上并采用表单 8px 间距。长标签可换行，必要信息不只显示省略号。分页位于结果后，零条数据不显示可执行的翻页。
- **工具与筛选区**：工具栏最小 46px，换行可增高；宽屏筛选列参考最小 360px、标签最小 70px，窄屏按容器宽度重排。查询/重置放网格最后一列并右对齐，允许按钮换行。批量动作复用现有工具栏，选中后不新增“已选 N 项”栏推动表格；说明当前页或跨页选择、清空与禁用项语义。
- **平面列表**：仅 `.list-surface` 内可去除整行 hover 底色，保留选中态、操作 hover 与键盘焦点；其他表格沿用实际规范。需要时移除外框、保留行分隔，不全局取消 hover。
- **可选外壳细节**：导航、顶栏搜索、头像和在线标记按项目组合，尺寸为 CSS px；不从高分屏截图物理像素反推。头像使用项目有授权的图像或已有图标/文字，占位图有邻近姓名时使用空 alt；不引入来源不明素材或通用的联系人/公司业务动作。
- **页内 Tabs**：14/20 常规字重，标签间距 24px，选中蓝字 + 2px 底线，桌面命中区域至少 28px 高，触屏采用 44px。内容较多时只在页签区横向滚动；不可把视觉底线包成整块粗边框。
- **组合筛选**：相邻 Select / Input 共用 8px 外圆角、内部直角和单条 1px 分隔；只有当前操作的子控件变蓝。每个子控件有独立名称，组标签不能代替子控件的可访问名称；独立控件仍保留正常键盘顺序。
- **下拉**：28px 基础选项行、上下 4px 菜单留白、12px 浮层圆角，宽度至少等于触发器且不超出视口。当前项和选中值分开，禁用项不可确认，长项自然增高。下拉箭头、搜索与勾选统一使用 16px Lucide SVG。
- **日期区间**：28px 高的开始/结束输入与日历图标组成单一外边框；端点各自有名称，正在编辑的端点用 `surface-editing`。标准日期样例宽屏使用双月，浮层参考 662px（快捷项 102px + 双月各 280px）；窄屏实际只渲染单月、快捷项换行，不能让整个页面横向溢出。日期点击格 28px、可见圆形日期 24px，触摸目标优先采用 44px；极窄屏日历七列可按可用宽度均分，保证至少 24px，区间与端点分别表达。日期、时区、包含边界和清空行为由业务合同决定。
- **团队选择**：范围 Select 与员工选择触发器相连；弹层宽 680px、主体基准高 320px，左侧搜索及部门/员工，右侧已选清单与清空。部门支持半选，选择数量与标签可读；窄屏上下排列，底栏确认/取消可达。搜索、移除和清空先改草稿，确认才生效；候选隐藏不删除已选，显示全部不扩大数据权限。
- **视图切换**：卡片 / 列表使用 28px 分段控件，外圆角 8px、内部直角，激活蓝底白字、无阴影。只切换呈现，保留同一查询、排序和筛选；改变查询须由交互合同明确。不要直接复用带底线的页内 Tabs 外观。
- **阶段看板**：列最小宽 290px、列间距 12px、1px 装饰边框、无圆角及阴影；表头 40px、左右 8px，顶部 3px 短色条与阶段名称同时存在。`stage-new / won / lost` 为业务阶段色，不能替换 success / error 等反馈色。列宽随空间分配，横向滚动只发生在看板；空态块参考 200px 并允许内容增高。拖拽、阶段权限和卡片字段不由空数据截图推导。
- **覆盖层**：详情抽屉常用宽 520px，上限为视口宽；正文 16px × 20px，表头 16px × 20px，底栏 12px × 24px。确认弹窗按内容选宽，常用 416px、内边距 24px。两者保留关闭、焦点陷阱、Escape 与返回触发器；窄屏正文 12px、操作可换行。遮罩黑色 45%。

## 图表与交互

`chart-primary-1…13` 由本主题主色与白/黑混合派生，是有序量的连续蓝色阶，不是 13 个分类色。浅阶用于填充；线条、图例与文字分别核验对比度。分类系列需有可区分颜色及名称、线型或标记，不把相邻浅蓝当不同业务类别。明暗、零基线、单位、精度、缺失值和无数据表达由图表任务决定。

需要交互的图表使用实际 SVG / Canvas / 图表组件，支持 Hover Tooltip 及键盘或点击/触摸的等价读数入口；必要时提供数据表或文字摘要。静态展示图按用途提供摘要，不强制添加无意义 Hover。不用截图冒充可交互图表。

可操作交付中，Button、Tab、Dropdown、Input 必须实现其承诺行为；加载防重复提交，成功/失败可见，错误可恢复，禁用有原因，只读可复制。不得将所有按钮连接到 `alert()`、以 TODO 或“此处省略”交付核心行为。纯展示允许静态成果；页面结构用正常文档流、Flex / Grid，绝对定位仅用于合理浮层或局部装饰。还原已有稿时保持已指定结构；用户要求设计或优化时可以给出有依据的改动。

## 同步与适用范围

项目 `DESIGN.md` 定义当前项目规范；技能的 `assets/DESIGN.md` 是本模板默认规范的分发副本。模板维护时同步副本、亮色 `variables.css` 与相关角色映射，CSS `--yss-*` 为规范投影，`--brand-*` 为兼容桥接，页面不再维护独立值表。

`theme.json`、`tokens.default.json` 保留历史组件库键名供兼容参考，其未映射的预设色板与 Grid Token 不决定本主题。暗色、历史算法 compact 快照不参与当前亮色一致性声明。已安装 CLI 没有主题派生命令时直接维护本次明确映射并核对，不声称运行旧生成器。检查以当前修改风险为准，不要求额外审批、检查计划或证据包；未运行的浏览器、读屏或宿主安装检查如实说明。
