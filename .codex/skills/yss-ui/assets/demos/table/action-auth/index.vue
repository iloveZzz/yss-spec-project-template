<script setup lang="ts">
import { YTable, type YTableActionConfig } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoTableActionAuth' });

const data = ref([
  { id: 1, name: '张三' },
  { id: 2, name: '李四' },
]);

const columns = [
  { field: 'id', title: 'ID', width: 80 },
  { field: 'name', title: '姓名' },
];

const actionConfig: YTableActionConfig = {
  width: 160,
  buttons: [
    { key: 'view', text: '查看' },
    { key: 'edit', text: '编辑', permissionCode: 'r_security-m_security_datamask-b_datamask_add' },
    { key: 'del', text: '删除', permissionCode: 'DELETE', fallback: 'disable', isConfirm: true, clickFn: onDelete },
  ],
};

async function onDelete(scope: any) {
  // eslint-disable-next-line no-console
  console.log('[action-auth] 删除', scope);
}

// 模拟权限：
// localStorage.setItem('auth_btns', JSON.stringify([
//   { btnCode:'EDIT', btnName:'编辑' }
// ]))
</script>

<template>
  <YTable :data="data" :columns="columns" :action-config="actionConfig" />
</template>

<style scoped></style>
