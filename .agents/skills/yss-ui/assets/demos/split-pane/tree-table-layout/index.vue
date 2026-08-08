<script setup lang="ts">
import { YSplitPane, YTree, YTable, YButton } from '@yss-ui/components';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { Input } from 'ant-design-vue';
import { useTreeTable } from './hooks/useTreeTable';
import './style.less';

defineOptions({ name: 'DemoSplitPaneTreeTableLayout' });

const {
  collapsed,
  leftWidth,
  treeData,
  selectedKeys,
  loading,
  searchName,
  tableData,
  columns,
  pagination,
  handlePageChange,
  actionConfig,
} = useTreeTable();
</script>

<template>
  <div class="layout-split-pane-demo">
    <YSplitPane
      v-model:collapsed="collapsed"
      v-model:left-width="leftWidth"
      :min-width="200"
      :max-width="400"
      storage-key="demo-split-tree-layout"
    >
      <!-- 左侧树 -->
      <template #left>
        <div class="left-pane-content">
          <div class="tree-title">资源树</div>
          <div class="tree-wrapper">
            <YTree v-model:selected-keys="selectedKeys" :tree-data="treeData" block-node default-expand-all />
          </div>
        </div>
      </template>

      <!-- 右侧表格 -->
      <template #right>
        <div class="right-pane-content">
          <!-- 顶部工具栏 -->
          <div class="table-toolbar">
            <div class="filter-area">
              <Input v-model:value="searchName" placeholder="请输入监控规则名称" allow-clear />
            </div>
            <div class="action-area">
              <YButton type="primary">
                <template #icon><PlusOutlined /></template>
                添加监控规则
              </YButton>
              <YButton danger>
                <template #icon><DeleteOutlined /></template>
                删除
              </YButton>
            </div>
          </div>

          <!-- 表格主体 -->
          <div class="table-wrapper">
            <YTable
              v-model:pagination="pagination"
              :data="tableData"
              :columns="columns"
              :loading="loading"
              :action-config="actionConfig"
              border
              height="100%"
              show-overflow
              :checkbox-config="{ checkField: 'checked' }"
              @page-change="handlePageChange"
            >
            </YTable>
          </div>
        </div>
      </template>
    </YSplitPane>
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
