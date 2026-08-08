<script setup lang="ts">
import { YButton, YTable } from '@yss-ui/components';
import { Checkbox, Empty, Input, message, Tooltip } from 'ant-design-vue';
import VirtualList from 'ant-design-vue/es/vc-virtual-list';
import { useColumnCustomSearch } from './hooks/useColumnCustomSearch';
import './style.less';

// 简洁空状态图片
const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;

defineOptions({ name: 'DemoTableColumnCustomSearch' });

const {
  tableRef,
  tableData,
  columns,
  columnSearchKeywords,
  virtualListRefs,
  filterPanelKeys,
  VIRTUAL_ITEM_HEIGHT,
  VIRTUAL_VIEWPORT_HEIGHT,
  getFilteredOptions,
  isAllChecked,
  isIndeterminate,
  handleCheckAll,
  handleOptionChange,
  handleSearchInput,
  customConfig,
  virtualXConfig,
  virtualYConfig,
} = useColumnCustomSearch();

const handleGetFilters = () => {
  const $table = tableRef.value?.getTableInstance?.();
  if (!$table) {
    return;
  }
  const { tableData: data = [] } = $table.getTableData() || {};
  // eslint-disable-next-line no-console
  console.log('获取筛选条件->', $table.getCheckedFilters(), '获取筛选后的表格数据->', data);
  message.success('已获取筛选条件');
};

/** 清除所有筛选条件 */
const handleClearAllFilters = () => {
  const $table = tableRef.value?.getTableInstance?.();
  if (!$table) {
    return;
  }
  $table.clearFilter();
  message.success('已清除所有筛选条件');
};
</script>

<template>
  <div class="demo-container">
    <YTable
      id="demo-column-custom-search"
      ref="tableRef"
      :data="tableData"
      :columns="columns"
      :custom-config="customConfig"
      :toolbar-config="{ custom: true }"
      :border="true"
      :height="480"
      :virtual-x-config="virtualXConfig"
      :virtual-y-config="virtualYConfig"
    >
      <template #toolbar-right>
        <div style="display: flex; gap: 10px; margin-right: 10px">
          <YButton type="primary" @click="handleGetFilters">获取筛选条件/表格数据</YButton>
          <YButton @click="handleClearAllFilters">清除筛选条件</YButton>
        </div>
      </template>

      <!-- 为每一列添加自定义筛选面板（包含搜索框） -->
      <template
        v-for="col in columns.filter(c => c.field)"
        :key="col.field"
        #[`${col.field}-filter`]="{ $panel, column }"
      >
        <div v-if="column" :key="filterPanelKeys[col.field!]">
          <!-- 搜索框 -->
          <div class="vxe-table-filter-header">
            <Input
              v-model:value="columnSearchKeywords[col.field!]"
              placeholder="搜索"
              size="small"
              allow-clear
              @input="() => handleSearchInput(col.field!)"
            />
          </div>

          <!-- 无数据时展示空状态 -->
          <div v-if="getFilteredOptions(col.field!, column).value.length === 0">
            <Empty :image="simpleImage" description="暂无数据" />
          </div>

          <!-- 全选 -->
          <div v-else class="vxe-table-filter-body" :style="{ overflow: 'visible', maxHeight: 'none' }">
            <div class="vxe-table-filter-option">
              <Checkbox
                :checked="isAllChecked(col.field!, column).value"
                :indeterminate="isIndeterminate(col.field!, column).value"
                @change="handleCheckAll(col.field!, column, $panel)"
              >
                全选
              </Checkbox>
            </div>
            <!-- 使用 antdv 的 vc-virtual-list 实现虚拟滚动 -->
            <VirtualList
              :ref="(el: any) => (virtualListRefs[col.field!] = el)"
              :data="getFilteredOptions(col.field!, column).value"
              :height="VIRTUAL_VIEWPORT_HEIGHT"
              :item-height="VIRTUAL_ITEM_HEIGHT"
              :item-key="(opt: any) => opt?.value"
            >
              <template #default="option">
                <div
                  class="vxe-table-filter-option"
                  :style="{ height: VIRTUAL_ITEM_HEIGHT + 'px', display: 'flex', alignItems: 'center', width: '100%' }"
                >
                  <Checkbox
                    :checked="!!(option as any).checked"
                    @change="(e: any) => handleOptionChange(col.field!, option as any, e.target.checked, $panel)"
                  >
                    <Tooltip :title="(option as any).label" placement="top">
                      <span class="filter-option-text">{{ (option as any).label }}</span>
                    </Tooltip>
                  </Checkbox>
                </div>
              </template>
            </VirtualList>
          </div>
        </div>
      </template>
    </YTable>
  </div>
</template>

<style scoped></style>
