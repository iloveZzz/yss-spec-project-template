---
name: ytable-usage
description: "配置或修复 YSS UI YTable 的列表查询、列、分页、行操作、筛选、拖拽、插槽与自适应高度。"
---

# YTable 使用

## 触发条件

- 生成或修改业务列表、CRUD 表格、远程分页、操作列、列筛选、工具栏或行拖拽。
- 需要配置 `YTableColumn`、`YTableActionConfig`、分页状态或表格实例方法。

## 不适用场景

- 可编辑表格是核心需求：使用 `../yedit-table-usage/SKILL.md`。
- 页面只有短小静态数据且不需要表格交互。

## 实施流程

1. 当前会话可用 yss-ui MCP 时，先用 `get_component_docs` 查询 `YTable` 的 Props、Events、Slots、Types 与实例方法；需要远程分页、筛选、操作列、拖拽或工具栏时，再用 `get_demo` 获取对应官方 Demo。
2. MCP 工具不可用、调用失败或用 `search_docs/list_components` 校正后仍无结果时，才读取最新 `llms-full.txt`；若文档与当前项目依赖版本不一致，用当前源码和导出核验。
3. 把 `currentParams`、远程数据、`loading`、分页映射、选择态、API 调用和事件处理放入 Hook；把列定义和纯配置放入 `constant.ts`。
4. 在模板中组合 `data/columns/loading/pagination`，并根据真实开启的工具栏和分页配置高度 Hook。
5. 完成后核对删除确认、远程筛选、分页字段映射和 API 错误处理边界。

## 硬约束（禁止/必须）

- 必须从 `@yss-ui/components` 导入 `YTable`、`YTableColumn`、`YTableActionConfig` 等真实导出，不使用 `a-table` 实现业务主表格。
- 远程分页状态使用 `current/pageSize/total/remote`，显式设置 `remote: true`；后端 `pageIndex/pageSize/totalCount` 只在 Hook 中映射。
- 开启内置分页时传 `pageable`，受控更新使用 `v-model:pagination`，请求时机使用 `@page-change="handlePageChange"`。
- `page-change` 事件参数固定为 `{ current: number, pageSize: number }`；回调必须读取 `current`，禁止写成组件不会派发的 `currentPage`。
- YTable 没有 `request` 或 `searchParams` Props；远程查询由业务 Hook 管理。`refresh()` 是真实实例方法，内部调用 vxe-table `updateData()` 刷新当前表格数据，不等于重新调用后端接口。
- 行键使用 `:row-config="{ keyField: 'id', useKey: true }"`，不臆造 `row-key` Prop。
- 新增、导入、批量操作等主按钮直接放入 `#toolbar-right` 或 `#toolbar-left` 插槽即可自动渲染工具栏；**无需配置 `:toolbar-config="{ custom: true }"`**，避免无端展示列设置图标；**仅在业务明确需要列设置时才传入 `:toolbar-config="{ custom: true }"`**。
- 删除、启停、发布等危险操作使用 `actionConfig.buttons[].isConfirm = true`，不默认使用 `Modal.confirm`。
- 纯列配置集中到 `constant.ts`；需要调用组件 Hook 的操作配置使用工厂函数注入回调，禁止在 `constant.ts` 直接引用组件局部的 `openEdit/deleteItem`。按职责和依赖拆分，不用配置行数决定拆分。
- 远程筛选必须提供稳定 `filters`，设置 `filterMethod: () => true` 禁用本地二次过滤，并监听 `filter-change`。
- 自适应滚动列表绑定 `:height="tableHeight"`；`pageable`、工具栏分别对应 `withPagination: true`、`withToolbar: true`。纯短表不强制引入高度 Hook。
- `mutator.ts` 已对网络错误和 `success === false` 统一 `message.error` 并 reject。API Hook 不再检查 `success === false`，不在 `else/catch` 重复 `message.error`；用 `finally` 恢复 loading，让异常继续中断流程。
- 远程列表只维护一份 `currentParams`。查询和重置回到第一页，翻页只更新页码与页大小并保留筛选条件；刷新、导出和编辑后重载复用同一参数源。批量操作成功后清空受控选中态和组件内部选中态。
- 使用真实签名 `useTableHeight(tableAreaRef, options)`，结果绑定 `:height="tableHeight"`。稳定布局采用可计算高度的 flex column，表格区设置 `flex: 1; min-height: 0; overflow: hidden`，不用固定大高度或魔法偏移。
- `pageable`、工具栏插槽、YEditTable 添加按钮分别对应 `withPagination`、`withToolbar`、`withAddButton`；只扣除实际开启的区域。shrink-wrap 容器使用更外层稳定 `boundaryRef`，弹层或隐藏布局仅在可见后按需 `nextTick(recalculateHeight)`。

## 按需示例

首次搭建列表、列工厂或排查远程分页映射时，读取 [列表与分页示例](references/table-pagination-examples.md)。示例不替代当前项目 API 核验。

启用 Checkbox 多选或批量操作时，读取 [多选与批量操作](references/selection-and-batch.md)，核验受控状态、禁用条件和成功后的清理。

## 插槽与实例边界

- 优先使用 kebab-case：单元格 `#<field>`、表头 `#<field>-header`、筛选 `#<field>-filter`、工具栏 `#toolbar-left/#toolbar-right`、展开行 `#expand-row`、分组表头 `#group-header`、更多图标 `#action-more-icon`。
- `getTableInstance()`、`refresh()`、`recalculate()`、`clearSelection()`、`getSelectedRows()`、`getSelectedRowKeys()`、`setSelection()`、`getPaginationInstance()` 是真实暴露方法；只在对应语义下使用。

## 交付检查清单

- [ ] 分页状态和 `page-change` 参数均使用 `current/pageSize`，未使用 `currentPage`；`filter-change` 与 YTable 真实 API 一致。
- [ ] 启用多选时，列已配置 `type: 'checkbox'`，已设置 `:row-config="{ keyField: 'xxx', useKey: true }"`，批量按钮绑定了 `selectedRowKeys.length === 0` 禁用。
- [ ] 批量成功后，所有实际受控选择字段与表格可见勾选均已清空；内部缓存存在时已通过 `clearSelection()` 清除。
- [ ] 未使用虚构 `request/searchParams/row-key` Props，也未把 `refresh()` 当成远程请求。
- [ ] 工具栏、字典翻译、操作确认与高度偏移均与实际开关一致。
- [ ] 查询、重置、翻页、刷新和导出复用同一份 `currentParams`；查询/重置回到第一页，批量成功后清空选中态。
- [ ] 高度观察容器稳定；分页/工具栏偏移没有重复扣减，隐藏态仅在必要时补算。
- [ ] API Hook 没有 `success === false` 分支或重复 `message.error`。

## 失败兜底策略

- 分页字段混乱时，在 Hook 中分离 YTable 状态和后端参数，不直接把 `pageIndex/totalCount` 绑到组件。
- 操作过多时使用 `displayLimit` 和更多菜单；远程刷新失效时回到业务 `loadList()`，不把实例 `refresh()` 当成接口请求。
- API 失败后只在 `finally` 恢复本地 loading，让 mutator 的 reject 继续中断删除后刷新等后续流程。
