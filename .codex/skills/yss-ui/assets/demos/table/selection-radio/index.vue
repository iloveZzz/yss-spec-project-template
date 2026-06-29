<script setup lang="ts">
import { YButton, YTable, type YTableColumn } from '@yss-ui/components';
import { reactive, ref } from 'vue';
import './style.less';

defineOptions({ name: 'DemoTableSelectionRadio' });

const yTableRef = ref<InstanceType<typeof YTable> | null>(null);

const columns = reactive<YTableColumn[]>([
  { type: 'radio', width: 50, align: 'center' },
  { type: 'seq', title: '序号', width: 60, align: 'center' },
  { field: 'name', title: 'Name', minWidth: 140 },
  { field: 'sex', title: 'Sex', width: 100 },
  { field: 'age', title: 'Age', width: 100 },
  { field: 'address', title: 'Address', minWidth: 200 },
]);

const tableData = ref([
  { id: 1, name: 'Test1', sex: 'Man', age: 28, address: 'test abc' },
  { id: 2, name: 'Test2', sex: 'Women', age: 22, address: 'Guangzhou' },
  { id: 3, name: 'Test3', sex: 'Man', age: 32, address: 'Shanghai' },
  { id: 4, name: 'Test4', sex: 'Women', age: 23, address: 'test abc' },
  { id: 5, name: 'Test5', sex: 'Women', age: 30, address: 'Shanghai' },
]);

const getVxe = () => yTableRef.value?.getTableInstance?.();

/**
 * 设置第2行为当前单选
 * 注意：由于表格内部数据经过处理，需要从表格实例中获取行对象
 */
const setSecond = () => {
  const $vxe = getVxe();
  if (!$vxe) return;
  // 从表格实例获取数据，找到 id=2 的行
  const tableRows = $vxe.getData();
  const targetRow = tableRows.find((row: any) => row.id === 2);
  if (targetRow) {
    $vxe.setRadioRow(targetRow);
  }
};

const clearRadio = () => getVxe()?.clearRadioRow?.();
</script>

<template>
  <div class="demo-container">
    <div class="demo-actions">
      <YButton @click="setSecond">设置第2行为当前单选</YButton>
      <YButton @click="clearRadio">清空单选</YButton>
    </div>
    <YTable ref="yTableRef" :data="tableData" :columns="columns" :border="true" :radio-config="{ highlight: true }" />
  </div>
</template>

<style scoped></style>
