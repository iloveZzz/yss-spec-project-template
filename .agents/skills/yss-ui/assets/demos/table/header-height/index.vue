<script setup lang="ts">
import { YTable, type YTableColumn } from '@yss-ui/components';
import { reactive } from 'vue';
import './style.less';

defineOptions({ name: 'DemoTableHeaderHeight' });

const columns = reactive<YTableColumn[]>([
  { type: 'seq', title: '序号', width: 60, align: 'center' },
  { field: 'name', title: '姓名', width: 160 },
  { field: 'role', title: '角色', width: 140 },
  { field: 'status', title: '状态', width: 100, align: 'center' },
]);

const tableData = [
  { name: '张三', role: '前端', status: 1 },
  { name: '李四', role: '后端', status: 0 },
  { name: '王五', role: '产品', status: 1 },
];
</script>

<template>
  <div class="demo-container">
    <YTable :data="tableData" :columns="columns" :cell-config="{ height: 56 }" :header-height="42" />
  </div>
  <div class="desc">数据行高 56px，表头高 46px（互不影响）。</div>
</template>

<style scoped></style>
