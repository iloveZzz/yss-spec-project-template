<script setup lang="ts">
import { YButton, YTable, type YTableColumn } from '@yss-ui/components';
import { reactive, ref } from 'vue';
import './style.less';

defineOptions({ name: 'DemoTableSelectionCheckbox' });

const yTableRef = ref<InstanceType<typeof YTable> | null>(null);

const columns = reactive<YTableColumn[]>([
  { type: 'checkbox', width: 50, align: 'center' },
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
 * 切换第1、2行选中
 * 注意：由于表格内部数据经过处理，需要从表格实例中获取行对象
 */
const selectFirstTwo = () => {
  const $vxe = getVxe();
  if (!$vxe) return;
  const tableRows = $vxe.getData();
  const row1 = tableRows.find((row: any) => row.id === 1);
  const row2 = tableRows.find((row: any) => row.id === 2);
  if (row1) $vxe.toggleCheckboxRow(row1);
  if (row2) $vxe.toggleCheckboxRow(row2);
};

/**
 * 设置第3、4行选中
 */
const selectThirdFourth = () => {
  const $vxe = getVxe();
  if (!$vxe) return;
  const tableRows = $vxe.getData();
  const row3 = tableRows.find((row: any) => row.id === 3);
  const row4 = tableRows.find((row: any) => row.id === 4);
  const rowsToSelect = [row3, row4].filter(Boolean);
  if (rowsToSelect.length > 0) {
    $vxe.setCheckboxRow(rowsToSelect, true);
  }
};

const selectAll = () => getVxe()?.setAllCheckboxRow?.(true);
const clearAll = () => getVxe()?.clearCheckboxRow?.();

const getSelection = () => {
  const $vxe = getVxe();
  if (!$vxe) return;
  const rows = $vxe.getCheckboxRecords?.() || [];
  alert(`已选中 ${rows.length} 行：\n` + rows.map((r: any) => r.name).join(', '));
};
</script>

<template>
  <div class="demo-container">
    <div class="demo-actions">
      <YButton @click="selectFirstTwo">切换第1、2行选中</YButton>
      <YButton @click="selectThirdFourth">设置第3、4行选中</YButton>
      <YButton @click="selectAll">设置所有行选中</YButton>
      <YButton @click="clearAll">清除所有行选中</YButton>
      <YButton type="primary" @click="getSelection">获取选中</YButton>
    </div>
    <YTable
      ref="yTableRef"
      :data="tableData"
      :columns="columns"
      :border="true"
      :checkbox-config="{ highlight: true }"
    />
  </div>
</template>

<style scoped></style>
