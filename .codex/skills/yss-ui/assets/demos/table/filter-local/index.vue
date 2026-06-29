<script setup lang="ts">
import { YTable, type YTableColumn } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoTableFilterLocal' });

const tableData = ref([
  { _X_ROW_KEY: '1', name_item_nm: 'name1', age: 18, sex: '1' },
  { _X_ROW_KEY: '2', name_item_nm: 'name2', age: 22, sex: '0' },
  { _X_ROW_KEY: '3', name_item_nm: 'tom', age: 25, sex: '1' },
  { _X_ROW_KEY: '4', name_item_nm: 'jerry', age: 19, sex: '0' },
]);

const tableRef = ref<any>();

const columns = ref<YTableColumn[]>([
  {
    title: '姓名',
    field: 'name_item_nm',
    filterable: true,
    filters: [{ data: '' }],
    filterMethod: ({ option, cellValue }: any) => {
      const keyword = option?.data ?? '';
      if (!keyword) return true;
      return String(cellValue || '')
        .toLowerCase()
        .includes(String(keyword).toLowerCase());
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
]);

const optionsMap = {
  sex: [
    { dictName: '男', dictValue: '1' },
    { dictName: '女', dictValue: '0' },
  ],
};

const changeFilterEvent = (option: any) => {
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
      :filter-config="{ iconNone: 'vxe-icon-search', iconMatch: 'vxe-icon-search' }"
    >
      <template #name_item_nm-filter="{ column }">
        <div style="padding: 8px 12px; width: 220px">
          <input
            v-for="(option, index) in column.filters"
            :key="index"
            v-model="option.data"
            placeholder="输入姓名关键字"
            style="width: 100%; height: 28px; padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px"
            @input="changeFilterEvent(option)"
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
            @input="changeFilterEvent(option)"
          />
        </div>
      </template>
    </YTable>
  </div>
</template>

<style scoped></style>
