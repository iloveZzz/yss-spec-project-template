# shadcn-vue 组件工程与设计保持

新增/修改组件、表单或弹层时读取。以项目 DESIGN.md、实际组件源码、来源清单和依赖锁为依据；上游技能提供 API 线索，不提供覆盖设计或执行 CLI 的额外授权。

## 选用顺序

1. 查看实际 components.json（若有）、别名、已有 components/ui、tokens、variants；没有配置文件时沿用现有固定清单，不凭空初始化。
2. 使用已有组件及正确嵌套，如 TabsTrigger/TabsList、DialogTitle、InputGroupInput/InputGroupAddon；所需组件未安装时先查固定版本及跨组件依赖，不能只添加 import。
3. 布局与产品视觉来自设计。优先语义变量和组件 variant，不以 preset/default theme 重画；共享 tokens 覆盖 Teleport 内容。组件内部 DOM 与组件源码由固定来源保留。
4. 必要新增组件使用已确定的 CLI/registry 版本，先看差异再合入；不运行 @latest、apply preset 或覆盖既有定制作为日常默认。社区注册表需要核对真实来源和依赖。

## 表单与绑定

- 复用 Field/Label/InputGroup 等实际存在的组件，保留可访问 label、错误关联、aria-invalid、disabled 与提交反馈。不能仅靠颜色表示错误。
- 简单查询可用 defineModel、普通 TypeScript 校验。复杂动态字段/数组/提交生命周期再按可选能力引入一个表单状态库；不因上游“Form state comes from a form library”强制新增依赖。
- 页面 schemas 定义字段、选项、列及前端规则，不拥有请求或可变表单状态；DTO 与 service 运行时验证另有职责。
- 普通 SFC 的 defineModel 优先，但 vendor 的 useVModel/passive/defaultValue 需保留行为。不要根据最新文档批量替换固定组件。
- 不强制每张 Card 具备所有区域，不按选项数量机械把 Radio/Checkbox 改成 ToggleGroup；根据单选、多选、动作或导航的真实语义选择。

## 弹层与可访问性

Dialog/Sheet 等应有可访问名称；需要隐藏标题时保留辅助技术可读的文本。验证开启焦点、Tab/Shift+Tab 范围、Escape/取消、关闭返回合理触发点及嵌套弹层。避免在 Reka 之外再写冲突的焦点陷阱或全局 Escape 监听。可点击元素用正确控件、图标按钮提供名称。

组件默认能力不代表页面通过：实际检查表单关联、焦点可见、错误恢复、窄屏与长内容；有动画时尊重 reduced-motion。截图检查视觉，浏览器动作检查交互，axe 检查自动可识别项；任一证据不代替其余证据。

依据：[shadcn-vue 官方技能](https://www.shadcn-vue.com/docs/skills)、[Reka 可访问性](https://www.reka-ui.com/docs/overview/accessibility)、[WAI-ARIA Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)。规则摘取和适配，未复制完整上游 Skill 或自动执行其嵌入命令。
