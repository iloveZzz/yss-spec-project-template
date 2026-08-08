<template>
  <div style="display: flex; gap: 12px; align-items: center">
    <!--  permissionCode="r_security-m_security_level-b_securitylevel_edit" -->
    <!-- 当给AuthorityDropdown 组件传入permissionCode时，如果无权限，则不显示 -->
    <AuthorityDropdown :dropdown-items="items" :options="{ label: 'text', value: 'id' }" @command="onCmd">
      更多操作
    </AuthorityDropdown>
  </div>
</template>

<script setup lang="ts">
import { AuthorityDropdown } from '@yss-ui/components';

const items = [
  { text: '查看', id: 'view' },
  { text: '编辑', id: 'edit', permissionCode: 'r_security-m_security_datamask-b_datamask_edit' },
  { text: '删除', id: 'delete', permissionCode: 'DELETE' },
];

const onCmd = (rec: any) => {
  console.log('[auth-dropdown]', rec);
};

// 模拟权限：
// localStorage.setItem('auth_btns', JSON.stringify([
//   { btnCode:'r_security-m_security_level-b_securitylevel_edit', btnName:'更多操作' },
//   { btnCode:'r_security-m_security_datamask-b_datamask_edit', btnName:'编辑' }
// ]))
</script>
