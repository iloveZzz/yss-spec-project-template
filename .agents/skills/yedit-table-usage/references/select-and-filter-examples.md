# YEditTable Select 与筛选示例

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。示例代码属于目标工程，模块相对导入按所示文件位置解析。

## Select 值类型边界

```typescript
/** allowCreate 对应 tags 模式，字段按数组存储。 */
interface CreatableRow {
  tags?: string[];
}

const creatableColumn: YEditTableColumn = {
  field: 'tags',
  title: '标签',
  component: 'form-item-select',
  props: { allowCreate: true, placeholder: '请选择或输入标签' },
};
```

## 表头筛选

```typescript
const textFilterColumn: YEditTableColumn = {
  field: 'columnName',
  title: '目标列名称',
  component: 'form-item-input',
  filterable: true,
  filters: [{ data: '' }],
  filterMethod: ({ option, cellValue }) =>
    String(cellValue ?? '').toLowerCase().includes(String(option?.data ?? '').trim().toLowerCase()),
  filterRender: { name: 'VxeInput', props: { clearable: true, placeholder: '请输入关键词' } },
};
```

- 远程筛选监听 `@filter-change`，并设置 `filterMethod: () => true` 禁用本地二次筛选。
- 切换数据源或新增行后，可调用 `tableRef.value?.getTableInstance()?.clearFilter()`。
- 只在面板高度定制时使用 `#<field>-filter`；修改 `option.data` 后调用 `updateFilterOptionStatus(option, !!option.data)` 同步状态。
