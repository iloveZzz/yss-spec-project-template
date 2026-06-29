<template>
  <div style="width: 280px">
    <YTree :tree-data="resources" block-node>
      <template #node-title="{ node, text }">
        <span :style="{ color: node.color || 'inherit' }">{{ text }}</span>
      </template>
    </YTree>
  </div>
</template>
<script setup lang="ts">
import { YTree } from '@yss-ui/components';
const resources = [
  {
    key: 'all',
    title: '全部',
    color: '#001a7d',
    children: [
      {
        key: 'srv',
        title: '服务资源',
        color: '#1d39c4',
        children: [
          { key: 'core', title: '核心应用' },
          { key: 'eureka', title: 'Eureka' },
        ],
      },
      {
        key: 'sys',
        title: '系统资源',
        color: '#595959',
        children: [
          { key: 'db', title: '数据源' },
          { key: 'redis', title: 'Redis' },
          { key: 'tomcat', title: 'Tomcat', color: '#3371ff' },
        ],
      },
      { key: 'biz', title: '业务资源', color: '#8c8c8c' },
    ],
  },
];
</script>
