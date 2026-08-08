<script setup lang="ts">
import { YTable, type YTableColumn } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoTableFilterCustom' });

const tableData = ref([
  { _X_ROW_KEY: '1', name: 'Alice', email: 'alice@test.com' },
  { _X_ROW_KEY: '2', name: 'Bob', email: 'bob@test.com' },
  { _X_ROW_KEY: '3', name: 'Cindy', email: 'cindy@test.com' },
  { _X_ROW_KEY: '4', name: 'David', email: 'david@test.com' },
]);

const tableRef = ref<any>();

const columns = ref<YTableColumn[]>([
  {
    field: 'name',
    title: '姓名(自定义筛选)',
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
    field: 'email',
    title: '邮箱',
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
]);

const changeFilterEvent = (option: any) => {
  const $table = tableRef.value?.getTableInstance?.();
  if ($table) {
    $table.updateFilterOptionStatus(option, !!option.data);
  }
};
</script>

<template>
  <div style="padding: 12px">
    <YTable ref="tableRef" :columns="columns" :data="tableData" :pageable="false">
      <template #filter="{ column }">
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
    </YTable>
  </div>
</template>

<style scoped></style>
