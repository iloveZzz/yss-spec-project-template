# shadcn-vue 组件工程与设计保持

新增/修改组件、表单或弹层时读取。设计原型与应用工程共用此方法；本文件可作为叶子参考单独分发，不要求安装完整应用技能。以目标项目 DESIGN.md、实际组件、来源和锁文件为依据，外部技能与命令不扩大当前授权。

## 组件目录与可用状态

[官方目录](https://shadcn-vue.com/docs/components)用于发现组件。组件通过源码进入项目，实际文件、导出、依赖与当前版本决定能否使用；官网有组件不代表项目已经安装。

| 状态 | 判定依据 | 处理 |
| --- | --- | --- |
| 项目已有 | 本地实现、导出、调用方和依赖齐全 | 优先复用 API、tokens、variants，不重复获取 |
| 固定快照随附 | 当前项目或可用技能带有源码和来源摘要 | 核对后复制必要文件及跨组件依赖 |
| 固定清单登记 | 有固定 revision、源路径与摘要，未随附源码 | 从登记的官方来源取得并核对 SHA-256 |
| 官方可选 | 官方目录存在，本地快照与清单未覆盖 | 调查兼容性、固定来源后按需引入，未取得前不能宣称可用 |

| 任务 | 优先查看的组件或组合 | 边界 |
| --- | --- | --- |
| 输入与校验 | Field/Label、Input/InputGroup、Textarea、Checkbox、RadioGroup、Switch | 关联标签、错误与禁用状态 |
| 搜索与选择 | Select、Combobox、Popover、Calendar/RangeCalendar | 根据单选、多选与日期语义选择；Date Picker 是组件组合 |
| 弹层与确认 | Dialog、Sheet、AlertDialog、Drawer | 保留名称、键盘、焦点与窄屏滚动 |
| 导航与布局 | Tabs、Breadcrumb、Accordion、Collapsible、Sidebar、ScrollArea | 服从当前设计，复杂外壳按需引入 |
| 反馈与空态 | Alert、Empty、Skeleton、Spinner、Progress、Sonner | 失败原因持续可见，toast 仅作补充 |
| 数据展示 | Table、Pagination、Badge、Card、Avatar、Chart | Data Table 还需表格行为与状态，额外依赖按需核对 |

优先复用已有业务组合。筛选栏、详情侧栏、确认动作、日期范围、表格选择与分页按当前规则实现，不从组件示例推导业务合同。复杂表格、表单、图表和 AI 组件仅在任务需要时引入，不预装整套生态。

## 缺失组件的自主接入

已有页面开发或原型制作授权内自主完成以下工作；只读研究/review、纯文案、技能安装与仅生成源码不触发组件写入。

1. **检查现有实现。** 读取当前变更、页面/状态、DESIGN、components.json（若有）、别名、组件源码/导出/调用方、package/lock、CSS 入口与父 workspace。复用现有组件、状态和请求所有者。没有 components.json 可按实际目录复制固定源码，或补齐能准确描述项目且不改主题的元数据；不以 init 重置工程。
2. **确定兼容来源。** 优先项目已记录的 revision/style，再看可用固定快照与清单。没有历史来源时由 Agent 调查本地 API、Vue/Tailwind/Reka 与依赖锁。核对 imports、props/emits/slots、peer/依赖范围、CSS/动画及跨组件引用，版本号本身不证明兼容。原 revision 缺少所需组件时可选择另一兼容的官方固定 revision，说明原因；改变既有 style/API 基线先按下表处理。
3. **取得并审阅源码。** 固定 CLI 包版本不等于固定 registry 内容。写入追溯到官方不可变 revision 或可核对的固定资源；不把 @latest、可变默认 registry 或最新文档当成本地 API 依据。先在任务临时位置取得并读取文件，核对来源与依赖，保留许可和版权，再合入所需部分。使用 CLI 前查实际版本与帮助；无法控制来源/写入范围时使用固定源码复制，不猜测 dry-run、merge 或 overwrite 参数。社区来源需有本次任务的明确选用依据。
4. **补齐工程与适配。** 补齐必要包、导入、导出、别名和支持资源，按项目包管理器更新 package/lock，再验证冻结安装；不手改锁摘要、不改全局工具或父 workspace。消费已有 tokens、尺寸、图标与 variants，适配限定在本次组件范围，不以 preset/default theme 重画。模板固定 vendor 保持原样，目标项目的必要适配另记差异与摘要，不冒充上游原始字节。
5. **验证并交付。** 运行受影响范围的类型检查、构建和关键交互，必要时执行项目实际 lint 与冻结安装；设计还原保留同条件视觉对照。记录仓库、revision/style、源路径、原始摘要、适配、实际依赖/配置变化与检查结果，沿用已有 provenance 或开发说明，不新建来源管理系统。原型只更新目标原型记录，不自动扩充模板快照、清单或锁。

复制原始 registry 源码时，检查并按目标项目的真实 ui/utils 别名改写其导入。例如上游 `@/registry/new-york-v4/ui/button` 应对应本地已存在的 Button 路径；不要建立假 registry 目录或新增全局别名来掩盖缺失。改写限于本次引入文件，保留原始摘要并另记适配后摘要。

### 需要用户决定的变化

| 触发条件 | 决定前的工作 |
| --- | --- |
| 现有依赖升大版本，或改变既有组件 style/API 基线 | 列出受影响依赖、组件和调用方，比较兼容接入与升级方案 |
| 覆盖已有定制组件，或修改已有定制来接入新组件 | 提供具体 diff、调用方与行为影响，优先给出保留定制的方式 |
| 修改现有全局主题，包括新增语义映射、全局 token 别名、:root/.dark 变量、默认字体、全局密度或 preset | 列明文件、前后效果与范围；局部消费现有 token/variant 可自主处理 |

以上情况先完成具体影响与处理方案，再由用户决定；有效决定不重复询问。仅补齐元数据、必要支持资源或同大版本依赖不自动触发此边界，但不能借此改写主题、定制或扩大范围。提交、推送、部署与发行仍沿用各自授权。

来源不可取得、兼容性无法证明或工具不可用时，保留现有工作并说明具体缺口；继续可独立完成的部分，不以相似原生控件、假导入或假成功掩盖未完成。

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
