<script setup lang="ts">
import { YTable, type YTableColumn } from '@yss-ui/components';
import { reactive, ref } from 'vue';
import './style.less';

defineOptions({ name: 'DemoTableActionSlot' });

const pagination = ref({
  current: 1,
  pageSize: 5,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['5', '10', '20', '50'],
});

const columns = reactive<YTableColumn[]>([
  { type: 'seq' as const, title: '序号', width: 60, align: 'center' as const },
  { field: 'name', title: '姓名' },
  { field: 'role', title: '角色' },
  { field: 'status', title: '备注', align: 'center' as const },
  { field: 'action', title: '操作', width: 100, align: 'center' as const, fixed: 'right' as const },
]);

const tableData = ref([
  { name: '张三', role: '前端工程师', status: 1, createTime: '2024-01-15 10:30:00' },
  { name: '李四', role: '产品经理', status: 1, createTime: '2024-01-16 09:20:00' },
  { name: '王五', role: 'UI 设计师', status: 0, createTime: '2024-01-17 14:15:00' },
  { name: '赵六', role: '后端工程师', status: 1, createTime: '2024-01-18 11:45:00' },
  { name: '孙七', role: '测试工程师', status: 1, createTime: '2024-01-19 16:20:00' },
]);

const onView = (row: any) => {
  alert(`查看：${row.name}`);
};

const onEdit = (row: any, rowIndex: number) => {
  alert(`编辑第 ${rowIndex + 1} 行：${row.name}`);
};

const onDelete = (row: any, rowIndex: number) => {
  if (confirm(`确定删除 ${row.name} 吗？`)) {
    tableData.value.splice(rowIndex, 1);
    alert('删除成功');
  }
};
</script>

<template>
  <div class="demo-container">
    <YTable v-model:pagination="pagination" :data="tableData" :columns="columns" :pageable="true">
      <!-- 仅通过插槽自定义操作列：不传 actionConfig，不使用 type:'action' -->
      <template #action="{ row, rowIndex }">
        <button class="demo-btn demo-btn-link" @click="onView(row)">查看</button>
        <button class="demo-btn demo-btn-link" @click="onEdit(row, rowIndex)">编辑</button>
        <button class="demo-btn demo-btn-danger" @click="onDelete(row, rowIndex)">删除</button>
      </template>
    </YTable>
  </div>
</template>

<style scoped></style>
