<template>
  <div class="layout-demo">
    <div ref="treeAreaRef" style="width: 280px">
      <YTree
        v-model:search-value="search"
        :tree-data="data"
        :get-node-actions="getActions"
        :expanded-keys="expandedKeys"
        :field-names="{ title: 'name', key: 'code', children: 'children' }"
        :height="treeHeight"
        @action="handleAction"
        @expand="onExpand"
      >
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
import { useTreeHeight, YTREE_SEARCH_HEIGHT } from '@yss-ui/hooks';
import { FolderOutlined, FolderOpenOutlined, FileOutlined } from '@ant-design/icons-vue';

const treeAreaRef = ref<HTMLDivElement>();
const search = ref('');
const expandedKeys = ref<string[]>(['root']);

const { treeHeight } = useTreeHeight(treeAreaRef, {
  extraOffset: YTREE_SEARCH_HEIGHT,
});

const data = ref([
  {
    code: 'root',
    name: '所有任务流',
    children: [
      { code: 'test', name: 'test' },
      { code: 'a', name: '委外管理平台委外管理平台委外管理平台委外管理平台' },
      { code: 'b0', name: '投资管理演示' },
      { code: 'c', name: '数仓演示' },
      { code: 'd', name: '数据质量V2' },
      { code: 'b', name: '投资管理演示' },
      { code: 'c1', name: '数仓演示' },
      { code: 'd1', name: '数据质量V2' },
      { code: 'b1', name: '投资管理演示' },
      { code: 'c2', name: '数仓演示' },
      { code: 'd2', name: '数据质量V2' },
      { code: 'b2', name: '投资管理演示' },
      { code: 'c3', name: '数仓演示' },
      { code: 'd3', name: '数据质量V2' },
      { code: 'b3', name: '投资管理演示' },
      { code: 'c4', name: '数仓演示' },
      { code: 'd4', name: '数据质量V2' },
      { code: 'b4', name: '投资管理演示' },
      { code: 'c5', name: '数仓演示' },
      { code: 'd5', name: '数据质量V2' },
      { code: 'b5', name: '投资管理演示' },
      { code: 'c6', name: '数仓演示' },
      { code: 'd6', name: '数据质量V2' },
      { code: 'b6', name: '投资管理演示' },
      { code: 'c7', name: '数仓演示' },
      { code: 'd7', name: '数据质量V2' },
      { code: 'b7', name: '投资管理演示' },
      { code: 'c8', name: '数仓演示' },
      { code: 'd8', name: '数据质量V2' },
      { code: 'b8', name: '投资管理演示' },
      { code: 'c9', name: '数仓演示' },
      { code: 'd9', name: '数据质量V2' },
      { code: 'b9', name: '投资管理演示' },
      { code: 'c10', name: '数仓演示' },
      { code: 'd10', name: '数据质量V2底部' },
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

const onExpand = (keys: (string | number)[], _info: any) => {
  expandedKeys.value = keys.map(k => String(k));
};

const handleAction = (payload: { key: string; node: any }) => {
  console.info('action:', payload);
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
  height: 300px;
  overflow: auto;
}

.right-demo {
  flex: 1;
  border: 1px dashed #e5e6eb;
  padding: 16px;
  background-color: var(--y-demo-placeholder-bg, rgba(0, 0, 0, 0.03));
}
</style>
