# YTable 列表与远程分页示例

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。示例代码属于目标工程，模块相对导入按所示文件位置解析。

## 标准代码骨架

```typescript
import type { YTableActionConfig, YTableColumn } from '@yss-ui/components';

/** 列表行数据。 */
export interface ItemRow {
  id: string;
  name: string;
  status: string;
}

/** 状态字典。 */
export const STATUS_OPTIONS = [
  { label: '启用', value: '1' },
  { label: '停用', value: '0' },
];

/** 列表固定列配置。 */
export const TABLE_COLUMNS: YTableColumn[] = [
  { type: 'seq', title: '序号', width: 70 },
  { field: 'name', title: '名称', minWidth: 180 },
  { field: 'status', title: '状态', width: 120, isTransform: true },
  { type: 'action', title: '操作', width: 180 },
];

/** 按组件 Hook 提供的回调创建操作列配置。 */
export const createActionConfig = (handlers: {
  onEdit: (row: ItemRow) => void;
  onDelete: (row: ItemRow) => Promise<void>;
}): YTableActionConfig => ({
  width: 180,
  fixed: 'right',
  buttons: [
    { value: 'edit', label: '编辑', type: 'link', click: ({ row }) => handlers.onEdit(row) },
    {
      value: 'delete',
      label: '删除',
      type: 'link',
      isConfirm: true,
      confirmProps: { title: '确认删除该数据吗？', okText: '确定', cancelText: '取消' },
      click: ({ row }) => handlers.onDelete(row),
    },
  ],
});
```

## 远程分页 Hook 关键模式

```typescript
import { ref } from 'vue';
import type { YTablePagination } from '@yss-ui/components';
import type { ItemRow } from '../constant';

/** 列表 API 依赖，由当前项目的 Orval 函数适配。 */
export interface ItemListApi {
  queryPage: (params: { pageIndex: number; pageSize: number }) => Promise<{
    list?: ItemRow[];
    totalCount?: number;
  }>;
  deleteItem: (params: { id: string }) => Promise<unknown>;
}

/** 管理 YTable 远程分页和删除刷新。 */
export const useItemList = (api: ItemListApi) => {
  const dataList = ref<ItemRow[]>([]);
  const loading = ref(false);
  const currentParams = ref({ pageIndex: 1, pageSize: 20 });
  const pagination = ref<YTablePagination>({ current: 1, pageSize: 20, total: 0, remote: true });

  /** 查询当前页；错误提示由 mutator 统一处理。 */
  const loadList = async () => {
    loading.value = true;
    try {
      currentParams.value = {
        ...currentParams.value,
        pageIndex: pagination.value.current,
        pageSize: pagination.value.pageSize,
      };
      const result = await api.queryPage(currentParams.value);
      dataList.value = result.list ?? [];
      pagination.value = { ...pagination.value, total: result.totalCount ?? 0 };
    } finally {
      loading.value = false;
    }
  };

  /** 同步 YTable 分页状态并重新查询。 */
  const handlePageChange = async ({ current, pageSize }: { current: number; pageSize: number }) => {
    pagination.value = { ...pagination.value, current, pageSize };
    await loadList();
  };

  /** 删除后刷新列表；不重复弹出 API 错误。 */
  const handleDelete = async (row: ItemRow) => {
    await api.deleteItem({ id: row.id });
    await loadList();
  };

  return { currentParams, dataList, loading, pagination, loadList, handlePageChange, handleDelete };
};
```

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { YButton, YTable } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { createActionConfig, STATUS_OPTIONS, TABLE_COLUMNS, type ItemRow } from './constant';
import { useItemList, type ItemListApi } from './hooks/useItemList';

/** 列表实例的 API 依赖。 */
interface Props {
  api: ItemListApi;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  create: [];
  edit: [row: ItemRow];
}>();
const tableAreaRef = ref<HTMLDivElement>();
const { tableHeight } = useTableHeight(tableAreaRef, { withPagination: true, withToolbar: true });
const { dataList, loading, pagination, loadList, handlePageChange, handleDelete } = useItemList(props.api);
const actionConfig = createActionConfig({
  onEdit: row => emit('edit', row),
  onDelete: handleDelete,
});

onMounted(loadList);
</script>

<template>
  <div ref="tableAreaRef" class="table-area">
    <YTable
      :data="dataList"
      :columns="TABLE_COLUMNS"
      :action-config="actionConfig"
      :loading="loading"
      :options-map="{ status: STATUS_OPTIONS }"
      :row-config="{ keyField: 'id', useKey: true }"
      :height="tableHeight"
      pageable
      v-model:pagination="pagination"
      @page-change="handlePageChange"
    >
      <template #toolbar-right>
        <YButton type="primary" @click="emit('create')">新增</YButton>
      </template>
    </YTable>
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
```

```less
/* style.less */
.table-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
```
