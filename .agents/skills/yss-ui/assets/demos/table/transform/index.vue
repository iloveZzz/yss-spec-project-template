<script setup lang="ts">
import { YTable } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoTableTransform' });

const tableData = ref([
  { _X_ROW_KEY: '1', name: '张三', sex: '1', age: 28 },
  { _X_ROW_KEY: '2', name: '李四', sex: '0', age: 22 },
]);

const columns = [
  { title: '姓名', field: 'name' },
  { title: '年龄', field: 'age' },
  { title: '性别', field: 'sex', isTransform: true, props: { fieldNames: { label: 'dictName', value: 'dictValue' } } },
];

const optionsMap = {
  sex: [
    { dictName: '男', dictValue: '1' },
    { dictName: '女', dictValue: '0' },
  ],
};
</script>

<template>
  <div style="padding: 12px">
    <YTable :columns="columns" :data="tableData" :pageable="false" :options-map="optionsMap" />
  </div>
</template>

<style scoped></style>
