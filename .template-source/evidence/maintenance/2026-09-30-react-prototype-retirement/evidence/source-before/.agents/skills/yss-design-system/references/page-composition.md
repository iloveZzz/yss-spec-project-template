# 企业页面组合与主题适配

此文只说明使用规范角色的方法。先读根 DESIGN.md、已有页面保持项、交互说明和状态矩阵；数值以规范派生变量为准。

- 页面按任务阶段分组：筛选区回答范围，工具栏回答可执行动作，结果区回答对象状态，详情承接次要字段。Card 表示有独立标题/责任的区域，不以 Card 套 Card 制造层级；Separator 分隔相邻内容，不替代标题。
- 紧凑工具栏保持单个主操作；次要动作进入 DropdownMenu 时保留可发现入口。结果数、筛选范围、选中数量和剩余事项可扫描，窄屏按字段组换行，不压缩正文。
- Field 同时组织标签、说明和错误，错误定位到控件；长说明自然换行。InputGroup 只承载输入附加信息或相关操作，外层统一边框与焦点，内层禁止重复尺寸。
- Sheet 承接列表详情，Dialog 承接短决策，AlertDialog 承接现有合同要求的确认。标题、说明、退出和焦点返回齐全；窄屏操作不被浮层边缘遮挡。
- 持续权限/冲突/部分失败原因用 Alert，Badge 仅补充状态。Tooltip 不承载唯一必要信息。Empty 给原因和下一步，Skeleton/Spinner 配可读加载状态。
- 指标只突出任务相关主次；Tabs 不隐藏必须同时比较的信息。必要横向表格保留关键列和滚动提示，外层页面不滚动溢出。

新原型默认浅色 compact；comfortable 显式选择，既有局部修改遵守保持项。映射层消费命名组件变体及 body/spacing/rounded 角色，不再应用生产 compact 算法。暗色入口仅供历史参考，未完成当前规范验证。

组件使用条件、依赖、状态和键盘配方见 `yss-prototype-stage/references/component-recipes.md`。三组正反例见 [enterprise-craft.md](enterprise-craft.md)；五类可运行模式和组件状态展示由原型技能导出。预览 `.template-source/design/preview.html` 只展示主题与组件状态，不能当作已批准产品页面。

## Vue 高保真组件适配

新页面优先使用原型技能登记的 shadcn-vue 组件，按任务借鉴 Blocks；样式映射仍消费根 DESIGN 角色。Select/Menu/Sheet 的交互由 Reka UI 承担，主题层只改变外观，不删焦点环、禁用反馈或退出路径。玻璃仅用于已选择的局部表面，正文与表格保持稳定底色，实测背景合成对比度并支持减少透明；不把研究外观写成规范默认。
