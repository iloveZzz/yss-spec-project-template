<script setup lang="ts">
import { YTable, type YTableColumn } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoTableFilterMixed' });

type Row = { _X_ROW_KEY: string; name: string; age: number; sex: '0' | '1' };

const source: any = [
  { _X_ROW_KEY: '1', name: 'name1', age: 18, sex: '1', city: 'bj' },
  { _X_ROW_KEY: '2', name: 'name2', age: 22, sex: '0', city: 'sh' },
  { _X_ROW_KEY: '3', name: 'tom', age: 25, sex: '1', city: 'gz' },
  { _X_ROW_KEY: '4', name: 'jerry', age: 19, sex: '0', city: 'sz' },
  { _X_ROW_KEY: '5', name: 'name5', age: 20, sex: '1', city: 'bj' },
];

const tableData = ref<Row[]>([...source]);
const tableRef = ref<any>();

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
    title: '性别',
    field: 'sex',
    isTransform: true,
    filterable: true,
    filterMultiple: true,
    filters: [
      { label: '男', value: '1' },
      { label: '女', value: '0' },
    ],
    filterMethod: ({ values, cellValue }: any) => {
      if (!values || values.length === 0) return true;
      return values.includes(String(cellValue));
    },
    props: { fieldNames: { label: 'dictName', value: 'dictValue' } },
  },
  {
    title: '城市',
    field: 'city',
    isTransform: true,
    filterable: true,
    filterMultiple: true,
    filters: [
      { label: '北京', value: 'bj' },
      { label: '上海', value: 'sh' },
      { label: '广州', value: 'gz' },
      { label: '深圳', value: 'sz' },
    ],
    filterMethod: ({ values, cellValue }: any) => {
      if (!values || values.length === 0) return true;
      return values.includes(String(cellValue));
    },
    props: { fieldNames: { label: 'cityName', value: 'cityCode' } },
  },
]);

const optionsMap = {
  sex: [
    { dictName: '男', dictValue: '1' },
    { dictName: '女', dictValue: '0' },
  ],
  city: [
    { cityName: '北京', cityCode: 'bj' },
    { cityName: '上海', cityCode: 'sh' },
    { cityName: '广州', cityCode: 'gz' },
    { cityName: '深圳', cityCode: 'sz' },
  ],
};

const onRemoteIfNeeded = () => {};

const markActive = (option: any) => {
  const $table = tableRef.value?.getTableInstance?.();
  if ($table) $table.updateFilterOptionStatus(option, !!option.data);
};
</script>

<template>
  <div style="padding: 12px">
    <YTable
      ref="tableRef"
      :columns="columns"
      :data="tableData"
      :pageable="false"
      :options-map="optionsMap"
      @filter-change="onRemoteIfNeeded"
    >
      <template #name-filter="{ column }">
        <div style="padding: 8px 12px; width: 220px">
          <input
            v-for="(option, index) in column.filters"
            :key="index"
            v-model="option.data"
            placeholder="输入姓名关键字"
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
            placeholder="输入最小年龄"
            style="width: 100%; height: 28px; padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px"
            @input="markActive(option)"
          />
        </div>
      </template>
    </YTable>
  </div>
</template>

<style scoped></style>
