<script setup lang="ts">
import { YTable, type YTableColumn } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoTableRenderers' });

const tableRef = ref<any>();

const tableData = ref([
  { _X_ROW_KEY: '1', name: 'Alice', age: 18 },
  { _X_ROW_KEY: '2', name: 'Bob', age: 22 },
  { _X_ROW_KEY: '3', name: 'Cindy', age: 25 },
]);

const columns = ref<YTableColumn[]>([
  {
    field: 'name',
    title: '姓名',
    minWidth: 120,
  },
  {
    field: 'age',
    title: '年龄(插槽渲染)',
    width: 150,
  },
]);
</script>

<template>
  <div style="padding: 12px">
    <YTable ref="tableRef" :columns="columns" :data="tableData" :pageable="false">
      <!-- 全局表头插槽：仅当列未声明 #<field>Header 时生效 -->
      <template #header="{ column }">
        <span style="display: inline-flex; align-items: center; gap: 6px">
          <i class="vxe-icon--question" style="color: var(--primary-color, #3371ff)"></i>
          {{ column.title }}
        </span>
      </template>
      <!-- 指定字段的表头插槽（优先级高于全局 header） -->
      <template #name-header="{ column }">
        <span style="display: inline-flex; align-items: center; gap: 6px">
          <i class="vxe-icon--edit-outline" style="color: var(--primary-color, #3371ff)"></i>
          自定义：{{ column.title }}
        </span>
      </template>
      <!-- 指定字段的单元格内容插槽 -->
      <template #age="{ row }">
        <span
          style="
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            border: 1px solid var(--primary-color, #3371ff);
            color: var(--primary-color, #3371ff);
          "
        >
          {{ row.age }}
        </span>
      </template>
    </YTable>
  </div>
</template>

<style scoped></style>
