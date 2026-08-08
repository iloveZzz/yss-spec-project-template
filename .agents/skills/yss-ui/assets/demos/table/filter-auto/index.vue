<script setup lang="ts">
import { YTable, type YTableColumn } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoTableFilterAuto' });

type Row = { _X_ROW_KEY: string; name: string; age: number; sex: '0' | '1'; status: string };

const tableData = ref<Row[]>([
  { _X_ROW_KEY: '1', name: 'name1', age: 18, sex: '1', status: 'enabled' },
  { _X_ROW_KEY: '2', name: 'name2', age: 22, sex: '0', status: 'disabled' },
  { _X_ROW_KEY: '3', name: 'tom', age: 25, sex: '1', status: 'enabled' },
  { _X_ROW_KEY: '4', name: 'jerry', age: 19, sex: '0', status: 'disabled' },
]);

const columns = ref<YTableColumn[]>([
  {
    title: '姓名',
    field: 'name',
    filterable: true,
    filters: [{ data: '' }],
    filterMethod: ({ option, cellValue }: any) => {
      const kw = String(option?.data || '').trim();
      if (!kw) return true;
      return String(cellValue || '')
        .toLowerCase()
        .includes(kw.toLowerCase());
    },
  },
  {
    title: '年龄≥',
    field: 'age',
    filterable: true,
    filters: [{ data: '' }],
    filterMethod: ({ option, cellValue }: any) => {
      const v = Number(option?.data);
      if (!option?.data && option?.data !== 0) return true;
      return Number(cellValue) >= v;
    },
  },
  {
    title: '状态',
    field: 'status',
    filterable: true,
    filterMultiple: true,
    filters: [
      { label: '启用', value: 'enabled' },
      { label: '禁用', value: 'disabled' },
    ],
    filterMethod: ({ values, cellValue }: any) => {
      if (!values || values.length === 0) return true;
      return values.includes(String(cellValue));
    },
  },
]);

const optionsMap = {};

const tableRef = ref<any>();
const markActive = (option: any) => {
  const $table = tableRef.value?.getTableInstance?.();
  if ($table) $table.updateFilterOptionStatus(option, !!option.data);
};
</script>

<template>
  <div style="padding: 12px">
    <YTable ref="tableRef" :columns="columns" :data="tableData" :pageable="false" :options-map="optionsMap">
      <template #name-filter="{ column }">
        <div style="padding: 8px 12px; width: 220px">
          <input
            v-for="(option, index) in column.filters"
            :key="index"
            v-model="option.data"
            :placeholder="column.meta?.placeholder || '请输入关键词'"
            style="width: 100%; height: 28px; padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px"
            @input="markActive(option)"
          />
        </div>
      </template>

      <template #age-filter="{ column }">
        <div style="padding: 8px 12px; width: 220px">
          <input
            v-for="(option, index) in column.filters"
            :key="index"
            v-model="option.data"
            type="number"
            :placeholder="column.meta?.placeholder || '请输入数值'"
            style="width: 100%; height: 28px; padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px"
            @input="markActive(option)"
          />
        </div>
      </template>
    </YTable>
  </div>
</template>

<style scoped></style>
