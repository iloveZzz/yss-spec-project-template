# YTable 多选与批量操作

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。示例代码属于目标工程，模块相对导入按所示文件位置解析。

## 表格多选与批量操作标准模式

当业务需要 Checkbox 多选与批量操作（如批量删除、批量导出、批量启用）时，遵循以下规范：

1. **列配置**：首列必须声明 `{ type: 'checkbox', width: 50, fixed: 'left', align: 'center' }`。
2. **行唯一键**：必须显式指定 `:row-config="{ keyField: 'id', useKey: true }"`（`keyField` 与业务主键如 `userCode` 对齐）。
3. **受控双向绑定**：推荐优先使用 `v-model:selected-row-keys="selectedRowKeys"` 或 `v-model:selected-rows="selectedRows"`，或者统一监听 `@selection-change`。
4. **批量操作按钮**：放在 `#toolbar-right`，并配置 `:disabled="selectedRowKeys.length === 0"`。
5. **清空选中态**：批量操作成功后，清空实际受控的 `selectedRowKeys` / `selectedRows`，并在存在表格内部选择缓存时调用已核验的 `tableRef.value.clearSelection()`。受控状态与组件可见勾选必须一致；不能只清其中一层。

```vue
<YTable
  ref="tableRef"
  v-model:selected-row-keys="selectedRowKeys"
  :row-config="{ keyField: 'id', useKey: true }"
  :data="dataList"
  :columns="TABLE_COLUMNS"
  pageable
  v-model:pagination="pagination"
  @page-change="handlePageChange"
>
  <template #toolbar-right>
    <YButton :disabled="selectedRowKeys.length === 0" @click="handleBatchDelete">批量删除</YButton>
  </template>
</YTable>
```
