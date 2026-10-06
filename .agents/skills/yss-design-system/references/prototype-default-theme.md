# 高保真原型默认主题

用于新高保真 H1/H2 页面，shadcn-vue + Vue 3 与原生轻量路线共用。颜色、字体、尺寸仍以当前项目根 DESIGN.md 为准；主题只选择已定义的角色和组件变体。既有批准原型不自动迁移，局部修改先登记保持项。

## 密度与视觉角色

新页面默认 `compact`：控件采用 `components.button-compact.height`，容器采用 `components.card-compact.padding`；窄屏恢复普通控件高度并让筛选、动作与摘要列表换行。`comfortable` 保留根规范普通控件与 Card 变体。密度不压缩正文、焦点或错误说明，不把生产 compact algorithm 的排版结果直接套给原型，也不再次运行算法。

正文使用 `typography.body`，页面标题和分区标题分别使用 `heading-lg`、`heading-md`，辅助信息才用 `caption`。页面、内容、浮层分别使用对应表面角色；主操作使用 button-primary 系列，不能回退到品牌 seed。筛选、列表、表单和审批优先用边界与分组表达层次。

`variables.css` 中 `--yss-colors-*`、`--yss-typography-*`、`--yss-components-*` 是规范角色投影；既有 `--brand-*` 保留运行时桥接。别名由 design-md 工具生成，不手工维护第二套值。只补视觉角色时可执行 `node .agents/skills/yss-design-system/scripts/design-md.mjs export dtcg --write-css --write-manifest`，改动源值或生产算法时仍执行完整派生。新主题的计算样式须与当前根规范比对，历史缺少角色别名的快照不作为当前规范一致性的证据。

## 默认页面结构

新企业页面套用根规范 workspace 应用壳：模块、分组侧栏、页签和流式任务区。标题使用 workspace-title；既有页面保持项不被新框架覆盖。多页状态见原型技能 `references/enterprise-workspace.md`，不把页签缓存视为持久保存。

- 查询：条件与筛选动作对齐；列表标题、排序/选择状态位于紧凑工具栏，分页在结果后。窄屏转为带身份、名称、状态和操作的摘要列表。
- 表单：按任务分组，控制阅读宽度；错误靠近字段且可定位，返回保留输入，确认动作保持可见。
- 审批：身份、状态、责任人与操作沿行组织；不可操作原因保留可读文本，失败项保持可重试。
- 分析：指标主次与明细共用筛选；横向滚动限定在数据区域，提供提示、固定关键列与键盘访问。

## 交互与检查

统一 hover、active、focus-visible、disabled、selected、invalid；反馈采用语义表面和文字。动效只用于反馈且使用项目动效 Token，减少动效时取消。完整行为仍消费交互说明与状态矩阵，不由主题定义。

六轴 QA 中检查当前计算样式、文字对比度、选中/错误状态、桌面和窄屏、键盘与焦点返回、200% 缩放、减少动效及 console。密度变小不能作为质量提升的证据；同时检查每屏信息量、主操作可发现性与恢复任务可完成性。前后对照必须采用相同内容、状态和视口，视觉收益需由用户确认。
