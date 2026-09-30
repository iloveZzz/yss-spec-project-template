# YEditTable 组合示例

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。示例代码属于目标工程，模块相对导入按所示文件位置解析。

## 标准代码骨架

```typescript
import type { YEditTableColumn, YTableActionConfig } from '@yss-ui/components';

/** 扩展属性行。 */
export interface ExtRow {
  id?: string;
  _rowKey: string;
  extName?: string;
  extValues?: string[];
  memo?: string;
}

/** 可编辑表格列。 */
export const EDIT_COLUMNS: YEditTableColumn[] = [
  {
    field: 'extName',
    title: '扩展属性',
    minWidth: 220,
    component: 'form-item-select',
    props: { placeholder: '请选择扩展属性' },
    customRule: (value, _row, _field, all) => {
      if (!value) return { errMsg: '扩展属性不能为空' };
      if (all.filter(item => item.extName === value).length > 1) return { errMsg: '扩展属性不能重复' };
      return {};
    },
  },
  {
    field: 'extValues',
    title: '扩展值',
    minWidth: 240,
    component: 'form-item-select',
    props: { multiple: true, placeholder: '请选择扩展值' },
    customRule: value =>
      Array.isArray(value) && value.some(item => String(item).length > 100)
        ? { errMsg: '单个扩展值最多 100 个字符' }
        : {},
  },
  {
    field: 'memo',
    title: '备注',
    minWidth: 240,
    component: 'form-item-input',
    props: { placeholder: '请输入备注' },
    customRule: value => (String(value ?? '').length > 200 ? { errMsg: '最多 200 个字符' } : {}),
  },
  { type: 'action', title: '操作', width: 100, fixed: 'right' },
];

/** 表格字典数据；实际项目可由 Hook 响应式提供。 */
export const EDIT_OPTIONS_MAP = {
  extName: [
    { label: '类型', value: 'type' },
    { label: '级别', value: 'level' },
  ],
  extValues: [
    { label: '默认', value: 'default' },
    { label: '扩展', value: 'extended' },
  ],
};

/** 创建前端新行。 */
export const createEmptyRow = (): ExtRow => ({
  _rowKey: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  extValues: [],
});

/** 创建带删除确认的操作配置。 */
export const createActionConfig = (onDelete: (row: ExtRow) => void): YTableActionConfig => ({
  buttons: [
    {
      value: 'delete',
      label: '删除',
      type: 'link',
      isConfirm: true,
      confirmProps: { title: '是否确认删除此条数据？', okText: '确定', cancelText: '取消' },
      click: ({ row }) => onDelete(row),
    },
  ],
});
```

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { YEditTable } from '@yss-ui/components';
import { createActionConfig, createEmptyRow, EDIT_COLUMNS, EDIT_OPTIONS_MAP, type ExtRow } from './constant';

/** 组件模式。0-新增，1-编辑，2-查看。 */
interface Props {
  mode: 0 | 1 | 2;
}

const props = defineProps<Props>();
const rows = ref<ExtRow[]>([]);
const tableRef = ref<InstanceType<typeof YEditTable>>();
const readonly = computed(() => props.mode === 2);
const columns = computed(() => (readonly.value ? EDIT_COLUMNS.filter(column => column.type !== 'action') : EDIT_COLUMNS));
const actionConfig = createActionConfig(row => {
  rows.value = rows.value.filter(item => item._rowKey !== row._rowKey);
});

/** 处理组件 add 事件，显式更新 v-model:data。 */
const handleAddRow = () => {
  rows.value = [...rows.value, createEmptyRow()];
};

/** 校验全部编辑行。 */
const validateRows = async (): Promise<boolean> => {
  if (!tableRef.value) return false;
  const { valid } = await tableRef.value.validate();
  return valid;
};
</script>

<template>
  <YEditTable
    ref="tableRef"
    v-model:data="rows"
    :columns="columns"
    :action-config="actionConfig"
    :options-map="EDIT_OPTIONS_MAP"
    :row-config="{ keyField: '_rowKey', useKey: true }"
    :table-config="{ editConfig: { trigger: 'click', mode: 'row', autoClear: false } }"
    :disabled="readonly"
    :addable="!readonly"
    add-btn-text="添加一行"
    add-position="bottom"
    @add="handleAddRow"
  />
</template>

<style scoped lang="less">
@import './style.less';
</style>
```
