# 高保真组件采用矩阵（研究建议，未实施）

本矩阵消费简报 claim-001～006、013。继续使用原版 shadcn/ui + React；Vue 文档用于方法与行为参考，不作为 React API。现有 11 个组件仍是当前可运行范围，新候选未进入作者工具白名单。

## 第一批：补字段、反馈、详情和页面结构

| 候选 | 触发条件 | 不应使用的情况 / 代价 | 必须验证 |
|---|---|---|---|
| Field 家族、InputGroup | 字段含说明、错误、单位或输入内动作；需要稳定分组 | 不是校验规则引擎；不能编造必填或范围；字段缺可读label不能以placeholder代替 | for/id、aria-describedby、aria-invalid、错误定位、窄屏说明完整；输入内按钮不误提交 |
| Alert | 页面或局部存在持续性异常、阻断或说明 | 不将所有提示升级为阻断；不靠危险色表达全部语义 | role/live策略适当，原因和下一动作可读，恢复后提示更新 |
| Empty | 无数据、无匹配结果、初次使用等明确状态 | 无权限和加载失败不能伪装为无数据；当前用户无创建权限时不能提供假创建入口 | 清除筛选或合法下一步；不丢失筛选条件和任务上下文 |
| Skeleton、Spinner | 初次加载占位、局部处理、提交等待 | 没有实际等待状态时不添加装饰加载；不默认无限动效 | 防重复提交、加载结束后焦点稳定、超时/失败有出口、reduced-motion下实际行为 |
| Sheet | 保持列表上下文查看或轻量编辑详情 | 复杂分步任务不塞进狭小侧栏；重大行为变化须回低保真 | 标题、打开/关闭、Escape、焦点返回、滚动边界、390px关键动作 |
| DropdownMenu、Tooltip | 次要行操作收纳，补充简短提示 | 主要动作不一律藏入菜单；不可操作原因不能只在hover可见 | 可访问名称、方向键/Escape、焦点返回、触摸替代、禁用项原因 |
| Pagination | 明确的分页列表 | 只是导航结构，不自带查询语义；不要把筛选前总数当筛选后总数 | 首页/尾页、空结果、筛选后页码、跨页选择及按钮状态 |
| Card、Separator、Breadcrumb | 任务分区、阅读层级、跨页面上下文 | 不为每块内容套Card；单页局部演示不强制完整应用壳 | heading层级、主次动作、边距不叠加、窄屏路径与当前页可读 |

第一批仍按任务分小批接入。源码与新增依赖闭包逐个核对，未通过构建和浏览器验证的组件不出现在“当前可用”列表。已有 Badge、Label、Tabs、Dialog、AlertDialog 等继续复用，不重复实现同名替代物。

## 第二批：有真实任务再接入

| 候选 / 组合 | 当前固定源码的接入边界 | YSS 处理建议 |
|---|---|---|
| Popover + Command / Combobox | Vue有Reka Combobox和Popover+Command两种方案；React固定Combobox引入Base UI，Command引入cmdk | 保持现有原语范围时优先评估组合路线；明确模糊搜索、无结果、清除、多选、键盘和中文输入法行为，不自动引入第二套原语库 |
| Calendar / Date Picker | Vue日期类型与React不同；React需react-day-picker等依赖 | 明确日期/时间/时区、范围边界和格式；固定fixture日期，不使用随执行日变化的today作为对照初值 |
| Sidebar | React需要额外hook和组件；两种实现均有cookie持久化 | 先定义是否真需应用壳；采用受场景控制的展开态，记录适配差异；390px展开/关闭不能挡住恢复动作 |
| Chart | Vue=Unovis，React=Recharts；当前作者环境未登记 | 只有指标关系难以用文字/表格表达时采用；映射项目图表语义角色，无对应角色先按DESIGN流程处理，不能照搬上游色板 |
| Sonner | Vue用vue-sonner；React固定文件使用sonner和next-themes | 先评估原型是否需要短时反馈；阻断/错误仍保留页内信息，不能为toast顺手引入完整应用主题系统 |
| Stepper | Vue有对应组件；当前React new-york-v4 tree未发现stepper.tsx | 可先使用语义步骤列表与既有表单模式，不伪造“原版React已登记Stepper”；单独评估社区来源时须固定来源和许可 |
| Resizable、Scroll Area | 增加键盘、焦点、尺寸与滚动行为 | 固定布局/原生overflow足够时保留；复杂分析工作台确需调整面板再采用 |

## 暂不作为企业原型默认

轮播、OTP、聊天消息、附件、问卷、复杂拖拽等仅在需求命中时研究。它们出现在官方目录中，不代表应进入所有后台页面。多主题、字体切换或动态preset也不作为默认高保真增强。

官方 Toast 文档已标记废弃并指向 Sonner；新增实现不选择旧 Toast。已有历史交付保持原样，不因本建议批量修改。

## 建议新增的按需参考结构

以下是待实施路径，不表示这些文件已经存在：

```text
.agents/skills/yss-prototype-stage/references/component-selection.md
.agents/skills/yss-prototype-stage/references/component-behavior-recipes.md
.agents/skills/yss-design-system/references/enterprise-page-layouts.md
```

每条配方应包含：用户任务、适用/不适用条件、当前登记组件、上游revision和依赖、项目Token角色、actionKey/状态来源、键盘与焦点、窄屏策略、正反例和浏览器断言。字段沿用已有交互说明与QA，不新增批准清单。

Skill入口只增加“遇到此类任务读取哪份参考”；禁止每次高保真生成都加载整个组件目录。局部修改首先读取保持项，不能为了套新配方重做页面。
