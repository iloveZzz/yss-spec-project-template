<template>
  <div style="width: 300px">
    <YTree :tree-data="sources" :ellipsis-tooltip="true">
      <template #node-title="{ node, text }">
        <span>
          {{ text }}
          <span v-if="node.count" style="margin-left: 6px; color: #8b5cf6">({{ node.count }})</span>
        </span>
      </template>
    </YTree>
  </div>
</template>
<script setup lang="ts">
import { YTree } from '@yss-ui/components';
const sources = [
  {
    key: 'all',
    title: '所有数据来源',
    count: 54,
    children: [
      { key: 'sys1', title: '系统1', count: 1, children: [{ key: 'oracle3', title: '测试Oracle3' }] },
      { key: 'sys2', title: '系统2', count: 1, children: [{ key: 'mysql34', title: '测试Mysql34' }] },
      { key: 'sys3', title: '系统3', count: 1 },
      { key: 'sys4', title: '系统4', count: 1 },
      { key: 'unassigned', title: '未分配', count: 31 },
      { key: 'dev', title: '数据开发使用', count: 16 },
      { key: 'crm', title: '客户关系管理系统', count: 3 },
    ],
  },
];
</script>
