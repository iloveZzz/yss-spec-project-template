<script setup lang="ts">
import { computed, ref } from 'vue';
import { Input as AInput, Button as AButton, Switch as ASwitch } from 'ant-design-vue';
import { RedoOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { YSplitPane, YCard, YTable } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { TABLE_COLUMNS, type QualityRuleItem } from './constant';
import { useQualityRuleList } from './hooks/useQualityRuleList';
import { useRuleActions } from './hooks/useRuleActions';
import QualityTree from '@/components/QualityTree/index.vue'; // 假设的树组件

defineOptions({
  name: 'StandardListPage',
});

/** 列表数据逻辑 */
const {
  tableData,
  loading,
  pagination,
  searchForm,
  selectedNode,
  fetchList,
  handlePageChange,
  handleSizeChange,
  handleSearch,
  handleRefresh,
  handleTreeNodeClick,
} = useQualityRuleList();

const tableRef = ref();
// 自动计算表格高度，使其占满剩余空间
const { tableHeight } = useTableHeight(tableRef, { withPagination: true });

/** 规则操作逻辑 */
const { handleEdit, handleDelete, handleRun, handleStatusChange, handleCreate, handleRuleNameClick } =
  useRuleActions(fetchList);

/**
 * 操作列配置
 * 使用 computed 确保响应式，支持动态显示/隐藏按钮
 */
const actionConfig = computed(() => ({
  title: '操作',
  width: 160,
  align: 'center' as const,
  fixed: 'right' as const,
  buttons: [
    {
      text: '编辑',
      key: 'edit',
      type: 'link' as const,
      clickFn: ({ row }: { row: QualityRuleItem }) => handleEdit(row),
      disabledFn: ({ row }: { row: QualityRuleItem }) => !!row.status,
    },
    {
      text: '运行',
      key: 'run',
      type: 'link' as const,
      isConfirm: true,
      confirmProps: {
        title: '确认运行此规则吗？',
        needLoading: true,
      },
      clickFn: async ({ row }: { row: QualityRuleItem }, _btn: any, helpers: any) => {
        await handleRun(row);
        helpers?.hideLoading();
        helpers?.close();
      },
    },
    {
      text: '删除',
      key: 'delete',
      type: 'link' as const,
      danger: true,
      isConfirm: true,
      confirmProps: {
        title: '确认删除此规则吗？删除后无法恢复',
        needLoading: true,
      },
      clickFn: async ({ row }: { row: QualityRuleItem }, _btn: any, helpers: any) => {
        await handleDelete(row);
        helpers?.hideLoading();
        helpers?.close();
      },
      disabledFn: ({ row }: { row: QualityRuleItem }) => !!row.status,
    },
  ],
}));

/**
 * 处理搜索框回车
 */
const handleSearchPressEnter = () => {
  handleSearch();
};
</script>

<template>
  <div class="business-quality-rule">
    <YSplitPane
      :initial-width="280"
      :min-width="280"
      :max-width="480"
      collapsible
      storage-key="business-quality-rule-split"
    >
      <!-- 左侧：树组件 -->
      <template #left>
        <div class="tree-panel">
          <QualityTree @node-select="handleTreeNodeClick" />
        </div>
      </template>

      <!-- 右侧：主内容区 -->
      <template #right>
        <y-card class-name="content-panel">
          <!-- 搜索和操作区 -->
          <div class="search-bar">
            <div class="search-inputs">
              <AInput
                v-model:value="searchForm.ruleName"
                placeholder="请输入规则名称"
                allow-clear
                style="width: 300px"
                @press-enter="handleSearchPressEnter"
              />
            </div>

            <div class="action-buttons">
              <AButton :loading="loading" @click="handleRefresh">
                <template #icon><RedoOutlined /></template>
                刷新
              </AButton>
              <AButton type="primary" @click="() => handleCreate(selectedNode)">
                <template #icon><PlusOutlined /></template>
                添加质量规则
              </AButton>
            </div>
          </div>

          <!-- 表格 -->
          <div ref="tableRef" class="table-container">
            <YTable
              :data="tableData"
              :columns="TABLE_COLUMNS"
              :loading="loading"
              :action-config="actionConfig"
              pageable
              :max-height="tableHeight"
              :pagination="pagination"
              @page-change="handlePageChange"
              @size-change="handleSizeChange"
            >
              <!-- 规则名称列（自定义渲染为链接） -->
              <template #ruleName="{ row }">
                <a class="rule-name-link" @click="() => handleRuleNameClick(row)">
                  {{ row.ruleName }}
                </a>
              </template>

              <!-- 状态列（自定义渲染为开关） -->
              <template #status="{ row }">
                <ASwitch :checked="row.status === 1" @change="() => handleStatusChange(row)" />
              </template>
            </YTable>
          </div>
        </y-card>
      </template>
    </YSplitPane>
  </div>
</template>
<style lang="less" scoped>
@import './style.less';
</style>
