<script setup lang="ts">
import { YTable } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoTableDrag' });

const columns = [
  { type: 'seq' as const, title: '序号', width: 60, align: 'center' as const },
  { title: '姓名', field: 'name' },
  { title: '年龄', field: 'age' },
];

const tableData = ref([
  { _X_ROW_KEY: '1', name: 'Name1', age: 23 },
  { _X_ROW_KEY: '2', name: 'Name2', age: 22 },
  { _X_ROW_KEY: '3', name: 'Name3', age: 18 },
  { _X_ROW_KEY: '4', name: 'Name4', age: 20 },
]);

const handleDragEnd = (rows: any[]) => {
  // eslint-disable-next-line no-console
  console.log(
    '拖拽后顺序：',
    rows.map(r => r.name)
  );
};
</script>

<template>
  <div style="padding: 12px">
    <YTable
      v-model:data="tableData"
      :columns="columns"
      :row-dragable="true"
      :row-config="{ drag: true }"
      :pageable="false"
      @row-dragend="handleDragEnd"
    />
  </div>
</template>

<style scoped></style>
