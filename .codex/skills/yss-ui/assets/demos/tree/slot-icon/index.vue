<template>
  <div style="width: 320px">
    <YTree :tree-data="data" default-expand-all :show-icon="true" block-node>
      <!-- 直传 antdv 的 #icon 插槽（组件已完整透传） -->
      <template #icon="{ data }">
        <template v-if="Array.isArray(data?.children) && data.children.length">
          <FolderOutlined />
        </template>
        <template v-else>
          <FileOutlined />
        </template>
      </template>
    </YTree>
  </div>
</template>
<script setup lang="ts">
import { YTree } from '@yss-ui/components';
import { FolderOutlined, FileOutlined } from '@ant-design/icons-vue';

const data = [
  {
    key: 'root',
    title: '显示图标（icon 插槽）',
    children: [
      { key: '1', title: '文件-1' },
      { key: '2', title: '文件-2' },
      {
        key: '3',
        title: '目录',
        children: [{ key: '3-1', title: '文件-3-1' }],
      },
    ],
  },
];
</script>
<style scoped lang="less"></style>
