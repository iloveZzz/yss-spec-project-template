<script setup lang="ts">
import { YButton, YTable } from '@yss-ui/components';
// import { MoreOutlined } from '@ant-design/icons-vue';
import { useBasicTable } from './hooks/useBasicTable';
import './style.less';

defineOptions({ name: 'DemoTableBasic' });

const {
  loading,
  pagination,
  columns,
  actionConfig,
  columnsWithAction,
  tableData,
  handleCellClick,
  handleCurrentRowChange,
  handlePageChange,
  onCreate,
  onBatch,
} = useBasicTable();
</script>

<template>
  <div class="demo-container">
    <YTable
      id="demo-basic-ytable"
      v-model:pagination="pagination"
      :data="tableData"
      :columns="columns"
      :border="true"
      :stripe="false"
      :loading="loading"
      :toolbar-config="{ custom: true }"
      :action-config="actionConfig"
      @page-change="handlePageChange"
      @cell-click="handleCellClick"
      @current-row-change="handleCurrentRowChange"
    >
      <!-- 自定义状态列 -->
      <template #status="{ row }">
        <span :class="['status-tag', row.status === 1 ? 'status-active' : 'status-inactive']">
          {{ row.status === 1 ? '启用' : '禁用' }}
        </span>
      </template>
      <!-- 工具栏插槽：在"列设置"齿轮左右增加自定义按钮 -->
      <template #toolbar-left>
        <YButton type="primary" @click="onCreate">新增</YButton>
      </template>
      <template #toolbar-right>
        <YButton style="margin-right: 8px" @click="onBatch">上传附件</YButton>
      </template>
    </YTable>

    <YTable
      id="demo-basic-ytable1"
      v-model:pagination="pagination"
      :data="tableData"
      :columns="columnsWithAction"
      :border="true"
      :stripe="false"
      :loading="loading"
      toolbar-size="small"
      :toolbar-config="{ custom: true }"
      :row-config="{ isCurrent: false, isHover: false }"
      @page-change="handlePageChange"
      @cell-click="handleCellClick"
      @current-row-change="handleCurrentRowChange"
    >
      <!-- 自定义状态列 -->
      <template #status="{ row }">
        <span :class="['status-tag', row.status === 1 ? 'status-active' : 'status-inactive']">
          {{ row.status === 1 ? '启用' : '禁用' }}
        </span>
      </template>

      <template #toolbar-left>
        <span>列操作自定义icon</span>
      </template>
      <!-- actionConfig 配置 moreRenderType: 'ellipsis' 和 'moreButton' -->
      <!-- 也可以 自定义操作列"更多"图标（会透传给操作列组件） -->
      <!-- <template #action-more-icon>
        <span style="color: var(--primary-color); cursor: pointer"><MoreOutlined /></span>
      </template> -->
    </YTable>
  </div>
</template>

<style scoped></style>
