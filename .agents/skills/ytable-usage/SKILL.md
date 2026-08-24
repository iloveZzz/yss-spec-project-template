---
name: ytable-usage
description: 指导 YSS UI 业务列表页、CRUD 表格、远程分页、操作列、气泡确认、列筛选、字典翻译、行拖拽、工具栏和自定义插槽正确使用 @yss-ui/components 的 YTable；当需要配置 YTableColumn、YTableActionConfig、pagination、filter-change 或表格实例方法时使用。
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
3. 把远程数据、`loading`、分页映射、API 调用和事件处理放入 Hook；把列定义和纯配置放入 `constant.ts`。
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
- 列配置超过 10 行时放入 `constant.ts`；需要调用组件 Hook 的操作配置使用工厂函数注入回调，禁止在 `constant.ts` 直接引用组件局部的 `openEdit/deleteItem`。
- 远程筛选必须提供稳定 `filters`，设置 `filterMethod: () => true` 禁用本地二次过滤，并监听 `filter-change`。
- 自适应滚动列表绑定 `:height="tableHeight"`；`pageable`、工具栏分别对应 `withPagination: true`、`withToolbar: true`。纯短表不强制引入高度 Hook。
- `mutator.ts` 已对网络错误和 `success === false` 统一 `message.error` 并 reject。API Hook 不再检查 `success === false`，不在 `else/catch` 重复 `message.error`；用 `finally` 恢复 loading，让异常继续中断流程。

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
  const pagination = ref<YTablePagination>({ current: 1, pageSize: 20, total: 0, remote: true });

  /** 查询当前页；错误提示由 mutator 统一处理。 */
  const loadList = async () => {
    loading.value = true;
    try {
      const result = await api.queryPage({
        pageIndex: pagination.value.current,
        pageSize: pagination.value.pageSize,
      });
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

  return { dataList, loading, pagination, loadList, handlePageChange, handleDelete };
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
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
```

## 表格多选与批量操作标准模式

当业务需要 Checkbox 多选与批量操作（如批量删除、批量导出、批量启用）时，遵循以下规范：

1. **列配置**：首列必须声明 `{ type: 'checkbox', width: 50, fixed: 'left', align: 'center' }`。
2. **行唯一键**：必须显式指定 `:row-config="{ keyField: 'id', useKey: true }"`（`keyField` 与业务主键如 `userCode` 对齐）。
3. **受控双向绑定**：推荐优先使用 `v-model:selected-row-keys="selectedRowKeys"` 或 `v-model:selected-rows="selectedRows"`，或者统一监听 `@selection-change`。
4. **批量操作按钮**：放在 `#toolbar-right`，并配置 `:disabled="selectedRowKeys.length === 0"`。
5. **清空选中态**：批量操作成功后，直接重置 `selectedRowKeys.value = []` 或调用 `tableRef.value.clearSelection()`。

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

## 插槽与实例边界

- 优先使用 kebab-case：单元格 `#<field>`、表头 `#<field>-header`、筛选 `#<field>-filter`、工具栏 `#toolbar-left/#toolbar-right`、展开行 `#expand-row`、分组表头 `#group-header`、更多图标 `#action-more-icon`。
- `getTableInstance()`、`refresh()`、`recalculate()`、`clearSelection()`、`getSelectedRows()`、`getSelectedRowKeys()`、`setSelection()`、`getPaginationInstance()` 是真实暴露方法；只在对应语义下使用。

## 交付检查清单

- [ ] 分页状态和 `page-change` 参数均使用 `current/pageSize`，未使用 `currentPage`；`filter-change` 与 YTable 真实 API 一致。
- [ ] 多选列已配置 `type: 'checkbox'`，已设置 `:row-config="{ keyField: 'xxx', useKey: true }"`，批量按钮绑定了 `selectedRowKeys.length === 0` 禁用。
- [ ] 批量操作成功后已重置 `selectedRowKeys` 并调用 `tableRef.clearSelection()`。
- [ ] 未使用虚构 `request/searchParams/row-key` Props，也未把 `refresh()` 当成远程请求。
- [ ] 工具栏、字典翻译、操作确认与高度偏移均与实际开关一致。
- [ ] API Hook 没有 `success === false` 分支或重复 `message.error`。

## 失败兜底策略

- 分页字段混乱时，在 Hook 中分离 YTable 状态和后端参数，不直接把 `pageIndex/totalCount` 绑到组件。
- 操作过多时使用 `displayLimit` 和更多菜单；远程刷新失效时回到业务 `loadList()`，不把实例 `refresh()` 当成接口请求。
- API 失败后只在 `finally` 恢复本地 loading，让 mutator 的 reject 继续中断删除后刷新等后续流程。

