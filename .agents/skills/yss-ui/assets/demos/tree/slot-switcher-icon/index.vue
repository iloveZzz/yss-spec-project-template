<template>
  <div style="width: 320px">
    <YTree :tree-data="data" default-expand-all block-node>
      <!-- 直传 antdv 的 #switcherIcon 插槽（组件已完整透传） -->
      <template #switcherIcon="{ expanded }">
        <span style="display: inline-flex; align-items: center">
          <CaretDownOutlined v-if="expanded" />
          <CaretRightOutlined v-else />
        </span>
      </template>
    </YTree>
  </div>
</template>
<script setup lang="ts">
import { YTree } from '@yss-ui/components';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons-vue';

const data = [
  {
    key: 'root',
    title: '自定义展开/收起图标',
    children: [
      { key: '1', title: '子节点-1' },
      { key: '2', title: '子节点-2' },
      {
        key: '3',
        title: '子节点-3',
        children: [{ key: '3-1', title: '子节点-3-1' }],
      },
    ],
  },
];
</script>
<style scoped lang="less"></style>
