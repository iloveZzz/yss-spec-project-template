<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Input as AInput } from 'ant-design-vue';
import { YButton, YCard, YTable } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { TABLE_COLUMNS, type QualityRuleItem } from './constant';
import { useQualityRuleList } from './hooks/useQualityRuleList';
import { useRuleActions } from './hooks/useRuleActions';

defineOptions({ name: 'StandardListPage' });

const emit = defineEmits<{
  create: [];
  edit: [row: QualityRuleItem];
  view: [row: QualityRuleItem];
}>();

const tableAreaRef = ref<HTMLDivElement>();
const { tableHeight, isReady } = useTableHeight(tableAreaRef, {
  withPagination: true,
  withToolbar: true,
});
const { tableData, loading, pagination, searchForm, fetchList, handlePageChange, handleSearch, handleReset } =
  useQualityRuleList();
const { actionConfig, handleCreate } = useRuleActions({
  refreshList: fetchList,
  onCreate: () => emit('create'),
  onEdit: row => emit('edit', row),
  onView: row => emit('view', row),
});

/** 查看规则详情。 */
const handleRuleNameClick = (row: QualityRuleItem): void => {
  emit('view', row);
};

onMounted(() => {
  void fetchList();
});
</script>

<template>
  <div class="quality-rule-page">
    <YCard class="quality-rule-page__search-card">
      <div class="quality-rule-page__search-content">
        <AInput
          v-model:value="searchForm.ruleName"
          class="quality-rule-page__keyword"
          placeholder="请输入规则名称"
          allow-clear
          @press-enter="handleSearch"
        />
        <div class="quality-rule-page__search-actions">
          <YButton @click="handleReset">重置</YButton>
          <YButton type="primary" :loading="loading" @click="handleSearch">查询</YButton>
        </div>
      </div>
    </YCard>

    <YCard class="quality-rule-page__table-card">
      <div ref="tableAreaRef" class="quality-rule-page__table-area">
        <YTable
          v-if="isReady"
          :data="tableData"
          :columns="TABLE_COLUMNS"
          :loading="loading"
          :height="tableHeight"
          :action-config="actionConfig"
          :toolbar-config="{ custom: true }"
          pageable
          v-model:pagination="pagination"
          @page-change="handlePageChange"
        >
          <template #toolbar-right>
            <YButton @click="fetchList">刷新</YButton>
            <YButton type="primary" @click="handleCreate">新增质量规则</YButton>
          </template>
          <template #ruleName="{ row }">
            <button class="quality-rule-page__rule-link" type="button" @click="handleRuleNameClick(row)">
              {{ row.ruleName ?? '-' }}
            </button>
          </template>
        </YTable>
      </div>
    </YCard>
  </div>
</template>

<style scoped lang="less">
@import url('./style.less');
</style>
