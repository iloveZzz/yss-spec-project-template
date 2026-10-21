# 企业多页工作区配方

新企业高保真默认使用本配方；已有批准页面先登记保持项。视觉尺寸只读取根 DESIGN.md 的 workspace 角色，业务规则仍消费交互说明与状态矩阵。

## 任务与布局

顶部承载真实模块入口，侧栏承载当前模块的分组页面，可关闭页面 Tag 承载已打开的工作上下文。只登记可操作页面，不复制参考系统的账号、业务数据和全部菜单。单页任务使用同一应用壳的单页入口；组件状态展示保留独立入口。

取消应用外框的居中限宽，表单内部保留阅读宽度。压缩重复标题和描述；筛选、结果范围、选择和动作直接进入工作视线。详情在选择前不占位，宽屏选中后展开分栏，较窄视口用 Sheet。导航形态及尺寸按根规范，页面主滚动、详情滚动和表格横向滚动职责明确。窄屏保证主要任务和退出动作可达。

应用壳由固定 Button、Badge（页面 Tag 容器）、DropdownMenu、Tooltip、Sheet、AlertDialog 组合；这不是新登记的上游 Sidebar，不安装额外库或改变 revision。明确选择玻璃时只用于导航和浮层，密集正文保持实底。

## 作者接口

`assets/vue-business-patterns/workspace.ts` 提供 `mountWorkspace(definition)`：

- `brand`、`modules: [{id,label}]`、`groups: [{id,label,moduleId}]`。
- `pages: [{id,title,moduleId,groupId,component,icon?,sceneKey?,mapScene?}]` 和 `defaultPage`。ID 为唯一 kebab-case；未知模块、分组、默认页及无页面模块拒绝初始化。
- `sceneMode` 默认 `pages`，从共同场景的 `initial_data.pages[sceneKey || id]` 取原始场景；兼容单页使用 `direct`。`mapScene(scene)` 可显式选择已有来源，但必须返回 ID、状态来源和数据，不能静默回退 primary。
- `appearance` 默认 `standard`；`glass` 为可选外观。密度仍由现有 CLI/config 规则选择。

构建配置仍为 schema 1 的 title、entry、scenarios、可选 density；入口导入 mountWorkspace 和明确页面定义。原有 `mount(page,title,appearance)` 继续生成单页应用壳，默认页 ID 为 main。无配置 starter 仍为查询任务；多页演练使用 `workspace-standard.config.json`，玻璃使用 `workspace-glass.config.json`。

页面通过 `useWorkspacePage()` 接入：`trackDirty(computed(...))` 报告真实未提交修改，成功提交或接受服务端快照后更新基线；`onLeave(cleanup)` 关闭 Select/Menu/Sheet/Dialog、撤销焦点请求及暂停临时任务。页面业务数据归页面实例所有，重开从当前场景全新复制；不把用户输入写回共同 fixture。

## 导航、草稿和场景

页面 Tag 使用 `nav` + 原生 Button 的导航语义及 `aria-current="page"`，不用 Tabs/tablist/tabpanel。激活按钮与关闭按钮并列，不嵌套按钮；默认页固定，其余可关闭。左右键及 Home/End 只移动焦点，Enter/空格激活，Delete 请求关闭；窄屏通过已打开页面菜单访问其他页面。溢出时只滚动 Tag 容器，不能带动正文。当前项使用主色浅底、描边和字重；页内视图 Tabs 保留主色文字与指示线，不叠加填充胶囊。

收起导航保持图标居中、当前项标记和可访问名称，Tooltip 使用反相表面及同色箭头；选页、展开或改变断点时关闭旧提示。动效消费现有 Token，并响应减少动效。

按页面 ID 去重打开。默认页固定；关闭当前页后选左侧相邻页，没有时回默认页。关闭有修改的页签须确认，取消完整保留；关闭其他页不得改变当前页的输入和滚动。

切换页签保留组件缓存、筛选、分页、选择、草稿及滚动。隐藏页从活动 DOM 移除，临时浮层关闭，不允许隐藏 Dialog 抢焦点。冲突示例离开时关闭编辑弹窗但保留草稿，返回后通过“继续编辑草稿”恢复。缓存只在当前文档内存，不用 Cookie 或浏览器持久存储，刷新重新初始化。

链接使用 `?page=<id>#scenario=<id>`。页面 query 只接受一个合法 page，场景 hash 沿用原有严格校验；未知、重复或缺失入口明确报错。前进/后退只切换页面时保留缓存，场景变化则销毁全部缓存。重置保留链接指向的当前页、回到该场景初始数据，其余非默认页关闭；评审工具的减少透明选项不属于业务草稿。

初始化先校验全部页面的数据映射，再挂载当前页，首次 Vue 渲染后调用 ready(ticket)。错误不发送成功，迟到 ticket 不覆盖当前结果；初始化确认不证明业务行为正确。

## 共同演练输入

`compose-workspace-scenarios.mjs --write` 根据五类原始 JSON 生成 workspace.scenarios.json，`--check` 核验精确字节。每页记录原始场景 ID、state_ref、source_ref 和源文件摘要，原文件随构建 provenance 交付。

- primary：全部页面的原有 primary。
- exceptions：表单 failure、审批 failure、冲突 conflict；查询和分析使用 primary。
- no-permission：四类已有权限场景的页面使用 no-permission；分析没有写动作，明确使用原有 primary。
- empty：查询、审批、分析使用 empty；表单和冲突保持 primary。

组合是教学任务集合，不声明页面之间共享业务存储或建立新联动。导出器同时输出五类单页、企业工作区和组件状态页。比较候选仍共用场景 JSON；比较 v2、Prototype Evidence v4、Visual Baseline v1 不增加批准字段。

## 六轴 QA

核对导航一致、页签键盘/关闭回退、草稿取消/确认、重新打开、非法入口、反复重置、浮层清理、详情退出和焦点返回；复验五类原有主流程与失败恢复。检查计算样式、窄屏任务、缩放、滚动、对比度及 console。构建和模型单测不能代替浏览器检查；受环境限制时逐项记未执行并保留原因，不宣布 implementation-ready。
