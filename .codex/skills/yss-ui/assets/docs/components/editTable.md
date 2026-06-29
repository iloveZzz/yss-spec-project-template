---
title: EditTable 编辑表格
route: /components/edit-table
toc: content
---

# EditTable 可编辑表格

基于 vxe-table 4.16 封装的可编辑表格组件，支持行内编辑、校验、自定义列、字典转换、下拉过滤、行拖拽排序、操作列与分页等能力。

## 基础使用

<code id="demo-edit-table-basic" src="./demos/edit-table/basic/index.vue"></code>

## 表单类型

<code id="demo-edit-table-all-types" src="./demos/edit-table/all-types/index.vue"></code>

## 行级编辑保存（编辑/保存/取消）

点击"编辑"按钮进入编辑态，通过"保存"按钮提交修改（包含校验），通过"取消"按钮放弃修改并还原数据。

<code id="demo-edit-table-row-edit" src="./demos/edit-table/row-edit/index.vue"></code>

## 必填项校验（editRules）

<code id="demo-edit-table-required" src="./demos/edit-table/required/index.vue"></code>

## 自定义校验（去重/长度）

<code id="demo-edit-table-custom-rule" src="./demos/edit-table/custom-rule/index.vue"></code>

## 下拉过滤（按行过滤）

<code id="demo-edit-table-filter" src="./demos/edit-table/filter/index.vue"></code>

## 行拖拽排序

<code id="demo-edit-table-drag" src="./demos/edit-table/drag/index.vue"></code>

## 分页

<code id="demo-edit-table-pagination-action" src="./demos/edit-table/pagination-action/index.vue"></code>

## 行级字典（rowOptionsFieldName）

当“每一行”的下拉候选不同，或不希望全局字典变化后历史值退化为 code 时，可使用行级字典覆盖。组件读取每行对象上 `rowOptionsFieldName` 指定的字段（默认 `'options'`）作为该行的候选项，优先级：行级 > 列级 `options` > 全局 `optionsMap[field]`。

适用场景：
- 某列候选项依赖该行的其它字段（如产品→版本），不同的行候选不同；
- 版本等选项来源于后端联动接口，只想影响当前行而非整体；
- 全局 `optionsMap` 切换时，已选择的历史值仍需被正确翻译展示。

示例：

<code id="demo-edit-table-row-options" src="./demos/edit-table/row-options/index.vue"></code>

## 直接可编辑（默认进入编辑态）

<code id="demo-edit-table-direct-editable" src="./demos/edit-table/direct-editable/index.vue"></code>

## 字段联动（Select 反显到 Input，并联动其他列）

<code id="demo-edit-table-linkage" src="./demos/edit-table/linkage/index.vue"></code>

## 异步接口联动（同列按行选择触发服务端切换）
<code id="demo-edit-table-async-remote" src="./demos/edit-table/async-remote/index.vue"></code>


## 自定义插槽渲染（控件层联动）

<code id="demo-edit-table-slot-linkage" src="./demos/edit-table/slot-linkage/index.vue"></code>

## 大数据无分页（滚动渲染）

<code id="demo-edit-table-big-data" src="./demos/edit-table/big-data/index.vue"></code>

## 提交后展示保存的数据

<code id="demo-edit-table-submit-view" src="./demos/edit-table/submit-view/index.vue"></code>

## API

