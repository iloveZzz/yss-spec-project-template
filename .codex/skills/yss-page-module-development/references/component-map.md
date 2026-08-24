# YSS UI 组件来源速查

此文件用于业务页面生成前的组件选型。优先使用 YSS UI 已封装组件；未封装能力再从 `ant-design-vue` 导入。

## 从 `@yss-ui/components` 导入

| 组件 | 适用场景 | 备注 |
| --- | --- | --- |
| `YButton` | 操作按钮、权限按钮 | 支持 `permissionCode`、`fallback`、`modifiers`；优先替代 `a-button`。 |
| `YCard` | 页面容器、区域容器 | 支持 `title`、`extra`、`padding`、Meta 插槽。 |
| `YTable` | 标准列表、分页、操作列、筛选、字典翻译 | 继承 vxe-table 能力，分页用 AntDV Pagination。 |
| `YEditTable` | 可编辑表格 | 需要底部添加按钮高度时配合 `yss-use-table-height`。 |
| `YTree` | 左侧分类树、组织树、搜索过滤树 | 节点操作用 `getNodeActions`。 |
| `YSplitPane` | 左树右表、可拖拽分割布局 | 左右或上下区域分割。 |
| `YFormily` | JSON Schema 表单、新增/编辑/查看 | 默认表单方案。 |
| `YssFormily` | 表单兼容导出 | 仅用于维护历史代码；新代码统一使用 `YFormily`。 |
| `YConditionBuilder` | 条件构建器、规则配置 | 常用于数据质量、筛选条件配置。 |
| `YFileImport` | 文件导入 | Formily schema 内也可用 `YFileImport`。 |
| `YMonaco` | 代码编辑器 | SQL、JSON、脚本编辑。 |
| `YMonacoDiff` | 代码 Diff | 变更对比场景。 |
| `YCron` | Cron 表达式编辑 | 定时任务配置。 |
| `YMonthCalendar` | 月度日历、节假日和连续区间 | 支持单元格、右键菜单和头部插槽。 |
| `YEcharts` | 图表展示 | 业务图表封装。 |
| `YSheet` | 协同/类 Excel 表格 | 复杂表格编辑。 |
| `AuthorityDropdown` | 权限相关下拉 | 可从 `@yss-ui/components` 导入。 |

## 回退到 `ant-design-vue`

未由 `@yss-ui/components` 导出的组件直接从 `ant-design-vue` 导入，不臆造 Y 前缀。

## 禁止规则

- 不要编造未导出的 Y 前缀组件。
- 业务层不要从 `@formily/antdv` 导入 UI 适配组件。
