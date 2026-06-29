<script setup lang="ts">
import { YTable } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoTableExpand' });

const columns: any[] = [
  { type: 'seq' as const, width: 60, title: '序号', align: 'center' as const },
  { type: 'expand' as const, width: 60, title: '展开' },
  { title: '姓名', field: 'name' },
  { title: '年龄', field: 'age' },
  { title: '性别', field: 'sex' },
];

const tableData = ref([
  { _X_ROW_KEY: '1', name: '张三', sex: '男', age: 28 },
  { _X_ROW_KEY: '2', name: '李四', sex: '男', age: 22 },
]);
</script>

<template>
  <div style="padding: 12px">
    <YTable :columns="columns" :data="tableData" :pageable="false" :expand-config="{ accordion: true }">
      <template #expand-row="{ row }">
        <div style="padding: 12px 16px; background: #fafafa">
          <div>姓名：{{ row.name }}</div>
          <div>年龄：{{ row.age }}</div>
          <div>性别：{{ row.sex }}</div>
        </div>
      </template>
    </YTable>
  </div>
</template>

<style scoped></style>