### YEditTable Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `data` | `any[]` | `[]` | 表格数据（支持 `v-model:data`） |
| `columns` | `Array<YEditColumn>` | `[]` | 列配置（见下） |
| `tableConfig` | `Record<string, any>` | `{}` | vxe-table 配置聚合（兼容 v4：`rowConfig/cellConfig/columnConfig/editConfig/...`） |
| `optionsMap` | `Record<string, any[]>` | `{}` | 字典数据映射，按列 `field` 取值 |
| `rowOptionsFieldName` | `string` | `'options'` | 行级字典字段名（用于每行覆盖候选项，优先级最高） |
| `disabled` | `boolean` | `false` | 禁用编辑 |
| `loading` | `boolean` | `false` | 加载中 |
| `maxHeight` | `number \| string` | `-` | 最大高度 |
| `actionConfig` | `YTableActionConfig` | `{ buttons: [] }` | 列级 `type:'action'` 使用的按钮配置（不默认追加） |
| `rowDragable` | `boolean` | `false` | 是否开启行拖拽（v4 `rowDragConfig`） |
| `showDragHandle` | `boolean` | `true` | 是否显示拖拽把手列 |
| `dragHandleWidth` | `number \| string` | `46` | 把手列宽 |
| `dragHandlePlacement` | `'left' \| 'right'` | `'left'` | 拖拽把手列位置（左侧或右侧） |
| `dragHandleFixed` | `boolean \| 'left' \| 'right'` | `false` | 拖拽把手列是否固定。`false` 不固定，`true` 自动根据 `dragHandlePlacement` 决定，`'left'/'right'` 明确指定固定方向 |
| `rowDragConfig` | `VxeTablePropTypes.RowDragConfig` | `-` | 行拖拽配置（合并到内置配置） |
| `toolbarConfig` | `{ custom?: boolean }` | `{ custom:false }` | 工具栏配置（最小：开启列设置） |
| `expandConfig` | `VxeTablePropTypes.ExpandConfig` | `{}` | 展开行配置 |
| `pageable` | `boolean` | `false` | 是否分页（Ant Design Vue Pagination） |
| `pagination` | `{ current, pageSize, total?, remote?, showSizeChanger?, showQuickJumper?, pageSizeOptions? }` | `{ current:1,pageSize:20,... }` | 分页配置 |
| `addable` | `boolean` | `false` | 是否显示“添 加”按钮 |
| `addBtnText` | `string` | `'添 加'` | “添 加”按钮文案 |

### 事件

| 事件名 | 参数 | 说明 |
| --- | --- | --- |
| `update:data` | `data: any[]` | v-model:data 回写 |
| `updateRow` | `{ row, key, value }` | 单元格变更回调 |
| `add` | `-` | 点击“添 加” |
| `delete` | `scope, btn, helpers` | 删除操作回调。`scope` 包含 `{ row, rowIndex, column }`，`btn` 为按钮配置，`helpers` 包含 `{ close, hideLoading }` 方法 |
| `page-change` | `{ current, pageSize }` | 分页变更 |
| `size-change` | `pageSize: number` | 页大小变更 |

### 插槽说明

插槽支持如下几类（在 HTML/JSP 等 DOM 模板中请一律使用 kebab-case）：

- **单元格内容（推荐）**：按列字段命名 `#<field>`（如 `#name`），仅作用于该列的非编辑态显示。作用域参数包含 `row`（当前行数据）、`column`（列配置）、`rowIndex`（行索引）。
- **表头（推荐）**：`#<field>-header`（如 `#name-header`）优先于全局 `#header`。兼容旧写法 `#<field>Header`。
- **展开行内容**：`#expand-row` / `#expandRow`，用于自定义展开行的内容。需配合列配置 `type: 'expand'` 使用。作用域参数包含 `row`、`rowIndex` 等。
- **分组表头**：`#group-header` / `#groupHeader`，用于自定义分组表头的内容。仅在列配置包含 `children` 时生效。作用域参数包含 `column` 等。
- **操作列"更多"图标**：`#action-more-icon` / `#actionMoreIcon` 更换收纳触发图标（适用于所有操作列）。

**提示**：DOM 模板（如 JSP、原生 HTML 模板）会将属性名统一转为小写，`#nameHeader` 会变为 `#nameheader` 导致匹配失败。因此我们统一推荐使用中划线（kebab-case）插槽名；为兼容历史代码，组件内部同时支持 camelCase，但后续将逐步以 kebab-case 为规范。


### 方法（通过 ref 获取）

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `getTableInstance` | `() => VxeTable` | 获取 vxe 实例 |
| `validate` | `() => Promise<{ valid: boolean; errorMsg: Map<string,string> }>` | 触发表格校验（含必填与自定义） |

### 列配置（YEditColumn）

