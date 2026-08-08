<script setup lang="ts">
import { YTable, type YTableColumn } from '@yss-ui/components';
import { onMounted, ref } from 'vue';

defineOptions({ name: 'DemoTableFilterAsync' });

type Row = { _X_ROW_KEY: string; name: string; age: number; sex: '0' | '1'; city: string };

const tableData = ref<Row[]>([
  { _X_ROW_KEY: '1', name: 'name1', age: 18, sex: '1', city: 'bj' },
  { _X_ROW_KEY: '2', name: 'name2', age: 22, sex: '0', city: 'sh' },
  { _X_ROW_KEY: '3', name: 'tom', age: 25, sex: '1', city: 'gz' },
  { _X_ROW_KEY: '4', name: 'jerry', age: 19, sex: '0', city: 'sz' },
]);

const tableRef = ref<any>();

const columns = ref<YTableColumn[]>([
  { title: '姓名', field: 'name', filterable: true, filters: [{ data: '' }] },
  {
    title: '年龄≥',
    field: 'age',
    filterable: true,
    filterMultiple: true,
    filters: [
      { label: '全部', value: '' },
      { label: '18-25', value: '18-25' },
      { label: '26-35', value: '26-35' },
      { label: '36-45', value: '36-45' },
    ],
    filterMethod: ({ option, cellValue }: any) => {
      if (!option?.value) return true;
      const [min, max] = option.value.split('-').map(Number);
      return cellValue >= min && cellValue <= max;
    },
  },
  {
    title: '城市(接口 filters)',
    field: 'city',
    isTransform: true,
    filterable: true,
    filterMultiple: true,
    filters: [],
  },
]);

onMounted(() => {
  setTimeout(() => {
    const remoteFilters = [
      { label: '北京', value: 'bj' },
      { label: '上海', value: 'sh' },
      { label: '广州', value: 'gz' },
      { label: '深圳', value: 'sz' },
    ];
    columns.value = columns.value.map(c => (c.field === 'city' ? { ...c, filters: remoteFilters } : c));
  }, 300);
});

const optionsMap = {
  city: [
    { cityName: '北京', cityCode: 'bj' },
    { cityName: '上海', cityCode: 'sh' },
    { cityName: '广州', cityCode: 'gz' },
    { cityName: '深圳', cityCode: 'sz' },
  ],
};

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
            placeholder="输入姓名关键字"
            style="width: 100%; height: 28px; padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px"
            @input="markActive(option)"
          />
        </div>
      </template>
    </YTable>
  </div>
</template>

<style scoped></style>
