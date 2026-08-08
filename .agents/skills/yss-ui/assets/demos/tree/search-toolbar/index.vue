<template>
  <div class="layout-demo">
    <div style="width: 280px">
      <YTree
        v-model:search-value="search"
        :tree-data="data"
        :get-node-actions="getActions"
        :expanded-keys="expandedKeys"
        @action="handleAction"
        @expand="onExpand"
      >
        <template #search>
          <div class="toolbar">
            <AInput v-model:value="search" allow-clear placeholder="请输入关键词" size="small" class="toolbar__input" />
            <div class="toolbar__actions">
              <span class="toolbar-icon" title="刷新" @click="reloadTree">
                <ReloadOutlined />
              </span>
              <span class="toolbar-icon" title="新增文件夹" @click="createFile">
                <FolderAddOutlined />
              </span>
            </div>
          </div>
        </template>
        <template #node-prefix="{ node }">
          <FolderOpenOutlined v-if="!isLeaf(node) && isExpanded(node)" />
          <FolderOutlined v-else-if="!isLeaf(node)" />
          <FileOutlined v-else />
        </template>
      </YTree>
    </div>
    <div class="right-demo">右侧区域（表格占位）</div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { YTree } from '@yss-ui/components';
import { Input as AInput } from 'ant-design-vue';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  ReloadOutlined,
  FolderAddOutlined,
} from '@ant-design/icons-vue';

const search = ref('');
const expandedKeys = ref<string[]>(['root']);

const data = ref([
  {
    key: 'root',
    title: '所有任务流',
    children: [
      { key: 'test', title: 'test' },
      { key: 'a', title: '委外管理平台委外管理平台委外管理平台委外管理平台' },
      { key: 'b', title: '投资管理演示' },
      { key: 'c', title: '数仓演示' },
      { key: 'd', title: '数据质量V2' },
    ],
  },
]);

const getActions = (_node: any) => {
  return [
    { key: 'new-folder', label: '新建文件夹' },
    { key: 'rename', label: '重命名' },
    { key: 'move', label: '移动到' },
    { key: 'export', label: '导出' },
    { key: 'import', label: '导入' },
    { key: 'delete', label: '删除', danger: true },
  ];
};

function onExpand(keys: (string | number)[], _info: any) {
  expandedKeys.value = keys.map(k => String(k));
}

const handleAction = (payload: { key: string; node: any }) => {
  console.info('action:', payload);
};

const reloadTree = () => {
  expandedKeys.value = ['root'];
  data.value = [...data.value];
};

const createFile = () => {
  const root = data.value[0];
  const id = `new_${Date.now()}`;
  (root.children = root.children || []).push({ key: id, title: `新文件_${id.slice(-4)}` });
  data.value = [...data.value];
};

const isLeaf = (node: any): boolean => {
  return !Array.isArray(node.children) || node.children.length === 0;
};

const isExpanded = (node: any): boolean => {
  return expandedKeys.value.includes(String(node.key));
};
</script>
<style scoped lang="less">
.layout-demo {
  display: flex;
  gap: 16px;
}

.right-demo {
  flex: 1;
  border: 1px dashed #e5e6eb;
  padding: 16px;
  background-color: var(--y-demo-placeholder-bg, rgba(0, 0, 0, 0.03));
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.toolbar__input {
  flex: 1;
  min-width: 0;
}

.toolbar__actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.toolbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--y-tree-toolbar-icon, rgb(0 0 0 / 65%));
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.toolbar-icon:hover {
  background-color: var(--y-tree-toolbar-hover-bg, rgb(0 0 0 / 6%));
  color: var(--y-tree-toolbar-icon-hover, rgb(0 0 0 / 85%));
}

.toolbar-icon:active {
  background-color: var(--y-tree-toolbar-active-bg, rgb(0 0 0 / 10%));
}
</style>