在 `vxe-column` 基础上扩展以下字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `field` | `string` | 字段名 |
| `title` | `string` | 列标题 |
| `component` | `'form-item-input' \| 'form-item-input-number' \| 'form-item-select' \| 'form-item-date' \| 'form-item-date-range' \| 'form-item-time' \| 'form-item-tree-select' \| 'form-item-cascader' \| 'form-item-switch' \| 'form-item-checkbox'` | 编辑器类型（基于 Ant Design Vue） |
| `props` | `Record<string,any>` | 透传编辑器 props；<br />`Select` 支持 `fieldNames`、`multiple`、`allowCreate(tags)`；<br />`TreeSelect/Cascader` 支持 `fieldNames:{ label,value,children }`；`Switch/Checkbox` 支持 `trueText/falseText`（查看态显示文案）；`TreeSelect` 支持 `treeNodeFilterProp`（默认按 `label` 过滤）；<br />`DatePicker` 支持 `format/valueFormat`，并默认 `getPopupContainer: () => document.body` |
| `cellProps` | `(ctx) => Record<string,any>` | 单元格级动态 props 函数。按行/按值返回透传给编辑器的 props，与 `props` 合并后生效，优先级高于 `props`。<br />**参数**：`{ row, field, column }`<br />**使用场景**：为特定行的单元格定制交互，如仅当前行的 Select 显示 loading，或根据行数据动态禁用某些选项。详见下方示例 |
| `isTransform` | `boolean` | 查看态字典翻译（基于 `optionsMap`） |
| `formatter` | `(ctx) => string \| number` | 自定义查看态文本渲染函数。若提供，优先于内置翻译。<br />**参数**：`{ cellValue, row, column, transformed }`<br />- `cellValue`：当前单元格的原始值<br />- `row`：当前行数据<br />- `column`：列配置<br />- `transformed`：组件根据字典翻译/路径计算好的文本，可直接复用或自定义拼接 |
| `filterOptions` | `(ctx) => any[]` | 行级下拉过滤器。参数：`{ field, optionsMap, row }` |
| `customRule` | `(value, row, field, tableData) => { errMsg?: string }` | 自定义校验函数 |
| `options` | `any[]` | 行内写死下拉数据（优先于 `optionsMap[field]`） |

**`cellProps` 使用示例**：

```typescript
{
  field: 'status',
  component: 'form-item-select',
  props: {
    placeholder: '请选择状态'
  },
  // 仅当前行正在加载时显示 loading
  cellProps: ({ row }) => ({
    loading: row.isLoadingStatus === true,
    disabled: row.locked === true
  })
}
```

**`formatter` 使用示例**：

```typescript
{
  field: 'status',
  component: 'form-item-select',
  isTransform: true,
  // 在字典翻译的基础上添加图标
  formatter: ({ cellValue, transformed }) => {
    const icons = { 1: '✅', 2: '⏸', 3: '❌' }
    return `${icons[cellValue] || ''} ${transformed}`
  }
}
```

> 其余 `vxe-column` 原生属性（如 `width/sortable/fixed/filters/filterMethod/...`）保持透传。

### 操作列（YTableActionConfig）

不再默认追加操作列。如需操作列，请在 `columns` 中显式声明 `{ type: 'action', actionConfig }` 或自行插槽渲染。沿用 `y-table` 的按钮配置，按权限/禁用/隐藏、二次确认与异步 loading 全部可用：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | `string` | 列标题（默认“操作”） |
| `width` | `number` | 列宽（默认 120） |
| `align` | `'left' | 'center' | 'right'` | 对齐方式（默认 'center'） |
| `fixed` | `'left' | 'right'` | 是否固定（默认 'right'） |
| `displayLimit` | `number` | 直显按钮个数（默认 3） |
| `moreRenderType` | `'ellipsis' | 'moreButton'` | 更多的展示形式（默认 'moreButton'） |
| `buttons` | `ActionButtonConfig[]` | 按钮列表（`key/text/type/permissionCode/fallback/disabledFn/hideFn/isConfirm/confirmProps/clickFn`） |


> 属性优先级（从高到低）：`columns[i]` 上显式配置 > `columns[i].actionConfig` > 组件 `props.actionConfig` > 内置默认值（`title:'操作'`、`align:'center'`、`fixed:'right'`、`width:120`）。
>
> 因此：当列未显式写 `align/width/fixed/title` 时，可以只在 `actionConfig` 中统一配置这些列级属性。



