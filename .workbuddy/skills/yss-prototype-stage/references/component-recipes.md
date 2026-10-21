# 任务、页面组合与当前组件

先读当前交互说明和状态矩阵，再按任务选择组合。组件可用不代表业务规则已批准；此处只导航已固定源码，不自动搜索 registry、执行 latest 或覆盖 preset。新高保真优先 shadcn-vue + Vue 3；历史 React 包仅显式 legacy 只读校验。Blocks 仅提供任务组合参考，不自动复制上游页面、依赖或默认主题。

## 任务导航

| 用户任务 | 页面组合 | 当前组件 | 状态与验收重点 |
|---|---|---|---|
| 在多个业务页面间连续处理 | 模块 → 分组侧栏 → 页签 → 工作区 | Button、Tabs、DropdownMenu、Tooltip、Sheet、AlertDialog | 页面去重、dirty 关闭确认、切换保留草稿、场景重置清空、隐藏浮层清理；见 [企业工作区](enterprise-workspace.md) |
| 查询后核对资料 | 筛选 → 结果与选择 → 分页 → 详情侧栏 | Field/Input/Select、Table/Checkbox/Badge、Pagination、DropdownMenu、Sheet | 查询/排序后的页码合法；显示筛选和选择范围；跨页选择按当前合同保留；空态可恢复；390px 摘要保留身份/名称/状态/操作，次要字段进详情 |
| 分步录入并确认 | 字段分组 → 帮助/错误 → 下一步 → 结果 | Field、InputGroup、Textarea、Button、Alert | label/帮助/错误绑定同一字段；首错定位；返回保留全部输入；失败重试不重置草稿；窄屏单列 |
| 单项/批量审批 | 待办列表 → 持续原因 → 主操作 → 剩余事项 | Checkbox、Badge、Alert、Button、Separator | 主操作直接可见；禁用原因无需 Tooltip 才能发现；部分失败保留失败项和重试入口 |
| 冲突恢复 | 字段草稿 → 阻断说明 → 放弃确认 → 全量重载 | Field、Alert、Dialog、AlertDialog | 取消确认保留草稿；确认按状态矩阵完整替换快照；核对版本及再次保存，不能只核对提示文字 |
| 高密度核对 | 指标主次 → 同源筛选 → 概览/明细 → 定位 | Card、Tabs、Table、Separator | 指标及明细来自同一筛选；横向滚动仅在表格内；滚动提示、关键列与可聚焦入口稳定；不默认引入图表 |
| 等待、空结果与上下文 | 加载占位 → 空态下一步；当前位置 | Skeleton/Spinner、Empty、Breadcrumb | 加载有可读文本，不用无限动画冒充进度；路径最后一项标当前页，无目标不伪造链接 |

## 组件选择与依赖

固定集合及摘要以 `assets/shadcn-vue-authoring/registry-manifest.json` 为准，当前共 27 组。基础 11 个为 Button、Input、Dialog、Select、Table、Badge、Label、Checkbox、Textarea、Tabs、AlertDialog；补充 13 个为 Card、Separator、Breadcrumb、Field、InputGroup、Alert、Empty、Skeleton、Spinner、Sheet、DropdownMenu、Tooltip、Pagination；新增 Combobox、RangeCalendar、Popover。

- Field 组合 Label/Separator；InputGroup 组合 Button/Input/Textarea；Pagination 使用 Button 变体。Table 只负责基础表格，筛选、排序、分页和选择逻辑消费本地场景与现有业务合同。
- Vue 的 Sheet、DropdownMenu、Tooltip 使用固定 reka-ui；图标使用 @lucide/vue。构建器验证固定 revision、许可、包版本、锁及依赖闭包。主题只在本地映射层适配，源文件变更须另记差异。
- 搜索单选与纯日期范围按 [专项配方](search-date-patterns.md) 使用；不使用未登记的多选、日期时间、图表、Sidebar 或 Sonner。确有新增需求时先明确决策及验证范围，不假装当前已支持。

## 键盘、焦点及主题配方

- Field：Vue `for`与唯一控件 ID 对应；说明和错误 ID 写入 `aria-describedby`；验证错误设置 `aria-invalid`，焦点转到第一处错误。服务端模拟失败用持续 Alert，保留全部步骤输入。
- InputGroup：边框和焦点环由外层统一提供；内层不重复高度、边框和圆角。附加操作按钮有独立名称，不把点击说明等同于提交。
- Sheet/Dialog：标题与说明完整；Escape、关闭和取消路径可用；关闭后回到原触发器。窄屏内容滚动时操作可访问，必要时全宽；不要把复杂多步骤强塞进小弹窗。
- DropdownMenu：次要操作才收纳；Arrow/Enter/Escape 可操作，禁用项不可执行，关闭焦点返回；关键主操作始终可见。Tooltip 仅补充说明，不能承载唯一错误或权限原因。
- Pagination：显示结果数、当前页和页数；首尾按钮禁用；筛选导致结果减少时回到合法页；选择范围明确，空结果不出现虚假资料。
- 所有组件使用当前 DESIGN 角色，compact/comfortable 不修改正文角色。窄屏按当前普通控件变体；点击区域和相邻间距实测，不能以控件名或高度证明无障碍。
- 场景切换/重置重新初始化局部状态，清除输入、错误、菜单、Sheet/Dialog 与选择。菜单打开时也要通过场景 hash 切换验证清理；初始化确认不代替行为测试。

- Select：有限选项使用真实 SelectTrigger/SelectContent/SelectItem；核对 Arrow/Enter/Escape、选中反馈、焦点返回、弹层宽度及窄屏边界。Vue 使用 `v-model` / `update:modelValue` 与 `--reka-select-trigger-width`，不得复制 React 的事件或 Radix 变量。原生 select 只用于明确选定的轻量路线或独立评审工具，并在证据注明。

## 可运行教学与证据

原五类模式、新增两个变体与组件状态展示见 [Vue 集成](shadcn-vue-integration.md)，`export-vue-patterns.mjs` 或兼容命令 `export-business-patterns.mjs` 均构建 Vue。组件展示使用 `component-states-standard.config.json`，默认、禁用、错误、加载、选中、浮层均可复现。三个视觉正反例仍从设计系统的 `references/enterprise-craft.md` 导航。

所有检查并入六轴 QA：记录场景、来源、步骤、实际结果和适用视口；行为缺陷、视觉观察与偏好建议分别报告。沿用 Prototype Evidence v4、Visual Baseline v1 与比较 v2，不新增批准字段或生命周期门禁。
