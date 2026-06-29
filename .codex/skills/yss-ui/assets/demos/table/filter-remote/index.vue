<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { YTable } from '@yss-ui/components';
import { tableColumns, optionsMap } from './constant';
import { useTableData } from './hooks/useTableData';

defineOptions({ name: 'DemoTableFilterRemote' });

const tableRef = ref();

// 使用 hook 管理表格数据和逻辑（传入 tableRef 用于手动刷新表格）
const { tableData, loading, pagination, fetchTableData, handleFilterChange, handlePageChange, updateFilterStatus } =
  useTableData(tableRef);

// 组件挂载时加载数据
onMounted(() => {
  fetchTableData();
});

/**
 * 处理自定义筛选输入框变化（用于更新筛选图标状态）
 */
const changeFilterEvent = (option: any) => {
  updateFilterStatus(option);
};
</script>

<template>
  <div style="padding: 12px">
    <YTable
      ref="tableRef"
      :columns="tableColumns"
      :data="tableData"
      :loading="loading"
      :options-map="optionsMap"
      pageable
      :pagination="pagination"
      @filter-change="handleFilterChange"
      @page-change="handlePageChange"
    >
      <!-- 姓名筛选插槽（输入框） -->
      <template #name-filter="{ column }">
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

      <!-- 年龄筛选插槽（数字输入框） -->
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
